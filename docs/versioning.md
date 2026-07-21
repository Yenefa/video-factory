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
| ③ Script | v1.0-20260720 | 历史长视频规范（5–10 分钟），由 v2.0 取代 |
| ③ Script | v2.0-20260721 | 短视频策略规范（Strategist，11 步），由 v3.0 取代 |
| ③ Script | v3.0-20260722 | 当前编剧与叙事导演规范（Director，7 步）；Role Strategist->Director，Workflow 11步->7步，Script 输出 Narration Timeline（estimated_duration 粗估），新增 Voice Direction / Visual Seed；TTS/Timing 实测仍覆盖最终时长 |
| ③ Script sample（RAG topic） | 按 Spec v2.0-20260721 实测样例 | 13 段 TTS 已生成；采用本地 1.2× 版本，口播时间线锁定为 65.866 秒（原速 78.178 秒） |
| TTS/Timing（横切服务） | v1.0-20260722 | 首版声音制作 Agent spec；MiniMax speech-2.6-turbo + Podcast_girl 实测 timeline；Word Timestamp / Subtitle / Quality Eval 待实现 |
| ④ Visual Language | v0.1-20260721 | 首版视觉导演契约（含 Motion concept + Visual grammar），由 v1.0 取代 |
| ④ Visual Language | v1.0-20260722 | 当前视觉语义与风格系统规范；Motion concept 下沉到 ⑥ Storyboard，加 Voice Package 输入（对接 TTS v1.0），Workflow 5步->4步，Strategy 换 Code Viz->Comparison，加 Example |
| ④ Visual Language sample（RAG topic） | 按 Spec v0.1-20260721 | Claude × Google 混合方向；5 个场景覆盖全部 13 段锁定旁白 |
| ⑤ Asset Planning | v0.3-20260721 | 首版资产生成契约；受限 SiliconFlow Kolors 文生图（≤3 张/次、单图单请求、不重试、不 fallback、即时下载），DPAPI 凭证启动器，本地原子 manifest |
| ⑤ Asset Planning sample（RAG topic） | 按 Spec v0.3-20260721 | 4 job（3 ai_generate 背景 + 1 code 图表）；smoke test 已验证 Kolors 生图 |

---

## 下一版本计划

### Script v2.0 TTS/Timing 实现状态

- ✅ semantic segment 到 MiniMax TTS 音频的生成流程（`tts-timing/`）。
- ✅ 使用 API 返回的实际 `audio_length` 生成 `timeline.json`，不接受 Script Agent 手写精确毫秒值。
- ✅ 缺少 `MINIMAX_API_KEY` 时在发起 API 请求前安全停止。
- ✅ Live API 与 `Podcast_girl` 音色已于 2026-07-21 验证；生成 13 段 MP3，原速 78.178 秒；本地 `atempo=1.2` 后实测 65.866 秒，无额外 API 请求。
- ⏳ narration timeline 到 ⑥ Storyboard 的视觉停留、转场和静默尚未实现。

> **版本决策：** v1.0 的长视频编剧改为 v2.0 的短视频策略师，并重构时间权责，属于“角色 + 方法论 + 输出契约”的根本变化，符合家族代数升级条件。

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
