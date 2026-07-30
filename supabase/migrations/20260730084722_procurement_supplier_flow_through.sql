-- Supplier-level 51% Flow Through flag used by formal procurement scoring.
-- Existing rows retain their previously stored calculations and default to no uplift.
alter table public.procurement_suppliers
  add column if not exists is_51_percent_flow_through boolean not null default false;

comment on column public.procurement_suppliers.is_51_percent_flow_through is
  'When true, recognised procurement spend uses the standard B-BBEE recognition percentage multiplied by 1.20.';

-- Best-effort PostgREST schema reload after the new column is available.
do $$
begin
  execute 'notify pgrst, ''reload schema''';
exception
  when others then null;
end;
$$;
