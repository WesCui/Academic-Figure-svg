# Transaction Semantics Contract

- **Status at baseline**: planned target; per-service revision writes exist
- **Applies to**: all formal document mutations

## Current fact

The baseline performs mutation and revision handling in document services.

A unified `mutateDocument`-style transaction and `operationId` idempotency were not found.

## Target invariants

### INV-TXN-001 — One intent, one commit

One accepted user intent MUST produce at most one formal document revision.

Internal sub-operations MUST NOT each create independent revisions.

### INV-TXN-002 — Atomic formal state

A formal mutation MUST either:

- commit all validated changes; or
- leave the formal document unchanged.

Partial formal writes are forbidden.

### INV-TXN-003 — Expected revision

Every destructive or modifying task-level operation MUST carry an expected revision.

A mismatch MUST return a revision conflict and MUST NOT mutate the formal document.

### INV-TXN-004 — Idempotent operation identity

Every task-level mutation MUST have a stable `operationId`.

Replaying a successfully committed `operationId` MUST return the original result or an explicit already-applied result. It MUST NOT duplicate elements or create another revision.

### INV-TXN-005 — Validation before commit

Schema validation, semantic validation, reference integrity, and supported-operation checks MUST complete before the formal commit.

### INV-TXN-006 — Snapshot relationship

The transaction MUST follow the approved snapshot timing in `revision-and-snapshot.md`.

### INV-TXN-007 — Render and Audit failure

Render or Audit failure after a document mutation MUST be handled by an explicitly approved policy:

- rollback before success is returned; or
- commit with a clearly marked failed/non-deliverable state.

The implementation MUST NOT silently report success.

## Out of scope for this batch

This document does not select:

- temporary-file strategy;
- rename implementation;
- lock implementation;
- idempotency storage technology;
- transaction service package location.
