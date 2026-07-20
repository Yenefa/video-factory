#!/usr/bin/env python3
"""Textize: convert raw/ files to clean .md in extracted/ using docling.

docling (IBM, MIT) is a unified document parser that handles all formats
Textize needs in one call:
  - PDF (born-digital + scanned OCR)
  - DOCX / PPTX
  - HTML
  - images (.png/.jpg) -- OCR + layout
  - and more (epub, etc.)

Replaces the prior 4 hand-written skeletons (extract_pdf / ocr_scanned /
clean_html / extract_docx) with one docling call per file.

Flow: RAW -> Textize (docling) -> extracted/*.md -> ② Research reads.

Usage:
    # default (docling with built-in OCR)
    python textize.py --raw "<raw>" --out "<extracted>"

    # Chinese scanned PDFs/images: use RapidOCR (= PaddleOCR ONNX, best Chinese)
    python textize.py --raw "<raw>" --out "<extracted>" --ocr rapidocr

    # limit extensions
    python textize.py --raw "<raw>" --out "<extracted>" --exts .pdf,.docx
"""
import re
import argparse
from pathlib import Path

HEADER_TEMPLATE = """> **Source:** {name}
> **Textized:** {date}
> **Method:** docling ({fmt}){ocr_info}
> **Original bytes:** {orig}

---

{body}
"""

DEFAULT_EXTS = ".pdf,.docx,.doc,.pptx,.html,.htm,.png,.jpg,.jpeg,.epub"


def truncate(text, max_chars=12000, head=8000, tail=3000):
    if len(text) <= max_chars:
        return text
    return (text[:head] +
            "\n\n[... truncated for readability; full file in raw/ ...]\n\n" +
            text[-tail:])


def make_converter(ocr_engine=None):
    """Build a docling DocumentConverter. Optionally configure OCR engine.

    docling version differences are handled with try/except imports.
    """
    from docling.document_converter import DocumentConverter

    if ocr_engine is None:
        return DocumentConverter()  # default pipeline (EasyOCR built-in)

    # Try to configure a specific OCR engine
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
            # older docling: OcrOptions with engine kwarg
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
        print(f"WARN: couldn't configure OCR engine {ocr_engine} ({e}), using default")
        return DocumentConverter()


def convert_one(converter, file_path):
    """Convert one file via docling. Returns markdown text."""
    result = converter.convert(str(file_path))
    # docling 2.x: result.document.export_to_markdown()
    doc = result.document if hasattr(result, "document") else result
    if hasattr(doc, "export_to_markdown"):
        return doc.export_to_markdown()
    # fallback
    return str(doc)


def main():
    ap = argparse.ArgumentParser(
        description="Textize: raw files -> extracted/*.md via docling (unified parser)")
    ap.add_argument("--raw", required=True, help="raw/ directory (input)")
    ap.add_argument("--out", required=True, help="extracted/ directory (output)")
    ap.add_argument("--ocr", default=None,
                    help="OCR engine for scanned PDF/images: rapidocr (Chinese best) / easyocr / tesseract")
    ap.add_argument("--exts", default=DEFAULT_EXTS,
                    help=f"comma-sep extensions to process (default: {DEFAULT_EXTS})")
    ap.add_argument("--date", default="2026-07-20")
    args = ap.parse_args()

    raw = Path(args.raw)
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)

    exts = [e.lower().lstrip(".") for e in args.exts.split(",")]
    targets = [f for f in sorted(raw.iterdir())
               if f.is_file() and f.suffix.lower().lstrip(".") in exts]
    print(f"found {len(targets)} files to textize (exts: {exts})")

    print(f"initializing docling converter (ocr={args.ocr or 'default'})...")
    converter = make_converter(args.ocr)
    print("converter ready")

    ok = failed = skipped = 0
    for f in targets:
        try:
            md = convert_one(converter, f)
            md = md.strip() if isinstance(md, str) else str(md)
            if len(md) < 50:
                print(f"SKIP (empty result): {f.name}")
                skipped += 1
                continue
            body = truncate(md)
            ocr_info = f", OCR={args.ocr}" if args.ocr else ""
            header = HEADER_TEMPLATE.format(
                name=f.name, date=args.date, fmt=f.suffix.lstrip("."),
                ocr_info=ocr_info, orig=f.stat().st_size, body=body)
            out_md = out / f"{f.stem}.md"
            # avoid clobber if two sources share stem
            n = 1
            while out_md.exists():
                out_md = out / f"{f.stem}-{n}.md"
                n += 1
            out_md.write_text(header, encoding="utf-8")
            ok += 1
            print(f"OK   {f.name:50s} -> {out_md.name} ({len(body):,} ch)")
        except Exception as e:
            print(f"ERR  {f.name}: {e}")
            failed += 1

    print(f"\n=== {ok} textized, {skipped} skipped, {failed} failed ===")


if __name__ == "__main__":
    main()
