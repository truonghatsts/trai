// History page (FR-011 / US3): rows of source_url / status / date; View opens
// the Job page in transcript view; Delete removes the item forever.
import { apiFetch } from '../background/api.js';

const listEl = document.getElementById('list') as HTMLElement;
const messageEl = document.getElementById('message') as HTMLElement;

function row(label: string, value: string): HTMLElement {
  const span = document.createElement('span');
  span.textContent = label;
  const val = document.createElement('span');
  val.textContent = value;
  const div = document.createElement('div');
  div.append(span, ' ', val);
  return div;
}

async function load(): Promise<void> {
  listEl.textContent = '';
  messageEl.textContent = '';
  const { status, body } = await apiFetch<{
    transcripts?: { id: string; source_url: string; status: string; created_at: string }[];
    error?: { message: string };
  }>('/api/transcripts');

  if (status === 401) {
    messageEl.textContent = 'Your session expired. Sign in again to see history.';
    return;
  }
  if (status !== 200 || !body.transcripts) {
    messageEl.textContent = body.error?.message ?? 'Could not load history.';
    return;
  }
  if (body.transcripts.length === 0) {
    messageEl.textContent = 'No transcripts yet.';
    return;
  }

  for (const item of body.transcripts) {
    const container = document.createElement('div');
    container.className = 'row';
    container.append(
      row('URL', item.source_url),
      row('Status', item.status),
      row('Date', new Date(item.created_at).toLocaleString()),
    );
    if (item.status === 'ready') {
      const viewBtn = document.createElement('button');
      viewBtn.textContent = 'View';
      viewBtn.addEventListener('click', () => {
        location.href = `job.html?job=${item.id}&view=transcript`;
      });
      container.appendChild(viewBtn);
    }
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', async () => {
      await apiFetch(`/api/transcripts/${item.id}`, { method: 'DELETE' });
      void load();
    });
    container.appendChild(deleteBtn);
    listEl.appendChild(container);
  }
}

void load();
