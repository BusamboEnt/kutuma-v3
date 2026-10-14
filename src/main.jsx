import React, {useEffect, Component} from 'react';
import {createRoot} from 'react-dom/client';
import {PrivyProvider, usePrivy, useLogin} from '@privy-io/react-auth';
import './style.css';
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
  const {ready, authenticated, user, logout} = usePrivy();
  const {login} = useLogin({onError: () => message('Couldn’t sign in', 'Please try again. Email sign-in must be enabled and this domain allowed in the Privy dashboard.')});
  useEffect(() => {
    buttons().forEach(b => {b.disabled = !ready;});
    const profile = document.querySelector('#profile');
    const connect = document.querySelector('#connect');
    profile.textContent = authenticated ? 'Account' : 'Sign in';
    connect.textContent = authenticated ? 'Sign out' : 'Get wallet';
    const status = document.querySelector('#sign-in-status');
    if(status) status.textContent = authenticated ? 'Signed in' : 'Sign in with email';
    window.kutumaAuth = {open: () => {
      if(!ready) {message('Getting ready', 'Secure sign-in is loading. Please try again in a moment.');return;}
      ui.close();
      if(!authenticated) {login();return;}
      const email = user?.email?.address || 'Privy account';
      ui.show('YOUR ACCOUNT', `<h2>You’re signed in.</h2><p>${ui.escape(email)}</p>${ui.notice('Your sign-in is connected. XRP Ledger wallet creation is the next setup step. The balances and transfers shown here remain sample data.')}<button class="primary" id="account-done">Back to wallet</button><button class="secondary" id="account-logout">Sign out</button>`);
      document.querySelector('#account-done').onclick = ui.close;
      document.querySelector('#account-logout').onclick = async () => {
        try {await logout();ui.close();} catch {message('Couldn’t sign out', 'Please try again.');}
      };
    }};
    connect.onclick = async () => {
      if(!authenticated) {window.kutumaAuth.open();return;}
      try {await logout();ui.close();} catch {message('Couldn’t sign out', 'Please try again.');}
    };
    return () => {delete window.kutumaAuth;};
  }, [ready, authenticated, user, login, logout]);
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
