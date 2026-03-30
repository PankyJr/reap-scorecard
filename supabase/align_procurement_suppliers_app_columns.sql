-- Align public.procurement_suppliers with the columns inserted by
-- src/app/(dashboard)/procurement/assessments/new/actions.ts (supplierRows map).
--
-- Safe to re-run: uses ADD COLUMN IF NOT EXISTS only.
-- Run in Supabase SQL Editor (or psql) against the project where create failed with
-- e.g. "Could not find the 'bo_etc' column of 'procurement_suppliers'".
--
-- Canonical definition: supabase/schema.sql (create table public.procurement_suppliers).

alter table public.procurement_suppliers
  add column if not exists supplier_code text;

alter table public.procurement_suppliers
  add column if not exists vat_number text;

alter table public.procurement_suppliers
  add column if not exists company_registration text;

alter table public.procurement_suppliers
  add column if not exists bo_etc text;

alter table public.procurement_suppliers
  add column if not exists fts text;

alter table public.procurement_suppliers
  add column if not exists des text;

alter table public.procurement_suppliers
  add column if not exists prop text;

alter table public.procurement_suppliers
  add column if not exists is_51_black_owned boolean default false;

alter table public.procurement_suppliers
  add column if not exists is_30_black_women_owned boolean default false;

alter table public.procurement_suppliers
  add column if not exists is_51_bdgs boolean default false;

alter table public.procurement_suppliers
  add column if not exists eme_amount numeric not null default 0;

alter table public.procurement_suppliers
  add column if not exists qse_amount numeric not null default 0;

alter table public.procurement_suppliers
  add column if not exists black_owned_amount numeric not null default 0;

alter table public.procurement_suppliers
  add column if not exists black_women_amount numeric not null default 0;

alter table public.procurement_suppliers
  add column if not exists bdgs_amount numeric not null default 0;

alter table public.procurement_suppliers
  add column if not exists expiry date;

alter table public.procurement_suppliers
  add column if not exists empower text;
