# Video Metadata

Title: RAG 没死，死的是这套旧思路

Duration: Measured 65.866 seconds at 1.2× (raw TTS: 78.178 seconds)

Timing Status: NARRATION LOCKED — local pitch-preserving 1.2× retime

Audience: 关注 AI 应用、知识库和智能体的普通技术观众

Chosen Angle: Contrarian Angle（反常识）——大上下文不会直接淘汰 RAG；真正需要被淘汰的是把 RAG 简化成“切块加向量搜索”的旧思路。


---

# Hook Analysis

Hook Type: Cognitive Conflict + Strong Contrast

Reason: 先借用“大上下文将杀死 RAG”这一常见判断，再拆开“能装下信息”和“能找到正确信息”两个概念。冲突明确，但没有制造超出 Research Package 的结论。


---

# Script


## Scene 1

Time: Estimated 6–8 seconds, not locked

Purpose: 用“大上下文等于 RAG 已死”的争议抓住注意力。

Narration: 每次模型的上下文变长，都有人宣布：RAG 死了。但能塞进一百万 Token，和能找到正确答案，是两回事。

Visual Hint: Metaphor + Animation。黑色背景中央出现“1,000,000 TOKENS”，数字快速膨胀并撑满画面；镜头拉远后，巨大的数字落进一张堆满文件的桌面。右侧搜索框闪烁，却仍未定位到正确文件。作用是分离“容量”和“选择”。

Evidence: [SRC: insights.md Top 10 #1] [SRC: report.md §7.2]


## Scene 2

Time: Estimated 12–16 seconds, not locked

Purpose: 让观众理解容量变大并没有自动解决信息选择问题。

Narration: 想象把整个公司的资料库，一次性倒在模型桌上。桌子确实变大了，但成本、私有数据边界，还有“到底该看哪一页”，一个都没有自动消失。

Visual Hint: Metaphor。俯视一张不断延伸的办公桌，合同、报告和数据库卡片像洪水一样落下；画面依次亮起 Token 账单、带锁的私有文件、埋在文件底部的“正确答案”卡片。作用是把三个约束变成可见对象。

Evidence: [SRC: insights.md Top 10 #1] [SRC: insights.md Most Misunderstood #5] [SRC: report.md §7.2]


## Scene 3

Time: Estimated 15–20 seconds, not locked

Purpose: 揭示争议背后的概念误区，重新定义 RAG 的价值。

Narration: 真正可能过时的，不是 RAG，而是把它理解成“切块、向量搜索、取前几条”的固定流水线。RAG 真正要做的，是在回答之前，先把外部信息选对。长上下文，只是让切块没那么痛苦。

Visual Hint: Diagram + Animation。左侧是僵硬流水线：文档被切碎后进入 Vector Search，机械臂随意抓出三块；画面随后重组为动态选择系统，只点亮与问题相关的数据库、私有文档和网页信息。作用是表现旧实现与核心目标的区别。

Evidence: [SRC: insights.md Top 10 #1] [SRC: report.md §7.2]


## Scene 4

Time: Estimated 22–28 seconds, not locked

Purpose: 用经过验证的案例说明，提升检索质量仍然能够产生显著价值。

Narration: Anthropic 做过一个很简单的改动：给每个碎片补上五十到一百个 Token 的背景，再去建立索引。实验中，检索失败率下降了百分之四十九；加上重排序，下降到百分之六十七。当然，这个收益会随数据和系统变化，但方向很清楚：重点不是塞得更多，而是取得更准。

Visual Hint: Diagram + Chart。先显示孤立卡片“收入增长 3%”，搜索光标从旁边滑过；卡片顶部补出“ACME｜2023 Q2 财报”后被立刻锁定。右侧图表从 Baseline 5.7% 降至 2.9%，再降至 1.9%，分别标注“失败率 −49%”和“加入重排序后 −67%”。作用是展示 contextualization 的机制与指标。

Evidence: [SRC: report.md §4.5] [SRC: anthropic-contextual-retrieval.md]


## Scene 5

Time: Estimated 12–16 seconds, not locked

Purpose: 留下关于未来 AI 系统设计的新认知。

Narration: 所以未来真正的问题，不是“长上下文还是 RAG”。而是：哪些信息，应该在什么时候进入上下文。模型的桌子越来越大，但你仍然需要一个人，决定桌上该放什么。

Visual Hint: Metaphor。巨型空桌位于中央，左侧无数文件等待进入；发光的 Retriever 只挑选三份文件摆到模型面前。最后定格“更大的桌子，不等于更好的选择”。作用是把结论压缩成一个可记忆的视觉命题。

Evidence: [SRC: report.md §7.2] [INFERENCE: synthesis of capacity vs retrieval evidence]


---

# Ending

Conclusion: 长上下文缓解了容量和复杂切块问题，但没有消除成本、数据边界和信息选择问题；RAG 的核心价值仍然是让正确的外部信息在正确的时间进入上下文。

Final Message: 更大的上下文，改变的是 RAG 的做法，不是检索的必要性。


---

# Self Evaluation

## Hook Score (0-10)

理由: 9/10。直接切入“RAG 已死”的争议，并用“装得下不等于找得到”建立清晰冲突；没有依赖虚假收益。


## Story Score (0-10)

理由: 8.5/10。从争议进入资料过载问题，再拆解概念误区，以 Contextual Retrieval 完成证据推进，最后收束为新的设计问题。


## Accuracy Score (0-10)

理由: 9/10。49% 和 67% 明确写成检索失败率下降，没有泛化成整体回答准确率；社区来源与推断均保留了边界。


## Visual Potential Score (0-10)

理由: 9/10。桌面、文件洪流、切块流水线和动态检索形成统一隐喻，同时包含可落地的流程动画与数据图表。


## Duration And Pacing Score (0-10)

理由: 8/10。`Podcast_girl` 原速实测为 78.178 秒；采用本地保留音高的 1.2× 变速后，13 段口播时间线锁定为 65.866 秒。Scene 4 数字密度最高，Storyboard 仍需为图表阅读增加必要的视觉停留。
