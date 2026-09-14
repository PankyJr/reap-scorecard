# Client Data Requirements

Documents and answers required from the site visit before production integration.

---

## Required documents

### 1. Anonymised SAP supplier-spend spreadsheet

A real monthly export with supplier names, codes, and spend **anonymised** where necessary. Needed to build column mapping and validate row counts (~900 suppliers).

### 2. Code 400 summary report

The client’s current procurement summary report (PDF or Excel) showing the layout, labels, and totals they expect the tool to reproduce.

---

## Required column and data definitions

### 3. Exact spreadsheet columns

Full list of column headers from the SAP export, in order.

### 4. Column definitions

Business meaning of each column — especially B-BBEE level, recognition %, supplier type, ownership flags.

### 5. Spend period

Confirm whether spend values are **monthly** or **cumulative year-to-date**.

### 6. Treatment of imported spend

How imported goods/services are flagged in SAP and whether they are excluded from recognition or measured procurement.

### 7. Treatment of exclusions

Which spend categories are excluded from TMPS / measured procurement (employee costs, depreciation, etc.) and whether these appear in the SAP extract.

### 8. Treatment of expired certificates

Business rule when a supplier certificate has expired — zero recognition immediately, grace period, or manual review?

### 9. Treatment of unknown suppliers

Suppliers with missing or unverified B-BBEE status — exclude, treat as non-compliant, or hold for review?

### 10. Treatment of non-compliant suppliers

Confirm zero recognition and whether spend still counts toward measured procurement total.

### 11. Recognition percentage rules

Confirm level-to-recognition mapping matches REAP engine (Levels 1–8, Non-Compliant). Clarify whether SAP provides a separate recognition % column that overrides level.

### 12. Supplier categories

Confirm EME / QSE / Generic classification source and any additional categories in Code 400.

### 13. Required procurement targets

Confirm category targets and maximum points match current REAP configuration (80% B-BBEE, 15% QSE, 15% EME, 50% black owned, 12% black women, 2% BDGs).

### 14. Required report format

Preferred export format for Code 400 summary (PDF, Excel, both) and mandatory fields.

---

## Process and governance questions

### 15. Upload replacement vs versioning

Does each monthly upload **replace** the previous baseline, or should historical months remain accessible for comparison?

### 16. Permanent scenario storage

Must what-if scenarios be saved permanently in the database, or is session/local storage sufficient?

### 17. Multi-user collaboration

Will several users edit scenarios on the same baseline simultaneously?

### 18. Scenario approval

Do scenarios require manager approval before being shared or acted upon?

### 19. Multi-company support

Will the tool serve one company or several entities under a group structure?

### 20. SAP supplier identifier matching

Which field is the stable key for matching suppliers between monthly uploads (SAP vendor number, VAT number, registration number)?

---

## Acceptance criteria for data handover

- [ ] Anonymised SAP spreadsheet received and opens correctly  
- [ ] Code 400 sample report received  
- [ ] Column mapping document signed off by client  
- [ ] All 20 questions above answered in writing  
- [ ] REAP advisor confirms scoring rules alignment  
