#!/usr/bin/env python3
"""Extract text from all RAG raw materials and assemble a readable corpus
for the Research Agent (me) to consume.
- PDFs: pypdf extract, truncate to first 8000 + last 3000 chars (abstract +
  intro + conclusion) so 21 papers fit in context. Full PDF stays in raw/.
- MDs: full text.
- Output: .extracted/corpus_{md,pdf}_N.md (auto-split at 250K ch).
"""
import re
from pathlib import Path
import pypdf

RAW = Path(r"D:\raw app\RawMaterialCollector\RAG\raw")
TMP = Path(r"D:\raw app\RawMaterialCollector\RAG\.extracted")
TMP.mkdir(exist_ok=True)

SEP = "\n\n========== "

# ---- 1. PDFs ----
pdf_entries = []
for pdf in sorted(RAW.glob("*.pdf")):
    try:
        reader = pypdf.PdfReader(str(pdf))
        npages = len(reader.pages)
        raw_text = ""
        for page in reader.pages:
            t = page.extract_text() or ""
            raw_text += t + "\n"
        text = re.sub(r'\s+', ' ', raw_text).strip()
        orig = len(text)
        if orig > 12000:
            text = (text[:8000] +
                    "\n\n[... middle truncated for readability; full PDF in raw/ ...]\n\n" +
                    text[-3000:])
        pdf_entries.append(f"{SEP}PDF: {pdf.name} ({npages}p, {orig} ch extracted) ==========\n{text}\n")
        print(f"OK  {pdf.name}: {npages}p, {orig}ch -> {len(text)}ch")
    except Exception as e:
        pdf_entries.append(f"{SEP}PDF: {pdf.name} (EXTRACTION FAILED: {e}) ==========\n")
        print(f"ERR {pdf.name}: {e}")

# ---- 2. MDs ----
md_entries = []
for md in sorted(RAW.glob("*.md")):
    try:
        text = md.read_text(encoding="utf-8")
        md_entries.append(f"{SEP}MD: {md.name} ({len(text)} ch) ==========\n{text}\n")
        print(f"OK  {md.name}: {len(text)}ch")
    except Exception as e:
        print(f"ERR {md.name}: {e}")

corpus_md = "".join(md_entries)
corpus_pdf = "".join(pdf_entries)
print(f"\nMD corpus:  {len(corpus_md):>9,} ch")
print(f"PDF corpus: {len(corpus_pdf):>9,} ch")


def write_split(content, prefix, max_size=250000):
    """Split at section boundaries (==========) so each part <= max_size."""
    if not content:
        return []
    sections = re.split(r'(?=\n\n========== )', content)
    parts = []
    chunk = ""
    idx = 1
    for sec in sections:
        if not sec.strip():
            continue
        if len(chunk) + len(sec) > max_size and chunk:
            p = TMP / f"{prefix}_{idx}.md"
            p.write_text(chunk, encoding="utf-8")
            parts.append((p.name, len(chunk)))
            idx += 1
            chunk = sec
        else:
            chunk += sec
    if chunk:
        p = TMP / f"{prefix}_{idx}.md"
        p.write_text(chunk, encoding="utf-8")
        parts.append((p.name, len(chunk)))
    return parts


md_parts = write_split(corpus_md, "corpus_md")
pdf_parts = write_split(corpus_pdf, "corpus_pdf")
print("\nMD parts:")
for n, s in md_parts:
    print(f"  {n}: {s:,} ch")
print("PDF parts:")
for n, s in pdf_parts:
    print(f"  {n}: {s:,} ch")
