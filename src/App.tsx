import React, { useEffect, useState } from 'react';
import { BrowserOAuthClient } from '@atproto/oauth-client-browser';

const client = new BrowserOAuthClient({
  handleResolver: 'https://bsky.social',
  clientMetadata: {
    client_id: 'https://quips.cc/client-metadata.json',
    redirect_uri: 'https://quips.cc/',
    scope: 'atproto transition:generic',
    response_type: 'code',
  },
});

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    client.init()
      .then((res) => {
        if (res?.session) setSession(res.session);
      })
      .catch((err) => {
        console.error(err);
        setError(err.message);
      });
  }, []);

  const login = async () => {
    const handle = (document.getElementById('handle') as HTMLInputElement).value;
    try {
      await client.signIn(handle);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div style={{ backgroundColor: '#121212', color: 'white', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', textAlign: 'center' }}>
      <h1>quips</h1>
      <p style={{ opacity: 0.7 }}>Welcome home, Luminary.</p>
      
      {error && <p style={{ color: '#ff4444' }}>Error: {error}</p>}

      {!session ? (
        <div style={{ marginTop: '20px' }}>
          <input id="handle" type="text" placeholder="yourname.bsky.social" style={{ padding: '12px', borderRadius: '8px', border: '1px solid #333', backgroundColor: '#222', color: 'white', marginRight: '10px' }} />
          <button onClick={login} style={{ padding: '12px 24px', borderRadius: '8px', border: 'none', backgroundColor: '#fff', color: '#000', fontWeight: 'bold', cursor: 'pointer' }}>
            Login
          </button>
        </div>
      ) : (
        <div style={{ marginTop: '20px' }}>
          <p>Logged in as: <strong>{session.did}</strong></p>
          <button onClick={() => { localStorage.clear(); window.location.reload(); }} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #444', backgroundColor: 'transparent', color: 'white' }}>Logout</button>
        </div>
      )}
    </div>
  );
}
