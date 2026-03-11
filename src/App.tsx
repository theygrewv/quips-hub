import React, { useEffect, useState, useCallback } from 'react';
import { BrowserOAuthClient, OAuthSession } from '@atproto/oauth-client-browser';
import { Agent } from '@atproto/api';

const DEFAULT_GAMES = [
  { 
    id: "quips-glyphs", 
    title: "Glyphs", 
    uri: "https://glyphs.quips.cc", 
    thumb: "https://images.unsplash.com/photo-1627398242454-45a1465c2479?w=400&q=80", 
    author: "theygrewv.bsky.social" 
  }
];

export default function App() {
  const [session, setSession] = useState<OAuthSession | null>(null);
  const [client, setClient] = useState<BrowserOAuthClient | null>(null);
  const [handleInput, setHandleInput] = useState('');
  const [myProfile, setMyProfile] = useState<any>(null);
  const [resolvedAvatar, setResolvedAvatar] = useState<string | null>(null);
  
  // Game OS States
  const [foundGames, setFoundGames] = useState<any[]>(DEFAULT_GAMES);
  const [activeGame, setActiveGame] = useState<any | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isLoadingGames, setIsLoadingGames] = useState(false);

  // Chat States
  const [showChat, setShowChat] = useState(false);
  const [threads, setThreads] = useState<any[]>([]);
  const [peerDid, setPeerDid] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [msgInput, setMsgInput] = useState('');
  const [reactingTo, setReactingTo] = useState<string | null>(null);
  const [pos, setPos] = useState({ x: window.innerWidth - 80, y: window.innerHeight - 100 });

  const theme = { bg: '#F4F4F9', surf: '#FFFFFF', pri: '#0055FF', txt: '#1A1A1B', outline: '#D1D5DB' };
  const CHAT_PROXY = 'did:web:api.bsky.chat#bsky_chat';

  // 1. Initialize OAuth
  useEffect(() => {
    const oauthClient = new BrowserOAuthClient({
      handleResolver: 'https://bsky.social',
      clientMetadata: {
        client_id: 'https://quips.cc/client-metadata.json',
        client_name: 'quips', client_uri: 'https://quips.cc',
        redirect_uris: ['https://quips.cc/'],
        scope: 'atproto transition:generic transition:chat.bsky',
        grant_types: ['authorization_code', 'refresh_token'],
        response_types: ['code'], application_type: 'web',
        token_endpoint_auth_method: 'none', dpop_bound_access_tokens: true
      }
    });
    oauthClient.init().then(res => { if (res && 'session' in res) setSession(res.session); });
    setClient(oauthClient);
  }, []);

  // 2. Fetch Profile
  useEffect(() => {
    if (session) {
      const agent = new Agent(session);
      agent.getProfile({ actor: session.did }).then(res => setMyProfile(res.data));
    }
  }, [session]);

  // 3. THE PLATFORM BRIDGE (Listen to Games)
  useEffect(() => {
    const handleGameMessages = async (event: MessageEvent) => {
      const data = event.data;
      if (!data || !data.type) return;

      // When the game wakes up and says "I'm ready!"
      if (data.type === 'GAME_READY') {
        console.log("🎮 Game is ready! Bridging player data...");
        const gameWindow = document.getElementById('active-game-iframe') as HTMLIFrameElement;
        if (gameWindow && gameWindow.contentWindow && myProfile) {
          gameWindow.contentWindow.postMessage({
            type: 'HUB_AUTH_SUCCESS',
            payload: {
              handle: myProfile.handle,
              avatar: myProfile.avatar,
              displayName: myProfile.displayName
            }
          }, '*');
        }
      }

      // When the game says "The player just scored!"
      if (data.type === 'POST_SCORE' && session) {
        console.log(`🏆 Player scored ${data.payload.score}! Posting to ATProto...`);
        const agent = new Agent(session);
        try {
          await agent.post({
            text: `I just scored ${data.payload.score} in a custom Quips game! 🎮🔥`,
            createdAt: new Date().toISOString()
          });
          alert(`Awesome! Your score of ${data.payload.score} was posted to your feed!`);
        } catch (e) {
          console.error("Failed to post score", e);
        }
      }
    };

    window.addEventListener('message', handleGameMessages);
    return () => window.removeEventListener('message', handleGameMessages);
  }, [myProfile, session]);

  // Avatar Lookup
  useEffect(() => {
    const actor = handleInput.trim().toLowerCase();
    if (actor.includes('.') && actor.length > 4) {
      const timeout = setTimeout(async () => {
        try {
          const res = await fetch(`https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${actor}`);
          const data = await res.json();
          if (data.avatar) setResolvedAvatar(data.avatar);
        } catch { setResolvedAvatar(null); }
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [handleInput]);

  // Network Scanner
  const scanNetworkForGames = async () => {
    if (!session) return;
    setIsLoadingGames(true);
    const agent = new Agent(session);
    try {
      const res = await agent.api.app.bsky.feed.searchPosts({ q: '#webgame OR #html5game', limit: 30 });
      const gamesMap = new Map();
      res.data.posts.forEach((p: any) => {
        if (p.embed && p.embed.$type === 'app.bsky.embed.external#view') {
          const ext = p.embed.external;
          if (ext.uri && (ext.uri.includes('itch.io') || ext.uri.includes('poki.com') || ext.uri.includes('github.io'))) {
            gamesMap.set(ext.uri, { id: p.uri, title: ext.title || 'Indie Game', uri: ext.uri, thumb: ext.thumb, author: p.author.handle });
          }
        }
      });
      setFoundGames([...DEFAULT_GAMES, ...Array.from(gamesMap.values())]);
    } catch (e) { console.error("Game scan failed", e); }
    setIsLoadingGames(false);
  };

  // Chat Sync
  const syncChat = useCallback(async () => {
    if (!session) return;
    const agent = new Agent(session);
    try {
      const listRes: any = await (agent.api as any).chat.bsky.convo.listConvos({ limit: 15 }, { headers: { 'atproto-proxy': CHAT_PROXY } });
      if (listRes?.data?.convos) {
        setThreads(listRes.data.convos.map((c: any) => ({
          id: c.id, did: c.members.find((m: any) => m.did !== session.did)?.did,
          handle: c.members.find((m: any) => m.did !== session.did)?.handle, avatar: c.members.find((m: any) => m.did !== session.did)?.avatar
        })));
        if (peerDid) {
          const active = listRes.data.convos.find((c: any) => c.members.some((m: any) => m.did === peerDid));
          if (active) {
            const msgRes: any = await (agent.api as any).chat.bsky.convo.getMessages({ convoId: active.id, limit: 30 }, { headers: { 'atproto-proxy': CHAT_PROXY } });
            setHistory(msgRes.data.messages.reverse());
          }
        }
      }
    } catch (e) {}
  }, [session, peerDid]);

  useEffect(() => { if (session) { syncChat(); const t = setInterval(syncChat, 4000); return () => clearInterval(t); } }, [session, syncChat]);

  // Chat Actions
  const sendMessage = async () => {
    if (!msgInput.trim() || !peerDid || !session) return;
    const active = threads.find(t => t.did === peerDid);
    const agent = new Agent(session);
    try {
      await (agent.api as any).chat.bsky.convo.sendMessage({ convoId: active.id, message: { text: msgInput } }, { headers: { 'atproto-proxy': CHAT_PROXY } });
      setMsgInput(''); syncChat();
    } catch (e) { console.error("Send error", e); }
  };

  const reactToMessage = async (messageId: string, emoji: string) => {
    if (!session || !peerDid) return;
    const active = threads.find(t => t.did === peerDid);
    const agent = new Agent(session);
    try {
      await (agent.api as any).chat.bsky.convo.addReaction({ convoId: active.id, messageId: messageId, value: emoji }, { headers: { 'atproto-proxy': CHAT_PROXY } });
      setReactingTo(null); syncChat();
    } catch (e) { console.error("Reaction error", e); }
  };

  if (!session) {
    return (
      <div style={{ background: theme.bg, minHeight: '100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', fontFamily: 'sans-serif' }}>
        <h1 style={{ color: theme.pri, fontSize: '3rem', fontWeight: 900 }}>quips</h1>
        <input placeholder="handle.bsky.social" value={handleInput} onChange={e => setHandleInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && client?.signIn(handleInput)} style={{ width:'100%', maxWidth: 300, padding: 15, borderRadius: 15, border: `2px solid ${theme.outline}`, textAlign: 'center', margin: '20px 0', outline: 'none' }} />
        <button onClick={() => client?.signIn(handleInput)} style={{ background: theme.pri, color: '#fff', border: 'none', padding: '12px 24px', borderRadius: 12, fontWeight: 'bold', cursor: 'pointer' }}>Connect to Hub</button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', fontFamily: 'sans-serif', position: 'relative', overflow: 'hidden' }}>
      
      <div style={{ position: 'absolute', top: -50, left: -50, right: -50, bottom: -50, backgroundImage: myProfile?.banner ? `url(${myProfile.banner})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(80px) saturate(200%)', opacity: 0.3, zIndex: -1, backgroundColor: theme.bg }} />

      <div style={{ padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '30px' }}>
        
        {myProfile && (
          <div style={{ background: 'rgba(255, 255, 255, 0.7)', backdropFilter: 'blur(20px)', borderRadius: '32px', padding: '30px', width: '100%', maxWidth: '500px', display: 'flex', alignItems: 'center', gap: 20, border: '1px solid rgba(255,255,255,0.8)', boxShadow: '0 8px 32px rgba(0,0,0,0.05)' }}>
            <img src={myProfile.avatar} style={{ width: 80, height: 80, borderRadius: '50%', border: `3px solid ${theme.surf}` }} />
            <div>
              <h2 style={{ margin: '0 0 5px 0', fontSize: '20px', fontWeight: 900 }}>{myProfile.displayName}</h2>
              <p style={{ margin: 0, color: theme.pri, fontWeight: 600 }}>@{myProfile.handle}</p>
            </div>
          </div>
        )}

        <div style={{ background: 'rgba(255, 255, 255, 0.7)', backdropFilter: 'blur(20px)', borderRadius: '32px', padding: '30px', width: '100%', maxWidth: '500px', border: '1px solid rgba(255,255,255,0.8)', boxShadow: '0 8px 32px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ margin: 0, fontWeight: 900 }}>Network Games</h3>
            <button onClick={scanNetworkForGames} style={{ background: theme.pri, color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 12, cursor: 'pointer', fontWeight: 700 }}>
              {isLoadingGames ? 'Scanning...' : 'Scan ATProto'}
            </button>
          </div>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 15 }}>
            {foundGames.map((game, i) => (
              <div 
                key={i} 
                onClick={() => { setActiveGame(game); setIsMinimized(false); }}
                style={{ width: 'calc(50% - 8px)', background: theme.surf, borderRadius: 16, overflow: 'hidden', cursor: 'pointer', border: `1px solid ${theme.outline}44`, transition: 'transform 0.1s' }}
              >
                <div style={{ width: '100%', height: 80, background: theme.outline, backgroundImage: `url(${game.thumb})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                <div style={{ padding: 10 }}>
                  <div style={{ fontWeight: 800, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{game.title}</div>
                  <div style={{ fontSize: 10, color: theme.pri, marginTop: 4 }}>by @{game.author}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {activeGame && !isMinimized && (
        <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '95vw', maxWidth: '800px', height: '75vh', background: '#000', borderRadius: '16px', overflow: 'hidden', zIndex: 100, display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px rgba(0,0,0,0.5)', border: `1px solid #333` }}>
          <div style={{ background: '#222', padding: '10px 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#fff', fontWeight: 600, fontSize: 13 }}>{activeGame.title}</span>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setIsMinimized(true)} style={{ background: '#eab308', width: 14, height: 14, borderRadius: '50%', border: 'none', cursor: 'pointer' }} />
              <button onClick={() => setActiveGame(null)} style={{ background: '#ef4444', width: 14, height: 14, borderRadius: '50%', border: 'none', cursor: 'pointer' }} />
            </div>
          </div>
          <div style={{ flex: 1, background: '#000' }}>
            {/* Added id="active-game-iframe" to act as the bridge anchor */}
            <iframe id="active-game-iframe" src={activeGame.uri} style={{ width: '100%', height: '100%', border: 'none' }} title={activeGame.title} sandbox="allow-scripts allow-same-origin allow-popups" />
          </div>
        </div>
      )}

      {activeGame && isMinimized && (
        <div style={{ position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(10px)', padding: '10px 20px', borderRadius: '30px', border: `1px solid rgba(255,255,255,0.5)`, zIndex: 90, display: 'flex', gap: 15, boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
          <div onClick={() => setIsMinimized(false)} style={{ width: 40, height: 40, borderRadius: '12px', background: theme.pri, backgroundImage: `url(${activeGame.thumb})`, backgroundSize: 'cover', cursor: 'pointer', border: '2px solid #fff', boxShadow: '0 4px 10px rgba(0,0,0,0.2)' }} />
        </div>
      )}

      {/* Floating Chat Button & Overlay */}
      <div style={{ position:'fixed', left: pos.x, top: pos.y, width: 64, height: 64, background: theme.pri, borderRadius: '50%', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', zIndex: 99, color: '#fff', fontSize: '28px', touchAction: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }} onTouchMove={(e) => { const t = e.touches[0]; setPos({ x: Math.max(10, Math.min(window.innerWidth - 70, t.clientX - 32)), y: Math.max(10, Math.min(window.innerHeight - 70, t.clientY - 32)) }); }} onClick={() => setShowChat(!showChat)}>🤙</div>

      {showChat && (
        <div style={{ position:'fixed', bottom: pos.y < 300 ? 'auto' : (window.innerHeight - pos.y + 10), top: pos.y < 300 ? (pos.y + 80) : 'auto', left: Math.max(10, Math.min(window.innerWidth - 350, pos.x - 140)), width: 340, height: 550, background: theme.surf, borderRadius: 24, border: `1px solid ${theme.outline}`, display:'flex', flexDirection:'column', zIndex: 98, boxShadow: '0 10px 40px rgba(0,0,0,0.15)' }}>
          <header style={{ padding: 15, borderBottom: `1px solid ${theme.outline}`, display:'flex', justifyContent:'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 800 }}>{peerDid ? threads.find(t => t.did === peerDid)?.handle : 'MESSAGES'}</span>
            <button onClick={() => { peerDid ? setPeerDid(null) : setShowChat(false) }} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>✕</button>
          </header>
          
          <div style={{ flex: 1, overflowY: 'auto', padding: 15 }}>
            {!peerDid ? threads.map(t => (
              <div key={t.id} onClick={() => setPeerDid(t.did)} style={{ padding: 12, background: theme.bg, borderRadius: 15, marginBottom: 10, display:'flex', alignItems:'center', gap: 12, cursor:'pointer' }}>
                <img src={t.avatar} style={{ width: 40, height: 40, borderRadius: '50%' }} />
                <span style={{ fontWeight: 600 }}>{t.handle}</span>
              </div>
            )) : history.map(m => {
              const isMine = m.sender.did === session.did;
              return (
                <div key={m.id} style={{ alignSelf: isMine ? 'flex-end' : 'flex-start', display: 'flex', flexDirection: 'column', marginBottom: 20, alignItems: isMine ? 'flex-end' : 'flex-start', position: 'relative' }}>
                  {reactingTo === m.id && (
                    <div style={{ position: 'absolute', top: -45, background: theme.surf, border: `1px solid ${theme.outline}`, padding: '6px 10px', borderRadius: 20, display: 'flex', gap: 8, zIndex: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                      {['❤️', '👍', '😂', '🔥', '😮'].map(emoji => (
                        <span key={emoji} onClick={() => reactToMessage(m.id, emoji)} style={{ fontSize: 20, cursor: 'pointer' }}>{emoji}</span>
                      ))}
                    </div>
                  )}
                  <div onClick={() => setReactingTo(reactingTo === m.id ? null : m.id)} style={{ background: isMine ? theme.pri : '#E5E7EB', color: isMine ? '#fff' : '#000', padding: '10px 14px', borderRadius: 18, fontSize: 14, maxWidth: '240px', cursor: 'pointer', position: 'relative' }}>
                    {m.text}
                    {m.reactions && m.reactions.length > 0 && (
                      <div style={{ position: 'absolute', bottom: -12, right: isMine ? 'auto' : -5, left: isMine ? -5 : 'auto', background: theme.surf, border: `1px solid ${theme.outline}`, borderRadius: 12, padding: '2px 6px', fontSize: 11, display: 'flex', gap: 4, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                        {m.reactions.map((r: any, idx: number) => <span key={idx}>{r.reaction || r.value}</span>)}
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: 9, marginTop: 6, opacity: 0.4 }}>{new Date(m.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
              );
            })}
          </div>

          {peerDid && (
            <div style={{ padding: 15, borderTop: `1px solid ${theme.outline}`, display: 'flex', gap: 10 }}>
              <input value={msgInput} onChange={e => setMsgInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} placeholder="Type a message..." style={{ flex: 1, padding: '10px 15px', borderRadius: 20, border: `1px solid ${theme.outline}`, outline: 'none' }} />
              <button onClick={sendMessage} style={{ background: theme.pri, color: '#fff', border: 'none', width: 40, height: 40, borderRadius: '50%', cursor: 'pointer', fontWeight: 'bold' }}>↑</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
