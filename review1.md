这套实现已经从“概念验证”进入了**可用工程原型**阶段，而且整体架构方向是对的。尤其是下面几个决定很关键：

* **JSON Document Store 作为 source of truth**，避免把浏览器 DOM 当状态中心。
* **SVG-Edit 只是可视化前端**，MCP Server 可以脱离浏览器独立工作。
* **resvg 提供确定性预览**，为后续视觉闭环打基础。
* **optimistic locking + revision**，为 AI 与人工同时编辑预留了并发控制能力。
* **batch-first API**，避免 Agent 为一栋楼调用几百次 `create_element`。
* **metadata / role / importance / tags**，这一步非常有价值，后面可以做真正的语义级编辑。

但现在我建议你**先别继续加功能**。下一步最重要的是做一次完整的端到端验收，验证这 13 个工具是否真的适合 Agent 绘图，而不是仅仅“能调用”。

## 我建议的第一轮 E2E 测试

直接让 MCP Client 完成一个小型但完整的学术图任务：

> 创建一个 1200×800 的 SVG 论文图，包含：
>
> * 左侧一栋 8 层建筑
> * 右侧一栋 5 层建筑
> * 中央一个 UAV
> * 3 个 UE
> * 1 个 Eve
> * 蓝色通信链路
> * 红色虚线窃听链路
> * 底部图例
> * 最后生成 PNG preview 和 SVG export

预期调用顺序应该类似：

```text
1. create_document
2. create_element        # root groups
3. batch_create_elements # roads/building shells
4. create_repeated_elements # window grids
5. batch_create_elements # UAV / UE / Eve / links
6. get_document_tree
7. render_preview
8. query_elements
9. update_element / transform_elements
10. render_preview
11. export_svg
```

如果 Agent 需要调用 50~100 次 `create_element` 才能完成，说明工具设计还不够高层。

---

## 第一轮验收标准

我建议至少检查这 8 项：

### 1. 文档生命周期

验证：

```text
create_document
→ create elements
→ save
→ restart server
→ load_document
→ continue editing
```

重启后不能丢失状态。

### 2. revision 冲突

模拟：

```text
revision = 10

AI A:
update_element(expectedRevision=10)
→ success
→ revision=11

AI B:
update_element(expectedRevision=10)
→ REVISION_CONFLICT
```

这必须明确返回结构化错误，而不是普通字符串。

推荐返回：

```json
{
  "code": "REVISION_CONFLICT",
  "message": "Document revision mismatch",
  "expectedRevision": 10,
  "currentRevision": 11
}
```

### 3. batch 原子性

例如 100 个元素中，第 73 个非法。

必须明确决定：

```text
A. 全部回滚
```

还是：

```text
B. 部分成功 + 返回失败索引
```

我强烈建议第一版采用：

> **事务语义：全成功或全失败。**

否则 Agent 后面很难推理当前图到底是什么状态。

### 4. SVG 导入后 round-trip

这是一个很重要的问题。

流程：

```text
MCP creates SVG
→ SVG-Edit opens it
→ human moves elements
→ SVG-Edit saves via PUT
→ MCP reloads
→ get_document_tree
```

必须检查：

* `id` 是否保留
* `data-role` 是否保留
* `data-importance` 是否保留
* group hierarchy 是否保留
* `transform` 是否正确解析
* SVG-Edit 是否重写或移除某些属性

这可能是你现在最容易出现隐藏问题的地方。

---

## 我尤其建议检查 PUT SVG 的实现

你现在 HTTP Bridge 有：

```text
PUT /api/documents/:id/svg
```

这里的关键问题是：

> SVG-Edit 保存回来的是 SVG XML，但 source of truth 是 JSON Document Tree，那么你是否已经实现了 SVG → JSON Tree parser？

如果只是：

```text
PUT svg
→ 保存 current.svg
```

但没有同步：

```text
current.svg
→ parse
→ document.json
```

那么实际上会出现双 source of truth：

```text
document.json  ← MCP 使用
current.svg    ← SVG-Edit 使用
```

这会导致严重状态漂移。

正确逻辑应该是：

```text
SVG-Edit PUT SVG
        ↓
parse SVG XML
        ↓
validate IDs / supported nodes
        ↓
merge semantic metadata
        ↓
update SvgDocument JSON
        ↓
revision++
        ↓
snapshot
        ↓
serialize current.svg
```

也就是说，**必须形成单向状态归一化**。

这一点我建议你立即确认。

---

# 我认为现在最需要补的模块：SVG Parser

你已有：

```text
SvgDocument → SVG XML
```

还应该有：

```text
SVG XML → SvgDocument
```

建议新增：

```text
packages/academic-figure-core/
└── src/
    └── parser/
        ├── svg-parser.ts
        ├── attribute-normalizer.ts
        └── metadata-parser.ts
```

接口：

```ts
export interface ParseSvgOptions {
  preserveUnknownAttributes?: boolean;
  preserveUnknownElements?: boolean;
}

export function parseSvgDocument(
  svg: string,
  options?: ParseSvgOptions,
): SvgDocument;
```

支持：

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
use
defs
symbol
marker
linearGradient
radialGradient
clipPath
```

我建议不要只支持你最初的 10 种图元。

因为真实 SVG-Edit 很快会引入：

```text
defs
style
clipPath
marker
gradient
transform
```

如果 parser 不支持，人工编辑后很容易丢数据。

---

# 第二个我建议立即检查的问题：`@modelcontextprotocol/sdk v1`

你的实现总结里写的是：

```text
@modelcontextprotocol/sdk v1
```

这没问题，但你之前的 PRD 里有一版用了：

```text
@modelcontextprotocol/server
```

所以建议确保最终代码实际统一使用一种 SDK，不要目录里残留两套导入路径。

比如统一：

```ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
```

同时检查：

```text
package-lock.json
pnpm-lock.yaml
npm workspace
```

不要存在版本漂移。

---

# 第三个问题：MCP Tool 返回值不能只给字符串

例如：

```json
{
  "documentId": "doc_123",
  "revision": 42,
  "createdElementIds": [
    "building-left",
    "window-001"
  ]
}
```

Agent 很依赖稳定结构。

所以所有 write tool 最好统一返回：

```ts
interface WriteResult {
  success: true;
  documentId: string;
  revision: number;
  affectedElementIds: string[];
}
```

错误统一：

```ts
interface ToolError {
  success: false;
  code: string;
  message: string;
  details?: unknown;
}
```

例如：

```json
{
  "success": true,
  "documentId": "doc_001",
  "revision": 18,
  "affectedElementIds": [
    "building-left",
    "window-grid-left"
  ]
}
```

不要让每个工具自己定义一套返回格式。

---

# 第四个问题：预览必须能让模型真正“看见”

目前：

```text
render_preview
→ previewPath
```

这对 Claude Code / Codex 这种能访问本地文件的 Agent 有可能够用，但并不一定所有 MCP Client 都能自动读取本地 PNG。

后面建议加一个 MCP Resource：

```text
svg-preview://documents/{documentId}
```

或者：

```text
file://...
```

更理想的是 MCP tool 返回：

```json
{
  "documentId": "doc_001",
  "revision": 18,
  "previewPath": ".../preview.png",
  "previewUri": "svg-preview://documents/doc_001",
  "width": 1448,
  "height": 1086
}
```

这样模型可以真正实现：

```text
绘制
→ 预览
→ 视觉检查
→ 修改
```

这才是我们最初想解决的问题。

---

# 第五个问题：高层 primitives 现在可以开始设计，但不要急着实现全部

我建议下一阶段只加 4 个：

```text
create_isometric_building
create_communication_link
create_numbered_callout
create_legend
```

因为你的 UAV-ISAC 图里，这四类最重复。

比如：

```ts
create_isometric_building({
  documentId,
  parentId: "buildings",

  id: "building_left_tall",

  x: 120,
  y: 180,

  width: 180,
  depth: 72,
  height: 280,

  floors: 10,

  perspective: {
    dx: 52,
    dy: -28
  },

  facade: {
    style: "academic-modern",
    wallFill: "#E7ECF1",
    sideFill: "#D8DEE5",
    windowFill: "#AFCBE0",
    windowRows: 9,
    windowColumns: 5
  },

  rooftop: {
    enabled: true,
    hvacUnits: 2
  },

  metadata: {
    role: "building",
    importance: "background"
  }
})
```

它内部自动生成：

```text
building_left_tall
├── roof
├── front_facade
├── side_facade
├── window_grid_front
│   ├── window_001
│   ├── window_002
│   └── ...
├── rooftop_equipment
└── entrance_canopy
```

这样才是真正适合 Agent 的 API。

---

# 我对当前项目状态的评价

按你这份 summary 来看，现在大约是：

```text
协议层        ██████████ 100%
文档模型      ██████████ 100%
基础 CRUD     ██████████ 100%
批量操作      ██████████ 100%
持久化        ██████████ 100%
预览          ██████████ 100%
SVG-Edit 接入 ████████░░  80%
视觉闭环      █████░░░░░  50%
高级图元      ░░░░░░░░░░   0%
```

现在真正的分水岭不是“再加几个工具”，而是验证：

> **AI 能否通过 MCP 连续画图、看 preview、发现视觉问题、修改元素，再导出最终 SVG。**

只要这条链跑通，这个项目就已经不是普通 MCP demo，而是真正具备实际价值的 **AI-native vector editing system**。

我建议你下一步直接用这个 MCP Server 让我画一张简单但完整的 UAV-ISAC 学术图。这样很快就能暴露目前工具粒度、返回结构、预览闭环和 SVG-Edit 同步中的真实问题。
