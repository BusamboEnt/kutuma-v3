import {externalId,json} from './helpers.js';
import {rpc,toDrops,savePrepared} from './transfers.js';
// Ripple's official XRPL testnet details, verified 2026-10-15. Never accept issuer overrides.
export const RLUSD=Object.freeze({issuer:'rQhWct2fv4Vc4KRjRgMrxa8xPN9Zx9iLKV',currency:'524C555344000000000000000000000000000000',limit:'1000000',network:'xrpl-testnet',faucet:'https://tryrlusd.com/'});
async function walletFor(env,user){return env.DB.prepare('SELECT * FROM wallets WHERE external_id=?').bind(await externalId(user)).first();}
export async function rlUsdState(address){
 const [account,issuer]=await Promise.all([rpc('account_info',{account:address,ledger_index:'validated',strict:true}),rpc('account_info',{account:RLUSD.issuer,ledger_index:'validated',strict:true})]);
 if(issuer?.error||!issuer?.validated)throw Error('The official RLUSD test issuer could not be verified.');
 const globalFrozen=!!((issuer.account_data.Flags||0)&0x00400000),requiresAuth=!!((issuer.account_data.Flags||0)&0x00040000);
 const base={issuer:RLUSD.issuer,currency:RLUSD.currency,network:RLUSD.network,faucet:RLUSD.faucet};
 if(account?.error==='actNotFound')return {...base,activated:false,trustline:false,balance:'0',ready:false};
 if(account?.error||!account?.validated)throw Error('Testnet account state is unavailable.');
 let marker,line=null;
 for(let page=0;page<5;page++){
  const result=await rpc('account_lines',{account:address,peer:RLUSD.issuer,ledger_index:account.ledger_index||'validated',limit:200,...(marker?{marker}:{})});
  if(result?.error||result?.validated!==true||!Array.isArray(result.lines))throw Error('Trust line state is unavailable.');
  line=result.lines.find(l=>l.account===RLUSD.issuer&&l.currency===RLUSD.currency)||line;
  marker=result.marker;if(!marker)break;if(page===4)throw Error('Trust line lookup was incomplete.');
 }
 if(!line)return {...base,activated:true,trustline:false,balance:'0',ready:false};
 if(typeof line.balance!=='string'||line.balance.length>100||!/^[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?$/.test(line.balance))throw Error('Token balance is invalid.');
 const frozen=globalFrozen||!!line.freeze_peer,needsAuthorization=requiresAuth&&!line.peer_authorized;
 return {...base,activated:true,trustline:true,balance:line.balance,limit:line.limit,ready:!frozen&&!needsAuthorization,frozen,needsAuthorization};
}
export async function rlUsdForUser(env,user){const wallet=await walletFor(env,user);if(wallet?.status!=='ready')return json({error:'Create your testnet wallet first.'},409);return json({rlusd:await rlUsdState(wallet.address)});}
export async function prepareRlUsd(env,user){
 const owner=await externalId(user),wallet=await walletFor(env,user);
 if(wallet?.status!=='ready'||!wallet.public_key)return json({error:'Create your testnet wallet first.'},409);
 const state=await rlUsdState(wallet.address);
 if(!state.activated)return json({error:'Activate your account with test XRP first.'},409);
 if(state.trustline)return json({error:'The official RLUSD trust line already exists. Refresh its status.'},409);
 const [account,info,fees]=await Promise.all([rpc('account_info',{account:wallet.address,ledger_index:'validated',strict:true}),rpc('server_info'),rpc('fee')]);
 if(account?.error||!account?.validated||!info?.info?.validated_ledger||fees?.error)throw Error('Testnet state is unavailable.');
 const ledger=info.info.validated_ledger,increment=toDrops(String(ledger.reserve_inc_xrp));
 // Conservative reserve check: enough for an additional owner object, even where exemptions apply.
 const reserve=toDrops(String(ledger.reserve_base_xrp))+(BigInt(account.account_data.OwnerCount)+1n)*increment;
 const fee=BigInt(fees.drops.open_ledger_fee);
 if(fee<1n||fee>10000n)return json({error:'Network fees are unusually high. Try later.'},503);
 if(BigInt(account.account_data.Balance)<reserve+fee)return json({error:'Keep enough test XRP for the trust line reserve and network fee.'},400);
 const transaction={TransactionType:'TrustSet',Account:wallet.address,LimitAmount:{currency:RLUSD.currency,issuer:RLUSD.issuer,value:RLUSD.limit},Flags:131072,Fee:fee.toString(),Sequence:account.account_data.Sequence,LastLedgerSequence:ledger.seq+20,SigningPubKey:wallet.public_key};
 return savePrepared(env,owner,wallet,transaction,reserve,ledger.seq);
}
