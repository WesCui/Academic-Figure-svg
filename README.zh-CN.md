<img src="https://svg-edit.github.io/svgedit/src/editor/images/logo.svg" width="50" height="50" />

<p align="center">
  <a href="./README.zh-CN.md">中文</a> |
  <a href="./README.md">English</a>
</p>

# SVGEdit + 学术绘图 MCP

[![npm](https://img.shields.io/npm/v/svgedit.svg)](https://www.npmjs.com/package/svgedit)
[![Actions Status](https://github.com/SVG-Edit/svgedit/workflows/Node%20CI/badge.svg)](https://github.com/SVG-Edit/svgedit/actions)
[![Tests](https://img.shields.io/badge/tests-64%20passed-brightgreen)]()
[![Node](https://img.shields.io/badge/node-%3E%3D20-brightgreen)]()

**SVGEdit** 是一款快速、基于 Web、由 JavaScript 驱动的 SVG 绘图编辑器，可在任何现代浏览器中运行。

**学术绘图 MCP（Academic Figure MCP）** 在 SVGEdit 的基础上扩展了结构化的 SVG 文档模型、一个用于 AI 辅助绘图的 MCP（模型上下文协议）服务器，以及由 resvg 驱动的确定性 PNG 预览——使得 Claude 等 LLM 能够以编程方式创建、编辑并精化学术 SVG 图形。

---

## 目录

- [用 Claude Code 使用（核心用法）](#用-claude-code-使用核心用法)
- [架构](#架构)
- [项目结构](#项目结构)
- [快速开始](#快速开始)
- [MCP 服务器](#mcp-服务器)
  - [MCP 工具参考](#mcp-工具参考)
  - [配置](#配置)
  - [Claude Code 集成](#claude-code-集成)
- [HTTP 桥接与 SVG-Edit 集成](#http-桥接与-svg-edit-集成)
- [工作区布局](#工作区布局)
- [开发](#开发)
  - [构建](#构建)
  - [测试](#测试)
  - [包概览](#包概览)
- [MCP 工具速查](#mcp-工具速查)
- [支持的 SVG 元素](#支持的-svg-元素)
- [原始 SVGEdit 文档](#原始-svgedit-文档)

---

## 用 Claude Code 使用（核心用法）

> **本项目存在的意义，就是让大模型通过 MCP 帮你画学术图。** 注册一次服务器，之后只需用自然语言
> 让 Claude Code 去画图即可。你给 Claude Code 配置的模型、斜杠命令、技能，都会叠加在绘图工具之上。

### 1. 注册 —— 一条命令

```bash
npm run register          # → 运行 scripts/register-mcp.mjs
```

脚本会自动解析仓库路径、**在 `dist/` 缺失时自动构建**、以 **user 作用域**注册（无需在界面里点批准），
并打印 `✔ Connected`。

**或者，clone 之后直接交给 Claude Code 帮你注册** —— 对它说一句：

> *"运行本仓库里的 `scripts/register-mcp.mjs`，帮我注册 academic-figure 这个 MCP server，并验证连接。"*

### 2. 在 Claude Code 中如何调用

约 20 个工具会自动以 `mcp__academic-figure__<tool>` 形式暴露（例如 `mcp__academic-figure__create_document`）。
直接用自然语言下达指令：

> *"画一张学术图：两栋等距建筑、三架相互通信的 UAV、一个图例和编号标注。然后导出 SVG 并渲染 PNG。"*

非交互 / 脚本化调用：

```bash
claude -p "画一张带 3 个方块、用箭头相连的标注框图，然后导出 SVG 和 PNG。" \
  --allowedTools "mcp__academic-figure__*"
```

> 完整参考（环境变量、项目级 `.mcp.json`、`claude mcp add` 的参数坑）见下方 [Claude Code 集成](#claude-code-集成)。

---

## 架构

```
                       ┌─────────────────────────────┐
                       │  Claude / Codex / Cursor     │
                       └──────────────┬──────────────┘
                                      │ MCP (stdio)
                                      ▼
┌────────────────────────────────────────────────────────────┐
│                  academic-figure-mcp                        │
│                                                            │
│  create_document    create_element    update_element        │
│  batch_create       delete_element    get_document_tree     │
│  render_preview     export_svg        query_elements       │
│  create_repeated    transform_elements                     │
└──────────────────────────────┬─────────────────────────────┘
                               │
                               ▼
┌────────────────────────────────────────────────────────────┐
│                academic-figure-core                         │
│                                                            │
│  SvgDocument / SvgNode    树工具 (findNode, …)              │
│  SVG 序列化器              SVG 解析器 (XML → SvgDocument)    │
│  元数据模型                树视图渲染器                      │
└───────────────┬──────────────────────────────┬─────────────┘
                │                              │
                ▼                              ▼
┌────────────────────────────┐  ┌───────────────────────────┐
│      SVG-Edit (浏览器)      │  │      resvg (Node.js)      │
│                            │  │                           │
│  可视化编辑器              │  │  SVG → PNG 预览           │
│  拖拽 / 缩放 / 节点编辑     │  │  确定性渲染               │
│  人工精修                  │  │  无头 / 适合 CI            │
│  ext-academic-mcp 桥接     │  │                           │
└────────────────────────────┘  └───────────────────────────┘
```

**核心设计原则：** JSON 文件 `document.json` 是**唯一的事实来源（single source of truth）**。SVG-Edit 只是一个可视化前端。MCP 工具操作的是结构化的文档树——无需浏览器 DOM。

---

## 项目结构

```
svgedit/
│
├── packages/
│   ├── svgcanvas/                       # 原始的 @svgedit/svgcanvas（浏览器 SVG 引擎）
│   ├── react-test/                      # 原始的 React 扩展示例
│   │
│   ├── academic-figure-core/            # 新增 — 结构化 SVG 文档核心
│   │   ├── src/
│   │   │   ├── document/
│   │   │   │   ├── types.ts             #   SvgDocument, SvgNode, SvgMetadata, CreateElementInput, …
│   │   │   │   ├── node-utils.ts        #   findNode, ensureNode, findNodes, removeNode, moveNode, …
│   │   │   │   └── tree-view.ts         #   renderTree() → 可读的文档树
│   │   │   ├── serializer/
│   │   │   │   └── svg-serializer.ts    #   SvgDocument → SVG XML 字符串
│   │   │   ├── parser/
│   │   │   │   └── svg-parser.ts        #   SVG XML 字符串 → SvgDocument（往返转换）
│   │   │   └── index.ts
│   │   ├── tests/                       # 37 个单元测试
│   │   └── package.json
│   │
│   └── academic-figure-mcp/             # 新增 — MCP 服务器与 HTTP 桥接
│       ├── src/
│       │   ├── index.ts                 #   入口（stdio + 可选 HTTP 桥接）
│       │   ├── server.ts                #   MCP 服务器：注册了 20+ 个工具
│       │   ├── store/
│       │   │   ├── document-store.ts    #   基于文件的持久化（JSON 状态）
│       │   │   └── snapshot-store.ts    #   用于回滚的版本快照
│       │   ├── services/
│       │   │   ├── document-service.ts  #   业务逻辑：CRUD、批量、版本锁
│       │   │   ├── render-service.ts    #   resvg → PNG 预览
│       │   │   └── export-service.ts    #   SVG 文件导出
│       │   ├── http/
│       │   │   └── bridge-server.ts     #   用于 SVG-Edit ↔ MCP 同步的 REST API
│       │   └── utils/
│       │       ├── errors.ts            #   结构化错误类型（REVISION_CONFLICT, …）
│       │       ├── ids.ts               #   ID 生成
│       │       └── paths.ts             #   工作区路径解析
│       ├── tests/                       # 27 个单元测试
│       └── package.json
│
├── src/
│   └── editor/
│       ├── extensions/
│       │   └── ext-academic-mcp/        # 新增 — SVG-Edit → MCP 桥接扩展
│       │       ├── ext-academic-mcp.js  #   工具栏中的 打开/保存/重新加载 按钮
│       │       └── locale/en.js
│       ├── Editor.js                    # 主编辑器 UI
│       ├── EditorStartup.js             # 引导启动与扩展加载器
│       └── ConfigObj.js                 # 扩展注册（新增了 ext-academic-mcp）
│
├── workspace/                           # 新增 — 文档存储（事实来源）
│   ├── documents/
│   │   └── <documentId>/
│   │       ├── document.json            #   完整的 SvgDocument 状态
│   │       ├── current.svg              #   导出的 SVG（供 SVG-Edit 使用）
│   │       ├── preview.png              #   渲染的 PNG（通过 resvg）
│   │       └── snapshots/               #   版本快照
│   └── exports/                         #   手动导出的 SVG
│
├── package.json                         # 根工作区配置（4 个工作区）
└── README.md
```

---

## 快速开始

### 环境要求

- **Node.js ≥ 20**
- npm（随 Node.js 一同提供）

### 安装

```bash
git clone https://github.com/SVG-Edit/svgedit.git
cd svgedit
npm install
```

### 构建

```bash
# 构建原始的 SVG-Edit + SVG Canvas
npm run build

# 构建两个学术绘图包
cd packages/academic-figure-core && npm run build
cd ../academic-figure-mcp && npm run build
```

### 运行

```bash
# 启动 SVG-Edit（浏览器编辑器），地址 http://localhost:8000
npm run start

# 启动 MCP 服务器（stdio 传输 — 用于 Claude Code / MCP 客户端）
node packages/academic-figure-mcp/dist/index.js

# 启动带 HTTP 桥接的 MCP 服务器（用于 SVG-Edit 集成）
SVG_MCP_HTTP_PORT=4321 node packages/academic-figure-mcp/dist/index.js
```

### 测试

```bash
# 核心包测试（37 个测试）
cd packages/academic-figure-core && npm test

# MCP 包测试（27 个测试）
cd packages/academic-figure-mcp && npm test
```

---

## MCP 服务器

MCP 服务器（`@academic-figure/mcp`）是一个基于 Node.js 的 stdio 服务器，实现了 [模型上下文协议](https://modelcontextprotocol.io)。它暴露了 20+ 个工具，供 LLM 用于创建和操作结构化的 SVG 文档。

### MCP 工具参考

| # | 工具 | 类别 | 说明 |
|---|------|----------|-------------|
| 1 | `create_document` | 文档 | 创建一个带尺寸和可选背景的新 SVG 文档 |
| 2 | `load_document` | 文档 | 按 ID 加载一个已有文档 |
| 3 | `get_document_info` | 文档 | 获取文档的概要元数据 |
| 4 | `create_element` | 元素 | 创建单个 SVG 元素（`rect`、`circle`、`text`、`g`，…） |
| 5 | `batch_create_elements` | 元素 | 在一次原子事务中创建 1–500 个元素 |
| 6 | `create_repeated_elements` | 元素 | 创建一组重复元素（窗户、天线，…） |
| 7 | `update_element` | 元素 | 更新属性/文本/名称；传入 `null` 表示删除某个属性 |
| 8 | `transform_elements` | 元素 | 对一个或多个元素应用 平移/缩放/旋转 |
| 9 | `delete_elements` | 元素 | 按 ID 删除一个或多个元素 |
| 10 | `get_document_tree` | 查询 | 获取文档结构的轻量级树视图 |
| 11 | `query_elements` | 查询 | 按类型、角色、重要程度或标签查找元素 |
| 12 | `render_preview` | 预览 | 通过 resvg 将文档渲染为 PNG（无需浏览器） |
| 13 | `export_svg` | 导出 | 序列化并导出为独立的 `.svg` 文件 |

#### 统一的写入结果

所有写入类工具都返回相同结构：

```json
{
  "success": true,
  "documentId": "doc_abc123",
  "revision": 42,
  "affectedElementIds": ["building-left", "window-grid"],
  "extra": { "count": 40, "grid": "8×5" }
}
```

#### 统一的错误格式

所有错误都返回：

```json
{
  "success": false,
  "code": "REVISION_CONFLICT",
  "message": "Document revision mismatch: expected 10, current 11",
  "expectedRevision": 10,
  "currentRevision": 11
}
```

| 错误码 | 含义 |
|------------|---------|
| `REVISION_CONFLICT` | 乐观锁失败 —— 文档已被另一个代理修改 |
| `DOCUMENT_NOT_FOUND` | 请求的文档 ID 不存在 |
| `ELEMENT_NOT_FOUND` | 请求的文档中不存在该元素 ID |
| `INVALID_ELEMENT` | 输入校验失败（例如父 ID 无效、删除根节点） |
| `INTERNAL_ERROR` | 未预期的服务端错误 |

### 配置

| 环境变量 | 默认值 | 说明 |
|---------------------|---------|-------------|
| `SVG_MCP_WORKSPACE` | `./workspace` | 文档存储的根目录 |
| `SVG_MCP_HTTP_PORT` | `4321` | HTTP 桥接端口；设为 `0` 可禁用 |

### Claude Code 集成（完整参考）

> 若已通过上方 [用 Claude Code 使用（核心用法）](#用-claude-code-使用核心用法) 注册过，可直接跳到下方
> [在 Claude Code 中如何调用](#在-claude-code-中如何调用)。本节为完整参考（环境变量、项目级 `.mcp.json`、参数坑）。

本服务器是一个标准的 MCP stdio 服务器，因此 Claude Code（或 Cursor / Codex）可以用你在其中配置的任何模型与技能来驱动绘图。

#### 方式 A — 通过 CLI 注册（推荐）

```bash
# user 作用域：本机上的每一个 Claude Code 项目都可用
claude mcp add --scope user academic-figure \
  node "/absolute/path/to/packages/academic-figure-mcp/dist/index.js" \
  -e "SVG_MCP_WORKSPACE=/absolute/path/to/workspace" \
  -e "SVG_MCP_HTTP_PORT=0"
```

> ⚠️ 注意：`node` 命令必须**紧跟服务器名称之后**、放在所有 `-e` 参数之前。否则 `claude mcp add` 会报错 `missing required argument 'commandOrUrl'`。

验证注册与健康检查：

```bash
claude mcp get academic-figure   # → Status: ✔ Connected
```

#### 方式 B — 项目级 `.mcp.json`

在项目根目录放置一份 `.mcp.json`（仓库中已有一份现成的 `clients/mcp-client/.mcp.json`，复制到仓库根即可）：

```json
{
  "mcpServers": {
    "academic-figure": {
      "command": "node",
      "args": ["packages/academic-figure-mcp/dist/index.js"],
      "env": {
        "SVG_MCP_WORKSPACE": "./workspace",
        "SVG_MCP_HTTP_PORT": "4321"
      }
    }
  }
}
```

项目级服务器在 Claude Code 中会显示为"待批准（Pending approval）"，需在界面中点击批准后方可连接。

#### 在 Claude Code 中如何调用

注册成功后，约 20 个工具会自动以 `mcp__academic-figure__<tool>` 的形式暴露（例如 `mcp__academic-figure__create_document`）。直接用自然语言下达指令即可：

> "画一张学术图：两栋等距建筑、三架相互通信的 UAV、一个图例和编号标注。然后导出 SVG 并渲染 PNG。"

你配置的模型、自定义斜杠命令与技能都会叠加在绘图能力之上。若需非交互 / 脚本化调用：

```bash
claude -p "画一张带 3 个方块、用箭头相连的标注框图，然后导出 SVG 和 PNG。" \
  --allowedTools "mcp__academic-figure__*"
```

---

## HTTP 桥接与 SVG-Edit 集成

一个轻量级的 HTTP 服务器（默认端口 `4321`）在 SVG-Edit 与 MCP 文档存储之间架起桥梁。

### API 端点

| 方法 | 路径 | 说明 |
|--------|------|-------------|
| `GET` | `/api/documents/:id/svg` | 获取当前 SVG（供 SVG-Edit 加载） |
| `PUT` | `/api/documents/:id/svg` | 保存编辑后的 SVG（解析 → 合并元数据 → 重新导出） |
| `GET` | `/api/documents/:id/status` | 文档元数据（版本、名称、时间戳） |
| `POST` | `/api/documents/:id/render` | 触发预览重新渲染 |
| `GET` | `/health` | 健康检查 |

### SVG-Edit 扩展

内置扩展（`ext-academic-mcp`）会在 SVG-Edit 工具栏中添加 **打开 / 保存 / 重新加载** 按钮。

**编辑工作流：**

```
MCP 创建文档 (AI)      →  workspace/documents/<id>/document.json
                          workspace/documents/<id>/current.svg

SVG-Edit: 打开 (人)    ←  GET /api/documents/<id>/svg
SVG-Edit: 编辑 (人)    →  拖拽、缩放、微调元素
SVG-Edit: 保存 (人)    →  PUT /api/documents/<id>/svg
                          ↓
                      SVG 解析器：SVG XML → SvgDocument
                          ↓
                      元数据合并：保留 data-role、data-importance，…
                          ↓
                      保存 document.json，重新导出 current.svg
                          ↓
                      重新渲染 preview.png

MCP: 继续编辑 (AI)     →  版本号递增，状态同步
```

该扩展会自动加载 —— `ext-academic-mcp` 已在 `ConfigObj.js` 的默认扩展列表中注册。

---

## 工作区布局

```
workspace/
├── documents/
│   └── <documentId>/
│       ├── document.json      # 完整的 SvgDocument 状态（事实来源）
│       ├── current.svg        # 规范的 SVG 导出
│       ├── preview.png        # 渲染的 PNG 预览
│       └── snapshots/         # 版本快照
│           ├── 000001.json
│           ├── 000002.json
│           └── …
└── exports/                   # 手动导出的 SVG
```

- **`document.json`** —— 完整的结构化状态，包含元数据、语义信息和版本历史
- **`current.svg`** —— 每次写入时重新生成；始终与 `document.json` 保持同步
- **`preview.png`** —— 尽力而为的渲染预览；按需重新生成
- **`snapshots/`** —— 按版本号索引的时间点副本

---

## 开发

### 构建

```bash
# 构建核心（MCP 之前必须构建）
cd packages/academic-figure-core && npm run build

# 构建 MCP 服务器
cd packages/academic-figure-mcp && npm run build

# 监视模式（TypeScript）
cd packages/academic-figure-mcp && npx tsc --watch

# 完整项目构建（SVG-Edit + 扩展）
npm run build
```

### 测试

```bash
# 所有核心测试（37 个测试 — 节点工具、序列化器、解析器、往返转换）
cd packages/academic-figure-core && npm test

# 所有 MCP 测试（27 个测试 — 存储生命周期、CRUD、批量原子性、版本冲突）
cd packages/academic-figure-mcp && npm test

# 运行全部
cd packages/academic-figure-core && npm test
cd ../academic-figure-mcp && npm test
```

**按领域的测试覆盖情况：**

| 领域 | 测试数 | 文件 |
|------|-------|-------|
| 节点工具（findNode, ensureNode, removeNode, moveNode, …） | 14 | `core/tests/node-utils.test.ts` |
| SVG 序列化器（输出、转义、元数据属性） | 5 | `core/tests/serializer.test.ts` |
| SVG 解析器（层级、元数据、文本、属性、数值转换） | 9 | `core/tests/serializer.test.ts` |
| 往返转换（序列化 → 解析 → 校验结构/ID/元数据） | 2 | `core/tests/serializer.test.ts` |
| 文档存储（创建、加载、持久化、更新、删除） | 6 | `mcp/tests/document-store.test.ts` |
| 文档生命周期（创建 → 编辑 → 持久化 → 重新加载 → 编辑） | 3 | `mcp/tests/document-service.test.ts` |
| 批量原子性（有效、无效父节点、预检校验） | 3 | `mcp/tests/document-service.test.ts` |
| 版本冲突（匹配、不匹配、错误格式、无锁） | 4 | `mcp/tests/document-service.test.ts` |
| WriteResult 格式（创建、更新、删除、变换） | 4 | `mcp/tests/document-service.test.ts` |
| 错误格式（DOCUMENT_NOT_FOUND, ELEMENT_NOT_FOUND, INTERNAL_ERROR） | 3 | `mcp/tests/document-service.test.ts` |
| 重复元素（网格创建、命名、定位） | 1 | `mcp/tests/document-service.test.ts` |
| 查询元素（按类型、按角色） | 2 | `mcp/tests/document-service.test.ts` |

### 包概览

| 包 | 类型 | 运行时 | 说明 |
|---------|------|---------|-------------|
| `@svgedit/svgcanvas` | 库 | 浏览器 | SVG 编辑引擎（原始） |
| `@academic-figure/core` | 库 | Node.js | 结构化 SVG 文档模型、序列化器、解析器 —— 零 DOM 依赖 |
| `@academic-figure/mcp` | 服务器 | Node.js | 用于 AI 辅助绘图的 MCP stdio 服务器 + HTTP 桥接 |
| `ext-academic-mcp` | 扩展 | 浏览器 | 通过 HTTP 桥接实现 打开/保存/重新加载 的 SVG-Edit UI 扩展 |

---

## MCP 工具速查

### 创建一个图形（典型的代理工作流）

```
1. create_document({ name: "UAV-ISAC Figure", width: 1200, height: 800 })

2. create_element({ documentId, type: "g", id: "environment", attributes: {} })
3. create_element({ documentId, type: "g", id: "entities", attributes: {} })
4. create_element({ documentId, type: "g", id: "legend", attributes: {} })

5. batch_create_elements({
     documentId,
     elements: [
       { parentId: "environment", type: "rect", id: "ground", attributes: {…} },
       { parentId: "environment", type: "rect", id: "road", attributes: {…} },
     ]
   })

6. create_repeated_elements({
     documentId, parentId: "building_left",
     template: { type: "rect", attributes: { width: 14, height: 18, fill: "#B8D4E8" } },
     layout: { rows: 8, columns: 5, startX: 50, startY: 80, stepX: 24, stepY: 32 }
   })

7. get_document_tree({ documentId })       # 校验结构
8. render_preview({ documentId })          # 查看图形
9. update_element({ documentId, elementId, attributes: { fill: "blue" } })
10. render_preview({ documentId })          # 校验修改
11. export_svg({ documentId })             # 最终导出
```

### 元素类型

`g`, `rect`, `circle`, `ellipse`, `line`, `polyline`, `polygon`, `path`, `text`, `image`, `use`

### 元数据

每个元素都可以通过 `data-*` 属性携带语义元数据：

| 属性 | 取值 | 示例 |
|-----------|--------|---------|
| `data-role` | `environment`, `building`, `road`, `vegetation`, `entity`, `communication-link`, `annotation`, `legend` | `data-role="building"` |
| `data-importance` | `background`, `secondary`, `primary` | `data-importance="primary"` |
| `data-name` | 自由文本 | `data-name="Left Building"` |
| `data-semantic-name` | 自由文本 | `data-semantic-name="UAV"` |
| `data-category` | 自由文本 | `data-category="urban"` |

元数据会在 MCP 与 SVG-Edit 之间的往返过程中被保留 —— SVG 解析器在每次保存时都会将已有元数据与解析得到的 SVG 进行合并。

---

## 支持的 SVG 元素

### 创建与编辑（通过 MCP 工具）

`svg`, `g`, `rect`, `circle`, `ellipse`, `line`, `polyline`, `polygon`, `path`, `text`, `image`, `use`

### 透传（由解析器保留以用于 SVG-Edit 往返）

`defs`, `symbol`, `marker`, `linearGradient`, `radialGradient`, `clipPath`, `style`, `tspan`, `title`, `desc`

---

## 原始 SVGEdit 文档

### 贡献

SVGEdit 是最受欢迎的开源 SVG 编辑器。它由一支出色的开发者团队在 15 多年前发起。遗憾的是，该产品曾长时间无人维护。我们决定通过焕新诸多方面，让这个工具重获新生。

如果你希望贡献，请通过创建 issue 或 discussion 告诉我们。

### 我想使用 SVGEdit

感谢 **Netlify**，你可以通过喜欢的浏览器访问以下构建版本：

- [试用 SVGEdit V7（github 上的 master 分支）](https://svgedit.netlify.app/index.html)
- [试用 SVGEdit V7（npm 上最新发布的版本）](https://unpkg.com/svgedit@latest/dist/editor/index.html)

### V7 之前的版本

我们推荐使用 V7 版本，但对于较旧的浏览器或某些已被废弃的功能，你可能需要访问更老版本的 SVGEdit。

- [在此试用 SVGEdit 6.1.0](https://60a0000fc9900b0008fd268d--svgedit.netlify.app/editor/index.html)
- [在此试用 SVGEdit 5.1.0](https://unpkg.com/svgedit@5.1.0/editor/svg-editor.html)

额外提示：你可以尝试使用 `unpkg` 上发布的某个版本，例如版本 3.2.0：

- [https://unpkg.com/svgedit@3.2.0/editor/svg-editor.html](https://unpkg.com/svgedit@3.2.0/editor/svg-editor.html)

### 我想在本地环境中托管 SVGEdit

如果你想托管一个本地版本的 SVGEdit，请按照以下说明操作：

1. 从 github 克隆或复制仓库内容
1. 运行 `npm i` 安装依赖
1. 运行 `npm run build --workspace @svgedit/svgcanvas` 在本地构建 svgcanvas 依赖
1. 你可以运行 `npm run start` 启动一个本地服务器用于测试
1. 并使用受支持的浏览器访问 `http://localhost:8000/src/editor/index.html`
1. 运行 `npm run build` 构建一个可供你自己的 Web 服务器托管的包

### 我想为 SVGEdit 做贡献

**谢谢！**

SVGEdit 由两个主要组件构成：

1. 负责底层 SVG 编辑器的 "svgcanvas"。它可以用来构建你自己的编辑器
1. 负责编辑器 UI（菜单、按钮等）的 "editor"

你应该在自己的 github 环境中 fork SVGEdit，并按照上文所述在本地安装 SVGEdit。

在提交 PR 之前，请确保在本地运行过：

1. `npm run lint` 以检查你是否遵循了 standardjs 的规范（https://standardjs.com/rules）
1. `npm run test` 以运行 Vitest 测试套件（单元/区域设置检查）

如果你打算定期贡献，请告知我们，以便我们将你加入维护者团队。

### 我想把 SVGEdit 集成到我自己的 Web 应用中

V7 大幅改变了集成和定制 SVGEdit 的方式。你可以查看 `index.html`，了解如何在 HTML 代码中插入一个 `div` 元素并将编辑器注入到该 `div` 中。

**警告：这个 `div` 可以位于 DOM 中的任何位置，但它必须具有数值型的宽度和高度（即不能是 'auto'，这种情况会在 `div` 被隐藏时发生）**

```html
<head>
   <!-- 你需要在应用的某处引入 SVGEdit 的 CSS -->
  <link href="./svgedit.css" rel="stylesheet" media="all"></link>
</head>

<body>
  <!-- svgedit 容器可以位于 DOM 中的任何位置
       但它必须具有宽度和高度 -->
  <div id="container" style="width:100%;height:100vh"></div>
</body>
<script type="module">
  /* 你需要调用 Editor 并将其加载到 <div> 中 */
  import Editor from './Editor.js'
  /* 可用选项见文件 `docs/tutorials/ConfigOptions.md` */
  const svgEditor = new Editor(document.getElementById('container'))
  /* 设置配置 */
  svgEditor.setConfig({
          allowInitialUserOverride: true,
          extensions: [],
          noDefaultExtensions: false,
          userExtensions: []
  })
  /* 初始化 Editor */
  svgEditor.init()
</script>
</html>
```

### 我想构建自己的 SVG 编辑器

你可以直接使用底层 canvas，并用你喜欢的框架在应用中使用它。
参见 demos 文件夹或 svg-edit-react 仓库中的示例。

安装 canvas：

`npm i -s '@svgedit/svgcanvas'`

然后你可以在应用中引入它：

`import svgCanvas from '@svgedit/svgcanvas'`

### 受支持的浏览器

开发与持续集成均在 **Chrome** 环境下进行。我们支持最新版本的 Chrome、FireFox 和 Safari（即我们会尽力修复这些浏览器的 bug）。

要支持旧版浏览器，你可能需要使用该软件包的旧版本。不过，如果你需要某个特定浏览器版本的支持，请提交 issue，以便项目团队决定是否应在 SVGEdit 的最新版本中提供支持。

### 基于 React 的示例扩展

曾使用一个示例 React 组件来构建 SVGEdit 扩展。

要激活它：

- 在扩展文件夹 "src/editor/react-extensions/react-test" 中运行 "npm run build"，以创建该扩展的打包文件。
- 修改 "index.html"，将该扩展作为 `userExtensions` 激活。

```javascript
svgEditor.setConfig({
          allowInitialUserOverride: true,
          extensions: [],
          noDefaultExtensions: false,
          userExtensions: ['./react-extensions/react-test/dist/react-test.js']
        })
```

### 延伸阅读与更多信息

- 参与 [讨论](https://github.com/SVG-Edit/svgedit/discussions)
- 作者信息见 [AUTHORS](AUTHORS) 文件。
- [StackOverflow](https://stackoverflow.com/tags/svg-edit) 小组。

### 托管

SVGEdit 的版本部署在：

[![Deploys by Netlify](https://www.netlify.com/img/global/badges/netlify-color-accent.svg)](https://www.netlify.com)

---

[⇈ 返回顶部](#svgedit--学术绘图-mcp)
