# Batch 2 Schema Source Decision

- **Decision status**: accepted for Contract documentation
- **Branch inspected**: `y`
- **Branch head inspected**: `79d4c41f0b56306aab21338c6170c8dc7a7642f4`
- **Implementation baseline**: `f8ddf7167cfa082ed68d4c0e3d0a3db0e1a2dc71`
- **Runtime implementation changed by this batch**: no

## Decision

New Academic Figure MCP V2 cross-boundary data Contracts are defined as JSON Schema Draft 2020-12 files under:

```text
docs/contracts/academic-figure/schemas/
```

These JSON Schemas are the normative wire/data Contract for the new V2 concepts introduced by the PDR.

They do not replace the current MCP runtime Zod schemas for the 20 existing tools.

## Repository facts behind the decision

The inspected `y` branch has this dependency direction:

```text
@academic-figure/mcp
        ↓
@academic-figure/core
```

`@academic-figure/mcp` already depends on Zod.

`@academic-figure/core` has no runtime dependencies and remains the structured SVG core.

Adding Zod to Core or creating a new workspace package would change the package boundary. Neither change is needed to freeze the V2 data Contract.

## Runtime adoption rule

A later implementation batch MUST choose one conforming approach:

1. validate the normative JSON Schema directly;
2. generate runtime validators and TypeScript types from the normative Schema; or
3. implement Zod schemas with automated conformance tests against the normative JSON Schema and fixtures.

A later batch MUST NOT maintain incompatible hand-written definitions without conformance tests.

## Existing tool exception

The current 20 MCP tools continue to use their existing Zod schemas in:

```text
packages/academic-figure-mcp/src/server.ts
```

This Batch does not assert that the new schemas are implemented or registered as MCP tools.

## Core boundary

The Schemas do not move these existing types out of Core:

- `SvgDocument`;
- `SvgNode`;
- `SvgMetadata`;
- parser/serializer types;
- theme types.

`document.json` remains the authoritative structured SVG state after a Plan is compiled.

## Future package decision

A dedicated `@academic-figure/contracts` package remains a possible future implementation choice.

Creating that package requires a separate approved batch because it changes:

- root workspaces;
- package dependencies;
- build outputs;
- package exports;
- lockfile.

## Versioning

All Batch 2 Schemas use `schemaVersion: "1.0"` and stable URN `$id` values.

Breaking changes require a new Schema version and `$id`.

## Validation boundary

JSON Schema validates structure and local constraints.

Semantic validation remains required for:

- relation endpoints referencing existing entities;
- group members referencing existing entities or groups;
- uniqueness across semantic arrays;
- reference and asset resolution;
- operation targets at the expected revision;
- one logical operation producing one revision;
- rollback provenance;
- complete Quality Gate execution.
