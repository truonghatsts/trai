import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/db/client.js', () => ({ supabase: { auth: { getUser: vi.fn() } } }));
vi.mock('../src/db/jobs.js', () => ({
  createJob: vi.fn(),
  getActiveJob: vi.fn(),
  getActiveJobByUrl: vi.fn(),
  getJobById: vi.fn(),
  retryJob: vi.fn(),
}));
vi.mock('../src/db/transcripts.js', () => ({ findTranscriptByUrl: vi.fn() }));

import { buildApp } from '../src/app.js';
import { supabase } from '../src/db/client.js';
import { createJob, getActiveJob, getActiveJobByUrl, getJobById, retryJob } from '../src/db/jobs.js';
import { findTranscriptByUrl } from '../src/db/transcripts.js';

const mocked = {
  getUser: vi.mocked(supabase.auth.getUser),
  createJob: vi.mocked(createJob),
  getActiveJob: vi.mocked(getActiveJob),
  getActiveJobByUrl: vi.mocked(getActiveJobByUrl),
  getJobById: vi.mocked(getJobById),
  retryJob: vi.mocked(retryJob),
  findTranscriptByUrl: vi.mocked(findTranscriptByUrl),
};

const job = {
  id: 'job-1',
  user_id: 'user-1',
  source_url: 'https://www.youtube.com/watch?v=abc123',
  status: 'queued',
  duration_seconds: 60,
  created_at: '2026-01-01T00:00:00Z',
  error_reason: null,
  retry_count: 0,
  transcript_id: null,
};

const headers = { authorization: 'Bearer tok' };
const payload = { source_url: job.source_url, duration_seconds: 60 };

beforeEach(() => {
  vi.clearAllMocks();
  mocked.findTranscriptByUrl.mockResolvedValue(null);
  mocked.getActiveJobByUrl.mockResolvedValue(null);
  mocked.getActiveJob.mockResolvedValue(null);
  mocked.createJob.mockResolvedValue(job);
});

// FR-003 gate (contracts/api.md): 403 email_not_verified for unverified
// accounts on the two job-mutating endpoints; 401 takes precedence.
describe('email verification gate', () => {
  it('POST /api/jobs -> 403 email_not_verified for unverified user, no job row', async () => {
    mocked.getUser.mockResolvedValue({
      data: { user: { id: 'user-1', email_confirmed_at: null } },
      error: null,
    });
    const app = buildApp();
    const res = await app.inject({ method: 'POST', url: '/api/jobs', payload, headers });

    expect(res.statusCode).toBe(403);
    expect(res.json()).toEqual({
      error: { code: 'email_not_verified', message: 'Confirm your email to start transcription.' },
    });
    expect(mocked.createJob).not.toHaveBeenCalled();
    expect(mocked.findTranscriptByUrl).not.toHaveBeenCalled();
  });

  it('POST /api/jobs/:id/retry -> 403 email_not_verified, no job read', async () => {
    mocked.getUser.mockResolvedValue({
      data: { user: { id: 'user-1', email_confirmed_at: null } },
      error: null,
    });
    const app = buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/jobs/job-1/retry',
      payload: {},
      headers,
    });

    expect(res.statusCode).toBe(403);
    expect(res.json().error.code).toBe('email_not_verified');
    expect(mocked.getJobById).not.toHaveBeenCalled();
  });

  it('POST /api/jobs -> 201 for a verified user', async () => {
    mocked.getUser.mockResolvedValue({
      data: { user: { id: 'user-1', email_confirmed_at: '2026-01-01T00:00:00Z' } },
      error: null,
    });
    const app = buildApp();
    const res = await app.inject({ method: 'POST', url: '/api/jobs', payload, headers });

    expect(res.statusCode).toBe(201);
    expect(res.json().job.id).toBe('job-1');
    expect(mocked.createJob).toHaveBeenCalledWith('user-1', job.source_url, 60);
  });

  it('POST /api/jobs/:id/retry -> 200 for a verified user with a failed job', async () => {
    mocked.getUser.mockResolvedValue({
      data: { user: { id: 'user-1', email_confirmed_at: '2026-01-01T00:00:00Z' } },
      error: null,
    });
    mocked.getJobById.mockResolvedValue({ ...job, status: 'error' });
    mocked.retryJob.mockResolvedValue({ ...job, status: 'queued' });
    const app = buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/jobs/job-1/retry',
      payload: {},
      headers,
    });

    expect(res.statusCode).toBe(200);
    expect(mocked.retryJob).toHaveBeenCalledWith('job-1', 'user-1');
  });

  it('401 takes precedence over the gate (missing token)', async () => {
    const app = buildApp();
    const res = await app.inject({ method: 'POST', url: '/api/jobs', payload });

    expect(res.statusCode).toBe(401);
    expect(mocked.getUser).not.toHaveBeenCalled();
    expect(mocked.createJob).not.toHaveBeenCalled();
  });

  it('401 takes precedence over the gate (invalid token)', async () => {
    mocked.getUser.mockResolvedValue({ data: { user: null }, error: { message: 'invalid' } });
    const app = buildApp();
    const res = await app.inject({ method: 'POST', url: '/api/jobs', payload, headers });

    expect(res.statusCode).toBe(401);
    expect(mocked.createJob).not.toHaveBeenCalled();
  });
});