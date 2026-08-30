// Session persistence (research #5): vtToken + vtRefreshToken in
// chrome.storage.local so the session survives tab/page recreation and can be
// refreshed once after a 401 (FR-006). The one-refresh latch and the single
// in-flight refresh live in the service worker (background/refresh.ts) — this
// module is shared by every context and only persists the pair. setSession
// pings the SW (SESSION_SET) so a fresh session re-arms the latch
// extension-wide (oracle review fix).
const TOKEN_KEY = 'vtToken';
const REFRESH_KEY = 'vtRefreshToken';

export async function setSession(
  session: { access_token: string; refresh_token: string } | null,
): Promise<void> {
  if (!session) {
    await chrome.storage.local.remove([TOKEN_KEY, REFRESH_KEY]);
    return;
  }
  await chrome.storage.local.set({
    [TOKEN_KEY]: session.access_token,
    [REFRESH_KEY]: session.refresh_token,
  });
  // Re-arm the SW refresh latch: a fresh session means the next 401 may
  // refresh again. Best-effort — no runtime in this context is fine.
  try {
    void chrome.runtime.sendMessage({ type: 'SESSION_SET' }).catch(() => {});
  } catch {
    // no chrome.runtime (e.g. unit tests)
  }
}

export async function getToken(): Promise<string | null> {
  const { vtToken } = await chrome.storage.local.get(TOKEN_KEY);
  return typeof vtToken === 'string' && vtToken.length > 0 ? vtToken : null;
}

export async function getRefreshToken(): Promise<string | null> {
  const { vtRefreshToken } = await chrome.storage.local.get(REFRESH_KEY);
  return typeof vtRefreshToken === 'string' && vtRefreshToken.length > 0
    ? vtRefreshToken
    : null;
}