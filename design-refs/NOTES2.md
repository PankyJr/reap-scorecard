# Reference study, pass 2 (2026-11-11)

Captured with Puppeteer at 1440x900 (2x pixel ratio for the component
previews). Every 21st.dev page loaded; each preview was also opened directly
from its own frame (`cdn.21st.dev/...`) and its computed styles were read
(`v2/*-styles.json`), so the px below are measured, not guessed. Keel loaded
this time (pass 1 it served a bot check): `v2/keel-1.png` … `keel-5.png`.

| Reference | Capture | Code source |
|---|---|---|
| Texture Button (cult-ui) | `v2/texture-button-preview.png` | **Original library source**: `github.com/nolly-studio/cult-ui` `apps/www/registry/default/ui/texture-button.tsx` (saved as `v2/texture-button-source.txt`). Ported and restyled. |
| Number Flow | `v2/number-flow.png` | **npm `@number-flow/react`**, used as is. |
| Stats Bento (uilayout) | `v2/stats-bento-preview.png` | 21st page exposes only the usage file. **Rebuilt** from the preview + measured styles. |
| Partition Bar (8starlabs) | `v2/partition-bar-preview.png` | 21st page exposes only the demo (`v2/partition-bar-code.txt`, gives the API: `PartitionBar` / `Segment num` / `SegmentTitle` / `SegmentValue`). **Rebuilt** to that API. |
| KPI Tile (konsstepnov) | `v2/kpi-tile-preview.png` | 21st page exposes only the demo. **Rebuilt** from the preview + measured styles. |
| Stats 04 / 05 (shadcnui-blocks) | `v2/stats-04-preview.png`, `v2/stats-05-preview.png` | No code exposed. **Rebuilt** (tile proportions only). |
| Keel, Wstack, Untitled UI | `v2/keel-*.png`, pass-1 files | Feel and hierarchy only. |

## Texture Button (measured from source)

- Two layers. **Outer**: 1px border at black/10, a top-to-bottom gradient
  (`from-black/70 to-black`), `p-[1px]` so the gradient shows as a second
  bevelled edge, radius 12 (md) / 6 (sm). **Inner**: its own gradient
  (`from-neutral-800 to-black`), radius 10 (md) / 4 (sm), `px-4 py-2`, 14px.
- Secondary: outer `border-black/20 bg-white/50`, inner `from-neutral-100/80
  to-neutral-200/50`. Minimal: inner `from-white to-neutral-50/50`, hover
  flips the gradient upward.
- **What we copy**: the two-layer build (outer bevel 1px + inner face), the
  vertical gradient on both, the hover that darkens the face slightly.
- **Restyled to REAP**: primary outer `#0A4F54 → #042E31`, inner
  `#0B4E53 → #063B3F` with a white/14% 1px inner top highlight
  (`inset 0 1px 0`). Secondary = the "minimal" variant on white. Heights
  fixed at 36 (sm) / 40 (md), radius 10 outer / 9 inner, 14px medium.
  Press: `translate-y-px` and the highlight drops to 6%. No 300ms
  transitions (theirs): 150ms ease-out, per our motion rule.

## Number Flow

- `<NumberFlow value format={{ minimumFractionDigits: 2 }}>`: renders the real
  value on the server (no blank first frame), rolls digits on change, honours
  `prefers-reduced-motion` itself (`respectMotionPreference`, default true).
- Use on: the hero score, each area tile's achieved points, the companies
  table score. Tabular figures via the parent.

## Stats Bento feature card ("64%")

- Card 400×260, **padding 40px**, **radius 24px**, near-black background.
- Diagonal line texture: `repeating-linear-gradient(45deg, grey 0 1px,
  transparent 1px 10px)`, masked to the top-right corner and fading out.
- Label pill: **10px / 600 / letter-spacing 1px / uppercase**, white 60% on
  white 10%, padding 4×12, full radius.
- Number: **60/60, weight 400, letter-spacing -3px**, white.
- Supporting copy: **14/20, white 60%**, 40px under the number.
- **What we copy** into ScoreHero: the deep solid card with one corner of
  fine diagonal lines (ours ≤ 4% white), the uppercase pill-free label in white
  60%, the large light number with tight tracking, muted white copy. Radius
  becomes 14 and padding 24 (our card spec, not theirs). Number: serif 72/1
  per the brief.

## Partition Bar

- Bar **12px tall**, segments separate pills (each fully rounded) with a
  **~6px gap**; widths proportional (`flex-grow: num`).
- Under each segment: **title 14/20 600**, **value 11.2/16 400**, centred under
  its own segment. The non-primary segment is the same colour at 60%.
- **What we copy**: separate fully-rounded pills with gaps (not one bar with
  hairline gaps), legend under the bar. Ours: 8px tall on the teal hero,
  4px gaps, five area tints, and a remaining-points track at white 10%.
  Legend as a row of dot + name + "x of y" (titles under tiny segments would
  collide; ESD alone is 40 of 109).

## KPI Tile

- Tile **padding 16px**, **radius 14px**, border 1px `oklch(0.922)` (≈ #E5E5E5),
  shadow `0 1px 2px rgba(0,0,0,.05)`.
- Label **14/20 500 grey**; value **30/30 600, letter-spacing -0.75px**; a
  delta pill **12/16 500, padding 2×6, full radius, 10% tinted bg**; meta
  **12/16 grey**; sparkline at the bottom.
- **What we copy** for the 5 area tiles: label 13/18 grey (meta size), value
  600 tabular with tight tracking, "of 25" in grey beside it, a pill for the
  sub-minimum, a **4px** progress bar where their sparkline sits. Padding 24
  per our card spec (theirs 16 is too tight with our 14px radius).

## Stats 04 / 05

- 05: tiles 253×222, padding 28×24, radius 14, light grey fill, number
  48/48 500 tracking -0.48px, caption 20/28 at 80%.
- 04: one bordered strip split into cells by 1px vertical rules.
- **What we copy**: 04's idea that a row of equal tiles reads as one object
  (equal heights, aligned baselines); 05's large number then quiet caption.

## Keel (now captured)

- Near-black, but the **hierarchy** is what we take: small spaced uppercase
  labels ("TOTAL BALANCE", "PENDING APPROVALS · 3 AWAITING YOU"), one huge
  figure per card, "Updated 2 min ago" under the title, monospaced-feeling
  tabular figures, thin progress bars under rows, a single multi-colour
  budget bar with a legend, quiet bordered "Review" buttons, and the search
  pill with a ⌘K hint in the top bar.
- Not copied: the dark theme (rejected by the owner), the credit card.

## Wstack / Untitled UI (pass 1 captures)

- Wstack: sentence as headline, one huge number as the visual centre.
- Untitled UI: hairline borders, number tiles, quiet secondary buttons, the
  account menu.
