# Pokémon tags and filters

Status: fixed tags, shared filters and Trade integration implemented and validated
in game on `feature/pokemon-tags`. The generated userscript includes this scope.

## Fixed tags

One tag per individual Pokémon, shared across Backpack, Storage and the player's Trade cards/offers:

| ID | Name | Symbol | Color |
|---|---|---|---|
| leveling | Leveling | ^ | mist |
| pvp | PvP | ! | sand |
| pve | PvE | + | ivory |
| boss | Boss | # | sand |
| dungeons | Dungeons | > | mist |
| gyms | Gyms | = | ivory |
| farm | Farm | $ | sand |
| build | Build | ~ | mist |
| keep | Keep | @ | ivory |
| sell | Sell | % | sand |

Alt + left click opens a compact MASTER v2 PPBUI modal with the Pokémon name, current tag and ten options in two columns. Selecting replaces the existing tag; Remove clears it. Close/Escape cancels. The handler captures mouse/pointer events before native slot actions and suppresses a chained double-click, so tagging does not equip, transfer or add an offer. Normal clicks and right clicks retain native behavior. Only decorated own-Pokémon nodes are eligible in Trade.

Slots show a single neutral symbol without changing the rarity border; the title and Backpack list include the tag name. Organizational tags use only Miyazaki 16 mist/sand/ivory so they do not consume the reserved blue/cyan action, gold selection, green success/active or red danger semantics. Each tag color maintains at least 4.5:1 contrast on the dark tag surfaces. The modal is bounded by the viewport and uses the shared pixel scrollbar.

## Filters

Poké Filters remains the single advanced-filter surface. In Backpack its visible trigger is a button immediately to the right of Search; opening it selects the Pokémon category through the existing native/proxy category flow before exposing the fields. Trade keeps the disclosure presentation and Storage retains its native independent controls. Tag is directly after Gender and offers All, Untagged and the ten fixed tags. Rarity/element remain inside the advanced surface in Backpack and Trade. Existing level, IV, quality-multiplier and status filter behavior remains; the user-facing quality label is **`Min Quality`**. Better UI-created advanced-filter inputs/selects use the PPBUI field chrome even when hostile host rules attempt to restore host styling. Different filter types combine with AND. Native eligibility and offer payloads are untouched.

Backpack filtering now evaluates the complete set of already-loaded Backpack/Team Pokémon from the owning scene instead of inheriting only the host's visible Load More batch. It never requests more creatures from the server and never pulls Pokémon from Storage; if the native renderer still caps the visible batch after filtering, Better UI fills the remaining rows with the native `createSlot()` renderer and removes the Load More control only after the loaded filtered set is fully represented.

## Persistence and migration

The v2 key is ppbui:pokemon-tags:v2:<trainer-id>. Assignments remain arrays for storage compatibility but contain exactly one catalog ID. Trainer identity uses native WorldPresence/Auth getters; unknown identity disables assignment. No server writes or cross-device synchronization. Same-origin tabs receive storage updates; denied writes retain session state and show a warning.

On first v2 load, exact case-insensitive trimmed matches from v1 custom names are mapped to fixed IDs. Only unambiguous single matches are imported. Multiple conflicting matches and unmatched names are not guessed. The v1 key is never overwritten or deleted, preserving recovery data. A v2 snapshot prevents removed tags from being re-imported on reload.

## Integration and verification

Inventory and Storage own their integrations; Trade has a separately toggleable module. Scene adapters remain reversible and no global game/network APIs are patched. Tag edits never modify offer contents or transfer behavior.

Tests cover per-owner persistence, catalog enforcement, migration, missing data,
filter scope, native handlers, Alt-click isolation, replacement/removal/cancel
and owner changes during an open dialog. Local previews cover the modal and More
Filters. Backpack, Storage and Trade integration, including the latest Trade
layout/filter refinements and Pokémon hover toggle, were validated in game by
the user. Tags are organizational labels, not protection against sale or trade.
