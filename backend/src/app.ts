import Fastify, { type FastifyInstance } from 'fastify';
import { supabase } from './db/client.js';
import { authGuard } from './api/auth.js';
import { registerJobsRoutes } from './api/routes/jobs.js';
import { registerTranscriptsRoutes } from './api/routes/transcripts.js';

export function buildApp(): FastifyInstance {
  const app = Fastify({ logger: true });
  authGuard(app, supabase);
  registerJobsRoutes(app);
  registerTranscriptsRoutes(app);
  return app;
}
