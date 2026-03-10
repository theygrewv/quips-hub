import React, { useEffect, useState } from 'react';
import { BrowserOAuthClient } from '@atproto/oauth-client-browser';

export default function App() {
  const [client, setClient] = useState<BrowserOAuthClient | null>(null);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const login = async () => {
    if (!client) return;
    const handle = (document.getElementById('handle') as HTMLInputElement).value;
    await client.signIn(handle);
  };

  if (loading) return (
    <div style={{background:'#0a0a0a', color:'#fff', height:'100vh', display:'flex', alignItems:'center', justifyContent:'center'}}>
      <p>spinning the wax...</p>
    </div>
  );

  return (
    <div style={{ backgroundColor: '#0a0a0a', color: '#e0e0e0', minHeight: '100vh', padding: '20px', fontFamily: 'monospace', textAlign: 'center' }}>
      <header style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '2.5rem', color: '#fff', marginBottom: '5px' }}>quips</h1>
        <p style={{ letterSpacing: '2px', opacity: 0.6 }}>WELCOME HOME, LUMINARY</p>
      </header>

      {!session ? (
        <section style={{ maxWidth: '400px', margin: '0 auto', background: '#111', padding: '30px', borderRadius: '15px', border: '1px solid #222' }}>
          <p style={{ marginBottom: '20px' }}>Sign in to access your grooves.</p>
          <input 
            id="handle" 
            type="text" 
            placeholder="handle.bsky.social" 
            style={{ width: '80%', padding: '12px', borderRadius: '8px', border: '1px solid #333', backgroundColor: '#000', color: '#fff', marginBottom: '15px' }} 
          />
          <button onClick={login} style={{ width: '90%', padding: '12px', borderRadius: '8px', border: 'none', backgroundColor: '#fff', color: '#000', fontWeight: 'bold', cursor: 'pointer' }}>
            DROP THE NEEDLE
          </button>
        </section>
      ) : (
        <main style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div style={{ marginBottom: '30px', padding: '15px', background: '#111', borderRadius: '10px', border: '1px solid #333' }}>
            <p>Logged in as: <span style={{color: '#fff'}}>{session.did}</span></p>
          </div>

          <nav style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <button style={buttonStyle}>THE FIRMAMENT</button>
            <button style={buttonStyle}>LPs (POSTS)</button>
            <button style={buttonStyle}>GROOVES (COMMENTS)</button>
            <button style={buttonStyle}>LOVES (LIKES)</button>
            <button style={buttonStyle}>STYLUS (COMPOSE)</button>
            <button 
              onClick={() => { localStorage.clear(); window.location.reload(); }} 
              style={{ ...buttonStyle, backgroundColor: '#330000', color: '#ff4444' }}
            >
              LOGOUT
            </button>
          </nav>
        </main>
      )}
    </div>
  );
}

const buttonStyle = {
  padding: '20px',
  borderRadius: '12px',
  border: '1px solid #222',
  backgroundColor: '#111',
  color: '#fff',
  fontSize: '0.9rem',
  fontWeight: 'bold',
  cursor: 'pointer',
  transition: '0.2s',
  letterSpacing: '1px'
};

