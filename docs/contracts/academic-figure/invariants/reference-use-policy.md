# Reference Use Policy

- **Status at baseline**: planned
- **Applies to**: user-provided references and MCP built-in references
- **Reference search**: out of scope for the current V2 plan

## Reference sources

V2 may use:

1. a user-provided PNG, JPG, or SVG reference;
2. a user-selected built-in reference;
3. an Agent-selected built-in reference from the small built-in list;
4. no reference.

V2 does not require a vector database or large-scale reference retrieval.

## Reference scopes

The target Reference Scope values are:

```text
composition
style
components
full
```

`full` means all allowed reference aspects. It does not permit copying prohibited content.

## Content ownership

User requirements, paper text, code context, and explicit user confirmation determine the current figure's research content.

A reference image may guide:

- panel structure;
- region placement;
- reading direction;
- information density;
- line-style categories;
- visual hierarchy;
- palette size;
- general component treatment.

## Prohibited default copying

The system MUST NOT copy by default:

- original labels;
- paper-specific scientific claims;
- exact coordinates;
- unique artwork;
- logos;
- unverifiable licensed assets;
- complex objects cropped from a reference image.

## Reference analysis output

Reference analysis SHOULD be constrained to:

- probable figure family;
- composition;
- regions;
- direction;
- panel count;
- central object;
- parallel branches;
- inset detail;
- dimensionality;
- density;
- icon usage;
- border style;
- palette description;
- reusable patterns.

It SHOULD NOT contain an unrestricted pixel-to-SVG reconstruction.

## Built-in references

Built-in references MUST:

- be project-created or legally distributable;
- include a stable ID;
- include family and layout metadata;
- include a preview;
- document intended use;
- avoid embedding copied paper figures.

## Ambiguity

When a user says only “参考这张图”:

- automatic mode may default to `composition`;
- plan-confirmation mode SHOULD surface the assumed scope;
- the system MUST NOT silently assume permission to reproduce all content.
