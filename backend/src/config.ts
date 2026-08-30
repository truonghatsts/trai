import os from 'node:os';

export interface Config {
  port: number;
  supabaseUrl: string;
  supabaseServiceKey: string;
  supabaseAnonKey: string;
  sttProvider: string;
  openaiApiKey: string;
  ytdlpPath: string;
  maxDurationSeconds: number;
  workerPollMs: number;
  tempDir: string;
}

export const config: Config = {
  port: Number(process.env.PORT ?? 3000),
  supabaseUrl: process.env.SUPABASE_URL ?? '',
  supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY ?? '',
  // Public auth pages use the anon key only — never the service key (research #2).
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? '',
  sttProvider: process.env.STT_PROVIDER ?? 'openai',
  openaiApiKey: process.env.OPENAI_API_KEY ?? '',
  ytdlpPath: process.env.YTDLP_PATH ?? 'yt-dlp',
  maxDurationSeconds: 300,
  workerPollMs: Number(process.env.WORKER_POLL_MS ?? 3000),
  tempDir: process.env.WORKER_TEMP_DIR ?? os.tmpdir(),
};
