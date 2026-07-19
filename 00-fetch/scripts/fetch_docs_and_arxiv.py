#!/usr/bin/env python3
"""Fetch RAG-related materials into the RAG topic's raw folder.

Sources: official docs (HTML -> .md), arxiv papers (PDF), engineering blogs.
Routes through the system proxy (127.0.0.1:7892). Polite 1.5s delay between
fetches. Raw philosophy: store as-is, no curation.
"""
import sys, os, re, time, json, html as html_mod
from pathlib import Path
import requests

PROXY = {"http": "http://127.0.0.1:7892", "https": "http://127.0.0.1:7892"}
UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
HEADERS = {"User-Agent": UA, "Accept-Language": "en-US,en;q=0.9"}
OUT = Path(r"D:\raw app\RawMaterialCollector\RAG\raw")
OUT.mkdir(parents=True, exist_ok=True)

try:
    from bs4 import BeautifulSoup
    HAS_BS4 = True
except ImportError:
    HAS_BS4 = False


def html_to_text(html):
    if HAS_BS4:
        soup = BeautifulSoup(html, "html.parser")
        for tag in soup(["script", "style", "noscript", "nav", "footer",
                         "header", "aside", "form", "svg"]):
            tag.decompose()
        text = soup.get_text(separator="\n")
        lines = [l.rstrip() for l in text.splitlines() if l.strip()]
        return "\n".join(lines).strip()
    # regex fallback
    for pat in [r'<script[^>]*>.*?</script>', r'<style[^>]*>.*?</style>',
                r'<nav[^>]*>.*?</nav>', r'<footer[^>]*>.*?</footer>',
                r'<header[^>]*>.*?</header>', r'<aside[^>]*>.*?</aside>']:
        html = re.sub(pat, '', html, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r'<[^>]+>', ' ', html)
    text = html_mod.unescape(text)
    text = re.sub(r'[ \t]+', ' ', text)
    text = re.sub(r'\n\s*\n+', '\n\n', text)
    return text.strip()


def unique_path(stem, ext):
    p = OUT / f"{stem}.{ext}"
    n = 1
    while p.exists():
        p = OUT / f"{stem}-{n}.{ext}"
        n += 1
    return p


# (url, kind, stem)  -- kind: html | pdf
SOURCES = [
    # --- Official docs / authoritative guides ---
    ("https://python.langchain.com/docs/tutorials/rag/", "html", "langchain-rag-tutorial"),
    ("https://python.langchain.com/docs/concepts/rag/", "html", "langchain-rag-concepts"),
    ("https://docs.llamaindex.ai/en/stable/getting_started/concepts/", "html", "llamaindex-concepts"),
    ("https://docs.llamaindex.ai/en/stable/understanding/rag/", "html", "llamaindex-understanding-rag"),
    ("https://www.pinecone.io/learn/retrieval-augmented-generation/", "html", "pinecone-rag-guide"),
    ("https://www.anthropic.com/news/contextual-retrieval", "html", "anthropic-contextual-retrieval"),
    ("https://txt.cohere.com/rag/", "html", "cohere-rag"),
    ("https://haystack.deepset.ai/tutorials/30_first_rag_pipeline", "html", "haystack-rag-tutorial"),
    ("https://cloud.google.com/vertex-ai/generative-ai/docs/rag-overview", "html", "google-vertex-rag"),
    ("https://platform.openai.com/docs/guides/embeddings", "html", "openai-embeddings-guide"),
    ("https://microsoft.github.io/graphrag/", "html", "microsoft-graphrag-docs"),
    ("https://blog.langchain.dev/", "html", "langchain-blog-index"),
    ("https://www.llamaindex.ai/blog", "html", "llamaindex-blog-index"),
    ("https://lilianweng.github.io/", "html", "lilianweng-blog-index"),
    ("https://magazine.sebastianraschka.com/", "html", "raschka-blog-index"),
    # --- arxiv papers (full PDFs) ---
    ("https://arxiv.org/pdf/2005.11401", "pdf", "rag-lewis-2020-original"),
    ("https://arxiv.org/pdf/2310.11511", "pdf", "self-rag"),
    ("https://arxiv.org/pdf/2404.16130", "pdf", "graphrag-microsoft"),
    ("https://arxiv.org/pdf/2401.15858", "pdf", "crag-corrective-rag"),
    ("https://arxiv.org/pdf/2402.03367", "pdf", "rag-fusion"),
    ("https://arxiv.org/pdf/2305.06983", "pdf", "active-rag-flare"),
    ("https://arxiv.org/pdf/2305.11554", "pdf", "replug-retrieval-augmented"),
    ("https://arxiv.org/pdf/2208.03299", "pdf", "atlas-fewshot-rag"),
    ("https://arxiv.org/pdf/2310.01352", "pdf", "ra-dit-retrieval-augmented-instruction-tuning"),
    ("https://arxiv.org/pdf/2312.10997", "pdf", "rag-survey-2023"),
    ("https://arxiv.org/pdf/2404.14746", "pdf", "rar-retrieval-augmented-reasoning"),
    ("https://arxiv.org/pdf/2310.04428", "pdf", "hyde-hypothetical-document-embeddings"),
    ("https://arxiv.org/pdf/2210.03629", "pdf", "conversational-rag"),
]


def main():
    print(f"bs4: {'yes' if HAS_BS4 else 'no (regex fallback)'}, output: {OUT}")
    results = []
    for url, kind, stem in SOURCES:
        try:
            r = requests.get(url, proxies=PROXY, headers=HEADERS,
                             timeout=45, allow_redirects=True)
            ct = r.headers.get("content-type", "").lower()
            is_pdf = (kind == "pdf") or ("pdf" in ct)
            if is_pdf and len(r.content) > 1000:
                p = unique_path(stem, "pdf")
                p.write_bytes(r.content)
                results.append({"stem": stem, "status": "OK", "file": p.name,
                                "size": len(r.content), "url": url})
                print(f"OK   {stem:42s} {len(r.content):>10,} B  -> {p.name}")
            elif is_pdf:
                raise ValueError(f"suspiciously small pdf ({len(r.content)} B)")
            else:
                r.encoding = r.apparent_encoding or "utf-8"
                text = html_to_text(r.text)
                if len(text) < 500:
                    raise ValueError(f"html text too short ({len(text)} ch)")
                p = unique_path(stem, "md")
                header = (f"# {stem}\n\n> Source: {url}\n> Fetched: 2026-07-20\n"
                          f"> Content-Type: {ct}\n\n---\n\n")
                p.write_text(header + text + "\n", encoding="utf-8")
                results.append({"stem": stem, "status": "OK", "file": p.name,
                                "size": len(text), "url": url})
                print(f"OK   {stem:42s} {len(text):>10,} ch  -> {p.name}")
        except Exception as e:
            results.append({"stem": stem, "status": "ERR", "error": str(e)[:120], "url": url})
            print(f"ERR  {stem:42s} {str(e)[:100]}")
        time.sleep(1.5)

    ok = sum(1 for x in results if x["status"] == "OK")
    print(f"\n=== {ok}/{len(results)} OK ===")
    rep = OUT / "_fetch_report.json"
    rep.write_text(json.dumps(results, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"report: {rep}")


if __name__ == "__main__":
    main()
