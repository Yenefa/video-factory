# Textize 脚本

> 把 `raw/` 里的文件文本化成 `extracted/*.md`，喂给 ② Research。
> **流向：** RAW -> Textize 文本化 -> Research（Research 只读 extracted/，不碰 raw 解析）。

---

## 环境依赖

- **Python：** `C:\Users\fuker\AppData\Local\hermes\hermes-agent\venv\Scripts\python.exe`（3.11 + pypdf 6.14）
- **pypdf**（born-digital PDF 提取）：已装
- **Tesseract OCR**（扫描件/图片，本地免费）：
  - `pip install pytesseract pdf2image Pillow`
  - Tesseract 引擎：Windows 装 [UB Mannheim Tesseract](https://github.com/UB-Mannheim/tesseract/wiki)
  - poppler（pdf2image 依赖）：[poppler-windows](https://github.com/oschwartz10612/poppler-windows/releases)，加 PATH
- **Mistral OCR**（API，质量高，付费）：
  - `pip install mistralai`
  - `MISTRAL_API_KEY` 环境变量

---

## extract_pdf.py - born-digital PDF 文本提取

**用途：** 提取 raw/ 里有文本层的 PDF（如 arxiv 论文）-> `extracted/*.md`。扫描版 PDF（文本层空）自动跳过，交给 `ocr_scanned.py`。

**用法：**
```bash
python extract_pdf.py \
  --raw "D:/raw app/RawMaterialCollector/RAG/raw" \
  --out "D:/raw app/RawMaterialCollector/RAG/extracted"
```

**逻辑：**
1. pypdf 逐页提取文本
2. 判定 born-digital vs 扫描版：`文本字符数 / 页数 < 100` -> 扫描版，跳过
3. 截断：> 12000 字符 -> 前 8000 + 后 3000（保留摘要+结论，和 Research 上下文预算对齐）
4. 输出 `.md` 到 extracted/，文件头标 Source + Textized date + Method + Pages

**输出示例：**
```markdown
> **Source:** rag-lewis-2020-original.pdf
> **Textized:** 2026-07-20
> **Method:** pypdf (born-digital)
> **Pages:** 19
> **Original chars:** 69065

---

<提取的文本，截断到 12000 字符以内>
```

---

## ocr_scanned.py - 扫描版 PDF / 图片 OCR

**用途：** 处理 `extract_pdf.py` 跳过的扫描版 PDF + 图片（.png/.jpg）-> `extracted/*.md`。

**用法：**
```bash
# 本地 Tesseract（免费，私有）
python ocr_scanned.py \
  --raw "D:/raw app/RawMaterialCollector/RAG/raw" \
  --out "D:/raw app/RawMaterialCollector/RAG/extracted" \
  --backend tesseract --include-images

# Mistral OCR API（质量高，付费）
MISTRAL_API_KEY=xxx python ocr_scanned.py \
  --raw "..." --out "..." --backend mistral --include-images
```

**逻辑：**
1. 扫描 raw/ 找扫描版 PDF（pypdf 提取文本 < 100 字符/页）+ 图片（`--include-images`）
2. 按选定的 backend OCR（Tesseract 本地 / Mistral API）
3. 截断 + 输出 `.md`（同 extract_pdf.py 的截断策略 + 文件头）

**两种 backend 对比：**
| backend | 优点 | 缺点 | 适用 |
|---|---|---|---|
| tesseract | 本地、免费、离线、私有 | 中文/复杂排版质量一般；依赖 Tesseract+poppler | 私有数据、离线场景 |
| mistral | 质量高、多语言、表格/公式好 | 付费、需联网、数据出本地 | 质量优先、可联网 |

---

## 完整 Textize 流程（对一个 topic）

```bash
RAW="D:/raw app/RawMaterialCollector/RAG/raw"
OUT="D:/raw app/RawMaterialCollector/RAG/extracted"

# 1. born-digital PDF（arxiv 论文等）
python textize/scripts/extract_pdf.py --raw "$RAW" --out "$OUT"

# 2. 扫描版 PDF + 图片（如果有）
python textize/scripts/ocr_scanned.py --raw "$RAW" --out "$OUT" --backend tesseract --include-images

# 3.（待实现）clean_html.py - HTML 去噪
# 4.（待实现）extract_docx.py - DOCX 提取
# 5. .md/.txt 直通（复制到 extracted/，或轻清理）

# 之后 ② Research 读 $OUT/*.md，不再碰 $RAW
```

---

## v1.0-20260720 状态

- ✅ `extract_pdf.py` - 可用（pypdf born-digital 提取，基于 `00-fetch/scripts/extract_pdf_text.py` 提炼）
- 🟡 `ocr_scanned.py` - 骨架（Tesseract + Mistral 两条路径，需装依赖 + 真实测试）
- 🔲 `clean_html.py` - 待实现（从 `00-fetch/scripts/fetch_docs_and_arxiv.py` 的 `html_to_text` 提炼）
- 🔲 `extract_docx.py` - 待实现（python-docx 或 pandoc）
- 🔲 `.md/.txt` 直通逻辑 - 待实现

v1.5 计划：补全 clean_html.py / extract_docx.py / 直通逻辑 + 真实 OCR 测试 + 缓存（文件未变跳过）。

---

*相关：`textize/README.md`（spec）/ `00-fetch/scripts/`（抓取侧脚本，部分可复用）/ `docs/versioning.md`（版本原则）*
