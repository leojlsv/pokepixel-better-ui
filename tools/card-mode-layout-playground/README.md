# Card Mode Layout Playground

Local-only geometry editor for the standalone Card Mode layout. It does not load
the game, Analyzer data or Better UI production runtime.

Run from the repository root:

    npm run playground:card-mode

Then open:

    http://127.0.0.1:4178/

The editor uses a fixed 4-column × 6-row logical grid and the six current
top-level Card Mode surfaces: Battle, Hunt Summary, Capture, Captured / Seen,
Economy / XP and History.

Select a box and drag it to a valid free footprint, or edit Column / Row / Width /
Height and apply the four values together. Width accepts spans from 1 through 4;
height accepts spans from 1 through 6. Invalid out-of-bounds or overlapping
changes leave the committed layout unchanged.

The current layout is stored only in browser localStorage under
ppbui:card-mode-layout-playground:v2. Reset restores the documented initial
playground arrangement.

The JSON output is the canonical handoff. It is deterministic and contains only
the six stable box IDs and integer x, y, w and h values. The CSS Grid output is a
derived convenience preview.
