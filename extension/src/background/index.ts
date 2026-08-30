// Action click handler (FR-002: new tab opens immediately). Flow per
// contracts/ui.md: detect video page -> sign-in gate -> POST /api/jobs -> open tab.
import { getToken } from './api.js';
import { startJobForVideo, type VideoInfo } from '../shared/start.js';

function openTab(path: string): void {
  chrome.tabs.create({ url: chrome.runtime.getURL(path) });
}

async function requireSignIn(video: VideoInfo): Promise<void> {
  // The job does not start until sign-in succeeds (US1-AC1); the pending video
  // is picked up by signin.html after a successful login.
  await chrome.storage.local.set({ pendingVideo: video });
  openTab('src/pages/signin.html');
}

chrome.action.onClicked.addListener(async (tab) => {
  if (tab.id == null) return;

  // Detect the active tab's video page (content script answers DETECT_VIDEO).
  let video: VideoInfo | null = null;
  try {
    video = await chrome.tabs.sendMessage(tab.id, { type: 'DETECT_VIDEO' });
  } catch {
    // No content script on this page (e.g. chrome://) -> notice below.
  }
  if (!video) {
    openTab('src/pages/notice.html');
    return;
  }

  const token = await getToken();
  if (!token) {
    await requireSignIn(video);
    return;
  }

  const result = await startJobForVideo(video);
  if (result.page === 'job') {
    openTab(`src/pages/job.html?job=${result.jobId}${result.view ? '&view=transcript' : ''}`);
    return;
  }
  if (result.code === 'unauthorized') {
    // Edge case: session expired/invalid at click time -> sign in again.
    await requireSignIn(video);
    return;
  }
  // 400 (duration_too_long / invalid_url / not_a_video_page) or 409 (active_job_exists).
  openTab(
    `src/pages/notice.html?code=${encodeURIComponent(result.code)}&message=${encodeURIComponent(result.message)}`,
  );
});
