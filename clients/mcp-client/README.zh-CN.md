<img src="https://svg-edit.github.io/svgedit/src/editor/images/logo.svg" width="40" height="40" />

<p align="center">
  <a href="./README.zh-CN.md"><strong>中文</strong></a> |
  <a href="./README.md"><strong>English</strong></a>
</p>

# MCP 客户端 · 学术绘图

一个**独立子项目**，让 `academic-figure-mcp` 服务器更易上手：

- 一个可复用的 **MCP 客户端**（`src/client.mjs`），通过真实的 stdio MCP 传输协议与服务器通信——和 Claude Code / Cursor / Codex 用的是同一套协议。
- 一个**开箱即用的示例**（`npm run demo`），自动生成一张示例图并渲染为 PNG + SVG。
- 一份 **Claude Code 集成配置**（`.mcp.json`），让 Claude Code 能调用绘图工具，并复用你在其中配置的任何模型与技能。

> 本文件夹是围绕 `packages/academic-figure-mcp` 中已有 MCP 服务器的*客户端 / 启动器*，并不重新实现服务器。

---

## 目录结构

```
clients/mcp-client/
├── .mcp.json              # Claude Code 的 MCP 服务器注册配置
├── package.json           # npm 脚本：demo / server / server:http
├── README.md              # 本文件（英文）
├── README.zh-CN.md       # 中文版
├── src/
│   ├── client.mjs        # 可复用的 MCP 客户端辅助函数 (connectMcp)
│   ├── demo.mjs          # 开箱即用的示例图生成器
│   └── figures/uav-isac.mjs  # 示例场景构建器（可复制改写）
└── output/               # 生成的图形存放处（已被 git 忽略）
```

---

## 环境要求

- **Node.js ≥ 20**
- 需要先构建两个包（在仓库根目录执行一次）：

  ```bash
  cd ../../                # 仓库根目录
  npm install
  cd packages/academic-figure-core && npm run build
  cd ../academic-figure-mcp && npm run build
  ```

本子项目直接复用仓库根目录提升安装（hoisted）的 `node_modules`，无需在此单独 `npm install`。

---

## 快速开始（开箱即用）

在本文件夹下执行：

```bash
npm run demo
```

它会：

1. 以子进程方式启动 `academic-figure-mcp` 服务器（stdio）。
2. 创建一个 1000×700 的文档。
3. 构建一张示例"UAV-ISAC"场景图（两座等距建筑、3 架 UAV、通信链路、图例、编号标注）。
4. 渲染出 `output/figure.png`（通过 resvg）并导出 `output/figure.svg`。

---

## 单独运行服务器

如需单独运行 MCP 服务器（例如启用 4321 端口的 SVG-Edit HTTP 桥接）：

```bash
npm run server          # 仅 stdio
npm run server:http     # stdio + HTTP 桥接（SVG-Edit 集成）
```

---

## Claude Code 集成

> **最省事的方式：** 在**仓库根目录**运行 `npm run register` —— 它会执行
> `scripts/register-mcp.mjs`，在 `dist/` 缺失时自动构建、以 user 作用域注册，并验证连接。

本子项目自带一份 `.mcp.json`。Claude Code 会在打开本文件夹（或将该文件复制为项目根目录的 `.mcp.json`）时自动读取并注册 `academic-figure` 这个 MCP 服务器。

你也可以用 CLI 全局注册——以下就是实测可用的命令：

```bash
claude mcp add --scope user academic-figure \
  node "/absolute/path/to/packages/academic-figure-mcp/dist/index.js" \
  -e "SVG_MCP_WORKSPACE=/absolute/path/to/workspace" \
  -e "SVG_MCP_HTTP_PORT=0"
```

> ⚠️ `node` 命令必须**紧跟服务器名称之后**、放在所有 `-e` 参数之前——否则 `claude mcp add` 会报错 `missing required argument 'commandOrUrl'`。（从仓库根目录运行，使相对的 `../packages/...` 路径可解析；或直接使用绝对路径。）

随后在 Claude Code 中，直接让它画图即可，例如：

> "画一张学术论文图，展示两栋建筑和三架相互通信的 UAV，并加上图例和编号标注。"

**模型与技能：** 模型选择和任何技能都配置在 *Claude Code 自身*——本子项目只是暴露绘图工具。Claude Code 会像调用其他 MCP 工具一样调用它们（工具名形如 `mcp__academic-figure__create_document`），因此你配置的模型、自定义斜杠命令与技能，都会叠加在绘图能力之上。

若需非交互 / 脚本化调用：

```bash
claude -p "画一张带 3 个方块、用箭头相连的标注框图，然后导出 SVG 和 PNG。" \
  --allowedTools "mcp__academic-figure__*"
```

---

## 编写你自己的绘图脚本

引入客户端辅助函数，组合调用 MCP 工具即可：

```js
import { connectMcp } from "./src/client.mjs";

const { client, call, callText } = await connectMcp();
const { documentId } = await callText("create_document", {
  name: "My Figure", width: 800, height: 600, background: "#ffffff",
});
await call("create_element", {
  documentId, id: "box", type: "rect",
  attributes: { x: 100, y: 100, width: 200, height: 120, fill: "#cde" },
});
await call("render_preview", { documentId, width: 800 });
await client.close();
```

完整可复制的示例见 `src/figures/uav-isac.mjs`。

---

## 说明

- 服务器的**唯一事实来源**是 `workspace/documents/<id>/document.json`。每次 `render_preview` 还会写入 `preview.png`；`export_svg` 会写入 `current.svg`。
- 设置 `SVG_MCP_WORKSPACE` 可选择文档存储位置（本处默认 `./workspace`）。
- 设置 `SVG_MCP_HTTP_PORT` 为 `0` 可关闭 HTTP 桥接，或设为某端口（如 `4321`）以启用 SVG-Edit 集成。
