# PokemonDB Gen 7 sprite fetcher

Downloads validated PokemonDB PNGs for National Dex 001-251.

The output PNG is the exact downloaded file. The tool does not crop, resize,
recolor or reconstruct sprites.

## Source policy

The policy is restricted to Generation 7 assets:

1. Kanto: lets-go-pikachu-eevee/normal when available.
2. Otherwise: ultra-sun-ultra-moon/normal/1x when available.
3. Otherwise: sun-moon/icon.

The fallback is necessary because PokemonDB does not expose a Gen 7 battle
sprite for every transferable Gen 1/2 Pokemon. The Sun/Moon icon set fills
those gaps.

## Run

From the repository root:

    cd G:\pokepixel-better-ui\tools\pokemondb-sprite-fetcher

Small first batch:

    .\run.ps1 --range "1-25" --output output-001-025

Continue later:

    .\run.ps1 --range "26-50" --output output-026-050
    .\run.ps1 --range "51-75" --output output-051-075

Johto:

    .\run.ps1 --range "152-251" --output output-johto

Specific Pokemon:

    .\run.ps1 --numbers "6,25,149,152,248,251" --output output-check

Preview names and first-choice URLs without downloading sprite PNGs:

    .\run.ps1 --range "1-25" --dry-run --output output-preview

Selection is mandatory so running the script accidentally does not download
all 251 Pokemon.

## Output

    output-001-025/
      sprites/
        normal/
          001-bulbasaur.png
          002-ivysaur.png
          ...
          025-pikachu.png
      _source-cache/
      manifest.json

Each manifest record includes the exact PokemonDB URL, source family,
dimensions, alpha bounding box, file size and SHA-256.

The fetcher validates that the response is a real, non-empty PNG and verifies
that the bytes written to disk have the same SHA-256 as the downloaded bytes.

PokemonDB asks users not to hotlink its image CDN. These files are intended for
build-time download and local packaging, not runtime hotlinking.
