import React, { useEffect, useState } from 'react';
import { BrowserOAuthClient } from '@atproto/oauth-client-browser';

export default function App() {
  const [client, setClient] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [view, setView] = useState('hub');

  useEffect(() => {
    const init = async () => {
      try {
        const c = new BrowserOAuthClient({
          handleResolver: 'https://bsky.social',
          clientMetadata: 'https://quips.cc/client-metadata.json'
        });
        const result = await c.init() as any;
        if (result?.session) setSession(result.session);
        setClient(c);
      } catch (e) {
        console.error("BOOT_FAILURE", e);
      }
    };
    init();
  }, []);

  const login = async () => {
    const input = document.getElementById('handle-in') as HTMLInputElement;
    if (client && input?.value) {
      try {
        await (client as any).signIn(input.value);
      } catch (e) {
        alert("LOGIN_ERROR: Check console");
      }
    }
  };

  const fullScreen: any = { background: '#000', color: '#0f0', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace' };

  if (view === 'germ') return (
    <div style={{...fullScreen, color: '#f0f'}}>
      <h1>[ GERM_NETWORK ]</h1>
      <div style={{border: '1px solid #f0f', padding: '20px', width: '80%'}}>
        <p>> PROTOCOL: ARMORED_MSG</p>
        <p>> STATUS: P2P_HANDSHAKE_READY</p>
      </div>
      <button onClick={() => setView('hub')} style={{marginTop: '20px', color: '#f0f', border: '1px solid #f0f', background: 'none', padding: '10px'}}>RETURN</button>
    </div>
  );

  return (
    <div style={{ background: '#050505', color: '#0f0', minHeight: '100vh', padding: '20px', fontFamily: 'monospace', textAlign: 'center' }}>
      <header style={{ borderBottom: '2px solid #0f0', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '3rem' }}>quips</h1>
      </header>

      {!session ? (
        <section>
          <p>[ IDENTIFY_PLAYER ]</p>
          <input id="handle-in" placeholder="handle.bsky.social" style={{ background: '#000', color: '#0f0', border: '1px solid #0f0', padding: '15px', width: '250px' }} />
          <br /><br />
          <button onClick={login} style={{ background: '#0f0', color: '#000', padding: '15px 30px', fontWeight: 'bold', border: 'none' }}>INITIATE</button>
        </section>
      ) : (
        <nav style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', maxWidth: '600px', margin: '0 auto' }}>
          <div style={{gridColumn: '1/3', marginBottom: '10px'}}>PLAYER_DID: {session.did}</div>
          <button onClick={() => setView('hub')} style={{padding:'20px', background:'#111', color:'#0f0', border:'1px solid #0f0'}}>BATS</button>
          <button onClick={() => setView('hub')} style={{padding:'20px', background:'#111', color:'#0f0', border:'1px solid #0f0'}}>GLYPHS</button>
          <button onClick={() => setView('germ')} style={{padding:'20px', background:'#111', color:'#f0f', border:'1px solid #f0f'}}>GERM_NET</button>
          <button onClick={() => { localStorage.clear(); window.location.reload(); }} style={{padding:'20px', background:'#200', color:'#f00', border:'1px solid #f00'}}>LOGOUT</button>
        </nav>
      )}
    </div>
  );
}
