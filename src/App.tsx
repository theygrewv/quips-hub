import React, { useEffect, useState, CSSProperties } from 'react';
import { BrowserOAuthClient, OAuthSession } from '@atproto/oauth-client-browser';
import { Agent } from '@atproto/api';
import nacl from 'tweetnacl';
import { encodeBase64, decodeBase64, decodeUTF8, encodeUTF8 } from 'tweetnacl-util';

type ViewState = 'hub' | 'bats' | 'glyphs' | 'germ';

interface ChatMsg { id: string; text: string; ciphertext: string; sender: 'me' | 'peer'; time: number; }
interface Thread { did: string; handle: string; displayName?: string; avatar?: string; updated: number; }

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
  
  const [msgInput, setMsgInput] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMsg[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeThreads, setActiveThreads] = useState<Thread[]>([]);

  // --- NATIVE BACK SWIPE LISTENER ---
  useEffect(() => {
    const handlePopState = () => {
      if (isSearching) setIsSearching(false);
      else if (peerKey) { setPeerKey(null); setChatHistory([]); setPeerHandle(''); }
      else if (view !== 'hub') setView('hub');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isSearching, peerKey, view]);

  useEffect(() => {
    const init = async () => {
      try {
        const c = new BrowserOAuthClient({
          handleResolver: 'https://bsky.social',
          clientMetadata: { client_id: 'https://quips.cc/client-metadata.json', client_name: 'quips', client_uri: 'https://quips.cc', redirect_uris: ['https://quips.cc/'], scope: 'atproto transition:generic', grant_types: ['authorization_code', 'refresh_token'], response_types: ['code'], token_endpoint_auth_method: 'none', application_type: 'web', dpop_bound_access_tokens: true }
        });
        const res = await c.init();
        if (res && 'session' in res && res.session) {
          setSession(res.session as OAuthSession);
          checkGermRecord(res.session as OAuthSession);
          loadThreads((res.session as OAuthSession).did);
        }
        setClient(c);
      } catch (e) { console.error(e); }
    };
    init();
  }, []);

  const loadThreads = (myDid: string) => {
    const stored = localStorage.getItem(`germ_threads_${myDid}`);
    if (stored) setActiveThreads(JSON.parse(stored));
  };

  const saveThread = (did: string, handle: string, displayName?: string, avatar?: string) => {
    if (!session) return;
    setActiveThreads(prev => {
      const filtered = prev.filter(t => t.did !== did);
      const updated = [{ did, handle, displayName, avatar, updated: Date.now() }, ...filtered];
      localStorage.setItem(`germ_threads_${session.did}`, JSON.stringify(updated));
      return updated;
    });
  };

  const checkGermRecord = async (currentSession: OAuthSession) => {
    try {
      const agent = new Agent(currentSession);
      const res = await agent.com.atproto.repo.getRecord({ repo: currentSession.did, collection: 'com.germnetwork.declaration', rkey: 'self' });
      if (res.data) {
        if (localStorage.getItem('germ_priv_' + currentSession.did)) setGermStatus('READY');
        else setGermStatus('NO_RECORD');
      }
    } catch (e) { setGermStatus('NO_RECORD'); }
  };

  const login = async () => {
    const input = document.getElementById('h') as HTMLInputElement | null;
    if (client && input?.value) {
      try { await client.signIn(input.value); } catch (e) { console.error(e); }
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

  const openThread = async (targetHandleOrDid: string) => {
    if (!session) return;
    setPeerStatus('Opening secure channel...');
    setPeerKey(null); setPeerDid(null); setChatHistory([]); setActivePeerAvatar('');
    try {
      const agent = new Agent(session);
      let targetDid = targetHandleOrDid;
      let displayHandle = targetHandleOrDid;

      if (!targetHandleOrDid.startsWith('did:')) {
        const res = await agent.resolveHandle({ handle: targetHandleOrDid });
        targetDid = res.data.did;
      } else { displayHandle = targetDid.substring(0, 15) + '...'; }
      setPeerDid(targetDid);

      let profileData = null;
      try {
        const profileRes = await agent.getProfile({ actor: targetDid });
        profileData = profileRes.data;
        setActivePeerName(profileData.displayName || profileData.handle || displayHandle);
        setActivePeerAvatar(profileData.avatar || '');
        displayHandle = profileData.handle || displayHandle;
      } catch (e) { setActivePeerName(displayHandle); }

      const didDocReq = await fetch(`https://plc.directory/${targetDid}`);
      const didDoc = await didDocReq.json();
      const pdsService = didDoc.service?.find((s: any) => s.id === '#atproto_pds' || s.type === 'AtprotoPersonalDataServer');
      if (!pdsService || !pdsService.serviceEndpoint) throw new Error("PDS not found");

      const pdsUrl = pdsService.serviceEndpoint;
      const recordReq = await fetch(`${pdsUrl}/xrpc/com.atproto.repo.getRecord?repo=${targetDid}&collection=com.germnetwork.declaration&rkey=self`);
      if (!recordReq.ok) throw new Error("No encryption keys found for this user");

      const recordData = await recordReq.json();
      const theirKey = recordData.value?.currentKey;
      if (!theirKey) throw new Error("Invalid record format");

      // Push history state for back swipe
      window.history.pushState({ view: 'chat' }, '');
      
      setPeerKey(theirKey); setIsSearching(false); setPeerStatus('');
      saveThread(targetDid, displayHandle, profileData?.displayName, profileData?.avatar);

      const storedPrivKey = localStorage.getItem(`germ_priv_${session.did}`);
      if (storedPrivKey) {
        const myPriv = decodeBase64(storedPrivKey);
        const theirPub = decodeBase64(theirKey);
        const allMsgs: ChatMsg[] = [];

        try {
          const theirMsgsReq = await fetch(`${pdsUrl}/xrpc/com.atproto.repo.listRecords?repo=${targetDid}&collection=com.germnetwork.message`);
          const theirMsgsData = await theirMsgsReq.json();
          for (const item of (theirMsgsData.records || [])) {
            if ((item.value as any).recipientDid === session.did) {
              const dec = nacl.box.open(decodeBase64((item.value as any).ciphertext), decodeBase64((item.value as any).nonce), theirPub, myPriv);
              if (dec) allMsgs.push({ id: item.uri, text: encodeUTF8(dec), ciphertext: (item.value as any).ciphertext, sender: 'peer', time: new Date((item.value as any).createdAt).getTime() });
            }
          }
        } catch (e) {}

        try {
          const myMsgsReq = await agent.com.atproto.repo.listRecords({ repo: session.did, collection: 'com.germnetwork.message' });
          for (const item of (myMsgsReq.data.records || [])) {
            if ((item.value as any).recipientDid === targetDid) {
              const dec = nacl.box.open(decodeBase64((item.value as any).ciphertext), decodeBase64((item.value as any).nonce), theirPub, myPriv);
              if (dec) allMsgs.push({ id: item.uri, text: encodeUTF8(dec), ciphertext: (item.value as any).ciphertext, sender: 'me', time: new Date((item.value as any).createdAt).getTime() });
            }
          }
        } catch (e) {}

        allMsgs.sort((a, b) => a.time - b.time);
        setChatHistory(allMsgs);
      }
    } catch (e: any) { setPeerStatus(`${e.message || 'User not found'}`); }
  };

  const handleSendMessage = async () => {
    if (!msgInput.trim() || !session || !peerKey || !peerDid) return;
    const currentInput = msgInput; setMsgInput(''); 
    try {
      const storedPrivKey = localStorage.getItem(`germ_priv_${session.did}`);
      if (!storedPrivKey) throw new Error("Private key missing.");
      
      const nonce = nacl.randomBytes(nacl.box.nonceLength);
      const encryptedMessage = nacl.box(decodeUTF8(currentInput), nonce, decodeBase64(peerKey), decodeBase64(storedPrivKey));
      const ciphertextBase64 = encodeBase64(encryptedMessage);
      
      const agent = new Agent(session);
      const timestampRkey = Date.now().toString(); 
      await agent.com.atproto.repo.putRecord({
        repo: session.did, collection: 'com.germnetwork.message', rkey: timestampRkey,
        record: { $type: 'com.germnetwork.message', recipientDid: peerDid, ciphertext: ciphertextBase64, nonce: encodeBase64(nonce), createdAt: new Date().toISOString() }
      });

      setChatHistory(prev => [...prev, { id: timestampRkey, text: currentInput, ciphertext: ciphertextBase64, sender: 'me', time: Date.now() }]);
      saveThread(peerDid, activePeerName, activePeerName, activePeerAvatar); 
    } catch (e) { setMsgInput(currentInput); }
  };

  const safeLogout = () => {
    Object.keys(localStorage).forEach(k => { if (!k.startsWith('germ_priv_') && !k.startsWith('germ_threads_')) localStorage.removeItem(k); });
    window.location.reload();
  };

  // --- UI STYLES (PIXEL 9 OPTIMIZED) ---
  const mBg = '#141218', mSurf = '#2b2930', mPri = '#d0bcff', mOnPri = '#381e72', mSec = '#4a4458', mOnSec = '#e8def8';
  const appCont: CSSProperties = { background: mBg, color: '#e6e0e9', height: '100dvh', fontFamily: 'system-ui, sans-serif', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' };
  const fab: CSSProperties = { position: 'absolute', bottom: 'env(safe-area-inset-bottom, 24px)', right: '24px', width: '64px', height: '64px', borderRadius: '20px', backgroundColor: mPri, color: mOnPri, display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '32px', cursor: 'pointer', border: 'none', zIndex: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.4)' };
  
  // Notice the massive top padding to dodge the Pixel 9 Activity Bar
  const topBar: CSSProperties = { paddingTop: 'max(env(safe-area-inset-top), 48px)', paddingBottom: '16px', paddingLeft: '20px', paddingRight: '20px', display: 'flex', alignItems: 'center', gap: '16px', background: mBg, zIndex: 5, borderBottom: `1px solid ${mSurf}` };

  if (view === 'germ') return (
    <div style={appCont}>
      <div style={topBar}>
        <button onClick={() => { window.history.back(); }} style={{background: 'none', border: 'none', color: '#e6e0e9', fontSize: '24px', cursor: 'pointer', padding: '0 8px'}}>←</button>
        {peerKey && activePeerAvatar && <img src={activePeerAvatar} alt="pfp" style={{width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover'}} />}
        <h2 style={{margin: 0, fontSize: '1.2rem', fontWeight: 500}}>{peerKey ? activePeerName : 'Messages'}</h2>
      </div>

      {germStatus === 'NO_RECORD' && (
        <div style={{padding: '24px', textAlign: 'center', marginTop: '40px'}}>
          <div style={{background: mSurf, padding: '32px', borderRadius: '28px'}}>
            <h3 style={{marginTop: 0}}>Encryption Required</h3>
            <button onClick={generateGermKeys} style={{background: mPri, color: mOnPri, padding: '16px 32px', borderRadius: '100px', border: 'none', fontWeight: 600, width: '100%'}}>Generate Keys</button>
          </div>
        </div>
      )}

      {germStatus === 'READY' && !peerKey && (
        <div style={{flexGrow: 1, position: 'relative', display: 'flex', flexDirection: 'column', overflow: 'hidden'}}>
          <div style={{flexGrow: 1, overflowY: 'auto', padding: '16px', paddingBottom: '100px'}}>
            {activeThreads.length === 0 ? (
              <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.5}}><p>No active threads</p></div>
            ) : (
              <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                {activeThreads.map(t => (
                  <div key={t.did} onClick={() => openThread(t.did)} style={{background: mSurf, padding: '16px', borderRadius: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '16px'}}>
                    <div style={{width: '48px', height: '48px', borderRadius: '50%', background: mPri, color: mOnPri, display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', fontWeight: 'bold', fontSize: '1.2rem'}}>
                      {t.avatar ? <img src={t.avatar} style={{width: '100%', height: '100%', objectFit: 'cover'}} alt="pfp" /> : t.handle.substring(0,2).toUpperCase()}
                    </div>
                    <div>
                      <h4 style={{margin: 0, fontSize: '1.1rem', fontWeight: 500}}>{t.displayName || t.handle}</h4>
                      {t.displayName && <p style={{margin: 0, fontSize: '0.85rem', opacity: 0.7}}>@{t.handle}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {isSearching && (
            <div style={{position: 'absolute', bottom: 0, left: 0, right: 0, background: mSurf, padding: '24px', paddingBottom: 'max(env(safe-area-inset-bottom), 24px)', borderTopLeftRadius: '28px', borderTopRightRadius: '28px', zIndex: 20}}>
              <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '16px'}}><h3 style={{margin: 0}}>New Message</h3><button onClick={() => window.history.back()} style={{background: 'none', border: 'none', color: '#e6e0e9', fontSize: '1.5rem'}}>✕</button></div>
              <input placeholder="@handle" value={peerHandle} onChange={(e) => setPeerHandle(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', background: mBg, color: '#e6e0e9', border: 'none', padding: '16px', borderRadius: '16px', marginBottom: '16px', outline: 'none' }} />
              <button onClick={() => openThread(peerHandle)} style={{width: '100%', padding: '16px', background: mPri, color: mOnPri, border: 'none', borderRadius: '100px', fontWeight: 600}}>Locate Peer</button>
              {peerStatus && <p style={{textAlign: 'center', fontSize: '0.85rem', color: '#ffb4ab', marginTop: '16px'}}>{peerStatus}</p>}
            </div>
          )}
          {!isSearching && <button onClick={() => { window.history.pushState({view: 'search'}, ''); setIsSearching(true); }} style={fab}>+</button>}
        </div>
      )}

      {peerKey && (
        <div style={{display: 'flex', flexDirection: 'column', flexGrow: 1, overflow: 'hidden'}}>
          <div style={{flexGrow: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px'}}>
            {chatHistory.length === 0 && <p style={{textAlign: 'center', opacity: 0.5, fontSize: '0.85rem', marginTop: '20px'}}>Secure channel established.</p>}
            {chatHistory.map((msg, i) => {
              const isMe = msg.sender === 'me';
              const isGrouped = i > 0 && chatHistory[i-1].sender === msg.sender;
              const timeStr = new Date(msg.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              return (
                <div key={msg.id} style={{alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '80%', marginTop: isGrouped ? '2px' : '12px'}}>
                  <div style={{ background: isMe ? mPri : mSec, color: isMe ? mOnPri : mOnSec, borderRadius: isMe ? `${isGrouped ? '4px' : '20px'} 20px 20px 20px` : `20px ${isGrouped ? '4px' : '20px'} 20px 20px`, padding: '8px 12px', lineHeight: '1.4' }}>
                    <div style={{fontSize: '1rem'}}>{msg.text}</div>
                    <div style={{fontSize: '0.65rem', opacity: 0.7, textAlign: 'right', marginTop: '4px'}}>{timeStr}</div>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{padding: '12px 20px', paddingBottom: 'max(env(safe-area-inset-bottom), 24px)', background: mBg}}>
            <div style={{display: 'flex', gap: '8px', alignItems: 'flex-end', background: mSurf, borderRadius: '28px', padding: '6px 6px 6px 16px'}}>
              <textarea value={msgInput} onChange={(e) => setMsgInput(e.target.value)} placeholder="Message" style={{ flexGrow: 1, maxHeight: '100px', background: 'transparent', color: '#e6e0e9', border: 'none', padding: '8px 0', resize: 'none', outline: 'none', fontFamily: 'inherit' }} />
              <button onClick={handleSendMessage} disabled={!msgInput.trim()} style={{background: msgInput.trim() ? mPri : '#4a4458', color: msgInput.trim() ? mOnPri : '#1c1b1f', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0}}>↑</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const rFs: CSSProperties = { background: '#000', color: '#0f0', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace' };
  const rBtn: CSSProperties = { padding: '20px', background: '#111', color: '#0f0', border: '1px solid #0f0', margin: '10px', cursor: 'pointer', fontWeight: 'bold', width: '220px' };

  if (view === 'bats') return (<div style={rFs}><h1>[ BATS_OS ]</h1><p>Bilateral Analytics</p><button onClick={() => setView('hub')} style={rBtn}>RETURN</button></div>);
  if (view === 'glyphs') return (<div style={rFs}><h1>[ GLYPHS_DECRYPTOR ]</h1><p>Visual Patterns</p><button onClick={() => setView('hub')} style={rBtn}>RETURN</button></div>);

return (
    <div style={{ background: '#050505', color: '#0f0', minHeight: '100vh', padding: '20px', fontFamily: 'monospace', textAlign: 'center' }}>
      <h1 style={{ fontSize: '3.5rem', borderBottom: '2px solid #0f0', marginBottom: '40px' }}>quips</h1>
      {!session ? (
        <div><input id="h" placeholder="handle.bsky.social" style={{ background: '#000', color: '#0f0', border: '1px solid #0f0', padding: '15px', width: '250px' }} /><br/><br/><button onClick={login} style={{ background: '#0f0', color: '#000', padding: '15px 30px', fontWeight: 'bold', border: 'none' }}>INITIATE</button></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}><p style={{marginBottom: '20px', wordBreak: 'break-all'}}>ID: {session.did}</p><button onClick={() => { window.history.pushState({view: 'bats'}, ''); setView('bats'); }} style={rBtn}>BATS</button><button onClick={() => { window.history.pushState({view: 'glyphs'}, ''); setView('glyphs'); }} style={rBtn}>GLYPHS</button><button onClick={() => { window.history.pushState({view: 'germ'}, ''); setView('germ'); }} style={{...rBtn, color: '#f0f', borderColor: '#f0f'}}>GERM_NET</button><button onClick={safeLogout} style={{...rBtn, color: '#f00', borderColor: '#f00'}}>LOGOUT</button></div>
      )}
    </div>
  );
}
