# Asset Security Contract

- **Status at baseline**: planned Asset lifecycle; generic SVG sanitization exists
- **Applies to**: user-imported SVG assets and built-in SVG assets

## Asset source priority

The target lookup order is:

```text
workspace assets
→ user-global assets
→ built-in assets
→ basic generated SVG shapes
```

## Required import pipeline

A user SVG asset MUST pass:

```text
read
→ sanitize
→ remove or reject external dependencies
→ normalize viewBox
→ prefix internal IDs
→ optimize within approved limits
→ generate preview
→ write manifest
→ register
```

## Forbidden or restricted content

Imported assets MUST reject or remove:

- `<script>`;
- event-handler attributes;
- `javascript:` URLs;
- unapproved remote images;
- remote CSS;
- dangerous `foreignObject`;
- external active content;
- excessive recursion or complexity;
- files exceeding approved size or element limits.

## ID isolation

Internal IDs and references MUST be prefixed or otherwise isolated to prevent collisions when the asset is inserted into a document.

## Self-contained insertion

An inserted asset SHOULD be expanded as inline SVG and retain provenance metadata such as:

```xml
<g data-asset-id="workspace:custom-uav"
   data-asset-version="1.0.0">
</g>
```

The existing figure MUST remain renderable if the source asset file is later moved or deleted.

## Manifest target

A target Asset Manifest SHOULD include:

- stable asset ID;
- version;
- name;
- aliases;
- category;
- source;
- file;
- preview;
- normalized viewBox;
- style classification;
- sanitization result;
- optional source and license information.

## Current limitation

Generic SVG sanitization in the baseline MUST NOT be described as a complete Asset Registry or asset import Contract.
