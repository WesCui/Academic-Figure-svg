# Implementation and Validation

## Before editing

Confirm:

- current branch and commit;
- worktree status;
- approved batch Contract or equivalent user scope;
- allowed and prohibited paths;
- required reuse points;
- exact tests and validation commands.

Stop when local changes overlap the files to be modified unless the user has explicitly included them in the baseline.

## During implementation

- Preserve existing architecture and public compatibility by default.
- Keep one logical change within one approved batch.
- Use existing services rather than ad hoc filesystem writes.
- Avoid broad refactors and formatting-only changes.
- Do not add dependencies or change the lockfile without approval.
- Do not implement non-goals.
- Update development Contract status only when code evidence exists.

## Validation order

Use the narrowest applicable validation first:

1. type or compile check for the changed package;
2. unit tests directly covering the change;
3. package-level tests required by the batch;
4. targeted integration or E2E tests;
5. static Git checks.

Do not run destructive, environment-mutating, installation, registration, or migration commands unless the batch explicitly requires them.

Always run or report the status of:

```bash
git diff --check
git diff --stat
git status --short
```

## Completion decision

Mark the batch complete only when:

- every required item is implemented;
- required checks pass or accepted limitations are explicit;
- no changed path exceeds the approved boundary;
- no unapproved dependency or interface change exists;
- non-goals remain unimplemented;
- documentation accurately describes current behavior.

Otherwise report partial completion or stop.
