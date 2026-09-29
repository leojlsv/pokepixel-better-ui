# Overworld Sprite Pipeline

The optional source file
`../nayakoko-sprite-extractor/All 721 Pokemon Overworlds by Aerun.zip` is
**machine-local third-party artwork**, not a repository artifact. Supply it
only when its original redistribution/use terms permit; the pipeline source and
configuration are versioned independently of that archive.

Planned offline asset-production pipeline for converting a selected PokemonDB
visual reference into a 4-direction, 4-frame-per-direction overworld spritesheet
using the Aerun sheets as pose/motion references.

Canonical project contract:

`docs/OVERWORLD_SPRITE_PIPELINE_STATUS.md`

## PoC scope

- #006 Charizard
- #059 Arcanine
- normal variants only
- target: 256x256 RGBA
- grid: 4x4
- frame cell: 64x64

## Implemented commands

```powershell
# Extract/inspect references without modifying them
.\run.ps1 prepare --numbers "6,59"

# Validate authored candidate sheets
.\run.ps1 validate --numbers "6,59"

# Render enlarged contacts and directional GIF/APNG previews
.\run.ps1 preview --numbers "6,59"
```

Current exact PoC candidate preview/validation:

```powershell
.\run.ps1 strict-pose-v6 --numbers "6,59"
.\run.ps1 validate --variant strict-pose-v6 --numbers "6,59"
.\run.ps1 preview --variant strict-pose-v6 --numbers "6,59" --scale 4
```

`strict-pose-v6` is the current Product Owner corrective. It treats every Aerun
movement coordinate as immutable and changes only RGB colors using the selected
PokemonDB palette. `authored-v5` and the geometry-changing transfer variants are
historical/rejected for the current product goal.

Visual-identity refinement:

```powershell
.\run.ps1 style-v7 --numbers "6,59"
.\run.ps1 validate --variant style-v7 --numbers "6,59"
.\run.ps1 preview --variant style-v7 --numbers "6,59" --scale 4
```

`style-v7` preserves the exact v6/Aerun geometry. Side rows transfer PokemonDB
texture/shading on the logical 1x pixel grid; front/back retain conservative v6
material shading because there is no equivalent PokemonDB front/back source view.

The M1 harness also retains these earlier exploration commands:

```powershell
.\run.ps1 prepare --numbers "6,59" --pokemondb-root <fetcher-output>
.\run.ps1 transfer-v0 --numbers "6,59"
.\run.ps1 transfer-v1 --numbers "6,59"
.\run.ps1 validate --variant transfer-v1 --numbers "6,59"
.\run.ps1 preview --variant transfer-v1 --numbers "6,59"
```

`transfer-v0` is deliberately an **exploratory** candidate: it keeps the Aerun
frame geometry pixel-for-pixel and maps its palette toward the exact PokemonDB
source palette. It is useful for deciding whether palette/style normalization is
enough. Independent Visual QA found that insufficient.

`transfer-v1` was an earlier PoC candidate. For the two side rows it uses the
actual PokemonDB source sprite as the geometry donor, mirrors it for the opposite
direction, and applies Aerun only for cadence/anchor deltas. Front/back are inferred
views and deliberately reshape the v0 reference so the final candidate is no
longer alpha-identical to Aerun.

## Boundaries

- source files remain immutable;
- generated/intermediate files stay under `work/overworld-sprite-poc/`;
- only explicitly approved assets move to `assets/pokemon-overworld/`;
- no runtime network dependency;
- no scale-out beyond the two-species PoC until Product Owner review.
