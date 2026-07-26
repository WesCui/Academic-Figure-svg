# Schema Index

## Status

The Schemas in this directory are normative V2 data Contracts.

They are not registered runtime MCP schemas at the current repository baseline.

## Schema inventory

| File | `$id` | Main consumer | Baseline status |
|---|---|---|---|
| `common.schema.json` | `urn:academic-figure:contract:common:1.0` | All V2 Contracts | Contract only |
| `figure-request.schema.json` | `urn:academic-figure:contract:figure-request:1.0` | Planned task-level create/revise tools | Planned |
| `reference-definition.schema.json` | `urn:academic-figure:contract:reference-definition:1.0` | Planned reference store | Planned |
| `reference-analysis.schema.json` | `urn:academic-figure:contract:reference-analysis:1.0` | Host vision/reference workflow | Planned |
| `academic-diagram-plan.schema.json` | `urn:academic-figure:contract:academic-diagram-plan:1.0` | Planned Plan compiler | Planned |
| `asset-manifest.schema.json` | `urn:academic-figure:contract:asset-manifest:1.0` | Planned Asset Registry | Planned |
| `figure-operation.schema.json` | `urn:academic-figure:contract:figure-operation:1.0` | Planned revision compiler | Planned |
| `figure-audit-report.schema.json` | `urn:academic-figure:contract:figure-audit-report:1.0` | Existing Audit plus target Quality Gate | Partial target |
| `revision-transaction.schema.json` | `urn:academic-figure:contract:revision-transaction:1.0` | Planned transaction/history | Planned |

## Contract rules

- Every top-level Schema uses JSON Schema Draft 2020-12.
- Every top-level V2 instance uses `schemaVersion: "1.0"`.
- Public objects use `additionalProperties: false` unless explicitly open.
- IDs are logical identifiers, not filesystem paths.
- Plan and operation Contracts do not permit arbitrary executable code.
- Schema validity does not prove that referenced objects exist.

## Semantic validation required

Application-level validation must check:

1. Entity, region, relation, group, and annotation ID uniqueness.
2. Relation endpoints exist.
3. Group members exist and do not create invalid cycles.
4. Reference IDs resolve.
5. Asset IDs resolve and satisfy sanitization requirements.
6. Operation targets exist at the expected revision.
7. Local-edit scope is not silently widened.
8. A committed transaction increments revision exactly once.
9. Snapshot and rollback provenance are valid.
10. A claimed V2 Quality Gate pass executed every blocking check.

## Fixtures

```text
fixtures/valid/
fixtures/invalid/
```

Invalid fixtures are intentionally invalid and must fail validation.
