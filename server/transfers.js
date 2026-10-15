import {encodeForSigning,decode} from 'ripple-binary-codec';
import {isValidClassicAddress} from 'ripple-address-codec';
const REQUIRE_DESTINATION_TAG=0x00020000,DEPOSIT_AUTH=0x01000000;
export async function hashSignedBlob(blob){if(!/^(?:[a-fA-F0-9]{2})+$/.test(blob))throw Error('Invalid transaction blob');const prefixed='54584E00'+blob;const bytes=Uint8Array.from(prefixed.match(/../g),b=>parseInt(b,16));const digest=new Uint8Array(await crypto.subtle.digest('SHA-512',bytes));return [...digest.slice(0,32)].map(b=>b.toString(16).padStart(2,'0')).join('').toUpperCase();}
import {externalId,json} from './helpers.js';
const appId='cmtq2e1jx00ec0cjs0chvb1s6';
const rpcUrl='https://s.altnet.rippletest.net:51234/';
export function toDrops(value){if(!/^(?:0|[1-9]\d{0,10})(?:\.\d{1,6})?$/.test(String(value)))throw Error('Enter XRP with at most six decimal places.');const [a,b='']=String(value).split('.');return BigInt(a)*1000000n+BigInt(b.padEnd(6,'0'));}
export async function rpc(method,params={}){const r=await fetch(rpcUrl,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({method,params:[params]}),signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('Testnet is unavailable.');return (await r.json()).result;}
function view(row){const tx=JSON.parse(row.transaction_json);return {id:row.id,kind:tx.TransactionType==='TrustSet'?'trustline':'payment',status:row.status,hash:row.tx_hash,resultCode:row.result_code,destination:tx.Destination||tx.LimitAmount?.issuer,amountDrops:tx.Amount||null,feeDrops:tx.Fee,createdAt:row.created_at,network:'xrpl-testnet'};}
export async function prepareTransfer(env,user,input){
 const owner=await externalId(user);
 const wallet=await env.DB.prepare('SELECT * FROM wallets WHERE external_id=?').bind(owner).first();
 if(wallet?.status!=='ready'||!wallet.public_key)return json({error:'Create your testnet wallet first.'},409);
 if(!isValidClassicAddress(input.destination||'')||input.destination===wallet.address)return json({error:'Enter a different valid XRP Ledger r-address.'},400);
 let amount;try{amount=toDrops(input.amount);}catch(e){return json({error:e.message},400);}if(amount<=0n)return json({error:'Amount must be greater than zero.'},400);
 const tag=input.tag===''||input.tag==null?undefined:Number(input.tag);
 if(tag!==undefined&&(!/^\d+$/.test(String(input.tag))||!Number.isSafeInteger(tag)||tag<0||tag>4294967295))return json({error:'Invalid destination tag.'},400);
 const [source,destination,info,fees]=await Promise.all([rpc('account_info',{account:wallet.address,ledger_index:'validated',strict:true}),rpc('account_info',{account:input.destination,ledger_index:'validated',strict:true}),rpc('server_info'),rpc('fee')]);
 if(source?.error==='actNotFound')return json({error:'Activate your wallet with test XRP first.'},409);
 if(source?.error||!source?.validated||!info?.info?.validated_ledger||fees?.error)throw Error('Testnet state could not be verified.');
 if(destination?.error&&destination.error!=='actNotFound')throw Error('Recipient could not be verified.');
 if(!destination?.error&&!destination?.validated)throw Error('Recipient state is not validated.');
 if(((destination?.account_data?.Flags||0)&DEPOSIT_AUTH)){const permitted=await rpc('deposit_authorized',{source_account:wallet.address,destination_account:input.destination,ledger_index:'validated'});if(permitted?.deposit_authorized!==true)return json({error:'This recipient has not authorized your wallet to deposit.'},400);}
 if(tag===undefined&&((destination?.account_data?.Flags||0)&REQUIRE_DESTINATION_TAG))return json({error:'This recipient requires a destination tag.'},400);
 const ledger=info.info.validated_ledger;
 const base=toDrops(String(ledger.reserve_base_xrp)),increment=toDrops(String(ledger.reserve_inc_xrp));
 const reserve=base+BigInt(source.account_data.OwnerCount)*increment;
 const fee=BigInt(fees.drops.open_ledger_fee);
 if(fee<1n||fee>10000n)return json({error:'Network fees are unusually high. Please try later.'},503);
 if(BigInt(source.account_data.Balance)<amount+fee+reserve)return json({error:'Keep enough test XRP for the account reserve and network fee.'},400);
 if(destination?.error==='actNotFound'&&amount<base)return json({error:'An unactivated recipient needs at least the network base reserve.'},400);
 const transaction={TransactionType:'Payment',Account:wallet.address,Destination:input.destination,Amount:amount.toString(),Fee:fee.toString(),Sequence:source.account_data.Sequence,LastLedgerSequence:ledger.seq+20,SigningPubKey:wallet.public_key,...(tag===undefined?{}:{DestinationTag:tag})};
 return savePrepared(env,owner,wallet,transaction,reserve,ledger.seq);
}
export async function savePrepared(env,owner,wallet,transaction,reserve,minLedger){
 const id=crypto.randomUUID(),expires=Date.now()+120000;
 const authorization={version:1,method:'POST',url:`https://api.privy.io/v1/wallets/${wallet.wallet_id}/rpc`,body:{method:'xrpl_signTransaction',params:{transaction:encodeForSigning(transaction),encoding:'hex'}},headers:{'privy-app-id':appId,'privy-idempotency-key':id,'privy-request-expiry':String(expires)}};
 const result=await env.DB.prepare("INSERT INTO transfers(id,external_id,transaction_json,authorization_json,expires_at,min_ledger) SELECT ?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM transfers WHERE external_id=? AND expires_at>?)<3").bind(id,owner,JSON.stringify(transaction),JSON.stringify(authorization),expires,minLedger,owner,Date.now()).run();
 if(Number(result.meta?.changes??result.changes)!==1)return json({error:'Finish or wait for your earlier transfer reviews before starting another.'},429);
 return json({id,transaction,authorization,reserveDrops:reserve.toString(),expiresAt:expires,network:'xrpl-testnet'});
}
export async function transferStatus(env,user,id){
 let row=await env.DB.prepare('SELECT * FROM transfers WHERE id=? AND external_id=?').bind(id,await externalId(user)).first();
 if(!row)return json({error:'Transfer not found.'},404);
 if(!row.tx_hash&&row.expires_at<=Date.now()){await env.DB.prepare("UPDATE transfers SET status='expired' WHERE id=? AND tx_hash IS NULL AND status IN ('prepared','signing')").bind(row.id).run();row=await env.DB.prepare('SELECT * FROM transfers WHERE id=?').bind(row.id).first();}
 if(!row.tx_hash)return json({transfer:view(row)});
 if(['validated','failed','expired'].includes(row.status))return json({transfer:view(row)});
 const transaction=JSON.parse(row.transaction_json);
 const found=await rpc('tx',{transaction:row.tx_hash,binary:false,min_ledger:row.min_ledger,max_ledger:transaction.LastLedgerSequence});
 if(found?.validated&&found.hash===row.tx_hash&&found.meta?.TransactionResult){row.result_code=found.meta.TransactionResult;row.status=row.result_code==='tesSUCCESS'?'validated':'failed';}
 else if(found?.error==='txnNotFound'&&found.searched_all===true){const info=await rpc('server_info');if(info?.info?.validated_ledger?.seq>transaction.LastLedgerSequence)row.status='expired';}
 await env.DB.prepare('UPDATE transfers SET status=?,result_code=? WHERE id=?').bind(row.status,row.result_code||null,row.id).run();
 return json({transfer:view(row)});
}
export async function confirmTransfer(env,user,input){
 const owner=await externalId(user);
 const row=await env.DB.prepare('SELECT * FROM transfers WHERE id=? AND external_id=?').bind(input.id,owner).first();
 if(!row)return json({error:'Transfer not found.'},404);
 if(['validated','failed','expired'].includes(row.status))return json({transfer:view(row)});
 if(!row.tx_blob){
  if(row.expires_at<=Date.now())return json({error:'This review expired. Start a new transfer.'},409);
  if(typeof input.signature!=='string'||input.signature.length>4096||!input.signature)return json({error:'Your wallet approval is required.'},400);
  const info=await rpc('server_info');const transaction=JSON.parse(row.transaction_json);
  if(!info?.info?.validated_ledger||info.info.validated_ledger.seq>=transaction.LastLedgerSequence)return json({error:'Ledger conditions changed. Start a new review.'},409);
  const lease=Date.now()+30000;
  const lock=await env.DB.prepare("UPDATE transfers SET status='signing',lease_until=? WHERE id=? AND (status='prepared' OR (status='signing' AND lease_until<?)) AND NOT EXISTS(SELECT 1 FROM transfers WHERE external_id=? AND id<>? AND status IN ('signing','signed','submitted'))").bind(lease,row.id,Date.now(),owner,row.id).run();
  if(Number(lock.meta?.changes??lock.changes)!==1)return json({transfer:view(row)},202);
  const authorization=JSON.parse(row.authorization_json);
  const response=await fetch(authorization.url,{method:'POST',headers:{...authorization.headers,Authorization:'Basic '+btoa(appId+':'+env.PRIVY_APP_SECRET),'Content-Type':'application/json','privy-authorization-signature':input.signature},body:JSON.stringify(authorization.body),signal:AbortSignal.timeout(20000)});
  if(!response.ok){await env.DB.prepare("UPDATE transfers SET status='prepared',lease_until=NULL WHERE id=?").bind(row.id).run();return json({error:'Wallet approval could not be completed. Please retry or start a new review.'},502);}
  const signed=await response.json();row.tx_blob=signed.data?.signed_transaction;
  if(!row.tx_blob||encodeForSigning(decode(row.tx_blob)).toUpperCase()!==authorization.body.params.transaction.toUpperCase())throw Error('Signed transaction does not match the approved review.');
  row.tx_hash=await hashSignedBlob(row.tx_blob);row.status='signed';
  const saved=await env.DB.prepare("UPDATE transfers SET tx_blob=?,tx_hash=?,status='signed' WHERE id=? AND status='signing' AND lease_until=? AND expires_at>?").bind(row.tx_blob,row.tx_hash,row.id,lease,Date.now()).run();
  if(Number(saved.meta?.changes??saved.changes)!==1)return json({error:'The review expired or was superseded before submission. Start a new review.'},409);
 }
 // Identical signed blobs have one ledger identity; retries cannot create a second payment.
 try{const submitted=await rpc('submit',{tx_blob:row.tx_blob});row.status='submitted';row.result_code=submitted.engine_result||null;await env.DB.prepare("UPDATE transfers SET status='submitted',result_code=? WHERE id=?").bind(row.result_code,row.id).run();}catch{return json({transfer:view(row)},202);}
 return transferStatus(env,user,row.id);
}

export async function listTransfers(env,user){const rows=await env.DB.prepare("SELECT * FROM transfers WHERE external_id=? ORDER BY created_at DESC LIMIT 10").bind(await externalId(user)).all();const transfers=[];for(const row of rows.results){try{transfers.push((await (await transferStatus(env,user,row.id)).json()).transfer);}catch{transfers.push(view(row));}}return json({transfers});}
