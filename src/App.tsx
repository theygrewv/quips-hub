import React, { useEffect, useState } from 'react';
import { BrowserOAuthClient } from '@atproto/oauth-client-browser';

export default function App() {
  const [client, setClient] = useState<BrowserOAuthClient | null>(null);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('hub');

  useEffect(() => {
    const init = async () => {
      try {
        const c = new BrowserOAuthClient({
          handleResolver: 'https://bsky.social',
          clientMetadata: "https://quips.cc/client-metadata.json"
        });
        const result = await c.init();
        if (result?.session) setSession(result.session);
        setClient(c);
      } catch (err) { console.error("OS_INIT_FAILURE", err); }
      finally { setLoading(false); }
    };
    init();
  }, []);

  const login = async () => {
    const h = (document.getElementById('handle') as HTMLInputElement).value;
    try { await client?.signIn(h); } catch (e) { alert("INIT_SESSION_ERROR"); }
  };

  if (loading) return (
    <div style={{background:'#000', color:'#0f0', height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'monospace'}}>
      [ BOOTING_QUIPS_OS... ]
    </div>
  );

  // --- SUB-PAGES ---
  if (view === 'bats') return (
    <div style={fullScreen}>
      <h1 style={{color:'#0f0'}}>[ BATS ]</h1>
      <p>Bilateral Analytics & Tracking System: ONLINE</p>
      <button onClick={() => setView('hub')} style={smallBtn}>RETURN_TO_HUB</button>
    </div>
  );

  if (view === 'glyphs') return (
    <div style={fullScreen}>
      <h1 style={{color:'#0f0'}}>[ GLYPHS ]</h1>
      <p>Visual Decryptors: STANDBY</p>
      <button onClick={() => setView('hub')} style={smallBtn}>RETURN_TO_HUB</button>
    </div>
  );

  if (view === 'germ') return (
    <div style={{...fullScreen, color:'#f0f'}}>
      <h1>[ GERM_NETWORK ]</h1>
      <div style={{border:'1px solid #f0f', padding:'20px', textAlign:'left'}}>
        <p>> ENCRYPTION_LAYER: ARMORED</p>
        <p>> STATUS: MONITORING_MESSAGES</p>
        <p>> SOURCE: dev.quips.cc</p>
      </div>
      <button onClick={() => setView('hub')} style={{...smallBtn, backgroundColor:'#f0f'}}>RETURN_TO_HUB</button>
    </div>
  );

  // --- HUB ---
  return (
    <div style={{ backgroundColor: '#050505', color: '#0f0', minHeight: '100vh', padding: '20px', fontFamily: 'monospace', textAlign: 'center' }}>
      <header style={{ marginBottom: '40px', borderBottom: '2px solid #0f0', paddingBottom: '10px' }}>
        <h1 style={{ fontSize: '3rem', margin: '0' }}>quips</h1>
        <p>[ SECURE_GAME_HUB_v1 ]</p>
      </header>

      {!session ? (
        <section style={{ maxWidth: '400px', margin: '0 auto', background: '#111', padding: '40px', border: '1px solid #0f0' }}>
          <p style={{marginBottom:'20px'}}>IDENTIFY PLAYER</p>
          <input id="handle" type="text" placeholder="name.bsky.social" style={inputStyle} />
          <button onClick={login} style={mainBtn}>INITIATE_SESSION</button>
        </section>
      ) : (
        <main style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ marginBottom: '20px', padding: '10px', border: '1px solid #0f0' }}>
            <p>LOGGED_IN_AS: {session.did}</p>
          </div>
          <nav style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <button onClick={() => setView('bats')} style={btnStyle}>BATS</button>
            <button onClick={() => setView('glyphs')} style={btnStyle}>GLYPHS</button>
            <button onClick={() => setView('germ')} style={{...btnStyle, color:'#f0f', border:'1px solid #f0f'}}>GERM_NET</button>
            <button style={btnStyle}>GAME_LOGS</button>
            <button style={btnStyle}>ACHIEVEMENTS</button>
            <button onClick={() => { localStorage.clear(); window.location.reload(); }} style={logoutBtn}>TERMINATE</button>
          </nav>
        </main>
      )}
    </div>
  );
}

const fullScreen = { background: '#000', color: '#0f0', height: '100vh', display: 'flex', flexDirection: 'column' as 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace', textAlign: 'center' as 'center' };
const inputStyle = { width: '80%', padding: '12px', background: '#000', color: '#0f0', border: '1px solid #0f0', marginBottom: '20px' };
const mainBtn = { width: '90%', padding: '15px', background: '#0f0', color: '#000', fontWeight: 'bold', border: 'none', cursor: 'pointer' };
const btnStyle = { padding: '25px', background: '#111', color: '#0f0', border: '1px solid #0f0', fontWeight: 'bold', cursor: 'pointer' };
const logoutBtn = { padding: '25px', background: '#200', color: '#f00', border: '1px solid #f00', cursor: 'pointer' };
const smallBtn = { padding: '10px 20px', background: '#0f0', color: '#000', border: 'none', cursor: 'pointer', marginTop: '20px' };
