# Academic Figure MCP Workspace

This directory is the working directory for the Academic Figure MCP server.

## Structure

```
workspace/
├── documents/          # One subdirectory per SVG document
│   └── <documentId>/
│       ├── document.json   # Full SvgDocument state (source of truth)
│       ├── current.svg     # Exported SVG (for SVG-Edit)
│       ├── preview.png     # Rendered PNG preview (via resvg)
│       └── snapshots/      # Revision snapshots for undo/rollback
│           ├── 000001.json
│           ├── 000002.json
│           └── ...
└── exports/            # User-facing exports directory
```

## Usage

The workspace root can be overridden via the `SVG_MCP_WORKSPACE` environment variable:

```bash
SVG_MCP_WORKSPACE=/path/to/workspace node packages/academic-figure-mcp/dist/index.js
```

## MCP Configuration

To use with Claude Code, add this to your MCP configuration:

```json
{
  "mcpServers": {
    "academic-figure": {
      "command": "node",
      "args": ["packages/academic-figure-mcp/dist/index.js"],
      "env": {
        "SVG_MCP_WORKSPACE": "/absolute/path/to/workspace"
      }
    }
  }
}
```
