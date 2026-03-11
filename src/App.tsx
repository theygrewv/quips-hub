import React, { useState, useEffect, useRef } from 'react';

// 1. THE GAME REGISTRY - Pointing to your live subdomain
const DEFAULT_GAMES = [
  { 
    id: 'quips-glyphs', 
    title: 'Glyphs', 
    uri: 'https://glyphs.quips.cc', 
    thumb: 'https://images.unsplash.com/photo-1627398242454-45a1465c2479?w=400&q=80', 
    author: 'v.skydrops.app' 
  }
];

export default function App() {
  const [user, setUser] = useState(null); 
  const [activeGame, setActiveGame] = useState(null);
  const iframeRef = useRef(null);

  // 2. THE HANDSHAKE BRIDGE
  useEffect(() => {
    const handleMessage = (event) => {
      // Catch the 'Ready' signal from Glyphs
      if (event.data.type === 'GAME_READY' && user) {
        console.log("Glyphs is ready! Sending Player data...");
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
      
      if (event.data.type === 'POST_SCORE') {
        alert(`Player ${user.handle} scored ${event.data.payload.score} with word: ${event.data.payload.word}!`);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [user]);

  // 3. MOCK LOGIN (Replace with your ATProto logic)
  const login = () => {
    setUser({
      did: 'did:plc:wtnzjxse32d34n7jlsngh7fb',
      handle: 'v.skydrops.app',
      displayName: 'Vincent',
      avatar: 'https://cdn.bsky.app/img/avatar/plain/did:plc:wtnzjxse32d34n7jlsngh7fb/pkg_1@1k.webp'
    });
  };

  return (
    <div style={{ backgroundColor: '#0F172A', color: 'white', minHeight: '100vh', padding: '20px', fontFamily: 'sans-serif' }}>
      
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        <h1 style={{ letterSpacing: '4px', margin: 0 }}>QUIPS HUB</h1>
        {!user ? (
          <button onClick={login} style={{ padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', background: '#3B82F6', color: 'white', border: 'none' }}>Login</button>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>{user.handle}</span>
            <img src={user.avatar} style={{ width: '40px', height: '40px', borderRadius: '50%', border: '2px solid #3B82F6' }} alt="PFP" />
          </div>
        )}
      </header>

      {!activeGame ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px' }}>
          {DEFAULT_GAMES.map(game => (
            <div 
              key={game.id} 
              onClick={() => setActiveGame(game)}
              style={{ background: '#1E293B', borderRadius: '15px', overflow: 'hidden', cursor: 'pointer' }}
            >
              <img src={game.thumb} style={{ width: '100%', height: '120px', objectFit: 'cover' }} alt={game.title} />
              <div style={{ padding: '15px' }}>
                <h3 style={{ margin: '0' }}>{game.title}</h3>
                <small style={{ color: '#94A3B8' }}>by {game.author}</small>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ position: 'fixed', inset: '20px', background: '#000', borderRadius: '20px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ background: '#1E293B', padding: '10px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{activeGame.title}</span>
            <button onClick={() => setActiveGame(null)} style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '20px', cursor: 'pointer' }}>✕</button>
          </div>
          <iframe 
            ref={iframeRef}
            src={activeGame.uri}
            style={{ flex: 1, border: 'none' }}
            title={activeGame.title}
          />
        </div>
      )}
    </div>
  );
}
