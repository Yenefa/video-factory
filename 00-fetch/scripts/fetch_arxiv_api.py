#!/usr/bin/env python3
"""Round 2: supplement RAG materials.
1. Try Reddit r/Rag RSS (community discussion).
2. arxiv API search to fill remaining slots with fresh papers.
Skips arxiv IDs already fetched in round 1.
"""
import re, time, json, html as html_mod
from pathlib import Path
import requests
import xml.etree.ElementTree as ET

PROXY = {"http": "http://127.0.0.1:7892", "https": "http://127.0.0.1:7892"}
UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
HEADERS = {"User-Agent": UA, "Accept-Language": "en-US,en;q=0.9"}
OUT = Path(r"D:\raw app\RawMaterialCollector\RAG\raw")

DONE_IDS = {"2005.11401", "2310.11511", "2404.16130", "2401.15858",
            "2402.03367", "2305.06983", "2305.11554", "2208.03299",
            "2310.01352", "2312.10997", "2404.14746", "2310.04428",
            "2210.03629"}


def unique(stem, ext):
    p = OUT / f"{stem}.{ext}"
    n = 1
    while p.exists():
        p = OUT / f"{stem}-{n}.{ext}"
        n += 1
    return p


def slug(s, n=60):
    s = re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')
    return s[:n] or "untitled"


# ---------- Part 1: Reddit RSS ----------
reddit_count = 0
print("=== Reddit r/Rag RSS ===")
try:
    r = requests.get("https://www.reddit.com/r/Rag/top/.rss?t=all&limit=25",
                     proxies=PROXY, headers=HEADERS, timeout=30)
    print(f"RSS status: {r.status_code}, len {len(r.content)}")
    if r.status_code == 200 and len(r.content) > 500:
        root = ET.fromstring(r.text)
        items = root.findall(".//item")
        print(f"items found: {len(items)}")
        for it in items:
            if reddit_count >= 8:
                break
            title = (it.findtext("title") or "").strip() or "untitled"
            link = (it.findtext("link") or "").strip()
            desc = it.findtext("description") or ""
            content = it.find("{http://purl.org/rss/1.0/modules/content/}encoded")
            body = (content.text if content is not None and content.text else desc) or ""
            body = re.sub(r'<[^>]+>', ' ', body)
            body = html_mod.unescape(body)
            body = re.sub(r'\s+', ' ', body).strip()
            if len(body) < 200:
                continue
            stem = "reddit-" + slug(title)
            p = unique(stem, "md")
            header = (f"# {title}\n\n> Source: {link}\n> Fetched: 2026-07-20\n"
                      f"> From: r/Rag top (RSS)\n\n---\n\n{body}\n")
            p.write_text(header, encoding="utf-8")
            reddit_count += 1
            print(f"OK   reddit-{reddit_count} {len(body):>8,} ch  -> {p.name}")
            time.sleep(0.3)
except Exception as e:
    print(f"Reddit RSS ERR: {e}")
print(f"Reddit total: {reddit_count}\n")

# ---------- Part 2: arxiv API ----------
target_extra = max(0, 8 - reddit_count)
print(f"=== arxiv API (need {target_extra} more) ===")
if target_extra > 0:
    try:
        r = requests.get("http://export.arxiv.org/api/query",
                         params={"search_query": 'all:"retrieval augmented generation"',
                                 "start": 0, "max_results": 40, "sortBy": "relevance"},
                         proxies=PROXY, headers=HEADERS, timeout=45)
        print(f"API status: {r.status_code}, len {len(r.content)}")
        root = ET.fromstring(r.text)
        ns = {"a": "http://www.w3.org/2005/Atom"}
        got = 0
        for e in root.findall("a:entry", ns):
            if got >= target_extra:
                break
            title = " ".join((e.find("a:title", ns).text or "").split())
            id_url = (e.find("a:id", ns).text or "").strip()
            m = re.search(r"arxiv\.org/abs/([^v/?]+)", id_url)
            aid = m.group(1) if m else None
            if not aid or aid in DONE_IDS:
                continue
            pdf_url = None
            for link in e.findall("a:link", ns):
                if link.get("title") == "pdf":
                    pdf_url = link.get("href")
            if not pdf_url:
                continue
            try:
                pr = requests.get(pdf_url, proxies=PROXY, headers=HEADERS, timeout=60)
                if len(pr.content) < 2000:
                    print(f"skip {aid} (small {len(pr.content)} B)")
                    continue
                stem = slug(title) if title else f"rag-{aid}"
                p = unique(stem, "pdf")
                p.write_bytes(pr.content)
                DONE_IDS.add(aid)
                got += 1
                print(f"OK   {aid:14s} {len(pr.content):>10,} B  -> {p.name}  | {title[:50]}")
            except Exception as ex:
                print(f"ERR  {aid}: {ex}")
            time.sleep(1.5)
        print(f"arxiv extra: {got}")
    except Exception as e:
        print(f"arxiv API ERR: {e}")

print("\n=== round 2 done ===")
