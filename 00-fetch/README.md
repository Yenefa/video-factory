# ⓪ Fetch - 资料抓取工作流

> **Video Factory 第 ⓪ 层**（在 ① Collect 之前）
> **状态：** v1.0 · 2026-07-20
> **首次实战：** RAG topic 48 份资料抓取（13 官方文档 + 21 arxiv 论文 + 14 Reddit 帖）

---

## 定位

Fetch 是 Video Factory 管线的**最上游**。它主动从互联网抓取原始资料，输出到 ① Collect 层的 `raw/` 目录。

```
⓪ Fetch  ──抓取──>  ① Collect/raw/  ──读取──>  ② Research  ──>  ③ Script  ──>  ...
       ↑
  从网上主动抓
```

**Fetch vs Collect 的分工：**
- **Fetch（本层）**：主动抓。给定一个主题，从 Reddit / 官方文档 / arxiv / 博客 / 等来源自动抓取，喂给 Collect。是"上游喂料器"。
- **① Collect（raw app）**：被动收。作为容器接收 Fetch 的输出 + 用户手动拖放/粘贴的文件。是"原料仓库"。

Collect 不关心资料从哪来；Fetch 不处理资料（不提取/不总结/不分类）。两者解耦。

---

## 职责

✅ 给定主题，发现可信来源（官方文档、论文、社区讨论、大佬博客）
✅ 抓取页面/PDF 正文，存成 .md / .pdf 到目标 topic 的 `raw/`
✅ 文件名从内容真实标题提取（不主观命名）
✅ 抓取后做基础校验（HTML 文本长度、PDF 可解析、标题匹配预期）
✅ 记录每个来源的 URL + 抓取方式 + 状态到元信息

❌ 不分类、不去重、不总结、不改名（那是 ② Research 的事）
❌ 不处理资料内容（raw 就是 raw）
❌ 不登录付费墙/账号墙内容（除非用户授权凭证）

---

## 工作流

```
1. 定义主题  ──  "RAG" / "Agent Engineering" / ...
2. 定来源    ──  官方文档? 论文? Reddit? 博客? (查 sources-playbook.md)
3. 抓取      ──  按来源类型选工具 (查下表)
4. 校验      ──  HTML 文本 > 500 字符? PDF 可解析? 标题匹配?
5. 存储      ──  存到 <workspace>/<Topic>/raw/<sanitized-real-title>.{md,pdf}
6. 记录      ──  每个文件头标 Source URL + Fetched date + 抓取方式
7. 交接      ──  完成,等 ① Collect 显示 + ② Research 消费
```

---

## 工具栈（按来源类型）

| 来源类型 | 工具 | 脚本 | 关键坑 |
|---|---|---|---|
| **官方文档**（静态 HTML） | Python `requests` + 系统代理 | `scripts/fetch_docs_and_arxiv.py` | SPA 站点 regex 抓不到，要 puppeteer fallback |
| **arxiv 论文** | arxiv API + `requests` 下载 PDF | `scripts/fetch_arxiv_api.py` | 不要硬编码 ID（记错抓到不相关论文），用 API 搜索 |
| **Reddit** | `puppeteer-core` + 系统 Edge + 代理 | `scripts/fetch_reddit.js` | `.json`/`.rss` 全 403，必须真实浏览器 |
| **博客**（静态） | Python `requests` + 代理 | `scripts/fetch_docs_and_arxiv.py` | 抓具体文章 URL，不是首页 index |
| **博客**（SPA） | `puppeteer-core` + Edge | `scripts/fetch_reddit.js` 改 URL | 首页几乎空，要具体文章 URL |
| **PDF 文本提取** | `pypdf` | `scripts/extract_pdf_text.py` | 大 PDF 要截断/分片给下游 AI |
| **搜索引擎** | `puppeteer-core` + Edge + 百度 | （记忆 `puppeteer-edge-anti-scraping` 里的 `batch_search.js`） | Google 反爬严；百度第 2 次起要 incognito + 间隔 |
| **Twitter/X** | （暂缺） | - | 需登录，公开抓不到正文 |

---

## 环境依赖

- **系统代理：** `127.0.0.1:7892`（Clash/v2ray，从注册表 `HKCU:\...\Internet Settings\ProxyServer` 读）
- **Python：** `C:\Users\fuker\AppData\Local\hermes\hermes-agent\venv\Scripts\python.exe`（Python 3.11 + requests 2.33 + pypdf 6.14）
- **Node：** v24，`puppeteer-core` 装在 `C:\Users\fuker\node_modules\`
- **Edge：** `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`
- **PowerShell：** `Invoke-WebRequest` 天然走系统代理（简单抓取首选）

**代理坑总览（每个工具策略不同）：**
- PowerShell `Invoke-WebRequest`：自动走系统代理 ✅
- Python `requests`：要 `proxies={"http":..., "https":...}` 参数
- `git`：不走系统代理，要 `git config http.proxy http://127.0.0.1:7892`
- `npm`/`node`：不走系统代理，要 `HTTPS_PROXY` 环境变量 或 puppeteer `--proxy-server` 参数
- `gh` CLI：走系统代理 ✅

详见 `lessons-learned.md` §代理矩阵。

---

## 文件夹结构

```
00-fetch/
├── README.md                  # 本文件（spec + 总览）
├── lessons-learned.md         # 实战经验 + 问题 + 解法（必读）
├── sources-playbook.md        # 各来源抓取手册（URL 发现 + 方法 + 坑）
├── scripts/
│   ├── fetch_docs_and_arxiv.py   # 官方文档 HTML + arxiv PDF（Python+requests+代理）
│   ├── fetch_arxiv_api.py        # arxiv API 搜索论文（Atom XML 解析）
│   ├── fetch_reddit.js           # Reddit 帖子（puppeteer+Edge 突破 403）
│   └── extract_pdf_text.py       # PDF 文本提取（pypdf + 截断分片）
└── config/
    └── sources.example.yaml      # 来源配置模板（URL 清单 + 类型 + 抓取方式）
```

---

## 首次实战复盘（RAG topic，2026-07-20）

抓取 48 份资料（49M），3 轮：
1. **Round 1**：28 个硬编码源（官方文档 HTML + arxiv PDF）-> 26/28 成功。失败 2 个（Cohere/Haystack 是 SPA）。
2. **Round 2**：arxiv API 搜 RAG 补 8 个论文 PDF -> 8/8 成功。Reddit RSS 403 失败。
3. **Round 3**：puppeteer+Edge 突破 Reddit 403，抓 r/Rag top 14 帖 -> 14/14 成功。

**暴露的问题（详见 `lessons-learned.md`）：**
- arxiv ID 硬编码记错（CRAG 2401.15858 实际是天文论文，正确 2401.15884）
- 文件名主观命名标错（conversational-rag.pdf 实际是 ReAct 论文）
- SPA 页面 regex 抓不到正文
- PDF 全文太大塞不进 Research Agent 上下文
- 博客首页 index 不是具体文章
- Twitter/X 完全缺失

这些问题已写入 `lessons-learned.md`，作为 v1.1 迭代的输入。

---

## 下一步（v1.1 迭代方向）

1. **来源 ID 校验**：arxiv ID 抓 abs 页面验证标题匹配预期，再下 PDF。
2. **文件名从内容提取**：下载后从 PDF/HTML 真实标题生成文件名，不主观命名。
3. **SPA fallback**：HTML 抓取文本过短时自动切 puppeteer。
4. **分批读取协议**：Research Agent 上下文不足时，明确分批/采样策略（不只是"没读到"）。
5. **来源配置化**：`config/sources.yaml` 声明式定义来源，脚本通用化（不硬编码 RAG）。
6. **Twitter/X 策略**：Nitter 镜像 or 授权凭证。
7. **博客文章发现**：抓博客首页 -> 解析文章链接 -> 抓具体文章（不是停在首页）。

---

*相关：[[puppeteer-edge-anti-scraping]] 记忆 · [[powershell-webfetch-fallback]] 记忆 · Video Factory 管线见仓库根 `README.md` 与 `docs/PLANNING.md`*
