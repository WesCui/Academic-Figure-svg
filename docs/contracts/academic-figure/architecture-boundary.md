# Architecture Boundary Contract

## Product boundary

Academic Figure MCP V2 is a local academic SVG generation and editing assistant for Claude Code and Codex.

It is not:

- a replacement for SVG-Edit;
- a new general-purpose vector editor;
- a cloud collaboration platform;
- a multi-user real-time system;
- a general Agent workflow platform;
- a full UML, SysML, C4, or scientific illustration suite.

## Existing ownership

### SVG-Edit

SVG-Edit owns manual interaction:

- selection;
- dragging;
- resizing;
- path editing;
- text editing;
- fill and stroke editing;
- ordinary editor undo/redo;
- manual visual refinement.

V2 MUST reuse SVG-Edit for manual editing.

### `academic-figure-core`

The Core package owns:

- structured SVG document types;
- SVG parsing;
- SVG serialization;
- document-tree semantics;
- theme resolution;
- reusable domain-neutral structured SVG operations.

V2 MUST NOT create a competing structured SVG document model.

### `academic-figure-mcp`

The MCP package owns:

- MCP registration and handlers;
- local workspace access;
- document services;
- render and export services;
- HTTP Bridge integration;
- task-level orchestration added in later batches.

### resvg

resvg owns deterministic SVG-to-PNG preview rendering.

V2 MUST reuse the existing render path unless a separate approved migration changes it.

## V2 orchestration boundary

The planned V2 layer may add:

- academic figure intent;
- Academic Diagram Plan;
- reference interpretation;
- asset selection;
- layout and routing adapters;
- Quality Gate;
- revision history and rollback;
- task-level MCP wrappers.

The V2 layer MUST compile into the existing Core and MCP operations rather than bypassing them.

## Model and program responsibility

The Host model may decide:

- what entities and relations the user requested;
- which academic figure family fits;
- what a reference image contributes;
- which layout profile or asset candidate is appropriate;
- what bounded revision operation is needed.

Program code MUST decide:

- Schema validation;
- identifiers;
- text measurement;
- node dimensions;
- exact coordinates;
- spacing;
- alignment;
- connection endpoints;
- routing;
- sanitization;
- Audit;
- revision mutation;
- snapshot behavior;
- rollback behavior.

## Reuse requirements

Before creating new infrastructure, implementation work MUST inspect and map:

- existing low-level MCP tools;
- existing parser and serializer;
- existing themes;
- existing primitives;
- existing align and distribute;
- existing snapshot store;
- existing HTTP Bridge;
- existing SVG sanitization.

A new implementation MUST record why the existing capability cannot satisfy the requirement.

## Forbidden architecture shortcuts

V2 MUST NOT:

- generate a whole final SVG as unrestricted model output;
- replace `document.json` with a second authoritative model;
- bypass expected-revision checks;
- modify formal workspace documents through ad hoc file writes;
- treat a PNG reference as an editable object source by default;
- treat generic sanitization as an Asset Registry;
- claim Snapshot equals Rollback;
- claim basic Audit equals Quality Gate.
