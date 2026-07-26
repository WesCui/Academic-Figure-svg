# Source Precedence Contract

## Authority order

When sources disagree, apply this order:

1. Current explicit user instruction.
2. `docs/PDR/Academic-Figure-MCP-PDR .md`.
3. Active documents under `docs/contracts/academic-figure/`.
4. Approved runtime Schema, MCP tool Contract, and ADR.
5. Current implementation and tests.
6. README and other descriptive documents.
7. Archived or historical material.

## Target versus current behavior

The PDR defines target behavior.

`repository-baseline.md`, `capability-status.md`, and `mcp-tool-status.md` define current capability status for the accepted baseline.

A target requirement MUST NOT be restated as an existing capability without:

- implementation evidence;
- public interface evidence where applicable;
- tests or an explicit untested status;
- capability-status update.

## Conflict handling

When two active Contract documents conflict:

1. stop the affected implementation;
2. report the conflicting clauses;
3. do not silently reconcile them;
4. obtain an explicit decision;
5. update the Contract set before implementation.

## README handling

README content is descriptive evidence, not sufficient proof of implementation.

A README-only capability is `planned`, `declared-only`, or `unconfirmed` until code evidence exists.

## Test handling

An unexecuted test MUST NOT be reported as passed.

A source inspection may establish that a test exists, but not that the current worktree passes it.

## Baseline changes

When the branch or commit changes materially:

- rerun the repository fact investigation;
- update `repository-baseline.md`;
- update capability statuses;
- review MCP tool status;
- do not continue using stale facts silently.
