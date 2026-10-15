const statusLabels={validated:'Confirmed',failed:'Failed',expired:'Expired',prepared:'Not approved',signing:'Approving',signed:'Awaiting submission',submitted:'Pending'};
export function activityStatus(item){return statusLabels[item.status]||'Status unavailable';}
export function activityAmount(item){
 if(item.kind==='trustline')return 'RLUSD trust line';
 if(item.asset==='RLUSD')return item.tokenAmount==null?'Amount unavailable':item.tokenAmount+' RLUSD';
 if(item.amountDrops==null)return 'Amount unavailable';
 const n=BigInt(item.amountDrops),fraction=(n%1000000n).toString().padStart(6,'0').replace(/0+$/,'');return (n/1000000n).toString()+(fraction?'.'+fraction:'')+' XRP';
}
export function activityTitle(item){if(item.kind==='trustline')return 'RLUSD trust line';return item.direction==='receive'?'Received':item.direction==='self'?'Wallet transfer':item.status==='validated'?'Sent':'Send attempt';}
export function createActivityController({wallet,getAccessToken,isCurrent}){
 const ui=window.kutumaUI;let disposed=false,busy=false,version=0;
 const current=()=>!disposed&&isCurrent();
 const screenActive=()=>current()&&document.querySelector('#flow').open&&document.querySelector('#flow-label').textContent==='TESTNET ACTIVITY';
 let selected=null;
 async function refresh(){
  if(busy||!current())return;
  busy=true;const requestVersion=++version;
  window.kutumaActivity={...window.kutumaActivity,loading:true,error:null};ui.render();
  try{
   const token=await getAccessToken();if(!token||!current())throw Error('Please sign in again.');
   const response=await fetch('/api/activity',{headers:{Authorization:'Bearer '+token},cache:'no-store'});
   const data=await response.json();if(!response.ok)throw Error(data.error||'Activity is temporarily unavailable.');
   if(!current()||requestVersion!==version)return;
   window.kutumaActivity={...data,loading:false,error:null};
   if(selected){const next=data.activity.find(t=>t.id===selected.id||t.hash&&t.hash===selected.hash||t.intentId&&t.intentId===selected.intentId);if(next)selected=next;}
  }catch(error){if(current()&&requestVersion===version)window.kutumaActivity={...window.kutumaActivity,loading:false,error:error.message||'Activity is temporarily unavailable.'};}
  finally{busy=false;if(current()){ui.render();if(screenActive())receipt();}}
 }
 function open(id){if(!current())return;selected=window.kutumaActivity?.activity?.find(t=>t.id===id);if(selected)receipt();}
 function receipt(){
  if(!current()||!selected)return;const t=selected,e=ui.escape,confirmed=t.status==='validated';
  const counterparty=t.kind==='trustline'?'Official test issuer':t.direction==='receive'?'From':'To';
  const amountLabel=t.kind==='trustline'?'Action':confirmed?'Delivered amount':'Requested amount';
  const message=confirmed?'Confirmed on XRP Ledger testnet. Test tokens have no monetary value.':t.status==='failed'?'The transaction failed. The requested amount was not delivered; a test XRP fee may have been charged.':t.status==='expired'?'This request expired without a confirmed transfer.':'This is not a confirmed transfer. Refresh to check ledger status.';
  ui.show('TESTNET ACTIVITY',`<h2>${e(activityTitle(t))}.</h2><p>${e(activityStatus(t))}${t.createdAt?' · '+e(new Date(t.createdAt).toLocaleDateString(undefined,{day:'numeric',month:'short'})):''}</p><div class="review-row"><span>${amountLabel}</span><span>${e(activityAmount(t))}</span></div><div class="review-row"><span>${counterparty}</span><span>${e(t.counterparty||'—')}</span></div>${t.feeDrops?`<div class="review-row"><span>${confirmed||t.status==='failed'?'Network fee':'Reviewed fee'}</span><span>${e(activityAmount({asset:'XRP',amountDrops:t.feeDrops}))}</span></div>`:''}${ui.notice(e(window.kutumaActivity?.error||message))}${t.hash?`<label>Transaction hash<input readonly value="${e(t.hash)}"></label>`:''}<button class="primary" id="activity-check" ${busy?'disabled':''}>${busy?'Checking…':'Refresh status'}</button>${t.hash&&/^[A-Fa-f0-9]{64}$/.test(t.hash)?`<a class="secondary explorer-link" href="https://testnet.xrpl.org/transactions/${e(t.hash)}" target="_blank" rel="noopener noreferrer">View on testnet explorer ↗</a>`:''}`);
  document.querySelector('#flow-content').classList.add('transfer-screen');document.querySelector('#activity-check').onclick=refresh;
 }
 function dispose(){disposed=true;version++;}
 return {refresh,open,dispose};
}
