# Pokémon tags and filters

Status: implemented on feature/pokemon-tags; awaiting in-game validation. No production userscript build was regenerated.

## Scope

Backpack Pokémon category, each Storage column and the player's available Trade list use a common local tag service. Pokémon retain their labels when moving between Backpack and Storage because assignments use the individual creature ID, not species/name or slot position. Items are outside this scope.

Tags have a custom name (32 characters maximum) and one of six familiar game symbols. Up to 40 definitions are supported. The Edit tags disclosure offers an explicit Pokémon selector, assignments, creation, renaming/symbol changes and native confirmation for deletion. Multiple assignments are allowed. The slot shows one small marker plus + when needed; its title/accessible marker names list the tags. Backpack list view also shows tag names. Native slot events remain intact.

The same tag definitions and assignments are shared across the three panels and same-origin tabs. Persistence is localStorage under ppbui:pokemon-tags:v1:<trainer-id>. The identity comes from the native WorldPresence.getSelfTrainerId/Auth.getTrainerSummary contracts. Unknown identity disables editing until identified. Data is not sent to the server or other trade participant. No automatic cross-device synchronization. A denied write keeps session state with an explicit persistence warning. Tags are not protection against sale, release or trade.

## Filters

Rarity and element are offered in Backpack's Pokémon context and Trade. Storage retains its native rarity/element controls independently per column. Tag filters support any selected tag (OR), including Untagged. Distinct filter types combine with AND.

More filters contains inclusive level bounds, total IV minimum, quality multiplier minimum, shiny, locked and team states. Nature/gender options appear only when loaded strings are available. Missing numeric data does not count as zero. IV summation requires six complete values. These filters never reveal native-ineligible Trade candidates. Trade filters do not remove offered creatures or alter offer/confirmation payloads.

The native Backpack Clear filters and Storage Clear controls reset the corresponding Pokémon tools. Trade has a local reset. Search, native eligibility and sorting remain in force. Advanced disclosures show active counts and retain expansion while editing. Selecting items/all in Backpack leaves general inventory filtering unchanged.

## Architecture and limits

Shared model/UI live under src/modules/pokemon-tools; no feature code was added to core. Inventory and Storage own their integrations. A separately toggleable Trade module wraps only its local rendering methods. The reversible scene adapters do not patch global API/network methods, issue gameplay requests, change offers or clone actionable nodes.

Tag changes notify active panels; idle reconciliation does not serialize tags or rebuild tag controls. The persistent service listens for same-origin storage updates. Native internal render contracts remain an integration dependency; Trade decoration/filtering requires a matching candidate/card count and preserves the native list on mismatch.

The first version uses game-familiar text symbols, not uploaded bitmap icons. New copy has Portuguese and English localization, with English fallback for other languages. Existing native filter options retain game translations.

## Validation

Tests cover per-owner persistence, invalid/denied storage, assignment cleanup, AND/OR/untagged semantics, missing stats, native slot handlers, inventory scope and Trade offer preservation. Local previews use mock data with the native Backpack and Storage renderer. In-game checks remain necessary for three-view Backpack layout, cross-panel editing, cross-tab refresh, and Trade hover/offer states.
