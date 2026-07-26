# Quality Gate Contract

> **定位：Code Agent 开发护栏。** 本文用于约束实现行为，不是产品运行时协议，也不表示对应规划能力已经实现。

- **Current baseline**: basic Audit only
- **Target**: blocking V2 Quality Gate plus warnings

## Current Audit boundary

The baseline `audit_figure` includes checks for:

- overlap;
- bounds;
- small text;
- density.

It MUST be described as basic Audit, not as the full V2 Quality Gate.

## Target blocking checks

A figure may be marked deliverable only when:

```text
renderSucceeded = true
invalidReferences = 0
outOfBoundsElements = 0
criticalOverlaps = 0
clippedTexts = 0
connectorNodeIntersections = 0
danglingConnectorEndpoints = 0
```

## Warning checks

Warnings MAY include:

- edge crossings;
- local crowding;
- visual-weight imbalance;
- inconsistent custom-asset style;
- mild spacing inconsistency;
- low contrast;
- reference/plan composition mismatch.

Warnings do not automatically block delivery unless a later profile elevates them.

## Semantic checks

Quality Gate does not prove scientific correctness.

The system MUST separately validate or confirm:

- critical entities;
- critical relations;
- relation direction;
- step order;
- group semantics;
- key labels.

## Auto-fix boundary

Target auto-fix MAY perform deterministic changes:

- align;
- distribute;
- resize text containers;
- move elements inside the canvas;
- equalize peer sizes;
- reroute connectors;
- normalize line width and corner radius;
- constrain asset size.

Auto-fix MUST NOT:

- reverse semantic arrows;
- delete key modules;
- merge entities;
- alter algorithm order;
- rewrite key scientific labels;
- change the research hypothesis.

## Pass reporting

A result MUST NOT claim “Quality Gate passed” unless all target blocking checks are implemented and executed.

Before that point, reports MUST say which checks were actually run.
