# Fetch 来源手册（Sources Playbook）

> 按来源类型分类的抓取手册。每类：URL 发现 + 方法 + 工具 + 坑 + 示例。
> 实战前查这里选工具，实战后补充新来源。

---

## 1. 官方文档（Static HTML）

**例子：** LangChain docs / LlamaIndex docs / Pinecone learn / Anthropic news / Google Cloud docs / OpenAI platform docs / Microsoft GraphRAG docs

### URL 发现
- 官方文档站根：`python.langchain.com/docs/` / `docs.llamaindex.ai/` / `www.pinecone.io/learn/` / `platform.openai.com/docs/`
- 通常 `/docs/tutorials/<topic>/` 或 `/docs/concepts/<topic>/` 路径模式。
- LLMs.txt：很多文档站提供 `https://docs.langchain.com/llms.txt` 列出所有页面 URL（LangChain 用这个发现 14 个页面）。

### 方法
```python
import requests
PROXY = {"http": "http://127.0.0.1:7892", "https": "http://127.0.0.1:7892"}
HEADERS = {"User-Agent": "Mozilla/5.0 ... Chrome/120 ..."}
r = requests.get(url, proxies=PROXY, headers=HEADERS, timeout=45, allow_redirects=True)
r.encoding = r.apparent_encoding or "utf-8"
text = html_to_text(r.text)  # bs4 or regex
```

### 工具
- `scripts/fetch_docs_and_arxiv.py`
- HTML 提取：bs4 优先（`pip install beautifulsoup4`），regex fallback

### 坑
- **SPA 站点 regex 抓不到**（Cohere `txt.cohere.com` / Haystack `haystack.deepset.ai`）。检测文本 < 500 字符 -> fallback puppeteer。
- **308/301 重定向**：`requests` 默认 `allow_redirects=True` 会跟，PowerShell `Invoke-WebRequest` 也要 `-MaximumRedirection 5`。LangChain docs 是 308 重定向。
- **编码**：`r.apparent_encoding` 比 `r.encoding` 准（避免乱码）。
- **导航/页脚噪音**：bs4 `decompose()` 掉 `nav/footer/header/aside/form/script/style`。

---

## 2. arXiv 论文

### URL 发现（用 API，不要硬编码 ID）
```python
import requests, xml.etree.ElementTree as ET
r = requests.get("http://export.arxiv.org/api/query",
                 params={"search_query": 'all:"retrieval augmented generation"',
                         "start": 0, "max_results": 40, "sortBy": "relevance"},
                 proxies=PROXY, headers=HEADERS, timeout=45)
root = ET.fromstring(r.text)
ns = {"a": "http://www.w3.org/2005/Atom"}
for e in root.findall("a:entry", ns):
    title = " ".join((e.find("a:title", ns).text or "").split())
    id_url = e.find("a:id", ns).text  # http://arxiv.org/abs/XXXX.XXXXX
    aid = re.search(r"arxiv\.org/abs/([^v/?]+)", id_url).group(1)
    pdf_url = next(l.get("href") for l in e.findall("a:link", ns) if l.get("title")=="pdf")
    summary = e.find("a:summary", ns).text.strip()
```

### PDF 下载
```python
pr = requests.get(pdf_url, proxies=PROXY, headers=HEADERS, timeout=60)
# 校验：len(pr.content) > 2000，且 Content-Type 含 pdf
```

### 工具
- `scripts/fetch_arxiv_api.py`（搜索 + 下载）
- `scripts/fetch_docs_and_arxiv.py`（硬编码 ID 版，已弃用，留作教训）

### 坑
- **🔴 不要硬编码 arxiv ID**。CRAG 的 ID 我记成 2401.15858（实际是天文论文），正确是 2401.15884。**用 API 搜索**。
- **下载后校验标题**：抓 abs 页面或从 PDF 第 1 页提取标题，和预期比对。不匹配跳过 + 记录。
- **文件名从真实标题生成**：`<arxiv-id>-<title-slug>.pdf`，不要主观命名（`conversational-rag.pdf` 实际是 ReAct 的教训）。
- **PDF 大小**：论文 PDF 0.3M-17M，21 个 ~40M，raw 目录存得下。
- **arxiv API 限流**：未认证每 3 秒 1 请求，搜索一次拿 40 个结果不算多次。

---

## 3. Reddit

### URL 发现
- Subreddit top：`https://www.reddit.com/r/<sub>/top/?t=all`
- Subreddit search：`https://www.reddit.com/r/<sub>/search/?q=<query>&restrict_sr=1&sort=top&t=all`
- 多个相关版：r/Rag / r/LocalLLaMA / r/MachineLearning / r/LangChain / r/OpenAI / r/Anthropic / r/singularity

### 方法（puppeteer + Edge，绕 403）
```javascript
const puppeteer = require('puppeteer-core');
const browser = await puppeteer.launch({
  executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  headless: 'new',
  args: ['--no-sandbox', '--proxy-server=http://127.0.0.1:7892']
});
// 抓列表页 -> 提取 a[href*="/comments/"] -> 逐个抓详情 -> document.body.innerText
```

### 工具
- `scripts/fetch_reddit.js`

### 坑
- **🔴 `.json` / `.rss` 端点全 403**（未认证 + 代理 IP）。`old.reddit.com` 也 403。**必须 puppeteer + 真实 Edge**。
- **SPA 渲染慢**：`networkidle2` + 4-5s 等待，滚动触发懒加载。
- **登录横幅噪音**：未登录能看正文+评论，但 innerText 含登录提示/侧边栏推荐。存 .md 时保留（raw 不清理），Research Agent 自己判断。
- **每帖间隔 2.2s**：连续抓 14 帖没被风控。别太贪心。
- **去重**：列表页多个链接指向同一帖（标题/评论数/头像），按 `/r/<sub>/comments/<id>` 去重。
- **中文界面**：Reddit 会按 IP 返回中文 UI（"跳到主要内容"/"评论区域"），正文是英文。不影响内容。

---

## 4. 大佬博客

### URL 发现（两步）
1. 抓博客首页 / 归档页（`/archive` / `/posts` / `/blog`）
2. 解析文章链接（`<a href>` 含 `/posts/` / 日期模式 `/2024/01/` / `/p/<slug>`）
3. 逐个抓具体文章

或者：人提供已知文章 URL（最可靠）。

### 方法
- 静态博客（Lilian Weng `lilianweng.github.io` / Eugene Yan `eugeneyan.com`）：Python `requests` + bs4。
- SPA 博客（Raschka `magazine.sebastianraschka.com` / Substack）：puppeteer。
- Medium：puppeteer（反爬）。

### 工具
- 静态：`scripts/fetch_docs_and_arxiv.py` 改 URL
- SPA：`scripts/fetch_reddit.js` 改 URL（通用 puppeteer 抓取）

### 坑
- **🔴 不要抓首页当文章**。Lilian Weng / Raschka / LangChain / LlamaIndex blog 首页只是文章列表。抓首页 -> 解析链接 -> 抓具体文章。
- **Raschka 是 SPA**：首页 regex 抓到 902 字符（几乎空），要 puppeteer。
- **Substack**：`magazine.sebastianraschka.com` 是 Substack，文章 URL 模式 `/p/<slug>`。
- **RSS feed**：很多博客有 `/feed.xml` / `/rss/` / `/index.xml`，是发现文章 URL 的好方式（XML 解析比 HTML 稳）。

### 已知大佬博客（RAG 相关）
| 博主 | URL | 类型 | RAG 文章 |
|---|---|---|---|
| Lilian Weng | `lilianweng.github.io` | 静态 Jekyll | 有 RAG 综述（需找具体 URL） |
| Sebastian Raschka | `magazine.sebastianraschka.com` | SPA Substack | 有 RAG 文章（需 puppeteer） |
| Eugene Yan | `eugeneyan.com` | 静态 | 有 RAG 相关 |
| Chip Huyen | `huyenchip.com` | 静态 | 有 RAG 文章 |
| Hugging Face blog | `huggingface.co/blog` | SPA | 有 RAG 文章 |

---

## 5. Twitter / X

### 现状
- **公开抓不到正文**（重定向到登录墙）。
- `requests` 和 `puppeteer` 都不行（除非登录）。

### 替代方案（都不可靠）
- **Nitter 镜像**：`nitter.net` / `nitter.poast.org` 等，但实例经常挂，URL 不稳定。
- **官方 API**：需开发者账号 + Bearer token，免费版限额。
- **授权登录**：用户提供 cookie，puppeteer 注入。复杂 + 风险。

### 建议
- 暂时跳过 Twitter/X，在 metadata 标注缺失。
- 从 Reddit AMA / 博客转发间接获取大佬观点。
- v1.1+ 考虑 Nitter 或官方 API。

---

## 6. 搜索引擎（URL 发现的 fallback）

当不知道具体 URL 时，用搜索引擎发现。

### 百度（puppeteer + Edge）
- 记忆 `puppeteer-edge-anti-scraping` 里有 `batch_search.js` / `fetch_browser.js baidu "<query>"`。
- 坑：连续搜索第 2 次起触发反爬，要 `browser.createBrowserContext()` 独立 incognito + 3s 间隔。

### Google
- 反爬严重，puppeteer 也容易被 CAPTCHA。
- 替代：用 `site:` 搜索 + 抓具体结果页。

### DuckDuckGo
- 相对宽松，`html.duckduckgo.com/html/?q=<query>` 返回纯 HTML 可解析。

### arxiv API（论文专用）
- 见 §2，比搜索引擎发现论文更可靠。

---

## 7. GitHub（README / 代码 / Awesome 列表）

### URL 发现
- 仓库 README：`https://raw.githubusercontent.com/<owner>/<repo>/<branch>/README.md`（纯 markdown，直接抓）
- Awesome 列表：`github.com/awesome-<topic>` 类仓库的 README 是资料宝库。
- Reddit 帖里提到的开源项目（如 "RAG Techniques repo 27k stars"）-> 抓其 README。

### 方法
```python
r = requests.get(f"https://raw.githubusercontent.com/{owner}/{repo}/main/README.md",
                 proxies=PROXY, headers=HEADERS, timeout=30)
# 直接是 markdown，不用 HTML 提取
```

### 坑
- 分支名 `main` vs `master`，试两个。
- `raw.githubusercontent.com` 不反爬，比 `github.com/<owner>/<repo>` 页面好抓（后者是 SPA）。

---

## 8. PDF（非 arxiv）

### 例子
- 公司白皮书 / 技术报告 / 书籍章节
- URL 通常是 `.pdf` 结尾

### 方法
- 同 arxiv PDF：`requests.get` + `proxies` -> 存 .pdf。
- 文本提取：`scripts/extract_pdf_text.py`（pypdf）。

### 坑
- 扫描版 PDF（图片）pypdf 提取不到文本，要 OCR（Tesseract / OCRmyPDF / Mistral OCR）。
- 加密 PDF：`PdfReader.decrypt(password)`。

---

## 通用抓取流程（任何来源）

```
1. 识别来源类型（官方文档/arxiv/Reddit/博客/...）
2. 查本手册选工具 + 方法
3. 配代理（见 lessons-learned.md §代理矩阵）
4. 抓取（requests 或 puppeteer）
5. 校验：
   - HTML 文本 > 500 字符？否则 SPA fallback
   - PDF 可解析（pypdf 能读）+ 标题匹配预期？
   - 文件名从真实标题生成
6. 存到 <workspace>/<Topic>/raw/<slug>.{md,pdf}
7. 文件头加元信息（Source URL + Fetched date + Via）
8. 记录到抓取报告
```

---

## 来源优先级（RAG 主题实测）

抓取顺序（从易到难，从高价值到低价值）：

1. **官方文档**（LangChain/LlamaIndex/Anthropic/Pinecone）-- 权威，requests 直抓
2. **arxiv 论文**（API 搜索）-- 学术基础，PDF 下载
3. **Reddit 社区讨论**（puppeteer）-- 实践案例，突破 403
4. **大佬博客具体文章**（两步发现）-- 深度洞察
5. **GitHub README**（raw 直抓）-- 开源项目实践
6. **搜索引擎补漏**（百度 puppeteer）-- 发现遗漏的 URL
7. **Twitter/X**（暂跳过）-- 登录墙

---

*本文档是活的。每次抓取新来源类型，补充一节。*
