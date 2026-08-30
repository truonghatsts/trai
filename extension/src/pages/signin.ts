// Supabase Auth email/password sign-in (FR-001, research #10). On success the
// JWT is persisted and any pending action-click flow continues (US1-AC1).
import { createClient } from '@supabase/supabase-js';
import { CONFIG } from '../config.js';
import { startJobForVideo } from '../shared/start.js';

const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

const form = document.getElementById('signin-form') as HTMLFormElement;
const errorEl = document.getElementById('error') as HTMLElement;

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = (document.getElementById('email') as HTMLInputElement).value;
  const password = (document.getElementById('password') as HTMLInputElement).value;
  errorEl.textContent = '';

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    errorEl.textContent = error.message;
    return;
  }
  await chrome.storage.local.set({ vtToken: data.session.access_token });

  const { pendingVideo } = await chrome.storage.local.get('pendingVideo');
  await chrome.storage.local.remove('pendingVideo');

  if (pendingVideo) {
    const result = await startJobForVideo(pendingVideo);
    if (result.page === 'job') {
      location.href = `job.html?job=${result.jobId}${result.view ? '&view=transcript' : ''}`;
    } else {
      location.href = `notice.html?code=${encodeURIComponent(result.code)}&message=${encodeURIComponent(result.message)}`;
    }
    return;
  }
  location.href = 'history.html';
});
