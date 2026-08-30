// Dummy env so modules that construct the Supabase client can be imported in tests.
process.env.SUPABASE_URL = process.env.SUPABASE_URL ?? 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY ?? 'test-key';
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? 'test-key';
process.env.YTDLP_PATH = process.env.YTDLP_PATH ?? 'yt-dlp';
