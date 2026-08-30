-- 001_init: jobs + transcripts for the video transcription extension
-- (data-model.md). Single-user scoping via RLS (auth.uid()).

create type job_status as enum ('queued', 'downloading', 'transcribing', 'ready', 'error');

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  source_url text not null,
  status job_status not null default 'queued',
  duration_seconds int,
  created_at timestamptz not null default now(),
  error_reason text,
  retry_count int not null default 0,
  transcript_id uuid
);

create table public.transcripts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  job_id uuid not null unique references public.jobs (id),
  source_url text not null,
  content text not null,
  completed_at timestamptz not null default now()
);

-- Bidirectional 1:1 FK link (both sides kept for cheap lookups). Deleting a
-- transcript nulls the job's reference; the app deletes transcript + job rows
-- together (data-model.md deletion rules).
alter table public.jobs
  add constraint jobs_transcript_fk foreign key (transcript_id) references public.transcripts (id) on delete set null;

-- FR-004: one active job per user — DB backstop for the app-level check.
create unique index one_active_job_per_user on public.jobs (user_id) where status not in ('ready', 'error');

-- FR-008 / US2: exact-URL reopen lookups.
create index jobs_user_url on public.jobs (user_id, source_url);
create index transcripts_user_url on public.transcripts (user_id, source_url);

-- RLS: every row belongs to the signed-in user (data-model.md § User).
alter table public.jobs enable row level security;
alter table public.transcripts enable row level security;

create policy jobs_all_own on public.jobs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy transcripts_all_own on public.transcripts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);