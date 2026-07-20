#!/usr/bin/env python3
"""Textize stage: OCR scanned PDFs and images in raw/ -> extracted/*.md.

**100% local, no API, no online, data stays on machine.**

Two local backends (selectable via --backend):

  --backend paddleocr  : PaddleOCR (Baidu, DEFAULT) - best Chinese quality,
                         modern deep-learning OCR, supports layout/tables
  --backend tesseract  : Tesseract + pdf2image - lightweight, traditional,
                         Chinese quality mediocre

Both run fully offline (PaddleOCR downloads models on first run, ~100MB).

Prerequisites:
  paddleocr: pip install paddlepaddle paddleocr pdf2image Pillow
             + poppler for pdf2image (Windows: poppler-windows, add PATH)
             First run downloads PP-OCR models (~100MB, cached locally)
  tesseract: pip install pytesseract pdf2image Pillow
             + Tesseract engine (Windows: UB Mannheim Tesseract build)
             + poppler for pdf2image

Usage:
    # PaddleOCR (default, recommended - best Chinese)
    python ocr_scanned.py --raw "<raw>" --out "<extracted>" --backend paddleocr
    python ocr_scanned.py --raw "<raw>" --out "<extracted>" --lang ch --include-images

    # Tesseract (lightweight fallback)
    python ocr_scanned.py --raw "<raw>" --out "<extracted>" --backend tesseract
"""
import re
import argparse
import tempfile
from pathlib import Path

HEADER_TEMPLATE = """> **Source:** {name}
> **Textized:** {date}
> **Method:** ocr-{backend} (lang={lang})
> **Type:** {kind}

---

{body}
"""

SCANNED_THRESHOLD = 100  # chars/page below which a PDF is considered scanned


def is_scanned_pdf(pdf_path):
    """Detect scanned PDF: pypdf extracts too little text per page."""
    import pypdf
    reader = pypdf.PdfReader(str(pdf_path))
    npages = len(reader.pages)
    if npages == 0:
        return True
    text = ""
    for page in reader.pages:
        text += (page.extract_text() or "") + "\n"
    text = re.sub(r'\s+', ' ', text).strip()
    return (len(text) / npages) < SCANNED_THRESHOLD


# ---------------------------------------------------------------------------
# PaddleOCR backend (default, recommended)
# ---------------------------------------------------------------------------

def _paddleocr_instance(lang):
    from paddleocr import PaddleOCR
    # PaddleOCR 3.x API; use_angle_cls auto in 3.x. lang: ch / en / japan / ...
    return PaddleOCR(lang=lang)


def ocr_paddleocr_image(img_path, lang='ch'):
    """OCR an image via PaddleOCR. Returns text."""
    ocr = _paddleocr_instance(lang)
    result = ocr.ocr(str(img_path))
    if not result or not result[0]:
        return ""
    lines = []
    for entry in result[0]:
        # PaddleOCR: entry = [box, (text, confidence)]
        try:
            lines.append(entry[1][0])
        except (IndexError, TypeError):
            continue
    return "\n".join(lines)


def ocr_paddleocr_pdf(pdf_path, lang='ch'):
    """OCR a scanned PDF via PaddleOCR (pdf2image -> per-page OCR)."""
    from pdf2image import convert_from_path
    images = convert_from_path(str(pdf_path))
    texts = []
    for img in images:
        with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as tmp:
            tmp_path = tmp.name
        try:
            img.save(tmp_path)
            texts.append(ocr_paddleocr_image(tmp_path, lang))
        finally:
            Path(tmp_path).unlink(missing_ok=True)
    return "\n".join(texts)


# ---------------------------------------------------------------------------
# Tesseract backend (lightweight fallback)
# ---------------------------------------------------------------------------

def ocr_tesseract_image(img_path):
    import pytesseract
    from PIL import Image
    return pytesseract.image_to_string(Image.open(str(img_path)))


def ocr_tesseract_pdf(pdf_path):
    import pytesseract
    from pdf2image import convert_from_path
    images = convert_from_path(str(pdf_path))
    return "\n".join(pytesseract.image_to_string(img) for img in images)


# ---------------------------------------------------------------------------

def truncate(text, max_chars=12000, head=8000, tail=3000):
    if len(text) <= max_chars:
        return text
    return (text[:head] +
            "\n\n[... truncated for readability; full file in raw/ ...]\n\n" +
            text[-tail:])


def main():
    ap = argparse.ArgumentParser(description="Textize: OCR scanned PDFs + images -> .md (local only)")
    ap.add_argument("--raw", required=True, help="raw/ directory (input)")
    ap.add_argument("--out", required=True, help="extracted/ directory (output)")
    ap.add_argument("--backend", choices=["paddleocr", "tesseract"],
                    default="paddleocr", help="OCR backend (default: paddleocr)")
    ap.add_argument("--lang", default="ch",
                    help="paddleocr lang: ch / en / japan / korean / ... (default: ch)")
    ap.add_argument("--include-images", action="store_true",
                    help="also OCR .png/.jpg/.jpeg images")
    ap.add_argument("--date", default="2026-07-20")
    args = ap.parse_args()

    raw = Path(args.raw)
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)

    # collect targets: scanned PDFs + (optionally) images
    targets = []
    for pdf in sorted(raw.glob("*.pdf")):
        try:
            if is_scanned_pdf(pdf):
                targets.append(pdf)
        except Exception as e:
            print(f"WARN couldn't check {pdf.name}: {e}")
    if args.include_images:
        for ext in ("*.png", "*.jpg", "*.jpeg"):
            targets.extend(sorted(raw.glob(ext)))

    print(f"backend: {args.backend}, lang: {args.lang}, targets: {len(targets)}")

    ok = failed = 0
    for target in targets:
        try:
            is_pdf = target.suffix.lower() == ".pdf"
            if is_pdf:
                if args.backend == "paddleocr":
                    text = ocr_paddleocr_pdf(target, args.lang)
                else:
                    text = ocr_tesseract_pdf(target)
                kind = "scanned-pdf"
            else:
                if args.backend == "paddleocr":
                    text = ocr_paddleocr_image(target, args.lang)
                else:
                    text = ocr_tesseract_image(target)
                kind = "image"
            text = re.sub(r'\s+', ' ', text).strip()
            if len(text) < 50:
                print(f"SKIP (OCR empty): {target.name}")
                continue
            body = truncate(text)
            md = out / f"{target.stem}.md"
            md.write_text(
                HEADER_TEMPLATE.format(
                    name=target.name, date=args.date,
                    backend=args.backend, lang=args.lang, kind=kind, body=body),
                encoding="utf-8")
            ok += 1
            print(f"OK   {target.name:50s} -> {md.name} ({len(body):,} ch)")
        except Exception as e:
            print(f"ERR  {target.name}: {e}")
            failed += 1

    print(f"\n=== {ok} OCR'd, {failed} failed ===")


if __name__ == "__main__":
    main()
