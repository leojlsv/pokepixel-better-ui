# PM Gate — v0.2.203 reproducible release recovery

## Product decision and scope

- The Product Owner authorized integration and publication of `v0.2.202` on
  2026-10-15, after the exact cumulative Inventory 0.2.200, Card Mode 0.2.201
  and Hunt Favorites 0.2.202 candidates were validated in-game.
- Original approved `0.2.202` userscript: **1,698,772 bytes**, SHA-256
  `F7604CA6E745F291AE2584AFDE916DD09B3D675FE9F402A8DF42A2A21AED4B1A`.
- Public PR #7 passed CI and merged to `public/main` at `6cd54b8`. Both Windows
  working-tree and clean Windows checkout rebuilt that approved hash.
- Tag `v0.2.202` triggered a Linux GitHub Release build that instead published
  **1,696,242 bytes**, SHA-256
  `69E907547916174DB490D80D2CC84BD48287E8FDD04AF0C9F20DE7CADD05D9A5`.
  Despite workflow success, this did **not** satisfy PO binary acceptance.
- The incorrect release was changed to **Draft** immediately. Its existing tag,
  release and assets are preserved as an audit trail, not overwritten or reused.
  Same-version replacement could fail to update installations that saw the
  incorrect `@version 0.2.202`. The required recovery version is `0.2.203`.

## Root cause and corrective contract

- The exact compiled differences were four escaped CSS-string literals:
  `tokens.css`, `components.css`, `states.css`, `native-overrides.css`.
  Linux checkout normalized their CRLF input to LF, reducing the bundle by
  **222 + 1,552 + 522 + 234 = 2,530 bytes**. No gameplay logic changed.
- The previously integrated `.gitattributes` already protected mixed-ending
  `base.css` and `userscript/metadata.txt`; this recovery protects all four
  additional raw CSS files with `-text whitespace=cr-at-eol`.
- After copying the exact PO-approved CSS source bytes, a Windows build of
  `v0.2.202` reproduced `F7604CA6...AED4B1A` exactly.
- The replacement `v0.2.203` candidate is the **same runtime bytes** as the
  approved `v0.2.202` script except for two substitutions:
  `// @version 0.2.202 → 0.2.203` and the embedded `buildVersion` literal.
  Both versions contain the same metadata URLs, code, gameplay behavior and UI.
- Expected new candidate: **1,698,772 bytes**, SHA-256
  `D7E6F662C426E9328E259134EAF12369B1A6145A9C32AB509033CE21131D8C0C`.
- New `userscript/release-lock.json` contains version and the expected exact
  SHA-256. `npm run release:check` reads the built artifact **as bytes**, rejects
  a wrong version/hash and runs on both PR/`main` CI and the tag release workflow.
  No tag may publish an artifact that differs from the locked candidate.

## Acceptance and gates

| Criterion | Evidence / owner | State |
| --- | --- | --- |
| Approved 0.2.202 code not changed | Byte-for-byte comparison after the two version substitutions | `PASS` locally |
| Linux and Windows checkout reproduce identical inputs | Git `.gitattributes` raw CSS and metadata blob checks | `pending fresh checkout` |
| New release lock prevents wrong asset | `release:check` SHA/version verification, negative hash test | `pending` |
| Existing functional regressions retained | Full npm tests, build, audit and metadata checks | `pending` |
| Replacement v0.2.203 exact artifact accepted by PO | New version-only candidate hash + explicit Human Owner approval | `PENDING PO` |
| Public release, correct three assets and checksum | Tag on main after approval; inspect downloaded GitHub Release assets | `NOT AUTHORIZED YET` |

## Governance

The prior PO approval remains valid for the exact `0.2.202` script content.
Changing the release version changes two bytes of the new candidate and creates
a **different exact artifact**; the PO must explicitly authorize publishing
`0.2.203` instead of the originally requested `0.2.202`. Until then, keep the
public `v0.2.202` release Draft and do not create/push any `v0.2.203` tag.
