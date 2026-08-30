// SW-owned session refresh (FR-006, oracle review fix): the service worker is
// the single owner of the in-flight refresh operation. Every extension context
// routes a failed-401 retry here via chrome.runtime.sendMessage
// (REFRESH_SESSION); concurrent callers await the same operation — a 401 storm
// across contexts cannot stack refreshes. After one failed refresh the latch
// trips until a fresh session is stored (SESSION_SET re-arm from setSession) —
// no refresh loop.
import { createClient } from '@supabase/supabase-js';
import { CONFIG } from '../config.js';
import { getRefreshToken, setSession } from '../shared/session.js';

const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Single in-flight operation, extension-wide: module state lives only in the
// SW bundle (pages never import this file), so concurrent message handlers
// await the same promise.
let inFlight: Promise<boolean> | null = null;
let refreshFailed = false;

async function doRefresh(): Promise<boolean> {
  if (refreshFailed) return false;
  const refreshToken = await getRefreshToken();
  // No stored refresh token: nothing to refresh with — prompt sign-in.
  if (!refreshToken) {
    refreshFailed = true;
    return false;
  }
  const { data, error } = await supabase.auth.refreshSession({
    refresh_token: refreshToken,
  });
  if (error || !data.session) {
    refreshFailed = true;
    return false;
  }
  await setSession(data.session);
  return true;
}

export function refreshSession(): Promise<boolean> {
  if (!inFlight) {
    inFlight = doRefresh().finally(() => {
      inFlight = null;
    });
  }
  return inFlight;
}

// Re-arm after a fresh session (sign-in); SESSION_SET arrives from setSession.
export function armRefresh(): void {
  refreshFailed = false;
}

export function initRefresh(): void {
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg?.type === 'REFRESH_SESSION') {
      void refreshSession().then(sendResponse);
      return true; // async response — keep the port open
    }
    if (msg?.type === 'SESSION_SET') {
      armRefresh();
      sendResponse({ ok: true });
    }
  });
}