# Investigation and Planning

## Investigation mode

Investigation is read-only unless the user explicitly changes the task.

Record:

```bash
git rev-parse --show-toplevel
git branch --show-current
git rev-parse HEAD
git status --short
```

Inspect the smallest set of source, test, package, and configuration files needed to answer the task.

For each important conclusion, provide:

- status: `existing`, `existing-with-limitations`, `planned`, `out-of-scope`, or `unconfirmed`;
- repository-relative path;
- symbol, handler, class, function, script, or test name;
- concise evidence;
- missing part when status is limited or unconfirmed.

Do not install dependencies, run formatters, update locks, generate code, apply migrations, clean the worktree, or commit.

## Planning mode

A plan must be grounded in current code, not only in the PDR or a prior facts report.

Use this structure:

```markdown
# Batch Plan

## Baseline
- Branch:
- Commit:
- Working tree:

## Current facts
- ...

## Goal
- ...

## Files to modify
- ...

## Files to add
- ...

## Protected files
- ...

## Existing modules to reuse
- ...

## Implementation steps
1. ...

## Tests and checks
- ...

## Risks
- ...

## Stop conditions
- ...

## Explicit non-goals
- ...
```

Do not produce code or a patch during planning unless the user explicitly requested immediate production and supplied a sufficiently precise approved scope.

## Plan quality checks

Before presenting the plan, confirm:

- every proposed file is necessary;
- no new package or dependency is assumed;
- no planned tool is described as existing;
- no existing public tool is silently renamed;
- no second document model or editor is introduced;
- tests correspond to the actual changed behavior;
- future batches are not pulled into the current batch.
