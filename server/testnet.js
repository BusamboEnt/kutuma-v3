import {externalId,json} from './helpers.js';
const rpcUrl='https://s.altnet.rippletest.net:51234/';
const faucetUrl='https://faucet.altnet.rippletest.net/accounts';
export function formatXrp(drops){const n=BigInt(drops);return `${n/1000000n}.${(n%1000000n).toString().padStart(6,'0')}`;}
export async function testnetBalance(address){
 const r=await fetch(rpcUrl,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({method:'account_info',params:[{account:address,ledger_index:'validated',strict:true}]}),signal:AbortSignal.timeout(15000)});
 if(!r.ok)throw Error('Testnet unavailable');
 const {result}=await r.json();
 if(result?.error==='actNotFound')return {network:'xrpl-testnet',activated:false,balanceXrp:'0.000000'};
 if(result?.error||!result?.validated||!/^\d+$/.test(result?.account_data?.Balance||''))throw Error('Invalid ledger response');
 return {network:'xrpl-testnet',activated:true,balanceXrp:formatXrp(result.account_data.Balance),ledgerIndex:result.ledger_index};
}
export async function testnetForUser(request,env,user,activate=false){
 const row=await env.DB.prepare('SELECT * FROM wallets WHERE external_id = ?').bind(await externalId(user)).first();
 if(row?.status!=='ready')return json({error:'Create your testnet wallet first.'},409);
 let balance=await testnetBalance(row.address);
 if(!activate||balance.activated)return json({balance});
 const now=Math.floor(Date.now()/1000);
 const changed=await env.DB.prepare('UPDATE wallets SET faucet_requested_at=? WHERE external_id=? AND (faucet_requested_at IS NULL OR faucet_requested_at<?)').bind(now,row.external_id,now-600).run();
 if(Number(changed.meta?.changes??changed.changes)!==1)return json({error:'Test XRP was recently requested. Refresh your balance, or try again in 10 minutes.'},429);
 const r=await fetch(faucetUrl,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({destination:row.address}),signal:AbortSignal.timeout(20000)});
 if(!r.ok)return json({error:'The testnet faucet is unavailable. Please try later.'},503);
 const receipt=await r.json();
 if(receipt.error||receipt.account?.address!==row.address)return json({error:'The faucet could not confirm your request. Refresh your balance before retrying.'},503);
 // The faucet response is not proof of ledger validation. Refresh checks the validated ledger.
 try{balance=await testnetBalance(row.address);}catch{return json({faucetRequested:true,pending:true,balance:null});}
 return json({faucetRequested:true,pending:!balance.activated,balance});
}
