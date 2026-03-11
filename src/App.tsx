import React, { useState, useEffect, useRef } from 'react';

const DEFAULT_GAMES = [
  { 
    id: 'quips-glyphs', 
    title: 'Glyphs', 
    uri: 'https://glyphs.quips.cc', 
    thumb: '/shakasign.png', 
    author: 'v.skydrops.app' 
  },
  { 
    id: 'atproto-2048', 
    title: '2048 (ATProto)', 
    uri: 'https://2048.blue', 
    thumb: 'https://images.unsplash.com/photo-1614680376573-3e4e1ef4142a?w=400&q=80', 
    author: '2048.blue' 
  }
];

export default function App() {
  const [user, setUser] = useState(null); 
  const [activeGame, setActiveGame] = useState(null);
  const iframeRef = useRef(null);

  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data.type === 'GAME_READY' && user) {
        iframeRef.current?.contentWindow?.postMessage({
          type: 'HUB_AUTH_SUCCESS',
          payload: {
            did: user.did,
            handle: user.handle,
            displayName: user.displayName,
            avatar: user.avatar
          }
        }, '*');
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [user]);

  const login = () => {
    setUser({
      did: 'did:plc:wtnzjxse32d34n7jlsngh7fb',
      handle: 'v.skydrops.app',
      displayName: 'vin 🤙',
      avatar: 'https://cdn.bsky.app/img/avatar/plain/did:plc:wtnzjxse32d34n7jlsngh7fb/pkg_1@1k.webp'
    });
  };

  return (
    <div style={{ backgroundColor: '#000', color: 'white', minHeight: '100vh', padding: '20px', fontFamily: 'sans-serif' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', padding: '15px', backgroundColor: '#1f1f1f', borderRadius: '15px' }}>
        <div>
          <h3 style={{ margin: 0 }}>{user ? user.displayName : 'Welcome'}</h3>
          <small style={{ color: '#3b82f6' }}>{user ? `@${user.handle}` : 'Sign in to play'}</small>
        </div>
        {!user ? (
          <button onClick={login} style={{ padding: '8px 16px', borderRadius: '20px', background: '#3b82f6', color: 'white', border: 'none' }}>Login</button>
        ) : (
          <img src={user.avatar} style={{ width: '50px', height: '50px', borderRadius: '50%', border: '2px solid white' }} alt="PFP" />
        )}
      </header>

      <div style={{ backgroundColor: '#e2e8f0', padding: '20px', borderRadius: '25px', color: '#000' }}>
        <h2 style={{ marginTop: 0 }}>Native Games</h2>
        {!activeGame ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            {DEFAULT_GAMES.map(game => (
              <div key={game.id} onClick={() => setActiveGame(game)} style={{ background: '#fff', borderRadius: '15px', overflow: 'hidden', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                <img src={game.thumb} style={{ width: '100%', height: '80px', objectFit: 'cover' }} alt={game.title} />
                <div style={{ padding: '10px' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{game.title}</div>
                  <div style={{ fontSize: '11px', color: '#3b82f6' }}>@{game.author}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ position: 'fixed', inset: '0', background: '#000', display: 'flex', flexDirection: 'column', zIndex: 100 }}>
             <div style={{ background: '#1f1f1f', padding: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'white' }}>{activeGame.title}</span>
              <button onClick={() => setActiveGame(null)} style={{ background: 'none', border: 'none', color: 'white', fontSize: '24px' }}>✕</button>
            </div>
            <iframe ref={iframeRef} src={activeGame.uri} style={{ flex: 1, border: 'none' }} title={activeGame.title} />
          </div>
        )}
      </div>
    </div>
  );
}
