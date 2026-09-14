# Client Site Visit Checklist

**Purpose:** Practical discovery agenda for Bongani and the developer during the on-site visit.  
**Client:** Procurement scenario planning (SAP monthly extract workflow)

---

## Before the visit

- [ ] Review `CLIENT_WORKFLOW_SPEC.md` with Bongani  
- [ ] Open prototype at `/procurement-simulator-preview` on laptop  
- [ ] Prepare blank column-mapping worksheet  
- [ ] Confirm recording / note-taking consent with client  

---

## 1. Opening (15 min)

- [ ] Confirm attendees (procurement, finance, B-BBEE, IT/SAP)  
- [ ] Restate goal: *test supplier changes without new assessments*  
- [ ] Show prototype summary + supplier table (fictional Mbeki data)  
- [ ] Confirm they recognise the workflow intent  

---

## 2. Current process walkthrough (30 min)

- [ ] Watch client export SAP report live (or replay recording)  
- [ ] Capture export frequency (monthly confirmed?)  
- [ ] Capture typical supplier count (~900?)  
- [ ] Identify who performs export and who runs B-BBEE review  
- [ ] Collect sample Code 400 summary they use today  

**Deliverable:** Anonymised SAP file + Code 400 sample

---

## 3. Spreadsheet structure (45 min)

- [ ] List every column header in order  
- [ ] Define each column in plain language  
- [ ] Identify required vs optional columns  
- [ ] Confirm spend is monthly or YTD  
- [ ] Identify B-BBEE level column format (1–8, text, etc.)  
- [ ] Check for separate recognition % column  
- [ ] Check for local/imported flag  
- [ ] Check for EME/QSE/Generic classification  
- [ ] Check for ownership flags (51% black, 30% women, BDGs)  
- [ ] Confirm stable supplier identifier for month-to-month matching  

**Deliverable:** Completed column definition table

---

## 4. Business rules validation (30 min)

- [ ] Non-compliant suppliers — recognition and TMPS treatment  
- [ ] Expired certificates — rule and examples  
- [ ] Unknown / missing status — rule and examples  
- [ ] Imported spend — exclusion rules  
- [ ] Excluded spend categories — what SAP includes/excludes  
- [ ] TMPS total — in SAP file or sum of suppliers?  
- [ ] Confirm procurement targets match Code 400  

**Deliverable:** Rules sign-off or list of exceptions

---

## 5. Scenario workflow (20 min)

- [ ] Typical what-if examples (name 3 real scenarios)  
- [ ] Who runs scenarios vs who approves  
- [ ] Must scenarios be saved permanently?  
- [ ] Multi-user access needed?  
- [ ] Monthly upload replaces or versions previous data?  

---

## 6. Report and export expectations (20 min)

- [ ] Walk through Code 400 sample line by line  
- [ ] Required export format (PDF / Excel)  
- [ ] Branding / header requirements  
- [ ] Fields that must match SAP totals exactly  

---

## 7. Technical constraints (15 min)

- [ ] SAP version and export method  
- [ ] Data sensitivity / POPIA considerations  
- [ ] Preferred hosting (confirm no change to current Netlify until ready)  
- [ ] User count and authentication expectations  

---

## 8. Prototype feedback (20 min)

- [ ] Text size acceptable?  
- [ ] Table columns — missing anything?  
- [ ] Primary actions easy to find?  
- [ ] Actual vs scenario distinction clear?  
- [ ] Name 1 thing to remove (reduce busyness)  

---

## 9. Close and next steps (10 min)

- [ ] Assign owner for anonymised SAP file delivery  
- [ ] Assign owner for Code 400 sample delivery  
- [ ] Schedule follow-up for rules sign-off  
- [ ] Confirm open questions from `CLIENT_DATA_REQUIREMENTS.md`  

---

## Red flags to escalate

- SAP columns do not map to any existing REAP supplier fields  
- Code 400 uses different targets or formulas than REAP engine  
- TMPS definition differs materially from supplier-line sum  
- Client expects overall B-BBEE level from procurement changes alone  
- Imported spend rules require engine changes not yet scoped  

---

## Post-visit actions (developer)

- [ ] Update column mapping in Excel parser  
- [ ] Revise `CLIENT_SIMULATOR_TECHNICAL_AUDIT.md` with findings  
- [ ] Estimate Phase 2 scope (upload + persistence + Code 400 export)  
- [ ] Share updated prototype with real column preview (local only)  
