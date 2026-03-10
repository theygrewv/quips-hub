import React, { useEffect, useState } from 'react';
import { BrowserOAuthClient } from '@atproto/oauth-client-browser';

const s = {
  fs: { background: '#000', color: '#0f0', height: '100vh', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace', textAlign: 'center' as const },
  btn: { padding: '20px', background: '#111', color: '#0f0', border: '1px solid #0f0', fontWeight: 'bold', cursor: 'pointer', margin: '5px' },
  gBtn: { padding: '20px', background: '#111', color: '#f0f', border: '1px solid #f0f', fontWeight: 'bold', cursor: 'pointer', margin: '5px' }
};

export default function App() {
  const [c, setC] = useState<BrowserOAuthClient | null>(null);
  const [sess, setSess] = useState<any>(null);
  const [v, setV] = useState('hub');

  useEffect(() => {
    const client = new BrowserOAuthClient({
      handleResolver: 'https://bsky.social',
      clientMetadata: 'https://quips.cc/client-metadata.json'
    });
    client.init().then(r => {
      if (r?.session) setSess(r.session);
      setC(client);
    });
  }, []);

  if (v === 'germ') return (
    <div style={{...s.fs, color:'#f0f'}}>
      <h1>[ GERM_NET_P2P ]</h1>
      <div style={{border:'1px solid #f0f', padding:'20px', width:'80%', textAlign:'left'}}>
        <p>> PROTOCOL: ARMORED_STREAM</p>
        <p>> P2P_ENCRYPTION: AES-256-GCM</p>
        <p>> STATUS: SECURE_LOBBY_ACTIVE</p>
      </div>
      <button onClick={() => setV('hub')} style={{color:'#f0f', marginTop:'20px', background:'none', border:'1px solid #f0f', padding:'10px'}}>BACK_TO_HUB</button>
    </div>
  );

  if (v === 'bats') return (
    <div style={s.fs}>
      <h1>[ BATS_OS ]</h1>
      <p>Bilateral Analytics active.</p>
      <button onClick={() => setV('hub')} style={{color:'#0f0', marginTop:'20px', background:'none', border:'1px solid #0f0', padding:'10px'}}>BACK</button>
    </div>
  );

  if (v === 'glyphs') return (
    <div style={s.fs}>
      <h1>[ GLYPHS ]</h1>
      <p>Visual decryptors standing by.</p>
      <button onClick={() => setV('hub')} style={{color:'#0f0', marginTop:'20px', background:'none', border:'1px solid #0f0', padding:'10px'}}>BACK</button>
    </div>
  );

  return (
    <div style={{ background: '#050505', color: '#0f0', minHeight: '100vh', padding: '20px', fontFamily: 'monospace', textAlign: 'center' }}>
      <h1 style={{ fontSize: '3rem', borderBottom: '2px solid #0f0', marginBottom: '40px' }}>quips</h1>
      {!sess ? (
        <div style={{ marginTop: '50px' }}>
          <p>[ IDENTIFY_PLAYER ]</p>
          <input id='h' type='text' placeholder='handle.bsky.social' style={{ padding: '12px', background: '#000', color: '#0f0', border: '1px solid #0f0', width: '250px' }} />
          <br /><br />
          <button onClick={() => c?.signIn((document.getElementById('h') as HTMLInputElement).value)} style={{ background: '#0f0', color: '#000', padding: '15px 30px', fontWeight: 'bold', border: 'none' }}>INITIATE_SESSION</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', maxWidth: '600px', margin: '0 auto' }}>
          <button onClick={() => setV('bats')} style={s.btn}>BATS</button>
          <button onClick={() => setV('glyphs')} style={s.btn}>GLYPHS</button>
          <button onClick={() => setV('germ')} style={s.gBtn}>GERM_NET</button>
          <button onClick={() => { localStorage.clear(); window.location.reload(); }} style={{ ...s.btn, color: '#f00', borderColor: '#f00' }}>TERMINATE</button>
        </div>
      )}
    </div>
  );
}
