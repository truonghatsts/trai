import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// SW-owned refresh (oracle review fix): the service worker holds the single
// in-flight refreshSession; page contexts (apiFetch) route the 401 retry
// through it via chrome.runtime.sendMessage({ type: 'REFRESH_SESSION' }).
const mocks = vi.hoisted(() => {
  const refreshSession = vi.fn();
  return {
    supabaseMock: { auth: { refreshSession } },
    createClient: vi.fn(() => ({ auth: { refreshSession } })),
  };
});

vi.mock('@supabase/supabase-js', () => ({ createClient: mocks.createClient }));

import { apiFetch } from '../src/background/api.js';
import { initRefresh, armRefresh } from '../src/background/refresh.js';
import { setSession } from '../src/shared/session.js';

let storage: {
  get: ReturnType<typeof vi.fn>;
  set: ReturnType<typeof vi.fn>;
  remove: ReturnType<typeof vi.fn>;
};
let sendMessage: ReturnType<typeof vi.fn>;
let onMessageListener: (msg: unknown, sender: unknown, sendResponse: (r: unknown) => void) => unknown;

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

// Drain the full async listener chain (refresh -> storage -> sendResponse).
const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  vi.clearAllMocks();
  armRefresh(); // reset the SW latch between tests
  // Stateful storage: getToken reads back what setSession wrote.
  const state: Record<string, string> = { vtToken: 'old-access', vtRefreshToken: 'old-refresh' };
  storage = {
    get: vi.fn(async (key: string) => ({ [key]: state[key] })),
    set: vi.fn(async (obj: Record<string, string>) => Object.assign(state, obj)),
    remove: vi.fn(async (keys: string | string[]) => {
      for (const k of Array.isArray(keys) ? keys : [keys]) delete state[k];
    }),
  };
  sendMessage = vi.fn().mockResolvedValue(false);
  const onMessage = { addListener: vi.fn() };
  vi.stubGlobal('chrome', { storage: { local: storage }, runtime: { sendMessage, onMessage } });
  vi.stubGlobal('fetch', vi.fn());
  initRefresh();
  onMessageListener = onMessage.addListener.mock.calls[0][0];
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// FR-006 + oracle fix: one silent refresh per 401, extension-wide.
describe('SW owns a single in-flight refresh; concurrent callers await it', () => {
  it('concurrent REFRESH_SESSION messages -> one refreshSession, every caller awaits the same result', async () => {
    mocks.supabaseMock.auth.refreshSession.mockResolvedValue({
      data: { session: { access_token: 'new-access', refresh_token: 'new-refresh' } },
      error: null,
    });
    const respondA = vi.fn();
    const respondB = vi.fn();
    onMessageListener({ type: 'REFRESH_SESSION' }, {}, respondA);
    onMessageListener({ type: 'REFRESH_SESSION' }, {}, respondB);

    await flush(); // let the async listener bodies settle

    expect(mocks.supabaseMock.auth.refreshSession).toHaveBeenCalledTimes(1);
    expect(respondA).toHaveBeenCalledWith(true);
    expect(respondB).toHaveBeenCalledWith(true);
    expect(storage.set).toHaveBeenCalledWith({ vtToken: 'new-access', vtRefreshToken: 'new-refresh' });
  });

  it('failed refresh latches: later 401s get false with no refreshSession until SESSION_SET re-arms', async () => {
    mocks.supabaseMock.auth.refreshSession.mockResolvedValue({
      data: { session: null },
      error: { message: 'invalid refresh token' },
    });
    const respond = vi.fn();
    onMessageListener({ type: 'REFRESH_SESSION' }, {}, respond);
    await flush();
    onMessageListener({ type: 'REFRESH_SESSION' }, {}, respond);
    await flush();

    expect(mocks.supabaseMock.auth.refreshSession).toHaveBeenCalledTimes(1); // latched — no loop
    expect(respond).toHaveBeenCalledTimes(2);
    expect(respond).toHaveBeenLastCalledWith(false);

    // Fresh session (sign-in) re-arms via the SESSION_SET message.
    mocks.supabaseMock.auth.refreshSession.mockResolvedValue({
      data: { session: { access_token: 'new-access', refresh_token: 'new-refresh' } },
      error: null,
    });
    onMessageListener({ type: 'SESSION_SET' }, {}, vi.fn());
    onMessageListener({ type: 'REFRESH_SESSION' }, {}, respond);
    await flush();

    expect(mocks.supabaseMock.auth.refreshSession).toHaveBeenCalledTimes(2);
    expect(respond).toHaveBeenLastCalledWith(true);
  });

  it('setSession pings the SW with SESSION_SET (sign-in re-arms extension-wide)', async () => {
    await setSession({ access_token: 'signed-in', refresh_token: 'signed-in-refresh' });
    expect(sendMessage).toHaveBeenCalledWith({ type: 'SESSION_SET' });
  });
});

// Page-side apiFetch: each failed request retries exactly once, never loops.
describe('apiFetch routes the 401 retry through the SW, one retry max', () => {
  // Faithful routing: the page's sendMessage hits the real SW message handler,
  // which persists the refreshed pair before responding — exactly the
  // production path (SW owns the refresh, storage is shared).
  function routeThroughSw(): void {
    sendMessage.mockImplementation(
      () =>
        new Promise((resolve) => {
          onMessageListener({ type: 'REFRESH_SESSION' }, {}, (r: unknown) => resolve(r));
        }),
    );
  }

  it('401 -> SW refresh ok -> original request retried once with the new token', async () => {
    routeThroughSw();
    mocks.supabaseMock.auth.refreshSession.mockResolvedValue({
      data: { session: { access_token: 'new-access', refresh_token: 'new-refresh' } },
      error: null,
    });
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(json({ error: { code: 'unauthorized' } }, 401))
      .mockResolvedValueOnce(json({ job: { id: 'j1' } }, 200));

    const res = await apiFetch<{ job?: { id: string } }>('/api/jobs/j1');

    expect(mocks.supabaseMock.auth.refreshSession).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const retryInit = fetchMock.mock.calls[1][1] as RequestInit;
    expect((retryInit.headers as Record<string, string>).Authorization).toBe('Bearer new-access');
    expect(res.status).toBe(200);
    expect(res.body.job?.id).toBe('j1');
  });

  it('retried request 401s again -> 401 returned, no second refresh (one retry max, no loop)', async () => {
    routeThroughSw();
    mocks.supabaseMock.auth.refreshSession.mockResolvedValue({
      data: { session: { access_token: 'new-access', refresh_token: 'new-refresh' } },
      error: null,
    });
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(json({ error: { code: 'unauthorized' } }, 401));

    const res = await apiFetch('/api/jobs/j1');

    expect(mocks.supabaseMock.auth.refreshSession).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2); // original + one retry
    expect(res.status).toBe(401);
  });

  it('SW refresh failure -> 401 propagates (sign-in prompt), no retry', async () => {
    routeThroughSw();
    mocks.supabaseMock.auth.refreshSession.mockResolvedValue({
      data: { session: null },
      error: { message: 'invalid refresh token' },
    });
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(json({ error: { code: 'unauthorized' } }, 401));

    const res = await apiFetch('/api/jobs/j1');

    expect(mocks.supabaseMock.auth.refreshSession).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1); // no retry after a failed refresh
    expect(res.status).toBe(401);
  });

  it('no token -> 401 passes through with no SW refresh request', async () => {
    storage.get.mockResolvedValue({});
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(json({ error: { code: 'unauthorized' } }, 401));

    const res = await apiFetch('/api/jobs/j1');

    expect(res.status).toBe(401);
    expect(sendMessage).not.toHaveBeenCalled();
  });
});