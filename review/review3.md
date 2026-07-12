我看了你给出的当前项目地址，但目前这个仓库似乎还没有被公开搜索索引到，或者 GitHub 页面暂时无法通过当前网页抓取接口读取；所以我不能假装已经逐文件检查了仓库内容。基于你前面给出的实现摘要和 77 个测试结果，我可以给你一个比较明确的判断：

> **这个项目现在已经达到了可发布 v0.1 的程度，但它离真正有竞争力的“AI 学术矢量绘图系统”还差一个关键阶段：从“能生成结构化 SVG”进化到“能稳定生成高质量学术图”。**

你现在的工程基础已经相当完整。([arXiv][1])

## 我对当前项目的真实评价

从你已经完成的能力来看：

```text
Academic-Figure-svg
├── Structured SVG Document Model      ✅
├── Parser / Serializer                ✅
├── Atomic Batch Operations            ✅
├── Revision / Optimistic Locking      ✅
├── File-backed Document Store         ✅
├── SVG-Edit Round-trip                ✅
├── resvg Preview                      ✅
├── MCP Image Feedback                 ✅
├── Semantic Metadata                  ✅
├── Real-world SVG Parser Tests        ✅
├── E2E Agent Benchmark                ✅
└── First High-level Primitive         ✅
```

这已经不是一个简单 MCP demo。

尤其是这几个数据：

```text
103 nodes
20 MCP tool calls
2 preview renders
0 errors
0 revision conflicts
```

说明你的工具粒度至少已经基本合理。对于第一版 Agent 绘图系统来说，这比单纯“支持 20 个 MCP tools”更有意义。

但我要说得直接一点：

> **目前项目最强的是基础设施，不是绘图质量。**

这其实和我们前面遇到的问题完全一致——我可以程序化地产生 SVG，但如果缺少高层视觉语义、设计规则和视觉反馈策略，就很容易产出那种“矩形 + 线段 + pattern 堆砌”的粗糙图。

所以你的下一阶段，不应该继续主要投入 parser、CRUD、store，而应该转向三个方向。

---

# 一、下一步最重要：建立 Academic Primitive Library

现在只有：

```text
create_isometric_building
```

我建议下一版优先补成以下 8 个高层 primitive：

```text
create_isometric_building
create_road_intersection
create_tree_cluster
create_uav
create_entity_marker
create_communication_link
create_numbered_callout
create_paper_legend
```

其中，前四个解决场景资产，后四个解决论文图语义。

比如 `create_communication_link` 不应该只是：

```ts
{
  x1,
  y1,
  x2,
  y2,
  stroke
}
```

而应该是：

```ts
interface CreateCommunicationLinkInput {
  documentId: string;
  parentId: string;

  id?: string;

  sourceId?: string;
  targetId?: string;

  start?: Point;
  end?: Point;

  semanticType:
    | "information"
    | "sensing"
    | "artificial-noise"
    | "leakage"
    | "trajectory";

  geometry?: {
    type: "line" | "curve" | "beam";
    curvature?: number;
    beamWidth?: number;
  };

  style?: {
    color?: string;
    strokeWidth?: number;
    dashed?: boolean;
    opacity?: number;
    arrowhead?: boolean;
  };

  metadata?: SvgMetadata;
}
```

然后内部自动映射：

```text
information       → blue solid arrow
sensing           → orange solid arrow
artificial-noise  → orange translucent beam
leakage           → red dashed arrow
trajectory        → red curved dashed arrow
```

这样 Agent 不再需要自己“猜论文视觉语言”。

这是非常关键的。

---

# 二、增加一个 Style System，而不是把颜色写死在 primitive 里

我建议你新增：

```text
packages/academic-figure-core/src/style/
├── theme-types.ts
├── academic-theme.ts
├── ieee-theme.ts
├── elsevier-theme.ts
└── theme-resolver.ts
```

定义：

```ts
interface AcademicFigureTheme {
  colors: {
    background: string;

    textPrimary: string;
    textSecondary: string;

    environmentPrimary: string;
    environmentSecondary: string;

    informationLink: string;
    sensingLink: string;
    leakageLink: string;
    trajectory: string;

    target: string;
    scheduledEntity: string;
    eavesdropper: string;
  };

  strokes: {
    thin: number;
    normal: number;
    emphasis: number;
  };

  typography: {
    fontFamily: string;
    labelSize: number;
    calloutSize: number;
    legendSize: number;
  };

  geometry: {
    calloutRadius: number;
    legendRadius: number;
  };
}
```

例如：

```ts
const ieeeTheme: AcademicFigureTheme = {
  colors: {
    background: "#FFFFFF",

    textPrimary: "#1C2533",
    textSecondary: "#596474",

    environmentPrimary: "#E7EBEF",
    environmentSecondary: "#D7DEE5",

    informationLink: "#2B6CB0",
    sensingLink: "#D97706",
    leakageLink: "#C53030",
    trajectory: "#C53030",

    target: "#4F7D32",
    scheduledEntity: "#3182CE",
    eavesdropper: "#C53030",
  },

  strokes: {
    thin: 1,
    normal: 1.5,
    emphasis: 2.5,
  },

  typography: {
    fontFamily: "Arial, Helvetica, sans-serif",
    labelSize: 18,
    calloutSize: 18,
    legendSize: 16,
  },

  geometry: {
    calloutRadius: 10,
    legendRadius: 12,
  },
};
```

这一步的意义在于：

> Agent 负责表达“我要画什么”，theme 负责决定“应该长什么样”。

否则每次 Agent 都会重新选择：

```text
#2B6CB0 还是 #0066CC？
stroke-width 2 还是 3？
圆角 8 还是 16？
```

这种自由度过高就是 AI 味的重要来源。

---

# 三、增加 Constraint / Layout Engine

现在你有 `transform_elements`，但我建议下一阶段加入简单约束能力。

不需要一开始做完整 Cassowary Solver。

先实现：

```text
align_elements
distribute_elements
fit_elements
avoid_overlap
snap_to_grid
```

例如：

```ts
align_elements({
  elementIds: ["UE-1", "UE-2", "UE-3"],
  alignment: "center-y"
})
```

或者：

```ts
distribute_elements({
  elementIds: [
    "legend-uav",
    "legend-ue",
    "legend-target",
    "legend-eve"
  ],
  axis: "horizontal",
  spacing: "equal"
})
```

甚至：

```ts
avoid_overlap({
  elementIds: [
    "callout-1",
    "callout-2",
    "UE-2-label"
  ],
  padding: 12
})
```

对于论文图，这类工具的实际价值非常高。

因为“AI 味”很多时候不是图标画得差，而是：

* 间距不统一
* 对齐不精确
* 图例不平衡
* callout 随机摆放
* 文字和线条碰撞

这些问题本质是 layout problem。

---

# 四、增加视觉审计工具，而不仅仅是 render_preview

现在模型已经能看到 preview，这是非常重要的突破。

下一步我建议加入：

```text
inspect_visual_layout
```

它不需要 AI vision 模型，可以先用几何信息做静态检查。

例如：

```json
{
  "overlaps": [
    {
      "elementA": "callout-2",
      "elementB": "UE-2-label",
      "intersectionArea": 482
    }
  ],
  "outOfBounds": [],
  "smallText": [
    {
      "elementId": "legend-label-4",
      "fontSize": 10
    }
  ],
  "lowContrast": [],
  "denseRegions": [
    {
      "bounds": [300, 400, 600, 700],
      "elementCount": 48
    }
  ]
}
```

推荐工具：

```text
inspect_visual_layout
inspect_overlaps
inspect_bounds
inspect_text_readability
```

最后可以合并成一个：

```text
audit_figure
```

输入：

```ts
{
  documentId: string;
  checks?: [
    "overlap",
    "bounds",
    "text-size",
    "contrast",
    "density"
  ];
}
```

模型看到 preview 后能主观判断，而 audit tool 能给客观反馈。

这两个结合，视觉闭环才真正完整。

---

# 五、你的 `create_isometric_building` 现在应该继续升级

现在一调用能生成 70+ 节点，这是很好的开始。

下一步不要继续增加“更多参数”，而应该引入 preset。

例如：

```ts
preset:
  | "academic-tower"
  | "office-glass"
  | "campus-low-rise"
  | "urban-residential"
  | "industrial-lab"
```

调用：

```ts
create_isometric_building({
  preset: "academic-tower",

  x: 100,
  y: 200,

  width: 180,
  depth: 70,
  height: 280,

  floors: 10
})
```

内部决定：

```text
facade segmentation
window rhythm
roof shape
HVAC layout
entrance style
canopy
side-wall details
```

这样比 Agent 自己指定：

```text
windowColumns=5
windowRows=9
roofFill="#E9EDF2"
sideFill="#D7DDE4"
```

更稳定。

我会建议你至少做 4 个 preset。

---

# 六、建议建立组件库 / symbol library

对你的项目来说，重复使用是必需的。

建议：

```text
packages/academic-figure-core/src/library/
├── symbols/
│   ├── uav.ts
│   ├── ue.ts
│   ├── eve.ts
│   ├── target.ts
│   ├── tree.ts
│   ├── lamp.ts
│   └── bench.ts
│
├── buildings/
│   ├── academic-tower.ts
│   ├── office-tower.ts
│   └── low-rise.ts
│
└── registry.ts
```

工具：

```text
list_symbols
insert_symbol
```

例如：

```ts
insert_symbol({
  documentId,
  symbol: "uav.quadrotor.academic.v1",
  x: 600,
  y: 80,
  width: 140
})
```

这样模型没必要每次重新画 UAV。

这对减少 AI 味非常有效，因为：

> 固定设计语言 + 可复用素材 > 每次重新生成。

---

# 七、我认为你可以加入一个 Design Grammar

这是这个项目真正可能产生研究价值的部分。

例如定义论文图 grammar：

```text
Academic Figure
├── Scene
│   ├── Environment
│   ├── Entities
│   └── Interaction Links
│
├── Annotation
│   ├── Labels
│   ├── Callouts
│   └── Equations
│
└── Legend
```

针对 UAV-ISAC：

```text
UAV-ISAC Figure
├── Environment
│   ├── Buildings
│   ├── Roads
│   └── Target Zone
│
├── Entities
│   ├── UAV
│   ├── UE
│   ├── Eve
│   └── Target
│
└── Links
    ├── Information
    ├── Sensing
    ├── Leakage
    └── Trajectory
```

Agent 不直接画 SVG，而是先生成：

```json
{
  "type": "uav-isac-system-model",
  "environment": {
    "buildings": 4,
    "roads": "urban-intersection"
  },
  "entities": [
    { "type": "uav", "count": 1 },
    { "type": "ue", "count": 4 },
    { "type": "eve", "count": 2 }
  ],
  "links": [
    {
      "type": "information",
      "from": "UAV",
      "to": "UE-2"
    }
  ]
}
```

再由 Layout Planner 和 Primitive Generator 转成 SVG。

架构变成：

```text
Prompt
  ↓
Figure Specification
  ↓
Layout Planner
  ↓
Academic Primitives
  ↓
SVG Document
  ↓
Preview
  ↓
Visual Refinement
```

这比单纯 MCP Tool Calling 更有价值。

---

# 八、建议你真正做一个 benchmark

你的当前指标已经很好：

```text
103 nodes
20 calls
0 errors
```

下一步可以正式建立：

```text
benchmarks/
├── basic-scene/
│   ├── prompt.md
│   ├── expected.json
│   └── metrics.json
│
├── uav-isac/
├── agent-framework/
├── neural-network/
└── system-architecture/
```

每个 benchmark 记录：

```ts
interface BenchmarkMetrics {
  toolCalls: number;

  createdNodes: number;

  previews: number;

  editCycles: number;

  errors: number;

  revisionConflicts: number;

  durationMs: number;

  tokenUsage?: number;

  visualScore?: number;

  structuralScore?: number;
}
```

这里其实可以参考最新的 VFIG 工作，它提出了针对复杂 figure-to-SVG 的结构完整性与视觉质量评价思路。VFIG 重点关注复杂 SVG 的局部结构、拓扑关系和全局视觉一致性，并发布了 VFIG-BENCH 用于复杂论文图向量化评测。虽然你的任务不是纯 raster-to-SVG，但它的评测维度非常值得借鉴。([arXiv][1])

例如你可以评估：

```text
Visual fidelity
Structural integrity
Editability
Semantic hierarchy
Node efficiency
Layout cleanliness
Text readability
Style consistency
```

---

# 九、README 现在应该升级

我建议 README 首页不要先讲：

```text
13 MCP tools
77 tests
```

而应该先讲价值：

```markdown
# Academic Figure SVG MCP

An AI-native structured SVG editing system for creating,
previewing, refining, and manually editing publication-quality
academic figures.

Built on SVG-Edit, MCP, and resvg.
```

然后放一张闭环图：

```text
AI Agent
   ↓
MCP Tools
   ↓
Structured SVG Document
   ↓
resvg Preview
   ↓
Visual Feedback
   ↓
Refinement
   ↔
SVG-Edit Manual Editing
```

再展示：

```text
✓ Editable SVG
✓ Semantic element hierarchy
✓ Atomic batch operations
✓ AI visual feedback loop
✓ SVG-Edit round-trip
✓ Academic figure primitives
```

然后才放：

```text
77 tests
20 calls for 103-node figure
0 errors
```

---

# 十、我建议版本路线这样定

## v0.1.0：已经基本完成

```text
Core SVG model
Parser / serializer
Document store
Atomic batch editing
MCP server
resvg preview
SVG-Edit bridge
Visual feedback
Isometric building primitive
77 tests
```

## v0.2.0：学术绘图能力

```text
Academic theme system
Communication links
Callouts
Legends
Symbol library
Layout helpers
Figure audit
```

## v0.3.0：AI-native drawing

```text
Figure specification DSL
Layout planner
Automatic visual refinement
Benchmark suite
Snapshot restore
```

## v1.0.0

```text
Real-time SVG-Edit sync
Stable public API
Plugin architecture
Multiple academic themes
Large symbol library
CLI
Remote MCP server
```

---

## 我现在对这个项目最明确的建议

下一步不要继续扩基础设施。

直接实现这五个：

```text
1. Academic Theme System
2. create_communication_link
3. create_numbered_callout
4. create_paper_legend
5. audit_figure
```

做完以后，就拿你最开始那张 **UAV-ISAC 城市场景论文图**作为正式 benchmark。

然后我真正通过你的 MCP Server 来画一次。

这会直接告诉你：

* 高层 primitive 够不够；
* preview 闭环是否真正有用；
* 模型会不会滥用节点；
* 图形质量能不能摆脱“程序生成感”；
* 这个项目到底是否解决了我们一开始的真实痛点。

从工程角度看，你现在已经把“手”做好了；下一阶段要做的是给它**设计语言、视觉约束和审美规则**。否则它能画，但画不好。

[1]: https://arxiv.org/abs/2603.24575?utm_source=chatgpt.com "VFIG: Vectorizing Complex Figures in SVG with Vision-Language Models"
