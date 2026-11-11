# REAP design rules

Read this before any UI change. **UI work is UI only**: no change to
calculations, scoring, Supabase queries, API routes, schema or data unless the
task says so. If a design needs data no existing function provides, leave a
marked placeholder and say so; do not write a new query.

Where the look comes from: `design-refs/NOTES.md` (Keel, Wstack, Compliance
Cards, FinTrack, Untitled UI). Where the values live: `src/app/tokens.css`.
Where the parts live: `src/components/ui/` (one of each; never make a second).

## The 24 rules

| # | Rule | How the code keeps it |
|---|---|---|
| 1 | Skeletons shaped like the real content, no layout shift. No full-page spinners. | `Skeleton`, `SkeletonText` at the real sizes; every `loading.tsx` mirrors its page. |
| 2 | Under 300ms show no loader. | `.reap-delay-show` on loading screens; `useDelayedFlag` in buttons. |
| 3 | Buttons press instantly; over 300ms, spinner inside the button, width unchanged. | `Button loading` / `PendingSubmitButton`: label stays in the layout, invisible. |
| 4 | Optimistic UI for UI-only state; toast and roll back on failure. | Theme, sort, tabs change at once. Never optimistic on stored data. |
| 5 | Prefetch routes on link hover. | `next/link` (prefetches in view in production). Use `Link`, never `<a>` for app routes. |
| 6 | Uploads show filename, progress bar, then a tick. | Upload screens (phase 4+). |
| 7 | One primary action per screen. | `variant="primary"` once per page; everything else secondary or ghost. |
| 8 | Tabular numbers everywhere, right-aligned in tables, 2 dp for points. | `body { font-variant-numeric: tabular-nums }`; `Td align="right"`; `formatPts`. |
| 9 | A number never stands alone: always "of X" or a delta. | `formatPointsOf` → "7.25 of 25"; `StatTile aside`; `DeltaPill`. |
| 10 | One status vocabulary and colour set. | `Chip`: four tones only (neutral, progress, attention, success), 22px, 6px dot. Same words as /companies (`fullScorecardStatus`). |
| 11 | Grey labels, dark values, max 3 text sizes per card. | `text-label` / `text-value`; `CardLabel` is the only label style. |
| 12 | Generous whitespace; remove before you shrink. | 24px card padding, 16–24px gaps. Cut content before reducing size. |
| 13 | Empty states say what to do plus one button. | `EmptyState title + action`. |
| 14 | Errors say how to fix, in plain words. | `Notice tone="bad"` with the fix in the body and the place to fix it in `action`. |
| 15 | Truncate long text with ellipsis and full text on hover. | `truncate` + `title={full}`. |
| 16 | Hover, focus-visible, pressed, disabled on everything clickable. | Built into `buttonStyles`, `Row interactive`, `StatTile href`, menus. |
| 17 | Browser tab title matches the page. | `export const metadata = { title }` on every page. |
| 18 | Fixed sizes for charts and images, no shift. | `ElementBar` is 10px; logos get width/height. |
| 19 | One date format (06 Oct 2026) and one money format (R 1 250 000). | `formatDate`, `formatMoney` in `components/ui/format.ts`. |
| 20 | Toasts only for things not otherwise visible. | `useToast` for background results; inline messages for everything else. |
| 21 | Key figures use Number Flow: the real value on first paint, digits roll on change, no motion under reduced motion. Sections fade up 8px once on first load (40ms stagger, 200ms), never on the way back. | `Num` (`@number-flow/react`), `Reveal`. |
| 22 | "Updated X ago" on data sections. | `Card updated` / `RelativeTime`. |
| 23 | Cmd+K palette, Esc closes, Enter submits. | `CommandPaletteProvider` in the app shell. |
| 24 | Remember last tab, filters and scroll. | `Tabs rememberAs`, `useSortedRows(…, rememberAs)`. |

## Tokens (src/app/tokens.css)

- **Colour**: never a hex, rgb, oklch or Tailwind palette class (`bg-slate-100`,
  `text-white`) in a component. ESLint (`reap/no-raw-colours`) fails the build.
  Files that predate the rule are in `eslint-rules/legacy-colour-files.mjs`;
  that list only shrinks.
- **Text**: `text-ink`/`text-value` (values), `text-label` (grey labels),
  `text-subtle` (lighter grey, meta only). All ≥ 4.5:1.
- **Status**: `bg-{tone}-soft text-{tone}` for neutral, progress, attention,
  success (chips). `danger` is for error messages only, never a chip.
- **Elements**: `el-own` deep teal, `el-mc` sea green, `el-skills` sage,
  `el-esd` ochre (+ `el-esd-pp`, `el-esd-sd`, `el-esd-ed`), `el-sed` clay.
  ≥ 3:1 on white (the `-on-teal` set ≥ 5.3:1 on teal), distinct under colour-blindness
  simulation. Re-check with a script if you change one.
- **Type**: Public Sans for everything; Source Serif 4 only for page titles
  (`text-page-title` 32/40, 500), the hero sentence (`text-sentence` 26/32)
  and the score (`text-score` 72/1). Body `text-body` 14/20, meta `text-meta`
  13/18 grey. Card labels: `CardLabel` (`text-caps` 11px, uppercase, 0.08em,
  600, grey); capitals nowhere else. Older screens keep 12/14/16/18/22/28/40/56.
- **Card**: `CARD_FRAME` = white, 14px radius, 1px teal 8% border, `shadow-card`
  (two teal layers + 1px white inner top highlight), 24px padding. Clickable:
  `CARD_INTERACTIVE` (border to teal 16%, lift 1px, 150ms). Nothing else moves.
- **Buttons**: Texture buttons (`buttonStyles`): 36/40px (44 on phones),
  radius 10, 14px medium, 16px icons, press sinks 1px, 2px teal focus ring
  with 2px offset.
- **Icons**: Lucide only, drawn at 1.5 stroke (globals.css), 16 or 18px.
- **Radius**: 6 (`rounded-sm`), 10 (`rounded-control`), 14 (`rounded-card`), full.
- **Shadow**: `shadow-card` (cards), `shadow-pop` (menus, dialogs), `shadow-btn-*` (buttons).
- **Motion**: 150ms / 200ms ease-out, transform and opacity only. Reduced motion respected globally.
- **Layout**: 12-column grid, max width 1200, 24px gaps, page padding 40px
  (16px on phones), 32px between sections, 64px top bar, 56px table rows,
  44px touch targets.

## One theme

Light only, REAP brand. Dark mode was built in pass 1 and rejected by the
owner; it was removed completely (no switch, no `dark:` variants, no dark
token values, no next-themes). Do not reintroduce it.

## Components (src/components/ui)

Button · Chip · Card (+ CardLabel, CARD_FRAME, FactList, MoreOptions) · StatTile ·
Num (Number Flow) · Reveal · PartitionBar ·
Input / Select / Textarea / FieldShell · Table / THead / Th / TBody / Row / Td
(+ SortHeader, useSortedRows) · EmptyState · Skeleton · Toast · Dialog · Tabs ·
Tooltip · DropdownMenu · CommandPalette · RelativeTime · format.ts.

Scorecard visuals: `src/components/scorecard/ScoreHero.tsx` (teal hero with
the Partition Bar), `AreaTiles.tsx`, `ElementBar.tsx` (compact, area pages).
