# Geneticista — Extraction Workspace Design Override

Status: **`0.2.161` validated and approved in-game by Product Owner on 2026-10-04**
Direction: **dense species picker + shared filter/discovery grammar**
Recorded: **2026-10-04**

This page specializes `../MASTER.md` for the Geneticista window. MASTER remains the
visual authority; this override records only module-specific hierarchy and interaction.

## Product intent

Geneticista is a management surface. Its primary jobs are IV reroll and genetic extraction.
The separate Trainer `Genetic Vault` owns material inventory browsing, so the duplicate
`Genetic Materials` tab is removed from this window.

Extraction uses a two-level hierarchy: choose a species, then choose the individual
Pokémon to extract. Species switching should feel like Mark's Shop discovery rather than
a wizard with expensive backtracking, while the active species remains explicit because
the native destructive request is species-scoped.

## Non-visual constraints

- Preserve native extraction eligibility, protection/unlock, filters, pagination,
  `all_filtered`, snapshot and selection semantics.
- Preserve the native confirmation and `extractGeneticMaterial` executor. Better UI does
  not create a cross-species batch transaction.
- Preserve IV reroll, Awakening and Exchange behavior.
- `Genetic Materials` is only removed from Geneticista navigation; Genetic Vault remains
  native and unchanged.
- Extraction presentation immediately activates the native cinematic's Skip path, keeping
  its static pending/result completion and focus behavior without requiring the sequence
  to be watched.
- Cleanup is reversible and identity-safe.

## Hierarchy and component direction

1. Keep the window title/context and primary feature navigation stable.
2. Put search/filter controls directly above the current extraction collection.
3. Species discovery uses compact selectable rows/cards: 48–54px sprite well, species
   name as the scan anchor, Elements/eligible count/material balance as secondary facts.
4. The selected-species creature workspace keeps the species name/balance and Back/Change
   Species action in a stable toolbar above filters.
5. Individual Pokémon use compact selectable cards with visible selected edge/surface and
   the existing selection count immediately before the list/action area.
6. The permanent-extraction warning stays adjacent to the final extraction action.
7. Result feedback is static and concise; no full-screen decorative motion sequence.

Avoid adding nested cards around the species/creature lists. The lists are the workspace,
not cards inside another decorative dashboard shell.

## Shared filter / discovery grammar

The four remaining primary tabs share the same visual structure while retaining only the
controls their native contract actually provides:

1. Optional search row.
2. Optional select grid.
3. Optional checkbox/facet row.
4. Optional status/meta row.
5. Native result list or detail surface.

`Reroll IVs` uses Search plus its five native selects. `Extract` uses its native Search,
selects and quality facets; the exact select set varies between species and creature steps.
`Awakening` remains Search-only. `Exchange` has no complete native source-filter
API/state, so Better UI uses the shared discovery surface around the native material list
without adding Search, rarity facets or other client-side filters over the bounded source
load. Target radios, Units and transaction state remain native.

The persisted Reroll material-rarity spending policy is not a result-list filter. It remains
a separate native policy surface, although its checkbox/chip treatment may use the same
facet visual language.

Primary tab labels are centered within equal flexible tracks. At narrow width, the four
remaining tabs keep the existing 2×2 wrap with centered labels.

## States

- **Default card:** neutral `bg-2`/structural edge, readable identity and metadata.
- **Hover:** transient neutral/accent response only.
- **Selected individual:** `--ppbui-selected` structural edge plus surface change; the
  existing check/add affordance remains explicit.
- **Focus-visible:** independent 2px `--ppbui-focus` outline, including selected cards.
- **Protected:** warning/locked treatment with readable text; never opacity-only.
- **Disabled/busy:** native disabled semantics remain authoritative; no hover treatment.
- **Pending extraction:** static status/result surface blocks duplicate completion without
  ambient or cinematic motion.

## Responsive behavior

- At normal Geneticista width, species and creature collections may use two flexible
  columns when cards retain readable identity and facts.
- Collapse to one column at the collection's functional minimum rather than a generic
  device breakpoint.
- Filters use flexible tracks and stack before they cause horizontal overflow.
- Primary actions remain directly reachable; no primary workflow requires horizontal
  scrolling.
- Native primary tabs may scroll only if host-provided feature count cannot fit, but the
  removed Materials tab should reduce that pressure.

## Accessibility / interaction

- Preserve native `<button>`, `<input>`, `<select>` and confirmation semantics.
- Do not introduce positive `tabindex` or hover-only information.
- Selected state and keyboard focus remain visually independent.
- Search/select labels remain available through native accessible names; longer localized
  labels wrap/expand instead of shrinking below MASTER typography.
- After static extraction completion, native Continue/focus restoration remains intact.

## Design acceptance checks

1. `Genetic Materials` is absent without changing the order/semantics of remaining native
   primary actions.
2. Species cards can be scanned quickly by sprite/name and expose eligible/material facts
   without dense decorative chrome.
3. Active-species context remains obvious when choosing individual Pokémon.
4. Individual default/selected/protected/disabled/focus states are distinguishable without
   relying on color alone.
5. Search/filter/select-all/pagination/extract controls retain their native behaviors and
   stable spatial roles; checkbox/radio controls are never given text-input chrome.
6. Normal and narrow layouts have no clipped primary controls or root horizontal scroll.
7. Extraction produces static pending/result feedback with no cinematic animation.
8. Cleanup restores the native surface exactly where Better UI owned presentation/state.
9. Reroll, Extract, Awakening and Exchange use the shared filter/discovery hierarchy without
   fabricating unsupported semantic filters.
10. The four remaining primary tab labels are centered at normal width and in the narrow
    2×2 layout.
11. Exchange adds no source Search/select/facet controls that could imply completeness
    beyond the bounded native material load.
