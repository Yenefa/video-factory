# Video Factory 版本原则（Anthropic 风格）

> **制定：** 2026-07-20
> **参考：** Anthropic Claude 模型版本策略（家族代数 / 小版本 / 日期戳）

---

## 版本号格式

`v<家族代数>.<小版本>-<YYYYMMDD>`

示例：
- `v1.0-20260720` = 家族 1，小版本 0，2026-07-20 snapshot
- `v1.5-20260801` = 家族 1，小版本 5（加了新能力），2026-08-01 snapshot
- `v2.0-20261201` = 家族 2（方法论重构），2026-12-01 snapshot

对应 Anthropic 模型 ID（如 `claude-sonnet-4-5-20250929`）的拆解：

| Anthropic | 我们 | 含义 |
|---|---|---|
| `claude-3` / `claude-4` / `claude-5` | `v1` / `v2` / `v3` | 家族代数（大代际） |
| `-3-5-` / `-3-7-` / `-4-5-` | `v1.5` / `v1.7` | 小版本（迭代，**可加新能力**） |
| `-20250929` | `-20260720` | 日期戳（精确 snapshot） |
| `sonnet` / `opus` / `haiku` | （暂不需要） | 能力档（平行产品线，单一 Agent 不适用） |

---

## 三层版本

### 1. 家族代数（v1, v2, v3）

**大代际**，标志方法论 / 架构的根本变化。对应 Anthropic Claude 3 -> 4 -> 5（每次代际是能力范式的跃迁，不只是堆参数）。

- **触发条件：** 方法论根本重构（如单 Agent -> 多 Agent 架构、Spec 结构重写、能力范式变化）。
- **节奏：** 不频繁（Anthropic Claude 3->4 间隔约 2 年）。
- **示例：**
  - `v1` = Research Agent 首版（单 Agent，2026-07-20）
  - `v2` = 重构为多 Agent（Reader + Extractor + Synthesizer，未来）

### 2. 小版本（v1.5, v1.7, v1.9）

**迭代改进，可加新能力**。对应 Anthropic Claude 3.5 -> 3.7（3.7 加了 extended thinking）-> 4.5。**这是和 Oracle 风格的核心区别** -- Anthropic 的小版本可以加新特性，不严格区分"特性版本"和"维护版本"。

- **触发条件：** 加新规则 / 新能力（OCR fallback、分批读取协议、来源 ID 校验、文件名从内容提取、SPA fallback 等）。
- **节奏：** 按迭代需要，不强制周期。
- **原则：** 小版本迭代可以加能力，但不是方法论根本变化（那种升家族代数）。
- **示例：**
  - `v1.5` = 加 OCR fallback + 分批读取 + ID 校验 + 文件名从内容 + SPA fallback（计划）

### 3. 日期戳（-YYYYMMDD）

**精确 snapshot**。对应 Anthropic 模型 ID 的日期后缀（`claude-sonnet-4-5-20250929`）。

- **触发条件：** bug fix / 勘误 / 补全 / 措辞修正。
- **节奏：** 即时（每次小修新 snapshot，或同 snapshot 内修正）。
- **原则：** **bug fix 不升小版本号**，只更新日期戳（或同 snapshot 内修正）。这纠正了之前"bug fix 升 v1.0.1 patch"的 Oracle 做法 -- Anthropic 风格下 bug fix 是 snapshot 级，不升版本号。
- **示例：**
  - `v1.0-20260720`（首版）-> 同日修正 CRAG 抓错论文 + 7 帖补读 + 勘误 = 仍 `v1.0-20260720`（同 snapshot 内修正，因为同一天；或记为 corrigendum）

---

## package 版本 = Spec 版本

research package（及任何层产出）**不独立版本号**，标注"按 Spec vX.Y-YYYYMMDD 跑"。

- package 标 `按 Spec v1.0-20260720 跑` = 用 Spec v1.0 跑，可能含同 snapshot 的勘误（CRAG 修正等）。
- Spec 升 v1.5 后，用新 Spec 重跑，package 标 `按 Spec v1.5-YYYYMMDD 跑`。

**这条纠正了之前的两次错误：**
1. v1.0 -> v1.1（把 bug fix + 补资料当 minor 升级）-- 错，bug fix 不升小版本。
2. v1.0 -> v1.0.1（Oracle 风格 patch）-- 也错，Anthropic 风格下 bug fix 是 snapshot 级，不升 patch 号。

正确：bug fix 不升版本号，新能力升小版本（v1.5），方法论重构升家族代数（v2）。

---

## 原则总结（和 Anthropic 一致）

1. **家族代数 = 方法论根本变化**（v1 -> v2），不频繁，对应 Claude 3->4->5。
2. **小版本 = 迭代，可加新能力**（v1.5 加 OCR 等），对应 Claude 3.5->3.7。
3. **bug fix 不升版本号**，只更新日期戳 / snapshot，对应 Anthropic 模型的日期后缀。
4. **package 跟 Spec 版本**，不自己升。
5. **版本号不为"重跑"或"bug fix"而升** -- 只有 Spec 加新能力（升小版本）或方法论重构（升家族代数）才升。

---

## 当前版本状态（2026-07-20）

| 层 | Spec 版本 | 状态 |
|---|---|---|
| ⓪ Fetch | v1.0-20260720 | 首版（`00-fetch/`） |
| ① Collect | v1.0-20260720 | 首版（raw app） |
| ② Research | v1.0-20260720 | 首版（`docs/research-agent-spec-v1.0.md`） |
| ② Research package（RAG topic） | 按 Spec v1.0-20260720 跑 | 含同 snapshot 勘误：CRAG 修正 + 7 帖补读 + conversational-rag 标注（local，gitignored） |

---

## 下一版本计划

### Research Spec v1.5（下一小版本）- 加新能力
- 扫描版 PDF **OCR fallback**（pypdf 优先 -> 失败 OCR -> 缓存 `.extracted/`）
- **上下文不足分批读取协议**（不静默跳过 corpus 分片）
- **来源 ID 校验**（arxiv ID 抓 abs 页验证标题匹配预期）
- **文件名从内容提取**（不主观命名）
- **SPA 自动 fallback**（requests 文本过短 -> puppeteer）

按 Anthropic 风格，这些新能力进 v1.5（小版本），不进 v2.0（v2.0 留给方法论根本重构，如单 Agent -> 多 Agent）。

### Research Spec v2.0（未来家族代数）
- 方法论根本变化（如拆分为 Reader Agent + Extractor Agent + Synthesizer Agent）

---

## 版本决策清单（每次改 Spec 前问自己）

1. 这次改动是**方法论根本重构**（架构/范式变化）吗？
   - 是 -> 升 **家族代数**（v1 -> v2）
   - 否 -> 继续
2. 这次改动**加新规则 / 新能力**了吗？
   - 是 -> 升 **小版本**（v1.0 -> v1.5）
   - 否 -> 继续
3. 这次改动是**bug fix / 勘误 / 补全**吗？
   - 是 -> **不升版本号**，更新日期戳 / 记 corrigendum
   - 否 -> 不动版本（package 重跑不改版本号）

---

*本文件是 Video Factory 所有层（Fetch / Collect / Research / Script / ...）共享的版本原则。之前的 Oracle 风格版本（Major/RU/Patch）已废弃，统一改用 Anthropic 风格。*
