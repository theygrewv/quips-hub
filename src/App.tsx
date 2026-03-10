import React, { useEffect, useState, CSSProperties } from 'react';
import { BrowserOAuthClient } from '@atproto/oauth-client-browser';

// Defining the shapes so TypeScript stops guessing
interface OAuthSession {
  did: string;
  [key: string]: any;
}

export default function App() {
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
        const result = await c.init();
        // Explicitly checking if session exists before setting it
        if (result && 'session' in result && result.session) {
          setSession(result.session as OAuthSession);
        }
        setClient(c);
      } catch (e) {
        console.error("OS_BOOT_ERR:", e);
      }
    };
    init();
  }, []);

  const handleLogin = async () => {
    const input = document.getElementById('h') as HTMLInputElement | null;
    if (client && input?.value) {
      try {
        await client.signIn(input.value);
      } catch (e) {
        alert("Check your handle and try again.");
      }
    }
  };

  // Explicitly typing the styles as CSSProperties
  const fs: CSSProperties = { background: '#000', color: '#0f0', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace', textAlign: 'center' };
  const btn: CSSProperties = { padding: '20px', background: '#111', color: '#0f0', border: '1px solid #0f0', margin: '5px', cursor: 'pointer', fontWeight: 'bold' };
  const gBtn: CSSProperties = { padding: '20px', background: '#111', color: '#f0f', border: '1px solid #f0f', margin: '5px', cursor: 'pointer', fontWeight: 'bold' };

  if (view === 'germ') return (
    <div style={{...fs, color: '#f0f'}}>
      <h1>[ GERM_NETWORK ]</h1>
      <div style={{border: '1px solid #f0f', padding: '20px', width: '80%', textAlign: 'left'}}>
        <p>> PROTOCOL: ARMORED_MSG_v1</p>
        <p>> STATUS: P2P_HANDSHAKE_READY</p>
        <p>> ENCRYPTION: AES-256-GCM</p>
      </div>
      <button onClick={() => setView('hub')} style={{...gBtn, background: 'none', marginTop: '20px'}}>RETURN_TO_HUB</button>
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
          <button onClick={handleLogin} style={{ background: '#0f0', color: '#000', padding: '15px 30px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>INITIATE</button>
        </section>
      ) : (
        <main style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', maxWidth: '600px', margin: '0 auto' }}>
          <div style={{gridColumn: '1/3', marginBottom: '20px', opacity: 0.8}}>PLAYER_DID: {session.did}</div>
          <button onClick={() => setView('hub')} style={btn}>BATS</button>
          <button onClick={() => setView('hub')} style={btn}>GLYPHS</button>
          <button onClick={() => setView('germ')} style={gBtn}>GERM_NET</button>
          <button onClick={() => { localStorage.clear(); window.location.reload(); }} style={{...btn, color: '#f00', border: '1px solid #f00'}}>TERMINATE</button>
        </main>
      )}
    </div>
  );
}
