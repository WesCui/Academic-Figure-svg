# Revision and Snapshot Contract

> **定位：Code Agent 开发护栏。** 本文用于约束实现行为，不是产品运行时协议，也不表示对应规划能力已经实现。

- **Status at baseline**: existing-with-limitations
- **Current basis**: document revision field and snapshot store
- **Missing at baseline**: public history, rollback, full timing/coverage guarantees

## Revision invariants

### INV-REV-001 — Monotonic revision

A document revision MUST increase monotonically for every committed formal mutation.

### INV-REV-002 — Single increment

One logical operation MUST increase the revision exactly once.

### INV-REV-003 — Read-only operations

Read, query, preview, and ordinary export MUST NOT increase document revision.

### INV-REV-004 — Conflict safety

An expected-revision mismatch MUST NOT change the document or create a committed mutation revision.

## Snapshot invariants

### INV-SNAP-001 — Required coverage

Every formal AI mutation, automatic layout, automatic fix, asset replacement, SVG-Edit save, and rollback MUST have recoverable snapshot coverage.

### INV-SNAP-002 — Timing

The implementation MUST choose and document one consistent model:

- snapshot of the state before mutation; or
- snapshot of every committed revision after mutation.

A mixture without explicit provenance is forbidden.

### INV-SNAP-003 — Snapshot failure

If a required snapshot cannot be created, the formal mutation MUST NOT be reported as safely committed.

### INV-SNAP-004 — Provenance

A revision history entry MUST record:

- revision;
- operation ID;
- actor;
- summary;
- timestamp;
- snapshot ID;
- source revision;
- rollback source where applicable.

## History and rollback target

### INV-HIST-001 — Revision list

The planned revision list MUST return stable revision metadata without exposing internal filesystem paths.

### INV-ROLL-001 — Rollback is a new revision

Rollback MUST create a new revision containing the selected historical state.

Rollback MUST NOT delete later history.

### INV-ROLL-002 — Rollback provenance

The new revision MUST record the source revision or snapshot restored.

## Current limitation rule

Until `list_revisions` and `rollback_revision` are implemented and tested:

- documentation MUST NOT advertise public rollback;
- a Skill MUST NOT promise rollback;
- snapshot existence MUST NOT be described as equivalent to rollback support.
