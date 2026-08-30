import type { FastifyInstance } from 'fastify';
import { sendError, ERR } from '../errors.js';
import { config } from '../../config.js';
import {
  createJob,
  getActiveJob,
  getActiveJobByUrl,
  getJobById,
  retryJob,
  type Job,
} from '../../db/jobs.js';
import { findTranscriptByUrl } from '../../db/transcripts.js';

// URL validation (FR-003, contracts/api.md 400 codes). Exact-URL semantics
// (research #6): never normalize — the string is the identity key.
export function parseSourceUrl(
  raw: string,
): { url: URL } | { code: 'invalid_url' | 'not_a_video_page' } {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { code: 'invalid_url' };
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return { code: 'invalid_url' };
  if (!url.hostname) return { code: 'invalid_url' };
  // ponytail: bare domain (no path, no query) is not a specific video page;
  // the content script is the primary guard for non-video pages.
  if (url.pathname === '/' && url.search === '') return { code: 'not_a_video_page' };
  return { url };
}

function jobShape(job: Job) {
  return {
    id: job.id,
    source_url: job.source_url,
    status: job.status,
    duration_seconds: job.duration_seconds,
    error_reason: job.error_reason,
    retry_count: job.retry_count,
    created_at: job.created_at,
    transcript_id: job.transcript_id,
  };
}

interface JobParams {
  Params: { id: string };
}

interface CreateJobBody {
  Body: { source_url?: unknown; duration_seconds?: unknown };
}

export function registerJobsRoutes(app: FastifyInstance): void {
  // Single entry point with US2 lookup semantics (data-model.md § Lookup
  // semantics): transcript first, then active job, then create.
  app.post<CreateJobBody>('/api/jobs', async (request, reply) => {
    // FR-003 gate (contracts/api.md): after authGuard (401 first), unverified
    // accounts are refused before any job read/write.
    if (request.user.email_confirmed_at == null) {
      return sendError(
        reply,
        ERR.emailNotVerified.status,
        ERR.emailNotVerified.code,
        ERR.emailNotVerified.message,
      );
    }
    const { source_url, duration_seconds } = request.body ?? {};
    if (typeof source_url !== 'string' || source_url.length === 0) {
      return sendError(reply, ERR.invalidUrl.status, ERR.invalidUrl.code, ERR.invalidUrl.message);
    }
    const parsed = parseSourceUrl(source_url);
    if ('code' in parsed) {
      const e = parsed.code === 'invalid_url' ? ERR.invalidUrl : ERR.notAVideoPage;
      return sendError(reply, e.status, e.code, e.message);
    }

    const duration = duration_seconds == null ? null : Number(duration_seconds);
    // FR-003: reject >5 min before any download and before any row is created.
    if (duration != null && !Number.isNaN(duration) && duration > config.maxDurationSeconds) {
      return sendError(
        reply,
        ERR.durationTooLong.status,
        ERR.durationTooLong.code,
        ERR.durationTooLong.message,
      );
    }

    const userId = request.userId;
    // US2-AC1: stored transcript for the exact URL -> no new job.
    const existing = await findTranscriptByUrl(userId, source_url);
    if (existing) {
      return reply.send({
        kind: 'transcript',
        transcript: {
          id: existing.id,
          source_url: existing.source_url,
          completed_at: existing.completed_at,
        },
      });
    }
    // US2-AC2: active job for the exact URL -> show its progress, no duplicate.
    const activeForUrl = await getActiveJobByUrl(userId, source_url);
    if (activeForUrl) return reply.send({ kind: 'job', job: jobShape(activeForUrl) });
    // FR-004: one active job per user.
    const anyActive = await getActiveJob(userId);
    if (anyActive) {
      return sendError(
        reply,
        ERR.activeJobExists.status,
        ERR.activeJobExists.code,
        ERR.activeJobExists.message,
      );
    }
    const job = await createJob(userId, source_url, duration);
    return reply.status(201).send({ kind: 'job', job: jobShape(job) });
  });

  app.get<JobParams>('/api/jobs/:id', async (request, reply) => {
    const job = await getJobById(request.params.id, request.userId);
    if (!job) return sendError(reply, ERR.notFound.status, ERR.notFound.code, ERR.notFound.message);
    return reply.send({ job: jobShape(job) });
  });

  app.post<JobParams>('/api/jobs/:id/retry', async (request, reply) => {
    // FR-003 gate: retry is equally gated (contracts/api.md).
    if (request.user.email_confirmed_at == null) {
      return sendError(
        reply,
        ERR.emailNotVerified.status,
        ERR.emailNotVerified.code,
        ERR.emailNotVerified.message,
      );
    }
    const job = await getJobById(request.params.id, request.userId);
    if (!job) return sendError(reply, ERR.notFound.status, ERR.notFound.code, ERR.notFound.message);
    if (job.status !== 'error') {
      return sendError(
        reply,
        ERR.notRetryable.status,
        ERR.notRetryable.code,
        ERR.notRetryable.message,
      );
    }
    // FR-004 holds on retry too: retrying must not create a second active job.
    const anyActive = await getActiveJob(request.userId);
    if (anyActive && anyActive.id !== job.id) {
      return sendError(
        reply,
        ERR.activeJobExists.status,
        ERR.activeJobExists.code,
        ERR.activeJobExists.message,
      );
    }
    const updated = await retryJob(job.id, request.userId);
    return reply.send({ job: jobShape(updated!) });
  });
}
