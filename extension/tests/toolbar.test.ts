import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';

// Toolbar no-start (FR-007, oracle review fix): the action click NEVER calls
// startJobForVideo — with or without a session it stores pendingVideo and
// opens the job page; only the job page's explicit Transcribe click starts.
vi.mock('@supabase/supabase-js', () => ({ createClient: vi.fn(() => ({ auth: {} })) }));

let chromeMock: {
  runtime: { onMessage: { addListener: ReturnType<typeof vi.fn> }; getURL: (p: string) => string };
  action: { onClicked: { addListener: ReturnType<typeof vi.fn> } };
  tabs: { create: ReturnType<typeof vi.fn>; sendMessage: ReturnType<typeof vi.fn> };
  storage: { local: { get: ReturnType<typeof vi.fn>; set: ReturnType<typeof vi.fn>; remove: ReturnType<typeof vi.fn> } };
};
let actionListener: (tab: { id: number }) => Promise<void> | void;
let fetchMock: ReturnType<typeof vi.fn>;

beforeAll(async () => {
  chromeMock = {
    runtime: {
      onMessage: { addListener: vi.fn() },
      getURL: (p: string) => p,
    },
    action: { onClicked: { addListener: vi.fn() } },
    tabs: { create: vi.fn(), sendMessage: vi.fn() },
    storage: { local: { get: vi.fn(), set: vi.fn().mockResolvedValue(undefined), remove: vi.fn() } },
  };
  vi.stubGlobal('chrome', chromeMock);
  // Import the SW entry after stubbing; it registers the refresh router and
  // captures the action listener from this stub.
  await import('../src/background/index.js');
  actionListener = chromeMock.action.onClicked.addListener.mock.calls[0][0];
});

beforeEach(() => {
  vi.clearAllMocks();
  fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
  vi.stubGlobal('fetch', fetchMock);
});

const VIDEO = { sourceUrl: 'https://youtu.be/abc123', durationSeconds: 60 };

describe('toolbar click never starts transcription', () => {
  it('with a valid session: stores pendingVideo, opens the job page, no API call', async () => {
    chromeMock.storage.local.get.mockResolvedValue({ vtToken: 'valid-token' });
    chromeMock.tabs.sendMessage.mockResolvedValue(VIDEO);

    await actionListener({ id: 7 });

    expect(chromeMock.storage.local.set).toHaveBeenCalledWith({ pendingVideo: VIDEO });
    expect(chromeMock.tabs.create).toHaveBeenCalledWith({ url: 'src/pages/job.html' });
    expect(fetchMock).not.toHaveBeenCalled(); // no POST /api/jobs from the toolbar
  });

  it('without a session: same store + open flow, still no API call', async () => {
    chromeMock.storage.local.get.mockResolvedValue({});
    chromeMock.tabs.sendMessage.mockResolvedValue(VIDEO);

    await actionListener({ id: 7 });

    expect(chromeMock.storage.local.set).toHaveBeenCalledWith({ pendingVideo: VIDEO });
    expect(chromeMock.tabs.create).toHaveBeenCalledWith({ url: 'src/pages/job.html' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('non-video page: opens the notice page, stores nothing', async () => {
    chromeMock.tabs.sendMessage.mockRejectedValue(new Error('no content script'));

    await actionListener({ id: 7 });

    expect(chromeMock.tabs.create).toHaveBeenCalledWith({ url: 'src/pages/notice.html' });
    expect(chromeMock.storage.local.set).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});