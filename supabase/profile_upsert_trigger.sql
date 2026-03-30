-- Upgrade the handle_new_user trigger to capture full_name and avatar_url
-- from auth.users.raw_user_meta_data (populated by Google OAuth and email signup).
-- Uses ON CONFLICT to upsert so it is idempotent — re-running for existing users
-- fills in any missing profile fields without creating duplicates.

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture', '')
  )
  on conflict (id) do update set
    email      = excluded.email,
    full_name  = coalesce(nullif(excluded.full_name, ''), profiles.full_name),
    avatar_url = coalesce(nullif(excluded.avatar_url, ''), profiles.avatar_url);
  return new;
end;
$$ language plpgsql security definer;

-- Add avatar_url column if it does not exist yet
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'avatar_url'
  ) then
    alter table public.profiles add column avatar_url text;
  end if;
end
$$;

-- Backfill existing profiles that are missing full_name or avatar_url from auth metadata
update public.profiles p
set
  full_name  = coalesce(nullif(p.full_name, ''), u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name'),
  avatar_url = coalesce(nullif(p.avatar_url, ''), u.raw_user_meta_data ->> 'avatar_url', u.raw_user_meta_data ->> 'picture')
from auth.users u
where u.id = p.id
  and (p.full_name is null or p.full_name = '' or p.avatar_url is null or p.avatar_url = '');
