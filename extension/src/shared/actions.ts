// DOM-free safety guard for the transcript source link (contracts/actions.md §2).
// Mirror of backend parseSourceUrl (backend/src/api/routes/jobs.ts) minus the
// bare-domain rule — the view must not assume "no path" means "not a video page".
export function isSafeWebUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
  // ponytail: new URL("http:///path") parses hostname "path"; require a real
  // authority (scheme + "//" + non-slash) so host-less URLs stay unsafe.
  if (!/^https?:\/\/[^/]/i.test(raw)) return false;
  if (!url.hostname) return false;
  return true;
}