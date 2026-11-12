# Reference notes — pass 4

How these were measured: each Dribbble shot was opened at 1440x900 with
Puppeteer, scrolled end to end, and its full-size images saved here. Most shots
are 1600x1200 or 2048x1536 exports of a design drawn at 2x, so the values below
are the measured pixels divided by the export scale (shown per shot). Values on
perspective-tilted mock-ups (Keel, Untitled settings-1) are approximate to ±1px.
Colours were sampled from flat areas; where a shot is dark-mode, the light-mode
equivalent we use is given in brackets.

Our mapping lives in `src/app/tokens.css`; this file is the evidence.

---

## MASTER — Halal Lab, Merchants analytics (26792875) · master-1..4.png · 2x

- Canvas behind the app: #F5F5F7. Sidebar sits directly on it, no border, 248 wide.
- Main panel: white, floats 8px from top/right/bottom, radius 16, 1px #EBEBEF.
- Panel padding 32; content max width ~1200.
- Page title 24/32 semibold, -0.01em, preceded by an 18px icon in grey. Subtitle 14/20 #6E6E73.
- Header actions right: secondary buttons 36 tall, radius 10, 1px #E3E3E8, white, 14 medium #1D1D1F.
- Metric: label 13 #6E6E73 + 14px arrow-up-right; number 28/34 semibold -0.02em; change 12 semibold green #1B9E55 / red, then "since last …" 12 #8A8A8E.
- Metric strip: 4 metrics divided by 1px #EBEBEF verticals, no card around each.
- Segmented control: track #F2F2F4, radius 10, 32 tall, 2px inset; selected pill white, radius 8, shadow 0 1px 2px rgba(0,0,0,.06), 0 0 0 1px rgba(0,0,0,.04); labels 13 medium.
- Sections separated by 1px #EBEBEF hairlines with 24–32 vertical rhythm; cards only for charts.
- Card: white, 1px #EBEBEF, radius 16, no shadow, padding 20–24.
- Table: no header fill; header 12 medium #8A8A8E; rows 52, dividers #F0F0F2.

## SCORE — Brownee, assessment scorecard (24010143) · score-1..4 · 2x

- Hero card: rings left (concentric, 5 tracks, stroke ~10 with 4 gap), outer diameter ~180.
- Track colour = ring colour at ~12% (we use #EEEEF1 neutral track to keep colours to the five).
- Right side: small grey eyebrow 13 #6E6E73; score 56/1 semibold -0.03em; "of N points" 14 grey baseline-aligned.
- Under it: two capsules 22 tall, 12 medium, tinted 10–12%.
- Area tiles below: equal height, radius 16, padding 20; small ring 40 with icon inside; % top right 13 medium grey; name 14 medium; value 16 semibold "x of y"; capsule; footer line with hairline top.

## SIDEBAR — Ace Design, light sidebar (16132164) · sidebar-1..3.png · 2x

- Light grey sidebar, no border, logo row 40 mark + 15–16 semibold name.
- Item rows: icon 16–20 grey, text 14–15 medium grey; active = darker text + filled icon (we use white raised pill + teal icon).
- Section labels small grey (theirs are uppercase; ours sentence case per brief: 12 medium #8A8A8E).
- Collapsed rail: same icons centred, ~64 wide, tooltip pill on hover to the right.
- User row at the bottom: avatar 28–40, name 14 semibold, role 13 grey.

## TILES — Untitled UI dashboard (27698019) · tiles-1..3.jpg · 2x

- Metric tiles: white, 1px #E9EAEB, radius 12–16, padding 20–24.
- Label 14 medium #535862 with a small chevron; number 28–30 semibold; change right-aligned 14 medium.
- Buttons: 40 tall, radius 8–10, 1px #D5D7DA, white, 14 semibold, leading 20px icon.
- Search field: 44 tall, radius 8, 1px #D5D7DA, 20px icon, placeholder #717680.
- Menu: radius 12, 1px #E9EAEB, shadow 0 12px 16px -4px rgba(10,13,18,.08); rows 40 tall, radius 8, hover #FAFAFA, 16px icons grey.

## TABLES — Shift Studio, file transfer (27640183) · tables-1..3.png · 2x

- Header row: light fill in theirs (#F4F5F7, radius 8) — brief says no header strip, so we keep only the text: 13–14 regular #1D1D1F at 2x → we use 12 medium #8A8A8E with ⇅ sort icon.
- Rows 56 at 2x-scale → 52 ours; dividers 1px #EFEFF1; cell text 14 regular.
- Progress bars inline: 160x8 at 2x (80x4) radius full, track #E3E3E6; ours 64x4 teal on #EEEEF1.
- Leading 28px round status icon (outline circle with tick/play).

## ACTIONS — Keel, pending approvals (27613545) · actions-1..3.png · 2x (dark)

- "Pending approvals · 3 awaiting you" card header; each item a row with amount, title 14 medium, grey sub-line 12–13 "Due in 2 days · requested by Ops", action button right.
- Recent activity: 8px status dot, title 14, sub 12 grey, amount right.
- Ours: 28px round tinted icon by type, title 14 medium, sub 13 grey, chevron; "See all n" as a plain teal button in the header.

## FORMS — Untitled UI general settings (23324443) · forms-1..3.jpg · 2x (dark)

- Two-column rows: label + helper on the left (~280 wide), field on the right (max ~512).
- Rows separated by 1px hairlines with 20–24 vertical padding.
- Inputs 44 at their scale → 40 ours, radius 8–10, 1px border, 16px text at their scale (14 ours), add-on prefix segment for URLs.
- Account menu: header with avatar 40, name 14 semibold, email 14 grey; rows 40 with 16 icons; dividers between groups.

## WIZARD — Ilias Miah, create form stepper (27353552) · wizard-1..3.jpg · 2x

- Title 28 semibold, subtitle 16 grey; stepper under it: 3 nodes 24px, connector 2px.
- Done = filled accent with white tick; current = white with 2px accent ring and 8px inner dot; upcoming = grey ring with grey dot.
- Labels under nodes 14: done/current medium dark, upcoming grey.
- Form card: white, radius 16, 1px #EDEDF0; inner group #FAFAFB radius 12, padding 20.
- Inputs 44 tall (2x 88), radius 8, 1px #E4E4E7, placeholder #8A8A8E. Cancel secondary + Next primary, 40 tall, radius 10.

## CHECKLIST — Never Before Seen, getting started (24356617) · checklist-1..4 · 2x

- Card with "Getting started" title 16 semibold, progress "2 of 5" + bar 4px tall full width.
- Items: 20px status circle (done = filled with tick, todo = 1.5px grey ring), title 14 medium, sub 13 grey; current item raised (white, shadow, radius 10).

## CHECKLIST 2 — Dmitry Sergushkin, progressive checklist (25543224) · checklist2-1..4.png · 2x

- Groups with a small coloured dot + group name 13 medium grey.
- Rows 56: status circle 20, title 14 medium, sub 13 grey, action button right (32 tall secondary).
- Progress bar at top: label "3 of 8 done" 13 grey left, 6px bar, radius full.

## ACTIVITY — Version history timeline (26274293) · activity-1..3.jpg · 2x

- Panel header "Activity" 18 semibold, 1px divider under.
- Entries: 32px round tinted icon by action type, vertical connector 2px #E4E4E7 between icons centred under them.
- Text: actor + target in #1D1D1F medium, verb in #6E6E73 regular, 15–16 at their scale (14 ours); time 13 grey beneath.
- Versions list: 40 square icon radius 8 with 1px border, title 15 medium, sub "Aug 20, 2024 · By Jane Cooper" 14 grey.

## SIGN-IN — Untitled UI password reset (19338417) · signin-1..3.jpg · 2x

- Settings: horizontal tabs, 14 medium, active underline 2px; section title 18 semibold + helper 14 grey; rows label left (~280) / field right (~512), hairlines between, actions bottom-right (Cancel secondary, primary dark).
- Inputs 44 at 2x → 40, radius 8, 1px #D5D7DA, shadow-xs.
- Password reset pattern: centred 360–400 column, 48 key icon in a bordered square, title 30/24 semibold, subtitle 16 grey, full-width primary 40–44, "Back to log in" quiet link with arrow.
