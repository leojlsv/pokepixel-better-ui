"""Offline cache compatibility tests; never request the live Nayakoko site."""

import gzip
import tempfile
import unittest
from pathlib import Path
from unittest.mock import Mock, patch

from compact_cache import compact
from extractor import Fetcher


class FailingWrite:
    def __init__(self, wrapped):
        self.wrapped = wrapped
        self.name = wrapped.name

    def __enter__(self):
        self.wrapped.__enter__()
        return self

    def __exit__(self, *args):
        return self.wrapped.__exit__(*args)

    def write(self, data):
        self.wrapped.write(data[:3])
        raise OSError("injected disk write failure")


class CacheTest(unittest.TestCase):
    def test_existing_raw_cache_never_requests_network(self):
        with tempfile.TemporaryDirectory() as temporary:
            fetcher = Fetcher(Path(temporary), delay=0)
            page = fetcher._cache_path("https://fixture.invalid/pokemon/")
            page.write_bytes(b"original html")
            fetcher.session.get = Mock(side_effect=AssertionError("network called"))
            self.assertEqual(fetcher.get_bytes("https://fixture.invalid/pokemon/"), b"original html")

    def test_compacted_cache_preserves_bytes_without_network(self):
        with tempfile.TemporaryDirectory() as temporary:
            fetcher = Fetcher(Path(temporary), delay=0)
            page = fetcher._cache_path("https://fixture.invalid/pokemon/")
            raw = b"<html>" + b"a" * 1500 + b"</html>"
            page.write_bytes(raw)
            self.assertEqual(compact(Path(temporary), apply=False)[0], 1)
            self.assertEqual(page.read_bytes(), raw)
            self.assertEqual(compact(Path(temporary), apply=True)[0], 1)
            self.assertFalse(page.exists())
            self.assertEqual(gzip.decompress(page.with_name(page.name + ".gz").read_bytes()), raw)
            fetcher.session.get = Mock(side_effect=AssertionError("network called"))
            self.assertEqual(fetcher.get_bytes("https://fixture.invalid/pokemon/"), raw)

    def test_new_extensionless_response_is_compressed(self):
        with tempfile.TemporaryDirectory() as temporary:
            fetcher = Fetcher(Path(temporary), delay=0)
            body = b"<html>" + b"b" * 1800 + b"</html>"
            response = Mock(content=body)
            fetcher.session.get = Mock(return_value=response)
            self.assertEqual(fetcher.get_bytes("https://fixture.invalid/new/"), body)
            response.raise_for_status.assert_called_once()
            page = fetcher._cache_path("https://fixture.invalid/new/")
            self.assertFalse(page.exists())
            self.assertEqual(gzip.decompress(page.with_name(page.name + ".gz").read_bytes()), body)

    def test_interrupted_compaction_resumes_only_matching_archive(self):
        with tempfile.TemporaryDirectory() as temporary:
            directory = Path(temporary)
            page = directory / "fixture.bin"
            archived = directory / "fixture.bin.gz"
            page.write_bytes(b"data" * 1000)
            archived.write_bytes(gzip.compress(page.read_bytes()))
            self.assertEqual(compact(directory, apply=True)[0], 1)
            self.assertFalse(page.exists())
            self.assertEqual(gzip.decompress(archived.read_bytes()), b"data" * 1000)

            page.write_bytes(b"changed" * 1000)
            with self.assertRaises(RuntimeError):
                compact(directory, apply=True)
            self.assertTrue(page.exists())

    def test_interrupted_new_cache_write_never_publishes_partial_gzip(self):
        with tempfile.TemporaryDirectory() as temporary:
            fetcher = Fetcher(Path(temporary), delay=0)
            url = "https://fixture.invalid/new/"
            body = b"<html>" + b"c" * 1800 + b"</html>"
            fetcher.session.get = Mock(return_value=Mock(content=body))
            compressed = fetcher._cache_path(url).with_suffix(".bin.gz")
            with patch("extractor.os.replace", side_effect=OSError("interrupted")):
                with self.assertRaises(OSError):
                    fetcher.get_bytes(url)
            self.assertFalse(compressed.exists())
            self.assertEqual(list(Path(temporary).glob("*.tmp")), [])
            self.assertEqual(fetcher.get_bytes(url), body)
            self.assertEqual(gzip.decompress(compressed.read_bytes()), body)

    def test_bad_gzip_fails_explicitly_without_network(self):
        with tempfile.TemporaryDirectory() as temporary:
            fetcher = Fetcher(Path(temporary), delay=0)
            url = "https://fixture.invalid/invalid/"
            compressed = fetcher._cache_path(url).with_suffix(".bin.gz")
            compressed.write_bytes(b"truncated")
            fetcher.session.get = Mock(side_effect=AssertionError("network called"))
            with self.assertRaisesRegex(RuntimeError, "Corrupt cached page"):
                fetcher.get_bytes(url)
            fetcher.session.get.assert_not_called()

    def test_invalid_deflate_fails_explicitly_without_network(self):
        with tempfile.TemporaryDirectory() as temporary:
            fetcher = Fetcher(Path(temporary), delay=0)
            url = "https://fixture.invalid/invalid-deflate/"
            compressed = fetcher._cache_path(url).with_suffix(".bin.gz")
            content = bytearray(gzip.compress(b"some html" * 1000))
            content[12] ^= 0xFF
            compressed.write_bytes(content)
            fetcher.session.get = Mock(side_effect=AssertionError("network called"))
            with self.assertRaisesRegex(RuntimeError, "Corrupt cached page"):
                fetcher.get_bytes(url)
            fetcher.session.get.assert_not_called()

    def test_compaction_failure_keeps_source_and_allows_retry(self):
        with tempfile.TemporaryDirectory() as temporary:
            directory = Path(temporary)
            raw = directory / "fixture.bin"
            raw.write_bytes(b"page" * 1000)
            with patch("compact_cache.os.replace", side_effect=OSError("interrupted")):
                with self.assertRaises(OSError):
                    compact(directory, apply=True)
            self.assertTrue(raw.exists())
            self.assertEqual(list(directory.glob("*.tmp")), [])
            self.assertEqual(compact(directory, apply=True)[0], 1)
            self.assertFalse(raw.exists())

    def test_new_page_write_failure_closes_and_removes_partial_temp(self):
        with tempfile.TemporaryDirectory() as temporary:
            fetcher = Fetcher(Path(temporary), delay=0)
            url = "https://fixture.invalid/write-failure/"
            body = b"<html>" + b"d" * 1800
            fetcher.session.get = Mock(return_value=Mock(content=body))
            real_named_tempfile = tempfile.NamedTemporaryFile
            with patch("extractor.tempfile.NamedTemporaryFile", side_effect=lambda **kw: FailingWrite(real_named_tempfile(**kw))):
                with self.assertRaisesRegex(OSError, "injected disk write failure"):
                    fetcher.get_bytes(url)
            self.assertEqual(list(Path(temporary).glob("*.tmp")), [])
            self.assertFalse(fetcher._cache_path(url).with_suffix(".bin.gz").exists())

    def test_compaction_write_failure_preserves_original(self):
        with tempfile.TemporaryDirectory() as temporary:
            directory = Path(temporary)
            raw = directory / "original.bin"
            raw.write_bytes(b"page" * 1000)
            real_named_tempfile = tempfile.NamedTemporaryFile
            with patch("compact_cache.tempfile.NamedTemporaryFile", side_effect=lambda **kw: FailingWrite(real_named_tempfile(**kw))):
                with self.assertRaisesRegex(OSError, "injected disk write failure"):
                    compact(directory, apply=True)
            self.assertTrue(raw.exists())
            self.assertEqual(list(directory.glob("*.tmp")), [])
            self.assertFalse((directory / "original.bin.gz").exists())

    def test_cache_png_keeps_original_bytes(self):
        with tempfile.TemporaryDirectory() as temporary:
            fetcher = Fetcher(Path(temporary), delay=0)
            body = b"\x89PNG" + b"z" * 1800
            fetcher.session.get = Mock(return_value=Mock(content=body))
            self.assertEqual(fetcher.get_bytes("https://fixture.invalid/image.png"), body)
            page = fetcher._cache_path("https://fixture.invalid/image.png")
            self.assertEqual(page.read_bytes(), body)
            self.assertFalse(page.with_name(page.name + ".gz").exists())


if __name__ == "__main__":
    unittest.main()
