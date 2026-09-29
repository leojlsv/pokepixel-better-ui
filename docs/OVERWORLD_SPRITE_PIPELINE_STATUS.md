# Overworld Sprite Synthesis Pipeline — Project Status

## Project intent

Create Better UI-ready animated Pokemon overworld spritesheets whose **layout,
directional coverage and movement poses follow the Aerun overworld sheets**, while
their **visual identity is derived from the selected PokemonDB sprite family**.

This is not a recolor of the Aerun sheet and not a simple resize of PokemonDB.
The Aerun asset is a pose/motion reference; PokemonDB is the visual source of
truth for the target Pokemon appearance.

Initial PoC species:

- #006 Charizard;
- #059 Arcanine.

Current project state: `style-v7 geometry-locked visual corrective prepared for Product Owner review`.

An exploratory `transfer-v0` candidate exists for both PoC species. It is a
deterministic palette/style transfer over the verified Aerun geometry, using
species-specific PokemonDB-guided color mappings. It is intentionally classified
as a PoC candidate rather than approved production art because it preserves the
Aerun silhouettes pixel-for-pixel while changing their visual palette.

Independent Visual QA rejected `transfer-v0` (`VISUAL NOT READY`) because both
candidate alpha masks were exactly identical to Aerun and therefore read as
recolored Aerun rather than PokemonDB-derived anatomy. That finding superseded
`transfer-v0` as the Product Owner candidate.

`transfer-v1` was an earlier corrective candidate (superseded by the
`strict-pose-v6` / `style-v7` iterations recorded below):

- left/right rows use the actual cropped PokemonDB sprite as the geometry donor;
- right view mirrors the PokemonDB donor;
- Aerun contributes side-view cadence deltas, 64x64 placement and the 2 px bob;
- front/down and back/up remain inferred from the overworld reference because the
  selected PokemonDB source does not provide those views, but their geometry is
  resized so it no longer preserves Aerun's alpha mask exactly;
- every final opaque RGB color remains inside the exact selected PokemonDB palette;
- candidate output remains 256x256 RGBA with the same 4x4/64x64 runtime contract.

Subsequent iterations established the boundary of deterministic reshaping:

- `transfer-v2` normalized the PokemonDB side-view pixel density and enlarged the
  inferred front/back views. Independent Visual QA judged Arcanine acceptable for
  PoC at this point, but Charizard still failed cross-direction anatomical
  coherence.
- `transfer-v3` applied a Charizard-only band-wise proportion corrective to rows
  0/3 while keeping side rows unchanged and Arcanine byte-identical to v2.
  Independent Technical QA returned `TECH READY` with P0/P1/P2/P3 = 0/0/0/0,
  including reproducibility, negative-case write safety, provenance and structural
  validation. Independent Visual QA remained `VISUAL NOT READY` because the
  Charizard front/back topology still read as a warped chibi/Aerun construction
  rather than the same PokemonDB-derived anatomical model as the side rows.

The corrective therefore changed class: Charizard rows 0/3 now use a genuinely
authored/redrawn perspective pass rather than further deterministic global
scaling/warping. `authored-v5` uses low three-quarter front/back views to better
match the PokemonDB side-view body model, while Charizard rows 1/2 remain frozen
from v3 and Arcanine remains byte-identical to its accepted v2/v3 pixels.

Product Owner verdict on `authored-v5`: **REJECTED**.

Reason supplied by Product Owner:

- movement positions were not respected;
- distortions were unacceptable.

This invalidates the authored/deterministic-reshape direction as a candidate for
the stated product goal. The corrected contract is now stricter: Aerun owns the
entire movement geometry and PokemonDB may not move or reshape any animated
pixel position.

Historical `authored-v5` tuple:

- Charizard SHA-256:
  `1789db8fa651ba5382410258bb61d36fad6ff879905205b300419e8e325f2c9b`;
- Arcanine SHA-256:
  `60fecf94140f6dfa8b83e6c58a156125b81aca6cfa262aeb4753936f6316e955`;
- combined review board SHA-256:
  `0c42c41250ef970b1ba5a7ba26f187abaaab283f1a3e34c18272ffa718991bd5`.

Those facts remain useful only as historical evidence; the visual candidate is
rejected and must not be promoted.

### Corrected geometry contract — strict-pose-v6

`strict-pose-v6` returns to the only transformation class that can prove the
Product Owner's movement requirement mechanically:

- every Aerun alpha pixel remains in exactly the same coordinate;
- frame bounding boxes are identical to Aerun;
- baselines are identical to Aerun;
- per-frame centers, widths and heights are identical to Aerun;
- there is no per-frame resize, warp, mirror, redraw or re-anchoring;
- only opaque RGB values may change;
- every resulting opaque color must exist in the selected PokemonDB source
  palette.

Current proof for both #006 and #059:

- `geometry_diff_pixels = 0`;
- `alpha_geometry_identical_to_aerun = true`;
- `frame_metrics_identical_to_aerun = true`;
- candidate validation PASS.

Current outputs:

- `work/overworld-sprite-poc/candidates/strict-pose-v6/normal/006-charizard.png`;
- `work/overworld-sprite-poc/candidates/strict-pose-v6/normal/059-arcanine.png`.

## Verified source facts

### Aerun reference archive

Source file currently available locally:

`tools/nayakoko-sprite-extractor/All 721 Pokemon Overworlds by Aerun.zip`

Observed archive facts:

- 1,716 PNG files;
- Pokemon files use National Dex-style numeric names, including normal and shiny
  variants, for example `Pokemon/006_0.png`, `Pokemon/006s_0.png`,
  `Pokemon/059_0.png`, `Pokemon/059s_0.png`;
- Charizard and Arcanine normal/shiny sheets are all `256x256 RGBA`;
- the sheets resolve naturally to a `4 x 4` frame grid;
- each logical frame is therefore `64x64`;
- all 16 logical cells contain visible sprite data;
- individual frame alpha bounds vary, so frame content must remain anchored to
  the 64x64 logical cell rather than trimmed independently.

The rendered references for both Charizard and Arcanine establish the row order:

- row 0 = `down` / front view;
- row 1 = `left` / left-side view;
- row 2 = `right` / right-side view;
- row 3 = `up` / back view.

The four columns form one movement cycle. Frames 0 and 2 are the alternating
primary poses; frames 1 and 3 are the corresponding transition phases with the
observed ~2 px vertical body/baseline shift. These semantics are stored in
`tools/overworld-sprite-pipeline/poc-layout.json` rather than being implicit in
the renderer.

The ZIP contains PNGs only; no embedded license/readme/provenance file was found.
That is acceptable for local PoC research, but production adoption requires a
separate provenance/license decision.

### PokemonDB source assets

The validated PokemonDB build-time fetcher already provides:

- `006-charizard.png`: `112x112`, visible alpha bbox `(8,30)-(96,108)`;
- `059-arcanine.png`: `112x112`, visible alpha bbox `(22,34)-(96,108)`;
- exact downloaded bytes, SHA-256 and source URL recorded in the fetcher
  manifest;
- no runtime hotlinking.

These images are reference art, not animation-ready frames. A single static
PokemonDB pose does not contain enough information to deterministically recover
back, side or walking poses. Those poses must be authored/synthesized using the
Aerun reference geometry.

## Non-visual constraints

- Do not alter game behavior or automate gameplay.
- Asset production remains build-time/offline.
- Runtime Better UI must consume local packaged PNGs only.
- Keep transparent backgrounds and pixel-crisp nearest-neighbor rendering.
- Do not stretch one static frame into fake directional frames.
- Do not overwrite PokemonDB source downloads; generated overworld assets are a
  separate derivative asset family.
- Preserve the Aerun logical canvas contract: `256x256`, `4x4`, `64x64` cells for
  PoC unless the reference audit proves otherwise.
- Keep source, intermediate and approved production assets separate.

## Art direction

### Concept

`PokemonDB identity, Aerun locomotion grammar.`

The generated Pokemon must look like the selected PokemonDB depiction when
viewed as a still image, but move and turn with the readable directional grammar
of the Aerun overworld reference.

### What must come from PokemonDB

- species proportions and recognizable silhouette where the view permits;
- base palette and major color regions;
- face/head identity;
- anatomy-defining details such as Charizard wings/tail flame and Arcanine mane,
  stripes and tail;
- pixel-art edge language and color grouping as closely as practical at 64x64.

### What may come from Aerun

- pose topology;
- limb cadence;
- body translation/bob across the walk cycle;
- side/back orientation reference;
- frame occupancy and ground contact;
- relative motion of appendages such as tail, wings, mane and legs.

### What must NOT be copied blindly from Aerun

- final per-pixel artwork;
- species palette when it conflicts with the chosen PokemonDB source;
- old shading/color choices solely because they are present in the template.

## Target frame contract

PoC output per species:

```text
256 x 256 RGBA PNG

4 columns x 4 rows
64 x 64 logical cell per frame

row 0: down / front
row 1: left / left-side
row 2: right / right-side
row 3: up / back

columns 0..3: four-frame movement cycle for that direction
```

No frame is individually trimmed. Empty transparency around a pose is part of
the alignment contract.

## Proposed asset layout

Exploratory/intermediate assets:

```text
work/overworld-sprite-poc/
  references/
    aerun/
      006-charizard.png
      059-arcanine.png
    pokemondb/
      006-charizard.png
      059-arcanine.png
  frames/
    006-charizard/
    059-arcanine/
  renders/
  reports/
```

Approved production assets, only after review/adoption:

```text
assets/pokemon-overworld/
  normal/
    006-charizard.png
    059-arcanine.png
  manifest.json
```

Shiny generation is explicitly deferred until the normal PoC is accepted.

## Pipeline architecture

```text
PokemonDB normal sprite
       |
       | visual identity / palette / anatomy
       v
  pose authoring / synthesis  <----- Aerun normal overworld sheet
       |                              pose/motion reference only
       v
16 authored 64x64 frames
       |
       +--> structural validator
       |      - dimensions
       |      - alpha
       |      - frame grid
       |      - frame occupancy
       |      - anchor/ground consistency
       |
       +--> contact-sheet / animated preview
       |
       +--> visual comparison gate
       v
256x256 candidate spritesheet
       |
       v
approved local production asset
```

## Implementation strategy

### Stage 1 — Reference normalization

Build a small offline tool that:

1. extracts the requested Aerun reference sheet from the ZIP;
2. loads the corresponding PokemonDB source PNG;
3. splits the Aerun reference into 16 `64x64` cells without trimming;
4. records each frame alpha bbox and ground/contact metrics;
5. produces a labelled reference contact sheet;
6. produces a manifest describing grid, direction rows and frame order.

No art is generated at this stage.

### Stage 2 — PoC authoring

Author Charizard and Arcanine independently.

For each species:

1. define four directional base poses from the Aerun reference;
2. reinterpret those poses using PokemonDB anatomy/palette;
3. author four movement frames for each direction;
4. keep body center/ground contact stable enough to avoid runtime jitter;
5. preserve expressive appendage motion rather than translating the whole sprite
   rigidly;
6. export a `256x256 RGBA` candidate.

The implementation may use an image-generation/editing tool for the initial
pose transfer, but final candidate acceptance depends on the pixels rendered,
not on which production tool created them.

### Stage 3 — Deterministic cleanup

Apply only deterministic post-processing after visual authoring:

- exact 64x64 cell placement;
- transparent background normalization;
- palette cleanup where generated near-duplicate colors create noise;
- nearest-neighbor-only scaling if any temporary larger working canvas was used;
- no interpolation blur;
- no per-frame auto-trim.

### Stage 4 — Validation

Generate three review artifacts per species:

1. full `256x256` spritesheet;
2. enlarged labelled contact sheet;
3. animated preview cycling each direction independently.

Validation is both structural and visual. Structural checks cannot approve the
art direction.

## Acceptance & Evidence Matrix

| ID | Observable requirement | Must preserve | Required evidence | Producer | Independent reviewer | Status |
| --- | --- | --- | --- | --- | --- | --- |
| AC-01 | Charizard candidate is exactly 256x256 RGBA with a 4x4 grid of 64x64 frames | Aerun layout contract | PNG metadata + grid validator | Asset Pipeline Engineer | Technical QA | `open` |
| AC-02 | Arcanine candidate is exactly 256x256 RGBA with a 4x4 grid of 64x64 frames | Aerun layout contract | PNG metadata + grid validator | Asset Pipeline Engineer | Technical QA | `open` |
| AC-03 | All 16 Charizard cells contain intentional, non-empty frame artwork | transparency and frame boundaries | per-frame alpha report + contact sheet | Asset Producer | Technical QA + Visual QA | `open` |
| AC-04 | All 16 Arcanine cells contain intentional, non-empty frame artwork | transparency and frame boundaries | per-frame alpha report + contact sheet | Asset Producer | Technical QA + Visual QA | `open` |
| AC-05 | Each direction reads as the same PokemonDB Charizard identity while matching the Aerun reference pose family | PokemonDB anatomy/palette; Aerun movement semantics | side-by-side rendered reference + candidate contact sheet | Pixel Artist / Asset Producer | Pixel Art Director / Visual QA | `open` |
| AC-06 | Each direction reads as the same PokemonDB Arcanine identity while matching the Aerun reference pose family | PokemonDB anatomy/palette; Aerun movement semantics | side-by-side rendered reference + candidate contact sheet | Pixel Artist / Asset Producer | Pixel Art Director / Visual QA | `open` |
| AC-07 | Walk cycles do not visibly jitter, jump ground contact or resize the Pokemon unintentionally | 64x64 frame anchor and baseline | animated preview + anchor metric report | Asset Pipeline Engineer | Visual QA | `open` |
| AC-08 | Pixel edges remain crisp at 1x and integer zoom; no anti-aliased halo/background contamination | transparent pixel-art rendering | 1x/4x rendered preview + alpha inspection | Asset Pipeline Engineer | Visual QA | `open` |
| AC-09 | Generated output is separate from untouched PokemonDB and Aerun source/reference files | source provenance and recoverability | directory/hash manifest | Asset Pipeline Engineer | Technical QA | `open` |
| AC-10 | Product Owner can compare Charizard and Arcanine PoCs before any batch-generation decision | no scale-out before PoC acceptance | exact candidate package + review checklist | PM | Product Owner | `open` |

## Risks / failure hypotheses

| Risk | Why plausible | Detection evidence | Mitigation |
| --- | --- | --- | --- |
| R-01 — style drift | A static PokemonDB sprite does not define rear/side views | contact sheet against PokemonDB + Aerun | species-specific art review; reject generic/invented anatomy |
| R-02 — motion copied but identity lost | Over-reliance on Aerun may effectively reproduce the old asset rather than create the target style | pixel-level visual comparison | use Aerun only as pose reference; PokemonDB is visual authority |
| R-03 — animation jitter | independently authored frames can shift center, baseline or scale | animated preview + anchor metrics | explicit anchor/baseline normalization pass |
| R-04 — blur / mixed pixel scale | generation or resizing can introduce anti-aliasing | alpha/color-edge inspection at 1x/4x | nearest-neighbor-only final resampling and cleanup |
| R-05 — appendage popping | Charizard wings/tail and Arcanine mane/tail vary heavily by pose | frame-by-frame animated review | continuity pass for silhouette-changing features |
| R-06 — unclear direction rows | 4x4 geometry is verified but row semantics are not yet frozen | labelled Aerun motion preview | verify/freeze direction order before authoring |
| R-07 — provenance/licensing gap | ZIP contains no embedded license/readme | provenance record | keep PoC local; require explicit provenance decision before shipping derivative assets |
| R-08 — batch process does not generalize | quadrupeds, bipeds, flyers and unusual bodies require different pose-transfer logic | PoC across Charizard + Arcanine | treat them as two morphology classes before scaling |

## PoC rationale

Charizard and Arcanine are deliberately complementary:

- **Charizard** tests a biped/flying silhouette, wings, tail flame and large
  appendage continuity;
- **Arcanine** tests a quadruped gait, mane, tail volume and leg readability.

If the pipeline works on both, it has evidence for at least two materially
different morphology classes. That is still insufficient to assume all 251
Pokemon can be generated uniformly.

## Milestones

### M0 — Project contract — COMPLETE

- inspect Aerun ZIP structure;
- verify target dimensions/grid;
- verify PokemonDB source availability;
- freeze PoC acceptance criteria;
- establish folders and provenance boundaries.

Exit: this document accepted as the working contract.

### M1 — Reference harness — COMPLETE

- implemented Aerun frame extractor;
- implemented frame alpha/bbox/anchor metrics;
- generated labelled contacts and per-direction animated GIF previews;
- froze row direction semantics and four-phase frame order in `poc-layout.json`;
- verified both references keep baseline range within y=59..61 in every row.

Exit: technical harness can reproduce the Aerun Charizard/Arcanine 4x4 structure
without altering source files.

### M2 — Charizard PoC

- author 16 frames;
- structural validation;
- rendered contact + animation review;
- corrective pass.

Exit: Charizard `TECH READY` + `VISUAL READY` for PoC scope.

Current status: prior v1-v5 geometry-changing approaches are superseded by the
Product Owner rejection. `strict-pose-v6` is the active corrective and locks all
movement geometry to Aerun pixel-for-pixel.

### M3 — Arcanine PoC

- author 16 frames;
- structural validation;
- rendered contact + animation review;
- corrective pass.

Exit: Arcanine `TECH READY` + `VISUAL READY` for PoC scope.

Current artifact: v2/v3 candidate visually acceptable for PoC. v3 is byte-identical
to v2 for Arcanine and should remain frozen while Charizard is corrected.

## Gate history

### transfer-v0

- Author structural validation: PASS for both species.
- Independent Technical QA: `TECH NOT READY` due a P2 negative-case crash when an
  entire candidate row was empty; P3s covered unsupported-number diagnostics,
  absolute validation paths and incomplete upstream provenance metadata.
- Independent Visual QA: `VISUAL NOT READY`; P1 art-direction mismatch because
  candidate geometry was pixel-identical to Aerun despite PokemonDB palette use.

Correctives implemented before `transfer-v1` re-gate:

- empty-row validation now returns normal structured FAIL evidence instead of
  throwing from row aggregation;
- unsupported PoC species fail with an explicit controlled diagnostic;
- validation report paths are work-root-relative;
- reference manifest records Aerun ZIP SHA-256 + exact member and PokemonDB
  source URL/family/upstream SHA when the fetcher manifest is present;
- candidate storage is versioned by method (`transfer-v0`, `transfer-v1`);
- `transfer-v1` changes geometry and uses PokemonDB as actual side-view donor.

### transfer-v3 exact gate

- Charizard SHA-256:
  `256fb0ee0c47b70d72aaf875e873a2ecd8e4d6f3318df91e978470df76012857`.
- Arcanine SHA-256:
  `60fecf94140f6dfa8b83e6c58a156125b81aca6cfa262aeb4753936f6316e955`.
- Technical QA: `TECH READY`, P0=0, P1=0, P2=0, P3=0.
- Visual QA: `VISUAL NOT READY` due Charizard P1 cross-direction anatomical
  mismatch; Arcanine explicitly remained acceptable for PoC.
- Visual QA conclusion: deterministic reshape reached its useful limit for
  Charizard; an authored/redrawn front/back pass is required.

### authored-v4

- First manual front/back redraw with v3 side rows frozen.
- Structural validation: PASS for both species when assembled as a formal
  candidate family.
- Author visual review found the Charizard rows still too vertical/symmetric
  relative to the PokemonDB source and side rows; it was not promoted as the PoC
  review candidate.

### authored-v5 — REJECTED BY PRODUCT OWNER

- Charizard rows 0/3 redrawn as lower, asymmetric three-quarter front/back views;
- Charizard rows 1/2 remain byte-identical to transfer-v3;
- Arcanine remains byte-identical to transfer-v3/v2;
- candidate validation: PASS for #006 and #059;
- all row baselines remain within `59..61`;
- Charizard centers are stable within each direction (`31.5`, `33.5`, `29.5`,
  `31.5` respectively);
- exact provenance/invariant report:
  `work/overworld-sprite-poc/reports/authored-v5.json`;
- combined Product Owner review board:
  `work/overworld-sprite-poc/authoring-v5/poc-authored-v5-review-board.png`.

Product Owner rejected this candidate because movement positions were not
respected and the resulting distortions were unacceptable. It is retained only
as historical evidence and must not be used as a production or review baseline.

### strict-pose-v6 — CURRENT CORRECTIVE

- Aerun alpha geometry locked pixel-for-pixel;
- PokemonDB palette transferred inside the immutable Aerun geometry;
- no pose redraw, scaling, warping or frame repositioning;
- Charizard recolored opaque pixels: `20696`;
- Arcanine recolored opaque pixels: `19592`;
- geometry-diff pixels: `0` for both;
- structural validation: PASS for both;
- visual review remains pending Product Owner inspection.

### style-v7 — CURRENT VISUAL CANDIDATE

Product Owner feedback on v6 was that color correction alone did not show enough
care with shading and visual identity relative to the PokemonDB source.

`style-v7` keeps the v6 geometry contract intact and changes only how RGB is
derived:

- Aerun movement geometry remains pixel-identical (`geometry_diff_pixels = 0`);
- the pipeline first normalizes both Aerun and PokemonDB artwork to their logical
  1x pixel-art grids (the Aerun sheets are exactly 2x: every 2x2 block is
  homogeneous for the PoC species);
- left/right rows use the actual PokemonDB sprite as a texture/shading donor,
  projected only inside the immutable Aerun alpha mask;
- right-facing rows use the mirrored PokemonDB donor;
- Aerun's pure-black silhouette pixels remain locked so outline readability is
  not lost;
- front/back rows deliberately retain the v6 material-aware shading. The selected
  PokemonDB source provides only a side/three-quarter view, and attempts to project
  that light map into front/back produced misleading color distributions. No
  unsupported perspective is invented;
- all final colors remain a strict subset of the selected PokemonDB source palette.

Exact current tuple:

- Charizard SHA-256:
  `52b92893fc20afe732979d85594395ceff966a6eecf29ff3596483265d6d4f36`;
- Arcanine SHA-256:
  `f09ab102c3e0dbbfc94a1ad1670d344e359309323944beb83084a2f91c943e1a`;
- Charizard RGB pixels changed vs v6: `6792`;
- Arcanine RGB pixels changed vs v6: `6144`;
- geometry delta vs Aerun: `0` for both;
- candidate validation: PASS for both.

Focused v6→v7 comparison boards:

- `work/overworld-sprite-poc/style-v7-review/006-charizard-v6-v7-comparison.png`;
- `work/overworld-sprite-poc/style-v7-review/059-arcanine-v6-v7-comparison.png`.

This is the next Product Owner visual gate. It is not production-approved yet.

### M4 — Product Owner PoC gate

Product Owner compares both species for:

- PokemonDB likeness;
- overworld pose/motion quality;
- pixel crispness;
- directional readability;
- whether this asset style is worth scaling to the wider roster.

Exit: explicit `approve / revise / stop` decision.

### M5 — Scale-out design — NOT AUTHORIZED YET

Only after M4 approval:

- classify morphology families;
- decide normal + shiny policy;
- estimate manual/assisted cost per species;
- define batching (for example 25 at a time);
- add per-species QA/provenance manifest;
- integrate approved assets into Better UI runtime.

## Definition of done for the PoC

The PoC is complete only when:

1. both final candidates are 256x256 RGBA, 4x4, 64x64 per frame;
2. direction/frame semantics are explicitly documented;
3. all 32 frames are structurally valid;
4. both animated previews are free of obvious alignment jitter;
5. visual review confirms recognizable PokemonDB-derived identity and Aerun-like
   pose/motion coverage;
6. source and generated assets have hashes/provenance records;
7. the Product Owner has reviewed the exact Charizard and Arcanine candidates;
8. no assumption is made that PoC acceptance automatically authorizes generation
   of the remaining roster.

## Product Owner decisions currently NOT required

No art decision is needed before M1. The next meaningful Product Owner gate is
after Charizard and Arcanine rendered candidates exist.

Before production shipping, a separate decision will be required on provenance
and acceptable use of the Aerun reference material because the local archive does
not include licensing metadata.
