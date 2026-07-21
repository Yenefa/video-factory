# Script Agent v2.0 RAG Angle Candidates

> **Research Package:** `RawMaterialCollector/RAG/research/`
> **Status:** First-trial selection record

## 1. RAG 没死，死的是旧理解（Selected）

- **Type:** Contrarian Angle
- **Tension:** 大上下文看似会淘汰 RAG，但容量不等于信息选择。
- **Evidence strength:** 中等。核心定义和 Anthropic 的小知识库边界有支撑；“每次新模型都有人宣布 RAG 已死”来自社区讨论，应保留来源边界。
- **Visual potential:** 高。大桌子与选择器、文件洪流、旧流水线与动态检索均可视觉化。

## 2. 多写 50–100 个 Token，为什么检索失败少了 49%

- **Type:** Problem / Discovery Angle
- **Tension:** 提升检索不一定需要更大的模型，可能只需要补回被切块丢失的上下文。
- **Evidence strength:** 高。数据来自 Anthropic Contextual Retrieval。
- **Visual potential:** 高。孤立 chunk 与带上下文 chunk 的前后对比明确。

## 3. 做了 1200 小时 RAG，为什么他对重排序失望

- **Type:** Experiment / Conflict Angle
- **Tension:** Anthropic 和大型生产案例认为 reranking 收益高，但另一位实践者认为规模扩大后收益递减。
- **Evidence strength:** 中等。存在真实冲突，但一侧主要是社区经验，不能强行裁决。
- **Visual potential:** 中高。论文曲线与生产现场的对照可成立。

## 4. 11B 模型为什么能赢 540B 模型

- **Type:** Contrarian / Discovery Angle
- **Tension:** 参数规模不一定等于记忆能力；外部检索可以把记忆与推理解耦。
- **Evidence strength:** 中高。来自 Atlas 论文，但当前 Package 对论文正文读取有截断，应避免扩展实验细节。
- **Visual potential:** 高。小模型加外部记忆对抗巨型模型的画面直观。

## Selection Reason

首轮选择角度 1，因为它最能测试 Script Agent 是否可以在不抹平争议的前提下完成反常识叙事，同时自然引出 Contextual Retrieval 的可靠数据。角度 2 更适合作为下一集。

