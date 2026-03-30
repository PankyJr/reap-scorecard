-- Run this in the Supabase SQL Editor if the audit_log table does not exist.
-- Creates the audit log table and RLS policies for the Activity page.
--
-- If you already created audit_log with an actor_id foreign key and inserts fail,
-- drop the FK then re-run this file (or run only the CREATE and policy parts):
--   ALTER TABLE public.audit_log DROP CONSTRAINT IF EXISTS audit_log_actor_id_fkey;

create table if not exists public.audit_log (
  id uuid default gen_random_uuid() primary key,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  entity_name text,
  actor_id uuid,
  actor_email text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  metadata jsonb
);

alter table public.audit_log enable row level security;

-- Drop existing policies if re-running (e.g. after schema changes)
drop policy if exists "Authenticated users can view audit log" on audit_log;
drop policy if exists "Authenticated users can insert audit log" on audit_log;

create policy "Authenticated users can view audit log" on audit_log
  for select using (auth.role() = 'authenticated');

create policy "Authenticated users can insert audit log" on audit_log
  for insert with check (auth.role() = 'authenticated');
