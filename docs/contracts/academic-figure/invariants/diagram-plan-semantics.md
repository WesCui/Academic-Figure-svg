# Academic Diagram Plan Semantics

- **Status at baseline**: planned
- **Purpose**: semantic and compositional bridge between user intent and the existing structured SVG system

## Plan ownership

The Academic Diagram Plan describes:

- what the figure contains;
- how content is grouped;
- what relations exist;
- what regions and layout profile are intended;
- what reference and style constraints apply.

The Plan is not the authoritative pixel-level editor state.

`document.json` remains the authoritative structured SVG state after compilation.

## Target figure families

```text
system-model
method-framework
algorithm-workflow
scenario
composite
```

## Required semantic sections

A Plan SHOULD contain:

- version;
- family;
- domain;
- layout profile;
- style profile;
- reference provenance;
- regions;
- entities;
- relations;
- groups;
- annotations;
- assumptions;
- unresolved questions.

## Identifier invariants

### INV-PLAN-001

Entity, region, group, relation, and annotation IDs MUST be unique within their namespace.

### INV-PLAN-002

Every relation endpoint MUST refer to an existing entity or approved port target.

### INV-PLAN-003

Every group member MUST exist.

### INV-PLAN-004

Stable semantic IDs SHOULD survive deterministic recompilation where the semantic object is unchanged.

## Semantic ambiguity

A Plan MUST surface unresolved questions when ambiguity can change:

- relation direction;
- entity identity;
- serial versus parallel execution;
- group membership;
- removal or merging of key modules;
- reference scope;
- research meaning.

A task-level generation operation MUST NOT silently resolve blocking semantic ambiguity.

## Geometry boundary

A Plan MAY include:

- region position;
- direction;
- order;
- emphasis;
- approximate hierarchy;
- asset query.

A Plan MUST NOT include:

- arbitrary executable code;
- unrestricted SVG XML;
- arbitrary JavaScript;
- unconstrained complex path data;
- a requirement that the model manually calculate every final coordinate.

## Human editing

Manual SVG-Edit changes may cause the Plan and document geometry to diverge.

The system MAY mark the Plan as partially stale. It MUST NOT overwrite manual edits solely to restore Plan geometry without explicit user intent.
