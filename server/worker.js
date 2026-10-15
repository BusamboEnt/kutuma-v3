import {rlUsdForUser,prepareRlUsd} from './rlusd.js';
import {importSPKI, jwtVerify} from 'jose';
import {prepareTransfer,confirmTransfer,transferStatus,listTransfers} from './transfers.js';
import {testnetForUser} from './testnet.js';
import {verificationKey} from './verification-key.js';
const appId='cmtq2e1jx00ec0cjs0chvb1s6';
const tokenKey=importSPKI(verificationKey,'ES256');
import {externalId,json} from './helpers.js';
export {externalId,json} from './helpers.js';
function publicWallet(row){return row?.status==='ready'?{id:row.wallet_id,address:row.address,network:'xrpl-testnet',activation:'not-checked'}:null;}
async function upstream(env,path,body,key){return fetch('https://api.privy.io/v1'+path,{method:body?'POST':'GET',headers:{Authorization:'Basic '+btoa(appId+':'+env.PRIVY_APP_SECRET),'privy-app-id':appId,...(body?{'Content-Type':'application/json','privy-idempotency-key':key}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(20000)});}
export async function walletForUser(request,env,user){
 const id=await externalId(user);
 let row=await env.DB.prepare('SELECT * FROM wallets WHERE external_id = ?').bind(id).first();
 if(row?.status==='ready')return json({wallet:publicWallet(row)});
 if(request.method==='GET')return json({wallet:null,pending:!!row});
 if(!env.PRIVY_APP_SECRET)return json({error:'Wallet setup is temporarily unavailable.'},503);
 // Atomic quota reservation: pending attempts also count, preventing concurrent over-provisioning.
 await env.DB.prepare("INSERT INTO wallets(external_id) SELECT ? WHERE (SELECT COUNT(*) FROM wallets) < 500 ON CONFLICT(external_id) DO NOTHING").bind(id).run();
 row=await env.DB.prepare('SELECT * FROM wallets WHERE external_id = ?').bind(id).first();
 if(!row)return json({error:'The pilot wallet limit has been reached.'},429);
 let response=await upstream(env,'/wallets/ext_wal_'+id);
 if(response.status===404){
   response=await upstream(env,'/wallets',{chain_type:'xrpl',owner:{user_id:user},external_id:id,display_name:'Kutuma v3 testnet wallet'},id);
   // A racing request may already have created the globally unique external ID.
   if(response.status===409)response=await upstream(env,'/wallets/ext_wal_'+id);
 }
 if(!response.ok)return json({error:'Wallet setup could not complete. Please try again later.'},502);
 const wallet=await response.json();
 if(wallet.chain_type!=='xrpl'||wallet.external_id!==id||!wallet.owner_id||!wallet.id||!/^r[1-9A-HJ-NP-Za-km-z]{24,34}$/.test(wallet.address||''))return json({error:'Wallet verification failed.'},502);
 await env.DB.prepare("UPDATE wallets SET wallet_id=?,address=?,public_key=?,status='ready' WHERE external_id=?").bind(wallet.id,wallet.address,wallet.public_key||null,id).run();
 return json({wallet:{id:wallet.id,address:wallet.address,network:'xrpl-testnet',activation:'not-checked'}});
}
export default {async fetch(request,env){
 const path=new URL(request.url).pathname;
 if(!path.startsWith('/api/'))return env.ASSETS.fetch(request);
 if(!['/api/wallet','/api/wallet/balance','/api/wallet/activate','/api/transfers','/api/transfers/prepare','/api/transfers/confirm','/api/transfers/status','/api/rlusd','/api/rlusd/prepare'].includes(path))return json({error:'Not found'},404);
 if((path==='/api/rlusd'&&request.method!=='GET')||(path==='/api/rlusd/prepare'&&request.method!=='POST')||(path.includes('/transfers')&&request.method!==(['/api/transfers','/api/transfers/status','/api/rlusd','/api/rlusd/prepare'].includes(path)?'GET':'POST'))||!['GET','POST'].includes(request.method)||(path==='/api/wallet/balance'&&request.method!=='GET')||(path==='/api/wallet/activate'&&request.method!=='POST'))return json({error:'Method not allowed'},405);
 const origin=request.headers.get('Origin');
 if(origin&&origin!==new URL(request.url).origin)return json({error:'Origin not allowed'},403);
 const token=request.headers.get('Authorization')?.match(/^Bearer (\S+)$/)?.[1];
 if(!token)return json({error:'Please sign in.'},401);
 let user;
 try{const {payload}=await jwtVerify(token,await tokenKey,{issuer:'privy.io',audience:appId,algorithms:['ES256'],requiredClaims:['exp','iat','sub']});if(!payload.sub?.startsWith('did:privy:'))throw Error();user=payload.sub;}catch{return json({error:'Please sign in again.'},401);}
 if(!env.DB)return json({error:'Wallet storage is unavailable.'},503);
 try{if(path==='/api/rlusd')return await rlUsdForUser(env,user);if(path==='/api/rlusd/prepare')return await prepareRlUsd(env,user);if(path==='/api/transfers')return await listTransfers(env,user);if(path==='/api/transfers/status')return await transferStatus(env,user,new URL(request.url).searchParams.get('id'));if(path.startsWith('/api/transfers/')){const text=await request.text();if(text.length>8192)return json({error:'Request too large.'},413);let input;try{input=JSON.parse(text);}catch{return json({error:'Invalid request.'},400);}if(!input||typeof input!=='object')return json({error:'Invalid request.'},400);if(path.endsWith('/prepare'))return await prepareTransfer(env,user,input);return await confirmTransfer(env,user,input);}if(path!=='/api/wallet')return await testnetForUser(request,env,user,path.endsWith('/activate'));return await walletForUser(request,env,user);}catch{return json({error:'Wallet setup is temporarily unavailable. Please retry.'},503);}
}};
