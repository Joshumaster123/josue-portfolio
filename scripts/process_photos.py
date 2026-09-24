#!/usr/bin/env python3
"""
Prepare personal photos for the portfolio.

  photos-inbox/           <- drop originals here (git-ignored: originals never leave this machine)
  img/photos/*.jpg        <- output: EXIF/GPS stripped, auto-rotated, max 1600px wide, ~JPEG 82
  photos.json             <- manifest the page reads (only entries listed here are shown)

Usage:
  python3 scripts/process_photos.py               # process everything in photos-inbox/
  python3 scripts/process_photos.py --portrait me.jpg   # mark one file as the CV-style portrait

HEIC files are converted with macOS `sips` first. Captions/alt text are edited in photos.json.
"""
import argparse, json, re, subprocess, sys, tempfile
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
INBOX, OUT, MANIFEST = ROOT / "photos-inbox", ROOT / "img" / "photos", ROOT / "photos.json"
MAX_W = 1600

def slug(name):
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-") or "photo"

def has_gps(img):
    try:
        exif = img.getexif()
        return bool(exif.get_ifd(0x8825))  # GPS IFD
    except Exception:
        return False

def load(path):
    if path.suffix.lower() in (".heic", ".heif"):
        tmp = Path(tempfile.mkdtemp()) / (path.stem + ".jpg")
        subprocess.run(["sips", "-s", "format", "jpeg", str(path), "--out", str(tmp)], check=True, capture_output=True)
        path = tmp
    return Image.open(path)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--portrait", help="file name in photos-inbox to use as the portrait")
    args = ap.parse_args()

    OUT.mkdir(parents=True, exist_ok=True)
    manifest = json.loads(MANIFEST.read_text()) if MANIFEST.exists() else {"portrait": None, "gallery": []}
    known = {g["src"] for g in manifest["gallery"]}

    files = sorted(p for p in INBOX.iterdir() if p.suffix.lower() in (".jpg", ".jpeg", ".png", ".heic", ".heif"))
    if not files:
        print("photos-inbox/ is empty: nothing to do."); return
    gps_found = 0
    for p in files:
        img = load(p)
        if has_gps(img):
            gps_found += 1
        img = ImageOps.exif_transpose(img).convert("RGB")   # bake orientation in, then drop all metadata
        if img.width > MAX_W:
            img = img.resize((MAX_W, round(img.height * MAX_W / img.width)), Image.LANCZOS)
        name = slug(p.stem) + ".jpg"
        img.save(OUT / name, "JPEG", quality=82, optimize=True, progressive=True)   # no exif= -> nothing written
        src = f"./img/photos/{name}"
        entry = {"src": src, "w": img.width, "h": img.height,
                 "alt_en": "", "alt_es": "", "cap_en": "", "cap_es": ""}
        if args.portrait and p.name == args.portrait:
            manifest["portrait"] = entry
        elif src not in known and not (manifest["portrait"] and manifest["portrait"]["src"] == src):
            manifest["gallery"].append(entry)
        print(f"ok  {p.name} -> {name} ({img.width}x{img.height})")
    MANIFEST.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n")
    print(f"\n{len(files)} photo(s) processed; {gps_found} had GPS data in the original (removed).")
    print("Edit photos.json to add alt text and captions (EN/ES).")

if __name__ == "__main__":
    sys.exit(main())
