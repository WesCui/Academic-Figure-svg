# Batch 04 — Academic Figure Development Skill

## 0. Metadata

- Repository: `WesCui/Academic-Figure-svg`
- Branch: `y`
- Baseline commit: `031e12fb46f4615d6ee0f0f68e1b24339646f61a`
- PDR: `docs/PDR/Academic-Figure-MCP-PDR .md`
- Stable Contract: `docs/contracts/academic-figure/`
- Status: approved for application

## 1. Current facts

- The repository has active Code Agent development Contracts under `docs/contracts/academic-figure/`.
- The repository has no committed `SKILL.md`, `.agents/skills/`, `.claude/skills/`, `AGENTS.md`, or `CLAUDE.md` at the baseline.
- Batch 3 states that the development Skill is generated in a later batch.
- Batch 2 data-model files are non-normative design drafts.
- This batch is development workflow only; it does not implement Academic Figure product capabilities.

## 2. Goal

Add one portable Agent Skill that directs Code Agents to inspect the real repository, read the PDR and development Contracts, obey an approved batch boundary, stop on conflicts, validate truthfully, and deliver auditable diffs.

## 3. Allowed changes

### Existing files allowed to modify

```text
docs/contracts/academic-figure/README.md
```

### New files allowed

```text
.agents/skills/academic-figure-development/**
docs/contracts/academic-figure/batches/batch-04-development-skill.md
```

## 4. Prohibited changes

```text
packages/**
src/**
scripts/**
tests/**
workspace/**
package.json
package-lock.json
docs/PDR/**
docs/design/academic-figure/data-model-drafts/**
```

This batch must not:

- modify runtime code;
- add dependencies;
- add a Skill loader or validation framework;
- register or rename MCP tools;
- create product-facing drawing instructions;
- duplicate the Skill in multiple client-specific directories;
- add executable scripts.

## 5. Required reuse

The Skill must direct agents to reuse:

- the PDR;
- stable development Contracts;
- current batch Contracts;
- current repository code and tests;
- existing architecture and services;
- existing diff-delivery rules.

It must reference these sources rather than copying all repository facts into `SKILL.md`.

## 6. Functional requirements

### REQ-001 — Open Skill format

Create a Skill folder with one `SKILL.md` using valid `name` and `description` frontmatter and progressive disclosure through `references/`.

### REQ-002 — Correct trigger

The description must trigger for Academic-Figure-svg development, investigation, batch planning, implementation, review, testing, and diff delivery. It must exclude end-user academic figure drawing.

### REQ-003 — Mandatory baseline check

The Skill must require branch, commit, repository root, and worktree status checks before production.

### REQ-004 — Source precedence

The Skill must require the current user instruction, batch Contract, PDR, stable Contract, and real code/tests to be read in the approved order.

### REQ-005 — Two-stage gate

Investigation and planning are read-only. Implementation requires explicit production scope and no active stop condition.

### REQ-006 — Existing/planned boundary

The Skill must prohibit presenting PDR plans, README statements, or non-normative drafts as implemented facts.

### REQ-007 — Reuse and compatibility

The Skill must preserve the existing document model, Core/MCP boundaries, SVG-Edit, resvg, existing services, and public MCP names unless a batch explicitly authorizes a change.

### REQ-008 — Narrow batch behavior

The Skill must prohibit unrelated refactors, future-batch work, dependency changes, workspace additions, and unapproved lockfile changes.

### REQ-009 — Stop conditions

The Skill must stop on baseline mismatch, overlapping worktree changes, scope expansion, dependency changes, public API changes, semantic ambiguity, and failed required validation.

### REQ-010 — Truthful validation and delivery

The Skill must distinguish passed, failed, not run, static inspection, and unconfirmed checks, and must define patch/manifest/validation delivery expectations.

### REQ-011 — Single authoritative copy

The committed repository must contain one authoritative Skill copy under `.agents/skills/academic-figure-development/`.

## 7. Compatibility requirements

- Do not change existing MCP tool inputs, outputs, names, or behavior.
- Do not change package boundaries or dependencies.
- Do not change `document.json`, parser/serializer, revision, snapshot, or SVG-Edit behavior.
- Keep `SKILL.md` concise and move detailed process guidance into referenced files.
- Use relative paths inside the Skill bundle.

## 8. Non-goals

- Product-facing Academic Figure generation Skill;
- Claude Code or Codex MCP registration;
- `.claude/skills/` duplication;
- `AGENTS.md` or `CLAUDE.md` generation;
- runtime Contract loading;
- business feature implementation;
- tests for product code.

## 9. Error and failure behavior

If the baseline README differs, the patch must fail `git apply --check` rather than overwrite it.

If Skill metadata is invalid, delivery must stop.

If any changed path falls outside the allowed paths, delivery must stop.

## 10. Tests and validation

### Must run

```text
Validate YAML frontmatter fields and Agent Skills name constraints.
Verify exactly one SKILL.md exists in the Skill bundle.
Verify all referenced Skill files exist.
git apply --check against the exact baseline README.
git diff --check.
```

### Static checks

```text
All changed paths are within the allowed paths.
No runtime, dependency, package, lockfile, test, PDR, or design-draft file changes.
SKILL.md remains below 500 lines.
```

### Intentionally not run

No npm build or test is required because the batch changes only instructions and development documentation.

## 11. Acceptance criteria

- All REQ items are satisfied.
- One valid Skill bundle is added.
- Contract README records the Skill location.
- No product behavior changes.
- Patch applies to the baseline.
- Static validation passes.

## 12. Stop conditions

Stop if implementation requires:

- a client-specific duplicate Skill;
- a runtime loader;
- a new dependency;
- modification outside allowed paths;
- assumptions about unverified client auto-discovery.

## 13. Diff delivery

- Patch: `Academic-Figure-MCP-Batch4-development-skill.patch`
- ZIP: `Academic-Figure-MCP-Batch4-development-skill.zip`
- Manifest: `Academic-Figure-MCP-Batch4-MANIFEST.md`
- Validation report: `Academic-Figure-MCP-Batch4-VALIDATION.md`
- Rollback: reverse-apply the patch before commit.
