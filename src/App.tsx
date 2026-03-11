import React, { useState, useEffect, useRef } from 'react';

const DEFAULT_GAMES = [
  { 
    id: 'quips-glyphs', 
    title: 'Glyphs', 
    uri: 'https://glyphs.quips.cc', 
    thumb: 'https://images.unsplash.com/photo-1627398242454-45a1465c2479?w=400&q=80', 
    author: 'v.skydrops.app' 
  },
  { 
    id: 'atproto-2048', 
    title: '2048 (ATProto)', 
    uri: 'https://2048.blue', 
    thumb: 'https://images.unsplash.com/photo-1614680376573-3e4e1ef4142a?w=400&q=80', 
    author: '2048.blue' 
  },
  { 
    id: 'atproto-ttt', 
    title: 'Tic-Tac-Toe', 
    uri: 'https://tictactoe.firehose.games', 
    thumb: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=400&q=80', 
    author: 'firehose.games' 
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
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', padding: '20px', backgroundColor: '#1f1f1f', borderRadius: '20px' }}>
        <div>
          <h2 style={{ margin: 0 }}>{user ? user.displayName : 'Welcome'}</h2>
          <small style={{ color: '#3b82f6' }}>{user ? `@${user.handle}` : 'Please Login'}</small>
        </div>
        {!user ? (
          <button onClick={login} style={{ padding: '10px 20px', borderRadius: '20px', background: '#3b82f6', color: 'white', border: 'none', fontWeight: 'bold' }}>Login</button>
        ) : (
          <img src={user.avatar} style={{ width: '60px', height: '60px', borderRadius: '50%', border: '2px solid white' }} alt="PFP" />
        )}
      </header>

      <div style={{ backgroundColor: '#aaa', padding: '30px', borderRadius: '30px', color: '#000' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0 }}>Network Games</h2>
          <button style={{ padding: '10px 20px', borderRadius: '20px', background: '#0055ff', color: 'white', border: 'none', fontWeight: 'bold' }}>Scan ATProto</button>
        </div>

        {!activeGame ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '15px' }}>
            {DEFAULT_GAMES.map(game => (
              <div key={game.id} onClick={() => setActiveGame(game)} style={{ background: '#fff', borderRadius: '20px', overflow: 'hidden', cursor: 'pointer' }}>
                <img src={game.thumb} style={{ width: '100%', height: '100px', objectFit: 'cover' }} alt={game.title} />
                <div style={{ padding: '10px' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{game.title}</div>
                  <div style={{ fontSize: '11px', color: '#0055ff' }}>by @{game.author}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ position: 'fixed', inset: '10px', background: '#000', borderRadius: '25px', overflow: 'hidden', display: 'flex', flexDirection: 'column', zIndex: 100 }}>
            <div style={{ background: '#1f1f1f', padding: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'white', fontWeight: 'bold' }}>{activeGame.title}</span>
              <button onClick={() => setActiveGame(null)} style={{ background: 'red', border: 'none', color: 'white', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer' }}>✕</button>
            </div>
            <iframe ref={iframeRef} src={activeGame.uri} style={{ flex: 1, border: 'none' }} title={activeGame.title} />
          </div>
        )}
      </div>
    </div>
  );
}
