-- Correcting a confirmed evidence reference.
--
-- Two rules drive this file:
--
--   1. The corrected reference and its audit entry must land together. Either
--      the contribution row and the audit log both change, or neither does.
--      A plpgsql function body runs inside a single transaction, so a failure
--      anywhere below rolls the whole correction back.
--   2. A correction never un-confirms the evidence, never touches any imported
--      amount or provenance column, and never rewrites the original
--      confirmation audit entry. The trail gains an event; it never loses one.

alter table public.scorecard_contribution_records
  add column if not exists evidence_reference_corrected_at timestamptz;

comment on column public.scorecard_contribution_records.evidence_reference_corrected_at is
  'Set when an already-confirmed evidence reference was later corrected. Drives the "reference corrected" marker on the contribution row so a reviewer sees the amendment without opening the audit log; the previous reference and the reason live in scorecard_assessment_audit_log.';

create or replace function public.correct_contribution_evidence_reference(
  p_assessment_id uuid,
  p_record_id uuid,
  p_element_key text,
  p_reference text,
  p_reason text
)
returns public.scorecard_contribution_records
language plpgsql
-- SECURITY INVOKER (the default, stated for the avoidance of doubt): the
-- caller's own row-level security decides which contributions and audit rows
-- they may touch. This function exists for atomicity, not for extra privilege.
security invoker
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_reference text := btrim(coalesce(p_reference, ''));
  v_reason text := btrim(coalesce(p_reason, ''));
  v_previous public.scorecard_contribution_records;
  v_updated public.scorecard_contribution_records;
begin
  -- The same rules the server action applies, restated here so they hold no
  -- matter which client calls the function.
  if v_actor is null then
    raise exception 'A signed-in user is required to correct an evidence reference.';
  end if;
  if v_reference = '' then
    raise exception 'A corrected evidence reference is required.';
  end if;
  if length(v_reference) > 160 then
    raise exception 'A corrected evidence reference must be 160 characters or fewer.';
  end if;
  if v_reason = '' then
    raise exception 'A correction reason is required.';
  end if;
  if length(v_reason) > 160 then
    raise exception 'A correction reason must be 160 characters or fewer.';
  end if;

  select * into v_previous
  from public.scorecard_contribution_records
  where id = p_record_id
    and assessment_id = p_assessment_id
    and element_key = p_element_key
  for update;

  if not found then
    raise exception 'That contribution could not be found.';
  end if;
  if v_previous.evidence_provided is not true then
    raise exception 'Only a contribution with confirmed supporting evidence can have its reference corrected.';
  end if;
  if btrim(coalesce(v_previous.evidence_reference, '')) = v_reference then
    raise exception 'The corrected reference is the same as the reference already recorded.';
  end if;

  -- evidence_provided is deliberately absent: a correction amends the pointer
  -- to the document, never the fact that evidence was confirmed.
  update public.scorecard_contribution_records
  set evidence_reference = v_reference,
      evidence_reference_corrected_at = now(),
      updated_at = now()
  where id = v_previous.id
  returning * into v_updated;

  if not found then
    raise exception 'That contribution could not be corrected.';
  end if;

  insert into public.scorecard_assessment_audit_log
    (assessment_id, action, element_key, actor, detail)
  values (
    p_assessment_id,
    'contribution.evidence_reference_corrected',
    p_element_key,
    v_actor,
    jsonb_build_object(
      'contributionRecordId', v_previous.id,
      'beneficiaryName', v_previous.beneficiary_name,
      'actualValue', v_previous.actual_value,
      'sourceSheet', v_previous.source_sheet,
      'sourceRowNumber', v_previous.source_row_number,
      'previousEvidenceReference', v_previous.evidence_reference,
      'newEvidenceReference', v_reference,
      'correctionReason', v_reason,
      'evidenceProvided', true,
      'correctedAt', v_updated.evidence_reference_corrected_at
    )
  );

  return v_updated;
end;
$$;

comment on function public.correct_contribution_evidence_reference(uuid, uuid, text, text, text) is
  'Atomically corrects a confirmed contribution evidence reference and writes the matching contribution.evidence_reference_corrected audit entry. Both succeed or both roll back.';

grant execute on function public.correct_contribution_evidence_reference(uuid, uuid, text, text, text)
  to authenticated;
