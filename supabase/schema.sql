-- Supabase Schema for REAP Scorecard System
-- Run this in the Supabase SQL Editor
--
-- RLS: After Phase 1 (owner_id) and Phase 2 (backfill), run phase3_strict_rls.sql
-- to replace the broad policies below with ownership-based policies. Final policies:
--   companies: Users can select/insert/update/delete own companies (owner_id = auth.uid())
--   scorecards: All ops via company ownership (exists companies where id = company_id and owner_id = auth.uid())
--   scorecard_inputs, scorecard_results: All ops via scorecards -> companies -> owner_id
--   procurement_assessments: All ops via company ownership
--   procurement_suppliers, procurement_results: All ops via assessment -> company -> owner_id
--   audit_log: Select/insert where actor_id = auth.uid()
-- Companies with owner_id IS NULL are not visible to any user.

create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  full_name text,
  role text default 'staff',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone." on profiles
  for select using (true);

create policy "Users can insert their own profile." on profiles
  for insert with check (auth.uid() = id);

create policy "Users can update own profile." on profiles
  for update using (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create table public.companies (
  id uuid default gen_random_uuid() primary key,
  owner_id uuid references auth.users(id) on delete set null,
  name text not null,
  contact_person text,
  email text,
  phone text,
  industry text,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.companies enable row level security;

create policy "Authenticated users can manage companies" on companies
  for all using (auth.role() = 'authenticated');

create table public.scorecards (
  id uuid default gen_random_uuid() primary key,
  company_id uuid references public.companies on delete cascade not null,
  total_score numeric,
  score_level text,
  created_by uuid references auth.users on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.scorecards enable row level security;

create policy "Authenticated users can manage scorecards" on scorecards
  for all using (auth.role() = 'authenticated');

create table public.scorecard_inputs (
  id uuid default gen_random_uuid() primary key,
  scorecard_id uuid references public.scorecards on delete cascade not null,
  category_key text not null,
  input_value numeric not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.scorecard_inputs enable row level security;

create policy "Authenticated users can manage scorecard inputs" on scorecard_inputs
  for all using (auth.role() = 'authenticated');

create table public.scorecard_results (
  id uuid default gen_random_uuid() primary key,
  scorecard_id uuid references public.scorecards on delete cascade not null,
  category_name text not null,
  score numeric not null,
  max_score numeric not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.scorecard_results enable row level security;

create policy "Authenticated users can manage scorecard results" on scorecard_results
  for all using (auth.role() = 'authenticated');

-- ====================================================================
-- Procurement Scorecard Module (Phase 1)
-- ====================================================================

create table public.procurement_assessments (
  id uuid default gen_random_uuid() primary key,
  company_id uuid references public.companies on delete cascade not null,
  assessment_year integer not null,
  -- TMPS inputs (Preferential Procurement template) used to derive the denominator
  -- TMPS Total = Total Inclusions - Total Exclusions
  -- Stored as nullable so existing assessments remain valid.
  tmps_opening_inventory numeric,
  tmps_closing_inventory numeric,
  tmps_cost_of_sales numeric,
  tmps_other_operating_expenses numeric,
  tmps_finance_costs numeric,
  tmps_capital_expenditure numeric,
  tmps_employee_costs numeric,
  tmps_depreciation numeric,
  tmps_utilities numeric,
  tmps_service_fees numeric,
  tmps_recharge_for_services numeric,
  tmps_purchase_of_goods numeric,
  tmps_purchase_of_services numeric,
  total_measured_procurement_spend numeric not null,
  total_score numeric,
  status text default 'draft',
  created_by uuid references auth.users on delete set null,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

alter table public.procurement_assessments enable row level security;

create policy "Authenticated users can manage procurement assessments"
  on procurement_assessments
  for all using (auth.role() = 'authenticated');


create table public.procurement_suppliers (
  id uuid default gen_random_uuid() primary key,
  assessment_id uuid references public.procurement_assessments on delete cascade not null,
  supplier_name text not null,
  supplier_code text,
  vat_number text,
  company_registration text,
  bo_etc text,
  fts text,
  des text,
  prop text,
  supplier_type text not null, -- 'EME' | 'QSE' | 'Generic'
  level text not null,         -- '1'..'8' or 'Non-Compliant'
  recognition_percent numeric not null,
  value_ex_vat numeric not null,
  bbbee_spend numeric not null,
  is_51_black_owned boolean default false,
  is_30_black_women_owned boolean default false,
  is_51_bdgs boolean default false,
  eme_amount numeric not null default 0,
  qse_amount numeric not null default 0,
  black_owned_amount numeric not null default 0,
  black_women_amount numeric not null default 0,
  bdgs_amount numeric not null default 0,
  expiry date,
  empower text,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

alter table public.procurement_suppliers enable row level security;

create policy "Authenticated users can manage procurement suppliers"
  on procurement_suppliers
  for all using (auth.role() = 'authenticated');


create table public.procurement_results (
  id uuid default gen_random_uuid() primary key,
  assessment_id uuid references public.procurement_assessments on delete cascade not null,
  category_key text not null,
  category_name text not null,
  target_percent numeric not null,
  available_points numeric not null,
  achieved_percent numeric not null,
  points_achieved numeric not null,
  numerator_value numeric not null,
  denominator_value numeric not null
);

alter table public.procurement_results enable row level security;

create policy "Authenticated users can manage procurement results"
  on procurement_results
  for all using (auth.role() = 'authenticated');

-- ====================================================================
-- Audit Log (activity history for key actions)
-- ====================================================================

create table public.audit_log (
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

create policy "Authenticated users can view audit log" on audit_log
  for select using (auth.role() = 'authenticated');

create policy "Authenticated users can insert audit log" on audit_log
  for insert with check (auth.role() = 'authenticated');