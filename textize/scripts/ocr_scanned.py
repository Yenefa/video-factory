#!/usr/bin/env python3
"""Textize stage: OCR scanned PDFs and images in raw/ -> extracted/*.md.

Handles the inputs that extract_pdf.py skips (scanned PDFs with no text layer)
plus image files (.png/.jpg). Two OCR backends, selectable via --backend:

  --backend tesseract  : Tesseract + pdf2image (local, free, offline, private)
  --backend mistral    : Mistral OCR API (higher quality, paid, online)

This is a skeleton (v1.0-20260720 spec). Full implementation planned for
Textize v1.5 alongside Research Spec v1.5.

Prerequisites:
  tesseract: pip install pytesseract pdf2image Pillow
             + Tesseract OCR engine installed (Windows: Tesseract at UB Mannheim)
             + poppler for pdf2image (Windows: poppler-windows)
  mistral:   pip install mistralai
             + MISTRAL_API_KEY env var set

Usage:
    python ocr_scanned.py --raw "<raw dir>" --out "<extracted dir>" --backend tesseract
    python ocr_scanned.py --raw "<raw dir>" --out "<extracted dir>" --backend mistral --include-images
"""
import re
import argparse
from pathlib import Path

HEADER_TEMPLATE = """> **Source:** {name}
> **Textized:** {date}
> **Method:** ocr-{backend}
> **Pages/Items:** {count}

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


def ocr_tesseract_pdf(pdf_path):
    """OCR a scanned PDF via Tesseract + pdf2image. Returns text."""
    import pytesseract
    from pdf2image import convert_from_path
    images = convert_from_path(str(pdf_path))
    parts = []
    for img in images:
        parts.append(pytesseract.image_to_string(img))
    return "\n".join(parts)


def ocr_tesseract_image(img_path):
    """OCR an image via Tesseract + PIL. Returns text."""
    import pytesseract
    from PIL import Image
    return pytesseract.image_to_string(Image.open(str(img_path)))


def ocr_mistral(file_path):
    """OCR via Mistral OCR API. Returns text.

    Skeleton - adjust to mistralai SDK version installed.
    """
    import os
    from mistralai import Mistral
    api_key = os.environ.get("MISTRAL_API_KEY")
    if not api_key:
        raise RuntimeError("MISTRAL_API_KEY env var not set")
    client = Mistral(api_key=api_key)
    with open(str(file_path), "rb") as f:
        uploaded = client.files.upload(file={"file_name": file_path.name, "file": f})
    signed = client.files.get_signed_url(file_id=uploaded.id)
    ocr_resp = client.ocr.process(
        model="mistral-ocr-latest",
        document={"type": "document_url", "document_url": signed.url})
    # SDK version differences: try .pages[].markdown, fallback to str
    if hasattr(ocr_resp, "pages") and ocr_resp.pages:
        return "\n\n".join(p.markdown for p in ocr_resp.pages if hasattr(p, "markdown"))
    return str(ocr_resp)


def truncate(text, max_chars=12000, head=8000, tail=3000):
    if len(text) <= max_chars:
        return text
    return (text[:head] +
            "\n\n[... truncated for readability; full file in raw/ ...]\n\n" +
            text[-tail:])


def main():
    ap = argparse.ArgumentParser(description="Textize: OCR scanned PDFs + images -> .md")
    ap.add_argument("--raw", required=True, help="raw/ directory (input)")
    ap.add_argument("--out", required=True, help="extracted/ directory (output)")
    ap.add_argument("--backend", choices=["tesseract", "mistral"], default="tesseract")
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

    print(f"backend: {args.backend}, targets: {len(targets)}")

    ok = failed = 0
    for target in targets:
        try:
            if target.suffix.lower() == ".pdf":
                if args.backend == "tesseract":
                    text = ocr_tesseract_pdf(target)
                else:
                    text = ocr_mistral(target)
                count = len(pypdf.PdfReader(str(target)).pages) if args.backend == "tesseract" else "?"
            else:
                if args.backend == "tesseract":
                    text = ocr_tesseract_image(target)
                else:
                    text = ocr_mistral(target)
                count = 1
            text = re.sub(r'\s+', ' ', text).strip()
            if len(text) < 50:
                print(f"SKIP (OCR empty): {target.name}")
                continue
            body = truncate(text)
            md = out / f"{target.stem}.md"
            md.write_text(
                HEADER_TEMPLATE.format(
                    name=target.name, date=args.date,
                    backend=args.backend, count=count, body=body),
                encoding="utf-8")
            ok += 1
            print(f"OK   {target.name:50s} -> {md.name} ({len(body):,} ch)")
        except Exception as e:
            print(f"ERR  {target.name}: {e}")
            failed += 1

    print(f"\n=== {ok} OCR'd, {failed} failed ===")


if __name__ == "__main__":
    main()
