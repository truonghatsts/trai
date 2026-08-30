// Public confirmation page (contracts/auth.md § GET /auth/confirm): consumes
// the link from the customized Confirm signup email template. The credential
// rides the URL fragment (#token_hash=..&type=signup) — never the query string,
// so it never reaches server request logs — and is cleared once read.
import { createAnonClient } from './client.js';
import { CONFIRM_INVALID, confirmEmail, parseLinkFragment } from './flow.js';

const messageEl = document.getElementById('message') as HTMLElement;

async function main(): Promise<void> {
  const params = parseLinkFragment(location.hash);
  if (!params || params.type !== 'signup') {
    messageEl.textContent = CONFIRM_INVALID;
    return;
  }
  history.replaceState(null, '', location.pathname + location.search);
  messageEl.textContent = await confirmEmail(createAnonClient(), params);
}

void main();