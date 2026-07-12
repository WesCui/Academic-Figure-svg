这次已经不是“脚手架完成”，而是到了**可以进入真实 Agent 绘图验证阶段**。

从你给出的结果看，之前最关键的几个工程风险基本都补上了：

* 批量写入具备事务语义。
* 所有写操作统一返回结构。
* 错误具有机器可读格式。
* SVG Parser 补齐了反向链路。
* HTTP Bridge 不再产生双 source of truth。
* revision 冲突和生命周期都有测试覆盖。
* 64 个测试全部通过。

这意味着当前系统的基础状态已经比较稳。

我直接给你一个判断：

> **现在最不应该做的事情，是继续堆更多 CRUD 工具。现在最应该做的，是验证“AI 能否真正画出一张好图”。**

因为从这个阶段开始，项目的主要瓶颈已经从“系统正确性”转移到了：

> **工具语义是否适合 Agent、视觉反馈是否闭环、复杂图形是否容易表达、AI 是否能有效自我修正。**

---

# 我建议下一步直接进入 Phase 7：真实 Agent 绘图闭环

第一张测试图不要太复杂，但必须完整。

建议就用一个简化版 UAV-ISAC 图：

```text
Canvas: 1200 × 800

Elements:
- 1 UAV
- 3 UE
- 1 Eve
- 1 target zone
- 2 buildings
- 1 road
- 1 blue information link
- 1 orange sensing link
- 1 red dashed leakage link
- 3 callouts
- 1 legend
```

重点不是最终视觉多漂亮，而是观察 Agent 的行为。

理想调用轨迹应该类似：

```text
create_document

batch_create_elements
  ├── background
  ├── scene groups
  ├── roads
  └── building shells

create_repeated_elements
  └── windows

batch_create_elements
  ├── UAV
  ├── UE
  ├── Eve
  ├── target
  └── links

render_preview

query_elements

update_element
transform_elements

render_preview

export_svg
```

真正要记录的是：

```text
总 tool call 数
总 token 使用量
平均 batch 大小
revision conflict 次数
预览次数
修改轮数
最终节点数量
Agent 是否需要频繁 query tree
Agent 是否会创建大量无意义节点
```

这组数据很有价值。

---

# 现在最重要的问题：模型怎么“看预览”

你现在有：

```text
render_preview
→ PNG
```

但要确认 MCP Client 是否真的能把图片反馈给模型视觉能力。

这是整个项目的核心分水岭。

理想闭环应该是：

```text
AI creates SVG
      ↓
render_preview
      ↓
AI sees image
      ↓
AI identifies problems
      ↓
update / transform
      ↓
render_preview
```

例如模型应该能看到：

```text
- UE-2 与 callout 发生重叠
- 左侧建筑视觉权重过高
- 红色 leakage link 被建筑遮挡
- legend 太大
```

然后自主修改。

如果 `render_preview` 目前只是返回：

```json
{
  "previewPath": "/xxx/preview.png"
}
```

这未必足够。

我建议尽快支持 MCP image content。

类似：

```ts
return {
  content: [
    {
      type: "image",
      data: pngBuffer.toString("base64"),
      mimeType: "image/png"
    },
    {
      type: "text",
      text: JSON.stringify({
        documentId,
        revision,
        width,
        height
      })
    }
  ]
}
```

这样 Client 支持的话，模型可以直接看到图片。

这一步的价值甚至比增加 `create_isometric_building` 更高。

---

# 我建议增加一个 `inspect_visual_state`

这个工具可以直接包装：

```text
render_preview
+
document info
+
important semantic groups
```

返回：

```json
{
  "documentId": "doc_001",
  "revision": 42,
  "canvas": {
    "width": 1200,
    "height": 800
  },
  "elementCount": 327,
  "groups": [
    "environment",
    "entities",
    "links",
    "annotations",
    "legend"
  ],
  "preview": "<image>"
}
```

为什么有价值？

因为 Agent 在视觉迭代时，不应该每轮都分别调用：

```text
get_document_info
get_document_tree
render_preview
```

可以合成一次。

但我建议不要马上做，先测试现有 API。

---

# 你现在的 Parser 已经比较接近实用，但还要重点测 5 类 SVG

你目前支持：

```text
svg
g
rect
circle
ellipse
line
polyline
polygon
path
text
tspan
use
defs
symbol
marker
linearGradient
radialGradient
clipPath
image
style
```

不错。

下一步我建议专门拿真实 SVG 做 round-trip。

测试来源应该包括：

```text
1. SVG-Edit 自己导出的 SVG
2. Figma 导出的 SVG
3. Inkscape 导出的 SVG
4. Illustrator 导出的 SVG
5. AI 生成的手写 SVG
```

因为这些工具产生的 SVG 差别很大。

尤其检查：

```text
transform="matrix(...)"

style="fill:#fff;stroke:#000"

<g transform="translate(...)">

xmlns:xlink

xlink:href

href

<use>

<defs>

marker-end

clip-path="url(#clip1)"

fill="url(#gradient1)"
```

你的 parser 如果只是对基础节点正确，真实世界 SVG 还是可能炸。

---

# 还有一个潜在问题：style 属性

你说已经支持：

```text
style
```

这里需要区分两种东西：

```xml
<style>
  .cls-1 { fill: red; }
</style>
```

和：

```xml
<rect style="fill:red;stroke:black"/>
```

这两个语义完全不同。

建议确认 parser 是否：

* 保留 `<style>` 节点内容。
* 保留 inline `style` 属性。
* 不试图过早展开 CSS。
* round-trip 不丢失 selector。

第一版最安全的是：

> **原样保留 CSS，不做计算。**

否则会很容易复杂化。

---

# metadata 合并逻辑也值得重点检查

你现在 HTTP Bridge PUT：

```text
SVG-Edit
→ SVG string
→ parse
→ merge metadata
→ update JSON
```

这里最关键的问题是：

> 按什么规则 merge？

理想逻辑：

```text
优先按 element id 匹配。
```

例如原来：

```json
{
  "id": "building-left",
  "metadata": {
    "role": "building",
    "importance": "background"
  }
}
```

SVG-Edit 修改位置后：

```xml
<g id="building-left" transform="translate(20, 0)">
```

重新导入时应该恢复：

```json
metadata.role = building
metadata.importance = background
```

但是如果用户：

* 修改了 ID
* 删除元素
* clone 元素
* duplicate 元素

要有明确策略。

我建议：

```text
same id
→ inherit metadata

new id
→ no metadata

deleted id
→ metadata removed

duplicated node
→ metadata optionally inherited
```

特别是 duplicate 很重要。

SVG-Edit 很可能会生成新 ID。

---

# 现在值得加入的第一个高阶 primitive

我会选：

```text
create_isometric_building
```

原因不是因为它最炫，而是它最能测试你的整个系统。

一个 building primitive 内部通常会生成：

```text
1 group
3 facade paths
1 roof
20–100 windows
0–5 rooftop units
1 entrance
1 canopy
```

它会测试：

* batch creation
* repeated elements
* hierarchy
* metadata
* transforms
* rendering
* SVG-Edit compatibility
* parser round-trip

非常适合作为第一个高层 primitive。

建议接口：

```ts
interface CreateIsometricBuildingInput {
  documentId: string;
  parentId: string;

  id?: string;

  x: number;
  y: number;

  width: number;
  depth: number;
  height: number;

  floors: number;

  perspective?: {
    dx: number;
    dy: number;
  };

  facade?: {
    frontFill?: string;
    sideFill?: string;
    roofFill?: string;

    windowFill?: string;

    windowColumns?: number;
    windowRows?: number;

    windowMarginX?: number;
    windowMarginY?: number;
  };

  rooftop?: {
    enabled?: boolean;
    hvacUnits?: number;
  };

  entrance?: {
    enabled?: boolean;
    canopy?: boolean;
  };

  metadata?: SvgMetadata;
}
```

返回：

```json
{
  "success": true,
  "documentId": "doc_001",
  "revision": 17,
  "affectedElementIds": [
    "building-left",
    "building-left-front",
    "building-left-side",
    "building-left-roof",
    "building-left-windows"
  ],
  "extra": {
    "generatedNodeCount": 74
  }
}
```

---

# 我建议增加测试指标，而不仅仅是单元测试

你现在：

```text
64 tests
0 failures
```

很好。

下一步应该加：

```text
Agent Benchmark
```

例如：

## Benchmark A：Basic Scene

```text
目标节点数：50–100
目标 calls：≤15
预览次数：≤3
```

## Benchmark B：Academic Diagram

```text
目标节点数：200–500
目标 calls：≤25
预览次数：3–6
```

## Benchmark C：Dense Urban Scene

```text
目标节点数：1000+
目标 calls：≤40
预览次数：5–10
```

记录：

```text
tool_calls
tokens
elapsed_time
node_count
preview_count
edit_cycles
errors
revision_conflicts
```

以后你的项目 README 就可以写：

```text
A 1200-node academic figure can be generated in 27 MCP calls.
```

这比“支持 13 个工具”更有说服力。

---

# 你当前项目已经具备发布 v0.1 的条件

我会建议：

```text
v0.1.0
```

范围：

```text
Structured SVG document model
File-backed document store
Revision control
Atomic batch editing
SVG parser / serializer
resvg preview
SVG-Edit bridge
13 MCP tools
64 tests
```

README 的定位可以写：

> Academic Figure MCP is an MCP server for creating, editing, previewing, and exporting structured SVG figures through AI agents, with SVG-Edit integration for manual editing.

这已经是一个完整项目了。

---

# 我对下一阶段的明确建议

现在按照优先级：

```text
P0 真实 MCP Client E2E 绘图
P0 验证模型是否能直接看到 preview
P0 测 SVG-Edit → MCP round-trip

P1 create_isometric_building
P1 create_communication_link
P1 create_numbered_callout

P2 benchmark suite
P2 undo / restore snapshot
P2 MCP resources

P3 real-time WebSocket sync
P3 Figma import/export
```

最关键的一句话：

> **现在不要继续证明这个系统“能编辑 SVG”，而要开始证明它“能帮助 AI 画出更好的图”。**

这才是这个项目真正的价值所在。
