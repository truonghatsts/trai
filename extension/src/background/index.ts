// Action click handler (FR-002: new tab opens immediately). The toolbar NEVER
// starts transcription (FR-007, oracle review fix): whether or not a session
// exists, it stores the pending video and opens the job page — only the job
// page's explicit Transcribe button calls startJobForVideo. The service worker
// also owns the single in-flight session refresh for all extension contexts
// (FR-006, oracle review fix).
import { initRefresh } from './refresh.js';
import type { VideoInfo } from '../shared/start.js';

initRefresh();

function openTab(path: string): void {
  chrome.tabs.create({ url: chrome.runtime.getURL(path) });
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

  // FR-007: no session check, no job start — store the pending video and let
  // the job page's explicit Transcribe click create the job.
  await chrome.storage.local.set({ pendingVideo: video });
  openTab('src/pages/job.html');
});
