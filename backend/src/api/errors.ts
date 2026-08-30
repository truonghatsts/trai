import type { FastifyReply } from 'fastify';

export interface ApiErrorBody {
  error: { code: string; message: string };
}

export function sendError(
  reply: FastifyReply,
  status: number,
  code: string,
  message: string,
): FastifyReply {
  return reply.status(status).send({ error: { code, message } } satisfies ApiErrorBody);
}

// contracts/api.md error envelope: machine-readable code + human-readable message shown verbatim.
export const ERR = {
  unauthorized: { status: 401, code: 'unauthorized', message: 'You must sign in first.' },
  invalidUrl: { status: 400, code: 'invalid_url', message: 'That is not a valid URL.' },
  notAVideoPage: {
    status: 400,
    code: 'not_a_video_page',
    message: 'That does not look like a public video page.',
  },
  durationTooLong: {
    status: 400,
    code: 'duration_too_long',
    message: 'This video is longer than 5 minutes.',
  },
  activeJobExists: {
    status: 409,
    code: 'active_job_exists',
    message: 'Only one transcription can run at a time.',
  },
  notFound: { status: 404, code: 'not_found', message: 'Not found.' },
  notRetryable: { status: 409, code: 'not_retryable', message: 'Only failed jobs can be retried.' },
  emailNotVerified: {
    status: 403,
    code: 'email_not_verified',
    message: 'Confirm your email to start transcription.',
  },
} as const;
