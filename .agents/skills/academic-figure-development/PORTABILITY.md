# Portability and Discovery

This repository stores the canonical Skill at:

```text
.agents/skills/academic-figure-development/
```

The folder follows the open Agent Skills structure: one `SKILL.md` plus optional `references/`.

The committed repository contains one authoritative copy. Do not maintain separate divergent copies for Claude Code, Codex, VS Code, or another client.

A client that does not automatically scan `.agents/skills/` should be configured to load this directory, or the directory should be copied/symlinked into that client's native project Skill location outside the authoritative source workflow.

When copying for local installation, copy the whole folder so relative `references/` paths remain valid.

This Skill does not require product runtime changes, MCP registration changes, dependencies, or scripts.
