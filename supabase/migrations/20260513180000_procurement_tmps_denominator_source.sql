-- How TMPS denominator was chosen for procurement scoring (calculated pad vs manual vs supplier sum).
alter table public.procurement_assessments
  add column if not exists tmps_denominator_source text not null default 'calculated';

-- When tmps_denominator_source = 'manual', the user-entered denominator; otherwise null.
alter table public.procurement_assessments
  add column if not exists tmps_manual_amount numeric;

comment on column public.procurement_assessments.tmps_denominator_source is
  'calculated | manual | import_supplier_total — which value was used as total_measured_procurement_spend for scoring.';

comment on column public.procurement_assessments.tmps_manual_amount is
  'When source is manual: the fixed TMPS amount entered by the user.';
