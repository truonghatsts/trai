-- One-time rollout: pre-002 accounts were created without email verification;
-- treat them as verified so the current user is never locked out (spec
-- assumptions). Run exactly once at rollout via `supabase db push`.
update auth.users set email_confirmed_at = now()
where email_confirmed_at is null;