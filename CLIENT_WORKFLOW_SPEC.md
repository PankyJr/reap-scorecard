# Client Procurement Scenario Workflow — Specification

**Client context:** Mbeki Industrial Holdings (Pty) Ltd (fictional demo entity)  
**Product promise:** *Upload the latest procurement position, test supplier changes and immediately see the projected impact on your score.*

---

## Client problem

The client exports ~900 suppliers monthly from SAP. They need to test individual supplier changes (B-BBEE level, compliance, spend) and see procurement point impact **without creating a new formal assessment each time**.

Current REAP procurement assessments are structured for periodic reporting, not rapid operational what-if planning.

---

## Current monthly process

1. Export supplier-spend data from SAP (monthly)
2. Review procurement position against B-BBEE targets
3. Identify risk suppliers (non-compliant, imported, expiring certificates)
4. Manually estimate impact of replacing or reclassifying suppliers
5. Produce or review Code 400 procurement summary for verification reporting

---

## Desired workflow

1. **Upload** latest monthly SAP supplier-spend spreadsheet  
2. **View** all suppliers in searchable, editable table  
3. **Select** a supplier  
4. **Change** B-BBEE level or compliance status (scenario only)  
5. **Adjust** or remove supplier spend (scenario only)  
6. **See** immediate projected procurement points  
7. **Compare** actual monthly position vs simulated position  
8. **Reset** changes without corrupting uploaded baseline  
9. **Export** summary similar to Code 400 procurement summary  
10. **Re-upload** next month’s SAP report as new baseline  

---

## Actual vs scenario distinction

| State | Description | Mutability |
|-------|-------------|------------|
| **Actual position** | Untouched baseline from monthly SAP upload | Read-only |
| **Scenario position** | Working copy with temporary overrides | Editable, resettable |
| **Unsaved changes** | Scenario edits not yet saved locally | Warning shown |

User must always know which view they are in.

---

## Supplier scenario actions

Per supplier (scenario copy only):

- Change B-BBEE level  
- Change compliance status  
- Change supplier classification (EME / QSE / Generic)  
- Toggle local vs imported  
- Change scenario spend  
- Exclude supplier from scenario totals  
- Restore original values  

Global scenario controls:

- Reset all changes  
- Undo last change  
- Filter to modified suppliers only  
- Name and save scenario locally (prototype)  
- Duplicate or delete saved scenarios  

---

## Expected Code 400 outcome

The client expects a summary aligned with their **Code 400 procurement summary** report, including:

- Current procurement points  
- Total measured procurement spend  
- Recognised B-BBEE procurement spend  
- Imported and non-compliant spend breakdowns  
- Supplier counts  

**Phase 1 status:** Summary metrics use existing REAP procurement engine. Code 400 layout export is **not implemented** — requires client sample report.

---

## User roles

| Role | Needs |
|------|-------|
| Procurement manager | Upload data, run scenarios, read impact summary |
| B-BBEE coordinator | Verify recognition, compliance flags, export summary |
| Finance reviewer | Confirm spend totals match SAP |
| REAP advisor (Bongani) | Validate rules mapping, guide client adoption |

---

## UX requirements (from discovery meeting)

- Minimum 16px body text  
- Large headings, clear primary actions  
- Plain business language — not technical jargon  
- Calm, operational feel — not dense dashboard  
- Strong table readability for ~900 rows  
- Clear actual / scenario / unsaved states  
- Pagination or virtualisation for large tables  

---

## Open business questions

1. Does SAP export include TMPS total or only supplier lines?  
2. Are spend figures monthly or year-to-date cumulative?  
3. How are imported goods identified in SAP extract?  
4. What happens to expired certificates — zero recognition or grace period?  
5. Must scenarios be approved before sharing internally?  
6. Should monthly uploads replace or version previous baselines?  
7. How should supplier IDs be matched when SAP codes change?  

See `CLIENT_DATA_REQUIREMENTS.md` and `CLIENT_SITE_VISIT_CHECKLIST.md`.

---

## Features intentionally excluded (Phase 1)

- Production sidebar / navigation entry  
- Supabase persistence of scenarios  
- Code 400 PDF/Excel export  
- Real SAP file upload in prototype  
- Changes to existing assessment workflow  
- Changes to scoring formulas  
- Overall company B-BBEE level from procurement alone  
- Multi-user collaboration  
- Approval workflows  
- Netlify deployment  
