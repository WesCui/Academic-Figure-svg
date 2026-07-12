<img src="https://svg-edit.github.io/svgedit/src/editor/images/logo.svg" width="50" height="50" />

<p align="center">
  <a href="./README.md"><strong>English</strong></a> |
  <a href="./README.zh-CN.md"><strong>中文</strong></a>
</p>

# Academic Figure SVG MCP

*An AI-native structured SVG editing system for creating, previewing, refining, and manually editing publication-quality academic figures. Built on SVG-Edit, MCP, and resvg.*

[![npm](https://img.shields.io/npm/v/svgedit.svg)](https://www.npmjs.com/package/svgedit)
[![Tests](https://img.shields.io/badge/tests-77%20passed-brightgreen)]()
[![Node](https://img.shields.io/badge/node-%3E%3D20-brightgreen)]()
[![MCP Tools](https://img.shields.io/badge/MCP%20tools-20-blue)]()

---

## ⭐ Using with Claude Code (main use case)

> **This project exists so an LLM can draw academic figures for you via MCP.** Register the
> server once, then just *ask Claude Code in natural language* to create, render, and export a figure.
> Your configured model, slash-commands, and skills all apply on top of the drawing tools.

### 1. Register — one command

```bash
npm run register          # → runs scripts/register-mcp.mjs
```

The script auto-detects the repo paths, **builds the server if `dist/` is missing**,
registers it in **user scope** (no UI approval needed), and prints `✔ Connected`.

**Or let Claude Code register it for you** after cloning — just say:

> *"Run `scripts/register-mcp.mjs` in this repo to register the academic-figure MCP server, then verify it's connected."*

### 2. Call it from Claude Code

The ~20 tools appear automatically as `mcp__academic-figure__<tool>`
(e.g. `mcp__academic-figure__create_document`). Just ask:

> *"Draw an academic figure: two isometric buildings, three UAVs communicating, a legend and
> numbered callouts. Then export the SVG and render a PNG."*

Non-interactive / scripted use:

```bash
claude -p "Draw a labeled block diagram with 3 blocks connected by arrows, then export SVG and PNG." \
  --allowedTools "mcp__academic-figure__*"
```

> Full reference — env vars, project-scoped `.mcp.json`, and the `claude mcp add` gotcha —
> is in [Claude Code Integration](#claude-code-integration) below.

---

## The Visual Feedback Loop

```
AI Agent (Claude / Codex)
       │
       ▼
  MCP Tools (20 tools)
       │
       ▼
  Structured SVG Document ←──→ SVG-Edit Manual Editing
       │
       ▼
  resvg Preview (base64 PNG)
       │
       ▼
  Visual Feedback → Refinement
       │
       └── audit_figure (static checks)
```

**Key capabilities:**

- ✅ Editable SVG with full SVG-Edit round-trip
- ✅ Semantic element hierarchy (role, importance, tags)
- ✅ Atomic batch operations (up to 500 elements)
- ✅ AI visual feedback loop (render_preview returns base64 PNG)
- ✅ Academic theme system (IEEE, Academic)
- ✅ High-level primitives (buildings, links, callouts, legends)
- ✅ Figure audit tool (overlap, bounds, text-size, density)
- ✅ Layout helpers (align, distribute)
- ✅ Optimistic locking + revision snapshots

**Benchmark result:** A 103-node academic figure in **20 MCP tool calls** with **0 errors**, **0 revision conflicts**.

---

## Table of Contents

- [Using with Claude Code (main use case)](#using-with-claude-code-main-use-case)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Quick Start](#quick-start)
- [MCP Server](#mcp-server)
  - [MCP Tools Reference](#mcp-tools-reference)
  - [Configuration](#mcp-configuration)
  - [Claude Code Integration](#claude-code-integration)
- [HTTP Bridge & SVG-Edit Integration](#http-bridge--svg-edit-integration)
- [Workspace Layout](#workspace-layout)
- [Development](#development)
  - [Build](#build)
  - [Test](#test)
  - [Package Overview](#package-overview)
- [MCP Tools Quick Reference](#mcp-tools-quick-reference)
- [Supported SVG Elements](#supported-svg-elements)
- [Original SVGEdit Documentation](#original-svgedit-documentation)

---

## Architecture

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
│  SvgDocument / SvgNode    Tree Utilities (findNode, …)      │
│  SVG Serializer           SVG Parser (XML → SvgDocument)    │
│  Metadata Model           Tree View Renderer                │
└───────────────┬──────────────────────────────┬─────────────┘
                │                              │
                ▼                              ▼
┌────────────────────────────┐  ┌───────────────────────────┐
│      SVG-Edit (Browser)    │  │      resvg (Node.js)      │
│                            │  │                           │
│  Visual editor             │  │  SVG → PNG preview        │
│  Drag / resize / node edit │  │  Deterministic rendering  │
│  Manual refinement         │  │  Headless / CI-friendly   │
│  ext-academic-mcp bridge   │  │                           │
└────────────────────────────┘  └───────────────────────────┘
```

**Key design principle:** The JSON `document.json` is the **single source of truth**. SVG-Edit is a visual front-end. MCP tools operate on the structured document tree — no browser DOM required.

---

## Project Structure

```
svgedit/
│
├── packages/
│   ├── svgcanvas/                       # Original @svgedit/svgcanvas (browser SVG engine)
│   ├── react-test/                      # Original React extension sample
│   │
│   ├── academic-figure-core/            # NEW — Structured SVG Document Core
│   │   ├── src/
│   │   │   ├── document/
│   │   │   │   ├── types.ts             #   SvgDocument, SvgNode, SvgMetadata, CreateElementInput, …
│   │   │   │   ├── node-utils.ts        #   findNode, ensureNode, findNodes, removeNode, moveNode, …
│   │   │   │   └── tree-view.ts         #   renderTree() → human-readable document tree
│   │   │   ├── serializer/
│   │   │   │   └── svg-serializer.ts    #   SvgDocument → SVG XML string
│   │   │   ├── parser/
│   │   │   │   └── svg-parser.ts        #   SVG XML string → SvgDocument (round-trip)
│   │   │   └── index.ts
│   │   ├── tests/                       # 37 unit tests
│   │   └── package.json
│   │
│   └── academic-figure-mcp/             # NEW — MCP Server & HTTP Bridge
│       ├── src/
│       │   ├── index.ts                 #   Entry point (stdio + optional HTTP bridge)
│       │   ├── server.ts                #   MCP server: 20+ registered tools
│       │   ├── store/
│       │   │   ├── document-store.ts    #   File-based persistence (JSON state)
│       │   │   └── snapshot-store.ts    #   Revision snapshots for rollback
│       │   ├── services/
│       │   │   ├── document-service.ts  #   Business logic: CRUD, batch, revision locking
│       │   │   ├── render-service.ts    #   resvg → PNG preview
│       │   │   └── export-service.ts    #   SVG file export
│       │   ├── http/
│       │   │   └── bridge-server.ts     #   REST API for SVG-Edit ↔ MCP sync
│       │   └── utils/
│       │       ├── errors.ts            #   Structured error types (REVISION_CONFLICT, …)
│       │       ├── ids.ts               #   ID generation
│       │       └── paths.ts             #   Workspace path resolution
│       ├── tests/                       # 27 unit tests
│       └── package.json
│
├── src/
│   └── editor/
│       ├── extensions/
│       │   └── ext-academic-mcp/        # NEW — SVG-Edit → MCP bridge extension
│       │       ├── ext-academic-mcp.js  #   Open/Save/Reload buttons in toolbar
│       │       └── locale/en.js
│       ├── Editor.js                    # Main editor UI
│       ├── EditorStartup.js             # Bootstrap & extension loader
│       └── ConfigObj.js                 # Extension registration (added ext-academic-mcp)
│
├── workspace/                           # NEW — Document storage (source of truth)
│   ├── documents/
│   │   └── <documentId>/
│   │       ├── document.json            #   Full SvgDocument state
│   │       ├── current.svg              #   Exported SVG (for SVG-Edit)
│   │       ├── preview.png              #   Rendered PNG (via resvg)
│   │       └── snapshots/               #   Revision snapshots
│   └── exports/                         #   Manual SVG exports
│
├── package.json                         # Root workspace config (4 workspaces)
└── README.md
```

---

## Quick Start

### Prerequisites

- **Node.js ≥ 20**
- npm (ships with Node.js)

### Install

```bash
git clone https://github.com/SVG-Edit/svgedit.git
cd svgedit
npm install
```

### Build

```bash
# Build the original SVG-Edit + SVG Canvas
npm run build

# Build both Academic Figure packages
cd packages/academic-figure-core && npm run build
cd ../academic-figure-mcp && npm run build
```

### Run

```bash
# Start SVG-Edit (browser editor) at http://localhost:8000
npm run start

# Start the MCP server (stdio transport — for Claude Code / MCP clients)
node packages/academic-figure-mcp/dist/index.js

# Start MCP server WITH HTTP bridge (for SVG-Edit integration)
SVG_MCP_HTTP_PORT=4321 node packages/academic-figure-mcp/dist/index.js
```

### Test

```bash
# Core package tests (37 tests)
cd packages/academic-figure-core && npm test

# MCP package tests (27 tests)
cd packages/academic-figure-mcp && npm test
```

---

## MCP Server

The MCP server (`@academic-figure/mcp`) is a Node.js stdio server implementing the [Model Context Protocol](https://modelcontextprotocol.io/). It exposes 20+ tools that LLMs can use to create and manipulate structured SVG documents.

### MCP Tools Reference

| # | Tool | Category | Description |
|---|------|----------|-------------|
| 1 | `create_document` | Document | Create a new SVG document with dimensions and optional background |
| 2 | `load_document` | Document | Load an existing document by ID |
| 3 | `get_document_info` | Document | Get summary metadata about a document |
| 4 | `create_element` | Element | Create a single SVG element (`rect`, `circle`, `text`, `g`, …) |
| 5 | `batch_create_elements` | Element | Create 1–500 elements in one atomic transaction |
| 6 | `create_repeated_elements` | Element | Create a grid of repeated elements (windows, antennas, …) |
| 7 | `update_element` | Element | Update attributes/text/name; pass `null` to remove an attribute |
| 8 | `transform_elements` | Element | Apply translate/scale/rotate to one or more elements |
| 9 | `delete_elements` | Element | Delete one or more elements by ID |
| 10 | `get_document_tree` | Query | Get a lightweight tree view of the document structure |
| 11 | `query_elements` | Query | Find elements by type, role, importance, or tags |
| 12 | `render_preview` | Preview | Render the document to PNG via resvg (no browser) |
| 13 | `export_svg` | Export | Serialize and export to a standalone `.svg` file |

#### Unified Write Result

All write tools return the same shape:

```json
{
  "success": true,
  "documentId": "doc_abc123",
  "revision": 42,
  "affectedElementIds": ["building-left", "window-grid"],
  "extra": { "count": 40, "grid": "8×5" }
}
```

#### Unified Error Format

All errors return:

```json
{
  "success": false,
  "code": "REVISION_CONFLICT",
  "message": "Document revision mismatch: expected 10, current 11",
  "expectedRevision": 10,
  "currentRevision": 11
}
```

| Error Code | Meaning |
|------------|---------|
| `REVISION_CONFLICT` | Optimistic lock failure — document was modified by another agent |
| `DOCUMENT_NOT_FOUND` | The requested document ID does not exist |
| `ELEMENT_NOT_FOUND` | The requested element ID does not exist in the document |
| `INVALID_ELEMENT` | Input validation failed (e.g., bad parent ID, root deletion) |
| `INTERNAL_ERROR` | Unexpected server error |

### Configuration

| Environment Variable | Default | Description |
|---------------------|---------|-------------|
| `SVG_MCP_WORKSPACE` | `./workspace` | Root directory for document storage |
| `SVG_MCP_HTTP_PORT` | `4321` | HTTP bridge port; set to `0` to disable |

### Claude Code Integration (full reference)

> Already registered via [Using with Claude Code](#using-with-claude-code-main-use-case)
> above? You can skip to [Calling it from Claude Code](#calling-it-from-claude-code) below.
> This section is the complete reference (env vars, project-scoped `.mcp.json`, gotchas).

The server is a standard MCP stdio server, so Claude Code (or Cursor / Codex) can drive
figure creation with whatever model and skills you configure there.

#### Option A — register via CLI (recommended)

```bash
# User scope: available in every Claude Code project on this machine
claude mcp add --scope user academic-figure \
  node "/absolute/path/to/packages/academic-figure-mcp/dist/index.js" \
  -e "SVG_MCP_WORKSPACE=/absolute/path/to/workspace" \
  -e "SVG_MCP_HTTP_PORT=0"
```

> ⚠️ Gotcha: the `node` command must come **immediately after the server name**,
> before any `-e` flags. Otherwise `claude mcp add` fails with
> `missing required argument 'commandOrUrl'`.

Verify the registration and health check:

```bash
claude mcp get academic-figure   # → Status: ✔ Connected
```

#### Option B — project-scoped `.mcp.json`

Drop a `.mcp.json` at your project root (a ready one ships at
`clients/mcp-client/.mcp.json` — copy it to the repo root):

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

Project-scoped servers appear as *Pending approval* in Claude Code until you approve them in the UI.

#### Calling it from Claude Code

Once registered, the ~20 tools are exposed automatically as
`mcp__academic-figure__<tool>` (e.g. `mcp__academic-figure__create_document`).
Just ask in natural language:

> "Create an academic figure: two isometric buildings, three UAVs communicating, a legend, and numbered callouts. Then export the SVG and render a PNG."

Your configured model, custom slash-commands, and skills all apply on top of the drawing tools.
For non-interactive / scripted use:

```bash
claude -p "Draw a labeled block diagram with 3 blocks connected by arrows, then export SVG and PNG." \
  --allowedTools "mcp__academic-figure__*"
```

---

## HTTP Bridge & SVG-Edit Integration

A lightweight HTTP server (default port `4321`) bridges SVG-Edit and the MCP document store.

### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/documents/:id/svg` | Get the current SVG (for SVG-Edit to load) |
| `PUT` | `/api/documents/:id/svg` | Save edited SVG back (parses → merges metadata → re-exports) |
| `GET` | `/api/documents/:id/status` | Document metadata (revision, name, timestamp) |
| `POST` | `/api/documents/:id/render` | Trigger preview re-render |
| `GET` | `/health` | Health check |

### SVG-Edit Extension

A built-in extension (`ext-academic-mcp`) adds **Open / Save / Reload** buttons to the SVG-Edit toolbar.

**Edit workflow:**

```
MCP creates document (AI)    →  workspace/documents/<id>/document.json
                                  workspace/documents/<id>/current.svg

SVG-Edit: Open (human)       ←  GET /api/documents/<id>/svg
SVG-Edit: Edit (human)       →  drag, resize, tweak elements
SVG-Edit: Save (human)       →  PUT /api/documents/<id>/svg
                                  ↓
                              SVG Parser: SVG XML → SvgDocument
                                  ↓
                              Metadata merge: preserve data-role, data-importance, …
                                  ↓
                              Save document.json, re-export current.svg
                                  ↓
                              Re-render preview.png

MCP: Continue editing (AI)   →  revision incremented, state synchronized
```

The extension is loaded automatically — `ext-academic-mcp` is registered in the default extensions list in `ConfigObj.js`.

---

## Workspace Layout

```
workspace/
├── documents/
│   └── <documentId>/
│       ├── document.json      # Full SvgDocument state (source of truth)
│       ├── current.svg        # Canonical SVG export
│       ├── preview.png        # Rendered PNG preview
│       └── snapshots/         # Revision snapshots
│           ├── 000001.json
│           ├── 000002.json
│           └── …
└── exports/                   # Manual SVG exports
```

- **`document.json`** — Complete structured state including metadata, semantics, and revision history
- **`current.svg`** — Regenerated on every write; always in sync with `document.json`
- **`preview.png`** — Best-effort rendered preview; regen on demand
- **`snapshots/`** — Point-in-time copies keyed by revision number

---

## Development

### Build

```bash
# Build core (required before MCP)
cd packages/academic-figure-core && npm run build

# Build MCP server
cd packages/academic-figure-mcp && npm run build

# Watch mode (TypeScript)
cd packages/academic-figure-mcp && npx tsc --watch

# Full project build (SVG-Edit + extensions)
npm run build
```

### Test

```bash
# All core tests (37 tests — node utils, serializer, parser, round-trip)
cd packages/academic-figure-core && npm test

# All MCP tests (27 tests — store lifecycle, CRUD, batch atomicity, revision conflicts)
cd packages/academic-figure-mcp && npm test

# Run everything
cd packages/academic-figure-core && npm test
cd ../academic-figure-mcp && npm test
```

**Test coverage by area:**

| Area | Tests | Files |
|------|-------|-------|
| Node utilities (findNode, ensureNode, removeNode, moveNode, …) | 14 | `core/tests/node-utils.test.ts` |
| SVG serializer (output, escaping, metadata attributes) | 5 | `core/tests/serializer.test.ts` |
| SVG parser (hierarchy, metadata, text, attributes, numeric conversion) | 9 | `core/tests/serializer.test.ts` |
| Round-trip (serialize → parse → verify structure/ids/metadata) | 2 | `core/tests/serializer.test.ts` |
| Document store (create, load, persist, update, delete) | 6 | `mcp/tests/document-store.test.ts` |
| Document lifecycle (create → edit → persist → reload → edit) | 3 | `mcp/tests/document-service.test.ts` |
| Batch atomicity (valid, invalid parent, pre-flight validation) | 3 | `mcp/tests/document-service.test.ts` |
| Revision conflicts (matching, mismatching, error format, no-lock) | 4 | `mcp/tests/document-service.test.ts` |
| WriteResult format (create, update, delete, transform) | 4 | `mcp/tests/document-service.test.ts` |
| Error format (DOCUMENT_NOT_FOUND, ELEMENT_NOT_FOUND, INTERNAL_ERROR) | 3 | `mcp/tests/document-service.test.ts` |
| Repeated elements (grid creation, naming, positioning) | 1 | `mcp/tests/document-service.test.ts` |
| Query elements (by type, by role) | 2 | `mcp/tests/document-service.test.ts` |

### Package Overview

| Package | Type | Runtime | Description |
|---------|------|---------|-------------|
| `@svgedit/svgcanvas` | Library | Browser | SVG editing engine (original) |
| `@academic-figure/core` | Library | Node.js | Structured SVG document model, serializer, parser — zero DOM dependency |
| `@academic-figure/mcp` | Server | Node.js | MCP stdio server + HTTP bridge for AI-assisted figure creation |
| `ext-academic-mcp` | Extension | Browser | SVG-Edit UI extension for Open/Save/Reload via HTTP bridge |

---

## MCP Tools Quick Reference

### Creating a Figure (Typical Agent Workflow)

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

7. get_document_tree({ documentId })       # Verify structure
8. render_preview({ documentId })          # See the figure
9. update_element({ documentId, elementId, attributes: { fill: "blue" } })
10. render_preview({ documentId })          # Verify the change
11. export_svg({ documentId })             # Final export
```

### Element Types

`g`, `rect`, `circle`, `ellipse`, `line`, `polyline`, `polygon`, `path`, `text`, `image`, `use`

### Metadata

Every element can carry semantic metadata via `data-*` attributes:

| Attribute | Values | Example |
|-----------|--------|---------|
| `data-role` | `environment`, `building`, `road`, `vegetation`, `entity`, `communication-link`, `annotation`, `legend` | `data-role="building"` |
| `data-importance` | `background`, `secondary`, `primary` | `data-importance="primary"` |
| `data-name` | Free text | `data-name="Left Building"` |
| `data-semantic-name` | Free text | `data-semantic-name="UAV"` |
| `data-category` | Free text | `data-category="urban"` |

Metadata is preserved through round-trips between MCP and SVG-Edit — the SVG parser merges existing metadata with the parsed SVG on each save.

---

## Supported SVG Elements

### Creation & Editing (via MCP tools)

`svg`, `g`, `rect`, `circle`, `ellipse`, `line`, `polyline`, `polygon`, `path`, `text`, `image`, `use`

### Pass-through (preserved by parser for SVG-Edit round-trips)

`defs`, `symbol`, `marker`, `linearGradient`, `radialGradient`, `clipPath`, `style`, `tspan`, `title`, `desc`

---

## Original SVGEdit Documentation

### Contributions

SVGEdit is the most popular open source SVG editor. It was started more than 15 years ago by a fantastic team of developers. Unfortunately, the product was not maintained for quite a long time. We decided to give this tool a new life by refreshing many aspects.

Please let us know by creating an issue or a discussion if you wish to contribute.

### I want to use SVGEdit

Thanks to **Netlify**, you can access the following builds from your favorite browser:

- [Try SVGEdit V7 (master branch on github)](https://svgedit.netlify.app/index.html)
- [Try SVGEdit V7 (latest published version on npm)](https://unpkg.com/svgedit@latest/dist/editor/index.html)

### Prior to V7

We recommend using the V7 version but for older browsers or some abandoned features, you may need to access older versions of SVGEdit.

- [Try SVGEdit 6.1.0 here](https://60a0000fc9900b0008fd268d--svgedit.netlify.app/editor/index.html)
- [Try SVGEdit 5.1.0 here](https://unpkg.com/svgedit@5.1.0/editor/svg-editor.html)

Additional tip: you may try a version released on NPM using `unpkg`, for example, with version 3.2.0

- [https://unpkg.com/svgedit@3.2.0/editor/svg-editor.html](https://unpkg.com/svgedit@3.2.0/editor/svg-editor.html)

### I want to host SVGEdit in my environment

If you want to host a local version of SVGEdit, please follow these instructions:

1. clone or copy the repository contents from github
1. run `npm i` to install dependencies
1. run `npm run build --workspace @svgedit/svgcanvas` to build the svgcanvas dependency locally
1. to test, you can run `npm run start` to start a local server
1. and access `http://localhost:8000/src/editor/index.html` with a supported browser
1. run `npm run build` to build a bundle that you can serve from your own web server

### I want to contribute to SVGEdit

**Thanks!**

SVGEdit is made of two major components:

1. The "svgcanvas" that takes care of the underlying svg editor. It can be used to build your own editor
1. The "editor" that takes care of the editor UI (menus, buttons, etc.)

You should fork SVGEdit in your github environment and install SVGEdit locally as explained above.

Before you submit your PR, please make sure you run locally:

1. `npm run lint` to check that you follow the standardjs rules (https://standardjs.com/rules) for the linter
1. `npm run test` to run the Vitest suite (unit/locale checks)

If you intend to contribute on a regular basis, let us know so we can add you to the maintainer team.

### I want to integrate SVGEdit into my own Web application

V7 is changing significantly the way to integrate and customize SVGEdit. You can have a look at `index.html` to see how you can insert a `div` element into your HTML code and inject the editor into the `div`.

**Warning: This `div` can be positioned anywhere in the DOM but it must have a numeric width and a numeric height (i.e. not 'auto' which happens when the `div` is hidden)**

```html
<head>
   <!-- You need to include the CSS for SVGEdit somewhere in your application -->
  <link href="./svgedit.css" rel="stylesheet" media="all"></link>
</head>

<body>
  <!-- svgedit container can be positioned anywhere in the DOM
       but it must have a width and a height -->
  <div id="container" style="width:100%;height:100vh"></div>
</body>
<script type="module">
  /* You need to call the Editor and load it in the <div> */
  import Editor from './Editor.js'
  /* for available options see the file `docs/tutorials/ConfigOptions.md` */
  const svgEditor = new Editor(document.getElementById('container'))
  /* set the configuration */
  svgEditor.setConfig({
          allowInitialUserOverride: true,
          extensions: [],
          noDefaultExtensions: false,
          userExtensions: []
  })
  /* initialize the Editor */
  svgEditor.init()
</script>
</html>
```

### I want to build my own svg editor

You can just use the underlying canvas and use it in your application with your favorite framework.
See example in the demos folder or the svg-edit-react repository.

To install the canvas:

`npm i -s '@svgedit/svgcanvas'`

you can then import it in your application:

`import svgCanvas from '@svgedit/svgcanvas'`

### Supported browsers

Development and Continuous Integration are done with a **Chrome** environment. Recent versions of Chrome, FireFox, and Safari are supported (in the meaning that we will try to fix bugs for these browsers).

To support old browsers, you may need to use an older version of the package. However, please open an issue if you need support for a specific version of your browser so that the project team can decide if we should support it in the latest version of SVGEdit.

### Sample extension based on React

A sample React component was used to build a SVGEdit extension.

To activate:

- "npm run build" from the extension folder "src/editor/react-extensions/react-test" in order to create the bundle for the extension.
- modify "index.html" to activate the extension as a `userExtensions`

```javascript
svgEditor.setConfig({
          allowInitialUserOverride: true,
          extensions: [],
          noDefaultExtensions: false,
          userExtensions: ['./react-extensions/react-test/dist/react-test.js']
        })
```

### Further reading and more information

- Participate in [discussions](https://github.com/SVG-Edit/svgedit/discussions)
- See [AUTHORS](AUTHORS) file for authors.
- [StackOverflow](https://stackoverflow.com/tags/svg-edit) group.

### Hosting

SVGEdit versions are deployed to:

[![Deploys by Netlify](https://www.netlify.com/img/global/badges/netlify-color-accent.svg)](https://www.netlify.com)

---

[⇈ Back to Top](#svgedit--academic-figure-mcp)
