import React, { useEffect, useState, CSSProperties } from 'react';
import { BrowserOAuthClient, OAuthSession } from '@atproto/oauth-client-browser';

export default function App() {
  // 1. Explicitly typing the state so it's not 'never' or 'unknown'
  const [client, setClient] = useState<BrowserOAuthClient | null>(null);
  const [session, setSession] = useState<OAuthSession | null>(null);
  const [view, setView] = useState<'hub' | 'germ' | 'bats' | 'glyphs'>('hub');

  useEffect(() => {
    const init = async () => {
      try {
        const c = new BrowserOAuthClient({
          handleResolver: 'https://bsky.social',
          clientMetadata: 'https://quips.cc/client-metadata.json'
        });
        
        // 2. Casting the init result to 'any' or checking properties
        const result = await c.init();
        if (result && 'session' in result && result.session) {
          setSession(result.session as OAuthSession);
        }
        setClient(c);
      } catch (e) {
        console.error("OS_BOOT_FAILURE", e);
      }
    };
    init();
  }, []);

  const handleLogin = async () => {
    // 3. Specifically telling TS this is an Input element
    const input = document.getElementById('h') as HTMLInputElement | null;
    if (client && input?.value) {
      try {
        await client.signIn(input.value);
      } catch (e) {
        alert("Login failed. Check handle.");
      }
    }
  };

  const fs: CSSProperties = { background: '#000', color: '#0f0', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace', textAlign: 'center' };
  const btn: CSSProperties = { padding: '20px', background: '#111', color: '#0f0', border: '1px solid #0f0', margin: '5px', cursor: 'pointer', fontWeight: 'bold' };

  if (view === 'germ') return (
    <div style={{...fs, color: '#f0f'}}>
      <h1>[ GERM_NETWORK ]</h1>
      <div style={{border: '1px solid #f0f', padding: '20px', width: '80%', textAlign: 'left'}}>
        <p>> PROTOCOL: ARMORED_MSG_v1</p>
        <p>> STATUS: P2P_READY</p>
      </div>
      <button onClick={() => setView('hub')} style={{...btn, color: '#f0f', borderColor: '#f0f', marginTop: '20px'}}>RETURN</button>
    </div>
  );

  return (
    <div style={{ background: '#050505', color: '#0f0', minHeight: '100vh', padding: '20px', fontFamily: 'monospace', textAlign: 'center' }}>
      <header style={{ borderBottom: '2px solid #0f0', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '3rem' }}>quips</h1>
      </header>

      {!session ? (
        <section>
          <p style={{marginBottom: '20px'}}>[ IDENTIFY_PLAYER ]</p>
          <input id="h" placeholder="handle.bsky.social" style={{ background: '#000', color: '#0f0', border: '1px solid #0f0', padding: '15px', width: '250px' }} />
          <br /><br />
          <button onClick={handleLogin} style={{ background: '#0f0', color: '#000', padding: '15px 30px', fontWeight: 'bold', border: 'none' }}>INITIATE</button>
        </section>
      ) : (
        <nav style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', maxWidth: '600px', margin: '0 auto' }}>
          <div style={{gridColumn: '1/3', marginBottom: '10px'}}>PLAYER_DID: {session.did}</div>
          <button onClick={() => setView('hub')} style={btn}>BATS</button>
          <button onClick={() => setView('hub')} style={btn}>GLYPHS</button>
          <button onClick={() => setView('germ')} style={{...btn, color: '#f0f', borderColor: '#f0f'}}>GERM_NET</button>
          <button onClick={() => { localStorage.clear(); window.location.reload(); }} style={{...btn, color: '#f00', borderColor: '#f00'}}>LOGOUT</button>
        </nav>
      )}
    </div>
  );
}
