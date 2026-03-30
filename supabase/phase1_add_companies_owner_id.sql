-- Phase 1: add companies.owner_id ownership anchor (nullable for legacy compatibility)
-- Run this in Supabase SQL Editor or as a migration.
--
-- Notes:
-- - Column is nullable to keep legacy rows compatible.
-- - FK uses ON DELETE SET NULL to avoid breaking older data if a user is removed.

alter table public.companies
add column if not exists owner_id uuid references auth.users(id) on delete set null;

