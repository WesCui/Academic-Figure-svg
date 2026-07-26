# MCP Tool Status Contract

> **定位：Code Agent 开发护栏。** 本文用于约束实现行为，不是产品运行时协议，也不表示对应规划能力已经实现。

## Current registered tools

All tools below are registered at the accepted baseline.

| Tool | Category | Side effect | Current status | V2 note |
|---|---|---:|---|---|
| `create_document` | document | write | existing | Low-level creation |
| `load_document` | document | read | existing | Current document load |
| `create_element` | create | write | existing | Low-level element creation |
| `batch_create_elements` | create | write | existing | Observed single revision per batch |
| `create_repeated_elements` | primitive | write | existing | Current repeated-element primitive |
| `create_isometric_building` | primitive | write | existing | Candidate future component registration |
| `update_element` | update | write | existing | Low-level update |
| `transform_elements` | update/layout | write | existing | Low-level transform |
| `delete_elements` | delete | write | existing | Low-level delete |
| `get_document_tree` | query | read | existing | Structured tree inspection |
| `query_elements` | query | read | existing | Element query |
| `render_preview` | preview | render output | existing | resvg PNG preview |
| `export_svg` | export | file output | existing | Does not revise document |
| `get_document_info` | query | read | existing | Document summary |
| `create_communication_link` | primitive | write | existing | Not semantic connector routing |
| `create_numbered_callout` | primitive | write | existing | Current annotation primitive |
| `create_paper_legend` | primitive | write | existing | Current legend primitive |
| `audit_figure` | audit | read | existing-with-limitations | Basic Audit, not V2 Quality Gate |
| `align_elements` | layout | write | existing | Basic alignment only |
| `distribute_elements` | layout | write | existing | Basic distribution only |

## Planned task-level wrappers

The following names are PDR targets and are not registered at the accepted baseline:

| Planned tool | Status | Expected dependency |
|---|---|---|
| `create_figure_plan` | planned | new Diagram Plan Contract |
| `create_academic_figure` | planned | current document/create/primitive/render/audit tools |
| `revise_academic_figure` | planned | current query/update/transform/delete/layout tools |
| `add_reference_image` | planned | reference storage Contract |
| `analyze_reference_image` | planned | Host vision plus Reference Analysis Contract |
| `list_reference_images` | planned | reference store |
| `remove_reference_image` | planned | reference store |
| `list_builtin_references` | planned | built-in reference registry |
| `get_builtin_reference` | planned | built-in reference registry |
| `list_assets` | planned | Asset Registry |
| `search_assets` | planned | Asset Registry |
| `import_asset` | planned | sanitizer, normalizer, manifest |
| `insert_asset` | planned | Asset Registry and document operations |
| `remove_asset` | planned | Asset Registry |
| `fix_figure_issues` | planned | V2 Audit and supported fixes |
| `open_in_editor` | planned | existing HTTP Bridge wrapper |
| `list_revisions` | planned | revision history |
| `rollback_revision` | planned | snapshots and transaction service |

## Name compatibility

The name `audit_figure` already exists.

V2 MUST either:

- extend its output compatibly; or
- introduce explicit versioning.

V2 MUST NOT register a second incompatible tool with the same name.

## Tool availability rule

A Skill or documentation example MUST NOT call a planned tool as if it exists.

Compatibility workflows may orchestrate current low-level tools until the task-level wrappers are implemented.
