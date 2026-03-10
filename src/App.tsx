import React, { useEffect, useState } from 'react';
import { BrowserOAuthClient } from '@atproto/oauth-client-browser';

// We add a random number to the URL to force the browser to download the NEWEST version
const metadataUrl = `https://quips.cc/client-metadata.json?v=${Date.now()}`;

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client.init()
      .then((res) => {
        if (res?.session) setSession(res.session);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Setup failed:", err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div style={{background:'#121212',color:'#fff',height:'100vh',display:'flex',alignItems:'center',justifyContent:'center'}}>Loading quips...</div>;

  return (
    <div style={{ backgroundColor: '#121212', color: 'white', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
      <h1>quips</h1>
      {!session ? (
        <div style={{ marginTop: '20px' }}>
          <input id="handle" type="text" placeholder="name.bsky.social" style={{ padding: '10px', borderRadius: '5px' }} />
          <button onClick={() => client.signIn((document.getElementById('handle') as HTMLInputElement).value)} style={{ marginLeft: '10px', padding: '10px 20px', cursor: 'pointer' }}>
            Login
          </button>
        </div>
      ) : (
        <div style={{ textAlign: 'center' }}>
          <p>Logged in as: {session.did}</p>
          <button onClick={() => { localStorage.clear(); window.location.reload(); }}>Logout</button>
        </div>
      )}
    </div>
  );
}
	

