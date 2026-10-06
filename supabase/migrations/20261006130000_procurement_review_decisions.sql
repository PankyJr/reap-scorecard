-- Procurement "Needs attention" decisions that must survive a save.
--
-- Additive only: one new, nullable column. No existing row or value changes.
-- Until this is applied the app still saves procurement scorecards; it only
-- cannot remember a "Keep both" choice for possible duplicate suppliers, so
-- such pairs are shown again under Needs attention.

alter table public.procurement_assessments
  add column if not exists review_decisions jsonb;

comment on column public.procurement_assessments.review_decisions is
  'Choices made in the procurement Needs attention list, e.g. {"keptDuplicates": ["vat:4123456789"]}: duplicate-supplier groups the user chose to keep as separate suppliers. Null means none.';

-- Best-effort PostgREST schema reload after the new column is available.
do $$
begin
  execute 'notify pgrst, ''reload schema''';
exception
  when others then null;
end;
$$;
