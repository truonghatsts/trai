// Bundles the public auth pages (src/auth/pages/*.ts) into browser-ready
// dist/auth/pages/*.js and copies the HTML next to them. Env values
// (backend/.env or process.env) are inlined via esbuild `define`, mirroring
// extension/build.mjs — the pages are static files, no runtime env.
import { build } from 'esbuild';
import { cp, mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'dist', 'auth', 'pages');

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
};

await mkdir(outDir, { recursive: true });
await build({
  entryPoints: {
    confirm: 'src/auth/pages/confirm.ts',
    reset: 'src/auth/pages/reset.ts',
  },
  outdir: outDir,
  bundle: true,
  format: 'iife',
  target: 'chrome110',
  define,
  logLevel: 'info',
});
await cp('src/auth/pages/confirm.html', path.join(outDir, 'confirm.html'));
await cp('src/auth/pages/reset.html', path.join(outDir, 'reset.html'));
await cp(path.join(root, '..', 'shared', 'theme.css'), path.join(outDir, 'theme.css'));
console.log('auth pages bundled');
