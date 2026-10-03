# PM Gate — Card Mode Layout Playground

Date: 2026-10-02
Status: TECH READY · UX READY · VISUAL READY (4×6 local playground)

Product Owner request: a local playground for arranging the current Card Mode
boxes on a fixed 4-column × 6-row grid. Each box can use an independent width and
height span, and the chosen arrangement becomes the layout handoff for a later
Card Mode implementation task.

## Scope

- Active authoring role: Feature / Module Engineer for local tooling.
- Production src/ is out of scope.
- The playground uses geometry-only placeholders for the current six top-level
  Card Mode surfaces.
- It does not reproduce gameplay, Analyzer state, network traffic or live-game
  integration.

## Acceptance & Evidence Matrix

| ID | Requirement | Must preserve | Evidence type | Owner | Reviewer | Status |
| --- | --- | --- | --- | --- | --- | --- |
| AC-CARD-LAYOUT-01 | Present one fixed 4 × 6 logical grid containing the six current Card Mode boxes. | Production Card Mode source/runtime remains untouched. | source + local render | Feature Engineer | Visual Regression Reviewer | pass |
| AC-CARD-LAYOUT-02 | Reposition a box by snapped drag and by exact Column/Row controls. | Focus and selection remain understandable; no pointer-only dependency. | source + interaction QA + local render | Feature Engineer | UX/A11y QA | pass |
| AC-CARD-LAYOUT-03 | Configure Width from 1 through 4 columns and Height from 1 through 6 rows. | Invalid overlap or out-of-bounds changes leave the last valid layout unchanged. | source + automated model checks | Feature Engineer | Technical QA | pass |
| AC-CARD-LAYOUT-04 | Keep the board on the current valid arrangement and expose deterministic final placement data. | Export contains layout geometry only. | source + local render | Feature Engineer | Technical QA | pass |
| AC-CARD-LAYOUT-05 | Persist only valid committed geometry locally and restore the documented default on reset. | No Better UI/game preference storage is written. | source + interaction QA | Feature Engineer | Technical QA | pass |
| AC-CARD-LAYOUT-06 | Launch through a dedicated local repository command. | Existing playgrounds and production build remain independent. | command smoke | Feature Engineer | Technical QA | pass |

## Design contract

The logical board always has four columns and six rows. The initial/reset
arrangement is the Product Owner-selected final playground layout:

| Stable ID | Box | Column | Row | Width | Height |
| --- | --- | ---: | ---: | ---: | ---: |
| battle | Battle | 1 | 1 | 2 | 1 |
| hunt-summary | Hunt Summary | 1 | 2 | 2 | 1 |
| capture | Capture | 1 | 3 | 2 | 1 |
| captured-seen | Captured / Seen | 3 | 1 | 2 | 1 |
| economy-xp | Economy / XP | 1 | 4 | 2 | 1 |
| history | History | 3 | 2 | 2 | 3 |

Moves and resizes are transactional. A candidate is valid only when x/y are
1-based integers, width is an integer from 1 through 4, height is an integer from
1 through 6, the footprint stays fully inside the 4 × 6 board, and it intersects
no other committed box. Invalid changes
do not clamp, shove, swap, compress or otherwise modify neighboring boxes.

Pointer drag snaps to logical cells and commits only a valid destination. Exact
keyboard-accessible editing uses labeled Column, Row, Width and Height controls
plus Apply; field edits are a draft until Apply validates all four values
atomically.

Selection and keyboard focus are separate states. Click or drag start selects a
box. Normal Tab navigation reaches boxes and controls. Applying or rejecting a
change does not intentionally move focus.

The canonical result is deterministic ordered JSON keyed by the stable IDs above.
Every value contains only integer x, y, w and h fields. CSS Grid output may be
derived from the same committed state as a convenience preview, but is not a
second source of truth.

## Evidence limits

Source/tests can prove placement rules and isolation. Visual readiness requires a
rendered local playground. No result here is live in-game validation or Product
Owner approval of the eventual Card Mode production layout.

## Final evidence

The previous 4×4 evidence is superseded by this 4×6 revision.

- Focused model + DOM tests: 8/8 pass. Coverage includes the exact selected
  default, exhaustive 4×6 footprint validation, transactional bounds/overlap
  rejection, strict numeric geometry, JSON round-trip and focus preservation
  after a successful pointer drag.
- Syntax checks for layout model, playground and local server: pass.
- Production regression build: pass. Production src/modules/coupled-workspace has
  no task diff.
- Local server smoke: root, playground.js and layout-model.js return HTTP 200;
  unrelated repository paths return 404.
- Persistence failure smoke: forced Storage.setItem failure keeps the explicit
  error announcement.
- Auxiliary text contrast after the final token correction: #8f9991 is 4.85:1
  against #232c2e and 6.20:1 against #101618.
- Final render: work/card-mode-layout-playground-final-selected.png at 1440×900.
- Independent final review: P0/P1/P2/P3 none; TECH READY, UX READY, VISUAL READY.
