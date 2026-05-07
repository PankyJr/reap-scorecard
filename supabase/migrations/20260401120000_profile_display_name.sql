-- Optional display name for UI; full_name remains primary legal-style name.
-- Safe when public.profiles is created later by another migration or does not exist yet.

do $$
begin
  if to_regclass('public.profiles') is null then
    return;
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'display_name'
  ) then
    alter table public.profiles add column display_name text;
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'avatar_url'
  ) then
    alter table public.profiles add column avatar_url text;
  end if;
end
$$;
