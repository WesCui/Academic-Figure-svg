# Repository Baseline Contract

> **定位：Code Agent 开发护栏。** 本文用于约束实现行为，不是产品运行时协议，也不表示对应规划能力已经实现。

## Baseline identity

- Repository root observed by the investigation: `E:/项目/ACA-fig/Academic-Figure-svg`
- Branch: `y`
- Commit: `f8ddf7167cfa082ed68d4c0e3d0a3db0e1a2dc71`
- PDR path: `docs/PDR/Academic-Figure-MCP-PDR .md`
- Working-tree status before and after investigation: `?? docs/PDR/`
- Tests and builds were not run during the read-only investigation.

This document records the accepted baseline. It does not certify behavior that was not tested.

## Repository structure

| Path | Baseline responsibility | Status |
|---|---|---|
| `src/` | SVG-Edit editor application | existing |
| `packages/svgcanvas/` | SVG canvas core | existing |
| `packages/academic-figure-core/` | Structured SVG document, parser, serializer, and themes | existing |
| `packages/academic-figure-mcp/` | MCP server, document service, render/export, and HTTP Bridge | existing |
| `tests/` | SVG-Edit unit, E2E, and visual tests | existing |
| `packages/*/tests/` | Academic Figure package tests | existing |
| `scripts/` | Build, release, and MCP registration scripts | existing |
| `clients/mcp-client/` | MCP client configuration | existing |
| `docs/` | Project documentation | existing |

## Runtime and toolchain

- Node.js requirement: `>=20`.
- Package manager: npm with `package-lock.json`.
- Workspace model: npm workspaces.
- Main languages: JavaScript and TypeScript.
- Build tooling: Vite and TypeScript.
- Test tooling: Vitest and Playwright.
- Lint tooling: Standard.
- MCP entry: `packages/academic-figure-mcp/src/index.ts`.

## Existing structured document model

The baseline includes:

- `SvgMetadata`;
- `SvgNode`;
- `SvgDocument`;
- document `revision`;
- SVG parser;
- SVG serializer;
- document tree operations;
- Academic and IEEE themes.

Persistence uses:

```text
document.json
current.svg
```

The baseline does not include a runtime type for:

- Academic Figure Family;
- Academic Diagram Plan;
- Reference Scope;
- Reference Analysis;
- Asset Manifest;
- Revision History;
- Rollback Result;
- full Quality Gate.

## Existing MCP surface

The baseline registers exactly 20 tools:

1. `create_document`
2. `load_document`
3. `create_element`
4. `batch_create_elements`
5. `create_repeated_elements`
6. `create_isometric_building`
7. `update_element`
8. `transform_elements`
9. `delete_elements`
10. `get_document_tree`
11. `query_elements`
12. `render_preview`
13. `export_svg`
14. `get_document_info`
15. `create_communication_link`
16. `create_numbered_callout`
17. `create_paper_legend`
18. `audit_figure`
19. `align_elements`
20. `distribute_elements`

MCP input schemas are primarily declared with Zod in `packages/academic-figure-mcp/src/server.ts`.

## Existing drawing and editing foundation

Verified baseline capabilities include:

- create, update, transform, delete, and batch creation;
- repeated elements;
- isometric building;
- communication link;
- numbered callout;
- paper legend;
- align and distribute;
- PNG preview through resvg;
- SVG export;
- Academic and IEEE themes;
- basic Audit for overlap, bounds, small text, and density;
- SVG-Edit HTTP Bridge;
- revision checks and direct revision increments;
- snapshot store.

## Existing with limitations

### Revision and snapshot

The baseline includes revision checks, revision increments, and a snapshot store.

The investigation did not establish:

- a unified mutation transaction;
- `operationId` idempotency;
- complete snapshot coverage for all write paths;
- public revision history;
- public rollback;
- exact snapshot timing.

### SVG-Edit round trip

The HTTP Bridge and parser/serializer round trip exist.

The investigation did not fully establish:

- preservation of all metadata fields;
- atomic replacement;
- request-body limits;
- complete path validation;
- formal no-change-on-failure behavior.

### Audit

Current `audit_figure` is a basic Audit tool. It is not the V2 Quality Gate.

The baseline does not implement:

- clipped-text validation;
- connector-node intersection validation;
- dangling endpoint validation;
- blocking gate semantics;
- auto-fix.

### Sanitization

Generic SVG sanitization exists in the SVG canvas code.

This does not constitute:

- an Asset Registry;
- an Asset Manifest;
- asset versioning;
- viewBox normalization Contract;
- ID-prefixing Contract;
- workspace/global asset lifecycle.

## Not found at baseline

The following V2 capabilities were not found:

- user reference image service;
- built-in reference registry;
- Reference Scope enforcement;
- Academic Diagram Plan;
- Asset Registry;
- custom asset MCP lifecycle;
- deterministic graph/scenario layout engine;
- semantic connector routing;
- full Quality Gate;
- auto-fix;
- unified transaction service;
- `operationId` idempotency;
- revision list API;
- rollback API;
- `open_in_editor` MCP tool;
- Codex-specific configuration;
- Academic Figure Skill.

## Protected existing paths and names

Later changes must preserve or explicitly migrate:

```text
packages/academic-figure-core/src/document/types.ts
packages/academic-figure-mcp/src/server.ts
packages/academic-figure-mcp/src/services/
packages/academic-figure-mcp/src/store/document-store.ts
packages/academic-figure-mcp/src/store/snapshot-store.ts
packages/academic-figure-mcp/src/http/bridge-server.ts
src/editor/extensions/ext-academic-mcp/
@academic-figure/core
@academic-figure/mcp
```

Existing public MCP tool names must not be silently renamed.
