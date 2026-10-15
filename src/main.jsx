import React, {useEffect, useState, useRef, Component} from 'react';
import {createRoot} from 'react-dom/client';
import {PrivyProvider, usePrivy, useLogin, useAuthorizationSignature} from '@privy-io/react-auth';
import './style.css';
import {showTransfer} from './transfer-ui.js';
import {showRlusd} from './rlusd-ui.js';
import {showTestnet} from './testnet-ui.js';
import './wallet.js';

const appId = import.meta.env.VITE_PRIVY_APP_ID || 'cmtq2e1jx00ec0cjs0chvb1s6';
const ui = window.kutumaUI;
const buttons = () => [document.querySelector('#profile'), document.querySelector('#connect')];
function message(title, text) {
  ui.show('KUTUMA V3', `<h2>${ui.escape(title)}</h2>${ui.notice(ui.escape(text))}${ui.doneButton('Back to wallet')}`);
}
class AuthBoundary extends Component {
  state = {failed: false};
  static getDerivedStateFromError() {return {failed: true};}
  componentDidCatch() {
    buttons().forEach(b => {b.disabled = false;});
    window.kutumaAuth = {open: () => message('Sign-in unavailable', 'Please reload and try again. If this continues, check this domain and email sign-in in the Privy dashboard.')};
  }
  render() {return this.state.failed ? null : this.props.children;}
}
function AuthBridge() {
  const {ready, authenticated, user, logout, getAccessToken} = usePrivy();
  const {generateAuthorizationSignature}=useAuthorizationSignature();
  const [wallet, setWallet] = useState(null);
  const currentUser = useRef(null);
  currentUser.current = authenticated ? user?.id : null;
  useEffect(() => {
    let cancelled=false;
    setWallet(null);window.kutumaWallet=null;window.kutumaBalance=null;window.kutumaRlusd=null;window.kutumaUI.render();
    if(ready && authenticated && user?.id) {
      (async()=>{try{const token=await getAccessToken();if(!token||cancelled)return;const r=await fetch('/api/wallet',{headers:{Authorization:'Bearer '+token},cache:'no-store'});const data=await r.json();if(!cancelled && r.ok)setWallet(data.wallet);}catch{}})();
    }
    return ()=>{cancelled=true;};
  },[ready,authenticated,user?.id,getAccessToken]);
  useEffect(()=>{let cancelled=false;window.kutumaWallet=wallet;window.kutumaUI.render();if(wallet)(async()=>{try{const token=await getAccessToken();const r=await fetch('/api/rlusd',{headers:{Authorization:'Bearer '+token},cache:'no-store'});const d=await r.json();if(r.ok&&!cancelled){window.kutumaRlusd=d.rlusd;ui.render();}}catch{}})();return()=>{cancelled=true;};},[wallet,getAccessToken]);
  const {login} = useLogin({onError: () => message('Couldn’t sign in', 'Please try again. Email sign-in must be enabled and this domain allowed in the Privy dashboard.')});
  useEffect(() => {
    buttons().forEach(b => {b.disabled = !ready;});
    const profile = document.querySelector('#profile');
    const connect = document.querySelector('#connect');
    profile.textContent = authenticated ? 'Account' : 'Sign in';
    connect.textContent = wallet ? 'Wallet' : 'Get wallet';
    const status = document.querySelector('#sign-in-status');
    if(status) status.textContent = authenticated ? 'Signed in' : 'Sign in with email';
    window.kutumaRlusdOpen=()=>{if(wallet)showRlusd({wallet,getAccessToken,approve:generateAuthorizationSignature,isCurrent:()=>currentUser.current===user?.id});};
    window.kutumaSend=()=>{if(wallet)showTransfer({wallet,getAccessToken,approve:generateAuthorizationSignature,isCurrent:()=>currentUser.current===user?.id,onSend:window.kutumaSend});};
    window.kutumaAuth = {open: () => {
      if(!ready) {message('Getting ready', 'Secure sign-in is loading. Please try again in a moment.');return;}
      ui.close();
      if(!authenticated) {login();return;}
      const renderAccount = (currentWallet) => {
        const email = user?.email?.address || 'Privy account';
        const details = currentWallet
          ? `<label>Your XRP Ledger testnet address<input readonly id="wallet-address" value="${ui.escape(currentWallet.address)}"></label>${ui.notice('Testnet only. Do not send real funds. Check testnet balances and set up test RLUSD below.')}<button class="primary" id="copy-address">Testnet balance & activation</button><button class="secondary" id="account-rlusd">Test RLUSD</button>`
          : `${ui.notice('Create one user-owned XRPL address for testnet use. No real funds, activation or transfers are involved. Future sign-ins reuse the same wallet.')}<button class="primary" id="create-wallet">Create testnet wallet</button>`;
        ui.show('YOUR ACCOUNT', `<h2>${currentWallet?'Your testnet wallet.':'You’re signed in.'}</h2><p>${ui.escape(email)}</p>${details}<button class="secondary" id="account-logout">Sign out</button>`);
        document.querySelector('#flow-content').classList.add('transfer-screen');
        document.querySelector('#account-logout').onclick = async () => {
          try {await logout();setWallet(null);window.kutumaWallet=null;window.kutumaBalance=null;window.kutumaRlusd=null;window.kutumaUI.render();ui.close();} catch {message('Couldn’t sign out', 'Please try again.');}
        };
        if(currentWallet){document.querySelector('#account-rlusd').onclick=window.kutumaRlusdOpen;document.querySelector('#copy-address').textContent='Testnet balance & activation';document.querySelector('#copy-address').onclick=()=>showTestnet({wallet:currentWallet,getAccessToken,isCurrent:()=>currentUser.current===user?.id,onSend:window.kutumaSend});}
        if(!currentWallet)document.querySelector('#create-wallet').onclick=async()=>{
          const owner=user?.id;
          const button=document.querySelector('#create-wallet');button.disabled=true;button.textContent='Setting up your wallet…';
          try{
            const token=await getAccessToken();if(!token)throw Error('Please sign in again.');
            const r=await fetch('/api/wallet',{method:'POST',headers:{Authorization:'Bearer '+token}});
            const data=await r.json();if(!r.ok)throw Error(data.error || 'Please try again later.');
            if(currentUser.current!==owner)return;
            setWallet(data.wallet);window.kutumaWallet=data.wallet;if(document.querySelector('#flow').open&&document.querySelector('#flow-label').textContent==='YOUR ACCOUNT')renderAccount(data.wallet);
          }catch(error){if(currentUser.current===owner)message('Wallet setup needs a moment',error.message || 'Please try again later.');}
        };
      };
      renderAccount(wallet);
    }};
    connect.onclick=()=>window.kutumaAuth.open();
    return () => {delete window.kutumaAuth;delete window.kutumaSend;delete window.kutumaRlusdOpen;};
  }, [ready, authenticated, user, login, logout, wallet, getAccessToken, generateAuthorizationSignature]);
  return null;
}
buttons().forEach(b => {b.disabled = true;});
createRoot(document.querySelector('#auth-root')).render(
  <AuthBoundary><PrivyProvider appId={appId} config={{
    loginMethods: ['email'],
    appearance: {theme: 'dark', accentColor: '#7659ff', landingHeader: 'Welcome to Kutuma', logo: ''},
    embeddedWallets: {ethereum: {createOnLogin: 'off'}, solana: {createOnLogin: 'off'}},
  }}><AuthBridge /></PrivyProvider></AuthBoundary>
);
