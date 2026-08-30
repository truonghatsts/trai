import { supabase } from './client.js';

export type JobStatus = 'queued' | 'downloading' | 'transcribing' | 'ready' | 'error';

export interface Job {
  id: string;
  user_id: string;
  source_url: string;
  status: JobStatus;
  duration_seconds: number | null;
  created_at: string;
  error_reason: string | null;
  retry_count: number;
  transcript_id: string | null;
}

const ACTIVE_FILTER = { operator: 'in' as const, value: '(ready,error)' };

export async function createJob(
  userId: string,
  sourceUrl: string,
  durationSeconds: number | null,
): Promise<Job> {
  const { data, error } = await supabase
    .from('jobs')
    .insert({
      user_id: userId,
      source_url: sourceUrl,
      duration_seconds: durationSeconds,
      status: 'queued',
    })
    .select()
    .single();
  if (error) throw error;
  return data as Job;
}

export async function getJobById(id: string, userId?: string): Promise<Job | null> {
  let query = supabase.from('jobs').select('*').eq('id', id);
  if (userId) query = query.eq('user_id', userId);
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return (data as Job) ?? null;
}

// FR-004: any non-terminal job for the user.
export async function getActiveJob(userId: string): Promise<Job | null> {
  const { data, error } = await supabase
    .from('jobs')
    .select('*')
    .eq('user_id', userId)
    .not('status', ACTIVE_FILTER.operator, ACTIVE_FILTER.value)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as Job) ?? null;
}

// US2-AC2: an active job for the exact URL (no duplicate job).
export async function getActiveJobByUrl(userId: string, url: string): Promise<Job | null> {
  const { data, error } = await supabase
    .from('jobs')
    .select('*')
    .eq('user_id', userId)
    .eq('source_url', url)
    .not('status', ACTIVE_FILTER.operator, ACTIVE_FILTER.value)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as Job) ?? null;
}

export async function updateJob(id: string, patch: Partial<Job>): Promise<Job | null> {
  const { data, error } = await supabase
    .from('jobs')
    .update(patch)
    .eq('id', id)
    .select()
    .maybeSingle();
  if (error) throw error;
  return (data as Job) ?? null;
}

// Restart-safe claim (FR-012, SC-004): queued -> downloading only if still queued.
export async function claimNextQueuedJob(): Promise<Job | null> {
  const { data: candidates } = await supabase
    .from('jobs')
    .select('id')
    .eq('status', 'queued')
    .order('created_at', { ascending: true })
    .limit(1);
  if (!candidates?.length) return null;
  const { data, error } = await supabase
    .from('jobs')
    .update({ status: 'downloading' })
    .eq('id', candidates[0].id)
    .eq('status', 'queued')
    .select()
    .maybeSingle();
  if (error) throw error;
  return (data as Job) ?? null;
}

// SC-004: jobs left in-flight by a crashed worker must not stay stuck forever.
export async function requeueStaleJobs(): Promise<void> {
  const { error } = await supabase
    .from('jobs')
    .update({ status: 'queued', error_reason: null })
    .in('status', ['downloading', 'transcribing']);
  if (error) throw error;
}

// FR-006: error -> queued, retry_count += 1, error_reason = null.
export async function retryJob(id: string, userId: string): Promise<Job | null> {
  const job = await getJobById(id, userId);
  if (!job) return null;
  return updateJob(id, { status: 'queued', error_reason: null, retry_count: job.retry_count + 1 });
}
