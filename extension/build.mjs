// Build script: bundles TS entries with esbuild into extension/dist and copies
// static assets. Env values (extension/.env or process.env) are inlined via
// esbuild `define` so the unpacked extension needs no runtime env.
import { build } from 'esbuild';
import { cp, mkdir, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(root, 'dist');

async function loadEnv() {
  const env = {};
  try {
    const content = await readFile(path.join(root, '.env'), 'utf8');
    for (const line of content.split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
    }
  } catch {
    // no .env -> rely on process.env
  }
  return env;
}

const env = await loadEnv();
const define = {
  'process.env.SUPABASE_URL': JSON.stringify(env.SUPABASE_URL ?? process.env.SUPABASE_URL ?? ''),
  'process.env.SUPABASE_ANON_KEY': JSON.stringify(
    env.SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY ?? '',
  ),
  'process.env.BACKEND_URL': JSON.stringify(
    env.BACKEND_URL ?? process.env.BACKEND_URL ?? 'http://localhost:3000',
  ),
};

async function copyStatic() {
  await cp('manifest.json', path.join(dist, 'manifest.json'));
  for (const page of ['signin.html', 'job.html', 'history.html', 'notice.html']) {
    await cp(`src/pages/${page}`, path.join(dist, 'src', 'pages', page));
  }
  await cp('../shared/theme.css', path.join(dist, 'src', 'pages', 'theme.css'));
  console.log('static assets copied');
}

const watch = process.argv.includes('--watch');

const options = {
  entryPoints: {
    background: 'src/background/index.ts',
    'content/video-detect': 'src/content/video-detect.ts',
    'pages/signin': 'src/pages/signin.ts',
    'pages/job': 'src/pages/job.ts',
    'pages/history': 'src/pages/history.ts',
    'pages/notice': 'src/pages/notice.ts',
  },
  outdir: path.join(dist, 'src'),
  bundle: true,
  format: 'iife',
  target: 'chrome110',
  define,
  sourcemap: true,
  ...(watch ? { watch: { onRebuild: () => void copyStatic() } } : {}),
};

await rm(dist, { recursive: true, force: true });
await mkdir(path.join(dist, 'src'), { recursive: true });
await build(options);
await copyStatic();
console.log('build complete -> extension/dist (load unpacked in chrome://extensions)');
