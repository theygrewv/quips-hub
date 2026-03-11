import React, { useEffect, useState, CSSProperties } from 'react';
import { BrowserOAuthClient, OAuthSession } from '@atproto/oauth-client-browser';
import { Agent } from '@atproto/api';
import nacl from 'tweetnacl';
import { encodeBase64, decodeBase64, decodeUTF8, encodeUTF8 } from 'tweetnacl-util';

type ViewState = 'hub' | 'bats' | 'glyphs' | 'germ';
interface ChatMsg { id: string; text: string; sender: 'me' | 'peer'; time: number; protocol: 'germ' | 'bsky'; }
interface Thread { did: string; handle: string; displayName?: string; avatar?: string; updated: number; protocol: 'germ' | 'bsky'; }

export default function App() {
  const [client, setClient] = useState<BrowserOAuthClient | null>(null);
  const [session, setSession] = useState<OAuthSession | null>(null);
  const [view, setView] = useState<ViewState>('hub');
  const [germStatus, setGermStatus] = useState<'SCANNING' | 'NO_RECORD' | 'READY'>('SCANNING');
  const [peerHandle, setPeerHandle] = useState('');
  const [peerStatus, setPeerStatus] = useState('');
  const [peerKey, setPeerKey] = useState<string | null>(null);
  const [peerDid, setPeerDid] = useState<string | null>(null);
  const [activePeerName, setActivePeerName] = useState(''); 
  const [activePeerAvatar, setActivePeerAvatar] = useState(''); 
  const [activeProtocol, setActiveProtocol] = useState<'germ' | 'bsky' | null>(null);
  const [msgInput, setMsgInput] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMsg[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeThreads, setActiveThreads] = useState<Thread[]>([]);
  const [restoreKeyInput, setRestoreKeyInput] = useState('');
  const [searchProtocol, setSearchProtocol] = useState<'germ' | 'bsky'>('bsky');

  const safeLogout = () => { 
    Object.keys(localStorage).forEach(k => { if (!k.startsWith("germ_priv_") && !k.startsWith("germ_threads_")) localStorage.removeItem(k); }); 
    window.location.reload(); 
  };

  useEffect(() => {
    const init = async () => {
      try {
        const c = new BrowserOAuthClient({
          handleResolver: 'https://bsky.social',
          clientMetadata: { client_id: 'https://quips.cc/client-metadata.json', client_name: 'quips', client_uri: 'https://quips.cc', redirect_uris: ['https://quips.cc/'], scope: 'atproto transition:generic', grant_types: ['authorization_code', 'refresh_token'], response_types: ['code'], token_endpoint_auth_method: 'none', application_type: 'web', dpop_bound_access_tokens: true }
        });
        const res = await c.init();
        if (res && 'session' in res && res.session) {
          const s = res.session as OAuthSession;
          setSession(s);
          checkGermRecord(s);
          syncBlueskyThreads(s);
        }
        setClient(c);
      } catch (e) { console.error(e); }
    };
    init();
  }, []);

  const syncBlueskyThreads = async (s: OAuthSession) => {
    const agent = new Agent(s);
    const proxyOpts = { headers: { 'atproto-proxy': 'did:web:api.bsky.chat' } };
    try {
      const res = await (agent.api as any).chat.bsky.convo.listConvos({}, proxyOpts);
      const bskyThreads: Thread[] = res.data.convos.map((c: any) => ({
        did: c.members.find((m: any) => m.did !== s.did)?.did || '',
        handle: c.members.find((m: any) => m.did !== s.did)?.handle || 'Unknown',
        displayName: c.members.find((m: any) => m.did !== s.did)?.displayName,
        avatar: c.members.find((m: any) => m.did !== s.did)?.avatar,
        updated: new Date(c.lastMessage?.sentAt || 0).getTime(),
        protocol: 'bsky'
      })).filter((t: Thread) => t.did !== '');

      const localGerm = JSON.parse(localStorage.getItem(`germ_threads_${s.did}`) || '[]');
      const combined = [...bskyThreads, ...localGerm].sort((a, b) => b.updated - a.updated);
      setActiveThreads(combined);
    } catch (e) { 
      const local = JSON.parse(localStorage.getItem(`germ_threads_${s.did}`) || '[]');
      setActiveThreads(local);
    }
  };

  const saveThread = (did: string, handle: string, displayName: string | undefined, avatar: string | undefined, protocol: 'germ' | 'bsky') => {
    if (!session) return;
    const newThread = { did, handle, displayName, avatar, updated: Date.now(), protocol };
    setActiveThreads(prev => {
      const filtered = prev.filter(t => !(t.did === did && t.protocol === protocol));
      const updated = [newThread, ...filtered];
      localStorage.setItem(`germ_threads_${session.did}`, JSON.stringify(updated.filter(t => t.protocol === 'germ')));
      return updated;
    });
  };

  const checkGermRecord = async (currentSession: OAuthSession) => {
    try {
      const agent = new Agent(currentSession);
      const res = await agent.com.atproto.repo.getRecord({ repo: currentSession.did, collection: 'com.germnetwork.declaration', rkey: 'self' });
      if (res.data && localStorage.getItem('germ_priv_' + currentSession.did)) setGermStatus('READY');
      else setGermStatus('NO_RECORD');
    } catch (e) { setGermStatus('NO_RECORD'); }
  };

  const login = async () => {
    const input = document.getElementById("h") as HTMLInputElement | null;
    if (client && input?.value) {
      try {
        await client.signIn(input.value);
      } catch (e) {
        console.error("Login failed:", e);
        alert("Could not find handle. Make sure it is your full handle (e.g., name.bsky.social)");
      }
    }
  };

  const generateGermKeys = async () => {
    if (!session) return;
    setGermStatus('SCANNING');
    try {
      const agent = new Agent(session);
      const keypair = nacl.box.keyPair();
      localStorage.setItem(`germ_priv_${session.did}`, encodeBase64(keypair.secretKey));
      await agent.com.atproto.repo.putRecord({
        repo: session.did, collection: 'com.germnetwork.declaration', rkey: 'self',
        record: { $type: 'com.germnetwork.declaration', version: '1.0.0', currentKey: encodeBase64(keypair.publicKey), messageMe: { messageMeUrl: 'https://quips.cc/germ#', showButtonTo: 'everyone' } }
      });
      setGermStatus('READY');
    } catch (e) { setGermStatus('NO_RECORD'); }
  };

  const openThread = async (targetHandleOrDid: string, protocol: 'germ' | 'bsky') => {
    if (!session) return;
    setPeerStatus('Connecting...');
    setPeerKey(null); setPeerDid(null); setChatHistory([]); setActiveProtocol(protocol);
    try {
      const agent = new Agent(session);
      let targetDid = targetHandleOrDid;
      if (!targetHandleOrDid.startsWith('did:')) {
        const res = await agent.resolveHandle({ handle: targetHandleOrDid });
        targetDid = res.data.did;
      }
      setPeerDid(targetDid);
      const profileRes = await agent.getProfile({ actor: targetDid });
      setActivePeerName(profileRes.data.displayName || profileRes.data.handle);
      setActivePeerAvatar(profileRes.data.avatar || '');

      const allMsgs: ChatMsg[] = [];
      const proxyOpts = { headers: { 'atproto-proxy': 'did:web:api.bsky.chat' } };

      if (protocol === 'bsky') {
        const convoRes = await (agent.api as any).chat.bsky.convo.getConvoForMembers({ members: [targetDid] }, proxyOpts);
        if (convoRes.data?.convo) {
          const msgs = await (agent.api as any).chat.bsky.convo.getMessages({ convoId: convoRes.data.convo.id }, proxyOpts);
          msgs.data.messages.forEach((m: any) => {
            if (m.$type === 'chat.bsky.convo.defs#messageView') {
              allMsgs.push({ id: m.id, text: m.text, sender: m.sender.did === session.did ? 'me' : 'peer', time: new Date(m.sentAt).getTime(), protocol: 'bsky' });
            }
          });
        }
      } else {
        // GERM FETCH LOGIC (Shortened for brevity)
      }
      setChatHistory(allMsgs.sort((a, b) => a.time - b.time));
      setIsSearching(false); setPeerStatus('');
      saveThread(targetDid, profileRes.data.handle, profileRes.data.displayName, profileRes.data.avatar, protocol);
    } catch (e: any) { setPeerStatus(e.message); setActiveProtocol(null); }
  };

  const handleSendMessage = async () => {
    if (!msgInput.trim() || !session || !peerDid || !activeProtocol) return;
    const agent = new Agent(session);
    const proxyOpts = { headers: { 'atproto-proxy': 'did:web:api.bsky.chat' } };
    try {
      if (activeProtocol === 'bsky') {
        const convo = await (agent.api as any).chat.bsky.convo.getConvoForMembers({ members: [peerDid] }, proxyOpts);
        await (agent.api as any).chat.bsky.convo.sendMessage({ convoId: convo.data.convo.id, message: { text: msgInput } }, proxyOpts);
        setChatHistory(prev => [...prev, { id: Date.now().toString(), text: msgInput, sender: 'me', time: Date.now(), protocol: 'bsky' }]);
      }
      setMsgInput('');
    } catch (e: any) { alert(e.message); }
  };

  const mBg = '#141218', mSurf = '#2b2930', mPri = '#d0bcff', mOnPri = '#381e72';
  const appCont: CSSProperties = { background: mBg, color: '#e6e0e9', height: '100dvh', fontFamily: 'system-ui, sans-serif', display: 'flex', flexDirection: 'column' };

  if (view === 'germ') return (
    <div style={appCont}>
      <div style={{...appCont, padding: '20px', paddingTop: '60px'}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px'}}>
          <button onClick={() => setView('hub')} style={{background:'none', border:'none', color:mPri, fontSize:'24px'}}>←</button>
          <h2 style={{margin:0}}>CHATS</h2>
          <div style={{width:24}}/>
        </div>
        {!peerDid ? (
          <div style={{flexGrow:1, overflowY:'auto'}}>
            {activeThreads.map(t => (
              <div key={`${t.did}-${t.protocol}`} onClick={() => openThread(t.did, t.protocol)} style={{background:mSurf, padding:'16px', borderRadius:'16px', marginBottom:'8px', display:'flex', gap:'12px', alignItems:'center'}}>
                <img src={t.avatar} style={{width:40, height:40, borderRadius:'50%'}} />
                <div style={{flexGrow:1}}>
                  <div style={{fontWeight:'bold'}}>{t.displayName || t.handle}</div>
                  <div style={{fontSize:'0.8rem', opacity:0.6}}>{t.protocol === 'germ' ? '🛡️ Secure' : '🦋 Bluesky'}</div>
                </div>
              </div>
            ))}
            <button onClick={() => setIsSearching(true)} style={{position:'absolute', bottom:30, right:30, width:60, height:60, borderRadius:'20px', background:mPri, color:mOnPri, fontSize:30, border:'none'}}>+</button>
          </div>
        ) : (
          <div style={{flexGrow:1, display:'flex', flexDirection:'column'}}>
            <div style={{flexGrow:1, overflowY:'auto'}}>
              {chatHistory.map(m => (
                <div key={m.id} style={{alignSelf: m.sender === 'me' ? 'flex-end' : 'flex-start', background: m.sender === 'me' ? mPri : mSurf, color: m.sender === 'me' ? mOnPri : '#fff', padding:'10px', borderRadius:'15px', margin:'5px', maxWidth:'80%'}}>
                  {m.text}
                </div>
              ))}
            </div>
            <div style={{display:'flex', gap:8, padding:10}}>
              <input value={msgInput} onChange={e => setMsgInput(e.target.value)} style={{flexGrow:1, background:mSurf, border:'none', borderRadius:20, padding:12, color:'#fff'}} placeholder="Message..."/>
              <button onClick={handleSendMessage} style={{background:mPri, border:'none', borderRadius:'50%', width:45, height:45}}>↑</button>
            </div>
          </div>
        )}
        {isSearching && (
          <div style={{position:'absolute', top:0, left:0, right:0, bottom:0, background:mBg, padding:40, zIndex:100}}>
             <h3>New Chat</h3>
             <div style={{display:'flex', gap:10, marginBottom:20}}>
                <button onClick={() => setSearchProtocol('bsky')} style={{flex:1, padding:10, background:searchProtocol === 'bsky' ? mPri : mSurf, borderRadius:10, border:'none'}}>🦋 Bluesky</button>
                <button onClick={() => setSearchProtocol('germ')} style={{flex:1, padding:10, background:searchProtocol === 'germ' ? mPri : mSurf, borderRadius:10, border:'none'}}>🛡️ Germ</button>
             </div>
             <input placeholder="@handle" value={peerHandle} onChange={e => setPeerHandle(e.target.value)} style={{width:'100%', padding:15, borderRadius:10, background:mSurf, border:'none', color:'#fff', marginBottom:20}}/>
             <button onClick={() => openThread(peerHandle, searchProtocol)} style={{width:'100%', padding:15, background:mPri, color:mOnPri, border:'none', borderRadius:10}}>Start Chat</button>
             <button onClick={() => setIsSearching(false)} style={{width:'100%', marginTop:10, background:'none', border:'none', color:mPri}}>Cancel</button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div style={{ background: '#050505', color: '#0f0', minHeight: '100vh', padding: '20px', fontFamily: 'monospace', textAlign: 'center' }}>
      <h1 style={{ fontSize: '3.5rem', borderBottom: '2px solid #0f0', marginBottom: '40px' }}>quips</h1>
      {!session ? (
        <div><input id="h" placeholder="handle.bsky.social" style={{ background: '#000', color: '#0f0', border: '1px solid #0f0', padding: '15px', width: '250px' }} /><br/><br/><button onClick={login} style={{ background: '#0f0', color: '#000', padding: '15px 30px', fontWeight: 'bold', border: 'none' }}>INITIATE</button></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <button onClick={() => setView('germ')} style={{ padding: '20px', background: '#111', color: '#f0f', border: '1px solid #f0f', margin: '10px', cursor: 'pointer', fontWeight: 'bold', width: '220px' }}>CHATS</button>
          <button onClick={safeLogout} style={{ padding: '20px', background: '#111', color: '#f00', border: '1px solid #f00', margin: '10px', cursor: 'pointer', fontWeight: 'bold', width: '220px' }}>LOGOUT</button>
        </div>
      )}
    </div>
  );
}
