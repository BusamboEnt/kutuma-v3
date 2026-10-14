import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import worker,{walletForUser,externalId} from '../server/worker.js';
function storage(){const db=new DatabaseSync(':memory:');db.exec(readFileSync(new URL('../migrations/0001_wallets.sql',import.meta.url),'utf8'));return {raw:db,prepare(sql){return {bind(...args){return {async first(){return db.prepare(sql).get(...args)||null;},async run(){return db.prepare(sql).run(...args);}};}};}};}
const request=method=>new Request('https://kutuma.example/api/wallet',{method});
test('API rejects absent, forged and wrong-origin authorization before accessing storage',async()=>{
 assert.equal((await worker.fetch(request('POST'),{})).status,401);
 assert.equal((await worker.fetch(new Request('https://kutuma.example/api/wallet',{headers:{Authorization:'Bearer forged'}}),{})).status,401);
 assert.equal((await worker.fetch(new Request('https://kutuma.example/api/wallet',{method:'POST',headers:{Origin:'https://other.example'}}),{})).status,403);
 assert.equal((await worker.fetch(request('DELETE'),{})).status,405);
});
test('GET never provisions a wallet or consumes a pilot slot',async()=>{const DB=storage();const r=await walletForUser(request('GET'),{DB},'did:privy:alice');assert.deepEqual(await r.json(),{wallet:null,pending:false});assert.equal(DB.raw.prepare('SELECT COUNT(*) AS n FROM wallets').get().n,0);});
test('creation assigns the verified owner and repeat requests reuse one wallet',async t=>{
 const DB=storage();const original=globalThis.fetch;t.after(()=>globalThis.fetch=original);let saved=null,creates=0;
 globalThis.fetch=async(url,options)=>{if(options.method==='GET')return Response.json(saved||{}, {status:saved?200:404});creates++;const body=JSON.parse(options.body);assert.equal(body.chain_type,'xrpl');assert.deepEqual(body.owner,{user_id:'did:privy:alice'});assert.equal(options.headers['privy-idempotency-key'],body.external_id);saved={...body,id:'wallet-alice',owner_id:'owner-quorum',address:'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh'};return Response.json(saved);};
 const env={DB,PRIVY_APP_SECRET:'test-only-placeholder'};
 const first=await (await walletForUser(request('POST'),env,'did:privy:alice')).json();
 const second=await (await walletForUser(request('POST'),env,'did:privy:alice')).json();
 assert.equal(creates,1);assert.deepEqual(first,second);assert.equal(first.wallet.network,'xrpl-testnet');assert.equal(DB.raw.prepare('SELECT COUNT(*) AS n FROM wallets').get().n,1);
 assert.notEqual(await externalId('did:privy:alice'),await externalId('did:privy:bob'));
});
test('500 pending or ready reservations block new provisioning',async()=>{const DB=storage();for(let i=0;i<500;i++)DB.raw.prepare('INSERT INTO wallets(external_id) VALUES(?)').run('slot'+i);const r=await walletForUser(request('POST'),{DB,PRIVY_APP_SECRET:'test-only-placeholder'},'did:privy:new');assert.equal(r.status,429);assert.equal(DB.raw.prepare('SELECT COUNT(*) AS n FROM wallets').get().n,500);});
test('retry recovers upstream creation after a network interruption',async t=>{const DB=storage();const original=globalThis.fetch;t.after(()=>globalThis.fetch=original);let saved=null,creates=0;globalThis.fetch=async(url,o)=>{if(o.method==='GET')return Response.json(saved||{}, {status:saved?200:404});creates++;saved={...JSON.parse(o.body),id:'recovered',owner_id:'owner-quorum',address:'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh'};throw Error('connection interrupted');};const env={DB,PRIVY_APP_SECRET:'test-only-placeholder'};await assert.rejects(walletForUser(request('POST'),env,'did:privy:retry'));const r=await walletForUser(request('POST'),env,'did:privy:retry');assert.equal(r.status,200);assert.equal(creates,1);});
