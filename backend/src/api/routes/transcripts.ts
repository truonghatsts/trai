import type { FastifyInstance } from 'fastify';
import { sendError, ERR } from '../errors.js';
import { deleteItem, findTranscriptById, listHistoryItems } from '../../db/transcripts.js';

interface TranscriptParams {
  Params: { id: string };
}

export function registerTranscriptsRoutes(app: FastifyInstance): void {
  // FR-011: history list, newest first; status is the owning job's status.
  app.get('/api/transcripts', async (request, reply) => {
    const transcripts = await listHistoryItems(request.userId);
    return reply.send({ transcripts });
  });

  app.get<TranscriptParams>('/api/transcripts/:id', async (request, reply) => {
    const transcript = await findTranscriptById(request.params.id, request.userId);
    if (!transcript)
      return sendError(reply, ERR.notFound.status, ERR.notFound.code, ERR.notFound.message);
    return reply.send({
      transcript: {
        id: transcript.id,
        source_url: transcript.source_url,
        content: transcript.content,
        completed_at: transcript.completed_at,
      },
    });
  });

  // FR-010 / US3-AC2: removes transcript row AND its job row forever.
  app.delete<TranscriptParams>('/api/transcripts/:id', async (request, reply) => {
    const deleted = await deleteItem(request.params.id, request.userId);
    if (!deleted)
      return sendError(reply, ERR.notFound.status, ERR.notFound.code, ERR.notFound.message);
    return reply.status(204).send();
  });
}
