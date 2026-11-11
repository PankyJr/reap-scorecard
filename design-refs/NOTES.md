# Reference study: what REAP clones from each shot

Captured 2026-11-11 at 1440x900 with headless Chromium (Puppeteer; Playwright
is not installed in this repo). Files in this folder:

| Shot | Page capture | Full-size shot images |
|---|---|---|
| Keel | **blocked** (Dribbble served a bot check; not circumvented) | none: Panky's written notes used |
| Wstack | `wstack-page.png` | `wstack-1.png` … `wstack-4.png` |
| Compliance Cards | `compliance-page.png` | `compliance-1.png` |
| FinTrack | `fintrack-page.png` | `fintrack-1.png` |
| Untitled UI | `untitled-page.png` | `untitled-1.jpg` (`-2` is the same file) |

Dribbble shots are drawn at 2x. Every px below is the **1x CSS size**, measured
off the 2x image and halved, then rounded onto our scale (4px grid; type scale
12/14/16/18/22/28/40/56).

---

## 1. Keel (from written notes; dark-mode reference)

| Thing | Clone as |
|---|---|
| Card label | 12px, uppercase, `letter-spacing: 0.06em`, weight 600, label grey. Sits 0px above the card's top padding. "TOTAL BALANCE" → our "B-BBEE SCORE · {company} · {year}". |
| Big number | Top-left of card, directly under the label with 12px gap. Serif 56px for the score (our choice; Keel is sans). |
| Delta pill | Under the number, 8px gap. 12px text, 2px × 8px padding, full radius, success-soft bg + success text. Omitted when no previous value exists. |
| "Updated 2 min ago" | 14px label grey under the page title, 4px gap. |
| Budget card | "71% used": big figure (28px) then ONE horizontal stacked bar, segments in category colours; legend rows under it: 8px dot · name (14px value colour) · amount right-aligned (14px, tabular). Rows 32px tall, no dividers. |
| Pending approvals | Header "PENDING APPROVALS · 3 AWAITING YOU" in the card-label style. Inner items: 1px border, 10px radius, 16px padding; amount/title 14px semibold, grey sub-line 12–14px ("Due in 2 days"), quiet secondary "Review" button (32px tall, border only). |
| Dark mode | Surfaces near-black (page ≈ #0B0F0F, card ≈ #121717), 1px borders one step lighter than the card (≈ #222A2A), **no shadows**. |

## 2. Wstack (`wstack-1.png`, `wstack-2.png`)

| Thing | Measured | Clone as |
|---|---|---|
| Card label "Overview" | ~16px regular, mid grey, sentence case | Replaced by our Keel uppercase label (one label style app-wide). |
| Hero sentence | "Momentum is on your side": ~40px/1.05, two lines, tight tracking, near-black | Serif **28px**, line-height 1.2, max 2 lines, value colour. |
| Supporting line | ~16px grey, 8px under the headline | 16px label grey, 8px gap. |
| The big number | "92%" ~64px, the visual centre of the card | Score in serif **56px**, followed by "of {max}" in 18px grey on the same baseline. |
| Card padding | ~24px all round (48px at 2x) | 24px. |
| Card radius | ~16px | 14px (our large radius). |
| Page bg vs card | Pale warm grey page (#F2F2F2-ish), white cards, no visible border, very soft shadow | Page #F4F6F5, white card, 1px hairline border + one very soft shadow. |
| Gaps between cards | ~12px | 16px (desktop 24px between rows). |
| NOT cloned | gradient blobs, the arc of verification steps, glow | — |

## 3. Compliance Cards (`compliance-1.png`)

| Thing | Measured | Clone as |
|---|---|---|
| "42% Ready" | ~28px medium, value colour | 22–28px semibold sans: "{earned} of {available} points". |
| Thin bar | 8px tall, fully rounded, 4px gaps between segments, grey track for the rest | **10px** tall (brief), full radius on the outer ends, **2px** gaps, grey track = remainder. |
| Bar → legend gap | ~16px | 16px. |
| Legend (inline) | 10px dot · "57 Ready" 16px, 16px between items | Our legend is rows (Keel) but each row starts with a **8px dot**, 12px gap to the name. |
| Stacked mini-bar card | 4 segments + dot list (298 Passing…), delta "+9% This week" right-aligned in green | The dot list pattern for NEEDS YOU sub-lines; delta pill colour = success. |
| Tooltip | Dark slate (#2B2F3A-ish) bg, 8px radius, 16px padding; top row: big value (18px) left + date (12px uppercase) right; 1px divider; then 2 lines each with a dot + "66 ready". Light text. | Our tooltip: `--tooltip-bg` near-black teal, 10px radius, 12px × 14px padding; row 1 "Skills development" (14px semibold) + "11.20 of 25" right; divider; rows with dot: Earned / Available / Shortfall; optional one-line fix in 12px grey. |
| Full-width primary button | "749 Tests to fix ›": full card width, 48px tall, 8px radius, centred label + chevron | "See all {n} ›" full-width primary at the bottom of NEEDS YOU, 44px tall, 10px radius. |
| Card radius / padding | ~16px radius, ~32px padding | 14px radius, 24px padding. |

## 4. FinTrack (`fintrack-1.png`)

| Thing | Measured | Clone as |
|---|---|---|
| Progress line | "**$5000.00** spent of $9000.00": value bold, rest regular, 16px | "**{x}** of {y}" pattern everywhere a number appears (rule 9). |
| Thick bar | ~10px, fully rounded, % right-aligned outside the bar | The compact ElementBar uses the same: bar then % / "of" at the end. |
| Table header | 16px semibold, with a small up/down chevron pair (12px) after the label | 12px uppercase label-grey headers (Keel label style) + 12px `ChevronsUpDown` icon; active sort shows a single up or down arrow. |
| Row divider | **dashed** 1px light grey | `border-dashed` hairline between rows (not after the last). |
| Row height | ~56px with a two-line cell (title + sub-line) | 56px rows; first cell title 14px semibold + 12px grey sub-line. |
| Status chip | Soft bg + darker text, full radius, ~14px text, 4px × 10px | 12px medium, 2px × 8px, full radius, soft bg + dark text from the status pairs. |
| NOT cloned | green gradient credit-card tiles, bar chart | — |

## 5. Untitled UI (`untitled-1.jpg`, `untitled-page.png`)

| Thing | Measured | Clone as |
|---|---|---|
| Borders | 1px hairline (#E9EAEB-ish) on every card and control, nothing heavier | 1px `--line` everywhere; no 2px borders. |
| Card radius | ~12px | 14px cards / 10px controls / 6px chips-inner. |
| Number tile | Label "New customers ⌄" 14px grey with a tiny 12px chevron; number 30px bold below (12px gap); delta "+4.2%" 14px grey **right-aligned on the number's baseline**; 20px × 24px padding | `StatTile`: label 14px grey (+ optional chevron), value 28px semibold tabular, sub/delta 14px grey right-aligned on the same row. 20px padding. |
| Secondary button | "Export CSV": icon 16px + label 14px semibold, 1px border, white bg, 40px tall, 8px radius, 14px horizontal padding | `Button variant="secondary"`: same, 40px tall (44px touch target on mobile via min-height). |
| Dropdown menu | White, 1px border, soft shadow, 8px inner padding, rows 40px with 16px icon + 14px label, hover = grey fill radius 6px; section label "SWITCH ACCOUNT" 12px uppercase grey | User menu + theme switch use exactly this. |
| Overall | Nothing shouts: one weight of grey, only the numbers are dark. | Grey labels, dark values, max 3 text sizes per card. |

---

## What each REAP component takes

| REAP component | Keel | Wstack | Compliance | FinTrack | Untitled |
|---|---|---|---|---|---|
| `Card` | uppercase label, "Updated X ago" | padding, white on soft page | — | — | hairline border, radius |
| `ScoreHero` | label + big number + delta pill | sentence headline + giant number | — | — | — |
| `ElementBar` | single stacked bar + legend rows | — | 10px rounded bar, 2px gaps, dots, dark tooltip | "x of y" line | — |
| NEEDS YOU card | pending-approvals inner cards + "Review" | — | full-width primary button | — | — |
| `Table` | — | — | — | sortable headers, dashed dividers, soft chips, 56px rows | hairline frame |
| `StatTile` | — | — | — | — | the tile, verbatim |
| `Button` secondary/ghost | quiet "Review" | — | — | — | icon + label, border only |
| `Tooltip` | — | — | dark tooltip | — | — |
| Dark theme | near-black, lighter borders, no shadow | — | — | — | — |
