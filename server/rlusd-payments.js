import {isValidClassicAddress} from 'ripple-address-codec';
import {externalId,json} from './helpers.js';
import {rpc,toDrops,savePrepared} from './transfers.js';
import {RLUSD,rlUsdState} from './rlusd.js';
// Exact decimal arithmetic also accepts the exponent notation used by ledger balances.
function decimal(value){const m=/^([+-]?)(\d+)(?:\.(\d*))?(?:[eE]([+-]?\d{1,3}))?$/.exec(String(value));if(!m||String(value).length>110)throw Error('Invalid ledger decimal.');const scale=(m[3]||'').length-Number(m[4]||0);if(Math.abs(scale)>200)throw Error('Invalid ledger decimal scale.');return {n:BigInt((m[1]==='-'?'-':'')+m[2]+(m[3]||'')),scale};}
function compare(a,b){a=decimal(a);b=decimal(b);const scale=Math.max(a.scale,b.scale),x=a.n*10n**BigInt(scale-a.scale),y=b.n*10n**BigInt(scale-b.scale);return x<y?-1:x>y?1:0;}
function total(a,b){a=decimal(a);b=decimal(b);const scale=Math.max(a.scale,b.scale),n=a.n*10n**BigInt(scale-a.scale)+b.n*10n**BigInt(scale-b.scale);return {n,scale};}
function withinLimit(balance,amount,limit){const a=total(balance,amount),b=decimal(limit),scale=Math.max(a.scale,b.scale);return a.n*10n**BigInt(scale-a.scale)<=b.n*10n**BigInt(scale-b.scale);}
export function rlUsdAmount(value){if(typeof value!=='string'||! /^(?:0|[1-9]\d{0,8})(?:\.\d{1,6})?$/.test(value))throw Error('Enter RLUSD with up to nine whole digits and six decimal places.');const [whole,fraction='']=value.split('.');const normalized=whole+(fraction.replace(/0+$/,'')?'.'+fraction.replace(/0+$/,''):'');if(compare(normalized,'0')<=0)throw Error('Amount must be greater than zero.');return normalized;}
export async function prepareRlUsdPayment(env,user,input){
 const owner=await externalId(user),wallet=await env.DB.prepare('SELECT * FROM wallets WHERE external_id=?').bind(owner).first();
 if(wallet?.status!=='ready'||!wallet.public_key)return json({error:'Create your testnet wallet first.'},409);
 if(!isValidClassicAddress(input.destination||'')||input.destination===wallet.address||input.destination===RLUSD.issuer)return json({error:'Enter a different holder’s valid XRP Ledger r-address. Issuer redemption is not supported.'},400);
 let amount;try{amount=rlUsdAmount(input.amount);}catch(e){return json({error:e.message},400);}
 const tag=input.tag===''||input.tag==null?undefined:Number(input.tag);
 if(tag!==undefined&&(!/^\d+$/.test(String(input.tag))||!Number.isSafeInteger(tag)||tag<0||tag>4294967295))return json({error:'Invalid destination tag.'},400);
 const [sourceToken,destinationToken,source,destination,info,fees]=await Promise.all([
  rlUsdState(wallet.address),rlUsdState(input.destination),
  rpc('account_info',{account:wallet.address,ledger_index:'validated',strict:true}),rpc('account_info',{account:input.destination,ledger_index:'validated',strict:true}),rpc('server_info'),rpc('fee')
 ]);
 if(!sourceToken.ready||!destinationToken.ready)return json({error:'Both wallets need an active, authorized and unfrozen official test RLUSD trust line.'},409);
 if(sourceToken.transferRate!==1000000000||destinationToken.transferRate!==1000000000)return json({error:'The issuer transfer fee changed. Sending is paused until it can be reviewed.'},409);
 if(compare(sourceToken.balance,amount)<0)return json({error:'Not enough test RLUSD for this transfer.'},400);
 if(!withinLimit(destinationToken.balance,amount,destinationToken.limit))return json({error:'This amount exceeds the recipient’s RLUSD trust-line limit.'},400);
 if(source?.error||!source?.validated||destination?.error||!destination?.validated||!info?.info?.validated_ledger||fees?.error)throw Error('Validated ledger state is unavailable.');
 const flags=destination.account_data.Flags||0;
 if(tag===undefined&&(flags&0x00020000))return json({error:'This recipient requires a destination tag.'},400);
 if(flags&0x01000000){const permitted=await rpc('deposit_authorized',{source_account:wallet.address,destination_account:input.destination,ledger_index:'validated'});if(!permitted?.validated||permitted.deposit_authorized!==true)return json({error:'This recipient has not authorized your wallet to deposit.'},400);}
 const ledger=info.info.validated_ledger,reserve=toDrops(String(ledger.reserve_base_xrp))+BigInt(source.account_data.OwnerCount)*toDrops(String(ledger.reserve_inc_xrp)),fee=BigInt(fees.drops.open_ledger_fee);
 if(fee<1n||fee>10000n)return json({error:'Network fees are unusually high. Please try later.'},503);
 if(BigInt(source.account_data.Balance)<reserve+fee)return json({error:'Keep enough test XRP for the reserve and network fee.'},400);
 const token={currency:RLUSD.currency,issuer:RLUSD.issuer,value:amount};
 // No partial payments or alternate assets: exact delivery and a maximum debit of the reviewed RLUSD amount.
 const transaction={TransactionType:'Payment',Account:wallet.address,Destination:input.destination,Amount:token,SendMax:{...token},Flags:0,Fee:fee.toString(),Sequence:source.account_data.Sequence,LastLedgerSequence:ledger.seq+20,SigningPubKey:wallet.public_key,...(tag===undefined?{}:{DestinationTag:tag})};
 return savePrepared(env,owner,wallet,transaction,reserve,ledger.seq);
}
