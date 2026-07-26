# Contract Fixtures

## Purpose

Fixtures provide concrete examples for the Batch 2 JSON Schemas.

They are Contract examples, not proof that the corresponding runtime capability exists.

## Valid fixtures

Files under `valid/` must validate against their mapped Schema.

## Invalid fixtures

Files under `invalid/` must fail validation.

| File | Expected failure |
|---|---|
| `figure-request-revise-missing-revision.json` | Revise request lacks `expectedRevision`. |
| `reference-definition-invalid-scope.json` | Unsupported reference scope. |
| `reference-analysis-copy-policy-not-acknowledged.json` | Copying boundary acknowledgement is false. |
| `academic-diagram-plan-unknown-family.json` | Unsupported Academic Figure Family. |
| `asset-manifest-missing-sanitization.json` | Imported asset lacks sanitization result. |
| `figure-operation-arbitrary-op.json` | Arbitrary script operation is not permitted. |
| `figure-audit-report-negative-count.json` | Quality counter is negative. |
| `revision-transaction-conflict-with-result.json` | Conflict incorrectly claims a resulting revision. |

## Semantic fixtures

Cross-reference failures such as a relation pointing to a missing entity require a later semantic validator and Contract test batch.
