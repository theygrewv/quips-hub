	mport React, { useEffect, useState } from 'react';
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
    <div style={{ backgroundColor: '#121212', color: 'white', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
      <h1>quips</h1>
      <p style={{ opacity: 0.7 }}>Welcome home, Luminary.</p>
      
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}

      {!session ? (
        <div style={{ marginTop: '20px' }}>
          <input id="handle" type="text" placeholder="yourname.bsky.social" style={{ padding: '10px', borderRadius: '5px', border: 'none', marginRight: '10px' }} />
          <button onClick={login} style={{ padding: '10px 20px', borderRadius: '5px', border: 'none', backgroundColor: '#fff', color: '#000', fontWeight: 'bold' }}>
            Login
          </button>
        </div>
      ) : (
        <div style={{ marginTop: '20px' }}>
          <p>Logged in as: <strong>{session.did}</strong></p>
          <button onClick={() => { localStorage.clear(); window.location.reload(); }}>Logout</button>
        </div>
      )}
    </div>
  );
}

