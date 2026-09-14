-- Keep the consultant's pointer to the supporting document alongside the
-- evidence flag so later assessment reviews do not depend on opening the
-- audit log.
alter table public.scorecard_contribution_records
  add column if not exists evidence_reference text;

comment on column public.scorecard_contribution_records.evidence_reference is
  'Short consultant-supplied reference identifying the supporting evidence confirmed for this contribution.';
