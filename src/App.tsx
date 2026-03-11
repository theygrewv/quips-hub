import React, { useEffect, useState, CSSProperties } from 'react';
import { BrowserOAuthClient, OAuthSession } from '@atproto/oauth-client-browser';

// 1. Translated from com.germnetwork.declaration SDK
interface GermDeclaration {
  $type: 'com.germnetwork.declaration';
  version: string;
  currentKey: string; // ed25519 public key
  keyPackage?: string;
  messageMe?: {
    messageMeUrl: string;
    showButtonTo: 'none' | 'usersIFollow' | 'everyone' | string;
  };
  continuityProofs?: string[];
}

type ViewState = 'hub' | 'bats' | 'glyphs' | 'germ';

export default function App() {
  const [client, setClient] = useState<BrowserOAuthClient | null>(null);
  const [session, setSession] = useState<OAuthSession | null>(null);
  const [view, setView] = useState<ViewState>('hub');
  
  // Germ Network State
  const [germStatus, setGermStatus] = useState<'SCANNING' | 'NO_RECORD' | 'READY'>('SCANNING');

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
          // Simulate fetching the user's Germ Declaration from their PDS
          setTimeout(() => setGermStatus('NO_RECORD'), 1500);
        }
        setClient(c);
      } catch (e) { console.error(e); }
    };
    init();
  }, []);

  const login = async () => {
    const input = document.getElementById('h') as HTMLInputElement | null;
    if (client && input?.value) {
      try { await client.signIn(input.value); } catch (e) { console.error(e); }
    }
  };

  const generateGermKeys = () => {
    setGermStatus('SCANNING');
    // Placeholder for actual ed25519 key generation and repo.putRecord
    setTimeout(() => setGermStatus('READY'), 2000);
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
        <p style={{marginTop: '20px', fontWeight: 'bold'}}>
          &gt; STATUS: {germStatus === 'SCANNING' ? 'QUERYING_PDS...' : germStatus === 'NO_RECORD' ? 'NO_KEYS_FOUND' : 'ENCRYPTION_ACTIVE'}
        </p>
      </div>
      
      {germStatus === 'NO_RECORD' && (
        <button onClick={generateGermKeys} style={{...btn, background: '#f0f', color: '#000', borderColor: '#f0f', marginTop: '20px'}}>
          GENERATE_KEYS
        </button>
      )}
      
      <button onClick={() => setView('hub')} style={{...btn, color: '#f0f', borderColor: '#f0f', marginTop: '10px'}}>RETURN</button>
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

