# NOTES — Token Launch Radar (model radar-2)

## The model

`implied = TVL × category multiple × growth × maturity × staleness × chains`

- **Category multiple**: the median market-cap-to-TVL ratio of the snapshot's
  own live-token protocols in that category, when the category has at least
  three priced protocols; otherwise the global median. Measured from the
  sealed 2026-11-14 snapshot: **global median 0.2227** (128 live protocols
  with a positive market cap and TVL > 0). Category medians range from 0.006
  (Onchain Capital Allocator) to 2.205 (Cross Chain Bridge), clamped to
  [0.02, 2.5].
- **Growth**: `exp(0.30 · tanh(change_7d / 40))` — smooth, bounded, never lets
  one hot week dominate the value.
- **Maturity**: `0.55 + 0.45 · (1 − exp(−age / 540))` — rises with how long the
  protocol has run with no token and saturates; unknown age counts as 365 days.
- **Staleness**: 0.90 for protocols older than 900 days still shrinking, else 1.
- **Chains**: `1 + 0.04 · min(chains − 1, 5)`.
- No protocol is ever priced by its name. Names enter only the farm plans,
  and only through category, chain count, TVL tier and age.

## Separation of pre-token from live

A protocol counts as pre-token when its record carries no market cap.
Protocols with a market cap are never ranked; they are the calibration source
(`live`, 24 rows by market cap) and the per-category comparables the detail
view shows. A protocol that records no token is never said to have none —
its record may simply not carry one.

## Early rows

The board holds all 40 watchlist slugs plus 158 early rows (198 total). Early
rows follow the watchlist's own exclusions: no CEX, Bridge, Canonical Bridge,
Liquid Staking, Liquid Restaking or Restaked BTC categories; no versioned
names; no whole-word wrapped/staked/staking in names; no exchange-branded
names; only rankable pre-token protocols with TVL at or above the $50M floor
or below it as early finds (138 below the floor, 20 above it, measured
2026-11-18).

## Farm plans

Seven steps per protocol, built from category, chains, TVL tier and age only:
fresh wallet, a category action, a weekly qualifying action, a hold period
(60 days under 180 days old, 45 under a year, 30 after), a weekly points-page
check, a risk check matched to the protocol's shape (bridge, contract,
liquidation, unbonding), and a farm log. Capital tiers: $250 at $5B+ TVL,
$150 at $1B+, $100 at $100M+, $50 below.

## Validation (2026-11-18, kit snapshot)

- Board: **198 rows**, ranks exactly 1..198, implied value non-increasing,
  **40/40 watchlist slugs covered**, 158 early rows, top implied value
  $604,794,948 (steakhouse-financial), bottom $571,620. Zero farm-step
  violations (all 7 steps per row, 20–600 chars).
- Two runs of `main.ts` on the kit input produce **byte-identical**
  `board.json` and `data.js`.
- Dashboard source: **17,096 bytes** total (index.html 3,383 + app.css 3,736
  + app.js 9,977), under the 65,536-byte dossier text cap; the built dossier
  text is 17,360 bytes and holds all three files. No external URLs anywhere
  in the dashboard.
- Full pipeline tested in a scratch copy with three generated test PNGs:
  `board.json`, `data.js`, `dashboard/`, `screenshots/` and `dossier.json`
  (47,469 bytes) all written; `buildDossier` accepts the output.
- **Screenshots are the one gap**: this VM has no headless browser, so the
  three required screenshots (board, detail view, filtered view) could not be
  taken here. They must be taken from the built dashboard and placed in
  `screenshots/` as `1-board.png`, `2-detail.png`, `3-filtered.png` before
  submission. `main.ts` refuses to finish with fewer than three images, so
  the entry cannot be submitted accidentally without them.

## What was tried and dropped

- A flat 0.25 multiple for every protocol (the house model's approach):
  dropped — it prices a bridge and a lending protocol identically and says
  nothing about what the market actually pays per category.
- Including the 15 live protocols whose market cap is recorded as 0 in the
  calibration: dropped — a zero market cap is a data artifact, not a value;
  excluding them moves the global median from 0.169 to 0.2227.
- Putting farm steps only in `board.json` and regenerating them in the page:
  dropped — the dashboard's detail view reads them from `data.js`, so the
  page and the board can never disagree.
- Copying the kit starter's dashboard or model: never done. The starter was
  read for its wiring shape only; every line in this entry was written here.

## Files

- `main.ts` — entrypoint: reads the snapshot, scores, writes the board,
  `data.js`, copies `dashboard/` and `screenshots/`, writes the dossier.
- `lib/model.ts` — the model, the board builder, the farm plans, the checks.
- `vendor/makefun-board.ts` — kit-provided infrastructure (`buildDossier`),
  copied verbatim as RULES.txt requires; it is not this entry's own code.
- `dashboard/` — index.html + app.css + app.js, a static page, no network.
- `screenshots/` — the three screenshots (to be added before submission).
