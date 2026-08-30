// Generic message page: non-video notice (edge case) or a rejection message
// (duration_too_long / active_job_exists / invalid_url) from POST /api/jobs.
const params = new URLSearchParams(location.search);
const message = params.get('message');
const code = params.get('code');

const el = document.getElementById('message') as HTMLElement;

if (message) {
  el.textContent = message;
} else if (code) {
  el.textContent = `Request rejected (${code}).`;
} else {
  el.textContent =
    'This extension works on public video pages. Open a public video (e.g. a YouTube watch page) and click the extension there.';
}
