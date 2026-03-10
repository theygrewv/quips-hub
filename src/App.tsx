// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { BrowserOAuthClient } from '@atproto/oauth-client-browser';

export default function App() {
  const [client, setClient] = useState(null);
  const [session, setSession] = useState(null);
  const [view, setView] = useState('hub');

  useEffect(() => {
    const init = async () => {
      try {
        const c = new BrowserOAuthClient({
          handleResolver: 'https://bsky.social',
          clientMetadata: 'https://quips.cc/client-metadata.json'
        });
        const res = await c.init();
        if (res && res.session) setSession(res.session);
        setClient(c);
      } catch (e) { console.error(e); }
    };
    init();
  }, []);

  const login = async () => {
    const handle = (document.getElementById('h') as any)?.value;
    if (client && handle) {
      try {
        await (client as any).signIn(handle);
      } catch (e) { alert("Check handle and try again."); }
    }
  };

  const fs = { background: '#000', color: '#0f0', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace' };

  if (view === 'germ') return (
    <div style={{...fs, color: '#f0f'}}>
      <h1>[ GERM_NETWORK ]</h1>
      <div style={{border: '1px solid #f0f', padding: '20px', width: '85%', textAlign: 'left'}}>
        <p>> PROTOCOL: ARMORED_MSG_v1</p>
        <p>> STATUS: P2P_HANDSHAKE_READY</p>
        <p>> ENCRYPTION: AES-256-GCM</p>
      </div>
      <button onClick={() => setView('hub')} style={{marginTop:'20px', color:'#f0f', border:'1px solid #f0f', background:'none', padding:'10px', cursor:'pointer'}}>RETURN_TO_HUB</button>
    </div>
  );

  return (
    <div style={{ background: '#050505', color: '#0f0', minHeight: '100vh', padding: '20px', fontFamily: 'monospace', textAlign: 'center' }}>
      <h1 style={{ fontSize: '3rem', borderBottom: '2px solid #0f0', marginBottom: '40px' }}>quips</h1>
      
      {!session ? (
        <section>
          <p style={{marginBottom: '20px'}}>[ IDENTIFY_PLAYER ]</p>
          <input id="h" placeholder="name.bsky.social" style={{ background: '#000', color: '#0f0', border: '1px solid #0f0', padding: '15px', width: '250px' }} />
          <br /><br />
          <button onClick={login} style={{ background: '#0f0', color: '#000', padding: '15px 30px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>INITIATE</button>
        </section>
      ) : (
        <main style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', maxWidth: '600px', margin: '0 auto' }}>
          <div style={{gridColumn: '1/3', marginBottom: '20px', fontSize: '0.8rem', opacity: 0.7}}>LOGGED_IN: {session.did}</div>
          <button onClick={() => setView('hub')} style={{padding:'20px', background:'#111', color:'#0f0', border:'1px solid #0f0', cursor:'pointer'}}>BATS</button>
          <button onClick={() => setView('hub')} style={{padding:'20px', background:'#111', color:'#0f0', border:'1px solid #0f0', cursor:'pointer'}}>GLYPHS</button>
          <button onClick={() => setView('germ')} style={{padding:'20px', background:'#111', color:'#f0f', border:'1px solid #f0f', cursor:'pointer'}}>GERM_NET</button>
          <button onClick={() => { localStorage.clear(); window.location.reload(); }} style={{padding:'20px', background:'#200', color:'#f00', border:'1px solid #f00', cursor:'pointer'}}>TERMINATE</button>
        </main>
      )}
    </div>
  );
}
