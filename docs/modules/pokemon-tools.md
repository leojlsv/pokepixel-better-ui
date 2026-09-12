# Pokémon tags and filters

Status: fixed tags, shared filters and Trade integration implemented and validated
in game on `feature/pokemon-tags`. The generated userscript includes this scope.

## Fixed tags

One tag per individual Pokémon, shared across Backpack, Storage and the player's Trade cards/offers:

| ID | Name | Symbol | Color |
|---|---|---|---|
| leveling | Leveling | ^ | blue |
| pvp | PvP | ! | red |
| pve | PvE | + | green |
| boss | Boss | # | purple |
| dungeons | Dungeons | > | dark purple |
| gyms | Gyms | = | orange |
| farm | Farm | $ | yellow |
| build | Build | ~ | gray |
| keep | Keep | @ | gold |
| sell | Sell | % | light orange |

Alt + left click opens a compact native-styled modal with the Pokémon name, current tag and ten options in two columns. Selecting replaces the existing tag; Remove clears it. Close/Escape cancels. The handler captures mouse/pointer events before native slot actions and suppresses a chained double-click, so tagging does not equip, transfer or add an offer. Normal clicks and right clicks retain native behavior. Only decorated own-Pokémon nodes are eligible in Trade.

Slots show a single colored symbol without changing the rarity border; the title and Backpack list include the tag name. Dark purple and gray use legible values against the native dark background. The modal is bounded by the viewport and scrolls internally.

## Filters

Only More Filters remains as the added disclosure. Tag is directly after Gender and offers All, Untagged and the ten fixed tags. Rarity/element are inside that disclosure in Backpack and Trade; Storage retains its native independent controls. Existing level, IV, quality multiplier and status filters remain. Different filter types combine with AND. Native eligibility and offer payloads are untouched.

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
