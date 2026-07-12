/**
 * High-level academic figure primitives.
 *
 * These tools generate complex SVG structures from a single call,
 * dramatically reducing the number of MCP round-trips needed to
 * create common academic diagram elements.
 *
 * Each primitive generates the full element hierarchy, positions
 * children correctly, applies metadata, and returns a unified
 * WriteResult with all affected element IDs.
 *
 * @module primitive-service
 */

import type { SvgElementType, SvgMetadata, SemanticLinkType, SvgNode } from "@academic-figure/core";
import { resolveLinkColor, resolveTheme as resolveThemeFn, ensureNode } from "@academic-figure/core";
import type { DocumentService, WriteResult } from "./document-service.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface IsometricBuildingInput {
  documentId: string;
  parentId?: string;

  /** Custom element ID for the building group */
  id?: string;

  /** Anchor X (bottom-left of front face) */
  x: number;
  /** Anchor Y (bottom of front face) */
  y: number;

  /** Building width in user units */
  width: number;
  /** Building depth in user units (along isometric axis) */
  depth: number;
  /** Building height in user units */
  height: number;

  /** Number of floors (controls window count) */
  floors?: number;

  /** Isometric perspective offsets */
  perspective?: {
    /** Horizontal offset for the depth axis */
    dx: number;
    /** Vertical offset for the depth axis (usually negative) */
    dy: number;
  };

  /** Facade styling */
  facade?: {
    frontFill?: string;
    sideFill?: string;
    roofFill?: string;
    stroke?: string;
    strokeWidth?: number;

    windowFill?: string;
    windowStroke?: string;
    windowWidth?: number;
    windowHeight?: number;
    windowColumns?: number;
    windowMarginX?: number;
    windowMarginY?: number;
  };

  /** Rooftop equipment */
  rooftop?: {
    enabled?: boolean;
    hvacUnits?: number;
  };

  /** Entrance */
  entrance?: {
    enabled?: boolean;
    canopy?: boolean;
  };

  /** Semantic metadata attached to the building group */
  metadata?: SvgMetadata;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULTS = {
  floors: 8,
  perspective: { dx: 60, dy: -30 },
  facade: {
    frontFill: "#E8ECF1",
    sideFill: "#D4D9E0",
    roofFill: "#C8CDD3",
    stroke: "#8899AA",
    strokeWidth: 1,
    windowFill: "#AFCBE0",
    windowStroke: "#6889A3",
    windowWidth: 14,
    windowHeight: 18,
    windowColumns: 5,
    windowMarginX: 24,
    windowMarginY: 32,
  },
  rooftop: {
    enabled: true,
    hvacUnits: 2,
  },
  entrance: {
    enabled: true,
    canopy: true,
  },
};

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class PrimitiveService {
  constructor(private readonly documentService: DocumentService) {}

  /**
   * Create a complete isometric/axonometric building.
   *
   * Generates:
   *   building/
   *   ├── front-facade       (rect)
   *   ├── side-facade        (polygon)
   *   ├── roof               (polygon)
   *   ├── windows/           (g)
   *   │   ├── window_0_0
   *   │   └── …
   *   ├── rooftop-equipment/ (g)
   *   │   ├── hvac_1
   *   │   └── hvac_2
   *   └── entrance/          (g)
   *       ├── door
   *       └── canopy          (optional)
   */
  public async createIsometricBuilding(
    input: IsometricBuildingInput,
    expectedRevision?: number,
  ): Promise<WriteResult> {
    const p = { ...DEFAULTS.perspective, ...input.perspective };
    const f = { ...DEFAULTS.facade, ...input.facade };
    const r = { ...DEFAULTS.rooftop, ...input.rooftop };
    const e = { ...DEFAULTS.entrance, ...input.entrance };
    const floors = input.floors ?? DEFAULTS.floors;

    const buildingId = input.id ?? `building_${Math.random().toString(36).slice(2, 8)}`;
    const parentId = input.parentId ?? "root";

    // ---- Step 1: Create the building group ----
    const groupResult = await this.documentService.createElement(
      input.documentId,
      {
        parentId,
        id: buildingId,
        type: "g",
        name: `Building ${buildingId}`,
        attributes: {},
        metadata: input.metadata ?? { role: "building", importance: "primary" },
      },
      expectedRevision,
    );

    const allIds: string[] = [buildingId];

    // ---- Step 2: Front facade (rect) ----
    const frontResult = await this.documentService.createElement(
      input.documentId,
      {
        parentId: buildingId,
        id: `${buildingId}-front`,
        type: "rect",
        name: "Front Facade",
        attributes: {
          x: input.x,
          y: input.y - input.height,
          width: input.width,
          height: input.height,
          fill: f.frontFill!,
          stroke: f.stroke!,
          "stroke-width": f.strokeWidth!,
        },
        metadata: { role: "building", importance: "primary" },
      },
    );
    allIds.push(`${buildingId}-front`);

    // ---- Step 3: Side facade (polygon — parallelogram) ----
    const sideTopX = input.x + input.width;
    const sideTopY = input.y - input.height;
    const sideResult = await this.documentService.createElement(
      input.documentId,
      {
        parentId: buildingId,
        id: `${buildingId}-side`,
        type: "polygon",
        name: "Side Facade",
        attributes: {
          points: [
            `${sideTopX},${sideTopY}`,
            `${sideTopX + p.dx},${sideTopY + p.dy}`,
            `${sideTopX + p.dx},${sideTopY + p.dy + input.height}`,
            `${sideTopX},${sideTopY + input.height}`,
          ].join(" "),
          fill: f.sideFill!,
          stroke: f.stroke!,
          "stroke-width": f.strokeWidth!,
        },
        metadata: { role: "building", importance: "primary" },
      },
    );
    allIds.push(`${buildingId}-side`);

    // ---- Step 4: Roof (polygon) ----
    const roofResult = await this.documentService.createElement(
      input.documentId,
      {
        parentId: buildingId,
        id: `${buildingId}-roof`,
        type: "polygon",
        name: "Roof",
        attributes: {
          points: [
            `${input.x},${input.y - input.height}`,
            `${input.x + input.width},${input.y - input.height}`,
            `${input.x + input.width + p.dx},${input.y - input.height + p.dy}`,
            `${input.x + p.dx},${input.y - input.height + p.dy}`,
          ].join(" "),
          fill: f.roofFill!,
          stroke: f.stroke!,
          "stroke-width": f.strokeWidth!,
        },
        metadata: { role: "building", importance: "primary" },
      },
    );
    allIds.push(`${buildingId}-roof`);

    // ---- Step 5: Window grid (on front facade) ----
    const windowsGroupResult = await this.documentService.createElement(
      input.documentId,
      {
        parentId: buildingId,
        id: `${buildingId}-windows`,
        type: "g",
        name: "Windows",
        attributes: {},
        metadata: { role: "building", importance: "secondary" },
      },
    );
    allIds.push(`${buildingId}-windows`);

    const windowRows = floors - 1; // top floor has windows at top
    const windowCols = f.windowColumns!;
    const windowW = f.windowWidth!;
    const windowH = f.windowHeight!;
    const marginX = f.windowMarginX!;
    const marginY = f.windowMarginY!;
    // Calculate dynamic spacing
    const totalColSpace = input.width - marginX * 2;
    const colSpacing = windowCols > 1 ? totalColSpace / (windowCols - 1) : input.width / 2;
    const totalRowSpace = input.height - marginY * 2;
    const rowSpacing = windowRows > 1 ? totalRowSpace / (windowRows - 1) : input.height / 2;

    if (windowRows > 0 && windowCols > 0) {
      const gridResult = await this.documentService.createRepeatedElements({
        documentId: input.documentId,
        parentId: `${buildingId}-windows`,
        template: {
          type: "rect" as SvgElementType,
          attributes: {
            width: windowW,
            height: windowH,
            fill: f.windowFill!,
            stroke: f.windowStroke!,
            "stroke-width": 0.8,
          },
          namePrefix: `${buildingId}-window`,
        },
        layout: {
          rows: windowRows,
          columns: windowCols,
          startX: input.x + marginX - windowW / 2,
          startY: input.y - input.height + marginY,
          stepX: colSpacing,
          stepY: rowSpacing,
        },
      });
      allIds.push(...gridResult.affectedElementIds);
    }

    // ---- Step 6: Rooftop equipment ----
    if (r.enabled && r.hvacUnits! > 0) {
      const rooftopGroupResult = await this.documentService.createElement(
        input.documentId,
        {
          parentId: buildingId,
          id: `${buildingId}-rooftop`,
          type: "g",
          name: "Rooftop Equipment",
          attributes: {},
          metadata: { role: "building", importance: "background" },
        },
      );
      allIds.push(`${buildingId}-rooftop`);

      const roofCenterX = input.x + input.width / 2 + p.dx / 2;
      const roofY = input.y - input.height + p.dy;

      for (let i = 0; i < r.hvacUnits!; i++) {
        const offsetX = (i - (r.hvacUnits! - 1) / 2) * (input.width * 0.15);
        const hvacResult = await this.documentService.createElement(
          input.documentId,
          {
            parentId: `${buildingId}-rooftop`,
            id: `${buildingId}-hvac-${i + 1}`,
            type: "rect",
            name: `HVAC Unit ${i + 1}`,
            attributes: {
              x: roofCenterX + offsetX - 8,
              y: roofY - 8,
              width: 16,
              height: 10,
              fill: "#999",
              stroke: "#777",
              "stroke-width": 0.5,
            },
            metadata: { role: "building", importance: "background" },
          },
        );
        allIds.push(hvacResult.affectedElementIds[0] ?? "");
      }
    }

    // ---- Step 7: Entrance ----
    if (e.enabled) {
      const entranceGroupResult = await this.documentService.createElement(
        input.documentId,
        {
          parentId: buildingId,
          id: `${buildingId}-entrance`,
          type: "g",
          name: "Entrance",
          attributes: {},
          metadata: { role: "building", importance: "primary" },
        },
      );
      allIds.push(`${buildingId}-entrance`);

      const doorW = input.width * 0.12;
      const doorH = input.height * 0.18;
      const doorX = input.x + input.width / 2 - doorW / 2;
      const doorY = input.y - doorH;

      const doorResult = await this.documentService.createElement(
        input.documentId,
        {
          parentId: `${buildingId}-entrance`,
          id: `${buildingId}-door`,
          type: "rect",
          name: "Door",
          attributes: {
            x: doorX,
            y: doorY,
            width: doorW,
            height: doorH,
            fill: "#5A6B7D",
            stroke: f.stroke!,
            "stroke-width": 0.8,
          },
          metadata: { role: "building", importance: "primary" },
        },
      );
      allIds.push(`${buildingId}-door`);

      if (e.canopy) {
        const canopyW = doorW * 2;
        const canopyH = 6;
        const canopyResult = await this.documentService.createElement(
          input.documentId,
          {
            parentId: `${buildingId}-entrance`,
            id: `${buildingId}-canopy`,
            type: "rect",
            name: "Canopy",
            attributes: {
              x: doorX - (canopyW - doorW) / 2,
              y: doorY - canopyH,
              width: canopyW,
              height: canopyH,
              fill: "#8899AA",
              stroke: f.stroke!,
              "stroke-width": 0.8,
            },
            metadata: { role: "building", importance: "secondary" },
          },
        );
        allIds.push(`${buildingId}-canopy`);
      }
    }

    // Return the fresh document state
    const document = await this.documentService.getDocument(input.documentId);

    return {
      success: true,
      documentId: input.documentId,
      revision: document.revision,
      affectedElementIds: allIds.filter(Boolean),
      extra: {
        generatedNodeCount: allIds.length,
        buildingId,
        hasWindows: windowRows > 0 && windowCols > 0,
        windowCount: windowRows * windowCols,
        hasRooftop: r.enabled,
        hasEntrance: e.enabled,
      },
    };
  }

  // -------------------------------------------------------------------
  // Building presets
  // -------------------------------------------------------------------

  private applyPreset(preset: string): Partial<IsometricBuildingInput> {
    const presets: Record<string, Partial<IsometricBuildingInput>> = {
      "academic-tower": {
        facade: { frontFill: "#E8EDF2", sideFill: "#D4DAE2", roofFill: "#C5CAD3", windowFill: "#B0C8E0", windowColumns: 5 },
        rooftop: { enabled: true, hvacUnits: 2 },
        entrance: { enabled: true, canopy: true },
      },
      "office-glass": {
        facade: { frontFill: "#A8C8E8", sideFill: "#8BAECF", roofFill: "#9FB8D0", windowFill: "#D6E8F8", windowColumns: 8, windowWidth: 20, windowHeight: 20 },
        rooftop: { enabled: true, hvacUnits: 3 },
        entrance: { enabled: true, canopy: false },
      },
      "campus-low-rise": {
        facade: { frontFill: "#D4C5B8", sideFill: "#C4B5A8", roofFill: "#B5A598", windowFill: "#F5EDE0", windowColumns: 4 },
        rooftop: { enabled: false },
        entrance: { enabled: true, canopy: true },
      },
      "urban-residential": {
        facade: { frontFill: "#E0D8CF", sideFill: "#D0C8BF", roofFill: "#C4B8AF", windowFill: "#F0E8DF", windowColumns: 3, windowWidth: 16, windowHeight: 22 },
        rooftop: { enabled: false },
        entrance: { enabled: true, canopy: true },
      },
    };
    return presets[preset] ?? {};
  }

  public async createIsometricBuildingWithPreset(
    input: IsometricBuildingInput & { preset?: string },
    expectedRevision?: number,
  ): Promise<WriteResult> {
    if (input.preset) {
      const presetConfig = this.applyPreset(input.preset);
      input = { ...presetConfig, ...input };
    }
    return this.createIsometricBuilding(input, expectedRevision);
  }

  // -------------------------------------------------------------------
  // Communication Link
  // -------------------------------------------------------------------

  public async createCommunicationLink(
    input: CommunicationLinkInput,
    expectedRevision?: number,
  ): Promise<WriteResult> {
    const theme = await this.getTheme(input.theme);
    const linkColor = resolveLinkColor(theme, input.semanticType);
    const parentId = input.parentId ?? "root";
    const allIds: string[] = [];
    const linkId = input.id ?? `link_${Math.random().toString(36).slice(2, 8)}`;

    // Resolve start/end points
    let startX: number, startY: number, endX: number, endY: number;
    const doc = await this.documentService.getDocument(input.documentId);

    if (input.sourceId) {
      const srcCenter = this.getElementCenter(doc.root, input.sourceId);
      startX = input.start?.x ?? srcCenter.x;
      startY = input.start?.y ?? srcCenter.y;
    } else {
      startX = input.start!.x;
      startY = input.start!.y;
    }

    if (input.targetId) {
      const tgtCenter = this.getElementCenter(doc.root, input.targetId);
      endX = input.end?.x ?? tgtCenter.x;
      endY = input.end?.y ?? tgtCenter.y;
    } else {
      endX = input.end!.x;
      endY = input.end!.y;
    }

    const strokeWidth = input.style?.strokeWidth ?? theme.strokes.linkNormal;
    const isDashed = input.style?.dashed ??
      (input.semanticType === "leakage" || input.semanticType === "trajectory");
    const opacity = input.style?.opacity ?? (input.semanticType === "artificial-noise" ? 0.4 : 1);

    // Create the line/curve/beam
    if (input.geometry?.type === "curve") {
      // Real curve geometry: quadratic bezier path
      const cpX = input.geometry?.curvature
        ? (startX + endX) / 2 + input.geometry.curvature
        : (startX + endX) / 2;
      const cpY = input.geometry?.curvature
        ? (startY + endY) / 2 - Math.abs(input.geometry.curvature)
        : Math.min(startY, endY) - Math.abs(endX - startX) * 0.3;

      const attrs: Record<string, string | number> = {
        d: `M${startX},${startY} Q${cpX},${cpY} ${endX},${endY}`,
        fill: "none",
        stroke: linkColor,
        "stroke-width": strokeWidth,
        opacity,
      };
      if (isDashed) attrs["stroke-dasharray"] = "3,3";

      await this.documentService.createElement(input.documentId, {
        parentId, id: linkId, type: "path", name: input.semanticType,
        attributes: attrs,
        metadata: { role: "communication-link", tags: [input.semanticType] },
      }, expectedRevision);
    } else if (input.geometry?.type === "beam" && startY !== undefined) {
      // Beam: polygon from source to target with width
      const bw = input.geometry?.beamWidth ?? 12;
      const dx = endX - startX;
      const dy = endY - startY;
      const len = Math.sqrt(dx * dx + dy * dy);
      const nx = -dy / len * bw / 2;
      const ny = dx / len * bw / 2;

      await this.documentService.createElement(input.documentId, {
        parentId,
        id: linkId,
        type: "polygon",
        name: input.semanticType,
        attributes: {
          points: [
            `${startX + nx},${startY + ny}`,
            `${endX + nx},${endY + ny}`,
            `${endX - nx},${endY - ny}`,
            `${startX - nx},${startY - ny}`,
          ].join(" "),
          fill: linkColor,
          opacity,
        },
        metadata: { role: "communication-link", tags: [input.semanticType] },
      }, expectedRevision);
    } else {
      // Line or curve
      const attrs: Record<string, string | number> = {
        x1: startX, y1: startY,
        x2: endX, y2: endY,
        stroke: linkColor,
        "stroke-width": strokeWidth,
        opacity,
      };
      if (isDashed) {
        attrs["stroke-dasharray"] = input.semanticType === "leakage" ? "5,5" : "3,3";
      }

      await this.documentService.createElement(input.documentId, {
        parentId,
        id: linkId,
        type: "line",
        name: input.semanticType,
        attributes: attrs,
        metadata: { role: "communication-link", tags: [input.semanticType] },
      }, expectedRevision);
    }
    allIds.push(linkId);

    // Optional arrowhead marker
    if (input.style?.arrowhead !== false) {
      const arrowId = `${linkId}-arrow`;
      const arrowSize = 8;
      const angle = Math.atan2(endY - startY, endX - startX);
      const ax = endX - arrowSize * Math.cos(angle - Math.PI / 6);
      const ay = endY - arrowSize * Math.sin(angle - Math.PI / 6);
      const bx = endX - arrowSize * Math.cos(angle + Math.PI / 6);
      const by = endY - arrowSize * Math.sin(angle + Math.PI / 6);

      await this.documentService.createElement(input.documentId, {
        parentId,
        id: arrowId,
        type: "polygon",
        name: "arrowhead",
        attributes: {
          points: `${endX},${endY} ${ax},${ay} ${bx},${by}`,
          fill: linkColor,
          opacity,
        },
        metadata: { role: "communication-link", importance: "secondary" },
      }, expectedRevision);
      allIds.push(arrowId);
    }

    const document = await this.documentService.getDocument(input.documentId);
    return {
      success: true,
      documentId: input.documentId,
      revision: document.revision,
      affectedElementIds: allIds,
      extra: { semanticType: input.semanticType, color: linkColor },
    };
  }

  // -------------------------------------------------------------------
  // Numbered Callout
  // -------------------------------------------------------------------

  public async createNumberedCallout(
    input: NumberedCalloutInput,
    expectedRevision?: number,
  ): Promise<WriteResult> {
    const theme = this.getTheme(input.theme);
    const parentId = input.parentId ?? "root";
    const allIds: string[] = [];
    const calloutId = input.id ?? `callout_${Math.random().toString(36).slice(2, 6)}`;
    const variant = input.variant ?? "boxed";

    // ---- Numbered circle marker (all variants) ----
    const markerId = `${calloutId}-marker`;
    await this.documentService.createElement(input.documentId, {
      parentId,
      id: markerId,
      type: "circle",
      name: `Callout ${input.number}`,
      attributes: {
        cx: input.x,
        cy: input.y,
        r: theme.geometry.calloutRadius,
        fill: theme.colors.calloutFill,
        stroke: theme.colors.calloutStroke,
        "stroke-width": 1.5,
      },
      metadata: { role: "annotation", tags: ["callout"] },
    }, expectedRevision);
    allIds.push(markerId);

    // Number text inside circle
    const numberId = `${calloutId}-number`;
    await this.documentService.createElement(input.documentId, {
      parentId,
      id: numberId,
      type: "text",
      name: `Callout number ${input.number}`,
      attributes: {
        x: input.x,
        y: input.y + theme.geometry.calloutRadius * 0.35,
        "font-family": theme.typography.fontFamily,
        "font-size": theme.typography.calloutSize * 0.65,
        "text-anchor": "middle",
        fill: theme.colors.textPrimary,
      },
      text: String(input.number),
      metadata: { role: "annotation", tags: ["callout-number"] },
    }, expectedRevision);
    allIds.push(numberId);

    // Leader line from marker to label
    if (input.labelPosition) {
      const lp = input.labelPosition;
      const leaderId = `${calloutId}-leader`;
      await this.documentService.createElement(input.documentId, {
        parentId,
        id: leaderId,
        type: "line",
        name: "Leader",
        attributes: {
          x1: input.x + theme.geometry.calloutRadius * (lp.x > input.x ? 1 : -1),
          y1: input.y,
          x2: lp.x,
          y2: lp.y,
          stroke: theme.colors.textSecondary,
          "stroke-width": theme.strokes.thin,
        },
        metadata: { role: "annotation", importance: "background" },
      }, expectedRevision);
      allIds.push(leaderId);
    }

    // Label text (skip for leader-only variant)
    // Supports \n for multiline labels — generates multiple tspan lines
    if (input.label && variant !== "leader-only") {
      const lines = input.label.split("\\n");
      const labelX = input.labelPosition?.x ?? input.x + 20;
      const baseLabelY = input.labelPosition?.y ?? input.y + 4;
      const lineHeight = theme.typography.calloutSize * 1.3;
      const fontSize = theme.typography.calloutSize * 0.85;

      // Boxed variant: light background rect behind all lines
      if (variant === "boxed") {
        const boxPad = 8;
        const maxLineLen = Math.max(...lines.map((l) => l.length));
        const textW = maxLineLen * fontSize * 0.55 + boxPad * 2;
        const textH = lines.length * lineHeight + boxPad;
        const boxId = `${calloutId}-box`;
        await this.documentService.createElement(input.documentId, {
          parentId, id: boxId, type: "rect", name: "Callout Box",
          attributes: {
            x: labelX - boxPad,
            y: baseLabelY - lineHeight + boxPad * 0.3,
            width: textW,
            height: textH,
            rx: 3,
            fill: theme.colors.calloutFill,
            stroke: theme.colors.calloutStroke,
            "stroke-width": 0.8,
            opacity: 0.7,
          },
          metadata: { role: "annotation", importance: "background" },
        }, expectedRevision);
        allIds.push(boxId);
      }

      // Create each line as a separate text element (SVG text doesn't auto-wrap)
      for (let li = 0; li < lines.length; li++) {
        const lineY = baseLabelY + li * lineHeight;
        const labelId = li === 0 ? `${calloutId}-label` : `${calloutId}-label-l${li}`;
        await this.documentService.createElement(input.documentId, {
          parentId,
          id: labelId,
          type: "text",
          name: `Label ${input.number} line ${li + 1}`,
          attributes: {
            x: labelX,
            y: lineY,
            "font-family": theme.typography.fontFamily,
            "font-size": fontSize,
            fill: theme.colors.textPrimary,
          },
          text: lines[li]!,
          metadata: { role: "annotation", tags: ["callout-label"] },
        }, expectedRevision);
        allIds.push(labelId);
      }
    }

    const document = await this.documentService.getDocument(input.documentId);
    return {
      success: true,
      documentId: input.documentId,
      revision: document.revision,
      affectedElementIds: allIds,
      extra: { number: input.number, label: input.label, variant },
    };
  }

  // -------------------------------------------------------------------
  // Paper Legend
  // -------------------------------------------------------------------

  public async createPaperLegend(
    input: LegendInput,
    expectedRevision?: number,
  ): Promise<WriteResult> {
    const theme = await this.getTheme(input.theme);
    const parentId = input.parentId ?? "root";
    const allIds: string[] = [];
    const legendId = input.id ?? `legend_${Math.random().toString(36).slice(2, 6)}`;
    const pad = theme.geometry.legendPadding;
    const entryH = 24;
    const titleH = input.title ? 28 : 0;
    const totalH = titleH + input.entries.length * entryH + pad * 2;
    const totalW = 220;

    // Legend background
    const bgId = `${legendId}-bg`;
    await this.documentService.createElement(input.documentId, {
      parentId, id: bgId, type: "rect", name: "Legend Box",
      attributes: {
        x: input.x, y: input.y, width: totalW, height: totalH,
        rx: theme.geometry.legendCornerRadius,
        fill: theme.colors.legendFill,
        stroke: theme.colors.legendStroke,
        "stroke-width": 1,
      },
      metadata: { role: "legend", importance: "secondary" },
    }, expectedRevision);
    allIds.push(bgId);

    // Title
    if (input.title) {
      const titleId = `${legendId}-title`;
      await this.documentService.createElement(input.documentId, {
        parentId, id: titleId, type: "text", name: "Legend Title",
        attributes: {
          x: input.x + pad, y: input.y + pad + 18,
          "font-family": theme.typography.fontFamily,
          "font-size": theme.typography.legendSize,
          fill: theme.colors.textPrimary,
          "font-weight": "bold",
        },
        text: input.title,
        metadata: { role: "legend" },
      }, expectedRevision);
      allIds.push(titleId);
    }

    // Entries
    for (let i = 0; i < input.entries.length; i++) {
      const entry = input.entries[i]!;
      const ey = input.y + pad + titleH + i * entryH;
      const entryId = `${legendId}-entry-${i}`;
      const isLineEntry = "type" in entry && entry.type === "line";

      const isShapeEntry = "type" in entry && entry.type === "shape";

      if (isShapeEntry) {
        const shapeEntry = entry as LegendShapeEntry;
        const sz = shapeEntry.size ?? 12;
        const sx = input.x + pad + sz / 2;
        const sy = ey + 12;

        if (shapeEntry.shape === "circle") {
          await this.documentService.createElement(input.documentId, {
            parentId, id: `${entryId}-shape`, type: "circle", name: shapeEntry.label,
            attributes: {
              cx: sx, cy: sy, r: sz / 2,
              fill: shapeEntry.color,
              stroke: shapeEntry.borderColor ?? "none",
              "stroke-width": shapeEntry.borderColor ? 1 : 0,
            },
            metadata: { role: "legend" },
          }, expectedRevision);
          allIds.push(`${entryId}-shape`);
        } else if (shapeEntry.shape === "rect") {
          await this.documentService.createElement(input.documentId, {
            parentId, id: `${entryId}-shape`, type: "rect", name: shapeEntry.label,
            attributes: {
              x: sx - sz / 2, y: sy - sz / 2, width: sz, height: sz, rx: 2,
              fill: shapeEntry.color,
              stroke: shapeEntry.borderColor ?? "none",
              "stroke-width": shapeEntry.borderColor ? 1 : 0,
            },
            metadata: { role: "legend" },
          }, expectedRevision);
          allIds.push(`${entryId}-shape`);
        } else if (shapeEntry.shape === "diamond") {
          const hs = sz / 2;
          await this.documentService.createElement(input.documentId, {
            parentId, id: `${entryId}-shape`, type: "polygon", name: shapeEntry.label,
            attributes: {
              points: `${sx},${sy - hs} ${sx + hs},${sy} ${sx},${sy + hs} ${sx - hs},${sy}`,
              fill: shapeEntry.color,
              stroke: shapeEntry.borderColor ?? "none",
              "stroke-width": shapeEntry.borderColor ? 1 : 0,
            },
            metadata: { role: "legend" },
          }, expectedRevision);
          allIds.push(`${entryId}-shape`);
        } else if (shapeEntry.shape === "ellipse") {
          await this.documentService.createElement(input.documentId, {
            parentId, id: `${entryId}-shape`, type: "ellipse", name: shapeEntry.label,
            attributes: {
              cx: sx, cy: sy, rx: sz / 2, ry: sz / 3,
              fill: shapeEntry.color,
              stroke: shapeEntry.borderColor ?? "none",
              "stroke-width": shapeEntry.borderColor ? 1 : 0,
            },
            metadata: { role: "legend" },
          }, expectedRevision);
          allIds.push(`${entryId}-shape`);
        }
      } else if (isLineEntry) {
        const lineEntry = entry as LegendLineEntry;
        const linkColor = resolveLinkColor(theme, lineEntry.semanticType);
        const isDashed = lineEntry.semanticType === "leakage" || lineEntry.semanticType === "trajectory";
        const dashAttr = isDashed
          ? { "stroke-dasharray": lineEntry.semanticType === "leakage" ? "5,5" : "3,3" }
          : {};

        // Draw a sample line segment + arrow
        const lineSwatchId = `${entryId}-line`;
        const attrs: Record<string, string | number> = {
          x1: input.x + pad, y1: ey + 12,
          x2: input.x + pad + 28, y2: ey + 12,
          stroke: linkColor,
          "stroke-width": theme.strokes.linkNormal,
        };
        if (isDashed) attrs["stroke-dasharray"] = dashAttr["stroke-dasharray"]!;

        await this.documentService.createElement(input.documentId, {
          parentId, id: lineSwatchId, type: "line", name: lineEntry.label,
          attributes: attrs,
          metadata: { role: "legend" },
        }, expectedRevision);
        allIds.push(lineSwatchId);

        // Arrowhead for line entries
        const arrowId = `${entryId}-arrow`;
        await this.documentService.createElement(input.documentId, {
          parentId, id: arrowId, type: "polygon", name: "arrow",
          attributes: {
            points: `${input.x + pad + 28},${ey + 12} ${input.x + pad + 20},${ey + 7} ${input.x + pad + 20},${ey + 17}`,
            fill: linkColor,
          },
          metadata: { role: "legend", importance: "secondary" },
        }, expectedRevision);
        allIds.push(arrowId);
      } else {
        const colorEntry = entry as LegendColorEntry;
        // Color swatch
        const swatchId = `${entryId}-swatch`;
        await this.documentService.createElement(input.documentId, {
          parentId, id: swatchId, type: "rect", name: colorEntry.label,
          attributes: {
            x: input.x + pad, y: ey + 4, width: 16, height: 16,
            rx: 2, fill: colorEntry.color,
            stroke: colorEntry.borderColor ?? "none",
            "stroke-width": colorEntry.borderColor ? 0.8 : 0,
          },
          metadata: { role: "legend" },
        }, expectedRevision);
        allIds.push(swatchId);
      }

      // Label (common)
      const labelText = "label" in entry ? entry.label : "";
      const labelId = `${entryId}-label`;
      await this.documentService.createElement(input.documentId, {
        parentId, id: labelId, type: "text", name: labelText,
        attributes: {
          x: input.x + pad + 36, y: ey + 16,
          "font-family": theme.typography.fontFamily,
          "font-size": theme.typography.legendSize * 0.85,
          fill: theme.colors.textSecondary,
        },
        text: labelText,
        metadata: { role: "legend" },
      }, expectedRevision);
      allIds.push(labelId);
    }

    const document = await this.documentService.getDocument(input.documentId);
    return {
      success: true,
      documentId: input.documentId,
      revision: document.revision,
      affectedElementIds: allIds,
      extra: { entryCount: input.entries.length },
    };
  }

  // -------------------------------------------------------------------
  // Figure Audit
  // -------------------------------------------------------------------

  public async auditFigure(
    documentId: string,
    checks?: string[],
  ): Promise<AuditReport> {
    const theme = await this.getTheme();
    const doc = await this.documentService.getDocument(documentId);
    const allChecks = checks ?? ["overlap", "bounds", "text-size", "contrast", "density"];
    const report: AuditReport = { documentId, revision: doc.revision, issues: [] };
    const nodes = this.collectAllNodes(doc.root);

    if (allChecks.includes("overlap")) {
      const rects = nodes.filter((n) =>
        n.type === "rect" && n.attributes["x"] !== undefined && n.attributes["width"] !== undefined
      );
      for (let i = 0; i < rects.length; i++) {
        for (let j = i + 1; j < rects.length; j++) {
          const nodeA = rects[i]!;
          const nodeB = rects[j]!;
          const a = this.getRect(nodeA);
          const b = this.getRect(nodeB);
          if (a && b && this.rectsOverlap(a, b)) {
            // Role-based overlap policy
            const roleA = nodeA.metadata?.role ?? "unknown";
            const roleB = nodeB.metadata?.role ?? "unknown";
            const policy = this.getOverlapPolicy(roleA, roleB);

            if (policy === "allow") continue; // skip allowed overlaps

            report.issues.push({
              type: "overlap",
              severity: policy,
              elementA: nodeA.id,
              elementB: nodeB.id,
              message: `${nodeA.id} (${roleA}) overlaps ${nodeB.id} (${roleB})`,
            });
          }
        }
      }
    }

    if (allChecks.includes("bounds")) {
      for (const node of nodes) {
        const x = node.attributes["x"] as number | undefined;
        const y = node.attributes["y"] as number | undefined;
        const cx = node.attributes["cx"] as number | undefined;
        const cy = node.attributes["cy"] as number | undefined;
        const nx = x ?? cx;
        const ny = y ?? cy;
        if (nx !== undefined && (nx < -50 || nx > doc.width + 50)) {
          report.issues.push({ type: "bounds", severity: "warning", elementId: node.id, message: `${node.id} x=${nx} out of canvas` });
        }
        if (ny !== undefined && (ny < -50 || ny > doc.height + 50)) {
          report.issues.push({ type: "bounds", severity: "warning", elementId: node.id, message: `${node.id} y=${ny} out of canvas` });
        }
      }
    }

    if (allChecks.includes("text-size")) {
      const minSize = theme.typography.axisLabelSize * 0.6;
      for (const node of nodes) {
        if (node.type === "text") {
          const fs = node.attributes["font-size"] as number | undefined;
          if (fs && fs < minSize) {
            report.issues.push({ type: "text-size", severity: "info", elementId: node.id, message: `${node.id} font-size=${fs} is small` });
          }
        }
      }
    }

    if (allChecks.includes("density")) {
      const cellSize = 200;
      const grid = new Map<string, number>();
      for (const node of nodes) {
        const cx = this.getNodeCenter(node);
        if (cx) {
          const cellKey = `${Math.floor(cx.x / cellSize)},${Math.floor(cx.y / cellSize)}`;
          grid.set(cellKey, (grid.get(cellKey) ?? 0) + 1);
        }
      }
      for (const [key, count] of grid) {
        if (count > 20) {
          const [cx, cy] = key.split(",").map(Number);
          report.issues.push({
            type: "density",
            severity: "info",
            message: `Dense region at (${cx! * cellSize}, ${cy! * cellSize}): ${count} nodes`,
          });
        }
      }
    }

    report.summary = {
      totalIssues: report.issues.length,
      bySeverity: {
        error: report.issues.filter((i) => i.severity === "error").length,
        warning: report.issues.filter((i) => i.severity === "warning").length,
        info: report.issues.filter((i) => i.severity === "info").length,
      },
    };

    report.disclaimer =
      "Geometric audit is complementary to AI visual inspection. " +
      "It CAN detect: bounding-box overlaps, out-of-bounds elements, small text, dense regions. " +
      "It CANNOT detect: semantic errors (mislabeled callouts), color harmony issues, " +
      "misleading visual hierarchy, incorrect arrowhead placement, or aesthetic problems. " +
      "Always follow up audit_figure with render_preview for visual confirmation.";

    return report;
  }

  // -------------------------------------------------------------------
  // Layout helpers
  // -------------------------------------------------------------------

  /** Align a set of elements along an axis, with optional relativeTo target. */
  public async alignElements(
    documentId: string,
    elementIds: string[],
    alignment: "center-x" | "center-y" | "left" | "right" | "top" | "bottom",
    relativeTo?: "canvas" | { elementId: string },
  ): Promise<WriteResult> {
    const doc = await this.documentService.getDocument(documentId);
    const allIds: string[] = [];

    // Resolve target position based on relativeTo
    let targetX: number | undefined;
    let targetY: number | undefined;

    if (relativeTo === "canvas") {
      targetX = doc.width / 2;
      targetY = doc.height / 2;
    } else if (relativeTo && typeof relativeTo === "object" && relativeTo.elementId) {
      const center = this.getElementCenter(doc.root, relativeTo.elementId);
      targetX = center.x;
      targetY = center.y;
    }

    if (alignment === "center-y") {
      const refY = targetY ?? elementIds.reduce((s, id) => {
        const c = this.getNodeCenter(this.getNodeFromDoc(doc.root, id));
        return s + (c?.y ?? 0);
      }, 0) / elementIds.length;

      for (const id of elementIds) {
        const center = this.getNodeCenter(this.getNodeFromDoc(doc.root, id));
        if (center) {
          await this.documentService.updateElement(documentId, id, {
            attributes: { y: refY - (this.getNodeHeight(doc.root, id) ?? 0) / 2 },
          });
          allIds.push(id);
        }
      }
    } else if (alignment === "center-x") {
      const refX = targetX ?? elementIds.reduce((s, id) => {
        const c = this.getNodeCenter(this.getNodeFromDoc(doc.root, id));
        return s + (c?.x ?? 0);
      }, 0) / elementIds.length;

      for (const id of elementIds) {
        const center = this.getNodeCenter(this.getNodeFromDoc(doc.root, id));
        if (center) {
          await this.documentService.updateElement(documentId, id, {
            attributes: { x: refX - (this.getNodeWidth(doc.root, id) ?? 0) / 2 },
          });
          allIds.push(id);
        }
      }
    }

    const document = await this.documentService.getDocument(documentId);
    return { success: true, documentId, revision: document.revision, affectedElementIds: allIds, extra: { alignment, relativeTo: relativeTo ?? "average" } };
  }

  /** Distribute elements evenly along an axis. */
  public async distributeElements(
    documentId: string,
    elementIds: string[],
    axis: "horizontal" | "vertical",
  ): Promise<WriteResult> {
    if (elementIds.length < 2) {
      const doc = await this.documentService.getDocument(documentId);
      return { success: true, documentId, revision: doc.revision, affectedElementIds: [], extra: {} };
    }

    const doc = await this.documentService.getDocument(documentId);
    const positions = elementIds.map((id) => {
      const center = this.getNodeCenter(this.getNodeFromDoc(doc.root, id));
      return { id, x: center?.x ?? 0, y: center?.y ?? 0 };
    });

    positions.sort((a, b) => (axis === "horizontal" ? a.x - b.x : a.y - b.y));
    const min = axis === "horizontal" ? positions[0]!.x : positions[0]!.y;
    const max = axis === "horizontal" ? positions[positions.length - 1]!.x : positions[positions.length - 1]!.y;
    const step = (max - min) / (positions.length - 1);

    for (let i = 1; i < positions.length - 1; i++) {
      const newPos = min + step * i;
      if (axis === "horizontal") {
        await this.documentService.updateElement(documentId, positions[i]!.id, {
          attributes: { x: newPos - (this.getNodeWidth(doc.root, positions[i]!.id) ?? 0) / 2 },
        });
      } else {
        await this.documentService.updateElement(documentId, positions[i]!.id, {
          attributes: { y: newPos - (this.getNodeHeight(doc.root, positions[i]!.id) ?? 0) / 2 },
        });
      }
    }

    const document = await this.documentService.getDocument(documentId);
    return { success: true, documentId, revision: document.revision, affectedElementIds: elementIds, extra: { axis, step } };
  }

  // -------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------

  private getTheme(name?: string) {
    return resolveThemeFn(name);
  }

  private getNodeFromDoc(root: SvgNode, id: string): SvgNode {
    return ensureNode(root, id).node;
  }

  /**
   * Compute the visual center of an element.
   *
   * For primitive shapes (rect, circle, ellipse): uses cx/cy or x/y + w/h.
   * For composite groups (g): recursively computes the bounding box of all
   * descendant children and returns the center of the union.
   *
   * This fixes the issue where sourceId/targetId auto-positioning failed
   * for composite groups like UAV (body + rotor children).
   */
  private getElementCenter(root: SvgNode, id: string): { x: number; y: number } {
    try {
      const node = this.getNodeFromDoc(root, id);

      // Direct center on circle/ellipse
      const cx = node.attributes["cx"] as number | undefined;
      const cy = node.attributes["cy"] as number | undefined;
      if (cx !== undefined && cy !== undefined) return { x: cx, y: cy };

      // Direct position for rect/text/image
      const x = node.attributes["x"] as number | undefined;
      const y = node.attributes["y"] as number | undefined;
      const w = node.attributes["width"] as number | undefined;
      const h = node.attributes["height"] as number | undefined;
      if (x !== undefined && y !== undefined && w !== undefined && h !== undefined) {
        return { x: x + w / 2, y: y + h / 2 };
      }
      if (x !== undefined && y !== undefined) {
        return { x, y };
      }

      // For composite groups (g elements): compute union bounding box of children
      if (node.type === "g" && node.children.length > 0) {
        return this.computeGroupBBox(node);
      }

      return { x: x ?? 0, y: y ?? 0 };
    } catch {
      return { x: 0, y: 0 };
    }
  }

  /** Recursively compute the bounding box center for a group element. */
  private computeGroupBBox(group: SvgNode): { x: number; y: number } {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    const walk = (n: SvgNode, offsetX: number, offsetY: number) => {
      const cx = n.attributes["cx"] as number | undefined;
      const cy = n.attributes["cy"] as number | undefined;
      const r = n.attributes["r"] as number | undefined;
      if (cx !== undefined && cy !== undefined) {
        const radius = r ?? 0;
        minX = Math.min(minX, cx - radius + offsetX);
        minY = Math.min(minY, cy - radius + offsetY);
        maxX = Math.max(maxX, cx + radius + offsetX);
        maxY = Math.max(maxY, cy + radius + offsetY);
        return;
      }

      const rx = n.attributes["rx"] as number | undefined;
      const ry = n.attributes["ry"] as number | undefined;
      if (rx !== undefined && ry !== undefined) {
        minX = Math.min(minX, (n.attributes["cx"] as number ?? 0) - rx + offsetX);
        minY = Math.min(minY, (n.attributes["cy"] as number ?? 0) - ry + offsetY);
        maxX = Math.max(maxX, (n.attributes["cx"] as number ?? 0) + rx + offsetX);
        maxY = Math.max(maxY, (n.attributes["cy"] as number ?? 0) + ry + offsetY);
        return;
      }

      const nx = (n.attributes["x"] as number) ?? 0;
      const ny = (n.attributes["y"] as number) ?? 0;
      const nw = (n.attributes["width"] as number) ?? 0;
      const nh = (n.attributes["height"] as number) ?? 0;
      if (nw > 0 || nh > 0) {
        minX = Math.min(minX, nx + offsetX);
        minY = Math.min(minY, ny + offsetY);
        maxX = Math.max(maxX, nx + nw + offsetX);
        maxY = Math.max(maxY, ny + nh + offsetY);
      }

      // Recurse into children (no additional offset for SVG groups without transform)
      for (const child of n.children) {
        walk(child, offsetX, offsetY);
      }
    };

    walk(group, 0, 0);

    if (!isFinite(minX)) return { x: 0, y: 0 };
    return { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
  }

  private getNodeCenter(node: SvgNode): { x: number; y: number } | null {
    const cx = node.attributes["cx"] as number | undefined;
    const cy = node.attributes["cy"] as number | undefined;
    if (cx !== undefined && cy !== undefined) return { x: cx, y: cy };
    const x = node.attributes["x"] as number | undefined;
    const y = node.attributes["y"] as number | undefined;
    const w = node.attributes["width"] as number | undefined;
    const h = node.attributes["height"] as number | undefined;
    if (x !== undefined && y !== undefined) return { x: x + (w ?? 0) / 2, y: y + (h ?? 0) / 2 };
    return null;
  }

  private getNodeWidth(_root: SvgNode, id: string): number | undefined {
    return undefined; // simplified — width/height handled per-element in update
  }

  private getNodeHeight(_root: SvgNode, id: string): number | undefined {
    return undefined;
  }

  private getRect(node: { attributes: Record<string, string | number> }): { x: number; y: number; w: number; h: number } | null {
    const x = node.attributes["x"] as number | undefined;
    const y = node.attributes["y"] as number | undefined;
    const w = node.attributes["width"] as number | undefined;
    const h = node.attributes["height"] as number | undefined;
    if (x !== undefined && y !== undefined && w !== undefined && h !== undefined) {
      return { x, y, w, h };
    }
    return null;
  }

  private rectsOverlap(a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }): boolean {
    return !(a.x + a.w < b.x || b.x + b.w < a.x || a.y + a.h < b.y || b.y + b.h < a.y);
  }

  /**
   * Role-based overlap policy.
   * Returns the severity level or "allow" to skip reporting.
   */
  private getOverlapPolicy(roleA: string, roleB: string): "error" | "warning" | "info" | "allow" {
    const key = `${roleA}:${roleB}`;
    const reverseKey = `${roleB}:${roleA}`;

    // Allowed: links crossing background buildings/environment
    const ALLOW = new Set([
      "communication-link:building",
      "communication-link:environment",
      "communication-link:road",
      "communication-link:vegetation",
      // background elements overlapping is fine
      "environment:environment",
      "environment:building",
    ]);

    // Errors: text overlapping text, legend overlapping main scene
    const ERRORS = new Set([
      "annotation:annotation",
      "legend:entity",
      "legend:building",
      "legend:environment",
      "legend:annotation",
    ]);

    if (ALLOW.has(key) || ALLOW.has(reverseKey)) return "allow";
    if (ERRORS.has(key) || ERRORS.has(reverseKey)) return "error";

    // Default: warning for all other overlaps
    return "warning";
  }

  private collectAllNodes(node: SvgNode): SvgNode[] {
    const result = [node];
    for (const child of node.children) {
      result.push(...this.collectAllNodes(child));
    }
    return result;
  }
}

// ---------------------------------------------------------------------------
// Input types for new primitives
// ---------------------------------------------------------------------------

interface Point {
  x: number;
  y: number;
}

interface CommunicationLinkInput {
  documentId: string;
  parentId?: string;
  id?: string;
  sourceId?: string;
  targetId?: string;
  start?: Point;
  end?: Point;
  semanticType: SemanticLinkType;
  geometry?: {
    type: "line" | "curve" | "beam";
    /** For curve: control-point horizontal offset from midpoint. Negative = bow left/down. */
    curvature?: number;
    /** For beam: polygon beam width in user units */
    beamWidth?: number;
  };
  style?: { color?: string; strokeWidth?: number; dashed?: boolean; opacity?: number; arrowhead?: boolean };
  theme?: string;
}

interface NumberedCalloutInput {
  documentId: string;
  parentId?: string;
  id?: string;
  number: number;
  x: number;
  y: number;
  label?: string;
  labelPosition?: Point;
  variant?: "minimal" | "boxed" | "leader-only";
  theme?: string;
}

interface LegendInput {
  documentId: string;
  parentId?: string;
  id?: string;
  x: number;
  y: number;
  title?: string;
  entries: Array<LegendColorEntry | LegendLineEntry | LegendShapeEntry>;
  theme?: string;
}

interface LegendColorEntry {
  type?: "color";
  label: string;
  color: string;
  borderColor?: string;
}

interface LegendLineEntry {
  type: "line";
  label: string;
  semanticType: SemanticLinkType;
}

interface LegendShapeEntry {
  type: "shape";
  label: string;
  shape: "circle" | "rect" | "diamond" | "ellipse";
  color: string;
  borderColor?: string;
  size?: number;
}

interface AuditReport {
  documentId: string;
  revision: number;
  issues: AuditIssue[];
  summary?: { totalIssues: number; bySeverity: Record<string, number> };
  disclaimer?: string;
}

interface AuditIssue {
  type: string;
  severity: "error" | "warning" | "info";
  elementId?: string;
  elementA?: string;
  elementB?: string;
  message: string;
}
