> **快照日期：** 2026-07-20
> **实时进度：** 见根 [README.md](../README.md) 进度表
> **进度校准：** Phase 1（Raw Material Collector）实际已完成 ✅ 2026-07-20。本文档成文时记为"正在开发"，现已推进；以 README 进度表为实时真值，本文档其余规划（Phase 2-6）不变。

> **管线校准（2026-07-20）：** 新增第 ⓪ 层 Fetch（资料抓取），在 ① Collect 之前。详见 `00-fetch/README.md`。本文档成文时管线为 8 层（Collect->...->Render），现已扩展为 9 层（Fetch->Collect->...->Render）。
> **文档性质：** 活规划文档，随项目演进更新；历史快照见 `git log`。

---

# 项目名称（暂定）

**AI Content Factory / Video Factory**

目标：

打造一个 AI 驱动的视频生产系统。

不是单纯做视频工具，而是建立一条：

> 从知识收集 -> 知识研究 -> 内容创作 -> 视觉设计 -> 自动生成视频的 AI 内容生产流水线。

核心思想：

> 人负责方向和选择，AI 负责大量执行。

---

# 一、核心理念

## 不做传统视频制作流程

传统：

```
找资料
↓
自己整理
↓
写脚本
↓
画分镜
↓
找素材
↓
剪辑
↓
发布
```

问题：

* 太依赖个人能力
* 流程无法规模化
* 大量重复劳动

---

新的目标：

```
Raw Materials
      ↓
Research
      ↓
Script
      ↓
Visual Language
      ↓
Storyboard
      ↓
HyperFrames
      ↓
Video
```

---

# 二、第一阶段：Raw Material Collector（已确定）

## 定位

不是笔记软件。

不是知识管理软件。

不是 AI 软件。

只是：

> 一个原料收集器。

负责：

收集所有未来 AI 需要处理的信息。

---

## 技术选择

Desktop App。

推荐：

```
Tauri 2
+
React
+
TypeScript
+
Tailwind CSS
```

原因：

* 本地文件能力强
* 适合拖拽
* 性能好
* 后续容易扩展 AI

---

## V1 功能

### 1. Topic 系统

Topic = 一个视频系列 / 长期研究主题

例如：

```
Agent Engineering

RAG

MCP

LangChain
```

---

### 2. 巨大的 Plus

首页：

一个巨大 `+`

点击：

创建 Topic。

输入：

```
Topic Name
```

完成。

---

### 3. Raw 收集

支持：

* Markdown
* PDF
* DOCX
* TXT
* HTML
* 图片
* OCR
* 剪贴板文字

用户直接：

拖进去。

---

### 4. Quick Drop Mode

一个明显开关。

开启：

当前 Topic 自动接收所有资料。

不用每次选择。

---

### 5. 本地存储

结构：

```
RawMaterialCollector/

    Agent Engineering/

        raw/

            xxx.md
            xxx.pdf

    RAG/

        raw/
```

---

## Raw 原则

非常重要：

软件绝不：

* 自动整理
* 自动分类
* 自动总结
* 自动改名
* 自动删除重复

原因：

Raw 就应该保持混乱。

整理交给后面的 Research Agent。

---

# 三、核心架构认知变化

最开始讨论 Skill。

后来发现：

不要做：

```
超级 Skill
```

而应该做：

```
Specification
+
Workflow
+
Agent
```

---

## 不再强调 Prompt

因为 Prompt 是实现层。

更高级的是：

Specification。

结构：

```
Specification

↓

Prompt / Rules

↓

Model

↓

Output
```

---

类似：

HTTP RFC

POSIX

W3C 标准。

---

未来：

Claude / GPT / Gemini

都可以根据 Specification 工作。

---

# 四、Video Factory Workflow

最终架构：

```
Collect

↓

Research Agent

↓

Script Agent

↓

Visual Language Agent

↓

Storyboard Agent

↓

HyperFrames Agent

↓

Video
```

---

# 五、Research Agent（目前重点）

目标：

把 Raw 变成 Knowledge。

不是创作。

不是写视频。

---

## Mission

Research Agent 是：

高级研究员。

职责：

> 阅读用户提供的原始资料，转换成结构化、准确、可追溯的研究成果，为后续创作提供可靠基础。

---

# Research Agent 核心原则

## 1.

Unknown is better than hallucination.

不知道比幻觉好。

资料没有：

不要猜。

---

## 2.

Facts before opinions.

事实优先。

---

## 3.

Traceability first.

所有重要观点必须可追溯。

---

## 4.

Preserve conflicts.

保留冲突。

不要替用户判断。

---

## 5.

Research, not creation.

研究，不创作。

---

# Research Agent 输入

固定：

```
Topic/

    raw/

        ...
```

支持：

* md
* pdf
* docx
* txt
* html
* OCR
* 剪贴板

---

# Research Agent 输出

MVP 不做复杂多 Agent。

一个 Agent 即可。

输出：

```
research/

README.md

report.md

insights.md

knowledge.json

sources.json

metadata.json
```

---

## report.md

给人看的研究报告。

包含：

* 核心概念
* 定义
* 案例
* 证据
* 冲突
* 缺口

---

## insights.md

非常重要。

负责发现：

* 最值得讲的观点
* 最容易误解的点
* 最有视频价值的切入点
* 未解决问题

它连接 Research 和 Script。

---

## knowledge.json

给未来 Agent 使用。

例如：

```json
{
 "concepts":[
   {
    "name":"Context Engineering",
    "summary":"...",
    "sources":[
      "official.md"
    ]
   }
 ]
}
```

---

## sources.json

保存：

观点 -> 来源

---

## metadata.json

记录：

* 文件数量
* 重复数量
* 冲突数量
* 缺口数量

---

# 六、关于 Multi-Agent

当前决定：

**不拆。**

不要：

```
Reader Agent

Extractor Agent

Cleaner Agent
```

原因：

MVP 阶段过度设计。

现在：

```
一个 Research Agent
```

足够。

以后规模扩大：

再拆。

原则：

> 单 Agent 可以解决，就不要增加 Agent。

---

# 七、未来完整路线

## Phase 1

Raw Collector

状态：

正在开发。

> **2026-07-20 校准：已完成 ✅。** 详见根 README 进度表与 `docs/superpowers/specs/2026-07-19-raw-material-collector-design.md`。

---

## Phase 2

Research Agent

当前阶段。

目标：

Raw -> Knowledge

---

## Phase 3

Script Agent

输入：

knowledge.json

输出：

视频文稿。

---

## Phase 4

Visual Language Agent

负责：

把抽象概念变成视觉表达。

例如：

"四个模型协作"

不是文字。

而是：

四匹马拉一辆车。

---

## Phase 5

Storyboard Agent

负责：

时间线。

镜头。

节奏。

---

## Phase 6

HyperFrames Agent

负责：

生成：

* HTML
* CSS
* SVG
* GSAP

最后：

Render 视频。

---

# 当前最重要的问题

不要继续设计整个宇宙。

下一步：

**拿一个真实主题测试 Research Agent。**

例如：

```
Agent Engineering
```

准备：

20~50 个资料。

然后验证：

Research Package 是否真的有用。

根据真实输出迭代 Specification。

---

# 当前项目状态

已经确定：

✅ Desktop App
✅ Raw Collector 设计
✅ Video Factory 总架构
✅ Research Agent 定位
✅ Research Specification v1.0
✅ MVP 原则
✅ 单 Agent 原则

下一步：

开始实现 Research Workflow 或开发 Research Agent。
