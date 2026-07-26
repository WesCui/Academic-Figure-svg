# Diff Delivery

## Required package

When the user asks for a diff package, generate:

```text
<batch-name>.patch
<batch-name>.zip
<batch-name>-MANIFEST.md
<batch-name>-VALIDATION.md
```

The ZIP contains the patch, manifest, and validation report.

## Baseline discipline

Record the exact baseline used to generate the patch.

Before delivery, validate the patch against that baseline:

```bash
git apply --check <batch-name>.patch
```

When the exact full repository is unavailable, say precisely what reconstructed file state was used. Do not claim full-baseline validation.

## Manifest contents

Include:

- repository and branch;
- baseline commit or reconstructed baseline;
- purpose;
- files added, modified, moved, and deleted;
- runtime code, dependency, package, lockfile, test, PDR, and Skill impact;
- application commands;
- review commands;
- reverse-apply or rollback instructions;
- patch SHA-256.

## Validation report

Separate:

- checks run and passed;
- checks run and failed;
- checks not run;
- static inspection only;
- remaining uncertainty.

## Path-boundary check

List every changed path and compare it with the batch Contract.

Do not package:

- caches;
- coverage output;
- test reports;
- build artifacts;
- logs;
- workspace documents;
- unrelated formatting;
- unapproved lockfile changes.

## User application sequence

Recommend:

```bash
git status --short
git apply --check <batch-name>.patch
git apply <batch-name>.patch
git diff --check
git diff --stat
git status --short
```
