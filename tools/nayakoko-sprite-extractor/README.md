# Nayakoko Pokemon sprite extractor

Build-time utility for converting the canonical/first bead diagram from each
Nayakoko Pokemon page into a transparent pixel-art PNG.

Current scope: **National Dex 001-251 (Gen 1 + Gen 2)**.

## Source strategy

For each requested Dex number the tool:

1. reads the live Nayakoko Pokemon index once;
2. resolves the base Pokemon page for that number;
3. reads that page's canonical og:image;
4. downloads the clean diagram and its No companion;
5. reconstructs one pixel per bead using the 22x22 source grid;
6. saves a transparent PNG and records the exact source URLs in manifest.json.

Most source files really do follow:

    Pokemon-XXX-Name.png

For example:

    Pokemon-001-Bulbasaur.png
    Pokemon-004-Charmander.png
    Pokemon-152-Chikorita.png

The extractor intentionally does **not** hardcode that URL, because Gen 1/2 has
exceptions. Examples verified while building the tool:

    #201 Unown
    /wp-content/uploads/2021/08/Pokemon-201-Unown.png

    #251 Celebi
    /wp-content/uploads/2021/07/
    Pokemon-Perler-Beads-アイロンビーズ-図案-ポケモン-251-セレビィ-Celebi.png

Using each Pokemon page's canonical image gives the simple file when it exists
and still handles those exceptions automatically.

## Why the numbered companion is used

A clean diagram alone cannot distinguish an empty white cell from an intentional
white bead. Nayakoko also publishes a numbered companion using either:

    Pokemon-001-Bulbasaur-No.png

or:

    ..._No.png

The tool compares the clean and numbered images cell-by-cell to build the
occupancy mask, then takes the color from the clean image. That preserves real
white beads while removing the grid, labels and background.

## Run in small ranges

From the repository root:

    cd G:\pokepixel-better-ui\tools\nayakoko-sprite-extractor

Process the first ten:

    .\run.ps1 --range "1-10" --output output-001-010

Then continue later:

    .\run.ps1 --range "11-25" --output output-011-025
    .\run.ps1 --range "26-50" --output output-026-050

Johto only:

    .\run.ps1 --range "152-251" --output output-johto

All Gen 1 + Gen 2:

    .\run.ps1 --range "1-251" --output output-gen1-gen2

You can also request isolated Dex numbers:

    .\run.ps1 --numbers "1,6,149,201,248,251" --output output-picked

Preview a range without downloading Pokemon diagrams:

    .\run.ps1 --range "1-25" --dry-run --output output-preview

The range/number selection is mandatory on purpose, so running run.ps1
accidentally cannot start a 251-Pokemon batch.

## Output

Example:

    output-001-010/
      sprites/
        001-bulbasaur.png
        002-ivysaur.png
        003-venusaur.png
        ...
        010-caterpie.png
      _source-cache/
      manifest.json

The output file uses a stable Dex + English slug even when the original Nayakoko
filename contains Japanese text or other legacy naming.

manifest.json records:

- Dex number;
- Pokemon page URL;
- exact canonical source URL;
- exact numbered companion URL;
- raw extracted sprite dimensions;
- bead count;
- render scale;
- any per-Pokemon error.

HTTP responses are cached under <output>/_source-cache. Re-running the same
range against the same output directory resumes from the cache instead of
downloading completed sources again.

Extensionless source pages are stored as verified gzip (`*.bin.gz`) when this
saves space; the extractor also reads older raw `*.bin` files. To compact an
existing output without touching its sprites, PNG cache entries or manifest:

```powershell
python .\compact_cache.py output-kanto
python .\compact_cache.py output-kanto --apply
```

The dry run lists the aggregate savings; applying verifies gzip round-trips
before removing raw cached pages. Source URLs and extracted sprites stay intact.

## Useful options

Keep canonical assets at one pixel per bead:

    .\run.ps1 --range "1-25" --scale 1 --output output-001-025

Generate a nearest-neighbor 4x copy:

    .\run.ps1 --range "1-25" --scale 4 --output output-001-025-4x

Abort immediately if any Pokemon fails:

    .\run.ps1 --range "1-25" --strict --output output-strict

Without --strict, failures are recorded in manifest.json and the batch
continues.

## Better UI usage

Prefer --scale 1 for the canonical asset and scale it in CSS:

    .pokemon-bead-sprite {
      width: 96px;
      height: 96px;
      object-fit: contain;
      image-rendering: pixelated;
    }

This extractor is build-time only. Better UI should not fetch Nayakoko at
runtime.
