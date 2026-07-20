# Visual Plan

## Global Visual Direction

Theme: **The Context Table / 上下文桌面**。把整期视频设计成一间抽象的 AI 研究编辑室：桌面代表模型可用的上下文空间，文件卡片代表外部信息，选择光束代表检索与重排序。桌面、卡片和选择机制贯穿五个场景，并随论点逐步改变含义。

Design System: Claude Style 的深色研究氛围与 Google Style 的结构化解释能力结合。背景使用低反射的深色空间；信息以暖白文档卡片、细线连接器、简洁数据条和少量系统标签呈现。主标题使用干净的无衬线粗体，Token、Top-K、索引状态等系统信息使用克制的等宽字。Script Package 未指定画幅比例，因此本阶段不锁定画幅；关键元素保持在中央安全区，便于 Storyboard 后续适配。

Color: 深墨黑 `#0C1016` 与石墨灰 `#171D26` 构成背景；暖白 `#F2EFE7` 用于文档；琥珀橙 `#FF9D45` 表示过载、成本和未解决状态；青绿色 `#48D7C2` 表示相关、选中和成功进入上下文；数据限定与次要标签使用雾灰 `#8E99A8`。

Motion Style: 文件流动使用 Flow；系统结构变化使用 Morph；数字和元数据使用 Reveal；关键选择使用短促的 Scale 与锁定反馈；摄像机以稳定的 2.5D 推近、俯视平移和拉远为主。所有运动都用于展示“容量扩大、信息过载、机制重组、证据被选中”的状态变化。

Reason: RAG 的争议不是一个可以靠单张配图解释的问题。统一的桌面与文件语法能让观众持续比较“装得下多少”和“究竟选中了什么”；颜色只承担两类判断，降低 65.866 秒快节奏口播中的认知负担。

---

# Scene Breakdown

## Scene ID: scene-01

Narration: `scene-01-beat-01`「每次模型的上下文变长，都有人宣布：RAG 死了。」；`scene-01-beat-02`「但能塞进一百万 Token，和能找到正确答案，是两回事。」

Scene Purpose: Hook + Compare。先借“RAG 已死”的判断制造冲突，再让观众立刻看懂容量与选择是两个不同能力。

Core Visual Idea: **桌面可以无限扩张，但搜索光束仍然不知道该停在哪里。**

Visual Strategy: Metaphor + Diagram

Visual Description: 深色空间中央只有一张窄桌和少量文档卡片。巨大的 `1,000,000 TOKENS` 计数器出现后，桌面网格快速向四周延展，文件数量同步增加。镜头拉远，观众看到桌面已经大到超出画面；一束青绿色搜索光在文件之间扫描，却始终没有锁定那张带有细小答案标记的卡片。容量计数保持明亮，选择状态则停留在未锁定，形成同屏对照。

Motion Description: Token 数字由小到大 Scale，驱动桌面连续扩张；文件卡片以规则队列 Flow 进入。扩张结束后运动突然减速，搜索光束左右扫描三次，每次经过正确卡片却没有停下。最后只让“容量”指示灯亮起，“选择”指示灯保持琥珀色。

Camera Movement: 开始快速推近 Token 计数器，随后随着桌面扩张持续拉远，最终停在高位斜俯视全景，让“巨大空间”和“无法定位”同时可见。

Required Assets: 可扩展桌面网格、文档卡片组件、Token 计数器、搜索光束、容量与选择双状态指示器。

Asset Type: Existing Component, SVG, Animation

## Scene ID: scene-02

Narration: `scene-02-beat-01`「想象把整个公司的资料库，一次性倒在模型桌上。」；`scene-02-beat-02`「桌子确实变大了，但成本、私有数据边界，还有到底该看哪一页，一个都没有自动消失。」

Scene Purpose: Explain。把“更大的上下文仍然存在约束”拆成三个可观察的问题，而不是继续用抽象概念解释抽象概念。

Core Visual Idea: **整座资料库倒上桌面后，三个问题从文件洪流中依次浮现。**

Visual Strategy: Metaphor + Diagram

Visual Description: 沿用 Scene 1 的桌面。合同、财报、数据库记录和内部备忘卡从桌面上方倾泻而下，逐渐形成多层堆叠。第一层出现持续上涨的琥珀色成本计量条；第二层出现一道半透明权限边界，带锁文件撞到边界后停止；第三层在堆叠底部短暂露出正确答案卡片，随即再次被新文件覆盖。三个约束使用同一桌面中的不同空间关系表达，避免三套互不相关的画面。

Motion Description: 文件先以可读的间隔进入，随后 Flow 速度和密度增加。成本条随每批文件阶梯上涨；权限边界在私有卡片接近时 Reveal 并产生轻微回弹；镜头最后追踪一张答案卡片下沉，被其他文件盖住后只剩一角青绿色边缘。

Camera Movement: 从 Scene 1 的斜俯视平滑过渡到正俯视。摄像机依次平移经过成本区、权限边界和文件堆底部，最后小幅推近被掩埋的答案卡片。

Required Assets: 四类文档卡片变体、成本计量条、权限边界、锁形状态图标、答案卡片、文件堆叠阴影系统。

Asset Type: Existing Component, SVG, Icon, Animation

## Scene ID: scene-03

Narration: `scene-03-beat-01`「真正可能过时的，不是 RAG，而是把它理解成切块、向量搜索、取前几条的固定流水线。」；`scene-03-beat-02`「RAG 真正要做的，是在回答之前，先把外部信息选对。」；`scene-03-beat-03`「长上下文，只是让切块没那么痛苦。」

Scene Purpose: Explain + Compare。拆掉“RAG 等于固定三步流水线”的误解，并把它重新定义为回答前的信息选择机制。

Core Visual Idea: **僵硬传送带重组为以问题为中心的动态选择网络。**

Visual Strategy: Diagram + Metaphor

Visual Description: 桌面上的文件堆被压平成一条横向传送带，依次通过 `CHUNK`、`VECTOR`、`TOP-K` 三个固定节点；末端机械选择器只抓取排在最前的三块，相关卡片反而从旁边滑走。随后传送带停机，三个节点脱离轨道并围绕中央问题卡重新排列。数据库、私有文档、报告和网页四条来源通道只在与问题匹配时亮起，青绿色路径把相关卡片送入回答区。最后回答区的容器向外扩宽，但中央选择器仍然保留，明确“容器变大”没有替代“选择”。

Motion Description: 前半段使用机械、等速的 Flow，节点动作完全重复；错误卡片被抓取时闪出琥珀状态。转折处整条传送带冻结并拆解，节点通过 Morph 围绕问题卡组成动态网络。相关路径按问题信号依次点亮，卡片从多源通道汇聚；结束时只让上下文容器 Scale 变宽，选择网络保持原位。

Camera Movement: 先以侧向跟拍展示固定流水线，再在系统重组时抬升为正俯视结构图。结尾轻微拉远，让扩宽的容器和仍在工作的选择器同时出现。

Required Assets: CHUNK/VECTOR/TOP-K 节点、传送带、机械选择器、中央问题卡、多来源节点、动态连接线、可扩展上下文容器。

Asset Type: Existing Component, SVG, Icon, Animation

## Scene ID: scene-04

Narration: `scene-04-beat-01`「Anthropic 做过一个很简单的改动：给每个碎片补上五十到一百个 Token 的背景，再去建立索引。」；`scene-04-beat-02`「实验中，检索失败率下降了百分之四十九；加上重排序，下降到百分之六十七。」；`scene-04-beat-03`「当然，这个收益会随数据和系统变化，但方向很清楚：重点不是塞得更多，而是取得更准。」

Scene Purpose: Demonstrate + Explain。用可见机制和受限定的数据说明：改善检索质量仍然能够产生显著价值。

Core Visual Idea: **一张失去语境的碎片卡，在补上来源背景后变得可识别；数据条随后展示失败减少，而不是夸大成通用准确率。**

Visual Strategy: Diagram + Data Visualization

Visual Description: 一张只写着“收入增长 3%”的灰色碎片卡悬在索引区，搜索光束从旁边滑过。卡片向上展开一条元数据区域，逐项出现公司、季度、文档类型等背景标签，并在旁边标明 `+50–100 context tokens`；搜索光束随即锁定卡片。画面右侧出现归一化的“检索失败”比较条：Baseline 为 100，Contextual Retrieval 收缩到 51 并标注 `−49%`，加入 Rerank 后收缩到 33 并标注 `−67%`。图表底部始终保留“特定实验；结果随数据与系统变化”的限定说明。

Motion Description: 碎片卡先保持低对比，元数据区域通过 Reveal 向上展开；每出现一个背景标签，卡片轮廓就更清晰。锁定发生时产生一次短促 Scale 反馈。比较条从同一基线出发依次收缩，数字最后出现；限定说明不参与缩放，始终稳定可读。

Camera Movement: 先近距离观察碎片卡与元数据展开，再水平 Pan 到右侧比较图。图表阶段保持固定机位，避免数字运动与摄像机运动同时增加负担。

Required Assets: 碎片卡、元数据标签组件、索引区、锁定光束、三段归一化比较条、百分比数字样式、实验限定说明。

Asset Type: Existing Component, SVG, Icon, Animation

## Scene ID: scene-05

Narration: `scene-05-beat-01`「所以未来真正的问题，不是长上下文还是 RAG。」；`scene-05-beat-02`「而是：哪些信息，应该在什么时候进入上下文。」；`scene-05-beat-03`「模型的桌子越来越大，但你仍然需要一个人，决定桌上该放什么。」

Scene Purpose: Conclusion。把争论从二选一转向“正确的信息在正确时间进入上下文”，并留下可复述的视觉记忆点。

Core Visual Idea: **桌面继续变大，但真正改变结果的是桌边的时间闸门与选择器。**

Visual Strategy: Metaphor + Diagram

Visual Description: 画面回到已经扩大的上下文桌面。桌面两端短暂出现“LONG CONTEXT”和“RAG”的对立标签，随后同时淡出，桌边浮现一条从“问题出现”到“生成回答”的时间轨。大量文件在桌外排队，只有与当前问题相关的三张卡片在正确节点通过青绿色闸门，被整齐放到回答区。最终桌面仍然巨大，但桌上只保留三张发光卡片；其余信息安静地停留在桌外，形成“拥有很多”和“此刻需要”之间的最终对照。

Motion Description: 二选一标签先相互推挤，再同时 Fade Out。时间轨从左到右 Reveal，问题信号到达节点时闸门打开；选择器依次将三张相关卡片送上桌面。最后所有运动停止，桌外文件降低对比，桌上三张卡片保持青绿色轮廓作为终止状态。

Camera Movement: 从中景缓慢推近时间闸门，跟随三张卡片进入桌面；结尾垂直拉高到俯视全景，让巨大的空桌、三张选中文档和桌外的信息海同时进入构图。

Required Assets: 大型桌面、二选一标签、时间轨、信息闸门、选择器、多来源文件队列、三张选中文档、回答区。

Asset Type: Existing Component, SVG, Icon, Animation

---

# Visual Notes

这套方案没有为每句话重新寻找一张插图，而是让同一张“上下文桌面”经历五次状态变化：扩张、过载、重组、验证和被有意识地使用。观众不需要重新学习画面规则，就能把注意力放在论点变化上。

Scene 3 和 Scene 4 刻意从隐喻转向结构图与数据图：前者需要解释系统关系，后者需要保护证据边界。Scene 4 使用 Baseline 100 的归一化比较，只表达脚本已经确认的检索失败率相对下降，不把 49% 和 67%包装成通用准确率。

所有主要元素均可由 HTML/CSS/SVG 与时间驱动动画实现，不依赖写实人物或外部镜头。画幅比例目前无法从 Script Package 确定，因此不在本阶段猜测；Storyboard 应在确定发布平台后锁定画幅与构图裁切。

---

# Quality Check

## Understanding Score:

9.5/10。容量、过载、旧流水线、上下文化检索和按时选择被放进同一视觉系统；观众能连续比较状态变化，而不必依赖旁白重复解释。

## Originality Score:

9/10。记忆点来自“不断变大的上下文桌面”和桌边选择机制，不依赖通用科技符号；五个场景共同完成一个视觉论证。

## Production Score:

9/10。核心资产是可复用的卡片、网格、节点、连接线和数据条，适合现有 HyperFrames/Remotion 工程栈。Scene 2 的文件密度和 Scene 3 的结构 Morph 需要控制元素数量，但不存在必须依赖外部实拍的部分。
