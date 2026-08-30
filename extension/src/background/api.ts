import { CONFIG } from '../config.js';

export async function getToken(): Promise<string | null> {
  const { vtToken } = await chrome.storage.local.get('vtToken');
  return typeof vtToken === 'string' && vtToken.length > 0 ? vtToken : null;
}

// Fetch wrapper: attaches Authorization: Bearer <supabase-jwt> (contracts/api.md).
export async function apiFetch<T>(
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<{ status: number; body: T }> {
  const token = await getToken();
  const res = await fetch(CONFIG.BACKEND_URL + path, {
    method: init.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  let body: T = undefined as T;
  if (res.status !== 204) body = (await res.json()) as T;
  return { status: res.status, body };
}
