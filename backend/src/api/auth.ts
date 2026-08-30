import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { sendError, ERR } from './errors.js';

declare module 'fastify' {
  interface FastifyRequest {
    userId: string;
    // Resolved user object (research #4): carries email_confirmed_at for the
    // verification gate — same getUser call the authGuard already makes.
    user: User;
  }
}

// FR-001: every request must carry a valid Supabase JWT (Authorization: Bearer).
export function authGuard(app: FastifyInstance, client: SupabaseClient): void {
  app.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    // Public auth pages are unauthenticated (contracts/auth.md) — the token
    // is not needed there; verifyOtp carries its own credential.
    if (request.url.startsWith('/auth/')) return;
    const header = request.headers.authorization;
    const token =
      typeof header === 'string' && header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) {
      return sendError(
        reply,
        ERR.unauthorized.status,
        ERR.unauthorized.code,
        ERR.unauthorized.message,
      );
    }
    const { data, error } = await client.auth.getUser(token);
    if (error || !data.user) {
      return sendError(
        reply,
        ERR.unauthorized.status,
        ERR.unauthorized.code,
        ERR.unauthorized.message,
      );
    }
    request.userId = data.user.id;
    request.user = data.user;
  });
}
