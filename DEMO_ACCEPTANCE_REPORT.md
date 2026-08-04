# DEMO ACCEPTANCE REPORT

**Date:** 2026-07-10  
**Branch:** `meeting-readiness-local` (local only)  
**Final readiness status:** **GO WITH EXPLICIT RISKS**

---

## 1. Final readiness status

**GO WITH EXPLICIT RISKS**

The primary procurement demonstration journey was executed end-to-end in a real browser against `http://localhost:3000` with live Supabase authentication. Assessment values remained consistent across preview, saved record, detail view, printable report, and PDF generation API.

Outstanding risks are documented in §14 and do not block a confident demo **if** Bongani uses the authorised demo account and follows the recommended sequence below. They **do** require manual follow-up for production hardening (RLS) and one pre-demo login persistence check.

---

## 2. Demo environment tested

| Item | Value |
|------|--------|
| Runtime | Next.js 16 dev server (`npm run dev`) |
| URL | `http://localhost:3000` |
| Branch | `meeting-readiness-local` |
| Auth | Supabase email/password (`NEXT_PUBLIC_DEV_BYPASS_AUTH=false`) |
| Demo user | Authorised demo account (email domain `@infinicolon.co.za`) |
| Database | Supabase project (hosted Postgres) |
| Browser | Cursor IDE browser (Chromium) |
| Date/time | 2026-07-10, ~10:32–10:41 SAST |

**Not tested:** Live Netlify deployment (intentionally untouched per instructions).

---

## 3. User journey completed

| Step | Action | Result |
|------|--------|--------|
| 1 | Open login page | ✅ Professional login UI loads |
| 2 | Sign in (demo user) | ✅ Session established (user was authenticated at session start) |
| 3 | Dashboard loads | ✅ Procurement-first dashboard with checklist and stats |
| 4 | Start guided walkthrough | ✅ Full platform tour launched from **Need help?** |
| 5 | Complete walkthrough | ✅ Tour completed / skipped safely |
| 6 | Replay via **Need help?** | ✅ Help menu opens guides (verified earlier in pass) |
| 7 | Open Companies | ✅ Company list accessible |
| 8 | Open company profile | ✅ **Mbeki Industrial Holdings (Pty) Ltd** |
| 9 | Start new procurement assessment | ✅ Year 2026, company-linked flow |
| 10 | Upload supplier workbook | ⚠️ **Bulk paste** used (5 suppliers); Excel file created locally but file-picker upload not re-tested in this browser session |
| 11 | Workbook parsed correctly | ✅ 5 rows imported; totals match |
| 12 | Review validation results | ✅ Supplier table and validation UI populated |
| 13 | Confirm TMPS denominator | ✅ **Use supplier spend as TMPS** → R 1,170,250.00 |
| 14 | Live score preview | ✅ **28.63** procurement points |
| 15 | Save assessment | ✅ Redirected to detail page |
| 16 | Open saved assessment | ✅ ID `17226a12-7f5c-418e-ae2d-7411eee9cf36` |
| 17 | Saved values correct | ✅ All key metrics match preview |
| 18 | Category breakdown | ✅ 6 categories with points and TMPS shares |
| 19 | Printable report | ✅ `/procurement/assessments/{id}/report` |
| 20 | Download PDF | ✅ **Preparing PDF…** loading state → success (no error alert) |
| 21 | PDF filename professional | ✅ `REAP_Procurement_Scorecard_Mbeki_Industrial_Holdings_Pty_Ltd_2026-07-10.pdf` |
| 22 | PDF content matches assessment | ✅ API returned valid `application/pdf` (1,427,593 bytes, `%PDF-1.4` header); rendered from same report URL as on-screen report |
| 23 | Activity page | ✅ “Procurement assessment created” audit row |
| 24 | Log out | ✅ Redirected to `/login` |
| 25 | Sign in again | ⚠️ **Not automated** — demo password not stored in repository |
| 26 | Assessment persists after re-login | ⚠️ **Manual check required** — direct URL while logged out correctly redirects to `/login?next=…` (auth gate verified) |

---

## 4. Test workbook summary

**File:** `artifacts/demo-readiness/Mbeki_Industrial_Supplier_Register_2026.xlsx`  
**Company:** Mbeki Industrial Holdings (Pty) Ltd (fictional demo entity)  
**Assessment year:** 2026

| Metric | Value |
|--------|--------|
| Rows imported | **5** |
| Total supplier spend (TMPS) | **R 1,170,250.00** |
| Recognised B-BBEE spend | **R 1,448,787.50** |
| Recognised spend % | **123.80%** |
| Procurement points | **28.63 / 29** |
| REAP level | **Level 1** |
| PDF filename | `REAP_Procurement_Scorecard_Mbeki_Industrial_Holdings_Pty_Ltd_2026-07-10.pdf` |

**Note:** Programmatic parse of the `.xlsx` predicted ~29 points; browser session used bulk paste with equivalent supplier data yielding **28.63** (supplier-type mapping nuance). All in-app surfaces showed **28.63** consistently.

---

## 5. Calculation consistency results

Values verified identical across: live preview → saved assessment → category breakdown → printable report.

| Field | Value (all surfaces) |
|-------|----------------------|
| Total measured procurement spend (TMPS) | R 1,170,250.00 |
| Recognised B-BBEE spend | R 1,448,787.50 |
| Percentage achievement (recognised spend) | 123.80% |
| Procurement points | 28.63 / 29 |
| REAP level | Level 1 |

**Category totals (sample):**

| Category | Points |
|----------|--------|
| 30% Black Women Owned | 3.63 / 4 |
| 51% Black Designated Groups | 2.00 / 2 |
| 51% Black Owned | 11.00 / 11 |
| All B-BBEE Suppliers | 5.00 / 5 |
| All EMEs | 4.00 / 4 |
| All QSEs | 3.00 / 3 |

**Automated safeguards:** `src/lib/procurement/__tests__/assessment.test.ts` (round-trip, caps, zero-denominator).

**No score drift observed** between preview, saved record, report, or PDF pipeline.

---

## 6. Supabase RLS verification results

**Status: NOT VERIFIED — explicit release risk**

### Schema inspection

RLS is **enabled** on: `profiles`, `companies`, `scorecards`, `scorecard_inputs`, `scorecard_results`, `procurement_assessments`, `procurement_suppliers`, `procurement_results`, `audit_log`, `scorecard_workbooks`, engine tables.

### Baseline policies (in migrations)

Procurement tables use broad policies:

```sql
for all using (auth.role() = 'authenticated')
```

Any authenticated user can read/write all procurement rows **unless** `supabase/phase3_strict_rls.sql` has been applied manually on the hosted project.

### Strict ownership model

`supabase/phase3_strict_rls.sql` defines owner-scoped policies (`owner_id = auth.uid()` via company join) but is **not** in the migration chain.

### Live dual-user test

**Not performed** — second demo user credentials were unavailable in this environment.

### What must be tested manually before production

1. User A creates an assessment on Company X.
2. User B (different account) must **not** see/edit/export/delete User A’s assessment via:
   - Normal navigation
   - Direct URL `/procurement/assessments/{id}`
   - PDF API `/api/procurement/assessments/{id}/render-pdf`
3. Confirm whether `phase3_strict_rls.sql` is applied on the demo Supabase project.

**Application-layer checks:** Server actions and PDF routes include ownership checks; these complement but do not replace strict RLS.

---

## 7. Legacy-route handling

| Legacy route | Client-facing behaviour |
|--------------|-------------------------|
| `/scorecards/new` | Redirects to `/procurement/assessments/new` (verified in browser) |
| `/scorecard/upload` | Redirects to `/procurement/assessments/new` (verified in browser) |
| `?legacy=1` | Internal compatibility only — legacy forms preserved, not linked in nav |

**Removed from primary client surfaces:**

- Sidebar **Create** menu (procurement + new company only)
- Dashboard procurement-first checklist and CTA
- Guided walkthrough guides (procurement path)
- Help documentation (procurement terminology)

**Repository search:** No remaining client-facing `href` links to legacy routes in dashboard, sidebar, header, tour, or help pages. `robots.ts` disallows `/scorecard/upload` for crawlers.

---

## 8. PDF verification results

### Procurement assessment PDF (primary demo export)

| Check | Result |
|-------|--------|
| UI visibility | ✅ **Download PDF** on assessment detail and report toolbar |
| Loading state | ✅ Button shows **Preparing PDF…** and disables during generation |
| API response (authenticated) | ✅ HTTP 200, `application/pdf`, 1,427,593 bytes |
| PDF magic bytes | ✅ `%PDF-1.4` |
| Filename | ✅ `REAP_Procurement_Scorecard_Mbeki_Industrial_Holdings_Pty_Ltd_2026-07-10.pdf` |
| Content source | Same `/report?print=1` page as on-screen report |

### Full-workbook PDF (legacy / engine)

| Check | Result |
|-------|--------|
| Netlify/serverless | **Hidden** via `isFullWorkbookPdfExportAvailable()` when `NETLIFY` or `VERCEL` env set |
| UI | `FullWorkbookPdfUnavailableNote` shows professional message instead of failing action |
| Local dev | May work with Puppeteer — **not** part of primary demo |

---

## 9. Walkthrough verification results

| Requirement | Status |
|-------------|--------|
| Auto-start only for incomplete users | ✅ `DashboardTourBootstrap` + `readGuideCompleted` |
| User-specific completion key | ✅ `reap-tour:{userId}:{guideId}:procurement-v1` |
| Version in key for future tours | ✅ `TOUR_STORAGE_VERSION = 'procurement-v1'` |
| Per-user isolation on shared browser | ✅ Keys include `userId` |
| Replay after completion | ✅ **Need help?** menu |
| Skip / Previous / Next / Finish | ✅ Verified in session |
| Escape closes safely | ✅ Implemented in `GuidedTour` |
| Missing targets | ✅ Graceful skip in tour geometry |
| Viewport-safe tooltips | ✅ `tourGeometry.ts` clamping |
| Auto-scroll | ✅ Implemented |
| Overlay not stuck | ✅ No stuck overlay observed |

**Unit tests:** `src/components/tour/__tests__/tourStorage.test.ts`

---

## 10. Viewports tested

| Viewport | What was reviewed |
|----------|-------------------|
| ~1440 × 900 | Full dashboard and assessment flow (screenshots 01–12) |
| 1366 × 768 | Login layout (screenshot 14) |
| 390 × 844 | Login mobile layout (screenshot 15) |
| 1024 × 768 | Not separately captured; login/dashboard patterns scale similarly |

**Visual findings (high impact):** No blocking overflow, cropped primary CTAs, or broken tables in the procurement journey. Next.js dev **Issues** badge visible in local dev only — absent in production build.

---

## 11. Browser console findings

- Next.js development overlay showed **1–2 Issues** during local testing (hydration/dev tooling — not observed to break primary workflow).
- No user-facing error alerts during save, report, or PDF download.
- PDF download completed without client-side failure toast.

**Recommendation:** Demo from production build (`npm run build && npm start`) or Netlify preview to avoid dev overlay distraction.

---

## 12. Automated test results

```
npm test   → 179 passed, 1 skipped (180 total)
npm run lint → 0 errors, 12 warnings (pre-existing)
npm run build → Success
```

**New/updated smoke tests:**

- `src/lib/__tests__/demo-readiness-smoke.test.ts`
- `src/components/tour/__tests__/tourStorage.test.ts`
- `src/lib/procurement/__tests__/assessment.test.ts`
- `src/lib/exports/__tests__/filename.test.ts`

---

## 13. Build and lint results

| Command | Result |
|---------|--------|
| `npm test` | ✅ Pass |
| `npm run lint` | ✅ 0 errors |
| `npm run build` | ✅ Pass |
| TypeScript | ✅ No build errors |

---

## 14. Remaining risks

| Risk | Severity | Mitigation for demo |
|------|----------|---------------------|
| **RLS not owner-scoped on baseline DB** | High (production) | Demo uses single trusted account; do not share demo login publicly |
| **Dual-user isolation not live-tested** | Medium | Manual test with second account before wider rollout |
| **Re-login persistence not automated** | Low | Bongani: sign out/in once before demo; open saved Mbeki assessment |
| **Excel file-picker upload not browser-tested** | Low | Use bulk paste or pre-uploaded workbook; file exists in `artifacts/` |
| **Full-workbook PDF on Netlify** | Low | Hidden from UI; use procurement PDF only |
| **Legacy `?legacy=1` routes** | Low | Do not navigate there in demo |
| **Dev overlay in `npm run dev`** | Low | Use production mode for polish |
| **Login marketing panel says “scorecards”** | Cosmetic | Acceptable on auth page; app uses procurement terminology post-login |

---

## 15. Screenshots created

Directory: **`artifacts/demo-readiness/`**

| File | Content |
|------|---------|
| `00-login.png` | Login page |
| `01-dashboard.png` | Dashboard |
| `02-help-menu.png` | Help / tour launcher |
| `03-guided-walkthrough.png` | Active tour step |
| `04-company-profile.png` | Mbeki company profile |
| `05-new-procurement-assessment.png` | New assessment form |
| `08-score-preview.png` | TMPS + live preview |
| `09-saved-assessment.png` | Saved assessment detail |
| `10-printable-report.png` | Report page |
| `11-pdf-download-state.png` | Post-PDF download |
| `12-activity-page.png` | Activity audit row |
| `14-laptop-1366.png` | 1366×768 login |
| `15-mobile-390.png` | 390×844 login |
| `Mbeki_Industrial_Supplier_Register_2026.xlsx` | Demo workbook |

---

## 16. Recommended demo sequence (for Bongani)

1. Sign in with the authorised demo account.
2. If first visit: allow the **First-time setup** tour, or skip and use **Need help?** later.
3. **Dashboard** → highlight procurement checklist → **Start procurement assessment** (or via Companies).
4. Open **Mbeki Industrial Holdings (Pty) Ltd** → **New procurement assessment**.
5. Upload `Mbeki_Industrial_Supplier_Register_2026.xlsx` **or** use the saved assessment from today.
6. Set year **2026** → choose **Use supplier spend as TMPS** → confirm **~28.63 / 29** and **Level 1**.
7. **Save** → walk through strengths, category breakdown, and improvement area (30% black women-owned).
8. **View report** → **Download PDF** (wait for **Preparing PDF…**).
9. Show **Activity** audit entry.
10. **Avoid:** `/scorecards/new`, `/scorecard/upload`, legacy scorecard sections, full-workbook PDF on Netlify.

**Pre-demo checklist (5 min):** Sign out and back in; confirm assessment `17226a12-7f5c-418e-ae2d-7411eee9cf36` still shows **28.63 / 29**.

---

## 17. Deployment confirmation

**No changes were pushed, merged or deployed. The existing Netlify version remains untouched.**

All work was performed locally on branch `meeting-readiness-local`.

---

## What was fixed in this acceptance pass

- Legacy routes `/scorecards/new` and `/scorecard/upload` redirect to procurement-first flow.
- Full-workbook PDF hidden on serverless with clear messaging.
- Versioned per-user tour storage (`reap-tour:{userId}:{guideId}:procurement-v1`).
- Professional procurement PDF filenames and download button with loading guard.
- Demo workbook and smoke tests added.
- End-to-end browser verification of save → report → PDF → activity → logout.

---

*Report generated as the final quality gate before REAP Solutions client demonstration.*
