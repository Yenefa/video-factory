# Textize 脚本

> 把 `raw/` 里的文件文本化成 `extracted/*.md`，喂给 ② Research。
> **流向：** RAW -> Textize 文本化 -> Research（Research 只读 extracted/，不碰 raw 解析）。
> **全本地，无 API**（OCR 用 PaddleOCR / Tesseract，不联网不付费）。

---

## 环境依赖

- **Python：** `C:\Users\fuker\AppData\Local\hermes\hermes-agent\venv\Scripts\python.exe`（3.11 + pypdf 6.14）
- **pypdf**（born-digital PDF 提取）：已装

### OCR 依赖（按 backend 选）

**PaddleOCR（默认，推荐，中文强）：**
```bash
pip install paddlepaddle paddleocr pdf2image Pillow
```
- 首次运行自动下载 PP-OCR 模型（~100MB，缓存本地，之后离线可用）
- `pdf2image` 依赖 **poppler**：Windows 装 [poppler-windows](https://github.com/oschwartz10612/poppler-windows/releases)，加 PATH

**Tesseract（轻量备选，中文一般）：**
```bash
pip install pytesseract pdf2image Pillow
```
- 装 [UB Mannheim Tesseract](https://github.com/UB-Mannheim/tesseract/wiki) 引擎
- 同样需要 poppler（pdf2image）

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
3. 截断：> 12000 字符 -> 前 8000 + 后 3000（和 Research 上下文预算对齐）
4. 输出 `.md` 到 extracted/，文件头标 Source + Textized date + Method + Pages

---

## ocr_scanned.py - 扫描版 PDF / 图片 OCR（全本地）

**用途：** 处理 `extract_pdf.py` 跳过的扫描版 PDF + 图片（.png/.jpg）-> `extracted/*.md`。**无 API，全本地。**

**用法：**
```bash
# PaddleOCR（默认，推荐 -- 中文质量强）
python ocr_scanned.py \
  --raw "D:/raw app/RawMaterialCollector/RAG/raw" \
  --out "D:/raw app/RawMaterialCollector/RAG/extracted" \
  --backend paddleocr --lang ch --include-images

# Tesseract（轻量备选）
python ocr_scanned.py \
  --raw "..." --out "..." --backend tesseract --include-images
```

**两种 backend 对比：**
| backend | 中文质量 | 速度 | 依赖 | 适用 |
|---|---|---|---|---|
| **paddleocr**（默认） | ⭐⭐⭐⭐⭐ | 中 | PaddlePaddle + 模型（~100MB） | 推荐，尤其中文/复杂版面 |
| tesseract | ⭐⭐ | 快 | Tesseract + poppler | 轻量、英文/简单扫描件 |

**逻辑：**
1. 扫描 raw/ 找扫描版 PDF（pypdf 提取文本 < 100 字符/页）+ 图片（`--include-images`）
2. 按选定的 backend OCR（PaddleOCR / Tesseract，**都本地**）
3. PDF 先 `pdf2image` 转图片再逐页 OCR
4. 截断 + 输出 `.md`（同 extract_pdf.py 的截断策略 + 文件头）

---

## 完整 Textize 流程（对一个 topic）

```bash
RAW="D:/raw app/RawMaterialCollector/RAG/raw"
OUT="D:/raw app/RawMaterialCollector/RAG/extracted"
PY="C:/Users/fuker/AppData/Local/hermes/hermes-agent/venv/Scripts/python.exe"

# 1. born-digital PDF（arxiv 论文等）
"$PY" textize/scripts/extract_pdf.py --raw "$RAW" --out "$OUT"

# 2. 扫描版 PDF + 图片（如果有，PaddleOCR 本地）
"$PY" textize/scripts/ocr_scanned.py --raw "$RAW" --out "$OUT" --backend paddleocr --lang ch --include-images

# 3.（待实现）clean_html.py - HTML 去噪
# 4.（待实现）extract_docx.py - DOCX 提取
# 5. .md/.txt 直通（复制到 extracted/，或轻清理）

# 之后 ② Research 读 $OUT/*.md，不再碰 $RAW
```

---

## v1.0-20260720 状态

- ✅ `extract_pdf.py` - 可用（pypdf born-digital 提取）
- 🟡 `ocr_scanned.py` - PaddleOCR + Tesseract 两本地 backend，骨架完整，需装依赖 + 真实测试
- 🔲 `clean_html.py` - 待实现（从 `00-fetch/scripts/fetch_docs_and_arxiv.py` 的 `html_to_text` 提炼）
- 🔲 `extract_docx.py` - 待实现（python-docx 或 pandoc）
- 🔲 `.md/.txt` 直通逻辑 - 待实现

v1.5 计划：补全 clean_html.py / extract_docx.py / 直通逻辑 + PaddleOCR 真实测试 + 缓存（文件未变跳过）。

---

*相关：`textize/README.md`（spec）/ `00-fetch/scripts/`（抓取侧脚本，部分可复用）/ `docs/versioning.md`（版本原则）*
