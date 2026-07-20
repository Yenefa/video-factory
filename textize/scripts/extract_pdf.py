#!/usr/bin/env python3
"""Textize stage: extract text from born-digital PDFs in raw/ -> extracted/*.md.

Reads <workspace>/<Topic>/raw/*.pdf, uses pypdf to extract the text layer.
If a PDF's extracted text is below threshold (chars/page), it's likely a
scanned PDF -> skipped here (ocr_scanned.py handles those).

Outputs one .md per PDF to <workspace>/<Topic>/extracted/, with a source
metadata header. Truncates to first 8000 + last 3000 chars to fit Research
Agent context budget (full PDF always stays in raw/).

Usage:
    python extract_pdf.py --raw "D:/raw app/RawMaterialCollector/RAG/raw" \
                          --out "D:/raw app/RawMaterialCollector/RAG/extracted"
"""
import re
import argparse
from pathlib import Path
import pypdf

HEADER_TEMPLATE = """> **Source:** {name}
> **Textized:** {date}
> **Method:** pypdf (born-digital)
> **Pages:** {pages}
> **Original chars:** {orig}

---

{body}
"""

SCANNED_THRESHOLD = 100  # chars per page below which a PDF is considered scanned


def extract_one(pdf_path):
    """Extract text from a PDF. Returns (text, npages, is_born_digital)."""
    reader = pypdf.PdfReader(str(pdf_path))
    npages = len(reader.pages)
    text = ""
    for page in reader.pages:
        text += (page.extract_text() or "") + "\n"
    text = re.sub(r'\s+', ' ', text).strip()
    is_digital = npages > 0 and (len(text) / npages) >= SCANNED_THRESHOLD
    return text, npages, is_digital


def truncate(text, max_chars=12000, head=8000, tail=3000):
    if len(text) <= max_chars:
        return text
    return (text[:head] +
            "\n\n[... truncated for readability; full PDF in raw/ ...]\n\n" +
            text[-tail:])


def main():
    ap = argparse.ArgumentParser(description="Textize: born-digital PDF -> .md")
    ap.add_argument("--raw", required=True, help="raw/ directory (input)")
    ap.add_argument("--out", required=True, help="extracted/ directory (output)")
    ap.add_argument("--date", default="2026-07-20", help="date stamp for header")
    args = ap.parse_args()

    raw = Path(args.raw)
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)

    pdfs = sorted(raw.glob("*.pdf"))
    print(f"found {len(pdfs)} PDFs in {raw}")

    ok = scanned = failed = 0
    for pdf in pdfs:
        try:
            text, npages, is_digital = extract_one(pdf)
            if not is_digital:
                print(f"SKIP (scanned, needs ocr_scanned.py): {pdf.name}")
                scanned += 1
                continue
            if len(text) < 100:
                print(f"SKIP (empty): {pdf.name}")
                scanned += 1
                continue
            body = truncate(text)
            md = out / f"{pdf.stem}.md"
            md.write_text(
                HEADER_TEMPLATE.format(
                    name=pdf.name, date=args.date, pages=npages,
                    orig=len(text), body=body),
                encoding="utf-8")
            ok += 1
            print(f"OK   {pdf.name:50s} -> {md.name} ({len(body):,} ch, {npages}p)")
        except Exception as e:
            print(f"ERR  {pdf.name}: {e}")
            failed += 1

    print(f"\n=== {ok} extracted, {scanned} scanned (needs OCR), {failed} failed ===")


if __name__ == "__main__":
    main()
