# Local Edit Scope Contract

- **Status at baseline**: planned task-level revision behavior
- **Applies to**: natural-language modification of an existing figure

## Default scope

A local revision MUST limit changes to:

- explicitly targeted elements;
- descendants of targeted groups;
- connectors directly attached to targeted elements;
- neighboring elements that must move to resolve a proven collision or routing issue.

## Protected content

A local revision MUST preserve, unless explicitly requested:

- unrelated panels;
- unrelated groups;
- unrelated labels;
- unrelated asset choices;
- unrelated colors and themes;
- unrelated connection semantics;
- manual edits outside the target scope.

## Whole-figure operations

A whole-figure layout or style change requires explicit scope, such as:

```text
whole document
whole panel
all peer nodes
all connectors
apply theme globally
```

A local instruction MUST NOT trigger a whole-figure relayout by default.

## Supported propagation

The system MAY automatically:

- reroute connectors attached to a moved node;
- move nearby objects enough to remove a critical overlap;
- resize a target container to fit its text;
- normalize peers when the user explicitly targets the peer group.

## Reporting

A revision result SHOULD report:

- requested targets;
- actually changed element IDs;
- indirectly adjusted element IDs;
- connectors rerouted;
- layout scope;
- unchanged protected regions.

## Failure behavior

If a safe local edit cannot be completed without a broad semantic or layout change, the system SHOULD stop and request confirmation rather than silently expanding scope.
