import {externalId,json} from './helpers.js';
import {rpc,transferStatus,view as transferView} from './transfers.js';
import {RLUSD} from './rlusd.js';
const pending=new Set(['signing','signed','submitted']);
const validHash=value=>typeof value==='string'&&/^[A-Fa-f0-9]{64}$/.test(value);
function tokenAmount(amount){
 if(typeof amount==='string'&&/^\d{1,20}$/.test(amount))return {asset:'XRP',amountDrops:amount,tokenAmount:null};
 if(amount&&amount.currency===RLUSD.currency&&amount.issuer===RLUSD.issuer&&typeof amount.value==='string'&&amount.value.length<=100&&/^\+?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?$/.test(amount.value))return {asset:'RLUSD',amountDrops:null,tokenAmount:amount.value};
 return null;
}
function date(value){const d=new Date(value);return Number.isFinite(d.getTime())?d.toISOString():null;}
export function ledgerActivity(entry,address){
 const tx=entry.tx_json||entry.tx,meta=entry.meta,hash=entry.hash||tx?.hash;
 if(entry.validated!==true||!tx||!validHash(hash)||typeof meta?.TransactionResult!=='string')return null;
 const outgoing=tx.Account===address,incoming=tx.Destination===address;
 if(!outgoing&&!incoming)return null;
 const success=meta.TransactionResult==='tesSUCCESS';
 let kind='payment',amount;
 if(tx.TransactionType==='TrustSet'){
  if(!outgoing||tx.LimitAmount?.issuer!==RLUSD.issuer||tx.LimitAmount?.currency!==RLUSD.currency)return null;
  kind='trustline';amount={asset:null,amountDrops:null,tokenAmount:null};
 }else if(tx.TransactionType==='Payment'){
  if(!success&&!outgoing)return null;
  const intended=tokenAmount(tx.Amount||tx.DeliverMax);if(!intended)return null;
  const delivered=meta.delivered_amount??meta.DeliveredAmount;
  if(success){
   // A partial payment can deliver far less than its requested Amount. Never substitute that target.
   amount=tokenAmount(delivered);
   if(!amount&&delivered==null&&!(Number(tx.Flags||0)&0x00020000))amount=intended;
   if(!amount){if(delivered!=null&&delivered!=='unavailable')return null;amount={asset:intended.asset,amountDrops:null,tokenAmount:null};}
  }else amount=intended;
 }else return null;
 const createdAt=Number.isFinite(tx.date)?date((tx.date+946684800)*1000):date(entry.close_time_iso);
 return {id:hash.toUpperCase(),hash:hash.toUpperCase(),kind,...amount,direction:outgoing&&incoming?'self':outgoing?'send':'receive',counterparty:kind==='trustline'?RLUSD.issuer:outgoing?tx.Destination:tx.Account,destination:tx.Destination||RLUSD.issuer,status:success?'validated':'failed',resultCode:meta.TransactionResult,feeDrops:outgoing&&/^\d+$/.test(tx.Fee||'')?tx.Fee:null,createdAt,ledgerIndex:entry.ledger_index||tx.ledger_index||null,network:'xrpl-testnet',source:'ledger',intentId:null,destinationTag:tx.DestinationTag??null};
}
function localActivity(row){
 const tx=JSON.parse(row.transaction_json),t=transferView(row);
 const status=!row.tx_hash&&row.expires_at<=Date.now()&&['prepared','signing'].includes(t.status)?'expired':t.status;
 return {...t,id:t.hash||t.id,intentId:t.id,source:'kutuma',direction:'send',counterparty:t.destination,status,createdAt:date(row.created_at.includes('T')?row.created_at:row.created_at.replace(' ','T')+'Z'),destinationTag:tx.DestinationTag??null};
}
export async function activityForUser(env,user){
 const owner=await externalId(user),wallet=await env.DB.prepare('SELECT * FROM wallets WHERE external_id=?').bind(owner).first();
 if(wallet?.status!=='ready')return json({error:'Create your testnet wallet first.'},409);
 const rows=(await env.DB.prepare('SELECT * FROM transfers WHERE external_id=? ORDER BY created_at DESC,id DESC LIMIT 40').bind(owner).all()).results;
 // Limit reconciliation work; this endpoint never signs or submits a transaction.
 const reconcile=rows.filter(r=>r.tx_hash&&pending.has(r.status)).slice(0,8);
 await Promise.allSettled(reconcile.map(async row=>{const r=await transferStatus(env,user,row.id);if(r.ok){const t=(await r.json()).transfer;row.status=t.status;row.result_code=t.resultCode;}}));
 let ledgerAvailable=false,hasOlder=false,events=[];
 try{
  const ledger=await rpc('account_tx',{account:wallet.address,ledger_index_min:-1,ledger_index_max:-1,binary:false,forward:false,limit:40});
  if(ledger?.error==='actNotFound'){
   const account=await rpc('account_info',{account:wallet.address,ledger_index:'validated',strict:true});
   if(account?.error!=='actNotFound')throw Error('History is unavailable.');
   ledgerAvailable=true;
  }else{
   if(ledger?.error||ledger?.validated!==true||!Array.isArray(ledger.transactions))throw Error('History is unavailable.');
   events=ledger.transactions.map(t=>ledgerActivity(t,wallet.address)).filter(Boolean);hasOlder=!!ledger.marker;ledgerAvailable=true;
  }
 }catch{/* Keep owner-bound app receipts available while the ledger is unreachable. */}
 const merged=new Map();
 for(const row of rows){const t=localActivity(row);merged.set((t.hash||t.id).toUpperCase(),t);}
 for(const event of events){const key=event.hash,local=merged.get(key);merged.set(key,{...event,intentId:local?.intentId||null});}
 const sorted=[...merged.values()].sort((a,b)=>(Date.parse(b.createdAt)||0)-(Date.parse(a.createdAt)||0)||(b.ledgerIndex||0)-(a.ledgerIndex||0)||a.id.localeCompare(b.id));
 return json({activity:sorted.slice(0,60),ledgerAvailable,hasOlder:hasOlder||sorted.length>60||rows.length===40,network:'xrpl-testnet',checkedAt:new Date().toISOString()});
}
