import { readFileSync } from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';

// FR-007: plain text only — Whisper `response_format: text` returns no
// timestamps, no formatting (research #5).
async function transcribeOpenAI(audioPath: string): Promise<string> {
  const form = new FormData();
  form.append(
    'file',
    new Blob([readFileSync(audioPath)], { type: 'audio/mpeg' }),
    path.basename(audioPath),
  );
  form.append('model', 'whisper-1');
  form.append('response_format', 'text');
  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.openaiApiKey}` },
    body: form,
  });
  if (!res.ok) throw new Error(`STT failed: ${res.status} ${(await res.text()).slice(0, 500)}`);
  return res.text();
}

// Provider swappable via STT_PROVIDER env (research #5). Add a case per provider.
export function transcribe(audioPath: string): Promise<string> {
  switch (config.sttProvider) {
    case 'openai':
      return transcribeOpenAI(audioPath);
    default:
      throw new Error(`Unsupported STT_PROVIDER: ${config.sttProvider}`);
  }
}
