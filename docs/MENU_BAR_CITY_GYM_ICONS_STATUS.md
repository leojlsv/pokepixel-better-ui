# Menu bar — City Gyms and requested icons

Date: 2026-10-03
Candidate: 0.2.150

## Task

- Add `Gyms` as a shortcut inside `City`.
- Apply the Product Owner-provided artwork:
  - Better UI → `assets/betterui.png`
  - Geneticista → `assets/genetics.png`
  - Nature → `assets/nature.png`
  - Trainer → `assets/trainer.png`
  - Evolution Center → `assets/evolution.png`
  - Gyms → `assets/gym.png`

The original 1254×1254 PNGs remain source assets. Runtime 96×96 derivatives are
embedded in the self-contained userscript to avoid increasing the bundle by roughly
6.6 MB of Base64 payload for icons rendered at toolbar/dropdown scale.

## Acceptance & Evidence Matrix

| ID | Observable requirement | Must preserve | Required evidence | Status |
| --- | --- | --- | --- | --- |
| AC-MENU-GYM-01 | City contains exactly one `Gyms` shortcut after the existing Geneticista, Nature and Evolution Center shortcuts. | Existing native City destinations and their node identity/listeners. | Focused DOM/reconciliation/cleanup tests. | pass |
| AC-MENU-GYM-02 | Clicking Gyms opens the native `Scene_Gym` only when the native scene manager can accept a transition. | No Gym battle start, API call, network interception or duplicated game state. | Stubbed native `SceneManager.push(Scene_Gym)` regression. | pass |
| AC-MENU-ICON-01 | Better UI, Trainer, Geneticista, Nature, Evolution Center and Gyms use the requested PNG artwork. | Existing menu geometry, labels, keyboard behavior and accessible button names. | Build embedding check + DOM icon ownership regression; Product Owner rendered validation. | pass |
| AC-MENU-ICON-02 | Disabling/unmounting Better UI restores the native Trainer icon and removes owned City shortcuts. | Reversible menu lifecycle. | Cleanup/restart regression. | pass |
| AC-MENU-A11Y-01 | The new Gyms entry participates in existing Home/End/Arrow/Escape behavior and owned images are decorative to assistive tech. | Existing focus order and button labels. | Keyboard/ARIA regression. | pass |

## Validation boundary

Automated checks prove source contracts, lifecycle, keyboard behavior and that the
built userscript embeds the assets. Final icon appearance and rendered City
composition were validated and approved in-game by the Product Owner on 2026-10-03.
Visual status is `PASS`.

Local rendered evidence uses the exact built `0.2.150` userscript inside a synthetic
WebView2 toolbar fixture. This is sufficient to check Better UI-owned popup geometry,
image decoding and integration without accessing the live game. The final capture
confirmed a visible 282×226 City popup with three equal columns, no horizontal
overflow (`scrollWidth === clientWidth`), the four requested City labels/icons in
order, and successfully decoded 96×96 PNGs for all four City actions plus Trainer
and Better UI. Product Owner in-game validation subsequently confirmed the final
live-host appearance.

## Candidate evidence

- Focused Menu Bar + Module Controls: **47/47 PASS**.
- Full repository run: **626/627 PASS** with one unrelated Inventory observer test
  failing once under the broad concurrent run. The exact failed test then passed
  **1/1** in isolation and the complete Inventory file passed **37/37** without any
  code change.
- `npm run build`: **PASS** for `0.2.150`.
- Artifact contract check: **PASS**, exact version plus all six runtime PNG payloads
  are present in `dist/pokepixel-better-ui.user.js`.
- Local WebView2 rendered composition: **PASS** — `Geneticista`, `Nature`,
  `Evolution Center`, `Gyms`; icon keys `genetics`, `nature`, `evolution`, `gym`;
  six requested owned images decoded at 96×96; three-column City popup has no
  horizontal overflow.
- Follow-up `Trainer > Genetic Vault`: **PASS** — native DNA emoji remains native,
  but its glyph is centered at 26 px inside the same 31×31 icon footprint used by
  the dropdown. Local WebView2 computed style confirmed `31×31`, `font-size:26px`,
  `line-height:31px`, `display:grid` and centered placement; Menu Bar regression is
  **34/34 PASS**.
- Product Owner live validation: **PASS / APPROVED** on 2026-10-03 for candidate
  `0.2.150`, including the City/Gyms composition, requested icons and Genetic Vault
  sizing follow-up.
- `git diff --check`: **PASS**.
- Exact built artifact after the Genetic Vault sizing follow-up: **1,259,669 bytes**,
  SHA-256 `D10578C517FD846F831C37BE09969EB792DB0E1772B826300772BA9B09AD7E0B`.
