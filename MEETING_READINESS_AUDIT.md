# MEETING READINESS AUDIT

**Date:** 2026-07-10  
**Branch:** `meeting-readiness-local` (local only)  
**Scope:** REAP Scorecard platform — procurement-first client demonstration

---

## Current architecture

| Layer | Detail |
|-------|--------|
| Framework | Next.js 16 (App Router), React 19, TypeScript 5 |
| Package manager | npm |
| Auth | Supabase Auth (email/password + OAuth), middleware session refresh via `getUserSafe()` |
| Database | Supabase Postgres — companies, procurement assessments/suppliers/results, legacy scorecards, full workbook engine tables |
| Styling | Tailwind CSS v4, REAP brand accent `#063b3f` |
| Tests | Vitest — 174 tests (173 passing, 1 skipped) |
| PDF | Puppeteer + Sparticuz Chromium (procurement route serverless-ready) |
| Excel | `xlsx` for procurement import and full workbook export |

**Route groups**

- `(marketing)/` — public site
- `(auth)/` — login, reset password
- `(dashboard)/` — authenticated application (sidebar + header)
- `admin/` — internal REAP admins only
- Print/report routes outside dashboard layout for PDF generation

---

## Critical user journey (procurement)

1. Sign in → `/login`
2. Dashboard orientation → `/dashboard` (setup checklist + guided tour)
3. Add company → `/companies/new`
4. New procurement assessment → `/procurement/assessments/new`
5. Upload Excel or enter supplier rows + confirm TMPS
6. Live preview → validate mappings/issues
7. Save assessment → `/procurement/assessments/[id]`
8. Review score breakdown + REAP level
9. View report → `/procurement/assessments/[id]/report`
10. Download PDF → `/api/procurement/assessments/[id]/render-pdf`
11. Return via Companies or dashboard history

**Secondary paths (do not lead demo here unless requested)**

- Legacy manual scorecard → `/scorecards/new` (placeholder category math)
- Preview-only workbook parse → `/scorecard/upload`
- Persisted full workbook engine → `/scorecards/full/new`

---

## Existing failures / risks at audit time

| ID | Severity | Issue |
|----|----------|-------|
| R1 | P0 | Legacy scorecard PDF route lacked pre-flight ownership check |
| R2 | P0 | ESLint scanned `.netlify/**` build artefacts → 800+ false errors |
| R3 | P1 | Dashboard checklist promoted legacy `/scorecards/new` instead of procurement |
| R4 | P1 | Sidebar linked preview-only `/scorecard/upload` instead of persisted `/scorecards/full/new` |
| R5 | P1 | Procurement PDF used opaque filename (`Procurement-Scorecard-{id}.pdf`) |
| R6 | P1 | PDF download was a raw `<a href>` — no loading guard against double-click |
| R7 | P1 | First-time tour referenced legacy scorecard flow |
| R8 | P2 | Full scorecard PDF route uses local Puppeteer only (not Sparticuz) — Netlify risk if demo uses full workbook PDF |
| R9 | P2 | `phase3_strict_rls.sql` not in migrations — depends on deployment DB state |
| R10 | P2 | Legacy manual scorecard math is explicitly placeholder |
| R11 | P3 | Marketing newsletter stub, unused `profiles.role` column |

---

## High-risk areas

- **Calculation integrity:** Procurement formulas in `src/lib/procurement/assessment.ts` and `rows.ts` — protected by tests; not modified.
- **Database migrations:** Missing tables/columns surface user-friendly errors; no destructive migrations applied.
- **PDF on serverless:** Procurement PDF uses Sparticuz path; legacy/full PDF may fail on Netlify without local Chrome.
- **RLS:** Production data isolation depends on applied Supabase policies.

---

## Visual inconsistencies (pre-fix)

- Dashboard mixed legacy “scorecard” language with procurement portfolio metrics
- Help center described legacy scorecard creation first
- Dual workbook upload paths caused navigation confusion

---

## Functional gaps (pre-fix)

- No guided tour replay entry in header (now: **Need help?** menu)
- Upload area lacked max file size messaging and remove-file control
- Export filenames not client-branded

---

## Meeting-critical fixes (P0 / P1)

### P0 — fixed in this pass

- [x] Legacy scorecard PDF route now validates auth + company ownership before Puppeteer
- [x] ESLint ignores `.netlify/**` — `npm run lint` returns 0 errors

### P1 — fixed in this pass

- [x] Dashboard checklist + primary CTA aligned to procurement assessment flow
- [x] Sidebar workbook link → `/scorecards/full/new` with clear label
- [x] Professional guided walkthrough (tour system) with stable `data-tour` targets
- [x] Procurement PDF filename: `REAP_Procurement_Scorecard_{Client}_{YYYY-MM-DD}.pdf`
- [x] Client-side PDF download button with loading/disabled state
- [x] Upload UX: file size limit (15 MB), selected filename, remove file
- [x] Help center copy updated for procurement
- [x] Calculation safeguard tests added for procurement assessment engine

---

## Lower-priority improvements (P2 / P3)

| Priority | Item | Status |
|----------|------|--------|
| P2 | Unify full-scorecard PDF with Sparticuz browser launcher | Deferred — not demo-critical if showing procurement |
| P2 | Dashboard de-emphasise legacy scorecard stats | Partial — legacy section retained for existing data |
| P2 | Downloadable procurement Excel template in `/public` | Deferred — no official template file in repo |
| P3 | Marketing newsletter API | Deferred |
| P3 | Full engine scaffold gaps / discounting | Deferred — out of scope |

---

## Test / build baseline (pre-implementation)

- `npm test` — 167 passed (before new tests)
- `npm run build` — success
- `npm run lint` — failed on `.netlify/**` noise

---

## Demo data guidance

- Use existing production/staging Supabase data for the demonstration — **do not seed fake “Test Company” records into production**
- Local dev may use `NEXT_PUBLIC_DEV_BYPASS_AUTH=true` only in development
- Recommended: pre-create one polished company with a completed procurement assessment before the meeting
