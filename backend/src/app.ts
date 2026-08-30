import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Fastify, { type FastifyInstance } from 'fastify';
import fastifyStatic from '@fastify/static';
import { supabase } from './db/client.js';
import { authGuard } from './api/auth.js';
import { registerJobsRoutes } from './api/routes/jobs.js';
import { registerTranscriptsRoutes } from './api/routes/transcripts.js';

// Public auth pages (contracts/auth.md): bundled by scripts/build-auth.mjs
// into dist/auth/pages; served under /auth/*. Built by `pretest`/`dev`/`build`.
const backendRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const authPagesDir = path.join(backendRoot, 'dist', 'auth', 'pages');

export function buildApp(): FastifyInstance {
  const app = Fastify({ logger: true });
  app.register(fastifyStatic, { root: authPagesDir, prefix: '/auth/' });
  // research #2: the email templates link to /auth/confirm and /auth/reset
  // (no extension) — serve the HTML files for those exact paths.
  app.get('/auth/confirm', (_req, reply) => reply.sendFile('confirm.html'));
  app.get('/auth/reset', (_req, reply) => reply.sendFile('reset.html'));
  authGuard(app, supabase);
  registerJobsRoutes(app);
  registerTranscriptsRoutes(app);
  return app;
}