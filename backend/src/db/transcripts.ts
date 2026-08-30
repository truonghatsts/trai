import { supabase } from './client.js';
import { getJobById } from './jobs.js';

export interface Transcript {
  id: string;
  user_id: string;
  job_id: string;
  source_url: string;
  content: string;
  completed_at: string;
}

export interface HistoryItem {
  id: string; // transcript id when ready, else the job id (delete/view target)
  source_url: string;
  status: string;
  created_at: string;
}

// US2-AC1: stored transcript for the exact URL (FR-008, no normalization).
export async function findTranscriptByUrl(userId: string, url: string): Promise<Transcript | null> {
  const { data, error } = await supabase
    .from('transcripts')
    .select('*')
    .eq('user_id', userId)
    .eq('source_url', url)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as Transcript) ?? null;
}

export async function findTranscriptById(id: string, userId: string): Promise<Transcript | null> {
  const { data, error } = await supabase
    .from('transcripts')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return (data as Transcript) ?? null;
}

export async function createTranscript(input: {
  userId: string;
  jobId: string;
  sourceUrl: string;
  content: string;
}): Promise<Transcript> {
  const { data, error } = await supabase
    .from('transcripts')
    .insert({
      user_id: input.userId,
      job_id: input.jobId,
      source_url: input.sourceUrl,
      content: input.content,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Transcript;
}

// FR-011: history lists every job (source URL, status, date), newest first.
export async function listHistoryItems(userId: string): Promise<HistoryItem[]> {
  const { data, error } = await supabase
    .from('jobs')
    .select('id, transcript_id, source_url, status, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (
    data as {
      id: string;
      transcript_id: string | null;
      source_url: string;
      status: string;
      created_at: string;
    }[]
  ).map((job) => ({
    id: job.transcript_id ?? job.id,
    source_url: job.source_url,
    status: job.status,
    created_at: job.created_at,
  }));
}

// US3-AC2/3: remove the transcript row AND its job row; a processing job's row
// is removed too, and the worker's finalize detects the missing row and does
// not resurrect the item (edge case: delete while processing).
export async function deleteItem(id: string, userId: string): Promise<boolean> {
  const transcript = await findTranscriptById(id, userId);
  if (transcript) {
    await supabase.from('transcripts').delete().eq('id', transcript.id).eq('user_id', userId);
    await supabase.from('jobs').delete().eq('id', transcript.job_id).eq('user_id', userId);
    return true;
  }
  const job = await getJobById(id, userId);
  if (job) {
    if (job.transcript_id) {
      await supabase.from('transcripts').delete().eq('id', job.transcript_id).eq('user_id', userId);
    }
    await supabase.from('jobs').delete().eq('id', job.id).eq('user_id', userId);
    return true;
  }
  return false;
}
