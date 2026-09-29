from __future__ import annotations

import argparse
import gzip
import hashlib
import io
import json
import os
import posixpath
import re
import sys
import tempfile
import time
import zlib
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable
from urllib.parse import urlsplit, urlunsplit

import numpy as np
import requests
from bs4 import BeautifulSoup
from PIL import Image
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry


INDEX_URL = "https://nayakoko.com/pokemon-perler-beads-matome/"
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153 Safari/537.36"
)

GEN2_LAST_DEX = 251


@dataclass(frozen=True)
class Entry:
    num: int
    name: str
    img: str
    url: str
    group_id: str


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
            allowed_methods=frozenset(("GET", "HEAD")),
            respect_retry_after_header=True,
        )
        self.session = requests.Session()
        self.session.headers.update(
            {
                "User-Agent": USER_AGENT,
                "Accept-Language": "en-US,en;q=0.9,ja;q=0.8",
            }
        )
        self.session.mount("https://", HTTPAdapter(max_retries=retry))
        self.session.mount("http://", HTTPAdapter(max_retries=retry))

    def _cache_path(self, url: str) -> Path:
        parts = urlsplit(url)
        suffix = Path(parts.path).suffix.lower() or ".bin"
        digest = hashlib.sha256(url.encode("utf-8")).hexdigest()
        return self.cache_dir / f"{digest}{suffix}"

    def _wait(self) -> None:
        if self.delay <= 0:
            return
        elapsed = time.monotonic() - self._last_request_at
        if elapsed < self.delay:
            time.sleep(self.delay - elapsed)

    def get_bytes(self, url: str, *, referer: str | None = None) -> bytes:
        cached = self._cache_path(url)
        if cached.exists():
            return cached.read_bytes()
        compressed = cached.with_name(cached.name + ".gz") if cached.suffix == ".bin" else None
        if compressed is not None and compressed.exists():
            try:
                return gzip.decompress(compressed.read_bytes())
            except (EOFError, OSError, zlib.error) as exc:
                raise RuntimeError(f"Corrupt cached page: {compressed}; remove it to fetch again") from exc

        self._wait()
        headers = {"Referer": referer} if referer else None
        response = self.session.get(url, headers=headers, timeout=self.timeout)
        self._last_request_at = time.monotonic()
        response.raise_for_status()
        if compressed is not None:
            payload = gzip.compress(response.content, compresslevel=9, mtime=0)
            if len(payload) < len(response.content):
                staging = None
                try:
                    with tempfile.NamedTemporaryFile(
                        mode="wb", prefix=compressed.name + ".", suffix=".tmp",
                        dir=self.cache_dir, delete=False,
                    ) as stream:
                        staging = Path(stream.name)
                        stream.write(payload)
                    if gzip.decompress(staging.read_bytes()) != response.content:
                        raise RuntimeError(f"Compressed cache write mismatch: {compressed}")
                    os.replace(staging, compressed)
                finally:
                    if staging is not None:
                        staging.unlink(missing_ok=True)
            else:
                cached.write_bytes(response.content)
        else:
            cached.write_bytes(response.content)
        return response.content

    def get_text(self, url: str, *, referer: str | None = None) -> str:
        data = self.get_bytes(url, referer=referer)
        return data.decode("utf-8", errors="replace")

    def try_get_bytes(self, url: str, *, referer: str | None = None) -> bytes | None:
        try:
            return self.get_bytes(url, referer=referer)
        except requests.HTTPError as exc:
            status = exc.response.status_code if exc.response is not None else None
            if status == 404:
                return None
            raise


def parse_index_data(html: str) -> list[Entry]:
    marker = "const DATA ="
    pos = html.find(marker)
    if pos < 0:
        raise RuntimeError("Embedded DATA array was not found on the index page.")

    array_pos = html.find("[", pos + len(marker))
    if array_pos < 0:
        raise RuntimeError("Embedded DATA array opening bracket was not found.")

    raw, _ = json.JSONDecoder().raw_decode(html[array_pos:])
    entries: list[Entry] = []
    for item in raw:
        try:
            entries.append(
                Entry(
                    num=int(item["num"]),
                    name=str(item["name"]),
                    img=str(item["img"]),
                    url=str(item["url"]),
                    group_id=str(item["id"]),
                )
            )
        except (KeyError, TypeError, ValueError) as exc:
            raise RuntimeError(f"Unexpected DATA record: {item!r}") from exc
    return entries


def group_entries(entries: Iterable[Entry]) -> list[list[Entry]]:
    groups: dict[str, list[Entry]] = defaultdict(list)
    for entry in entries:
        groups[entry.group_id].append(entry)

    def key(group: list[Entry]) -> tuple[int, int, str]:
        entry = group[0]
        match = re.fullmatch(r"(\d+)_(\d+)", entry.group_id)
        form = int(match.group(2)) if match else 9999
        return (entry.num, form, entry.group_id)

    return sorted(groups.values(), key=key)


def parse_numbers(value: str | None) -> set[int] | None:
    if not value:
        return None
    result: set[int] = set()
    for part in value.split(","):
        token = part.strip()
        if not token:
            continue
        if "-" in token:
            start_text, end_text = token.split("-", 1)
            start, end = int(start_text), int(end_text)
            if end < start:
                start, end = end, start
            result.update(range(start, end + 1))
        else:
            result.add(int(token))
    return result


def is_base_group(group_id: str, num: int) -> bool:
    return group_id == f"{num}_1"


def select_groups(
    entries: list[Entry], numbers: set[int] | None, limit: int | None
) -> list[list[Entry]]:
    selected: list[list[Entry]] = []
    for group in group_entries(entries):
        first = group[0]
        if not is_base_group(first.group_id, first.num):
            continue
        if numbers is not None and first.num not in numbers:
            continue
        selected.append(group)
        if limit is not None and len(selected) >= limit:
            break
    return selected


def image_candidates_from_page(html: str) -> list[str]:
    soup = BeautifulSoup(html, "html.parser")
    candidates: list[str] = []

    og = soup.select_one('meta[property="og:image"]')
    if og and og.get("content"):
        candidates.append(str(og["content"]))

    for selector in (".entry-content img[src]", "article img[src]", "img.eye-catch-image[src]"):
        for node in soup.select(selector):
            src = node.get("src")
            if src:
                candidates.append(str(src))

    seen: set[str] = set()
    unique: list[str] = []
    for url in candidates:
        if url in seen:
            continue
        seen.add(url)
        unique.append(url)
    return unique


def is_clean_full_png(url: str) -> bool:
    path = urlsplit(url).path.lower()
    if not path.endswith(".png"):
        return False
    if "_no.png" in path or "-no.png" in path:
        return False
    if re.search(r"-\d+x\d+\.png$", path):
        return False
    if "_tmb" in path:
        return False
    return "/wp-content/uploads/" in path


def resolve_canonical_url(entry: Entry, page_html: str) -> str:
    """Resolve the page's first/canonical bead diagram.

    Most Gen 1/2 pages use Pokemon-XXX-Name.png, but there are real exceptions
    in both upload month and filename. The page's og:image is therefore used as
    the authoritative source instead of guessing a URL.
    """
    soup = BeautifulSoup(page_html, "html.parser")
    og = soup.select_one('meta[property="og:image"]')
    if og and og.get("content"):
        url = str(og["content"])
        if is_clean_full_png(url):
            return url

    candidates = [url for url in image_candidates_from_page(page_html) if is_clean_full_png(url)]
    if not candidates:
        raise RuntimeError(f"No canonical full-size PNG found on {entry.url}")

    num3 = f"{entry.num:03d}"
    matching = [url for url in candidates if num3 in posixpath.basename(urlsplit(url).path)]
    return matching[0] if matching else candidates[0]


def make_numbered_urls(clean_url: str) -> list[str]:
    parts = urlsplit(clean_url)
    directory, filename = posixpath.split(parts.path)
    stem, suffix = posixpath.splitext(filename)
    candidates = []
    for separator in ("_", "-"):
        numbered_path = posixpath.join(directory, f"{stem}{separator}No{suffix}")
        if not numbered_path.startswith("/"):
            numbered_path = "/" + numbered_path
        candidates.append(
            urlunsplit((parts.scheme, parts.netloc, numbered_path, parts.query, parts.fragment))
        )
    return candidates


def find_numbered_urls(clean_url: str, page_html: str | None) -> list[str]:
    expected = make_numbered_urls(clean_url)
    if page_html is None:
        return expected

    expected_names = {posixpath.basename(urlsplit(url).path).lower() for url in expected}
    page_matches = [
        url
        for url in image_candidates_from_page(page_html)
        if posixpath.basename(urlsplit(url).path).lower() in expected_names
    ]
    # Prefer the exact page-discovered URL, but retain both naming conventions as
    # fallbacks. The site uses both `-No.png` and `_No.png` across generations.
    return list(dict.fromkeys(page_matches + expected))


def dominant_rgb(block: np.ndarray) -> tuple[int, int, int]:
    pixels = block.reshape(-1, 3)
    color, _ = Counter(map(tuple, pixels.tolist())).most_common(1)[0]
    return tuple(int(channel) for channel in color)


def extract_sprite(
    clean_bytes: bytes,
    numbered_bytes: bytes,
    *,
    cell_size: int,
    diff_threshold: int,
    min_diff_pixels: int,
) -> tuple[Image.Image, int]:
    clean = Image.open(io.BytesIO(clean_bytes)).convert("RGB")
    numbered = Image.open(io.BytesIO(numbered_bytes)).convert("RGB")
    if clean.size != numbered.size:
        raise RuntimeError(
            f"Clean/numbered size mismatch: {clean.size} vs {numbered.size}"
        )

    width, height = clean.size
    cols = width // cell_size
    rows = height // cell_size
    if cols < 2 or rows < 2:
        raise RuntimeError(f"Image is too small for {cell_size}px cells: {clean.size}")

    clean_array = np.asarray(clean, dtype=np.uint8)
    numbered_array = np.asarray(numbered, dtype=np.uint8)
    delta = np.abs(clean_array.astype(np.int16) - numbered_array.astype(np.int16)).max(
        axis=2
    )

    sprite = Image.new("RGBA", (cols, rows), (0, 0, 0, 0))
    opaque = 0
    for row in range(rows):
        y0, y1 = row * cell_size, (row + 1) * cell_size
        for col in range(cols):
            x0, x1 = col * cell_size, (col + 1) * cell_size
            diff_block = delta[y0:y1, x0:x1]
            changed = int(np.count_nonzero(diff_block > diff_threshold))
            if changed < min_diff_pixels:
                continue

            rgb = dominant_rgb(clean_array[y0:y1, x0:x1])
            sprite.putpixel((col, row), (*rgb, 255))
            opaque += 1

    if opaque == 0:
        raise RuntimeError(
            "No occupied bead cells were detected. The site grid or _No pairing may have changed."
        )

    alpha = sprite.getchannel("A")
    bbox = alpha.getbbox()
    if bbox is None:
        raise RuntimeError("Sprite mask unexpectedly has no bounding box.")
    return sprite.crop(bbox), opaque


def slugify_english(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return re.sub(r"-+", "-", slug)


def english_slug(entry: Entry) -> str:
    image_name = posixpath.basename(urlsplit(entry.img).path)
    image_match = re.match(
        rf"pokemon(?:-perler-beads)?-{entry.num:03d}-(.+?)(?:_tmb)?\.(?:png|jpe?g)$",
        image_name,
        re.IGNORECASE,
    )
    if image_match:
        slug = slugify_english(image_match.group(1))
        if slug:
            return slug

    path = urlsplit(entry.url).path.strip("/")
    match = re.fullmatch(
        rf"pokemon-perler-beads-{entry.num:03d}-(.+)",
        path,
        re.IGNORECASE,
    )
    if not match:
        return f"pokemon-{entry.num:03d}"
    return slugify_english(match.group(1))


def output_name(entry: Entry) -> str:
    dex = f"{entry.num:03d}" if entry.num < 1000 else str(entry.num)
    return f"{dex}-{english_slug(entry)}.png"


def save_sprite(sprite: Image.Image, path: Path, scale: int) -> tuple[int, int]:
    path.parent.mkdir(parents=True, exist_ok=True)
    rendered = sprite
    if scale > 1:
        rendered = sprite.resize(
            (sprite.width * scale, sprite.height * scale), Image.Resampling.NEAREST
        )
    rendered.save(path, "PNG", optimize=True)
    return sprite.size


def process_canonical(
    *,
    fetcher: Fetcher,
    entry: Entry,
    page_html: str,
    output_dir: Path,
    scale: int,
    cell_size: int,
    diff_threshold: int,
    min_diff_pixels: int,
) -> dict:
    clean_url = resolve_canonical_url(entry, page_html)

    clean_bytes = fetcher.get_bytes(clean_url, referer=entry.url)
    numbered_url = None
    numbered_bytes = None
    numbered_candidates = find_numbered_urls(clean_url, page_html)
    for candidate in numbered_candidates:
        candidate_bytes = fetcher.try_get_bytes(candidate, referer=entry.url)
        if candidate_bytes is not None:
            numbered_url = candidate
            numbered_bytes = candidate_bytes
            break
    if numbered_url is None or numbered_bytes is None:
        raise RuntimeError(
            "Numbered companion not found. Tried: "
            f"{', '.join(numbered_candidates)}. "
            "Accurate extraction is intentionally stopped because white beads cannot be "
            "distinguished from empty cells without the _No image."
        )

    sprite, bead_count = extract_sprite(
        clean_bytes,
        numbered_bytes,
        cell_size=cell_size,
        diff_threshold=diff_threshold,
        min_diff_pixels=min_diff_pixels,
    )
    filename = output_name(entry)
    relative_path = Path("sprites") / filename
    raw_size = save_sprite(sprite, output_dir / relative_path, scale)
    return {
        "path": relative_path.as_posix(),
        "source_url": clean_url,
        "numbered_url": numbered_url,
        "raw_size": [raw_size[0], raw_size[1]],
        "render_scale": scale,
        "bead_count": bead_count,
    }


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description=(
            "Extract the canonical Nayakoko Pokemon bead diagram as a transparent "
            "pixel-art PNG. Current scope: National Dex 001-251 (Gen 1-2)."
        )
    )
    parser.add_argument("--output", type=Path, default=Path("output"))
    selection = parser.add_mutually_exclusive_group(required=True)
    selection.add_argument(
        "--range",
        dest="range_spec",
        help='Inclusive Dex range, e.g. "1-25", "152-175", or "1-251".',
    )
    selection.add_argument(
        "--numbers",
        help='Explicit Dex numbers, e.g. "1,6,149,251".',
    )
    parser.add_argument("--limit", type=int, help="Process at most N selected groups.")
    parser.add_argument(
        "--scale",
        type=int,
        default=1,
        help="Nearest-neighbor output scale. 1 keeps one PNG pixel per bead.",
    )
    parser.add_argument("--delay", type=float, default=0.15, help="Delay between uncached HTTP requests.")
    parser.add_argument("--cell-size", type=int, default=22)
    parser.add_argument("--diff-threshold", type=int, default=20)
    parser.add_argument("--min-diff-pixels", type=int, default=3)
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Parse/group the live index and print what would be processed without downloading diagrams.",
    )
    parser.add_argument(
        "--strict",
        action="store_true",
        help="Abort on the first failed Pokemon instead of recording it in manifest.json.",
    )
    return parser


def main() -> int:
    # Windows PowerShell can expose a legacy cp1252 stdout even when the source and
    # manifest are UTF-8. The live index contains Japanese Pokemon labels, so make
    # console output deterministic instead of crashing while printing progress.
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    if hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")

    args = build_parser().parse_args()
    if args.scale < 1:
        raise SystemExit("--scale must be >= 1")
    if args.cell_size < 4:
        raise SystemExit("--cell-size is implausibly small")
    if args.limit is not None and args.limit < 1:
        raise SystemExit("--limit must be >= 1")

    output_dir = args.output.resolve()
    fetcher = Fetcher(output_dir / "_source-cache", delay=args.delay)

    print(f"Fetching index: {INDEX_URL}")
    index_html = fetcher.get_text(INDEX_URL)
    entries = parse_index_data(index_html)
    selection_spec = args.range_spec or args.numbers
    numbers = parse_numbers(selection_spec)
    if not numbers:
        raise SystemExit("No National Dex numbers were selected.")
    out_of_scope = sorted(number for number in numbers if number < 1 or number > GEN2_LAST_DEX)
    if out_of_scope:
        raise SystemExit(
            f"Current scope is National Dex 001-{GEN2_LAST_DEX}. "
            f"Out-of-scope values: {out_of_scope}"
        )
    groups = select_groups(entries, numbers, args.limit)

    found_numbers = {group[0].num for group in groups}
    missing_numbers = sorted(numbers - found_numbers)
    print(
        f"Index records: {len(entries)} | selected Pokemon: {len(groups)} | "
        f"Dex scope: {min(numbers):03d}-{max(numbers):03d}"
    )
    if missing_numbers:
        print(f"WARNING: Dex numbers not present in the live index: {missing_numbers}")

    if args.dry_run:
        for group in groups:
            first = group[0]
            print(f"#{first.num:03d} {english_slug(first)} -> {first.url}")
        return 0

    output_dir.mkdir(parents=True, exist_ok=True)
    manifest_entries: list[dict] = []
    failures = 0

    for index, group in enumerate(groups, start=1):
        first = group[0]
        label = f"[{index}/{len(groups)}] #{first.num:03d} {first.group_id} {first.name}"
        print(label)

        record = {
            "id": first.group_id,
            "dex": first.num,
            "name": first.name,
            "slug": english_slug(first),
            "page_url": first.url,
            "sprite": None,
            "errors": [],
        }

        try:
            page_html = fetcher.get_text(first.url, referer=INDEX_URL)
            result = process_canonical(
                fetcher=fetcher,
                entry=first,
                page_html=page_html,
                output_dir=output_dir,
                scale=args.scale,
                cell_size=args.cell_size,
                diff_threshold=args.diff_threshold,
                min_diff_pixels=args.min_diff_pixels,
            )
            record["sprite"] = result
            print(
                f"  sprite: {result['path']} "
                f"{result['raw_size'][0]}x{result['raw_size'][1]} "
                f"({result['bead_count']} beads)"
            )
        except Exception as exc:  # noqa: BLE001 - continue batch and report exact failures
            message = f"{type(exc).__name__}: {exc}"
            record["errors"].append(message)
            failures += 1
            print(f"  ERROR {message}", file=sys.stderr)
            if args.strict:
                raise

        manifest_entries.append(record)

    manifest = {
        "source": INDEX_URL,
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "scope": "National Dex 001-251 (Gen 1-2)",
        "selection": selection_spec,
        "source_strategy": "page og:image / canonical first diagram",
        "cell_size": args.cell_size,
        "render_scale": args.scale,
        "entries": manifest_entries,
        "summary": {
            "selected_pokemon": len(groups),
            "generated_sprites": sum(item["sprite"] is not None for item in manifest_entries),
            "missing_from_index": missing_numbers,
            "errors": failures,
        },
    }
    manifest_path = output_dir / "manifest.json"
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")

    print(
        f"Done. sprites={manifest['summary']['generated_sprites']} | "
        f"errors={failures}"
    )
    print(f"Manifest: {manifest_path}")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
