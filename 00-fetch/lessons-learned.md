# Fetch 工作流 - 经验总结（Lessons Learned）

> 从 RAG topic 首次实战（2026-07-20，48 份资料）提炼。
> 每条：问题 -> 解法 -> 教训。必读，避免重蹈覆辙。

---

## 🔴 严重问题（会导致资料错误/污染）

### 1. arxiv ID 硬编码记错，抓到完全不相关的论文

**问题：** Round 1 硬编码 `https://arxiv.org/pdf/2401.15858` 想抓 CRAG (Corrective RAG) 论文。实际 2401.15858 是一篇太阳物理论文（"Transverse oscillation of prominence and filament induced by an EUV wave"）。CRAG 正确 ID 是 **2401.15884**（记错一个数字）。结果 raw 目录混入一篇完全不相关的天文论文，文件名还标着 `crag-corrective-rag.pdf`，严重误导下游 Research Agent。

**解法：**
- **不要硬编码 arxiv ID**。用 arxiv API (`http://export.arxiv.org/api/query?search_query=all:"关键词"`) 搜索，从返回的 Atom XML 拿 ID + 标题 + PDF 链接。
- 如果必须用 ID，**下载前先抓 abs 页面**（`https://arxiv.org/abs/<id>`）验证标题匹配预期，不匹配则跳过 + 记录。
- 下载后**从 PDF 内容提取真实标题**，和预期标题比对。

**教训：** 来源 ID 是脆弱输入，人类记忆不可靠。必须程序化发现 + 校验。这条已写入 v1.1 迭代方向。

---

### 2. 文件名主观命名，和内容不符

**问题：** `conversational-rag.pdf` (arXiv:2210.03629) 实际是 **ReAct 论文**（Yao et al., ICLR 2023, "ReAct: Synergizing Reasoning and Acting in Language Models"）。文件名是我主观给的 stem `conversational-rag`，但 2210.03629 根本不是 Conversational RAG 论文。下游 Research Agent 读到 ReAct 内容但文件名说 conversational-rag，造成来源标注错乱。

**解法：**
- 文件名**从抓取到的内容真实标题生成**（PDF 第 1 页标题 / HTML `<title>` / arxiv API 返回的 `<title>`），不是人主观命名。
- 文件名 slug 规则：小写 + 非字母数字转 `-` + 截断 60 字符。
- arxiv 论文文件名建议格式：`<arxiv-id>-<real-title-slug>.pdf`，ID 在前保证唯一 + 可追溯。

**教训：** 文件名是来源标识的一部分，必须忠实反映内容，不能主观。

---

### 3. SPA 页面 regex 抓不到正文，静默失败

**问题：** Round 1 抓 Cohere (`txt.cohere.com/rag/`) 和 Haystack (`haystack.deepset.ai/tutorials/30_first_rag_pipeline`)，Python `requests` 拿到 HTML 后用 regex 去 tag 提取文本，返回 0 字符 / 232 字符。这两个是 JS 渲染的 SPA（React/Next.js），HTML 源码里没有正文（正文是 JS 运行后注入的）。脚本检测到"文本过短"报错跳过，但没自动 fallback。

**解法：**
- HTML 抓取后**检测文本长度**，< 500 字符判定为 SPA/反爬，**自动 fallback 到 puppeteer+Edge 渲染抓取**。
- 或者：对已知 SPA 站点直接用 puppeteer，不走 requests。
- Raschka blog (`magazine.sebastianraschka.com`) 也是 SPA，首页只抓到 902 字符（几乎空）。

**教训：** 现代网站大量 SPA，纯 HTTP + regex 不够。抓取脚本必须有"SPA 检测 + 浏览器 fallback"双路径。

---

## 🟡 中等问题（影响覆盖度）

### 4. PDF 全文太大，塞不进 Research Agent 上下文

**问题：** 21 个 arxiv 论文 PDF 全文提取后 ~2M 字符（≈500K token）。Research Agent（我）上下文装不下全部，被迫每篇截断到前 8000 + 后 3000 字符（保留摘要+结论），~11 篇核心论文的方法/实验章节没读到。Research package 的覆盖度因此受损。

**解法：**
- PDF 提取时**按章节分片**（abstract / intro / method / experiments / conclusion），每片独立存 .md，Research Agent 按需读。
- 或者：提取后生成**章节级摘要**（用小模型先摘要每章），Research Agent 读摘要 + 按需深入。
- 短期：截断策略保留"摘要 + 引言 + 结论"，但要在 metadata 明确标注"方法/实验未读"。

**教训：** 抓取层要为下游 AI 消费做预处理。raw 是 raw，但"raw 给 AI 读"和"raw 给人读"不同，前者要考虑上下文预算。

---

### 5. corpus 分片后部分未读，Research Agent 静默跳过

**问题：** extract_corpus.py 把 27 个 .md 合并成 3 个分片（127K + 245K + 155K 字符）。Research Agent 读了分片 1 和 3，**分片 2（245K，含 7 个 Reddit 帖正文 + 博客 index）没读**（上下文预算）。这 7 个 Reddit 帖（5M 文档生产经验 / EpsteinFiles 2M 页 / Apple CLARA / 20k 星开源项目 / best RAG stack 等）只有标题纳入 research package，正文没反映。

**解法：**
- Research Agent Spec 要明确**"上下文不足时的分批/采样读取协议"**：要么分批读完所有分片（多次运行），要么显式采样（每分片读前 N 字符），不能静默跳过。
- 抓取层：每个来源文件控制在合理大小（Reddit 帖子去噪后存，不要带导航/侧边栏/推荐链接的 100K 噪音）。

**教训：** "读取全部资料，不要遗漏"（Spec Step 1）在没有上下文管理策略时是空话。必须配套分批协议。

---

### 6. 博客首页 index 不是具体文章

**问题：** Round 1 抓了 Lilian Weng / Raschka / LangChain blog / LlamaIndex blog 的**首页**，以为是博客内容。实际首页只是文章列表 + 摘要，不是具体 RAG 文章。Lilian Weng 那篇著名的 RAG 综述、Raschka 的 RAG 文章都没抓到。LlamaIndex blog index 140K 字符但都是文章元数据，不是正文。

**解法：**
- 博客抓取**两步**：先抓首页/归档页解析出文章链接（`<a href>` 含日期模式 / `/posts/` 路径），再逐个抓具体文章正文。
- 或者：直接用已知的文章 URL（人提供或搜索发现）。
- **不要把首页当文章存**。

**教训：** 博客首页是"目录"，不是"内容"。抓取脚本要区分目录页和文章页。

---

### 7. Twitter/X 完全缺失

**问题：** 用户要"大佬推特观点"，但 Twitter/X 公开抓取需登录，`requests` 和 puppeteer 都拿不到正文（重定向到登录墙）。RAG topic 完全缺 Twitter/X 这一块。

**解法：**
- Nitter 镜像（不稳定，实例经常挂）。
- 用户授权登录凭证 + 用官方 API（复杂）。
- 替代：从 Reddit/博客间接获取大佬观点（大佬经常在 Reddit AMA / 博客转发推文）。
- 暂时：接受 Twitter/X 缺失，在 metadata 标注。

**教训：** 登录墙内容是抓取的硬限制，要提前识别 + 和用户对齐预期。

---

## 🟢 工具/环境经验（值得复用）

### 8. 代理矩阵：每个工具策略不同

本机系统代理 `127.0.0.1:7892`（Clash/v2ray）。不同工具读代理的方式：

| 工具 | 走系统代理? | 配置方式 |
|---|---|---|
| PowerShell `Invoke-WebRequest` | ✅ 自动 | `-Proxy` 可选（默认读系统） |
| `gh` CLI | ✅ 自动 | - |
| Python `requests` | ❌ | `proxies={"http":"http://127.0.0.1:7892","https":"http://127.0.0.1:7892"}` |
| `git` | ❌ | `git config http.proxy http://127.0.0.1:7892`（局部，不污染全局） |
| `npm` / `node` | ❌ | `HTTPS_PROXY=http://127.0.0.1:7892` 环境变量 |
| `puppeteer` | ❌ | 启动参数 `--proxy-server=http://127.0.0.1:7892` |
| `curl`（bash） | ❌ | `-x` 参数 或 `HTTPS_PROXY` 环境变量 |

**系统代理地址读取：**
```powershell
Get-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Internet Settings" | Select ProxyEnable,ProxyServer
```

**教训：** 别假设"系统能联网，工具就能联网"。每个工具单独验证 + 配代理。git push 连不上 github.com 但 gh 能连，就是这个坑（见 [[project-video-factory]] 的 git 代理坑）。

---

### 9. Reddit 403 突破：puppeteer + 真实 Edge

**问题：** Reddit 对未认证请求反爬：`.json` / `.rss` 端点 + 浏览器 UA 走代理都返回 403（PowerShell 和 Python 都被拒，`old.reddit.com` 也 403）。

**解法：** `puppeteer-core` + 系统自带 Edge（真实浏览器指纹 + JS 执行）+ `--proxy-server` 参数。`fetch_reddit.js` 一次拿到 106 个帖子链接，抓 14 个详情全成功。

**关键参数：**
- `headless: 'new'`
- UA 用真实 Chrome 120
- `networkidle2` + 4-5s 等待（Reddit SPA 渲染慢，代理再加延迟）
- 滚动触发懒加载
- 每帖间隔 2.2s（礼貌 + 避风控）

**教训：** 反爬严重的站点（Reddit/Twitter/阿里云WAF），纯 HTTP 不行，用真实浏览器。见 [[puppeteer-edge-anti-scraping]] 记忆。

---

### 10. arxiv API 是可靠的论文发现方式

**经验：** `http://export.arxiv.org/api/query?search_query=all:"retrieval augmented generation"&start=0&max_results=40&sortBy=relevance` 返回 Atom XML，每个 `<entry>` 有 `<id>`（abs URL）、`<title>`、`<summary>`、`<link title="pdf">`。比硬编码 ID 可靠得多。

**Atom XML 解析：**
```python
import xml.etree.ElementTree as ET
ns = {"a": "http://www.w3.org/2005/Atom"}
root = ET.fromstring(r.text)
for e in root.findall("a:entry", ns):
    title = " ".join(e.find("a:title", ns).text.split())
    id_url = e.find("a:id", ns).text  # http://arxiv.org/abs/XXXX.XXXXX
    pdf_url = next(l.get("href") for l in e.findall("a:link", ns) if l.get("title")=="pdf")
```

**教训：** 优先用官方 API 发现来源，不要靠人记忆硬编码 ID。

---

### 11. pypdf 提取 PDF 文本（+ 截断策略）

**经验：**
- `pypdf` 6.14（纯 Python，`pip install pypdf`，装到 hermes venv）。
- `PdfReader(path).pages[i].extract_text()` 逐页提取。
- 提取后 `re.sub(r'\s+', ' ', text)` 压缩空白（PDF 有大量换行/页眉页脚噪音）。
- **截断策略**（给下游 AI）：前 8000 + 后 3000 字符，保留摘要+引言+结论。中间标 `[... truncated ...]`。
- 质量警告：pypdf 对复杂排版（表格/双栏）提取质量一般，理想用 pdfplumber 或 docling，但 pypdf 够用。

**教训：** PDF 文本提取是抓取层的基础能力，pypdf 是轻量起点。

---

### 12. HTML 文本提取：bs4 > regex

**问题：** Round 1 用 regex 去 script/style/nav/footer/header 标签再去所有 tag 提取文本。bs4 没装，regex fallback。regex 对简单页面够用，但对复杂 SPA / 嵌套结构噪音大。

**解法：**
- 优先 `pip install beautifulsoup4`，用 `soup.get_text(separator="\n")` + 先 `decompose()` 掉 script/style/nav/footer/header/aside/form。
- regex 作为 fallback。

**教训：** HTML 解析用专用库，不要正则硬刚（正则解析 HTML 是著名的反模式）。

---

### 13. 礼貌抓取 + 间隔

**经验：**
- 每个请求间隔 1.5-2.2s（Python `time.sleep` / JS `setTimeout`）。
- Reddit 连续抓 14 帖没被风控（间隔 2.2s + 真实浏览器）。
- 百度搜索第 2 次起要 incognito + 3s 间隔（见 [[puppeteer-edge-anti-scraping]]）。
- arxiv API 一次拿 40 个结果没问题（不用分页间隔）。

**教训：** 礼貌间隔 = 不会被风控 + 不会封 IP。默认 2s。

---

### 14. 文件名 slug + 冲突处理

**经验：**
```python
def slug(s, n=70):
    return re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')[:n] or 'untitled'

def unique_path(stem, ext):
    p = OUT / f"{stem}.{ext}"
    n = 1
    while p.exists():
        p = OUT / f"{stem}-{n}.{ext}"
        n += 1
    return p
```

raw app 本身的 `copy_file_into_topic` 也有 `-N` 后缀冲突处理，但抓取脚本自己生成文件名时也要做（避免覆盖）。

**教训：** 文件名 sanitize + 冲突 `-N` 后缀是基础，永不覆盖。

---

## 通用流程经验

### 15. 分轮抓取 + 每轮验证

**经验：** RAG topic 抓 3 轮（Round 1 硬编码源 / Round 2 arxiv API 补 / Round 3 puppeteer 突破 Reddit）。每轮跑完看成功率，失败的下一轮换方法。比一次写完美脚本更实际。

**教训：** 抓取是迭代的。先抓容易的（官方文档），再补难的（Reddit），每轮验证。

---

### 16. 抓取报告 + 元信息

**经验：** 每个抓取脚本结尾输出 JSON 报告（成功/失败 + 文件名 + 大小 + URL），存到 `raw/_fetch_report.json`（但这是抓取元数据不是资料，Research Agent 用完要删，避免污染 raw 目录）。

每个抓取的文件头加元信息：
```markdown
# <real title>

> Source: <url>
> Fetched: 2026-07-20
> Content-Type: <type>
> Via: <requests/puppeteer-edge/arxiv-api>

---
<content>
```

**教训：** 来源可追溯是 Research Agent 的 Principle 3（traceability）的基础，抓取层就要埋好。

---

### 17. 已知 SPAs（避免 regex 直抓）

实测 SPA 站点（要 puppeteer）：
- `txt.cohere.com/*` (Cohere)
- `haystack.deepset.ai/*` (Haystack)
- `magazine.sebastianraschka.com/*` (Raschka)
- Reddit（所有页面）
- 大多数 React/Next.js 站点

判断：`requests` 拿到 HTML 后，`<body>` 文本 < 500 字符 或含 `<div id="root"></div>` / `<div id="__next">` 多半是 SPA。

---

## 待解决问题（v1.1+）

- [ ] arxiv ID 校验流程（abs 页面标题比对）
- [ ] 文件名从内容提取
- [ ] SPA 自动 fallback（requests -> puppeteer）
- [ ] PDF 按章节分片（不只是前/后截断）
- [ ] Research Agent 分批读取协议
- [ ] 博客文章链接发现（首页 -> 文章 URL）
- [ ] Twitter/X 策略
- [ ] 来源配置化（sources.yaml）
- [ ] bs4 替代 regex HTML 提取
- [ ] 抓取去重（同 URL 不重复抓）

---

*本文档随 Fetch 工作流迭代更新。每次实战后补充新经验。*
