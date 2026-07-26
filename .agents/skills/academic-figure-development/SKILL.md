---
name: academic-figure-development
description: Develop, review, or deliver changes in the Academic-Figure-svg repository under its PDR and Code Agent development Contracts. Use for repository investigation, batch planning, implementation, refactoring, debugging, tests, MCP/Core/SVG-Edit changes, Git diff generation, or validation reports. Do not use for end-user academic figure drawing.
compatibility: Requires a shell and Git. Intended for the Academic-Figure-svg repository and skills-compatible code agents. Read the repository PDR and docs/contracts/academic-figure before changing code.
---

# Academic Figure Development

Use this Skill to keep Code Agent work aligned with the repository's PDR, current implementation, and approved development Contracts.

This Skill governs **development of the repository**. It does not instruct an end user how to draw a figure and does not make planned product capabilities available.

## 1. Confirm the repository and task mode

Before reading broadly or modifying files, confirm that the working directory is the Academic-Figure-svg repository.

Run and record:

```bash
git rev-parse --show-toplevel
git branch --show-current
git rev-parse HEAD
git status --short
```

Classify the request into one mode:

- **investigation** — inspect facts only; do not produce changes;
- **planning** — produce an implementation plan only;
- **implementation** — modify only an approved batch scope;
- **diff-delivery** — generate or review a patch from approved changes;
- **review** — inspect an existing diff or commit without silently repairing it.

Read `references/investigation-and-planning.md` for investigation or planning tasks.
Read `references/implementation-and-validation.md` for implementation tasks.
Read `references/diff-delivery.md` for patch or review tasks.

## 2. Read sources in the required order

Read only what is necessary, but use this authority order:

1. current user instruction;
2. current approved batch Contract under `docs/contracts/academic-figure/batches/`;
3. `docs/PDR/Academic-Figure-MCP-PDR .md`;
4. stable development Contracts under `docs/contracts/academic-figure/`;
5. current code, tests, package files, and configuration;
6. README and other descriptive documentation;
7. non-normative design drafts under `docs/design/academic-figure/`;
8. archived or historical material.

Read `references/contract-reading-map.md` to select the relevant Contract files.

PDR proves the target. Code and tests prove the current implementation. README is a lead, not sufficient implementation evidence. A design draft is never an implementation requirement unless the current batch Contract explicitly adopts it.

## 3. Enforce the production gate

Do not produce repository changes unless all of the following are true:

- the user explicitly requested implementation or diff generation;
- the branch and baseline are known;
- an approved batch Contract exists or the user supplied an equally precise scope;
- allowed and prohibited paths are identified;
- required reuse points are identified;
- no stop condition is active.

When the request is investigation or planning, stop after the report or plan.

When the implementation scope is missing or ambiguous, output a plan and ask for scope approval rather than guessing.

## 4. Inspect before designing

For each capability in scope, inspect the real registration, service, persistence, error, and test paths before proposing a new abstraction.

Use only these status labels:

```text
existing
existing-with-limitations
planned
out-of-scope
unconfirmed
```

Never restate `planned`, `unconfirmed`, a README claim, or a design draft as `existing`.

## 5. Prefer the existing architecture

Unless the current batch Contract explicitly authorizes a change, preserve and reuse:

- `SvgDocument`, `SvgNode`, and `document.json` as the structured figure authority;
- `academic-figure-core` for structured SVG, parsing, serialization, and themes;
- `academic-figure-mcp` for MCP registration, local workspace access, services, render/export, and Bridge integration;
- `DocumentService`, `DocumentStore`, and `SnapshotStore` where relevant;
- existing parser, serializer, resvg preview, primitives, align/distribute, sanitizer, and HTTP Bridge;
- SVG-Edit for manual selection, dragging, resizing, text, style, and path editing;
- existing public MCP tool names unless a migration is explicitly approved.

Do not create a second authoritative document model, a duplicate editor, or a speculative platform layer.

## 6. Keep the batch narrow

Before editing, state:

- files to modify;
- files to add;
- files that remain protected;
- existing modules to reuse;
- expected public behavior changes;
- tests and static checks to run;
- known risks and stop conditions.

During implementation:

- make the smallest change that satisfies the batch Contract;
- do not perform unrelated refactors, formatting, dependency upgrades, or cleanup;
- do not implement future batches early;
- do not add dependencies, workspaces, lockfile changes, or public API changes without explicit authorization;
- do not bypass formal document services with ad hoc writes;
- do not claim Snapshot Store is Rollback, basic Audit is the complete Quality Gate, or generic SVG sanitization is the Asset Registry.

## 7. Validate truthfully

Run only the checks required by the batch Contract and checks that do not exceed the approved scope.

Always distinguish:

- passed;
- failed;
- not run;
- static inspection only;
- unconfirmed.

A test file existing is not evidence that the test passed. A failed or unrun required test prevents a completion claim unless the user explicitly accepts the limitation.

At minimum, inspect:

```bash
git diff --check
git diff --stat
git status --short
```

Review every changed path against the approved scope.

## 8. Stop instead of improvising

Read `references/stop-and-escalation.md` when any conflict, unexpected dependency, dirty-worktree overlap, incompatible baseline, public API change, or semantic ambiguity appears.

Do not clean, reset, discard, overwrite, migrate, or broaden scope without explicit approval.

## 9. Deliver auditable results

For implementation or diff-delivery tasks, report:

- baseline branch and commit;
- actual changed files;
- behavior implemented;
- existing modules reused;
- tests and checks with exact results;
- validations not run;
- remaining limitations;
- risks;
- rollback or reverse-apply procedure.

When generating a diff package, include:

```text
<batch>.patch
<batch>.zip
<batch>-MANIFEST.md
<batch>-VALIDATION.md
```

Do not claim the patch applies to a baseline that was not checked.
