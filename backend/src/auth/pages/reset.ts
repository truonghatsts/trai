// Public password-recovery page (contracts/auth.md § GET /auth/reset): consumes
// the link from the customized Reset password email template. The credential
// rides the URL fragment (#token_hash=..&type=recovery) — never the query
// string — and is cleared once read.
//
// verifyOtp (recovery) runs once on load and yields a session that stays on the
// client; the form's updateUser retries reuse that session, so a failed update
// (weak password, transient error) never re-consumes the one-time credential.
import { createAnonClient } from './client.js';
import { createResetFlow, parseLinkFragment, RESET_INVALID } from './flow.js';

const form = document.getElementById('reset-form') as HTMLFormElement;
const passwordEl = document.getElementById('password') as HTMLInputElement;
const confirmEl = document.getElementById('confirm-password') as HTMLInputElement;
const messageEl = document.getElementById('message') as HTMLElement;

async function main(): Promise<void> {
  const params = parseLinkFragment(location.hash);
  if (!params || params.type !== 'recovery') {
    form.hidden = true;
    messageEl.textContent = RESET_INVALID;
    return;
  }
  history.replaceState(null, '', location.pathname + location.search);
  form.hidden = true;
  messageEl.textContent = 'Verifying link…';
  const flow = createResetFlow(createAnonClient(), params);
  const verified = await flow.verify();
  if (!verified.ok) {
    messageEl.textContent = RESET_INVALID;
    return;
  }
  form.hidden = false;
  messageEl.textContent = '';
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const password = passwordEl.value;
    if (password.length < 8) {
      messageEl.textContent = 'Password must be at least 8 characters.';
      return;
    }
    if (password !== confirmEl.value) {
      messageEl.textContent = 'Passwords do not match.';
      return;
    }
    const result = await flow.update(password);
    if (!result.ok) {
      // Accurate GoTrue error (e.g. weak password); session retained for retry.
      messageEl.textContent = result.message;
      return;
    }
    form.hidden = true;
    messageEl.textContent = result.message;
  });
}

void main();