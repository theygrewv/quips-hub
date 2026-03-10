import React, { useEffect, useState } from 'react';
import { BrowserOAuthClient } from '@atproto/oauth-client-browser';

export default function App() {
  const [c, setC] = useState<any>(null);
  const [s, setS] = useState<any>(null);
  const [v, setV] = useState('hub');

  useEffect(() => {
    const client = new BrowserOAuthClient({
      handleResolver: 'https://bsky.social',
      clientMetadata: 'https://quips.cc/client-metadata.json'
    });
    client.init().then((r: any) => {
      if (r?.session) setS(r.session);
      setC(client);
    });
  }, []);

  const login = () => {
    const e = document.getElementById('h') as any;
    if (c && e?.value) (c as any).signIn(e.value);
  };

  const fs: any = { background: '#000', color: '#0f0', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace', textAlign: 'center' };

  if (v === 'germ') return (
    <div style={{...fs, color: '#f0f'}}>
      <h1>[ GERM_NETWORK ]</h1>
      <div style={{border:'1px solid #f0f', padding:'20px', width:'80%'}}>
        <p>> PROTOCOL: ARMORED_MSG</p>
        <p>> STATUS: P2P_READY</p>
      </div>
      <button onClick={() => setV('hub')} style={{marginTop:'20px', color:'#f0f', border:'1px solid #f0f', background:'none', padding:'10px'}}>RETURN</button>
    </div>
  );

  return (
    <div style={{ background: '#050505', color: '#0f0', minHeight: '100vh', padding: '20px', fontFamily: 'monospace', textAlign: 'center' }}>
      <h1 style={{ fontSize: '3rem', borderBottom: '2px solid #0f0', marginBottom: '40px' }}>quips</h1>
      {!s ? (
        <div style={{marginTop:'50px'}}>
          <p>[ IDENTIFY_PLAYER ]</p>
          <input id="h" placeholder="handle" style={{ background: '#000', color: '#0f0', border: '1px solid #0f0', padding: '15px' }} />
          <br /><br />
          <button onClick={login} style={{ background: '#0f0', color: '#000', padding: '15px 30px', fontWeight: 'bold', border: 'none' }}>INITIATE</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', maxWidth: '600px', margin: '0 auto' }}>
          <div style={{gridColumn:'1/3', marginBottom:'10px'}}>CONNECTED: {s.did}</div>
          <button onClick={() => setV('hub')} style={{padding:'20px', background:'#111', color:'#0f0', border:'1px solid #0f0'}}>BATS</button>
          <button onClick={() => setV('hub')} style={{padding:'20px', background:'#111', color:'#0f0', border:'1px solid #0f0'}}>GLYPHS</button>
          <button onClick={() => setV('germ')} style={{padding:'20px', background:'#111', color:'#f0f', border:'1px solid #f0f'}}>GERM_NET</button>
          <button onClick={() => { localStorage.clear(); window.location.reload(); }} style={{padding:'20px', background:'#200', color:'#f00', border:'1px solid #f00'}}>EXIT</button>
        </div>
      )}
    </div>
  );
}
