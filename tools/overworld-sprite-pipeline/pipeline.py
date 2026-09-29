from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import sys
import zipfile
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image, ImageDraw


GRID_SIZE = 4
CELL_SIZE = 64
SHEET_SIZE = GRID_SIZE * CELL_SIZE
VARIANTS = (
    "transfer-v0",
    "transfer-v1",
    "transfer-v2",
    "transfer-v3",
    "authored-v4",
    "authored-v5",
    "strict-pose-v6",
    "style-v7",
)
DEFAULT_ZIP = Path("../nayakoko-sprite-extractor/All 721 Pokemon Overworlds by Aerun.zip")
DEFAULT_WORK = Path("../../work/overworld-sprite-poc")
LAYOUT_PATH = Path(__file__).with_name("poc-layout.json")
TRANSFER_V0_PALETTE_PATH = Path(__file__).with_name("transfer-v0-palettes.json")
TRANSFER_V1_CONFIG_PATH = Path(__file__).with_name("transfer-v1-config.json")
TRANSFER_V2_CONFIG_PATH = Path(__file__).with_name("transfer-v2-config.json")
TRANSFER_V3_CONFIG_PATH = Path(__file__).with_name("transfer-v3-config.json")


@dataclass(frozen=True)
class PokemonSpec:
    dex: int
    slug: str

    @property
    def dex3(self) -> str:
        return f"{self.dex:03d}"

    @property
    def basename(self) -> str:
        return f"{self.dex3}-{self.slug}"


POC_SPECIES = {
    6: PokemonSpec(6, "charizard"),
    59: PokemonSpec(59, "arcanine"),
}


def parse_numbers(value: str) -> list[int]:
    values: set[int] = set()
    for raw in value.split(","):
        token = raw.strip()
        if not token:
            continue
        if "-" in token:
            left, right = token.split("-", 1)
            start, end = int(left), int(right)
            if end < start:
                start, end = end, start
            values.update(range(start, end + 1))
        else:
            values.add(int(token))
    return sorted(values)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def load_layout() -> dict:
    return json.loads(LAYOUT_PATH.read_text(encoding="utf-8"))


def direction_for_row(row: int) -> str:
    layout = load_layout()
    match = next(item for item in layout["rows"] if item["index"] == row)
    return str(match["direction"])


def phase_for_col(col: int) -> str:
    layout = load_layout()
    match = next(item for item in layout["cycle"] if item["index"] == col)
    return str(match["phase"])


def load_transfer_v0_palette(spec: PokemonSpec) -> dict[tuple[int, int, int], tuple[int, int, int]]:
    raw = json.loads(TRANSFER_V0_PALETTE_PATH.read_text(encoding="utf-8"))
    species = raw.get(spec.dex3)
    if not species:
        raise RuntimeError(f"No transfer-v0 palette configured for #{spec.dex3}")
    mapping = {}
    for source, target in species.items():
        source_rgb = tuple(int(part) for part in source.split(","))
        target_rgb = tuple(int(part) for part in target.split(","))
        mapping[source_rgb] = target_rgb
    return mapping


def opaque_palette(image: Image.Image) -> set[tuple[int, int, int]]:
    rgba = image.convert("RGBA")
    return {
        (r, g, b)
        for r, g, b, a in rgba.get_flattened_data()
        if a > 0
    }


def alpha_bytes(image: Image.Image) -> bytes:
    return image.convert("RGBA").getchannel("A").tobytes()


def load_transfer_v1_config(spec: PokemonSpec) -> dict:
    raw = json.loads(TRANSFER_V1_CONFIG_PATH.read_text(encoding="utf-8"))
    config = raw.get(spec.dex3)
    if not config:
        raise RuntimeError(f"No transfer-v1 config for #{spec.dex3}")
    return config


def load_transfer_v2_config(spec: PokemonSpec) -> dict:
    raw = json.loads(TRANSFER_V2_CONFIG_PATH.read_text(encoding="utf-8"))
    config = raw.get(spec.dex3)
    if not config:
        raise RuntimeError(f"No transfer-v2 config for #{spec.dex3}")
    return config


def pixelate_to_size(image: Image.Image, size: tuple[int, int], block: int) -> Image.Image:
    if block <= 1:
        return image.resize(size, Image.Resampling.NEAREST)
    coarse = (max(1, size[0] // block), max(1, size[1] // block))
    reduced = image.resize(coarse, Image.Resampling.NEAREST)
    return reduced.resize(size, Image.Resampling.NEAREST)


def load_transfer_v3_config(spec: PokemonSpec) -> dict | None:
    raw = json.loads(TRANSFER_V3_CONFIG_PATH.read_text(encoding="utf-8"))
    return raw.get(spec.dex3)


def band_warp_frame(
    frame: Image.Image,
    *,
    target_height: int,
    bands: list[dict],
    center_x: float,
    baseline_y: int,
) -> Image.Image:
    cropped = crop_alpha(frame)
    base_width = cropped.width
    resized = cropped.resize((base_width, target_height), Image.Resampling.NEAREST)
    source = resized.convert("RGBA")
    output = Image.new("RGBA", (CELL_SIZE, target_height), (0, 0, 0, 0))

    for y in range(target_height):
        normalized = y / max(1, target_height - 1)
        band = next(
            (item for item in bands if float(item["from"]) <= normalized < float(item["to"])),
            bands[-1],
        )
        row = source.crop((0, y, source.width, y + 1))
        row_bbox = row.getchannel("A").getbbox()
        if row_bbox is None:
            continue
        row_crop = row.crop(row_bbox)
        target_width = min(
            CELL_SIZE - 2,
            max(1, round(row_crop.width * float(band["scale_x"]))),
        )
        row_scaled = row_crop.resize((target_width, 1), Image.Resampling.NEAREST)
        x = round(center_x - (target_width - 1) / 2)
        output.alpha_composite(row_scaled, (x, y))

    return place_frame(crop_alpha(output), center_x=center_x, baseline_y=baseline_y)


def crop_alpha(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    bbox = rgba.getchannel("A").getbbox()
    if bbox is None:
        raise RuntimeError("Image has no visible pixels")
    return rgba.crop(bbox)


def place_frame(sprite: Image.Image, *, center_x: float, baseline_y: int) -> Image.Image:
    canvas = Image.new("RGBA", (CELL_SIZE, CELL_SIZE), (0, 0, 0, 0))
    x = round(center_x - (sprite.width - 1) / 2)
    y = baseline_y - sprite.height + 1
    canvas.alpha_composite(sprite, (x, y))
    return canvas


def resize_frame_bbox(frame: Image.Image, size: tuple[int, int], *, center_x: float, baseline_y: int) -> Image.Image:
    cropped = crop_alpha(frame)
    resized = cropped.resize(size, Image.Resampling.NEAREST)
    return place_frame(resized, center_x=center_x, baseline_y=baseline_y)


def shift_frame(frame: Image.Image, dy: int) -> Image.Image:
    canvas = Image.new("RGBA", frame.size, (0, 0, 0, 0))
    canvas.alpha_composite(frame, (0, dy))
    return canvas


def nearest_opaque_color(image: Image.Image, x: int, y: int, radius: int = 5) -> tuple[int, int, int, int]:
    pixels = image.load()
    for distance in range(1, radius + 1):
        for yy in range(max(0, y - distance), min(image.height, y + distance + 1)):
            for xx in range(max(0, x - distance), min(image.width, x + distance + 1)):
                pixel = pixels[xx, yy]
                if pixel[3] > 0:
                    return pixel
    return (0, 0, 0, 255)


def apply_aerun_motion_delta(base: Image.Image, ref_a: Image.Image, ref_b: Image.Image) -> Image.Image:
    result = base.copy().convert("RGBA")
    a_alpha = ref_a.convert("RGBA").getchannel("A")
    b_alpha = ref_b.convert("RGBA").getchannel("A")
    base_alpha = result.getchannel("A")
    a = a_alpha.load()
    b = b_alpha.load()
    out = result.load()
    base_mask = base_alpha.load()

    removals = []
    additions = []
    for y in range(CELL_SIZE):
        for x in range(CELL_SIZE):
            a_on = a[x, y] > 0
            b_on = b[x, y] > 0
            if a_on and not b_on:
                removals.append((x, y))
            elif b_on and not a_on:
                additions.append((x, y))

    # Motion deltas are deliberately conservative: remove only where the donor
    # currently has pixels; add only next to the existing donor silhouette.
    for x, y in removals:
        if base_mask[x, y] > 0:
            out[x, y] = (0, 0, 0, 0)
    for x, y in additions:
        if base_mask[x, y] == 0:
            nearby = False
            for yy in range(max(0, y - 1), min(CELL_SIZE, y + 2)):
                for xx in range(max(0, x - 1), min(CELL_SIZE, x + 2)):
                    if base_mask[xx, yy] > 0:
                        nearby = True
                        break
                if nearby:
                    break
            if nearby:
                out[x, y] = nearest_opaque_color(result, x, y)
    return result


def sheet_frame(sheet: Image.Image, row: int, col: int) -> Image.Image:
    return sheet.crop(
        (
            col * CELL_SIZE,
            row * CELL_SIZE,
            (col + 1) * CELL_SIZE,
            (row + 1) * CELL_SIZE,
        )
    )


def set_sheet_frame(sheet: Image.Image, row: int, col: int, frame: Image.Image) -> None:
    sheet.alpha_composite(frame, (col * CELL_SIZE, row * CELL_SIZE))


def ensure_rgba_sheet(path: Path) -> Image.Image:
    image = Image.open(path).convert("RGBA")
    if image.size != (SHEET_SIZE, SHEET_SIZE):
        raise RuntimeError(
            f"{path.name}: expected {SHEET_SIZE}x{SHEET_SIZE}, got {image.size[0]}x{image.size[1]}"
        )
    return image


def extract_aerun_reference(zip_path: Path, spec: PokemonSpec, output: Path) -> Path:
    member = f"Pokemon/{spec.dex3}_0.png"
    with zipfile.ZipFile(zip_path) as archive:
        try:
            data = archive.read(member)
        except KeyError as exc:
            raise RuntimeError(f"Aerun archive does not contain {member}") from exc
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_bytes(data)
    ensure_rgba_sheet(output)
    return output


def locate_pokemondb_source(root: Path, spec: PokemonSpec) -> Path:
    candidates = [
        root / "sprites" / "normal" / f"{spec.basename}.png",
        root / "normal" / f"{spec.basename}.png",
        root / f"{spec.basename}.png",
    ]
    for candidate in candidates:
        if candidate.exists():
            return candidate
    raise RuntimeError(
        f"PokemonDB source not found for #{spec.dex3}. Tried: "
        + ", ".join(str(path) for path in candidates)
    )


def copy_pokemondb_reference(source_root: Path, spec: PokemonSpec, output: Path) -> Path:
    source = locate_pokemondb_source(source_root, spec)
    output.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(source, output)
    with Image.open(output) as image:
        image.verify()
    return output


def pokemondb_provenance(source_root: Path, spec: PokemonSpec) -> dict:
    manifest_path = source_root / "manifest.json"
    if not manifest_path.exists():
        return {"manifest": None, "source_url": None, "source_family": None}
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    record = next(
        (item for item in manifest.get("records", []) if item.get("dex") == spec.dex),
        None,
    )
    if record is None:
        return {"manifest": "manifest.json", "source_url": None, "source_family": None}
    return {
        "manifest": "manifest.json",
        "source_url": record.get("source_url"),
        "source_family": record.get("source_family"),
        "upstream_sha256": record.get("sha256"),
    }


def frame_metrics(frame: Image.Image, row: int, col: int) -> dict:
    alpha = frame.getchannel("A")
    bbox = alpha.getbbox()
    if bbox is None:
        return {
            "row": row,
            "col": col,
            "occupied": False,
            "bbox": None,
            "opaque_pixels": 0,
            "baseline_y": None,
            "center_x": None,
        }

    histogram = alpha.histogram()
    transparent = histogram[0]
    total = CELL_SIZE * CELL_SIZE
    opaqueish = total - transparent
    left, top, right, bottom = bbox
    return {
        "row": row,
        "col": col,
        "occupied": True,
        "bbox": [left, top, right, bottom],
        "opaque_pixels": opaqueish,
        "baseline_y": bottom - 1,
        "center_x": (left + right - 1) / 2,
        "width": right - left,
        "height": bottom - top,
    }


def split_sheet(sheet_path: Path, frames_dir: Path) -> list[dict]:
    image = ensure_rgba_sheet(sheet_path)
    frames_dir.mkdir(parents=True, exist_ok=True)
    metrics = []
    for row in range(GRID_SIZE):
        for col in range(GRID_SIZE):
            box = (
                col * CELL_SIZE,
                row * CELL_SIZE,
                (col + 1) * CELL_SIZE,
                (row + 1) * CELL_SIZE,
            )
            frame = image.crop(box)
            frame_path = frames_dir / f"r{row}-f{col}.png"
            frame.save(frame_path, "PNG")
            item = frame_metrics(frame, row, col)
            item["path"] = frame_path.name
            metrics.append(item)
    return metrics


def make_contact_sheet(sheet_path: Path, output: Path, scale: int = 4) -> None:
    image = ensure_rgba_sheet(sheet_path)
    label_h = 22
    margin = 8
    scaled_cell = CELL_SIZE * scale
    width = margin * 2 + GRID_SIZE * scaled_cell
    height = margin * 2 + GRID_SIZE * (scaled_cell + label_h)
    canvas = Image.new("RGBA", (width, height), (24, 24, 24, 255))
    draw = ImageDraw.Draw(canvas)

    for row in range(GRID_SIZE):
        for col in range(GRID_SIZE):
            frame = image.crop(
                (
                    col * CELL_SIZE,
                    row * CELL_SIZE,
                    (col + 1) * CELL_SIZE,
                    (row + 1) * CELL_SIZE,
                )
            ).resize((scaled_cell, scaled_cell), Image.Resampling.NEAREST)
            x = margin + col * scaled_cell
            y = margin + row * (scaled_cell + label_h)
            checker = Image.new("RGBA", (scaled_cell, scaled_cell), (240, 240, 240, 255))
            checker_draw = ImageDraw.Draw(checker)
            tile = max(8, 8 * scale)
            for yy in range(0, scaled_cell, tile):
                for xx in range(0, scaled_cell, tile):
                    if ((xx // tile) + (yy // tile)) % 2:
                        checker_draw.rectangle(
                            (xx, yy, min(xx + tile - 1, scaled_cell - 1), min(yy + tile - 1, scaled_cell - 1)),
                            fill=(210, 210, 210, 255),
                        )
            checker.alpha_composite(frame)
            canvas.alpha_composite(checker, (x, y))
            draw.rectangle((x, y, x + scaled_cell - 1, y + scaled_cell - 1), outline=(90, 90, 90, 255))
            draw.text(
                (x + 4, y + scaled_cell + 3),
                f"{direction_for_row(row)} / {phase_for_col(col)}",
                fill=(255, 255, 255, 255),
            )

    output.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(output, "PNG")


def make_direction_gifs(sheet_path: Path, output_dir: Path, scale: int = 4) -> list[Path]:
    image = ensure_rgba_sheet(sheet_path)
    output_dir.mkdir(parents=True, exist_ok=True)
    paths = []
    for row in range(GRID_SIZE):
        frames = []
        for col in range(GRID_SIZE):
            frame = image.crop(
                (
                    col * CELL_SIZE,
                    row * CELL_SIZE,
                    (col + 1) * CELL_SIZE,
                    (row + 1) * CELL_SIZE,
                )
            ).resize((CELL_SIZE * scale, CELL_SIZE * scale), Image.Resampling.NEAREST)
            background = Image.new("RGBA", frame.size, (235, 235, 235, 255))
            background.alpha_composite(frame)
            frames.append(background.convert("RGB"))
        output = output_dir / f"{row}-{direction_for_row(row)}.gif"
        frames[0].save(
            output,
            save_all=True,
            append_images=frames[1:],
            duration=180,
            loop=0,
            disposal=2,
        )
        paths.append(output)
    return paths


def alpha_checker(size: tuple[int, int], tile: int = 16) -> Image.Image:
    canvas = Image.new("RGBA", size, (240, 240, 240, 255))
    draw = ImageDraw.Draw(canvas)
    for yy in range(0, size[1], tile):
        for xx in range(0, size[0], tile):
            if ((xx // tile) + (yy // tile)) % 2:
                draw.rectangle(
                    (xx, yy, min(xx + tile - 1, size[0] - 1), min(yy + tile - 1, size[1] - 1)),
                    fill=(210, 210, 210, 255),
                )
    return canvas


def make_review_board(root: Path, spec: PokemonSpec, output: Path, variant: str) -> None:
    pokemon_path = root / "references" / "pokemondb" / f"{spec.basename}.png"
    aerun_path = root / "references" / "aerun" / f"{spec.basename}.png"
    candidate_path = root / "candidates" / variant / "normal" / f"{spec.basename}.png"
    for path in (pokemon_path, aerun_path, candidate_path):
        if not path.exists():
            raise RuntimeError(f"Missing review input: {path}")

    scale = 3
    sheet_px = SHEET_SIZE * scale
    gap = 24
    title_h = 34
    pokemon_panel_w = 360
    width = pokemon_panel_w + gap + sheet_px
    height = max(sheet_px * 2 + title_h * 2 + gap, 760)
    board = Image.new("RGBA", (width, height), (24, 24, 24, 255))
    draw = ImageDraw.Draw(board)

    draw.text((12, 10), f"#{spec.dex3} {spec.slug} — PokemonDB source", fill=(255, 255, 255, 255))
    pokemon = Image.open(pokemon_path).convert("RGBA")
    pbox = pokemon.getchannel("A").getbbox()
    if pbox:
        pokemon = pokemon.crop(pbox)
    max_side = 300
    factor = min(max_side / pokemon.width, max_side / pokemon.height)
    target = (max(1, round(pokemon.width * factor)), max(1, round(pokemon.height * factor)))
    pokemon = pokemon.resize(target, Image.Resampling.NEAREST)
    checker = alpha_checker((pokemon_panel_w - 24, max_side + 24), tile=24)
    board.alpha_composite(checker, (12, title_h + 8))
    px = 12 + (checker.width - pokemon.width) // 2
    py = title_h + 8 + (checker.height - pokemon.height) // 2
    board.alpha_composite(pokemon, (px, py))

    source_colors = Image.open(pokemon_path).convert("RGBA").getcolors(maxcolors=1_000_000) or []
    candidate_colors = Image.open(candidate_path).convert("RGBA").getcolors(maxcolors=1_000_000) or []
    draw.text((12, title_h + max_side + 52), f"PokemonDB colors: {len(source_colors)}", fill=(220, 220, 220, 255))
    draw.text((12, title_h + max_side + 72), f"Candidate colors: {len(candidate_colors)}", fill=(220, 220, 220, 255))
    draw.text((12, title_h + max_side + 102), variant, fill=(255, 210, 120, 255))
    method_labels = {
        "transfer-v0": "Aerun geometry + PokemonDB-guided palette",
        "transfer-v1": "PokemonDB side geometry + Aerun motion grammar",
        "transfer-v2": "PokemonDB side geometry + normalized overworld density",
        "transfer-v3": "v2 + deterministic Charizard front/back reshape",
        "authored-v4": "authored Charizard front/back + frozen accepted side rows",
        "authored-v5": "authored Charizard three-quarter front/back + frozen accepted side rows",
        "strict-pose-v6": "Aerun geometry locked pixel-for-pixel + PokemonDB palette/details",
        "style-v7": "Aerun geometry locked + PokemonDB texture/shading transfer",
    }
    method_label = method_labels.get(variant, variant)
    draw.text((12, title_h + max_side + 122), method_label, fill=(220, 220, 220, 255))

    for index, (label, path) in enumerate((("Aerun pose reference", aerun_path), ("PoC candidate", candidate_path))):
        y = index * (sheet_px + title_h + gap)
        x = pokemon_panel_w + gap
        draw.text((x, y + 10), label, fill=(255, 255, 255, 255))
        sheet = Image.open(path).convert("RGBA").resize((sheet_px, sheet_px), Image.Resampling.NEAREST)
        checker_sheet = alpha_checker((sheet_px, sheet_px), tile=24)
        checker_sheet.alpha_composite(sheet)
        board.alpha_composite(checker_sheet, (x, y + title_h))

    output.parent.mkdir(parents=True, exist_ok=True)
    board.save(output, "PNG", optimize=True)


def summarize_rows(metrics: list[dict]) -> list[dict]:
    result = []
    for row in range(GRID_SIZE):
        frames = [item for item in metrics if item["row"] == row]
        occupied = [item for item in frames if item["occupied"]]
        if not occupied:
            result.append(
                {
                    "row": row,
                    "all_occupied": False,
                    "occupied_frames": 0,
                    "baseline_range": None,
                    "center_x_range": None,
                    "frame_width_range": None,
                    "frame_height_range": None,
                }
            )
            continue
        result.append(
            {
                "row": row,
                "all_occupied": all(item["occupied"] for item in frames),
                "occupied_frames": len(occupied),
                "baseline_range": [
                    min(item["baseline_y"] for item in occupied),
                    max(item["baseline_y"] for item in occupied),
                ],
                "center_x_range": [
                    min(item["center_x"] for item in occupied),
                    max(item["center_x"] for item in occupied),
                ],
                "frame_width_range": [
                    min(item["width"] for item in occupied),
                    max(item["width"] for item in occupied),
                ],
                "frame_height_range": [
                    min(item["height"] for item in occupied),
                    max(item["height"] for item in occupied),
                ],
            }
        )
    return result


def prepare(args: argparse.Namespace) -> int:
    root = args.work.resolve()
    zip_path = args.aerun_zip.resolve()
    pokemon_root = args.pokemondb_root.resolve()
    numbers = parse_numbers(args.numbers)
    unknown = [number for number in numbers if number not in POC_SPECIES]
    if unknown:
        raise SystemExit(f"PoC currently supports only #006 and #059; unsupported: {unknown}")

    layout = load_layout()
    manifest = {
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "layout": layout,
        "aerun_archive": {
            "filename": zip_path.name,
            "sha256": sha256(zip_path),
        },
        "species": [],
    }

    for number in numbers:
        spec = POC_SPECIES[number]
        print(f"Preparing #{spec.dex3} {spec.slug}")
        aerun_path = root / "references" / "aerun" / f"{spec.basename}.png"
        pokemon_path = root / "references" / "pokemondb" / f"{spec.basename}.png"
        extract_aerun_reference(zip_path, spec, aerun_path)
        copy_pokemondb_reference(pokemon_root, spec, pokemon_path)

        frames_dir = root / "frames" / "reference" / spec.basename
        metrics = split_sheet(aerun_path, frames_dir)
        contact = root / "renders" / f"{spec.basename}-aerun-contact.png"
        make_contact_sheet(aerun_path, contact, scale=args.scale)
        gifs = make_direction_gifs(
            aerun_path,
            root / "renders" / f"{spec.basename}-rows",
            scale=args.scale,
        )
        manifest["species"].append(
            {
                "dex": spec.dex,
                "slug": spec.slug,
                "aerun": {
                    "archive_member": f"Pokemon/{spec.dex3}_0.png",
                    "path": aerun_path.relative_to(root).as_posix(),
                    "sha256": sha256(aerun_path),
                    "frames": metrics,
                    "rows": summarize_rows(metrics),
                },
                "pokemondb": {
                    "path": pokemon_path.relative_to(root).as_posix(),
                    "sha256": sha256(pokemon_path),
                    "size": list(Image.open(pokemon_path).size),
                    "alpha_bbox": list(Image.open(pokemon_path).convert("RGBA").getchannel("A").getbbox()),
                    **pokemondb_provenance(pokemon_root, spec),
                },
                "review": {
                    "contact": contact.relative_to(root).as_posix(),
                    "row_gifs": [path.relative_to(root).as_posix() for path in gifs],
                },
            }
        )
        print(f"  contact: {contact}")

    manifest_path = root / "reference-manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(f"Manifest: {manifest_path}")
    return 0


def validate_candidate(path: Path, *, display_path: str | None = None) -> dict:
    image = ensure_rgba_sheet(path)
    metrics = []
    errors = []
    for row in range(GRID_SIZE):
        for col in range(GRID_SIZE):
            frame = image.crop(
                (
                    col * CELL_SIZE,
                    row * CELL_SIZE,
                    (col + 1) * CELL_SIZE,
                    (row + 1) * CELL_SIZE,
                )
            )
            metric = frame_metrics(frame, row, col)
            metrics.append(metric)
            if not metric["occupied"]:
                errors.append(f"row {row} frame {col} is empty")
    return {
        "path": display_path or path.name,
        "sha256": sha256(path),
        "size": list(image.size),
        "frames": metrics,
        "rows": summarize_rows(metrics),
        "errors": errors,
        "valid": not errors,
    }


def transfer_v0(args: argparse.Namespace) -> int:
    root = args.work.resolve()
    numbers = parse_numbers(args.numbers)
    unknown = [number for number in numbers if number not in POC_SPECIES]
    if unknown:
        raise SystemExit(f"PoC currently supports only #006 and #059; unsupported: {unknown}")
    candidate_dir = root / "candidates" / "transfer-v0" / "normal"
    candidate_dir.mkdir(parents=True, exist_ok=True)
    records = []

    for number in numbers:
        spec = POC_SPECIES[number]
        source = root / "references" / "aerun" / f"{spec.basename}.png"
        pokemon = root / "references" / "pokemondb" / f"{spec.basename}.png"
        if not source.exists() or not pokemon.exists():
            raise SystemExit(
                f"Missing prepared references for #{spec.dex3}. Run prepare first."
            )
        mapping = load_transfer_v0_palette(spec)
        image = ensure_rgba_sheet(source)
        pixels = image.load()
        unmapped: dict[str, int] = {}
        changed = 0
        for y in range(image.height):
            for x in range(image.width):
                r, g, b, a = pixels[x, y]
                if a == 0:
                    continue
                target = mapping.get((r, g, b))
                if target is None:
                    key = f"{r},{g},{b}"
                    unmapped[key] = unmapped.get(key, 0) + 1
                    continue
                if target != (r, g, b):
                    changed += 1
                pixels[x, y] = (*target, a)

        if unmapped:
            raise RuntimeError(
                f"#{spec.dex3} has unmapped opaque colors: {json.dumps(unmapped, sort_keys=True)}"
            )

        pokemon_image = Image.open(pokemon).convert("RGBA")
        source_image = Image.open(source).convert("RGBA")
        candidate_image = image.convert("RGBA")
        pokemon_palette = opaque_palette(pokemon_image)
        candidate_palette = opaque_palette(candidate_image)
        palette_not_in_pokemondb = sorted(candidate_palette - pokemon_palette)
        alpha_equal = alpha_bytes(candidate_image) == alpha_bytes(source_image)
        if palette_not_in_pokemondb:
            raise RuntimeError(
                f"#{spec.dex3} candidate contains colors outside PokemonDB palette: "
                f"{palette_not_in_pokemondb}"
            )
        if not alpha_equal:
            raise RuntimeError(f"#{spec.dex3} transfer-v0 changed Aerun alpha geometry")
        output = candidate_dir / f"{spec.basename}.png"
        image.save(output, "PNG", optimize=True)
        records.append(
            {
                "dex": spec.dex,
                "slug": spec.slug,
                "method": "transfer-v0-palette-on-aerun-geometry",
                "aerun_reference": source.relative_to(root).as_posix(),
                "aerun_sha256": sha256(source),
                "pokemondb_reference": pokemon.relative_to(root).as_posix(),
                "pokemondb_sha256": sha256(pokemon),
                "palette_config_sha256": sha256(TRANSFER_V0_PALETTE_PATH),
                "output": output.relative_to(root).as_posix(),
                "output_sha256": sha256(output),
                "changed_opaque_pixels": changed,
                "candidate_palette_size": len(candidate_palette),
                "pokemondb_palette_size": len(pokemon_palette),
                "candidate_palette_subset_of_pokemondb": not palette_not_in_pokemondb,
                "alpha_geometry_identical_to_aerun": alpha_equal,
            }
        )
        print(f"#{spec.dex3} {spec.slug}: {output} ({changed} recolored pixels)")

    report = root / "reports" / "transfer-v0.json"
    report.parent.mkdir(parents=True, exist_ok=True)
    report.write_text(json.dumps(records, indent=2), encoding="utf-8")
    print(f"Report: {report}")
    return 0


def strict_pose_v6(args: argparse.Namespace) -> int:
    """Create the corrected PoC with Aerun geometry treated as immutable.

    The alpha mask, frame placement, bbox, baseline, centers and dimensions must
    remain pixel-identical to the Aerun reference. Only opaque RGB values may be
    replaced, and every replacement must come from the selected PokemonDB palette.
    """
    root = args.work.resolve()
    numbers = parse_numbers(args.numbers)
    unknown = [number for number in numbers if number not in POC_SPECIES]
    if unknown:
        raise SystemExit(f"PoC currently supports only #006 and #059; unsupported: {unknown}")

    candidate_dir = root / "candidates" / "strict-pose-v6" / "normal"
    candidate_dir.mkdir(parents=True, exist_ok=True)
    records = []

    for number in numbers:
        spec = POC_SPECIES[number]
        aerun_path = root / "references" / "aerun" / f"{spec.basename}.png"
        pokemon_path = root / "references" / "pokemondb" / f"{spec.basename}.png"
        if not aerun_path.exists() or not pokemon_path.exists():
            raise SystemExit(f"Missing prepared references for #{spec.dex3}. Run prepare first.")

        mapping = load_transfer_v0_palette(spec)
        aerun = ensure_rgba_sheet(aerun_path)
        candidate = aerun.copy().convert("RGBA")
        pixels = candidate.load()
        unmapped: dict[str, int] = {}
        changed = 0

        for y in range(candidate.height):
            for x in range(candidate.width):
                r, g, b, a = pixels[x, y]
                if a == 0:
                    continue
                target = mapping.get((r, g, b))
                if target is None:
                    key = f"{r},{g},{b}"
                    unmapped[key] = unmapped.get(key, 0) + 1
                    continue
                if target != (r, g, b):
                    changed += 1
                pixels[x, y] = (*target, a)

        if unmapped:
            raise RuntimeError(
                f"#{spec.dex3} has unmapped opaque colors: {json.dumps(unmapped, sort_keys=True)}"
            )

        pokemon = Image.open(pokemon_path).convert("RGBA")
        pokemon_palette = opaque_palette(pokemon)
        candidate_palette = opaque_palette(candidate)
        outside = sorted(candidate_palette - pokemon_palette)
        if outside:
            raise RuntimeError(
                f"#{spec.dex3} strict-pose candidate contains colors outside PokemonDB palette: {outside}"
            )

        # The core corrective invariant: no geometry or movement position may move.
        if alpha_bytes(candidate) != alpha_bytes(aerun):
            raise RuntimeError(f"#{spec.dex3} strict-pose candidate changed Aerun alpha geometry")

        aerun_metrics = []
        candidate_metrics = []
        for row in range(GRID_SIZE):
            for col in range(GRID_SIZE):
                aerun_metrics.append(frame_metrics(sheet_frame(aerun, row, col), row, col))
                candidate_metrics.append(frame_metrics(sheet_frame(candidate, row, col), row, col))
        if aerun_metrics != candidate_metrics:
            raise RuntimeError(f"#{spec.dex3} strict-pose candidate changed frame geometry metrics")

        output = candidate_dir / f"{spec.basename}.png"
        candidate.save(output, "PNG", optimize=True)
        records.append(
            {
                "dex": spec.dex,
                "slug": spec.slug,
                "method": "strict-pose-v6-aerun-geometry-locked-pokemondb-palette",
                "aerun_reference": aerun_path.relative_to(root).as_posix(),
                "aerun_sha256": sha256(aerun_path),
                "pokemondb_reference": pokemon_path.relative_to(root).as_posix(),
                "pokemondb_sha256": sha256(pokemon_path),
                "palette_config_sha256": sha256(TRANSFER_V0_PALETTE_PATH),
                "output": output.relative_to(root).as_posix(),
                "output_sha256": sha256(output),
                "changed_opaque_pixels": changed,
                "candidate_palette_subset_of_pokemondb": True,
                "alpha_geometry_identical_to_aerun": True,
                "frame_metrics_identical_to_aerun": True,
                "geometry_diff_pixels": 0,
            }
        )
        print(
            f"#{spec.dex3} {spec.slug}: {output} | geometry_diff_pixels=0 | "
            f"recolored_pixels={changed}"
        )

    report = root / "reports" / "strict-pose-v6.json"
    report.parent.mkdir(parents=True, exist_ok=True)
    report.write_text(json.dumps(records, indent=2), encoding="utf-8")
    print(f"Report: {report}")
    return 0


STYLE_V7 = {
    "006": {
        "roles": {
            "body": {
                "source": [(96, 48, 0), (144, 64, 32), (200, 88, 40), (248, 120, 56)],
                "ramp": [(64, 64, 64), (152, 64, 72), (200, 104, 104), (248, 160, 80)],
            },
            "belly": {
                "source": [(216, 168, 48), (240, 208, 112)],
                "ramp": [(224, 184, 152), (248, 224, 192)],
            },
            "wing": {
                "source": [(40, 72, 88), (64, 128, 128)],
                "ramp": [(56, 112, 184), (88, 152, 160)],
            },
            "flame": {
                "source": [(192, 16, 32), (248, 184, 16)],
                "ramp": [(192, 56, 88), (248, 96, 56), (248, 232, 64)],
            },
        }
    },
    "059": {
        "roles": {
            "mane": {
                "source": [(184, 136, 104), (224, 192, 144), (176, 176, 208), (232, 232, 248)],
                "ramp": [(128, 112, 88), (200, 160, 128), (248, 224, 176), (248, 248, 248)],
            },
            "body": {
                "source": [(144, 72, 32), (184, 80, 24), (248, 104, 48)],
                "ramp": [(144, 88, 48), (192, 144, 80), (248, 160, 80)],
            },
            "dark": {
                "source": [(48, 48, 48), (88, 88, 88), (72, 48, 24), (120, 88, 56)],
                "ramp": [(64, 64, 64), (80, 88, 104), (128, 112, 88)],
            },
        }
    },
}

STYLE_LOGICAL_SCALE = 2
STYLE_LOGICAL_CELL = CELL_SIZE // STYLE_LOGICAL_SCALE


def style_logical_frame(frame: Image.Image) -> Image.Image:
    return frame.resize(
        (STYLE_LOGICAL_CELL, STYLE_LOGICAL_CELL),
        Image.Resampling.NEAREST,
    )


def style_restore_frame(logical: Image.Image, reference: Image.Image) -> Image.Image:
    restored = logical.resize((CELL_SIZE, CELL_SIZE), Image.Resampling.NEAREST)
    if alpha_bytes(restored) != alpha_bytes(reference):
        raise RuntimeError("Style pass changed immutable Aerun alpha geometry")
    return restored


def style_v7_role(spec: PokemonSpec, rgb: tuple[int, int, int]) -> tuple[list[tuple[int, int, int]], int] | None:
    config = STYLE_V7[spec.dex3]["roles"]
    for role in config.values():
        source = [tuple(value) for value in role["source"]]
        if rgb in source:
            return [tuple(value) for value in role["ramp"]], source.index(rgb)
    return None


def luminance(rgb: tuple[int, int, int]) -> float:
    r, g, b = rgb
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def source_texture_for_bbox(
    pokemon: Image.Image,
    size: tuple[int, int],
    *,
    mirror: bool = False,
) -> Image.Image:
    texture = crop_alpha(pokemon)
    # The selected PokemonDB Gen-7 sources are published at 2x their logical
    # pixel-art density. Normalize to the 1x logical grid before fitting the
    # immutable Aerun frame; otherwise nearest-neighbour resampling aliases the
    # duplicated 2x blocks into noisy one-pixel clusters.
    if texture.width >= 2 and texture.height >= 2:
        texture = texture.resize(
            (max(1, texture.width // 2), max(1, texture.height // 2)),
            Image.Resampling.NEAREST,
        )
    if mirror:
        texture = texture.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
    return texture.resize(size, Image.Resampling.NEAREST)


def projected_source_pixel(
    texture: Image.Image,
    x: int,
    y: int,
    fallback: tuple[int, int, int, int],
) -> tuple[int, int, int, int]:
    pixel = texture.getpixel((x, y))
    if pixel[3] > 0:
        return pixel
    nearby = nearest_opaque_color(texture, x, y, radius=8)
    if nearby[3] > 0 and nearby[:3] != (0, 0, 0):
        return nearby
    return fallback


def style_v7_side_frame(
    spec: PokemonSpec,
    aerun_frame: Image.Image,
    v6_frame: Image.Image,
    pokemon: Image.Image,
    *,
    mirror: bool,
) -> Image.Image:
    aerun_logical = style_logical_frame(aerun_frame)
    result = style_logical_frame(v6_frame).copy().convert("RGBA")
    bbox = aerun_logical.getchannel("A").getbbox()
    if bbox is None:
        raise RuntimeError("Aerun side frame is empty")
    left, top, right, bottom = bbox
    texture = source_texture_for_bbox(pokemon, (right - left, bottom - top), mirror=mirror)
    aerun_pixels = aerun_logical.load()
    result_pixels = result.load()

    for y in range(top, bottom):
        for x in range(left, right):
            ar, ag, ab, aa = aerun_pixels[x, y]
            if aa == 0:
                continue
            # Preserve the exact Aerun outline position as a hard silhouette edge.
            if (ar, ag, ab) == (0, 0, 0):
                result_pixels[x, y] = (0, 0, 0, aa)
                continue
            fallback = result_pixels[x, y]
            sample = projected_source_pixel(texture, x - left, y - top, fallback)
            result_pixels[x, y] = (*sample[:3], aa)
    return style_restore_frame(result, aerun_frame)


def style_v7_directional_frame(
    spec: PokemonSpec,
    aerun_frame: Image.Image,
    v6_frame: Image.Image,
    pokemon: Image.Image,
) -> Image.Image:
    """Keep inferred front/back shading conservative.

    PokemonDB gives us only the selected side/three-quarter source. Projecting
    that light map onto front/back proved visually misleading even though alpha
    geometry stayed valid. The safe contract is therefore: retain v6's
    material-aware Aerun shading + PokemonDB palette for rows 0/3, and reserve
    direct PokemonDB texture transfer for the side rows where a matching view
    actually exists.
    """
    if alpha_bytes(v6_frame) != alpha_bytes(aerun_frame):
        raise RuntimeError(f"#{spec.dex3} v6 directional geometry drifted from Aerun")
    return v6_frame.copy().convert("RGBA")


def style_v7(args: argparse.Namespace) -> int:
    root = args.work.resolve()
    numbers = parse_numbers(args.numbers)
    unknown = [number for number in numbers if number not in POC_SPECIES]
    if unknown:
        raise SystemExit(f"PoC currently supports only #006 and #059; unsupported: {unknown}")

    v6_dir = root / "candidates" / "strict-pose-v6" / "normal"
    output_dir = root / "candidates" / "style-v7" / "normal"
    output_dir.mkdir(parents=True, exist_ok=True)
    records = []

    for number in numbers:
        spec = POC_SPECIES[number]
        aerun_path = root / "references" / "aerun" / f"{spec.basename}.png"
        pokemon_path = root / "references" / "pokemondb" / f"{spec.basename}.png"
        v6_path = v6_dir / f"{spec.basename}.png"
        if not aerun_path.exists() or not pokemon_path.exists() or not v6_path.exists():
            raise SystemExit(f"Missing prepared v6/reference input for #{spec.dex3}")

        aerun = ensure_rgba_sheet(aerun_path)
        v6 = ensure_rgba_sheet(v6_path)
        pokemon = Image.open(pokemon_path).convert("RGBA")
        candidate = Image.new("RGBA", (SHEET_SIZE, SHEET_SIZE), (0, 0, 0, 0))

        for row in range(GRID_SIZE):
            for col in range(GRID_SIZE):
                aerun_frame = sheet_frame(aerun, row, col)
                v6_frame = sheet_frame(v6, row, col)
                if row == 1:
                    styled = style_v7_side_frame(
                        spec, aerun_frame, v6_frame, pokemon, mirror=False
                    )
                elif row == 2:
                    styled = style_v7_side_frame(
                        spec, aerun_frame, v6_frame, pokemon, mirror=True
                    )
                else:
                    styled = style_v7_directional_frame(
                        spec, aerun_frame, v6_frame, pokemon
                    )
                set_sheet_frame(candidate, row, col, styled)

        if alpha_bytes(candidate) != alpha_bytes(aerun):
            raise RuntimeError(f"#{spec.dex3} style-v7 changed Aerun alpha geometry")
        aerun_metrics = [
            frame_metrics(sheet_frame(aerun, row, col), row, col)
            for row in range(GRID_SIZE)
            for col in range(GRID_SIZE)
        ]
        candidate_metrics = [
            frame_metrics(sheet_frame(candidate, row, col), row, col)
            for row in range(GRID_SIZE)
            for col in range(GRID_SIZE)
        ]
        if aerun_metrics != candidate_metrics:
            raise RuntimeError(f"#{spec.dex3} style-v7 changed frame geometry metrics")

        pokemon_palette = opaque_palette(pokemon)
        candidate_palette = opaque_palette(candidate)
        outside = sorted(candidate_palette - pokemon_palette)
        if outside:
            raise RuntimeError(
                f"#{spec.dex3} style-v7 colors outside PokemonDB palette: {outside}"
            )

        output = output_dir / f"{spec.basename}.png"
        candidate.save(output, "PNG", optimize=True)
        rgb_changed_vs_v6 = sum(
            1
            for a, b in zip(candidate.get_flattened_data(), v6.get_flattened_data())
            if a != b
        )
        records.append(
            {
                "dex": spec.dex,
                "slug": spec.slug,
                "method": "style-v7-geometry-locked-pokemondb-texture-shading-transfer",
                "aerun_sha256": sha256(aerun_path),
                "pokemondb_sha256": sha256(pokemon_path),
                "v6_sha256": sha256(v6_path),
                "output": output.relative_to(root).as_posix(),
                "output_sha256": sha256(output),
                "geometry_diff_pixels": 0,
                "alpha_geometry_identical_to_aerun": True,
                "frame_metrics_identical_to_aerun": True,
                "candidate_palette_subset_of_pokemondb": True,
                "rgb_pixels_changed_vs_v6": rgb_changed_vs_v6,
                "side_rows": "PokemonDB texture donor inside immutable Aerun alpha",
                "front_back_rows": "v6 Aerun material shading retained; no unsupported side-to-front light projection",
            }
        )
        print(
            f"#{spec.dex3} {spec.slug}: {output} | geometry_diff_pixels=0 | "
            f"rgb_changed_vs_v6={rgb_changed_vs_v6}"
        )

    report = root / "reports" / "style-v7.json"
    report.parent.mkdir(parents=True, exist_ok=True)
    report.write_text(json.dumps(records, indent=2), encoding="utf-8")
    print(f"Report: {report}")
    return 0


def transfer_v1(args: argparse.Namespace) -> int:
    root = args.work.resolve()
    numbers = parse_numbers(args.numbers)
    unknown = [number for number in numbers if number not in POC_SPECIES]
    if unknown:
        raise SystemExit(f"PoC currently supports only #006 and #059; unsupported: {unknown}")

    source_v0_dir = root / "candidates" / "transfer-v0" / "normal"
    output_dir = root / "candidates" / "transfer-v1" / "normal"
    output_dir.mkdir(parents=True, exist_ok=True)
    records = []

    for number in numbers:
        spec = POC_SPECIES[number]
        aerun_path = root / "references" / "aerun" / f"{spec.basename}.png"
        pokemon_path = root / "references" / "pokemondb" / f"{spec.basename}.png"
        v0_path = source_v0_dir / f"{spec.basename}.png"
        if not aerun_path.exists() or not pokemon_path.exists():
            raise SystemExit(f"Missing prepared references for #{spec.dex3}. Run prepare first.")
        if not v0_path.exists():
            raise SystemExit(f"Missing transfer-v0 base for #{spec.dex3}. Run transfer-v0 first.")

        config = load_transfer_v1_config(spec)
        aerun = ensure_rgba_sheet(aerun_path)
        v0 = ensure_rgba_sheet(v0_path)
        pokemon = Image.open(pokemon_path).convert("RGBA")
        pokemon_crop = crop_alpha(pokemon)
        pokemon_side = pokemon_crop.resize(tuple(config["side_size"]), Image.Resampling.NEAREST)

        candidate = Image.new("RGBA", (SHEET_SIZE, SHEET_SIZE), (0, 0, 0, 0))

        # Front/down and back/up remain inferred views because the selected
        # PokemonDB source is a side/three-quarter sprite. They are reshaped so
        # v1 no longer preserves Aerun's alpha geometry exactly.
        for row, size_key in ((0, "front_size"), (3, "back_size")):
            for col in range(GRID_SIZE):
                ref = sheet_frame(aerun, row, col)
                metric = frame_metrics(ref, row, col)
                source_frame = sheet_frame(v0, row, col)
                reshaped = resize_frame_bbox(
                    source_frame,
                    tuple(config[size_key]),
                    center_x=float(metric["center_x"]),
                    baseline_y=int(metric["baseline_y"]),
                )
                set_sheet_frame(candidate, row, col, reshaped)

        # The PokemonDB sprite is the actual geometry donor for the side views.
        # Both selected sources face left; right is its horizontal mirror.
        for row, donor in ((1, pokemon_side), (2, pokemon_side.transpose(Image.Transpose.FLIP_LEFT_RIGHT))):
            ref_a = sheet_frame(aerun, row, 0)
            ref_b = sheet_frame(aerun, row, 2)
            metric_a = frame_metrics(ref_a, row, 0)
            step_a = place_frame(
                donor,
                center_x=float(metric_a["center_x"]),
                baseline_y=int(metric_a["baseline_y"]),
            )
            step_b = apply_aerun_motion_delta(step_a, ref_a, ref_b)
            transition_a = shift_frame(step_a, 2)
            transition_b = shift_frame(step_b, 2)
            for col, frame in enumerate((step_a, transition_a, step_b, transition_b)):
                set_sheet_frame(candidate, row, col, frame)

        candidate_palette = opaque_palette(candidate)
        pokemon_palette = opaque_palette(pokemon)
        outside = sorted(candidate_palette - pokemon_palette)
        if outside:
            raise RuntimeError(
                f"#{spec.dex3} transfer-v1 contains colors outside PokemonDB palette: {outside}"
            )
        alpha_equal = alpha_bytes(candidate) == alpha_bytes(aerun)
        if alpha_equal:
            raise RuntimeError(f"#{spec.dex3} transfer-v1 failed to change Aerun alpha geometry")
        output = output_dir / f"{spec.basename}.png"
        candidate.save(output, "PNG", optimize=True)

        records.append(
            {
                "dex": spec.dex,
                "slug": spec.slug,
                "method": "transfer-v1-pokemondb-side-geometry-aerun-motion",
                "aerun_reference": aerun_path.relative_to(root).as_posix(),
                "aerun_sha256": sha256(aerun_path),
                "pokemondb_reference": pokemon_path.relative_to(root).as_posix(),
                "pokemondb_sha256": sha256(pokemon_path),
                "transfer_v0_base": v0_path.relative_to(root).as_posix(),
                "transfer_v0_sha256": sha256(v0_path),
                "config_sha256": sha256(TRANSFER_V1_CONFIG_PATH),
                "output": output.relative_to(root).as_posix(),
                "output_sha256": sha256(output),
                "candidate_palette_size": len(candidate_palette),
                "pokemondb_palette_size": len(pokemon_palette),
                "candidate_palette_subset_of_pokemondb": not outside,
                "alpha_geometry_identical_to_aerun": alpha_equal,
                "pokemon_geometry_rows": [1, 2],
                "inferred_rows": [0, 3],
            }
        )
        print(f"#{spec.dex3} {spec.slug}: {output}")

    report = root / "reports" / "transfer-v1.json"
    report.parent.mkdir(parents=True, exist_ok=True)
    report.write_text(json.dumps(records, indent=2), encoding="utf-8")
    print(f"Report: {report}")
    return 0


def transfer_v2(args: argparse.Namespace) -> int:
    root = args.work.resolve()
    numbers = parse_numbers(args.numbers)
    unknown = [number for number in numbers if number not in POC_SPECIES]
    if unknown:
        raise SystemExit(f"PoC currently supports only #006 and #059; unsupported: {unknown}")

    source_v0_dir = root / "candidates" / "transfer-v0" / "normal"
    output_dir = root / "candidates" / "transfer-v2" / "normal"
    output_dir.mkdir(parents=True, exist_ok=True)
    records = []

    for number in numbers:
        spec = POC_SPECIES[number]
        aerun_path = root / "references" / "aerun" / f"{spec.basename}.png"
        pokemon_path = root / "references" / "pokemondb" / f"{spec.basename}.png"
        v0_path = source_v0_dir / f"{spec.basename}.png"
        if not aerun_path.exists() or not pokemon_path.exists():
            raise SystemExit(f"Missing prepared references for #{spec.dex3}. Run prepare first.")
        if not v0_path.exists():
            raise SystemExit(f"Missing transfer-v0 base for #{spec.dex3}. Run transfer-v0 first.")

        config = load_transfer_v2_config(spec)
        aerun = ensure_rgba_sheet(aerun_path)
        v0 = ensure_rgba_sheet(v0_path)
        pokemon = Image.open(pokemon_path).convert("RGBA")
        pokemon_crop = crop_alpha(pokemon)
        pokemon_side = pixelate_to_size(
            pokemon_crop,
            tuple(config["side_size"]),
            int(config.get("side_pixel_block", 1)),
        )

        candidate = Image.new("RGBA", (SHEET_SIZE, SHEET_SIZE), (0, 0, 0, 0))

        for row, size_key in ((0, "front_size"), (3, "back_size")):
            for col in range(GRID_SIZE):
                ref = sheet_frame(aerun, row, col)
                metric = frame_metrics(ref, row, col)
                source_frame = sheet_frame(v0, row, col)
                reshaped = resize_frame_bbox(
                    source_frame,
                    tuple(config[size_key]),
                    center_x=float(metric["center_x"]),
                    baseline_y=int(metric["baseline_y"]),
                )
                set_sheet_frame(candidate, row, col, reshaped)

        for row, donor in ((1, pokemon_side), (2, pokemon_side.transpose(Image.Transpose.FLIP_LEFT_RIGHT))):
            ref_a = sheet_frame(aerun, row, 0)
            ref_b = sheet_frame(aerun, row, 2)
            metric_a = frame_metrics(ref_a, row, 0)
            step_a = place_frame(
                donor,
                center_x=float(metric_a["center_x"]),
                baseline_y=int(metric_a["baseline_y"]),
            )
            step_b = apply_aerun_motion_delta(step_a, ref_a, ref_b)
            transition_a = shift_frame(step_a, 2)
            transition_b = shift_frame(step_b, 2)
            for col, frame in enumerate((step_a, transition_a, step_b, transition_b)):
                set_sheet_frame(candidate, row, col, frame)

        candidate_palette = opaque_palette(candidate)
        pokemon_palette = opaque_palette(pokemon)
        outside = sorted(candidate_palette - pokemon_palette)
        if outside:
            raise RuntimeError(
                f"#{spec.dex3} transfer-v2 contains colors outside PokemonDB palette: {outside}"
            )
        alpha_equal = alpha_bytes(candidate) == alpha_bytes(aerun)
        if alpha_equal:
            raise RuntimeError(f"#{spec.dex3} transfer-v2 failed to change Aerun alpha geometry")
        output = output_dir / f"{spec.basename}.png"
        candidate.save(output, "PNG", optimize=True)

        records.append(
            {
                "dex": spec.dex,
                "slug": spec.slug,
                "method": "transfer-v2-pokemondb-side-geometry-pixel-normalized",
                "aerun_reference": aerun_path.relative_to(root).as_posix(),
                "aerun_sha256": sha256(aerun_path),
                "pokemondb_reference": pokemon_path.relative_to(root).as_posix(),
                "pokemondb_sha256": sha256(pokemon_path),
                "transfer_v0_base": v0_path.relative_to(root).as_posix(),
                "transfer_v0_sha256": sha256(v0_path),
                "config_sha256": sha256(TRANSFER_V2_CONFIG_PATH),
                "output": output.relative_to(root).as_posix(),
                "output_sha256": sha256(output),
                "candidate_palette_size": len(candidate_palette),
                "pokemondb_palette_size": len(pokemon_palette),
                "candidate_palette_subset_of_pokemondb": not outside,
                "alpha_geometry_identical_to_aerun": alpha_equal,
                "pokemon_geometry_rows": [1, 2],
                "inferred_rows": [0, 3],
                "side_pixel_block": int(config.get("side_pixel_block", 1)),
            }
        )
        print(f"#{spec.dex3} {spec.slug}: {output}")

    report = root / "reports" / "transfer-v2.json"
    report.parent.mkdir(parents=True, exist_ok=True)
    report.write_text(json.dumps(records, indent=2), encoding="utf-8")
    print(f"Report: {report}")
    return 0


def transfer_v3(args: argparse.Namespace) -> int:
    root = args.work.resolve()
    numbers = parse_numbers(args.numbers)
    unknown = [number for number in numbers if number not in POC_SPECIES]
    if unknown:
        raise SystemExit(f"PoC currently supports only #006 and #059; unsupported: {unknown}")

    source_v2_dir = root / "candidates" / "transfer-v2" / "normal"
    output_dir = root / "candidates" / "transfer-v3" / "normal"
    output_dir.mkdir(parents=True, exist_ok=True)
    records = []

    for number in numbers:
        spec = POC_SPECIES[number]
        aerun_path = root / "references" / "aerun" / f"{spec.basename}.png"
        pokemon_path = root / "references" / "pokemondb" / f"{spec.basename}.png"
        v2_path = source_v2_dir / f"{spec.basename}.png"
        if not aerun_path.exists() or not pokemon_path.exists():
            raise SystemExit(f"Missing prepared references for #{spec.dex3}. Run prepare first.")
        if not v2_path.exists():
            raise SystemExit(f"Missing transfer-v2 base for #{spec.dex3}. Run transfer-v2 first.")

        pokemon = Image.open(pokemon_path).convert("RGBA")
        v2 = ensure_rgba_sheet(v2_path)
        config = load_transfer_v3_config(spec)

        if config is None:
            # Species already accepted by the visual corrective analysis remain
            # byte-identical to v2; v3 is deliberately scoped to Charizard.
            candidate = v2.copy()
            modified_rows: list[int] = []
        else:
            candidate = v2.copy()
            modified_rows = [0, 3]
            for row, key in ((0, "front"), (3, "back")):
                row_config = config[key]
                for col in range(GRID_SIZE):
                    source_frame = sheet_frame(v2, row, col)
                    metric = frame_metrics(source_frame, row, col)
                    warped = band_warp_frame(
                        source_frame,
                        target_height=int(row_config["height"]),
                        bands=list(row_config["bands"]),
                        center_x=float(metric["center_x"]),
                        baseline_y=int(metric["baseline_y"]),
                    )
                    # Clear the old logical cell before placing the corrective.
                    candidate.paste(
                        (0, 0, 0, 0),
                        (
                            col * CELL_SIZE,
                            row * CELL_SIZE,
                            (col + 1) * CELL_SIZE,
                            (row + 1) * CELL_SIZE,
                        ),
                    )
                    set_sheet_frame(candidate, row, col, warped)

        candidate_palette = opaque_palette(candidate)
        pokemon_palette = opaque_palette(pokemon)
        outside = sorted(candidate_palette - pokemon_palette)
        if outside:
            raise RuntimeError(
                f"#{spec.dex3} transfer-v3 contains colors outside PokemonDB palette: {outside}"
            )

        output = output_dir / f"{spec.basename}.png"
        candidate.save(output, "PNG", optimize=True)
        records.append(
            {
                "dex": spec.dex,
                "slug": spec.slug,
                "method": "transfer-v3-focused-charizard-front-back-band-warp",
                "transfer_v2_base": v2_path.relative_to(root).as_posix(),
                "transfer_v2_sha256": sha256(v2_path),
                "pokemondb_reference": pokemon_path.relative_to(root).as_posix(),
                "pokemondb_sha256": sha256(pokemon_path),
                "config_sha256": sha256(TRANSFER_V3_CONFIG_PATH),
                "output": output.relative_to(root).as_posix(),
                "output_sha256": sha256(output),
                "candidate_palette_size": len(candidate_palette),
                "pokemondb_palette_size": len(pokemon_palette),
                "candidate_palette_subset_of_pokemondb": not outside,
                "modified_rows": modified_rows,
                "byte_identical_to_v2": sha256(output) == sha256(v2_path),
            }
        )
        print(f"#{spec.dex3} {spec.slug}: {output} modified_rows={modified_rows}")

    report = root / "reports" / "transfer-v3.json"
    report.parent.mkdir(parents=True, exist_ok=True)
    report.write_text(json.dumps(records, indent=2), encoding="utf-8")
    print(f"Report: {report}")
    return 0


def validate(args: argparse.Namespace) -> int:
    root = args.work.resolve()
    numbers = parse_numbers(args.numbers)
    unknown = [number for number in numbers if number not in POC_SPECIES]
    if unknown:
        raise SystemExit(f"PoC currently supports only #006 and #059; unsupported: {unknown}")
    reports = []
    failure = False
    for number in numbers:
        spec = POC_SPECIES[number]
        path = root / "candidates" / args.variant / "normal" / f"{spec.basename}.png"
        if not path.exists():
            print(f"ERROR missing candidate: {path}", file=sys.stderr)
            failure = True
            continue
        report = validate_candidate(path, display_path=path.relative_to(root).as_posix())
        reports.append(report)
        print(f"#{spec.dex3} {spec.slug}: {'PASS' if report['valid'] else 'FAIL'}")
        for error in report["errors"]:
            print(f"  {error}")

    report_path = root / "reports" / f"candidate-validation-{args.variant}.json"
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(reports, indent=2), encoding="utf-8")
    print(f"Report: {report_path}")
    return 1 if failure or any(not report["valid"] for report in reports) else 0


def preview(args: argparse.Namespace) -> int:
    root = args.work.resolve()
    numbers = parse_numbers(args.numbers)
    for number in numbers:
        spec = POC_SPECIES[number]
        candidate = root / "candidates" / args.variant / "normal" / f"{spec.basename}.png"
        if not candidate.exists():
            raise SystemExit(f"Missing candidate: {candidate}")
        contact = root / "renders" / f"{spec.basename}-{args.variant}-contact.png"
        make_contact_sheet(candidate, contact, scale=args.scale)
        gifs = make_direction_gifs(
            candidate,
            root / "renders" / f"{spec.basename}-{args.variant}-rows",
            scale=args.scale,
        )
        board = root / "renders" / f"{spec.basename}-{args.variant}-review-board.png"
        make_review_board(root, spec, board, args.variant)
        print(f"#{spec.dex3}: {contact}")
        print(f"  review: {board}")
        for gif in gifs:
            print(f"  {gif}")
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="PokePixel overworld sprite PoC pipeline")
    sub = parser.add_subparsers(dest="command", required=True)

    def common(command: argparse.ArgumentParser) -> None:
        command.add_argument("--numbers", default="6,59")
        command.add_argument("--work", type=Path, default=DEFAULT_WORK)
        command.add_argument("--scale", type=int, default=4)

    prepare_parser = sub.add_parser("prepare", help="extract and normalize references")
    common(prepare_parser)
    prepare_parser.add_argument("--aerun-zip", type=Path, default=DEFAULT_ZIP)
    prepare_parser.add_argument("--pokemondb-root", type=Path, required=True)
    prepare_parser.set_defaults(func=prepare)

    validate_parser = sub.add_parser("validate", help="validate authored candidate sheets")
    common(validate_parser)
    validate_parser.add_argument(
        "--variant",
        choices=VARIANTS,
        default="transfer-v3",
    )
    validate_parser.set_defaults(func=validate)

    transfer_parser = sub.add_parser(
        "transfer-v0",
        help="create deterministic palette-transfer exploration on Aerun geometry",
    )
    common(transfer_parser)
    transfer_parser.set_defaults(func=transfer_v0)

    transfer_v1_parser = sub.add_parser(
        "transfer-v1",
        help="create hybrid PokemonDB-geometry/Aerun-motion PoC candidates",
    )
    common(transfer_v1_parser)
    transfer_v1_parser.set_defaults(func=transfer_v1)

    transfer_v2_parser = sub.add_parser(
        "transfer-v2",
        help="normalize PokemonDB side geometry to overworld pixel density",
    )
    common(transfer_v2_parser)
    transfer_v2_parser.set_defaults(func=transfer_v2)

    transfer_v3_parser = sub.add_parser(
        "transfer-v3",
        help="focused Charizard front/back proportion corrective",
    )
    common(transfer_v3_parser)
    transfer_v3_parser.set_defaults(func=transfer_v3)

    strict_pose_parser = sub.add_parser(
        "strict-pose-v6",
        help="lock Aerun pose/movement geometry pixel-for-pixel and transfer only PokemonDB palette",
    )
    common(strict_pose_parser)
    strict_pose_parser.set_defaults(func=strict_pose_v6)

    style_v7_parser = sub.add_parser(
        "style-v7",
        help="lock Aerun geometry and transfer PokemonDB texture/shading inside that mask",
    )
    common(style_v7_parser)
    style_v7_parser.set_defaults(func=style_v7)

    preview_parser = sub.add_parser("preview", help="render candidate contact sheets/GIFs")
    common(preview_parser)
    preview_parser.add_argument(
        "--variant",
        choices=VARIANTS,
        default="transfer-v3",
    )
    preview_parser.set_defaults(func=preview)
    return parser


def main() -> int:
    args = build_parser().parse_args()
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
