这次的方向明显更对了。你现在已经从“**通用 SVG MCP**”进入了真正的 **Academic Figure Engine** 阶段。

我的判断是：

> **Review #3 之后，这个项目已经具备“让 Agent 用语义而不是像素坐标画学术图”的雏形。**

但我要先指出一个非常明显的问题：**新增了 7 个 MCP 工具和完整 Theme/Primitive/Audit/Layout 能力，但测试总数仍然是 77，和上一轮完全一样。**

这意味着至少从你给出的 summary 来看，新增能力没有新增专门测试，或者测试数字没有更新。这个问题比继续加功能更值得优先检查。

---

## 一、当前架构已经形成了正确的抽象层级

现在的链路是：

```text
Prompt / Figure Intent
        ↓
Semantic Primitives
        ↓
Academic Theme
        ↓
Structured SVG
        ↓
Preview + Static Audit
        ↓
Refinement
        ↓
Export
```

这比最初的：

```text
Prompt
  ↓
create_rect
create_path
create_line
  ↓
SVG
```

高了一个完整层次。

最重要的改变是：

以前模型需要决定：

```text
颜色是多少？
线宽多少？
虚线怎么配？
箭头怎么画？
Callout 圆角多少？
字体几号？
```

现在模型只需要表达：

```text
这是一条 leakage link
这是第 3 个 callout
这是一个 IEEE theme figure
```

然后系统决定视觉表达。

这正是降低“AI 味”的正确方向。

---

# 二、`create_communication_link` 是目前最有价值的 primitive

我认为你目前新增的 7 个工具里，价值最高的是：

```text
create_communication_link
```

特别是你已经支持：

```text
information
sensing
artificial-noise
leakage
trajectory
```

以及：

```text
sourceId / targetId auto-positioning
line / beam geometry
arrowheads
```

这实际上已经不是一个 SVG primitive，而是一个**领域语义 primitive**。

对于 UAV-ISAC：

```text
information      → 蓝色实线箭头
sensing          → 橙色实线/beam
artificial-noise → 橙色半透明 beam
leakage          → 红色虚线箭头
trajectory       → 红色弧形虚线
```

以后还可以自然扩展：

```text
control
feedback
wireless
wired
dependency
attention
data-flow
gradient-flow
```

这样你的项目就不只适用于 UAV 图，也能覆盖：

* Agent 架构图
* 强化学习方法图
* 神经网络结构图
* 通信系统模型图
* 流程图

所以我建议以后不要把这个 primitive 限定成“通信链路”，而是在内核里抽象成：

```text
semantic_link
```

然后通信只是一个 preset family。

例如：

```ts
semanticFamily:
  | "wireless-communication"
  | "machine-learning"
  | "agent-system"
  | "generic-flow"
```

但这个属于后续，不需要现在改。

---

# 三、Theme System 很关键，但两个 theme 还不够验证体系

现在有：

```text
academic
ieee
```

这是好的开始，但我要提醒一个问题：

> “IEEE”并不是一个单一视觉风格。

IEEE TWC、JSAC、TMC、TNNLS、TSP 的方法图虽然有共性，但差异也很明显。

我建议不要马上增加 10 个 theme，而是先把 theme 分成两个层次。

## Base theme

例如：

```text
academic-light
academic-serif
academic-monochrome
```

## Domain preset

例如：

```text
wireless-system-model
ml-method-diagram
agent-architecture
experimental-result
```

最终：

```text
Theme = Base Visual Theme + Domain Style Profile
```

例如：

```ts
{
  baseTheme: "ieee",
  profile: "wireless-system-model"
}
```

这样更合理。

因为“UAV-ISAC 系统模型图”和“Transformer 网络结构图”即使都发 IEEE，也不应该使用完全同样的 primitive 默认值。

---

# 四、`create_numbered_callout` 需要重点防止 UI 卡片感

这是我对你项目最实际的视觉建议。

很多 AI 图的“AI 味”，就来源于：

```text
大圆角矩形
浅蓝背景
粗边框
大号数字圆圈
阴影
```

看起来像：

> SaaS Dashboard，而不是学术论文。

所以 `create_numbered_callout` 最好支持至少三种 variant：

```text
minimal
boxed
leader-only
```

### `minimal`

```text
① UAV-enabled communication and sensing
          └──────────→ UAV
```

无背景框。

### `boxed`

```text
╭─────────────────────╮
│ ① UAV-enabled ...   │
╰─────────────────────╯
```

但边框很轻。

### `leader-only`

```text
① Sensing/AN beam
        \
         └──────●
```

适合高密度论文图。

对于你最开始那张 UAV-ISAC 图，我实际上会优先使用：

```text
minimal / leader-only
```

而不是四个大卡片。

---

# 五、`create_paper_legend` 目前可能还太简单

你写的是：

> Auto-height legend box with color swatches + labels.

这里我认为需要立即检查，因为论文图的 legend 往往不只是 color swatches。

你的 UAV-ISAC 图就需要：

```text
[UAV icon]          UAV
[UE icon]           UE
[highlighted UE]    Scheduled UE
[target icon]       Target
[Eve icon]          Eve

────▶                Information link
━━━━▶                Sensing/AN link
- - - ▶              Leakage link
⌒ - - - ▶            UAV trajectory
```

所以 legend entry 应该支持：

```ts
type LegendEntry =
  | IconLegendEntry
  | LineLegendEntry
  | ShapeLegendEntry
  | ColorLegendEntry;
```

比如：

```ts
interface LineLegendEntry {
  type: "line";
  label: string;
  semanticType:
    | "information"
    | "sensing"
    | "leakage"
    | "trajectory";
}
```

最理想的是直接复用 `create_communication_link` 的 theme resolver。

不要单独再写一遍颜色和虚线逻辑。

---

# 六、`audit_figure` 是对的，但 Bounding Box overlap 会产生很多误报

你现在检查：

```text
overlap
out-of-bounds
small text
density
```

方向正确。

但 overlap detection 很容易遇到一个问题：

例如：

```text
一条 diagonal communication link
```

它的 axis-aligned bbox 可能覆盖：

```text
building
tree
callout
```

但视觉上其实完全没有重叠。

再例如：

```text
ellipse
path
rotated group
transform
```

单纯 AABB 检测误报会很多。

所以建议 audit report 区分：

```text
hard overlap
soft overlap
expected overlap
```

例如：

```json
{
  "elementA": "link-uav-eve",
  "elementB": "building-right",
  "severity": "info",
  "reason": "link crossing background environment is allowed"
}
```

可以结合 metadata：

```text
background building + communication link
→ generally allowed

callout + text label
→ warning

label + label
→ high severity

legend + main scene
→ high severity
```

这就是 metadata 真正发挥作用的地方。

我会建议加入：

```text
overlapPolicy
```

例如：

```ts
rolePairPolicies = {
  "communication-link:building": "allow",
  "annotation:annotation": "warn",
  "text:text": "error",
  "legend:scene": "error"
}
```

这样 audit 才真正智能。

---

# 七、`align_elements` 和 `distribute_elements` 目前只是基础，还缺 anchor

目前：

```text
center-x
center-y
left
right
top
bottom
```

很好。

下一步很自然会需要：

```text
align_to_canvas
align_to_parent
align_to_element
```

例如：

```text
把 legend 水平居中到 canvas
```

不是：

```text
选 5 个元素 center-x
```

而是：

```ts
align_elements({
  elementIds: ["legend"],
  alignment: "center-x",
  relativeTo: "canvas"
})
```

或者：

```ts
relativeTo: {
  elementId: "main-scene"
}
```

这对 Agent 来说更自然。

---

# 八、现在最大的问题：为什么测试还是 77？

这一点我会非常认真地指出。

你新增了：

```text
AcademicFigureTheme
create_communication_link
create_numbered_callout
create_paper_legend
audit_figure
align_elements
distribute_elements
list_themes
```

但：

```text
core: 47
mcp: 30
total: 77
```

完全没变。

这意味着可能存在三种情况：

### 情况 A

你确实没给这些新功能写测试。

那应该补。

### 情况 B

写了，但原来的测试统计 summary 没更新。

那只是报告问题。

### 情况 C

测试被塞进已有 test case 中，但总 case 数不增加。

有可能，但不太可能 7 个新工具一个 case 都没加。

我建议最少补这些：

```text
theme.test.ts
primitive-service.test.ts
audit-service.test.ts
layout-service.test.ts
```

应该至少增加 25–40 个 tests。

---

# 九、我建议下一轮不要再实现功能，直接做真正的 UAV-ISAC benchmark

现在就该回到我们一开始的问题。

不是再画：

```text
2 buildings + 3 UE + 1 Eve
```

而是直接画你真正的图：

```text
Canvas: 1448 × 1086

Scene:
- 4 detailed buildings
- 15–20 trees
- roads + crosswalks
- central target zone
- UAV
- UE-1
- UE-2 scheduled
- UE-3
- UE-4
- Eve-1
- Eve-2

Links:
- 1 information link
- 2 sensing/AN links
- 2 leakage links
- 1 UAV trajectory

Annotations:
- H = 100 m
- 4 numbered callouts
- full legend
```

然后做 3 个版本：

```text
A. Raw low-level tools only
B. High-level primitives, no preview refinement
C. High-level primitives + preview + audit + refinement
```

对比：

```text
tool calls
tokens
node count
preview count
audit findings
edit cycles
visual quality
structural quality
```

这组 benchmark 会非常有价值。

我预测：

```text
A: 60–100 calls
B: 20–30 calls
C: 25–40 calls
```

但 C 的视觉质量应该明显更好。

---

# 十、我建议加一个 `FigurePlan`，但暂时不要做完整 DSL

你已经开始出现：

```text
Figure Intent
↓
Theme
↓
High-Level Primitives
```

现在可以增加一个轻量中间结构：

```ts
interface FigurePlan {
  canvas: {
    width: number;
    height: number;
  };

  theme: string;

  groups: FigureGroupPlan[];

  entities: EntityPlan[];

  links: LinkPlan[];

  annotations: AnnotationPlan[];

  legend?: LegendPlan;
}
```

Agent 可以先输出：

```json
{
  "canvas": {
    "width": 1448,
    "height": 1086
  },
  "theme": "ieee",
  "entities": [
    {
      "id": "uav",
      "type": "uav",
      "position": [640, 100]
    },
    {
      "id": "ue-2",
      "type": "ue",
      "variant": "scheduled"
    }
  ],
  "links": [
    {
      "from": "uav",
      "to": "ue-2",
      "type": "information"
    }
  ]
}
```

然后：

```text
compile_figure_plan
```

转成 primitives。

但我不会现在就把它做成新的 MCP Tool。

先在代码内部做：

```text
FigurePlan → Primitive Calls
```

等 benchmark 证明有效再暴露。

---

# 十一、现在这个项目已经有明确的研究潜力

你现在拥有的不是：

> 一个 SVG 编辑 MCP。

而是：

> 一个具有结构化文档模型、语义 primitive、主题系统、视觉反馈、静态审计和人机协同编辑能力的 AI-native academic figure generation system。

这里面可以形成几个研究问题：

### 1. Semantic primitive abstraction

高层语义工具是否比低层 SVG API 更能提高 Agent 的绘图效率与视觉质量？

### 2. Visual feedback loop

加入 preview feedback 后，模型是否能显著减少布局错误？

### 3. Static audit + visual reasoning

几何审计与多模态视觉审查结合是否优于单独使用？

### 4. Editability-aware generation

如何同时优化：

```text
视觉质量
结构完整性
可编辑性
节点效率
```

这其实是很有价值的方向。

---

# 我对你当前版本的结论

当前阶段我会给：

```text
Engineering foundation     9/10
MCP tool design            8.5/10
SVG robustness             8.5/10
Agent ergonomics           8/10
Visual design abstraction  7/10
Academic drawing quality   尚未真正验证
```

最后一项现在不能给高分，因为还没有拿真正复杂图证明。

所以现在下一步非常明确：

> **不要再加工具。直接拿我们最初那张 UAV-ISAC 图作为 v0.2 benchmark，用你现在的 20 个 MCP tools 真正重画一次。**

这会是这个项目第一次真正的“验货”。
