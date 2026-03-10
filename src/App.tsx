import React, { useEffect, useState } from 'react';
import { BrowserOAuthClient } from '@atproto/oauth-client-browser';

// --- CONFIGURATION ---
const client = new BrowserOAuthClient({
  handleResolver: 'https://bsky.social',
  clientMetadata: {
    client_id: 'https://quips.cc/client-metadata.json',
    redirect_uri: 'https://quips.cc/',
    scope: 'atproto transition:generic',
    response_type: 'code',
  },
});

const App = () => {
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    client.init().then((res) => {
      if (res?.session) {
        setSession(res.session);
      }
    }).catch(console.error);
  }, []);

  const login = async (handle: string) => {
    try {
      await client.signIn(handle);
    } catch (err) {
      console.error("Login failed:", err);
    }
  };

  return (
    <div style={{ padding: '20px', textAlign: 'center', fontFamily: 'sans-serif' }}>
      <h1>Welcome home, Luminary</h1>
      <p>quips is now live on the atmosphere.</p>
      
      {!session ? (
        <div>
          <input id="handle" type="text" placeholder="yourname.bsky.social" />
          <button onClick={() => login((document.getElementById('handle') as HTMLInputElement).value)}>
            Login to quips
          </button>
        </div>
      ) : (
        <div>
          <p>Logged in as: {session.did}</p>
          <button onClick={() => { localStorage.clear(); window.location.reload(); }}>
            Logout
          </button>
        </div>
      )}
    </div>
  );
};

export default App;

