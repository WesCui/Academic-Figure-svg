# SVG-Edit Round-Trip Contract

- **Baseline status**: existing-with-limitations
- **Current basis**: HTTP Bridge, SVG-Edit extension, parser, serializer

## Existing flow

```text
document.json
→ serialized SVG
→ SVG-Edit Open
→ manual edit
→ SVG-Edit Save
→ HTTP Bridge
→ SVG parse
→ document persistence
```

## Target save invariants

### INV-EDIT-001 — Revision check

SVG-Edit Save MUST include or resolve an expected revision.

A conflict MUST NOT overwrite the newer formal document.

### INV-EDIT-002 — Snapshot

A required snapshot MUST be created according to `revision-and-snapshot.md` before the save is finalized.

### INV-EDIT-003 — Metadata preservation

Where the corresponding element still exists, Save SHOULD preserve:

- element ID;
- role;
- importance;
- tags;
- asset provenance;
- reference provenance;
- other approved Academic Figure metadata.

### INV-EDIT-004 — Atomic formal save

Parse, validation, metadata merge, and formal persistence MUST succeed as one approved mutation.

A failure MUST leave the formal document unchanged.

### INV-EDIT-005 — Single revision

One successful editor Save MUST increase revision exactly once.

### INV-EDIT-006 — Post-save validation

A successful save SHOULD trigger:

- SVG serialization;
- preview render;
- available Audit checks;
- a save summary.

### INV-EDIT-007 — Continuation

After a successful save, Claude Code or Codex MUST read the new revision before performing another mutation.

## Security and local access

The Bridge SHOULD:

- listen on localhost by default;
- validate document identifiers;
- restrict allowed paths;
- limit request size;
- avoid exposing absolute local paths;
- reject untrusted active content.

## Current limitation

Until these invariants are implemented and tested, documentation and Skills MUST report the SVG-Edit round trip as available with limitations.
