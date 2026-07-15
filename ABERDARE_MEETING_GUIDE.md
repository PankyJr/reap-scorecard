# Aberdare Meeting Guide

**Meeting:** In-person discovery — Aberdare Cables (Pty) Ltd  
**Purpose:** Show that we understand their supplier-spend structure and can support: upload current position → change a supplier/sourcing decision → see projected procurement-point impact.

## What to demonstrate

1. Aberdare workspace (not a finished production claim).
2. Live Procurement with their BBBEE spend report.
3. Immediate scenario impact using REAP’s existing procurement scoring engine.
4. Clear separation from Formal Assessment (REAP Formal Scorecard).

## Recommended click sequence

1. Open `http://localhost:3000/clients/aberdare/procurement-control-preview` (logged in).
2. Point out **Live Procurement** and **Formal Assessment** as complementary.
3. Click **Open Live Procurement**.
4. Upload `BBBEE Spend Report.xlsx` from the desktop / `client-inputs/aberdare/`.
5. Confirm: **940 suppliers loaded successfully**, reporting entity **ABFI**, source total ≈ **R5.38bn**.
6. Click **Review import details** — show Import = Y spend vs Import Spend Exempt Value, and explain that eligible TMPS is source − imports with credit/reversal lines currently excluded (difference ≈ R67.2m vs simple source-minus-import).
7. Optionally open **How was this calculated?** for the plain-language breakdown.
8. Search a major Level 1 supplier (or use **Try an example: Level 1 → Non-Compliant**).
9. Open **Test change** → set Non-Compliant → **Apply change**.
10. Show **Current position** unchanged vs **Projected scenario** changed; confirm displayed impact matches rounded scores (e.g. 25.43 − 27.05 = −1.62).
11. Click **Undo last change**, then apply another change (e.g. import reclassification).
12. Open **Procurement Scenario Summary** (not Code 400).
13. **Reset scenario**, then **Back to workspace** → **Open Formal Assessment**.
14. Confirm the existing REAP assessment flow still works.

## What language to use

- “This is a client-configured demonstration workspace.”
- “Live Procurement helps you test monthly supplier changes immediately.”
- “Formal Assessment remains REAP’s structured scoring and reporting process.”
- “Imported spend is excluded provisionally using the Import column — we need your confirmation before locking the rule.”
- “Two credit or reversal lines were detected; the provisional calculation currently excludes them from eligible spend until Aberdare confirms treatment.”
- “Points shown use REAP’s existing procurement calculation service.”
- “The impact figure is the difference between the rounded current and projected scores you see on screen.”

## What not to claim

- Do not say Code 400 is complete or reproduced.
- Do not say provisional import treatment is verified with Aberdare.
- Do not say the overall company B-BBEE level from procurement alone.
- Do not say this replaces the Formal Scorecard.
- Do not say raw data is permanently stored in the product for Aberdare yet.

## Questions to confirm with the client

1. Does Import = Y identify every imported supplier?
2. Should all spend for Import = Y suppliers be excluded?
3. Why is imported supplier spend different from Import Spend Exempt Value?
4. What does placeholder value “6” mean in categorical fields?
5. Is this report monthly or cumulative year-to-date?
6. How should credit notes and negative spend be handled?
7. Should supplier credit notes and negative spend reduce eligible procurement spend, or should they be excluded from the procurement denominator?
8. Should Spend Exempt and Local Spend Exempt Val affect TMPS?
9. How should expired or missing certificates be treated?
10. Can Aberdare provide the matching Code 400 summary for this report?
11. Should each monthly upload replace the previous position or create a historical version?
12. Should scenarios be saved permanently?
13. Which users need access?
14. Do scenarios require approval?
15. Should an approved scenario feed into the formal REAP assessment?

## Exact reconciliation questions

Bring these numbers into the conversation:

- Source spend: **R5,377,124,451.21**
- Explicit Import = Y: **33 suppliers / R596,773,734.27**
- Source minus import: **R4,780,350,716.94**
- Provisional eligible TMPS (negatives currently excluded): **R4,847,568,962.96**
- Difference explained by credit/reversal absolute total: **R67,218,246.02**
- Import Spend Exempt Value: **R499,962,148.65**
- Import spend vs exempt difference: **≈ R96.8m** requiring confirmation
- Displayed scenario example arithmetic: **27.05 → 25.43 = −1.62** points

## How to reset the demonstration

1. **Reset scenario** — clears overrides only.
2. **Replace report** — re-upload if needed.
3. **Clear session data** — clears in-browser session state.
4. Refresh the browser tab as a hard reset before the next viewer.
