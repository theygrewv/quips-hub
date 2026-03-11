import sys

with open('src/App.tsx', 'r') as f:
    content = f.read()

old_sync = """  const syncThreads = async (s: OAuthSession) => {
    const agent = new Agent(s);
    const proxyOpts = { headers: { 'atproto-proxy': 'did:web:api.bsky.chat' } };
    try {
      const res = await (agent.api as any).chat.bsky.convo.listConvos({}, proxyOpts);
      const bskyThreads = res.data.convos.map((c: any) => ({
        did: c.members.find((m: any) => m.did !== s.did)?.did || '',
        handle: c.members.find((m: any) => m.did !== s.did)?.handle || 'unknown',
        displayName: c.members.find((m: any) => m.did !== s.did)?.displayName,
        avatar: c.members.find((m: any) => m.did !== s.did)?.avatar,
        updated: new Date(c.lastMessage?.sentAt || 0).getTime(),
        protocol: 'bsky'
      })).filter((t: any) => t.did !== '');

      const localGerm = JSON.parse(localStorage.getItem(`germ_threads_${s.did}`) || '[]');
      const combined = [...bskyThreads, ...localGerm].sort((a: any, b: any) => b.updated - a.updated);
      setActiveThreads(combined);
    } catch (e) {
      setActiveThreads(JSON.parse(localStorage.getItem(`germ_threads_${s.did}`) || '[]'));
    }
  };"""

new_sync = """  const syncThreads = async (s: OAuthSession) => {
    const agent = new Agent(s);
    const proxyOpts = { headers: { 'atproto-proxy': 'did:web:api.bsky.chat' } };
    console.log("Syncing threads...");
    try {
      const res = await (agent.api as any).chat.bsky.convo.listConvos({}, proxyOpts);
      console.log("Found Bluesky convos:", res.data.convos.length);
      const bskyThreads = res.data.convos.map((c: any) => {
        const other = c.members.find((m: any) => m.did !== s.did);
        return {
          did: other?.did || '',
          handle: other?.handle || 'unknown',
          displayName: other?.displayName,
          avatar: other?.avatar,
          updated: new Date(c.lastMessage?.sentAt || Date.now()).getTime(),
          protocol: 'bsky' as const
        };
      }).filter((t: any) => t.did !== '');

      const localGerm = JSON.parse(localStorage.getItem(`germ_threads_${s.did}`) || '[]');
      setActiveThreads([...bskyThreads, ...localGerm].sort((a, b) => b.updated - a.updated));
    } catch (e) {
      console.error("Sync error:", e);
      setActiveThreads(JSON.parse(localStorage.getItem(`germ_threads_${s.did}`) || '[]'));
    }
  };"""

with open('src/App.tsx', 'w') as f:
    f.write(content.replace(old_sync, new_sync))
