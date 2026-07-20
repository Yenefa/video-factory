# Textize 脚本

> 把 `raw/` 里的文件文本化成 `extracted/*.md`，喂给 ② Research。
> **流向：** RAW -> Textize 文本化 -> Research（Research 只读 extracted/，不碰 raw 解析）。
> **核心引擎：docling**（IBM，MIT，统一文档解析），全本地，无 API。

---

## 为什么用 docling（不再自己写骨架）

Textize 要处理 PDF / DOCX / HTML / 图片等格式，自己写 4 个骨架（extract_pdf / ocr_scanned / clean_html / extract_docx）是重复造轮子。docling 一个库统一处理：

- PDF（born-digital + 扫描 OCR）
- DOCX / PPTX
- HTML
- 图片（.png/.jpg，OCR + 版面）
- EPub 等

一个 `converter.convert(file)` 调用，输出 Markdown。企业级（IBM 出品，有 arXiv 论文），MIT，本地免费。

**中文 OCR：** docling 的 OCR 引擎可配置，`--ocr rapidocr` 用 RapidOCR（= PaddleOCR 的 ONNX 轻量版，中文质量同 PaddleOCR，不用装 PaddlePaddle 重框架）。

---

## 环境依赖

- **Python：** `C:\Users\fuker\AppData\Local\hermes\hermes-agent\venv\Scripts\python.exe`（3.11）
- **docling：** `pip install docling`（走代理：`HTTPS_PROXY=http://127.0.0.1:7892`）
  - 首次运行下载 DL 模型（版面分析 + 表格识别，~几百 MB，缓存本地）
  - 较重（依赖 torch 等），但效果远好于 pypdf 裸提取
- **RapidOCR（可选，中文扫描件）：** docling 内部调用，`pip install rapidocr_onnxruntime`（docling 配 `--ocr rapidocr` 时用）

---

## textize.py - 统一文本化（docling）

**用途：** 遍历 raw/，用 docling 把所有支持格式文件转成 `extracted/*.md`。

**用法：**
```bash
PY="C:/Users/fuker/AppData/Local/hermes/hermes-agent/venv/Scripts/python.exe"
RAW="D:/raw app/RawMaterialCollector/RAG/raw"
OUT="D:/raw app/RawMaterialCollector/RAG/extracted"

# 默认（docling 内置 OCR，英文/通用）
"$PY" textize/scripts/textize.py --raw "$RAW" --out "$OUT"

# 中文扫描版 PDF / 图片：用 RapidOCR（PaddleOCR ONNX 版，中文强）
"$PY" textize/scripts/textize.py --raw "$RAW" --out "$OUT" --ocr rapidocr

# 限定格式
"$PY" textize/scripts/textize.py --raw "$RAW" --out "$OUT" --exts .pdf,.docx
```

**逻辑：**
1. 遍历 raw/，按扩展名筛选（默认 .pdf/.docx/.pptx/.html/.png/.jpg/.epub 等）
2. 每个文件 `docling.convert()` -> Markdown
3. 截断 > 12000 字符（前 8000 + 后 3000，对齐 Research 上下文预算）
4. 输出 `extracted/<stem>.md`，文件头标 Source + Textized date + Method + OCR

**默认处理扩展名：** `.pdf .docx .doc .pptx .html .htm .png .jpg .jpeg .epub`
（.md/.txt 直通，不经 docling -- 待实现 passthrough）

---

## extract_pdf.py - 轻量备选（pypdf，不装 docling 时用）

**用途：** 只处理 born-digital PDF（arxiv 论文等），用 pypdf 轻量提取，不装 docling。

**用法：**
```bash
"$PY" textize/scripts/extract_pdf.py --raw "$RAW" --out "$OUT"
```

扫描版 PDF 自动跳过（文本/页 < 100 字符）。适合"只测 born-digital PDF、不想装 docling"的场景。生产用 textize.py（docling）。

---

## ocr_scanned.py - 已废弃（docling 内置 OCR 替代）

保留作参考（PaddleOCR / Tesseract 直接调用版），但**生产用 textize.py + docling**（docling 内部 OCR 统一处理，不用单独 ocr_scanned.py）。v1.5 可能删除。

---

## 完整 Textize 流程

```bash
PY="C:/Users/fuker/AppData/Local/hermes/hermes-agent/venv/Scripts/python.exe"
RAW="D:/raw app/RawMaterialCollector/RAG/raw"
OUT="D:/raw app/RawMaterialCollector/RAG/extracted"

# 一次性文本化所有格式（docling 统一处理）
"$PY" textize/scripts/textize.py --raw "$RAW" --out "$OUT" --ocr rapidocr

# 之后 ② Research 读 $OUT/*.md，不再碰 $RAW
```

---

## v1.5-20260720 状态（passthrough + cache + clean_html 集成）

- ✅ `textize.py` v1.5 - docling 统一文本化 + **.md/.txt passthrough**（自动复制+Textize头）+ **缓存**（mtime 比对，重跑秒完）+ **clean_html 集成**（docling 处理 HTML，不单独写脚本）
- ✅ `extract_pdf.py` - pypdf 轻量备选（born-digital PDF，不装 docling 时用）
- 🟡 `ocr_scanned.py` - 已废弃（docling 内置 OCR 替代），保留参考
- ✅ `.md/.txt` passthrough - v1.5 完成
- ✅ 缓存 - v1.5 完成（`.cache.json`，`--force` 强制重跑）
- ✅ clean_html - docling 处理（不单独写脚本）

**实测：** RAG topic 48 文件，v1.0 首次跑全 docling（~10min）；v1.5 删 2 个 .md out -> 重新 passthrough 生成（46 skipped cached）；再跑 48 skipped 秒完（cache 生效）。passthrough .md 带 Textize 头。

v2.0 计划：无（v1.5 已覆盖 Textize 全部需求）。后续按需。

---

*相关：`textize/README.md`（spec）/ `docs/versioning.md`（版本原则）*
