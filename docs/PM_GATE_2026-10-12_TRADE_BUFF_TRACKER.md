# PM Gate - Trade + Buff Tracker - 2026-10-12

## Status

**PRODUCT OWNER VALIDATED - RELEASE AUTHORIZED**

The Product Owner validated the final candidate in the live PokePixel client and explicitly
authorized **commit, push, merge and release** at 2026-10-12T19:23:13Z.

## Scope

### Trade

- no manual Trade resize and no outer Trade scrollbar;
- original native Confirm/Cancel nodes and handlers remain authoritative;
- Backpack-density offer/inventory slots;
- native Rarities remains the sole rarity control;
- Better UI Mais filtros uses conservative candidate-set filtering when an individual card
  identity cannot be proven, without positional guessing or cross-instance tag assignment;
- item quantity keeps the native prompt/validation/actions and adds the approved Max affordance.

### Buff Tracker / native strip

- the existing native .pokeidle-buff-strip, list, ticker, pills, timers and action handlers are
  reused rather than cloned;
- Tracker presentation adds title/count, collapse, free drag/persistence, Team HUD width alignment,
  player/event visual distinction and the explicit Better UI > Interface toggle;
- when Tracker is disabled, the free horizontal Menu Bar keeps the original native strip visible
  without taking ownership of its inline top/bottom;
- native BuffEffectsHUD.render() calls attach() every second and maintains native style.top;
  Better UI now applies only a scoped visual clearance custom property/margin;
- the existing central buff-strip observer scope recalibrates that presentation offset after
  native timer churn; no feature-specific MutationObserver was introduced.

## Exact live-validated functional candidate

The Product Owner validated the final functional bytes before release-only version metadata was
advanced:

- package/userscript version shown during live validation: 0.2.194;
- artifact: dist/pokepixel-better-ui.user.js;
- SHA-256: AC02A13C71CFD4870028A95CA814B013A2FDEBE91A11459CC58F12314E23F075.

Public v0.2.194 already existed from the 2026-10-09 Analyzer bridge release, so that release
identity is not reused. Repository completion advances release metadata only to **0.2.195**; the
validated Trade/Buff functional implementation is unchanged.

## Verification before release metadata bump

- focused Menu Bar / Buff / controls / registry / foundation set: **97/97 PASS**;
- full repository suite: **750/750 PASS**;
- native one-second writer regression: RED on the prior inline-geometry implementation, GREEN after
  switching to presentation-only clearance;
- Chromium native-strip smoke: 12 consecutive synthetic native ticks, native inline top and
  priority preserved, stable 4 px visual gap, same native nodes/handler, 0 attribute mutations,
  cleanup released the Better UI offset;
- build: PASS;
- release contract: PASS for the pre-bump 0.2.194 candidate;
- git diff --check: PASS;
- independent final technical re-gate: **P0=0 / P1=0 - TECH LOCAL READY**.

## Release reconciliation

0.2.195 is a release-only version/changelog/status reconciliation over the exact implementation
validated in-game.

Final 0.2.195 repository-completion verification:

- full repository suite: **750/750 PASS**;
- production build: PASS;
- dependency audit: **0 vulnerabilities**;
- release contract: **PASS - v0.2.195**;
- git diff check: PASS;
- release artifact: dist/pokepixel-better-ui.user.js;
- release artifact size: **1,613,565 bytes**;
- release artifact SHA-256:
  **857AB86D73C6451071080573C36F07690D891E9F323A17797A7082DD866D8C83**.
