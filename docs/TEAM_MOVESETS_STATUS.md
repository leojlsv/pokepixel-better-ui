# Team Saved Movesets — PM / UX Status

Recorded: 2026-09-23

## Current stage

Native contract proven; Saved Movesets implemented and preserved inside the new Full Team Pokémon
dossier. The original `0.2.62` technical closure remains the Saved Movesets functional baseline;
exact dossier candidate `0.2.63` adds the first-class Current Moveset presentation and is tracked by
`docs/TEAM_PROFILE_STATUS.md`. Product Owner live validation remains pending.

The Product Owner clarified the feature after the initial discovery pass: **the game
already owns the four-move editor**. Better UI must not recreate that editor. The additive
feature is **Saved Movesets per individual Pokémon**, mirroring the Saved Teams concept at
single-creature scope.

Example: selecting Rhydon in Full Team shows Rhydon's saved move presets. The player can
save the current native four-move configuration under a name and later apply one of those
presets. A compact marker on the Team slot identifies which saved preset matches the
Pokémon's current authoritative moveset.

## Proven native contract

Current public game assets (POKEIDLE_ASSET_TAG=20260922-hunt-action-first-1) expose the
enabled MovesetConfig plugin with the description “Quatro golpes persistentes por
Pokémon”.

The native contract is:

- PokeIdle.Api.getMoveset(creatureId) → authoritative selected, available, mode,
  revision and move metadata.
- PokeIdle.Api.saveMoveset(creatureId, { mode, move_ids, revision }) → native persisted
  write with revision control.
- successful native UI saves emit PokeIdle.Bus.emit("moveset.saved", data).
- PokeIdle.MovesetConfig.open(creatureId) remains the native editor and is already
  surfaced by TeamScene.
- the native Team/HUD also has its own equipped-move preview. Better UI does not replace
  it.

## Product contract

- Presets are scoped by **creature instance ID**, not species. Two Rhydon are independent.
- Local storage contains only Better UI preset metadata/snapshots. The native moveset is
  always the gameplay source of truth.
- Saving captures the **ordered currently selected moves** from getMoveset.
- Applying a Saved Moveset uses the native saveMoveset writer with a freshly read
  revision and mode=manual so the stored snapshot is restored exactly.
- Before applying, every saved move must still exist in the Pokémon's authoritative
  available set and the saved move count must match the native required count.
- After writing, Better UI re-reads getMoveset and verifies the final ordered IDs before
  reporting success or emitting moveset.saved. The confirmed state must also remain
  mode=manual; matching move IDs in auto mode are not accepted as a restored preset.
- A preset is shown as active only when the authoritative selected move IDs match it
  exactly. No separate “active preset” gameplay flag is invented.
- Duplicate saved loadouts for the same creature are rejected because they would make the
  active marker ambiguous.
- Team HUD remains unchanged by this feature; the editor/preset manager belongs to Full
  Team.

## Full Team UX

Inside the selected Pokémon dossier:

1. the native command dock remains immediately after identity;
2. **Current Moveset** is a first-class authoritative block from `getMoveset`, with the
   four ordered current moves in a `2×2` primary grid;
3. the **existing native Moveset button is reused** in the Current header without replacing
   its handler;
4. loading reserves four move cells, read failure exposes local Retry, and zero current
   moves exposes an explicit empty state while the native editor remains reachable;
5. an exact saved-loadout signature is identified as `M# · name` in Current;
6. **Saved Movesets** follows with selected Pokémon name/count, Nome do moveset + Salvar atual,
   then stable per-Pokémon M# cards with four move identity chips;
7. each saved card offers Aplicar, Atualizar and Excluir. The matching preset is marked Ativo,
   and Apply is disabled for it;
8. the corresponding Team roster slot keeps the compact M# badge with the full saved preset
   name in its accessible label/title.

At the existing narrow Team threshold (<=419px), the save/header controls stack and the
four move chips reflow from four columns to 2×2. The existing Team body remains the only
vertical scroll owner.

## Lifecycle / safety

- Re-resolve teamScene(root), current profile and scene._selectedId every reconcile.
- Profile replacement or selected Pokémon change creates a new Saved Movesets view scope.
- Async results are keyed to the selected creature and are not projected onto a later
  selection.
- Current native movesets are cached per equipped creature and refreshed from
  moveset.saved; each saved event invalidates any older in-flight read for that creature,
  and state.resynced forces authoritative refresh.
- Ditto transformation refreshes the affected moveset because the individual ID stays the
  same while available moves may change.
- Cleanup removes Better UI-owned preset UI/badges and returns the original native Moveset
  button to its original anchor with its listener intact.
- No native move, Team composition, battle-order or gameplay state is stored or mutated
  during ordinary rendering.

## Persistence

Storage key: ppbui:team-movesets:v1.

Each record contains the preset ID, creature instance ID, stable M# marker, user-facing
name, ordered move snapshot and timestamps. A storage failure degrades to in-session
memory and is exposed in the UI immediately after the write that failed; it never blocks
or mutates the native moveset.

## Validation gate

Historical Saved Movesets technical closure for Better UI 0.2.62:

- focused Saved Movesets: 9/9 PASS;
- combined Team family: 78/78 PASS;
- full repository: 388/388 PASS;
- build PASS and git diff --check exit 0;
- candidate59 normal, close-during-init and close-during-switch smokes: exit 0;
- independent technical and product/architecture re-gates: READY, P0/P1/P2/P3 = 0/0/0/0.

Exact bundle: 920,762 bytes, SHA-256
`B854CB036107D4F9B11460731559790EE9C3DE13D635CEE9CF7A78C91D9D8D26`.

Exact candidate59 host: 235,008 bytes, SHA-256
`4F4FE8B40EC386ABB531514F456DF54E8CA27F544E470CA8365AAB1CEC68DE88`.

Product Owner visual/live validation remains the only feature-specific gate before
promotion. The current live candidate is intentionally unchanged.

The dossier candidate `0.2.63` separately verifies Current loading/error/Retry/empty,
Retry/Apply/Update focus continuity with polite live status, exact-current matching,
stale-selection quarantine, native editor restoration and stable mutation-free reconciliation as
part of the repository-wide `394/394` suite. Its exact bundle and
independent TECH/UX/VISUAL gate record live in `docs/TEAM_PROFILE_STATUS.md`.
