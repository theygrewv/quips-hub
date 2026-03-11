import React, { useEffect, useState, CSSProperties } from 'react';
import { BrowserOAuthClient, OAuthSession } from '@atproto/oauth-client-browser';

export default function App() {
  // Satisfies ATProto by using their internal 'OAuthSession' type
  const [client, setClient] = useState<BrowserOAuthClient | null>(null);
  const [session, setSession] = useState<OAuthSession | null>(null);
  const [view, setView] = useState<'hub' | 'germ' | 'bats'>('hub');

  useEffect(() => {
    const init = async () => {
      try {
        const c = new BrowserOAuthClient({
          handleResolver: 'https://bsky.social',
          clientMetadata: 'https://quips.cc/client-metadata.json'
        });
        
        // Protocol Requirement: Check for existing session on boot
        const result = await c.init();
        if (result && 'session' in result) {
          setSession(result.session);
        }
        setClient(c);
      } catch (e) {
        console.error("PROTOCOL_BOOT_FAILURE", e);
      }
    };
    init();
  }, []);

  const login = async () => {
    const el = document.getElementById('h') as HTMLInputElement | null;
    if (client && el?.value) {
      try {
        // Protocol Requirement: signIn handles the redirect flow
        await client.signIn(el.value);
      } catch (e) {
        console.error("SIGNIN_FAILURE", e);
      }
    }
  };

  const fs: CSSProperties = { background: '#000', color: '#0f0', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace', textAlign: 'center' };
  const btn: CSSProperties = { padding: '20px', background: '#111', color: '#0f0', border: '1px solid #0f0', margin: '10px', cursor: 'pointer', fontWeight: 'bold', width: '200px' };

  if (view === 'germ') return (
    <div style={{...fs, color: '#f0f'}}>
      <h1>[ GERM_NETWORK ]</h1>
      <div style={{border: '1px solid #f0f', padding: '20px', width: '80%', textAlign: 'left'}}>
        <p>> STATUS: P2P_STREAM_READY</p>
        <p>> IDENTITY: {session?.did}</p>
      </div>
      <button onClick={() => setView('hub')} style={{...btn, color:'#f0f', borderColor:'#f0f'}}>RETURN</button>
    </div>
  );

  return (
    <div style={{ background: '#050505', color: '#0f0', minHeight: '100vh', padding: '20px', fontFamily: 'monospace', textAlign: 'center' }}>
      <h1 style={{ fontSize: '3rem', borderBottom: '2px solid #0f0', marginBottom: '40px' }}>quips</h1>
      
      {!session ? (
        <section>
          <p>[ IDENTIFY_PLAYER ]</p>
          <input id="h" placeholder="handle.bsky.social" style={{ background: '#000', color: '#0f0', border: '1px solid #0f0', padding: '15px', width: '250px' }} />
          <br /><br />
          <button onClick={login} style={{ background: '#0f0', color: '#000', padding: '15px 30px', fontWeight: 'bold', border: 'none' }}>INITIATE</button>
        </section>
      ) : (
        <nav style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <p style={{marginBottom: '20px', opacity: 0.7}}>PLAYER_CONNECTED: {session.did}</p>
          <button onClick={() => setView('hub')} style={btn}>BATS</button>
          <button onClick={() => setView('germ')} style={{...btn, color:'#f0f', borderColor:'#f0f'}}>GERM_NET</button>
          <button onClick={() => { localStorage.clear(); window.location.reload(); }} style={{...btn, color:'#f00', borderColor:'#f00'}}>EXIT</button>
        </nav>
      )}
    </div>
  );
}
