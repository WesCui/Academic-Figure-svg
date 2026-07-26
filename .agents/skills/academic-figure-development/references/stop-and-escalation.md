# Stop and Escalation

Stop production and report the blocker when any condition below occurs.

## Baseline and worktree

- branch differs from the approved branch;
- commit materially differs from the approved baseline;
- the worktree contains overlapping user changes;
- a target path has moved, disappeared, or changed responsibility;
- the available repository snapshot is insufficient to generate a trustworthy patch.

## Scope and architecture

- a required change falls outside allowed paths;
- an unapproved dependency, workspace, lockfile, migration, or package is needed;
- an existing public MCP tool must change incompatibly;
- `SvgDocument`, `SvgNode`, or `document.json` authority must change;
- SVG-Edit must be modified outside an explicitly approved editor batch;
- completion requires a broad refactor or a new platform layer.

## Requirement conflict

- user instruction, batch Contract, PDR, and stable Contract conflict;
- a design draft conflicts with current code or Contract;
- scientific meaning, relation direction, entity identity, algorithm order, or reference scope is ambiguous;
- an automatic fix could alter research semantics.

## Validation and safety

- a required test cannot run;
- a required test fails and the cause is unresolved;
- a command would modify files outside the approved scope;
- a mutation may partially corrupt formal document state;
- imported SVG or external content cannot be handled safely;
- rollback or recovery cannot be guaranteed where the batch requires it.

## Escalation format

Report:

```markdown
## Stop condition
- Trigger:
- Confirmed facts:
- Affected files:
- Why continuing would exceed scope or risk correctness:

## Options
1. Option A — scope, impact, risks
2. Option B — scope, impact, risks

## Required decision
- ...
```

Do not choose an expanded option silently.
