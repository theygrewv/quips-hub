import React, { useEffect, useState } from 'react';
import { BrowserOAuthClient } from '@atproto/oauth-client-browser';

export default function App() {
  const [client, setClient] = useState<BrowserOAuthClient | null>(null);
  const [session, setSession] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        // We manually create the client inside useEffect to ensure the page is ready
        const c = new BrowserOAuthClient({
          handleResolver: 'https://bsky.social',
          clientMetadata: "https://quips.cc/client-metadata.json"
        });
        
        const result = await c.init();
        if (result?.session) setSession(result.session);
        setClient(c);
      } catch (err: any) {
        console.error(err);
        setError(err.message);
      }
    };
    init();
  }, []);

  const login = async () => {
    if (!client) return;
    const handle = (document.getElementById('handle') as HTMLInputElement).value;
    await client.signIn(handle);
  };

  if (error) {
    return (
      <div style={{background:'#121212', color:'red', height:'100vh', padding:'20px'}}>
        <h1>Metadata Error</h1>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>Retry Refresh</button>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#121212', color: 'white', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
      <h1>quips</h1>
      {!session ? (
        <div>
          <input id="handle" type="text" placeholder="name.bsky.social" style={{ padding: '10px', borderRadius: '5px' }} />
          <button onClick={login} style={{ marginLeft: '10px', padding: '10px 20px' }}>Login</button>
        </div>
      ) : (
        <p>Welcome, {session.did}</p>
      )}
    </div>
  );
}
	

