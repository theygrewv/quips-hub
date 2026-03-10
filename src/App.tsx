import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { BrowserOAuthClient } from '@atproto/oauth-client-browser';
import './App.css';

// --- CONFIG FOR QUIPS.CC ---
const clientURL = "https://quips.cc";
const clientID = "https://quips.cc/client-metadata.json";

const oauthClient = new BrowserOAuthClient({
  handleResolver: 'https://bsky.social',
  clientMetadata: {
    client_id: clientID,
    client_name: 'Quips Hub',
    client_uri: clientURL,
    redirect_uris: [clientURL + "/"],
    scope: 'atproto transition:generic',
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
    token_endpoint_auth_method: 'none',
    dpop_bound_access_tokens: true
  },
});

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        const result = await oauthClient.init();
        if (result?.session) setSession(result.session);
      } catch (e) {
        console.error("Atmosphere connection error:", e);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const login = async () => {
    const handle = prompt("Enter your Bluesky handle (e.g., name.bsky.social):");
    if (handle) {
      try {
        await oauthClient.signIn(handle);
      } catch (e) {
        alert("Login failed. Check console for details.");
      }
    }
  };

  if (loading) return <div className="hub"><h1>connecting to atmosphere...</h1></div>;

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Hub session={session} onLogin={login} />} />
        <Route path="/germ" element={<Germ session={session} />} />
      </Routes>
    </Router>
  );
}

// --- HUB COMPONENT ---
function Hub({ session, onLogin }: any) {
  return (
    <div className="hub">
      <div className="cloud-layer"></div>
      <div className="content">
        <h1>quips</h1>
        <div className="auth-status">
          {session ? (
            <span className="user-tag">{"online: " + session.sub}</span>
          ) : (
            <button className="nav-link auth-btn" onClick={onLogin}>authenticate hub</button>
          )}
        </div>
        <nav>
          <Link to="/germ" className="nav-link germ-link">germ network</Link>
        </nav>
      </div>
      <p className="footer">securely hosted at quips.cc</p>
    </div>
  );
}

// --- GERM COMPONENT ---
function Germ({ session }: any) {
  return (
    <div className="hub germ-theme">
      <div className="content">
        <h1 className="germ-title">germ.p2p</h1>
        <div className="p2p-zone">
          {session ? (
            <>
              <div className="status-bar">NODE AUTHORIZED</div>
              <div className="p2p-log">
                <p className="log-entry">{" > Identity: " + session.sub}</p>
                <p className="log-entry">{" > Status: Synchronized"}</p>
              </div>
            </>
          ) : (
            <div className="auth-zone">
              <p className="log-entry">{" ! Unauthorized Access"}</p>
              <Link to="/" className="nav-link">return to atmosphere</Link>
            </div>
          )}
        </div>
        <nav style={{marginTop: '40px'}}><Link to="/" className="nav-link">exit</Link></nav>
      </div>
    </div>
  );
}

