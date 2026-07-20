# Video Factory 版本原则（Oracle 风格）

> **制定：** 2026-07-20
> **参考：** Oracle Database 版本号策略（19c+ 的 Major / Release Update / Patch 三层模型）

---

## 版本号格式

`v<Major>.<ReleaseUpdate>.<Patch>`（如 `v1.0.0`、`v1.0.1`、`v1.1.0`、`v2.0.0`）

对应 Oracle Database 5 段版本号 `major.ru.patch.release.port` 的前三段：

| Oracle | 我们 | 含义 |
|---|---|---|
| `19` (19c) | `v1` | Major（主题性大版本） |
| `19.21` (RU 21) | `v1.1` | Release Update（周期 bug fix 包） |
| `19.21.0.0.0` 第 3 段 | `v1.1.0` | Patch（单 bug hotfix） |

---

## 三层版本

### 1. Major（v1, v2, v3）

**主题性大版本**，标志方法论 / 能力集的重大演进。对应 Oracle 19c / 21c / 23ai（字母后缀是主题：c=cloud, ai=AI）。

- **触发条件：** 加新规则 / 新能力（如 OCR fallback、分批读取协议、来源 ID 校验、文件名从内容提取、SPA fallback）。
- **节奏：** 按需，**不频繁**（Oracle Major 多年一个）。
- **原则：** 新特性**只能进下一个 Major**，不能进 RU。
- **示例：**
  - `v1` = Research Spec 首版（2026-07-20）
  - `v2` = 加 OCR fallback + 分批读取 + ID 校验 + 文件名从内容 + SPA fallback（计划）

### 2. Release Update（v1.1, v1.2, ...）

**周期性 bug fix + 勘误 + 补全包**，**不加新规则**。对应 Oracle RU（季度发布，19.3 / 19.21）。

- **触发条件：** 攒一批非紧急 bug fix + 执行补全 + 措辞勘误。
- **节奏：** 周期性，**攒批一起发**，不因单个 bug 立刻升（Oracle 季度）。
- **原则：** RU 只修 bug + 改稳定性 + 勘误，**新特性必须等下一个 Major**。
- **示例：** `v1.1` = 攒一批 bug fix（等积攒到值得发 RU 时才升，不仓促）。

### 3. Patch（v1.0.1, v1.0.2, v1.1.1）

**单个紧急 bug 修复 / hotfix**。对应 Oracle one-off / interim patch。

- **触发条件：** critical bug（污染 / 破坏 / 误导下游），不能等 RU 周期。
- **节奏：** 紧急即发。
- **示例：**
  - `v1.0.1` = CRAG 抓错论文紧急修正 + 7 帖补读 + conversational-rag 勘误（2026-07-20，同日 patch）

---

## package 版本 = Spec 版本

research package（及任何层产出）**不独立版本号**，标注"按 Spec vX.Y 跑"。重跑不升版本，只有 Spec 变才升。

- package 标 `按 Spec v1.0 + v1.0.1 patch` = 用 Spec v1.0 跑，带了 v1.0.1 patch 的执行修正。
- Spec 升 v2.0 后，用新 Spec 重跑，package 标 `按 Spec v2.0`。

**这条纠正了之前的错误：** v1.0 跑出 bug -> 补资料重跑，之前被标成"package v1.1"。按 Oracle 原则，bug fix 是 Spec v1.0 上的 patch（v1.0.1），不是 minor 升级（v1.1）。Spec 没加新规则，就不升 minor。

---

## 原则总结（和 Oracle 一致）

1. **新特性只进下一个 Major**，不进 RU。
2. **RU 是稳定性维护**（bug fix + 勘误 + 补全），周期发布，攒批，不因单 bug 升。
3. **Patch 是紧急单 bug**，不等 RU 周期。
4. **package 跟 Spec 版本**，不自己升。
5. **版本号不为"重跑"而升** -- 只有 Spec 内容变了才升。

---

## 当前版本状态（2026-07-20）

| 层 | Spec 版本 | 状态 |
|---|---|---|
| ⓪ Fetch | v1.0 | 首版（`00-fetch/`） |
| ① Collect | v1.0 | 首版（raw app） |
| ② Research | v1.0 | 首版（`docs/research-agent-spec-v1.0.md`） |
| ② Research package（RAG topic） | 按 Spec v1.0 + **v1.0.1 patch** | CRAG 修正 + 7 帖补读 + 勘误（local，gitignored） |

---

## 下一版本计划

### Research Spec v2.0（下一 Major）- 加新规则
- 扫描版 PDF **OCR fallback**（pypdf 优先 -> 失败 OCR -> 缓存 `.extracted/`）
- **上下文不足分批读取协议**（不静默跳过 corpus 分片）
- **来源 ID 校验**（arxiv ID 抓 abs 页验证标题匹配预期）
- **文件名从内容提取**（不主观命名）
- **SPA 自动 fallback**（requests 文本过短 -> puppeteer）

### Fetch Spec v1.1（下一 RU）- 攒 bug fix
等积攒到一批非紧急 fix 再发，不仓促。

### 可能的 Patch
- 单个 critical bug 紧急修正（按需发 v1.0.2 / v1.1.1 等）

---

## 版本决策清单（每次改 Spec 前问自己）

1. 这次改动**加新规则 / 新能力**了吗？
   - 是 -> 升 **Major**（v1 -> v2）
   - 否 -> 继续
2. 这次改动是**单个 critical bug**（污染/破坏）吗？
   - 是 -> 发 **Patch**（v1.0.X）
   - 否 -> 继续
3. 这次改动是**一批非紧急 bug fix / 勘误 / 补全**吗？
   - 是 -> 攒到 **RU**（v1.X），周期发
   - 否 -> 不升版本（package 重跑不改版本号）

---

*本文件是 Video Factory 所有层（Fetch / Collect / Research / Script / ...）共享的版本原则。*
