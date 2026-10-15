export function showTestnet({wallet,getAccessToken,isCurrent,onSend}) {
 const ui=window.kutumaUI;
 let snapshot=window.kutumaBalance;
 let busy=false;
 function screen(error='') {
  if(!isCurrent())return;
  const details=snapshot?`${snapshot.activated?'Active on testnet':'Not activated'} · ${snapshot.balanceXrp} XRP`:'Balance not checked';
  ui.show('XRP LEDGER TESTNET',`<h2>Your test wallet.</h2><p>${ui.escape(details)}</p><label>Testnet address<input readonly id="testnet-address" value="${ui.escape(wallet.address)}"></label>${ui.notice(ui.escape(error||'Only test tokens, with no monetary value. Never send real funds. RLUSD setup is available from Account.'))}<button class="primary" id="testnet-refresh">Refresh balance</button>${snapshot&&!snapshot.activated?'<button class="secondary" id="testnet-activate">Activate with test XRP</button>':''}${snapshot?.activated&&onSend?'<button class="secondary" id="testnet-send">Send test XRP</button>':''}<button class="secondary" id="testnet-copy">Copy address</button><button class="secondary" id="done">Back to wallet</button>`);
  const send=document.querySelector('#testnet-send');if(send)send.onclick=onSend;
  document.querySelector('#testnet-refresh').onclick=()=>request(false);
  const activate=document.querySelector('#testnet-activate');if(activate)activate.onclick=()=>request(true);
  document.querySelector('#testnet-copy').onclick=async()=>{try{await navigator.clipboard.writeText(wallet.address);document.querySelector('#testnet-copy').textContent='Copied';}catch{document.querySelector('#testnet-address').select();}};
 }
 async function request(activate) {
  if(busy||!isCurrent())return;
  busy=true;
  document.querySelectorAll('#testnet-refresh,#testnet-activate').forEach(b=>b.disabled=true);
  const button=document.querySelector(activate?'#testnet-activate':'#testnet-refresh');if(button)button.textContent=activate?'Requesting test XRP…':'Checking testnet…';
  try {
   const token=await getAccessToken();if(!token)throw Error('Please sign in again.');
   const response=await fetch('/api/wallet/'+(activate?'activate':'balance'),{method:activate?'POST':'GET',headers:{Authorization:'Bearer '+token},cache:'no-store'});
   const data=await response.json();if(!response.ok)throw Error(data.error||'Testnet is temporarily unavailable.');
   if(!isCurrent())return;
   snapshot=data.balance;window.kutumaBalance=snapshot;ui.render();if(document.querySelector('#flow').open&&document.querySelector('#testnet-refresh'))screen(data.pending?'Test XRP requested. Refresh shortly to check ledger validation.':'');
  }catch(error){if(isCurrent()&&document.querySelector('#flow').open&&document.querySelector('#testnet-refresh'))screen(error.message||'Please try again later.');}finally{busy=false;}
 }
 screen();request(false);
}
