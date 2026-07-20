# Textize - 文本化服务（上方横切，不占流程层号）

> **位置：** ① Raw 和 ② Research 之间（从 raw 取文件，文本化后喂 research）
> **性质：** 上方基础设施服务，**不是流程串联层**，不占层号
> **状态：** v1.0-20260720（spec only，脚本待实现）
> **版本原则：** Anthropic 风格，见 `../docs/versioning.md`

---

## 定位

Textize 是 Video Factory 的**上方横切服务**，作用点在 ① Raw 和 ② Research 之间。它从 raw 取文件，文本化成干净 `.md`，从上方"箭头指下"喂给 research（及未来任何需要文本的层）。**主流程 9 层不变，Textize 不占层号。**

```
                    ┌─────────────────────────────────┐
                    │            Textize                │  ← 上方服务（不占流程层号）
                    │     raw 文件  ->  干净 .md 文本     │
                    │  · born-digital PDF  -> pypdf      │
                    │  · 扫描版 PDF / 图片 -> OCR/VLM     │
                    │  · HTML              -> 去噪提正文  │
                    │  · DOCX              -> 提取        │
                    └────────────────┬──────────────────┘
                                     │ 文本（.md）
                                     ↓ extracted/
  ⓪ Fetch  ->  ① Raw  ->  ② Research  ->  ③ Script  ->  ④ Visual  ->  …  ->  ⑧ Render
                                  ↑ 消费 extracted/，不再碰文件解析
```

**为什么是上方服务而不是串联层：**
- **主流程保持简洁** -- 9 层业务流程不变，Textize 是基础设施，不打断流程
- **可复用** -- 未来 ③ Script / ④ Visual 等任何层需要"文件->文本"，都从 Textize 取，不重复实现
- **Raw 保持纯净** -- Textize 只读 raw/，不写
- **Research 简化** -- 删掉 PDF 提取 / OCR fallback 逻辑，只读 `extracted/` 的 .md
- **OCR 是子模块** -- OCR 不配独立成层（只覆盖 2/6 输入类型），归 Textize

---

## 职责

✅ 读 `<workspace>/<Topic>/raw/` 里的文件
✅ 按文件类型文本化（见下表）
✅ 输出干净 `.md` 到 `<workspace>/<Topic>/extracted/`
✅ 缓存（同文件不重复提取，文件未变则跳过）
✅ 文件头标元信息（Source file + Textized date + 方法）

❌ 不分类、不总结、不提取概念（那是 ② Research 的事）
❌ 不修改 raw 里的原文件
❌ 不做语义分析（只做格式 -> 文本）

---

## 6 种输入处理

| 输入类型 | 处理方法 | 是 OCR 吗？ |
|---|---|---|
| born-digital PDF（arxiv 论文等，有文本层） | `pypdf` 提取文本层 | ❌ |
| 扫描版 PDF（合同/书/老论文扫描件，页面是图片） | OCR（Tesseract / Mistral OCR / docling） | ✅ |
| 图片（截图/照片） | OCR 提取文字 + 可选 VLM 描述图像内容 | ✅ |
| HTML（带导航/广告/页脚） | 去噪（去 script/style/nav/footer/header）+ 提正文 | ❌ |
| DOCX | 文本提取（python-docx 或 pandoc） | ❌ |
| .md / .txt | 直通（或轻清理：去多余空白） | ❌ |

**判定 PDF 是 born-digital 还是扫描版：** pypdf 提取，若文本长度 < 阈值（如 < 100 字符/页）则判定为扫描版，触发 OCR fallback。

---

## OCR 子模块选型（处理扫描件/图片时）

| 工具 | 类型 | 优点 | 缺点 |
|---|---|---|---|
| **Tesseract + OCRmyPDF** | 本地开源免费 | 零成本、离线、私有 | 中文/复杂排版质量一般 |
| **Mistral OCR** | API | 质量高、多语言、支持表格/公式 | 收费、需联网、数据出本地 |
| **docling (IBM)** | 本地开源 | 处理混合排版/表格强、输出 Markdown | 较重、依赖多 |
| **VLM（GPT-4o vision / Claude vision）** | API | 能描述图像内容（不只 OCR） | 收费、慢、适合图片描述而非纯 OCR |

**选型原则：** 私有数据优先 Tesseract/docling（本地）；质量优先 Mistral OCR；图片内容理解用 VLM。按 topic 需求配。

---

## 输出格式

每个 raw 文件文本化后，输出一个 `.md` 到 `extracted/`，文件名 = raw 文件 stem + `.md`：

```markdown
> **Source:** <raw file name>
> **Textized:** 2026-07-20
> **Method:** pypdf / ocr-tesseract / ocr-mistral / html-clean / docx-extract / passthrough
> **Original size:** <bytes> / <pages>

---

<干净文本>

[... truncated for readability if > 12000 chars; full text in raw/ ...]
```

**截断策略：** 单文件输出 > 12000 字符时，保留前 8000 + 后 3000，中间标 `[... truncated ...]`（和 ② Research 的上下文预算对齐）。完整文件始终在 raw/。

---

## 和上下游的关系

| 层 | 关系 |
|---|---|
| ① Raw（上游） | Textize 读 `raw/`，**只读不写** |
| ② Research（下游） | Research 读 `extracted/`，不再碰 raw 文件解析 |
| ⓪ Fetch（间接） | Fetch 写 raw/，Textize 处理 Fetch 的产出 |
| ③ Script / ④ Visual 等（未来） | 任何需要"文件->文本"的层都从 Textize 取 |

**Research Spec 因 Textize 而简化：** Step 1 (Read) 从"读 raw 各种格式文件 + PDF 提取 + OCR fallback"简化为"读 extracted/ 的 .md"。

---

## 目录结构

```
textize/                    ← 无编号（上方服务，不是流程层）
├── README.md              # 本文件（spec）
├── scripts/               # 文本化脚本（待实现）
│   ├── extract_pdf.py     # born-digital PDF -> pypdf（从 00-fetch/scripts/extract_pdf_text.py 提炼）
│   ├── ocr_scanned.py     # 扫描版 PDF/图片 -> OCR（Tesseract/Mistral OCR/docling 选型）
│   ├── clean_html.py      # HTML -> 去噪提正文（从 fetch_docs_and_arxiv.py 的 html_to_text 提炼）
│   └── extract_docx.py    # DOCX -> 文本
└── config/
    └── textize.example.yaml  # 文本化配置（OCR 引擎选型 / 截断阈值 / 缓存策略）
```

**v1.0-20260720 状态：** spec only。脚本待 v1.5 实现（和 Research Spec v1.5 一起，见 `../docs/versioning.md`）。当前可复用 `00-fetch/scripts/extract_pdf_text.py`（pypdf 提取 + 截断）作为临时方案。

---

## 版本历史

- **v1.0-20260720** -- spec 首版（本文件）。脚本待实现。

---

*相关：① Raw（`src/`，Collect app）/ ② Research（`../docs/research-agent-spec-v1.0.md`）/ 版本原则（`../docs/versioning.md`）*
