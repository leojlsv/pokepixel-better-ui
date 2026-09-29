from __future__ import annotations

import argparse
import hashlib
import io
import json
import sys
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup
from PIL import Image
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry


INDEX_URL = "https://pokemondb.net/sprites"
IMAGE_ROOT = "https://img.pokemondb.net/sprites"
MAX_DEX = 251
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153 Safari/537.36"
)


@dataclass(frozen=True)
class Pokemon:
    dex: int
    slug: str
    name: str


@dataclass(frozen=True)
class Candidate:
    family: str
    url: str


class Fetcher:
    def __init__(self, cache_dir: Path, delay: float, timeout: float = 30.0) -> None:
        self.cache_dir = cache_dir
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.delay = max(0.0, delay)
        self.timeout = timeout
        self._last_request_at = 0.0
        retry = Retry(
            total=4,
            connect=4,
            read=4,
            status=4,
            backoff_factor=0.5,
            status_forcelist=(429, 500, 502, 503, 504),
            allowed_methods=frozenset(("GET",)),
            respect_retry_after_header=True,
        )
        self.session = requests.Session()
        self.session.headers.update(
            {
                "User-Agent": USER_AGENT,
                "Accept-Language": "en-US,en;q=0.9",
            }
        )
        self.session.mount("https://", HTTPAdapter(max_retries=retry))

    def _cache_path(self, url: str) -> Path:
        suffix = Path(url.split("?", 1)[0]).suffix.lower() or ".bin"
        digest = hashlib.sha256(url.encode("utf-8")).hexdigest()
        return self.cache_dir / f"{digest}{suffix}"

    def _wait(self) -> None:
        elapsed = time.monotonic() - self._last_request_at
        if elapsed < self.delay:
            time.sleep(self.delay - elapsed)

    def get(self, url: str, *, referer: str | None = None) -> tuple[bytes, str]:
        cached = self._cache_path(url)
        meta = cached.with_suffix(cached.suffix + ".json")
        if cached.exists() and meta.exists():
            metadata = json.loads(meta.read_text(encoding="utf-8"))
            return cached.read_bytes(), str(metadata.get("content_type", ""))

        self._wait()
        headers = {"Referer": referer} if referer else None
        response = self.session.get(url, headers=headers, timeout=self.timeout)
        self._last_request_at = time.monotonic()
        response.raise_for_status()
        content_type = response.headers.get("Content-Type", "")
        cached.write_bytes(response.content)
        meta.write_text(
            json.dumps({"url": url, "content_type": content_type}, indent=2),
            encoding="utf-8",
        )
        return response.content, content_type

    def try_get(self, url: str, *, referer: str | None = None) -> tuple[bytes, str] | None:
        try:
            return self.get(url, referer=referer)
        except requests.HTTPError as exc:
            status = exc.response.status_code if exc.response is not None else None
            if status == 404:
                return None
            raise


def parse_selection(value: str) -> set[int]:
    result: set[int] = set()
    for raw in value.split(","):
        token = raw.strip()
        if not token:
            continue
        if "-" in token:
            left, right = token.split("-", 1)
            start, end = int(left), int(right)
            if end < start:
                start, end = end, start
            result.update(range(start, end + 1))
        else:
            result.add(int(token))
    return result


def parse_index(html: str) -> list[Pokemon]:
    soup = BeautifulSoup(html, "html.parser")
    cards: list[tuple[str, str]] = []
    seen: set[str] = set()
    for anchor in soup.select('a.infocard[href^="/sprites/"]'):
        href = str(anchor.get("href", ""))
        slug = href.removeprefix("/sprites/").strip("/")
        if not slug or "/" in slug or slug in seen:
            continue
        seen.add(slug)
        cards.append((slug, anchor.get_text(" ", strip=True)))

    if len(cards) < MAX_DEX:
        raise RuntimeError(
            f"PokemonDB sprite index returned only {len(cards)} Pokemon cards; "
            f"expected at least {MAX_DEX}."
        )
    return [
        Pokemon(dex=index, slug=slug, name=name)
        for index, (slug, name) in enumerate(cards[:MAX_DEX], start=1)
    ]


def source_candidates(pokemon: Pokemon) -> list[Candidate]:
    slug = pokemon.slug
    candidates: list[Candidate] = []
    if pokemon.dex <= 151:
        candidates.append(
            Candidate(
                "lets-go-pikachu-eevee",
                f"{IMAGE_ROOT}/lets-go-pikachu-eevee/normal/{slug}.png",
            )
        )
    candidates.extend(
        [
            Candidate(
                "ultra-sun-ultra-moon",
                f"{IMAGE_ROOT}/ultra-sun-ultra-moon/normal/1x/{slug}.png",
            ),
            Candidate(
                "sun-moon-icon",
                f"{IMAGE_ROOT}/sun-moon/icon/{slug}.png",
            ),
        ]
    )
    return candidates


def validate_png(data: bytes, content_type: str) -> dict:
    if not data.startswith(b"\x89PNG\r\n\x1a\n"):
        raise RuntimeError("Response is not a PNG file.")
    if content_type and "image/png" not in content_type.lower():
        raise RuntimeError(f"Unexpected content type: {content_type}")

    image = Image.open(io.BytesIO(data))
    image.load()
    if image.format != "PNG":
        raise RuntimeError(f"Pillow decoded {image.format}, expected PNG.")
    rgba = image.convert("RGBA")
    bbox = rgba.getchannel("A").getbbox()
    if bbox is None:
        raise RuntimeError("PNG has no visible pixels.")
    return {
        "width": image.width,
        "height": image.height,
        "mode": image.mode,
        "alpha_bbox": list(bbox),
        "sha256": hashlib.sha256(data).hexdigest(),
        "bytes": len(data),
    }


def choose_source(fetcher: Fetcher, pokemon: Pokemon) -> tuple[Candidate, bytes, dict]:
    page_url = f"https://pokemondb.net/sprites/{pokemon.slug}"
    attempts = []
    for candidate in source_candidates(pokemon):
        attempts.append(candidate.url)
        fetched = fetcher.try_get(candidate.url, referer=page_url)
        if fetched is None:
            continue
        data, content_type = fetched
        metadata = validate_png(data, content_type)
        metadata["attempted_urls"] = attempts.copy()
        return candidate, data, metadata
    raise RuntimeError(
        "No approved Gen 7 PokemonDB sprite source found. Tried: "
        + ", ".join(attempts)
    )


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description=(
            "Download validated Gen 7 PokemonDB sprites for National Dex 001-251. "
            "Source PNG bytes are saved unchanged."
        )
    )
    selection = parser.add_mutually_exclusive_group(required=True)
    selection.add_argument("--range", dest="range_spec")
    selection.add_argument("--numbers")
    parser.add_argument("--output", type=Path, default=Path("output"))
    parser.add_argument("--delay", type=float, default=0.10)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--strict", action="store_true")
    return parser


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    if hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")

    args = build_parser().parse_args()
    selection_spec = args.range_spec or args.numbers
    numbers = parse_selection(selection_spec)
    if not numbers:
        raise SystemExit("No National Dex numbers selected.")
    invalid = sorted(number for number in numbers if number < 1 or number > MAX_DEX)
    if invalid:
        raise SystemExit(f"Current scope is National Dex 001-{MAX_DEX}; invalid: {invalid}")

    output = args.output.resolve()
    output.mkdir(parents=True, exist_ok=True)
    fetcher = Fetcher(output / "_source-cache", delay=args.delay)
    index_data, _ = fetcher.get(INDEX_URL)
    pokemon = parse_index(index_data.decode("utf-8", errors="replace"))
    selected = [item for item in pokemon if item.dex in numbers]

    print(
        f"PokemonDB index: {len(pokemon)} Pokemon in scope | selected: {len(selected)} | "
        f"Dex {min(numbers):03d}-{max(numbers):03d}"
    )
    print("Policy: Let's Go (Kanto) -> Ultra Sun/Ultra Moon -> Sun/Moon icon")

    if args.dry_run:
        for item in selected:
            print(f"#{item.dex:03d} {item.slug}: {source_candidates(item)[0].url}")
        return 0

    sprites_dir = output / "sprites" / "normal"
    sprites_dir.mkdir(parents=True, exist_ok=True)
    records: list[dict] = []
    failures = 0

    for index, item in enumerate(selected, start=1):
        print(f"[{index}/{len(selected)}] #{item.dex:03d} {item.slug}")
        record: dict = {
            "dex": item.dex,
            "name": item.name,
            "slug": item.slug,
            "page_url": f"https://pokemondb.net/sprites/{item.slug}",
            "status": "error",
        }
        try:
            candidate, data, metadata = choose_source(fetcher, item)
            filename = f"{item.dex:03d}-{item.slug}.png"
            path = sprites_dir / filename
            path.write_bytes(data)
            persisted_hash = hashlib.sha256(path.read_bytes()).hexdigest()
            if persisted_hash != metadata["sha256"]:
                raise RuntimeError("Persisted PNG hash differs from downloaded PNG hash.")
            record.update(
                {
                    "status": "ok",
                    "path": path.relative_to(output).as_posix(),
                    "source_family": candidate.family,
                    "source_url": candidate.url,
                    **metadata,
                }
            )
            print(
                f"  {candidate.family}: {metadata['width']}x{metadata['height']} "
                f"sha256={metadata['sha256'][:12]}..."
            )
        except Exception as exc:
            failures += 1
            record["error"] = f"{type(exc).__name__}: {exc}"
            print(f"  ERROR {record['error']}", file=sys.stderr)
            if args.strict:
                raise
        records.append(record)

    family_counts: dict[str, int] = {}
    for record in records:
        family = record.get("source_family")
        if family:
            family_counts[family] = family_counts.get(family, 0) + 1

    manifest = {
        "source": "PokemonDB",
        "index_url": INDEX_URL,
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "scope": "National Dex 001-251",
        "selection": selection_spec,
        "policy": [
            "lets-go-pikachu-eevee for Kanto when available",
            "ultra-sun-ultra-moon normal 1x when available",
            "sun-moon icon as Gen 7 fallback",
        ],
        "transformation": "none; downloaded PNG bytes are persisted unchanged",
        "records": records,
        "summary": {
            "requested": len(selected),
            "downloaded": sum(record["status"] == "ok" for record in records),
            "errors": failures,
            "source_families": family_counts,
        },
    }
    manifest_path = output / "manifest.json"
    manifest_path.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(
        f"Done. downloaded={manifest['summary']['downloaded']} "
        f"errors={failures} families={family_counts}"
    )
    print(f"Manifest: {manifest_path}")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
