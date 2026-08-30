// Fetch wrapper (contracts/api.md): attaches Authorization: Bearer <supabase-jwt>
// and, on 401, asks the service worker for the one silent refresh (FR-006).
// The SW owns the single in-flight refresh; every extension context routes the
// retry through it via chrome.runtime.sendMessage (oracle review fix) — a
// failed request retries exactly once and never loops.
import { CONFIG } from '../config.js';
import { getToken } from '../shared/session.js';

async function rawFetch(
  token: string | null,
  path: string,
  init: { method?: string; body?: unknown },
): Promise<Response> {
  return fetch(CONFIG.BACKEND_URL + path, {
    method: init.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
}

export async function apiFetch<T>(
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<{ status: number; body: T }> {
  const token = await getToken();
  let res = await rawFetch(token, path, init);

  // 401 with a token: one silent refresh via the SW, then retry once. Refresh
  // failure (or an unavailable SW) -> the 401 propagates to the sign-in prompt.
  if (res.status === 401 && token) {
    let refreshed = false;
    try {
      refreshed = await chrome.runtime.sendMessage({ type: 'REFRESH_SESSION' });
    } catch {
      refreshed = false;
    }
    if (refreshed) {
      res = await rawFetch(await getToken(), path, init);
    }
  }

  let body: T = undefined as T;
  if (res.status !== 204) body = (await res.json()) as T;
  return { status: res.status, body };
}
