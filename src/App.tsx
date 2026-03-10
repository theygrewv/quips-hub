import React, { useEffect, useState } from 'react';
import { BrowserOAuthClient } from '@atproto/oauth-client-browser';

const styles = {
  hub: { background: '#050505', color: '#0f0', minHeight: '100vh', fontFamily: 'monospace', textAlign: 'center' as const, padding: '20px' },
  germ: { background: '#000', color: '#f0f', minHeight: '100vh', fontFamily: 'monospace', textAlign: 'center' as const, padding: '20px' },
  bats: { background: '#000', color: '#0f0', minHeight: '100vh', fontFamily: 'monospace', textAlign: 'center' as const, padding: '20px' },
  btn: { background: '#111', color: '#0f0', border: '1px solid #0f0', padding: '20px', cursor: 'pointer', margin: '10px', width: '220px', fontWeight: 'bold' as const },
  gBtn: { background: '#111', color: '#f0f', border: '1px solid #f0f', padding: '20px', cursor: 'pointer', margin: '10px', width: '220px', fontWeight: 'bold' as const }
};

export default function App() {
  const [client, setClient] = useState<any>(null);
  const [sess, setSess] = useState<any>(null);
  const [view, setView] = useState('hub');

  useEffect(() => {
    const c = new BrowserOAuthClient({
      handleResolver: 'https://bsky.social',
      clientMetadata: 'https://quips.cc/client-metadata.json'
    });
    c.init().then(r => { 
      if (r?.session) setSess(r.session); 
      setClient(c); 
    });
  }, []);

  if (view === 'germ') return (
    <div style={styles.germ}>
      <h1>[ GERM_NETWORK_P2P ]</h1>
      <div style={{ border: '1px solid #f0f', padding: '20px', textAlign: 'left', maxWidth: '500px', margin: '0 auto' }}>
        <p>> PROTOCOL: ARMORED_MSG_v1</p>
        <p>> P2P_STATE: DISCOVERY_MODE</p>
        <p>> ENCRYPTION: AES-256-GCM</p>
      </div>
      <button onClick={() => setView('hub')} style={styles.gBtn}>RETURN_TO_HUB</button>
    </div>
  );

  if (view === 'bats') return (
    <div style={styles.bats}>
      <h1>[ BATS_SYSTEM ]</h1>
      <p>Bilateral Analytics & Tracking System: ONLINE</p>
      <button onClick={() => setView('hub')} style={styles.btn}>RETURN_TO_HUB</button>
    </div>
  );

  return (
    <div style={styles.hub}>
      <h1 style={{ fontSize: '3.5rem', borderBottom: '2px solid #0f0', marginBottom: '40px' }}>quips</h1>
      {!sess ? (
        <div style={{ marginTop: '50px' }}>
          <p>[ IDENTIFY_PLAYER ]</p>
          <input id="h" placeholder="handle.bsky.social" style={{ background: '#000', color: '#0f0', border: '1px solid #0f0', padding: '15px', width: '250px' }} />
          <br /><br />
          <button onClick={() => client?.signIn((document.getElementById('h') as any).value)} style={{ background: '#0f0', color: '#000', padding: '15px 30px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>INITIATE_SESSION</button>
        </div>
      ) : (
        <div style={{ marginTop: '50px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{border:'1px solid #333', padding:'10px', marginBottom:'20px'}}>PLAYER_DID: {sess.did}</div>
          <button onClick={() => setView('bats')} style={styles.btn}>BATS</button>
          <button onClick={() => setView('hub')} style={styles.btn}>GLYPHS</button>
          <button onClick={() => setView('germ')} style={styles.gBtn}>GERM_NET</button>
          <button onClick={() => { localStorage.clear(); window.location.reload(); }} style={{ ...styles.btn, color: '#f00', borderColor: '#f00' }}>TERMINATE_SESSION</button>
        </div>
      )}
    </div>
  );
}

