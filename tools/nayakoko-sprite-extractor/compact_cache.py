"""Compact cached extensionless web pages while preserving their exact bytes.

Usage: python compact_cache.py <output-dir> [--apply]. The dry run reports
potential savings; --apply verifies every round-trip before removing raw files.
"""

from __future__ import annotations

import argparse
import gzip
import hashlib
import os
import tempfile
from pathlib import Path


def compact(cache: Path, *, apply: bool) -> tuple[int, int, int]:
    if not cache.is_dir() or cache.is_symlink():
        raise ValueError(f"Not an ordinary cache directory: {cache}")

    count, original_bytes, saved_bytes = 0, 0, 0
    for source in sorted(cache.glob("*.bin")):
        if not source.is_file() or source.is_symlink():
            raise ValueError(f"Unexpected cache entry: {source}")
        dest = source.with_name(source.name + ".gz")
        original = source.read_bytes()
        if dest.exists() or dest.is_symlink():
            if dest.is_symlink() or not dest.is_file() or gzip.decompress(dest.read_bytes()) != original:
                raise RuntimeError(f"Existing compressed cache differs: {dest}")
            if apply:
                source.unlink()
            count += 1
            original_bytes += len(original)
            saved_bytes += len(original)
            continue
        packed = gzip.compress(original, compresslevel=9, mtime=0)
        if len(packed) >= len(original):
            continue
        if gzip.decompress(packed) != original:
            raise RuntimeError(f"Round-trip mismatch for {source}")

        count += 1
        original_bytes += len(original)
        saved_bytes += len(original) - len(packed)
        if apply:
            temporary = None
            try:
                with tempfile.NamedTemporaryFile(
                    mode="wb", prefix=dest.name + ".", suffix=".tmp",
                    dir=cache, delete=False,
                ) as stream:
                    temporary = Path(stream.name)
                    stream.write(packed)
                if hashlib.sha256(gzip.decompress(temporary.read_bytes())).digest() != hashlib.sha256(original).digest():
                    raise RuntimeError(f"On-disk cache mismatch for {source}")
                os.replace(temporary, dest)
                source.unlink()
            finally:
                if temporary is not None:
                    temporary.unlink(missing_ok=True)
    return count, original_bytes, saved_bytes


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("output_dir", type=Path, help="Extractor output directory containing _source-cache")
    parser.add_argument("--apply", action="store_true", help="Perform verified compression")
    args = parser.parse_args()
    cache_dir = args.output_dir.resolve() / "_source-cache"
    number, size, saved = compact(cache_dir, apply=args.apply)
    print(f"{number} pages, {size:,} source bytes, {saved:,} bytes {'saved' if args.apply else 'potential savings'}. ")
