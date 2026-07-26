# Academic Figure MCP V2 Contracts

- **Contract set**: Batch 1 documentation foundation + Batch 2 machine-readable data Contracts
- **Baseline branch**: `y`
- **Implementation baseline commit**: `f8ddf7167cfa082ed68d4c0e3d0a3db0e1a2dc71`
- **Batch 2 branch head inspected**: `79d4c41f0b56306aab21338c6170c8dc7a7642f4`
- **PDR**: `docs/PDR/Academic-Figure-MCP-PDR .md`
- **Status**: active documentation Contract
- **Scope**: architecture boundaries, capability status, behavioral invariants, and V2 data Contracts
- **Runtime Schema**: JSON Schema Contracts added under `schemas/`; runtime registration is not included
- **Skill**: not included in this batch

## Purpose

This Contract set separates the current repository facts from the Academic Figure MCP V2 target.

It exists to prevent later implementation and Skill work from:

- treating planned PDR capabilities as already implemented;
- replacing the existing structured SVG, MCP, SVG-Edit, or resvg foundations;
- creating a second incompatible document model;
- claiming full transaction, rollback, reference, asset, or Quality Gate support before those capabilities exist.

## Authoritative source order

1. Current explicit user instruction.
2. `docs/PDR/Academic-Figure-MCP-PDR .md`.
3. This Contract set.
4. Approved runtime Schema, MCP tool Contract, or ADR.
5. Current implementation and tests.
6. README and other descriptive material.

For current implementation status, `repository-baseline.md` and `capability-status.md` are authoritative within this Contract set.

## Status vocabulary

| Status | Meaning |
|---|---|
| `existing` | Implementation evidence exists at the baseline commit. |
| `existing-with-limitations` | A partial implementation exists, but it does not satisfy the full V2 requirement. |
| `planned` | Required by the PDR but not implemented at the baseline commit. |
| `out-of-scope` | Explicitly excluded from V2 or this batch. |
| `unconfirmed` | The investigation did not establish the behavior. |

## Documents

| File | Purpose |
|---|---|
| `repository-baseline.md` | Freezes verified repository facts. |
| `architecture-boundary.md` | Defines ownership and reuse boundaries. |
| `capability-status.md` | Separates existing and planned capabilities. |
| `source-precedence.md` | Defines conflict and authority rules. |
| `mcp-tool-status.md` | Lists all current MCP tools and planned wrappers. |
| `invariants/transaction-semantics.md` | Defines target mutation atomicity and idempotency. |
| `invariants/revision-and-snapshot.md` | Defines revision, snapshot, history, and rollback rules. |
| `invariants/reference-use-policy.md` | Defines user and built-in reference use. |
| `invariants/diagram-plan-semantics.md` | Defines the target Academic Diagram Plan boundary. |
| `invariants/asset-security.md` | Defines target asset import and security rules. |
| `invariants/local-edit-scope.md` | Defines non-target region protection. |
| `invariants/quality-gate.md` | Separates current Audit from the target Quality Gate. |
| `invariants/svg-edit-roundtrip.md` | Defines target SVG-Edit save semantics. |
| `schema-source-decision.md` | Records the Batch 2 JSON Schema source decision. |
| `schema-index.md` | Lists V2 machine-readable data Contracts. |
| `contract-index.yaml` | Machine-readable Contract set index. |
| `schemas/` | JSON Schema Draft 2020-12 data Contracts. |
| `fixtures/` | Valid and intentionally invalid Contract examples. |

## Batch boundary

Batch 1 and Batch 2 create Contract documentation and machine-readable Contract files only.

It does not:

- modify `packages/academic-figure-core`;
- modify `packages/academic-figure-mcp`;
- extract Zod schemas from `server.ts`;
- register JSON Schema in runtime code;
- add a Contract package;
- add or rename MCP tools;
- implement references or assets;
- implement rollback or revision history;
- implement Quality Gate or auto-fix;
- create an Academic Figure Skill;
- change SVG-Edit;
- add dependencies.

## Batch 2 decision

The normative V2 cross-boundary data Contracts are JSON Schema Draft 2020-12 files under:

```text
docs/contracts/academic-figure/schemas/
```

The current 20 MCP tools continue to use their existing Zod schemas.

Batch 2 does not register the new Schemas at runtime, add a workspace package, or change package dependencies.

See `schema-source-decision.md` for conformance requirements and future runtime options.
