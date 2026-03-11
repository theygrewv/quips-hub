import React, { useEffect, useState, CSSProperties } from 'react';
import { BrowserOAuthClient, OAuthSession } from '@atproto/oauth-client-browser';
import { Agent } from '@atproto/api';

type ViewState = 'hub' | 'bats' | 'glyphs' | 'germ';

export default function App() {
  const [client, setClient] = useState<BrowserOAuthClient | null>(null);
  const [session, setSession] = useState<OAuthSession | null>(null);
  const [view, setView] = useState<ViewState>('hub');
  
  // Germ Network State
  const [germStatus, setGermStatus] = useState<'SCANNING' | 'NO_RECORD' | 'READY'>('SCANNING');
  const [peerHandle, setPeerHandle] = useState('');
  const [peerStatus, setPeerStatus] = useState('');
  const [peerKey, setPeerKey] = useState<string | null>(null);

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
      if (res.data) setGermStatus('READY');
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
      const mockKeyBytes = new Uint8Array(32);
      window.crypto.getRandomValues(mockKeyBytes);
      const mockKeyBase64 = btoa(String.fromCharCode.apply(null, Array.from(mockKeyBytes)));

      await agent.com.atproto.repo.putRecord({
        repo: session.did,
        collection: 'com.germnetwork.declaration',
        rkey: 'self',
        record: {
          $type: 'com.germnetwork.declaration',
          version: '1.0.0',
          currentKey: mockKeyBase64,
          messageMe: {
            messageMeUrl: 'https://quips.cc/germ#',
            showButtonTo: 'everyone'
          }
        }
      });
      setGermStatus('READY');
    } catch (e) {
      setGermStatus('NO_RECORD');
    }
  };

  const locatePeer = async () => {
    if (!session || !peerHandle) return;
    setPeerStatus('SEARCHING_NETWORK...');
    setPeerKey(null);
    try {
      const agent = new Agent(session);
      
      // 1. Resolve handle to DID
      let targetDid = peerHandle;
      if (!peerHandle.startsWith('did:')) {
        const res = await agent.resolveHandle({ handle: peerHandle });
        targetDid = res.data.did;
      }

      // 2. Fetch their Germ Declaration record
      const record = await agent.com.atproto.repo.getRecord({
        repo: targetDid,
        collection: 'com.germnetwork.declaration',
        rkey: 'self'
      });

      // 3. Extract their public key
      const theirKey = (record.data.value as any).currentKey;
      setPeerKey(theirKey);
      setPeerStatus('PEER_FOUND_KEY_ACQUIRED');
    } catch (e) {
      console.error(e);
      setPeerStatus('ERR: PEER_NOT_FOUND_OR_NO_KEYS');
    }
  };

  const fs: CSSProperties = { background: '#000', color: '#0f0', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace', textAlign: 'center' };
  const btn: CSSProperties = { padding: '20px', background: '#111', color: '#0f0', border: '1px solid #0f0', margin: '10px', cursor: 'pointer', fontWeight: 'bold', width: '220px' };

  if (view === 'germ') return (
    <div style={{...fs, color: '#f0f'}}>
      <h1>[ GERM_NETWORK ]</h1>
      <div style={{border: '1px solid #f0f', padding: '20px', width: '85%', maxWidth: '500px', textAlign: 'left', wordBreak: 'break-all'}}>
        <p>&gt; PROTOCOL: ARMORED_MSG_v1</p>
        <p>&gt; NS: com.germnetwork.declaration</p>
        <p>&gt; PLAYER: {session?.did}</p>
        <p style={{marginTop: '10px', fontWeight: 'bold'}}>
          &gt; STATUS: {germStatus === 'SCANNING' ? 'QUERYING_PDS...' : germStatus === 'NO_RECORD' ? 'NO_KEYS_FOUND' : 'ENCRYPTION_ACTIVE'}
        </p>
      </div>
      
      {germStatus === 'READY' && (
        <div style={{marginTop: '20px', border: '1px dashed #f0f', padding: '15px', width: '85%', maxWidth: '500px'}}>
          <p style={{marginBottom: '10px'}}>&gt; PEER_DISCOVERY</p>
          <input 
            placeholder="target handle or did" 
            value={peerHandle}
            onChange={(e) => setPeerHandle(e.target.value)}
            style={{ background: '#000', color: '#f0f', border: '1px solid #f0f', padding: '10px', width: '90%', marginBottom: '10px', fontFamily: 'monospace' }} 
          />
          <button onClick={locatePeer} style={{...btn, padding: '10px', width: '90%', color: '#000', background: '#f0f', borderColor: '#f0f', margin: '0'}}>LOCATE_PEER</button>
          
          {peerStatus && <p style={{marginTop: '15px', fontSize: '0.9rem', wordBreak: 'break-all'}}>&gt; {peerStatus}</p>}
          {peerKey && <p style={{marginTop: '5px', fontSize: '0.8rem', opacity: 0.8, wordBreak: 'break-all'}}>&gt; KEY: {peerKey}</p>}
        </div>
      )}

      {germStatus === 'NO_RECORD' && (
        <button onClick={generateGermKeys} style={{...btn, background: '#f0f', color: '#000', borderColor: '#f0f', marginTop: '20px'}}>
          GENERATE_KEYS
        </button>
      )}
      
      <button onClick={() => setView('hub')} style={{...btn, color: '#f0f', borderColor: '#f0f', marginTop: '20px'}}>RETURN</button>
    </div>
  );

  if (view === 'bats') return (
    <div style={fs}><h1>[ BATS_OS ]</h1><p>Bilateral Analytics</p><button onClick={() => setView('hub')} style={btn}>RETURN</button></div>
  );

  if (view === 'glyphs') return (
    <div style={fs}><h1>[ GLYPHS_DECRYPTOR ]</h1><p>Visual Patterns</p><button onClick={() => setView('hub')} style={btn}>RETURN</button></div>
  );

  return (
    <div style={{ background: '#050505', color: '#0f0', minHeight: '100vh', padding: '20px', fontFamily: 'monospace', textAlign: 'center' }}>
      <h1 style={{ fontSize: '3.5rem', borderBottom: '2px solid #0f0', marginBottom: '40px' }}>quips</h1>
      {!session ? (
        <div>
          <p>[ IDENTIFY_PLAYER ]</p><br/>
          <input id="h" placeholder="handle.bsky.social" style={{ background: '#000', color: '#0f0', border: '1px solid #0f0', padding: '15px', width: '250px' }} /><br/><br/>
          <button onClick={login} style={{ background: '#0f0', color: '#000', padding: '15px 30px', fontWeight: 'bold', border: 'none' }}>INITIATE</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <p style={{marginBottom: '20px', wordBreak: 'break-all'}}>PLAYER_DID: {session.did}</p>
          <button onClick={() => setView('bats')} style={btn}>BATS</button>
          <button onClick={() => setView('glyphs')} style={btn}>GLYPHS</button>
          <button onClick={() => setView('germ')} style={{...btn, color: '#f0f', borderColor: '#f0f'}}>GERM_NET</button>
          <button onClick={() => { localStorage.clear(); window.location.reload(); }} style={{...btn, color: '#f00', borderColor: '#f00'}}>LOGOUT</button>
        </div>
      )}
    </div>
  );
}

