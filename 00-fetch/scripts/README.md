# Fetch 脚本

> 每个脚本的用途、依赖、使用方法、坑。详见上层 `../lessons-learned.md` 和 `../sources-playbook.md`。
>
> **状态：** 这些脚本是从 RAG topic 首次实战（2026-07-20）原样复制过来的。当前 OUT 路径 / subreddit / 搜索词硬编码。v1.1 计划参数化（见 `../README.md` 迭代方向）。

---

## 环境依赖（所有脚本通用）

- **系统代理：** `127.0.0.1:7892`
- **Python：** `C:\Users\fuker\AppData\Local\hermes\hermes-agent\venv\Scripts\python.exe`（3.11 + requests 2.33 + pypdf 6.14）
- **Node：** v24，`puppeteer-core` 装在 `C:\Users\fuker\node_modules\`
- **Edge：** `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`

---

## fetch_docs_and_arxiv.py

**用途：** 抓官方文档（HTML -> .md）+ arxiv 论文（PDF）。硬编码源清单。

**依赖：** `requests`（+ 可选 `beautifulsoup4`，没装用 regex fallback）

**用法：**
```bash
"C:/Users/fuker/AppData/Local/hermes/hermes-agent/venv/Scripts/python.exe" fetch_docs_and_arxiv.py
```

**使用前改：**
- `OUT` 路径（默认 `D:\raw app\RawMaterialCollector\RAG\raw`）
- `SOURCES` 清单（URL, kind, stem）

**坑：**
- SPA 站点（Cohere/Haystack）regex 抓不到，会报 "html text too short" 跳过。要 fallback puppeteer。
- arxiv ID 硬编码可能记错（见 `fetch_arxiv_api.py` 替代）。
- stem 是主观命名，可能和内容不符（教训：v1.1 从内容提取真实标题）。

**首次实战：** 28 源 -> 26/28 成功。

---

## fetch_arxiv_api.py

**用途：** arxiv API 搜索论文 + 下载 PDF。比硬编码 ID 可靠。

**依赖：** `requests` + `xml.etree.ElementTree`（标准库）

**用法：**
```bash
"C:/Users/fuker/AppData/Local/hermes/hermes-agent/venv/Scripts/python.exe" fetch_arxiv_api.py
```

**使用前改：**
- `OUT` 路径
- `search_query`（默认 `all:"retrieval augmented generation"`）
- `target_extra`（要补几个）
- `DONE_IDS`（已抓的 ID，去重）

**坑：**
- 文件名从 API 返回的 `<title>` 生成 slug，比硬编码版准。但仍建议下载后从 PDF 内容校验标题。
- arxiv API 未认证每 3 秒 1 请求，搜索一次拿 40 个结果没问题。

**首次实战：** 补 8 个论文 PDF -> 8/8 成功。

---

## fetch_reddit.js

**用途：** 抓 Reddit subreddit top 帖子（列表 + 详情），puppeteer+Edge 突破 403。

**依赖：** `puppeteer-core`（在 `C:\Users\fuker\node_modules\`）

**用法：**
```bash
cd "C:/Users/fuker"  # 为了 require('puppeteer-core') 能找到 node_modules
node "D:/raw app/00-fetch/scripts/fetch_reddit.js"
```

**使用前改：**
- `OUT` 路径
- `LIST_URL`（默认 `https://www.reddit.com/r/Rag/top/?t=all`）
- `N`（抓几个，默认 14）

**坑：**
- 14 帖约 2 分钟，超 bash 120s 限制会进后台，读输出文件看进度。
- Reddit SPA 渲染慢，`networkidle2` + 4-5s 等待。
- 每帖间隔 2.2s（礼貌 + 避风控）。
- 未登录能看正文+评论，但 innerText 含登录横幅/侧边栏噪音（raw 不清理）。

**首次实战：** r/Rag top -> 106 个帖子链接 -> 抓 14 个详情全成功。

---

## extract_pdf_text.py

**用途：** 提取 raw/ 目录所有 PDF 的文本，合并成可读 corpus 给 Research Agent 消费。

**依赖：** `pypdf`（`pip install pypdf`）

**用法：**
```bash
"C:/Users/fuker/AppData/Local/hermes/hermes-agent/venv/Scripts/python.exe" extract_pdf_text.py
```

**使用前改：**
- `RAW` 路径（PDF 所在）
- `TMP` 路径（corpus 输出，默认 `<topic>/.extracted/`）
- 截断策略（默认前 8000 + 后 3000 字符）

**坑：**
- 截断策略保留摘要+结论，但方法/实验章节丢失。Research Agent 要知道这点（metadata 标注）。
- pypdf 对复杂排版（表格/双栏）质量一般。理想用 pdfplumber 或 docling。
- 提取后 `re.sub(r'\s+', ' ', text)` 压缩空白（PDF 有大量换行噪音）。

**首次实战：** 21 个 PDF 提取 -> 234K 字符 corpus（截断后）。

---

## v1.1 计划（脚本通用化）

- [ ] 参数化：`--topic RAG --out <path> --sources <yaml>` 命令行参数
- [ ] `fetch_arxiv_api.py` 加 abs 页面标题校验
- [ ] `fetch_docs_and_arxiv.py` 加 SPA 检测 -> puppeteer fallback
- [ ] 文件名从内容真实标题生成（不主观）
- [ ] `extract_pdf_text.py` 按章节分片（abstract/intro/method/experiments/conclusion 各一片）
- [ ] 统一抓取报告格式（JSON，含每源 status + 校验结果）
