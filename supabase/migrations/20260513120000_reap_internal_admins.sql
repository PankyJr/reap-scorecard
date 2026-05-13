-- Internal REAP operator allowlist. No RLS policies for authenticated/anon → default deny.
-- Service role bypasses RLS for management queries and the admin app server routes.
-- Grant membership only via SQL editor or automation using the service role key.

create table if not exists public.reap_internal_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default timezone('utc'::text, now())
);

comment on table public.reap_internal_admins is
  'REAP staff allowlist for internal admin UI. Inserts/deletes only via service role or superuser SQL.';

alter table public.reap_internal_admins enable row level security;
