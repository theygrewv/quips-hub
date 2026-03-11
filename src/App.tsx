import React, { useEffect, useState, CSSProperties } from 'react';
import { BrowserOAuthClient, OAuthSession } from '@atproto/oauth-client-browser';

// Defining our view states for the hub
type ViewState = 'hub' | 'bats' | 'glyphs' | 'germ';

export default function App() {
  const [client, setClient] = useState<BrowserOAuthClient | null>(null);
  const [session, setSession] = useState<OAuthSession | null>(null);
  const [view, setView] = useState<ViewState>('hub');

  useEffect(() => {
    const init = async () => {
      try {
        const c = new BrowserOAuthClient({
          handleResolver: 'https://bsky.social',
          clientMetadata: 'https://quips.cc/client-metadata.json'
        });
        
        const result = await c.init();
        
        // Proper Type Narrowing for ATProto Discriminated Unions
        if (result && 'session' in result && result.session) {
          setSession(result.session as OAuthSession);
        }
        
        setClient(c);
      } catch (e) {
        console.error("HUB_BOOT_ERROR", e);
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
        console.error("AUTH_ERROR", e);
      }
    }
  };

  // Shared Styles
  const fs: CSSProperties = { background: '#000', color: '#0f0', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace', textAlign: 'center' };
  const btn: CSSProperties = { padding: '20px', background: '#111', color: '#0f0', border: '1px solid #0f0', margin: '10px', cursor: 'pointer', fontWeight: 'bold', width: '240px' };
  const gBtn: CSSProperties = { ...btn, color: '#f0f', borderColor: '#f0f' };

  // Screen: GERM Protocol
  if (view === 'germ') return (
    <div style={{...fs, color: '#f0f'}}>
      <h1>[ GERM_NETWORK_P2P ]</h1>
      <div style={{border: '1px solid #f0f', padding: '20px', width: '80%', textAlign: 'left'}}>
        <p>> PROTOCOL: ARMORED_MSG_v1</p>
        <p>> STATUS: HANDSHAKE_READY</p>
        <p>> LUMINARY: {session?.did}</p>
      </div>
      <button onClick={() => setView('hub')} style={{...gBtn, background: 'none', marginTop: '20px'}}>RETURN_TO_HUB</button>
    </div>
  );

  // Screen: BATS
  if (view === 'bats') return (
    <div style={fs}>
      <h1>[ BATS_OS ]</h1>
      <p>Bilateral Analytics & Tracking System: ACTIVE</p>
      <button onClick={() => setView('hub')} style={{...btn, background: 'none', marginTop: '20px'}}>RETURN_TO_HUB</button>
    </div>
  );

  // Screen: Glyphs
  if (view === 'glyphs') return (
    <div style={fs}>
      <h1>[ GLYPHS_DECRYPTOR ]</h1>
      <p>Visual pattern recognition: STANDBY</p>
      <button onClick={() => setView('hub')} style={{...btn, background: 'none', marginTop: '20px'}}>RETURN_TO_HUB</button>
    </div>
  );

  // Main Hub Login / Nav
  return (
    <div style={{ background: '#050505', color: '#0f0', minHeight: '100vh', padding: '20px', fontFamily: 'monospace', textAlign: 'center' }}>
      <h1 style={{ fontSize: '3.5rem', borderBottom: '2px solid #0f0', marginBottom: '40px' }}>quips</h1>
      
      {!session ? (
        <section>
          <p style={{marginBottom: '20px'}}>[ IDENTIFY_LUMINARY ]</p>
          <input id="h" placeholder="v.skydrops.app" style={{ background: '#000', color: '#0f0', border: '1px solid #0f0', padding: '15px', width: '280px' }} />
          <br /><br />
          <button onClick={handleLogin} style={{ background: '#0f0', color: '#000', padding: '15px 30px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>INITIATE</button>
        </section>
      ) : (
        <nav style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <p style={{marginBottom: '30px', opacity: 0.8}}>Welcome home, Luminary.</p>
          <button onClick={() => setView('bats')} style={btn}>BATS</button>
          <button onClick={() => setView('glyphs')} style={btn}>GLYPHS</button>
          <button onClick={() => setView('germ')} style={gBtn}>GERM_NET</button>
          <button onClick={() => { localStorage.clear(); window.location.reload(); }} style={{...btn, color: '#f00', border: '1px solid #f00', marginTop: '40px'}}>TERMINATE_SESSION</button>
        </nav>
      )}
    </div>
  );
}
