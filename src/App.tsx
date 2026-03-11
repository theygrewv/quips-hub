import React, { useEffect, useState, CSSProperties } from 'react';
import { BrowserOAuthClient, OAuthSession } from '@atproto/oauth-client-browser';
import { Agent } from '@atproto/api';
import nacl from 'tweetnacl';
import { encodeBase64, decodeBase64, decodeUTF8, encodeUTF8 } from 'tweetnacl-util';

type ViewState = 'hub' | 'bats' | 'glyphs' | 'germ';

interface ChatMsg {
  id: string;
  text: string;
  ciphertext: string;
  sender: 'me' | 'peer';
  time: number;
}

export default function App() {
  const [client, setClient] = useState<BrowserOAuthClient | null>(null);
  const [session, setSession] = useState<OAuthSession | null>(null);
  const [view, setView] = useState<ViewState>('hub');
  
  const [germStatus, setGermStatus] = useState<'SCANNING' | 'NO_RECORD' | 'READY'>('SCANNING');
  const [peerHandle, setPeerHandle] = useState('');
  const [peerStatus, setPeerStatus] = useState('');
  const [peerKey, setPeerKey] = useState<string | null>(null);
  const [peerDid, setPeerDid] = useState<string | null>(null);
  
  const [msgInput, setMsgInput] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMsg[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const c = new BrowserOAuthClient({
          handleResolver: 'https://bsky.social',
          clientMetadata: {
            client_id: 'https://quips.cc/client-metadata.json',
            client_name: 'quips',
            client_uri: 'https://quips.cc',
            redirect_uris: ['https://quips.cc/'],
            scope: 'atproto transition:generic',
            grant_types: ['authorization_code', 'refresh_token'],
            response_types: ['code'],
            token_endpoint_auth_method: 'none',
            application_type: 'web',
            dpop_bound_access_tokens: true
          }
        });
        const res = await c.init();
        if (res && 'session' in res && res.session) {
          setSession(res.session as OAuthSession);
          checkGermRecord(res.session as OAuthSession);
        }
        setClient(c);
      } catch (e) { console.error(e); }
    };
    init();
  }, []);

  const checkGermRecord = async (currentSession: OAuthSession) => {
    try {
      const agent = new Agent(currentSession);
      const res = await agent.com.atproto.repo.getRecord({
        repo: currentSession.did,
        collection: 'com.germnetwork.declaration',
        rkey: 'self'
      });
      if (res.data) {
        if (localStorage.getItem('germ_priv_' + currentSession.did)) {
          setGermStatus('READY');
        } else {
          setGermStatus('NO_RECORD');
        }
      }
    } catch (e) {
      setGermStatus('NO_RECORD');
    }
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
      const publicKeyBase64 = encodeBase64(keypair.publicKey);

      await agent.com.atproto.repo.putRecord({
        repo: session.did,
        collection: 'com.germnetwork.declaration',
        rkey: 'self',
        record: {
          $type: 'com.germnetwork.declaration',
          version: '1.0.0',
          currentKey: publicKeyBase64,
          messageMe: { messageMeUrl: 'https://quips.cc/germ#', showButtonTo: 'everyone' }
        }
      });
      setGermStatus('READY');
    } catch (e) {
      setGermStatus('NO_RECORD');
    }
  };

  const locatePeer = async () => {
    if (!session || !peerHandle) return;
    setPeerStatus('Searching...');
    setPeerKey(null);
    setPeerDid(null);
    setChatHistory([]);
    try {
      const agent = new Agent(session);
      let targetDid = peerHandle;
      if (!peerHandle.startsWith('did:')) {
        const res = await agent.resolveHandle({ handle: peerHandle });
        targetDid = res.data.did;
      }
      setPeerDid(targetDid);

      const didDocReq = await fetch(`https://plc.directory/${targetDid}`);
      const didDoc = await didDocReq.json();
      const pdsService = didDoc.service?.find((s: any) => s.id === '#atproto_pds' || s.type === 'AtprotoPersonalDataServer');
      if (!pdsService || !pdsService.serviceEndpoint) throw new Error("PDS not found");

      const pdsUrl = pdsService.serviceEndpoint;
      const recordReq = await fetch(`${pdsUrl}/xrpc/com.atproto.repo.getRecord?repo=${targetDid}&collection=com.germnetwork.declaration&rkey=self`);
      if (!recordReq.ok) throw new Error("No keys found on PDS");

      const recordData = await recordReq.json();
      const theirKey = recordData.value?.currentKey;
      if (!theirKey) throw new Error("Invalid record format");

      setPeerKey(theirKey);
      setIsSearching(false); // Close the search dialog
      setPeerStatus('');

      // Fetch history
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
              const nonce = decodeBase64((item.value as any).nonce);
              const cipher = decodeBase64((item.value as any).ciphertext);
              const dec = nacl.box.open(cipher, nonce, theirPub, myPriv);
              if (dec) allMsgs.push({ id: item.uri, text: encodeUTF8(dec), ciphertext: (item.value as any).ciphertext, sender: 'peer', time: new Date((item.value as any).createdAt).getTime() });
            }
          }
        } catch (e) { console.log("No messages from peer"); }

        try {
          const myMsgsReq = await agent.com.atproto.repo.listRecords({ repo: session.did, collection: 'com.germnetwork.message' });
          for (const item of (myMsgsReq.data.records || [])) {
            if ((item.value as any).recipientDid === targetDid) {
              const nonce = decodeBase64((item.value as any).nonce);
              const cipher = decodeBase64((item.value as any).ciphertext);
              const dec = nacl.box.open(cipher, nonce, theirPub, myPriv);
              if (dec) allMsgs.push({ id: item.uri, text: encodeUTF8(dec), ciphertext: (item.value as any).ciphertext, sender: 'me', time: new Date((item.value as any).createdAt).getTime() });
            }
          }
        } catch (e) { console.log("No messages from me"); }

        allMsgs.sort((a, b) => a.time - b.time);
        setChatHistory(allMsgs);
      }
    } catch (e: any) {
      setPeerStatus(`${e.message || 'User not found'}`);
    }
  };

  const handleSendMessage = async () => {
    if (!msgInput.trim() || !session || !peerKey || !peerDid) return;
    const currentInput = msgInput;
    setMsgInput(''); 
    
    try {
      const storedPrivKey = localStorage.getItem(`germ_priv_${session.did}`);
      if (!storedPrivKey) throw new Error("Private key missing.");
      
      const mySecretKey = decodeBase64(storedPrivKey);
      const theirPublicKey = decodeBase64(peerKey);
      
      const msgUint8 = decodeUTF8(currentInput);
      const nonce = nacl.randomBytes(nacl.box.nonceLength);
      const encryptedMessage = nacl.box(msgUint8, nonce, theirPublicKey, mySecretKey);
      
      const ciphertextBase64 = encodeBase64(encryptedMessage);
      const nonceBase64 = encodeBase64(nonce);

      const agent = new Agent(session);
      const timestampRkey = Date.now().toString(); 
      const createdAt = new Date().toISOString();
      
      await agent.com.atproto.repo.putRecord({
        repo: session.did,
        collection: 'com.germnetwork.message',
        rkey: timestampRkey,
        record: {
          $type: 'com.germnetwork.message',
          recipientDid: peerDid,
          ciphertext: ciphertextBase64,
          nonce: nonceBase64,
          createdAt: createdAt
        }
      });

      const newMsg: ChatMsg = {
        id: timestampRkey,
        text: currentInput,
        ciphertext: ciphertextBase64,
        sender: 'me',
        time: Date.now()
      };
      setChatHistory(prev => [...prev, newMsg]);
    } catch (e) {
      console.error("Transmission failed:", e);
      setMsgInput(currentInput); 
    }
  };

  const safeLogout = () => {
    Object.keys(localStorage).forEach(k => {
      if (!k.startsWith('germ_priv_')) localStorage.removeItem(k);
    });
    window.location.reload();
  };

  // --- MATERIAL UI STYLES ---
  const matBg = '#141218';
  const matSurface = '#2b2930';
  const matPrimary = '#d0bcff';
  const matOnPrimary = '#381e72';
  const matSecondary = '#4a4458';
  const matOnSecondary = '#e8def8';

  const appContainer: CSSProperties = { background: matBg, color: '#e6e0e9', minHeight: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif', position: 'relative', overflow: 'hidden' };
  
  const fabStyle: CSSProperties = { position: 'absolute', bottom: '24px', right: '24px', width: '64px', height: '64px', borderRadius: '20px', backgroundColor: matPrimary, color: matOnPrimary, display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '32px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.4)', border: 'none', zIndex: 10 };

  const topBar: CSSProperties = { padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px', background: matBg, position: 'sticky', top: 0, zIndex: 5 };
  
  // Germ Screen
  if (view === 'germ') return (
    <div style={appContainer}>
      
      {/* Top App Bar */}
      <div style={topBar}>
        <button onClick={() => { peerKey ? setPeerKey(null) : setView('hub'); setChatHistory([]); }} style={{background: 'none', border: 'none', color: '#e6e0e9', fontSize: '24px', cursor: 'pointer'}}>←</button>
        <h2 style={{margin: 0, fontSize: '1.2rem', fontWeight: 500}}>{peerKey ? peerHandle : 'Messages'}</h2>
      </div>

      {germStatus === 'NO_RECORD' && (
        <div style={{padding: '24px', textAlign: 'center', marginTop: '40px'}}>
          <div style={{background: matSurface, padding: '32px', borderRadius: '28px'}}>
            <h3 style={{marginTop: 0, fontWeight: 500}}>Encryption Required</h3>
            <p style={{opacity: 0.8, fontSize: '0.9rem', marginBottom: '24px'}}>Generate keys to enable secure messaging on the Germ Network.</p>
            <button onClick={generateGermKeys} style={{background: matPrimary, color: matOnPrimary, padding: '16px 32px', borderRadius: '100px', border: 'none', fontWeight: 600, width: '100%'}}>Generate Keys</button>
          </div>
        </div>
      )}

      {germStatus === 'READY' && !peerKey && (
        <div style={{padding: '20px', height: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column'}}>
          
          {/* Thread List Placeholder */}
          <div style={{flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.5}}>
            <p style={{margin: 0}}>No active threads</p>
            <p style={{fontSize: '0.8rem', marginTop: '8px'}}>Tap + to locate a peer</p>
          </div>

          {/* Search Dialog */}
          {isSearching && (
            <div style={{position: 'absolute', bottom: 0, left: 0, right: 0, background: matSurface, padding: '24px', borderTopLeftRadius: '28px', borderTopRightRadius: '28px', boxShadow: '0 -4px 20px rgba(0,0,0,0.5)', zIndex: 20}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px'}}>
                <h3 style={{margin: 0, fontWeight: 500}}>New Message</h3>
                <button onClick={() => setIsSearching(false)} style={{background: 'none', border: 'none', color: '#e6e0e9', fontSize: '1.2rem'}}>✕</button>
              </div>
              <input 
                placeholder="@handle or did:plc:..." 
                value={peerHandle}
                onChange={(e) => setPeerHandle(e.target.value)}
                style={{ width: '100%', boxSizing: 'border-box', background: matBg, color: '#e6e0e9', border: 'none', padding: '16px 20px', borderRadius: '16px', marginBottom: '16px', fontSize: '1rem' }} 
              />
              <button onClick={locatePeer} style={{width: '100%', padding: '16px', background: matPrimary, color: matOnPrimary, border: 'none', borderRadius: '100px', fontWeight: 600, fontSize: '1rem'}}>Locate</button>
              {peerStatus && <p style={{textAlign: 'center', fontSize: '0.85rem', color: '#ffb4ab', marginTop: '16px'}}>{peerStatus}</p>}
            </div>
          )}

          {/* Material FAB */}
          {!isSearching && (
            <button onClick={() => setIsSearching(true)} style={fabStyle}>+</button>
          )}
        </div>
      )}

      {peerKey && (
        <div style={{display: 'flex', flexDirection: 'column', height: 'calc(100vh - 60px)'}}>
          
          {/* Chat Bubbles Area */}
          <div style={{flexGrow: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px'}}>
            {chatHistory.length === 0 && <p style={{textAlign: 'center', opacity: 0.5, fontSize: '0.85rem', marginTop: '20px'}}>Secure channel established.</p>}
            
            {chatHistory.map((msg, i) => {
              const isMe = msg.sender === 'me';
              // Check if previous message was from the same sender to group bubbles
              const isGrouped = i > 0 && chatHistory[i-1].sender === msg.sender;
              
              const bubbleRadius = isMe 
                ? `${isGrouped ? '4px' : '20px'} 20px 20px 20px` // Right side flat if grouped
                : `20px ${isGrouped ? '4px' : '20px'} 20px 20px`; // Left side flat if grouped

              return (
                <div key={msg.id} style={{alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '80%', marginTop: isGrouped ? '2px' : '12px'}}>
                  <div style={{ background: isMe ? matPrimary : matSecondary, color: isMe ? matOnPrimary : matOnSecondary, borderRadius: bubbleRadius, padding: '12px 16px', fontSize: '1rem', lineHeight: '1.4' }}>
                    {msg.text}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pill Input Area */}
          <div style={{padding: '12px 20px 24px 20px', background: matBg}}>
            <div style={{display: 'flex', gap: '8px', alignItems: 'flex-end', background: matSurface, borderRadius: '28px', padding: '8px'}}>
              <textarea 
                value={msgInput}
                onChange={(e) => setMsgInput(e.target.value)}
                placeholder="Message" 
                style={{ flexGrow: 1, maxHeight: '100px', background: 'transparent', color: '#e6e0e9', border: 'none', padding: '12px 16px', fontSize: '1rem', resize: 'none', outline: 'none' }} 
              />
              <button onClick={handleSendMessage} disabled={!msgInput.trim()} style={{background: msgInput.trim() ? matPrimary : '#4a4458', color: msgInput.trim() ? matOnPrimary : '#1c1b1f', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', margin: '4px', transition: 'background 0.2s'}}>
                ↑
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Keep Quips Hub Retro style for BATS and GLYPHS
  const retroFs: CSSProperties = { background: '#000', color: '#0f0', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace', textAlign: 'center' };
  const retroBtn: CSSProperties = { padding: '20px', background: '#111', color: '#0f0', border: '1px solid #0f0', margin: '10px', cursor: 'pointer', fontWeight: 'bold', width: '220px' };

  if (view === 'bats') return (<div style={retroFs}><h1>[ BATS_OS ]</h1><p>Bilateral Analytics</p><button onClick={() => setView('hub')} style={retroBtn}>RETURN</button></div>);
  if (view === 'glyphs') return (<div style={retroFs}><h1>[ GLYPHS_DECRYPTOR ]</h1><p>Visual Patterns</p><button onClick={() => setView('hub')} style={retroBtn}>RETURN</button></div>);

  return (
    <div style={{ background: '#050505', color: '#0f0', minHeight: '100vh', padding: '20px', fontFamily: 'monospace', textAlign: 'center' }}>
      <h1 style={{ fontSize: '3.5rem', borderBottom: '2px solid #0f0', marginBottom: '40px' }}>quips</h1>
      {!session ? (
        <div><p>[ IDENTIFY_PLAYER ]</p><br/><input id="h" placeholder="handle.bsky.social" style={{ background: '#000', color: '#0f0', border: '1px solid #0f0', padding: '15px', width: '250px' }} /><br/><br/><button onClick={login} style={{ background: '#0f0', color: '#000', padding: '15px 30px', fontWeight: 'bold', border: 'none' }}>INITIATE</button></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}><p style={{marginBottom: '20px', wordBreak: 'break-all'}}>PLAYER_DID: {session.did}</p><button onClick={() => setView('bats')} style={retroBtn}>BATS</button><button onClick={() => setView('glyphs')} style={retroBtn}>GLYPHS</button><button onClick={() => setView('germ')} style={{...retroBtn, color: '#f0f', borderColor: '#f0f'}}>GERM_NET</button><button onClick={safeLogout} style={{...retroBtn, color: '#f00', borderColor: '#f00'}}>LOGOUT</button></div>
      )}
    </div>
  );
}

