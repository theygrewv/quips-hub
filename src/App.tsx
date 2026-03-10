import React, { useEffect, useState } from 'react';
import { BrowserOAuthClient } from '@atproto/oauth-client-browser';

const styles = {
  fs: { background: '#000', color: '#0f0', height: '100vh', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace', textAlign: 'center' as const },
  btn: { padding: '20px', background: '#111', color: '#0f0', border: '1px solid #0f0', fontWeight: 'bold', cursor: 'pointer' },
  germ: { padding: '20px', background: '#111', color: '#f0f', border: '1px solid #f0f', fontWeight: 'bold', cursor: 'pointer' }
};

export default function App() {
  const [client, setClient] = useState<BrowserOAuthClient | null>(null);
  const [session, setSession] = useState<any>(null);
  const [view, setView] = useState('hub');

  useEffect(() => {
    const c = new BrowserOAuthClient({
      handleResolver: 'https://bsky.social',
      clientMetadata: "https://quips.cc/client-metadata.json"
    });
    c.init().then(res => { if (res?.session) setSession(res.session); setClient(c); });
  }, []);

  if (view === 'germ') return (
    <div style={{...styles.fs, color:'#f0f'}}>
      <h1>[ GERM_NET_P2P ]</h1>
      <div style={{border:'1px solid #f0f', padding:'20px', width:'80%'}}>
        <p>> ENCRYPTION: AES-GCM</p>
        <p>> P2P_STATUS: DISCOVERING_PEERS...</p>
      </div>
      <button onClick={() => setView('hub')} style={{marginTop:'20px', color:'#f0f'}}>BACK</button>
    </div>
  );

  if (view === 'bats') return (
    <div style={styles.fs}>
      <h1>[ BATS_SYSTEM ]</h1>
      <p>Tracking active.</p>
      <button onClick={() => setView('hub')} style={{marginTop:'20px', color:'#0f0'}}>BACK</button>
    </div>
  );

  return (
    <div style={{ background: '#050505', color: '#0f0', minHeight: '100vh', padding: '20px', fontFamily: 'monospace', textAlign: 'center' }}>
      <h1 style={{fontSize:'3rem', borderBottom:'1px solid #0f0'}}>quips</h1>
      {!session ? (
        <div style={{marginTop:'50px'}}>
          <input id="h" type="text" placeholder="handle" style={{padding:'10px', background:'#000', color:'#0f0', border:'1px solid #0f0'}} />
          <button onClick={() => client?.signIn((document.getElementById('h') as HTMLInputElement).value)} style={{marginLeft:'10px', background:'#0f0', color:'#000', padding:'10px'}}>START</button>
        </div>
      ) : (
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'15px', marginTop:'40px'}}>
          <button onClick={() => setView('bats')} style={styles.btn}>BATS</button>
          <button onClick={() => setView('hub')} style={styles.btn}>GLYPHS</button>
          <button onClick={() => setView('germ')} style={styles.germ}>GERM_NET</button>
          <button onClick={() => { localStorage.clear(); window.location.reload(); }} style={{...styles.btn, color:'#f00', borderColor:'#f00'}}>LOGOUT</button>
        </div>
      )}
    </div>
  );
}
