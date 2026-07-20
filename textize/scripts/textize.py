#!/usr/bin/env python3
"""Textize v1.5: convert raw/ files to clean .md in extracted/ using docling.

v1.5 improvements over v1.0:
  - .md/.txt passthrough: already-text files copied directly (no docling)
  - cache: skip unchanged files (by mtime) - re-runs are fast
  - clean_html integrated: docling handles HTML (no separate clean_html.py)

v1.0: docling unified parser for PDF/DOCX/HTML/images (default OCR= RapidOCR = PaddleOCR ONNX, best Chinese).

Flow: RAW -> Textize (docling + passthrough) -> extracted/*.md -> ② Research.

Usage:
    # default (process all, skip cached)
    python textize.py --raw "<raw>" --out "<extracted>"

    # force reprocess all (ignore cache)
    python textize.py --raw "<raw>" --out "<extracted>" --force

    # Chinese scanned PDFs/images: RapidOCR
    python textize.py --raw "<raw>" --out "<extracted>" --ocr rapidocr
"""
import re
import json
import argparse
from pathlib import Path

HEADER_TEMPLATE = """> **Source:** {name}
> **Textized:** {date}
> **Method:** {method}
> **Original bytes:** {orig}

---

{body}
"""

# Extensions that are already text -> copy directly (no docling)
PASSTHROUGH_EXTS = {'.md', '.txt'}

# All extensions Textize handles
DEFAULT_EXTS = ".pdf,.docx,.doc,.pptx,.html,.htm,.png,.jpg,.jpeg,.epub,.md,.txt"


def truncate(text, max_chars=12000, head=8000, tail=3000):
    if len(text) <= max_chars:
        return text
    return (text[:head] +
            "\n\n[... truncated for readability; full file in raw/ ...]\n\n" +
            text[-tail:])


def make_converter(ocr_engine=None):
    """Build a docling DocumentConverter. Optionally configure OCR engine."""
    from docling.document_converter import DocumentConverter

    if ocr_engine is None:
        return DocumentConverter()  # default pipeline (RapidOCR built-in)

    try:
        from docling.datamodel.pipeline_options import PdfPipelineOptions
        from docling.document_converter import PdfFormatOption

        ocr_opts = None
        try:
            if ocr_engine == "rapidocr":
                from docling.datamodel.ocr_options import RapidOcrOptions
                ocr_opts = RapidOcrOptions()
            elif ocr_engine == "easyocr":
                from docling.datamodel.ocr_options import EasyOcrOptions
                ocr_opts = EasyOcrOptions()
            elif ocr_engine == "tesseract":
                from docling.datamodel.ocr_options import TesseractOcrOptions
                ocr_opts = TesseractOcrOptions()
        except ImportError:
            try:
                from docling.datamodel.pipeline_options import OcrOptions
                ocr_opts = OcrOptions(engine=ocr_engine)
            except Exception:
                ocr_opts = None

        if ocr_opts is None:
            print(f"WARN: OCR engine '{ocr_engine}' not available, using default")
            return DocumentConverter()

        pipeline = PdfPipelineOptions(do_ocr=True, ocr_options=ocr_opts)
        return DocumentConverter(
            format_options={"pdf": PdfFormatOption(pipeline_options=pipeline)})
    except Exception as e:
        print(f"WARN: couldn't configure OCR {ocr_engine} ({e}), using default")
        return DocumentConverter()


def convert_one(converter, file_path):
    """Convert one file via docling. Returns markdown text."""
    result = converter.convert(str(file_path))
    doc = result.document if hasattr(result, "document") else result
    if hasattr(doc, "export_to_markdown"):
        return doc.export_to_markdown()
    return str(doc)


def passthrough(file_path, date):
    """Read .md/.txt, wrap with Textize header, return full text.

    The original file content (which already has its fetch header from stage ⓪)
    is preserved as the body.
    """
    body = file_path.read_text(encoding='utf-8', errors='ignore')
    return HEADER_TEMPLATE.format(
        name=file_path.name, date=date,
        method=f"passthrough ({file_path.suffix.lstrip('.')})",
        orig=file_path.stat().st_size, body=body)


def main():
    ap = argparse.ArgumentParser(
        description="Textize v1.5: raw files -> extracted/*.md (docling + passthrough + cache)")
    ap.add_argument("--raw", required=True, help="raw/ directory (input)")
    ap.add_argument("--out", required=True, help="extracted/ directory (output)")
    ap.add_argument("--ocr", default=None,
                    help="OCR engine for scanned PDF/images: rapidocr / easyocr / tesseract")
    ap.add_argument("--exts", default=DEFAULT_EXTS,
                    help=f"comma-sep extensions (default: {DEFAULT_EXTS})")
    ap.add_argument("--date", default="2026-07-20")
    ap.add_argument("--force", action="store_true",
                    help="ignore cache, reprocess all files")
    args = ap.parse_args()

    raw = Path(args.raw)
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)

    # ---- cache: {filename: mtime} ----
    cache_path = out / '.cache.json'
    if args.force:
        cache = {}
    elif cache_path.exists():
        try:
            cache = json.load(open(cache_path, encoding='utf-8'))
        except Exception:
            cache = {}
    else:
        cache = {}

    exts = [e.lower().lstrip(".") for e in args.exts.split(",")]
    targets = [f for f in sorted(raw.iterdir())
               if f.is_file() and f.suffix.lower().lstrip(".") in exts]
    print(f"found {len(targets)} files (exts: {exts})")

    # split passthrough vs docling targets (only init docling if needed)
    pt_targets = [f for f in targets if f.suffix.lower() in PASSTHROUGH_EXTS]
    dl_targets = [f for f in targets if f.suffix.lower() not in PASSTHROUGH_EXTS]
    converter = None
    if dl_targets:
        print(f"initializing docling (ocr={args.ocr or 'default'}) for {len(dl_targets)} non-passthrough files...")
        converter = make_converter(args.ocr)
        print("converter ready")

    ok = skipped = failed = 0
    for f in targets:
        out_md = out / f"{f.stem}.md"
        # handle stem collision (rare)
        n = 1
        while out_md.exists() and out_md.stem != f.stem and n < 100:
            out_md = out / f"{f.stem}-{n}.md"
            n += 1

        # ---- cache check ----
        mtime = f.stat().st_mtime
        cached_mtime = cache.get(f.name)
        if not args.force and out_md.exists():
            if cached_mtime is None:
                # out exists but not in cache (e.g. v1.0 output) -> assume processed, record + skip
                cache[f.name] = mtime
                print(f"SKIP (out exists, newly cached): {f.name}")
                skipped += 1
                continue
            elif cached_mtime == mtime:
                print(f"SKIP (cached): {f.name}")
                skipped += 1
                continue
            # else: mtime changed -> reprocess

        try:
            if f.suffix.lower() in PASSTHROUGH_EXTS:
                # ---- passthrough: copy .md/.txt directly ----
                text = passthrough(f, args.date)
                out_md.write_text(text, encoding='utf-8')
                method = f"passthrough ({f.suffix.lstrip('.')})"
                size_info = f"{f.stat().st_size:,} B"
            else:
                # ---- docling: parse PDF/DOCX/HTML/image ----
                md = convert_one(converter, f)
                md = md.strip() if isinstance(md, str) else str(md)
                if len(md) < 50:
                    print(f"SKIP (empty result): {f.name}")
                    skipped += 1
                    continue
                body = truncate(md)
                text = HEADER_TEMPLATE.format(
                    name=f.name, date=args.date,
                    method=f"docling ({f.suffix.lstrip('.')})",
                    orig=f.stat().st_size, body=body)
                out_md.write_text(text, encoding='utf-8')
                method = f"docling ({f.suffix.lstrip('.')})"
                size_info = f"{len(body):,} ch"
            cache[f.name] = mtime
            ok += 1
            print(f"OK   {f.name:50s} -> {out_md.name} ({size_info}, {method})")
        except Exception as e:
            print(f"ERR  {f.name}: {e}")
            failed += 1

    # ---- save cache ----
    if not args.force:
        try:
            json.dump(cache, open(cache_path, 'w', encoding='utf-8'), indent=2)
        except Exception as e:
            print(f"WARN: couldn't save cache: {e}")

    print(f"\n=== {ok} textized, {skipped} skipped, {failed} failed ===")


if __name__ == "__main__":
    main()
