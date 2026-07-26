# Capability Status Contract

> **定位：Code Agent 开发护栏。** 本文用于约束实现行为，不是产品运行时协议，也不表示对应规划能力已经实现。

This table is the status boundary for implementation and Skill work at baseline commit `f8ddf7167cfa082ed68d4c0e3d0a3db0e1a2dc71`.

| Capability | Status | Existing basis | Missing for V2 |
|---|---|---|---|
| Structured SVG document | existing | `SvgDocument`, `SvgNode`, metadata | Schema versioning not established |
| SVG parser/serializer | existing | Core parser and serializer | Full round-trip guarantees not established |
| Document persistence | existing | `document.json`, `current.svg` | Unified transaction not present |
| Low-level MCP editing | existing | 20 registered tools | Task-level orchestration absent |
| Batch create | existing | `batch_create_elements` | Complete atomicity test coverage unconfirmed |
| Academic/IEEE themes | existing | Core theme files | Versioning unconfirmed |
| Building primitive | existing | `create_isometric_building` | No unified component registry |
| Communication link | existing | `create_communication_link` | Semantic routing absent |
| Callout | existing | `create_numbered_callout` | No task-level composition rules |
| Legend | existing | `create_paper_legend` | No unified asset registry |
| Repeated elements | existing | `create_repeated_elements` | Full transactional coverage unconfirmed |
| Align/distribute | existing | `align_elements`, `distribute_elements` | No general deterministic layout engine |
| PNG preview | existing | resvg render service | Font/external-resource policy unconfirmed |
| SVG export | existing | export service | Academic PDF tool absent |
| Basic Audit | existing-with-limitations | overlap, bounds, small text, density | Full Quality Gate absent |
| Revision check | existing-with-limitations | document revision and conflicts | No unified transaction/history |
| Snapshot store | existing-with-limitations | snapshot store | Timing/coverage/rollback unconfirmed |
| SVG-Edit Bridge | existing-with-limitations | HTTP Bridge and extension | Full metadata and atomicity guarantees absent |
| SVG sanitization | existing-with-limitations | generic sanitizer | Asset-specific policy/lifecycle absent |
| Claude Code MCP | existing-with-limitations | registration script and MCP config | Academic Figure Skill absent |
| Codex integration | planned | shared MCP may be usable | No verified config/docs |
| Academic Figure Family | planned | PDR only | Type, validator, consumers |
| Academic Diagram Plan | planned | PDR only | Type, validator, compiler |
| User reference image | planned | PDR only | storage, analysis, tools |
| Built-in references | planned | PDR only | registry, previews, definitions |
| Reference Scope | planned | PDR only | type and enforcement |
| Asset Registry | planned | PDR only | registry, manifest, tools |
| Custom SVG asset lifecycle | planned | generic SVG import only | import, normalize, index, insert |
| Deterministic layout | planned | align/distribute only | layout adapter and profiles |
| Connector routing | planned | basic link primitive | ports, reroute, intersections |
| Quality Gate | planned | basic Audit only | blockers and pass/fail semantics |
| Auto-fix | planned | none | supported fix operations |
| Unified transaction | planned | per-service writes | single mutation boundary |
| `operationId` idempotency | planned | none | persistence and replay semantics |
| Revision list | planned | revision field only | history API |
| Rollback | planned | snapshot store only | public operation and provenance |
| `open_in_editor` MCP tool | planned | HTTP Bridge only | task-level wrapper |
| Visual regression benchmark | planned | visual tests exist | V2 fixed task artifacts and CI |

## Skill boundary

A Skill MAY use only `existing` capabilities directly.

A Skill MAY use `existing-with-limitations` capabilities only when it reports the limitation.

A Skill MUST NOT call a `planned` capability until the capability status is updated with implementation and test evidence.
