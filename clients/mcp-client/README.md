<img src="https://svg-edit.github.io/svgedit/src/editor/images/logo.svg" width="40" height="40" />

<p align="center">
  <a href="./README.md"><strong>English</strong></a> |
  <a href="./README.zh-CN.md"><strong>中文</strong></a>
</p>

# MCP Client · Academic Figure

A **standalone sub-project** that makes the `academic-figure-mcp` server easy to use:

- A reusable **MCP client** (`src/client.mjs`) that talks to the server over the real stdio MCP transport — the same protocol Claude Code / Cursor / Codex use.
- An **out-of-the-box demo** (`npm run demo`) that builds a sample figure and renders it to PNG + SVG.
- A **Claude Code integration** config (`.mcp.json`) so Claude Code can drive figure creation with whatever model and skills you configure there.

> This folder is a *client / launcher* around the existing MCP server in `packages/academic-figure-mcp`. It does not re-implement the server.

---

## Directory layout

```
clients/mcp-client/
├── .mcp.json              # Claude Code MCP server registration
├── package.json           # npm scripts: demo / server / server:http
├── README.md              # this file (English)
├── README.zh-CN.md       # 中文版
├── src/
│   ├── client.mjs        # reusable MCP client helper (connectMcp)
│   ├── demo.mjs          # out-of-the-box sample figure generator
│   └── figures/uav-isac.mjs  # sample scene builder (copy to make your own)
└── output/               # generated figures land here (git-ignored)
```

---

## Prerequisites

- **Node.js ≥ 20**
- The two packages must be built once (from the repo root):

  ```bash
  cd ../../                # repo root
  npm install
  cd packages/academic-figure-core && npm run build
  cd ../academic-figure-mcp && npm run build
  ```

The sub-project reuses the hoisted `node_modules` from the repo root — no separate `npm install` needed here.

---

## Quick start (out of the box)

From this folder:

```bash
npm run demo
```

This will:

1. Launch the `academic-figure-mcp` server as a child process (stdio).
2. Create a 1000×700 document.
3. Build a sample "UAV-ISAC" scenario (two isometric buildings, 3 UAVs, communication links, legend, numbered callouts).
4. Render `output/figure.png` (via resvg) and export `output/figure.svg`.

---

## Run the server standalone

To run the MCP server on its own (e.g. for the SVG-Edit HTTP bridge on port 4321):

```bash
npm run server          # stdio only
npm run server:http     # stdio + HTTP bridge (SVG-Edit integration)
```

---

## Claude Code integration

> **Easiest path:** from the **repo root** run `npm run register` — it runs
> `scripts/register-mcp.mjs`, which builds the server if needed, registers it in
> user scope, and verifies the connection.

This sub-project ships a ready `.mcp.json`. Claude Code reads it and registers the
`academic-figure` MCP server automatically when you open this folder (or copy the
file to your project root as `.mcp.json`).

You can also register it globally with the CLI — this is the exact command verified to work:

```bash
claude mcp add --scope user academic-figure \
  node "/absolute/path/to/packages/academic-figure-mcp/dist/index.js" \
  -e "SVG_MCP_WORKSPACE=/absolute/path/to/workspace" \
  -e "SVG_MCP_HTTP_PORT=0"
```

> ⚠️ The `node` command must come **right after the server name**, before any `-e`
> flags — otherwise `claude mcp add` errors with `missing required argument 'commandOrUrl'`.
> (Run it from the repo root so the relative `../packages/...` path resolves, or use an absolute path.)

Then, inside Claude Code, just ask it to draw a figure, e.g.:

> "Create an academic figure showing two buildings and three UAVs communicating, with a legend and numbered callouts."

**Models & skills:** the model selection and any skills are configured *in Claude Code itself* — this sub-project only exposes the drawing tools. Claude Code calls them like any other MCP tool (names like `mcp__academic-figure__create_document`), so your configured model, custom slash-commands, and skills all apply on top of figure generation.

For non-interactive / scripted use:

```bash
claude -p "Draw a labeled block diagram with 3 blocks connected by arrows, then export SVG and PNG." \
  --allowedTools "mcp__academic-figure__*"
```

---

## Write your own figure script

Import the client helper and compose the MCP tools:

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

See `src/figures/uav-isac.mjs` for a complete, copy-pasteable example.

---

## Notes

- The server's **single source of truth** is `workspace/documents/<id>/document.json`. Each `render_preview` also writes `preview.png`; `export_svg` writes `current.svg`.
- Set `SVG_MCP_WORKSPACE` to choose where documents are stored (defaults to `./workspace` here).
- Set `SVG_MCP_HTTP_PORT` to `0` to disable the HTTP bridge, or a port (e.g. `4321`) to enable SVG-Edit integration.
