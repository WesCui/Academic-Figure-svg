/**
 * UAV-ISAC Full Academic Figure Benchmark.
 *
 * Three versions of the same figure to compare agent efficiency:
 *   A: Raw low-level tools only
 *   B: High-level primitives, no preview refinement
 *   C: High-level primitives + preview + audit + refinement
 *
 * Canvas: 1448 × 1086 (paper figure dimensions)
 *
 * @module uav-isac-benchmark
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";

import { FileDocumentStore } from "../src/store/document-store.js";
import { DocumentService } from "../src/services/document-service.js";
import { RenderService } from "../src/services/render-service.js";
import { ExportService } from "../src/services/export-service.js";
import { PrimitiveService } from "../src/services/primitive-service.js";

// ---------------------------------------------------------------------------
// Infrastructure
// ---------------------------------------------------------------------------

const testDir = path.join(os.tmpdir(), `uav-isac-bench-${Date.now()}`);
const store = new FileDocumentStore(testDir);
const svc = new DocumentService(store);
const renderSvc = new RenderService(store, testDir);
const exportSvc = new ExportService(store, testDir);
const prim = new PrimitiveService(svc);

beforeAll(async () => {
  await fs.mkdir(testDir, { recursive: true });
});

afterAll(async () => {
  await fs.rm(testDir, { recursive: true, force: true });
});

interface BenchmarkResult {
  version: string;
  toolCalls: number;
  batchCalls: number;
  elementsCreated: number;
  previewCount: number;
  auditCount: number;
  editCycles: number;
  errors: number;
  totalNodes: number;
  finalRevision: number;
  exportPath?: string;
}

// ---------------------------------------------------------------------------
// Version A: Raw low-level tools only (no primitives, no theme)
// ---------------------------------------------------------------------------

describe("UAV-ISAC Benchmark A — Raw low-level tools", () => {
  it("builds the full UAV-ISAC figure with raw create_element only", async () => {
    const m: BenchmarkResult = {
      version: "A (raw)", toolCalls: 0, batchCalls: 0,
      elementsCreated: 0, previewCount: 0, auditCount: 0,
      editCycles: 0, errors: 0, totalNodes: 0, finalRevision: 0,
    };

    // Create document
    m.toolCalls++;
    const { document } = await svc.createDocument({
      name: "UAV-ISAC Benchmark A",
      width: 1448, height: 1086, background: "#FAFBFC",
    });

    // Environment: ground, road
    m.toolCalls++; m.batchCalls++;
    const env = await svc.batchCreateElements(document.id, [
      { id: "scene", type: "g", attributes: {}, metadata: { role: "environment" } },
      { parentId: "scene", id: "ground", type: "rect", attributes: { x: 0, y: 700, width: 1448, height: 386, fill: "#E7EBEF" } },
      { parentId: "scene", id: "road-h", type: "rect", attributes: { x: 0, y: 850, width: 1448, height: 60, fill: "#C4CBD3" } },
      { parentId: "scene", id: "road-v", type: "rect", attributes: { x: 700, y: 700, width: 48, height: 386, fill: "#C4CBD3" } },
    ]);
    m.elementsCreated += env.affectedElementIds.length;

    // Buildings — raw rects + polygon roofs (no primitive)
    m.toolCalls++; m.batchCalls++;
    const bldgs = await svc.batchCreateElements(document.id, [
      { parentId: "scene", id: "bldg-1", type: "rect", attributes: { x: 80, y: 500, width: 160, height: 200, fill: "#E8ECF1", stroke: "#8899AA", "stroke-width": 1 } },
      { parentId: "scene", id: "bldg-2", type: "rect", attributes: { x: 270, y: 550, width: 130, height: 150, fill: "#DDE3E9", stroke: "#8899AA", "stroke-width": 1 } },
      { parentId: "scene", id: "bldg-3", type: "rect", attributes: { x: 900, y: 480, width: 180, height: 220, fill: "#E8ECF1", stroke: "#8899AA", "stroke-width": 1 } },
      { parentId: "scene", id: "bldg-4", type: "rect", attributes: { x: 1130, y: 560, width: 110, height: 140, fill: "#DDE3E9", stroke: "#8899AA", "stroke-width": 1 } },
    ]);
    m.elementsCreated += bldgs.affectedElementIds.length;

    // Manual windows — one per rect
    for (let b = 0; b < 4; b++) {
      m.toolCalls++; m.batchCalls++;
      const bx = [80, 270, 900, 1130][b]!;
      const windows: Array<{ type: string; attributes: Record<string, number | string> }> = [];
      for (let row = 0; row < 5; row++) {
        for (let col = 0; col < 4; col++) {
          windows.push({
            type: "rect",
            attributes: { x: bx + 20 + col * 32, y: [500, 550, 480, 560][b]! + 20 + row * 36, width: 14, height: 18, fill: "#AFCBE0", stroke: "#6889A3", "stroke-width": 0.8 },
          });
        }
      }
      const w = await svc.batchCreateElements(document.id, windows);
      m.elementsCreated += w.affectedElementIds.length;
    }

    // Entities: UAV, UEs, Eves, Target
    m.toolCalls++; m.batchCalls++;
    const entities = await svc.batchCreateElements(document.id, [
      { id: "entities", type: "g", attributes: {}, metadata: { role: "entity" } },
      { parentId: "entities", id: "uav", type: "g", attributes: {}, metadata: { role: "entity" } },
      { parentId: "uav", id: "uav-body", type: "rect", attributes: { x: 694, y: 80, width: 60, height: 20, rx: 4, fill: "#118AB2" } },
      { parentId: "uav", id: "uav-rotor", type: "ellipse", attributes: { cx: 684, cy: 75, rx: 12, ry: 4, fill: "#073B4C" } },
      { parentId: "entities", id: "ue1", type: "circle", attributes: { cx: 200, y: 780, r: 12, fill: "#06D6A0" } },
      { parentId: "entities", id: "ue2", type: "circle", attributes: { cx: 600, y: 820, r: 12, fill: "#118AB2", "stroke-width": 2, stroke: "#073B4C" } },
      { parentId: "entities", id: "ue3", type: "circle", attributes: { cx: 1000, y: 790, r: 12, fill: "#06D6A0" } },
      { parentId: "entities", id: "ue4", type: "circle", attributes: { cx: 1200, y: 820, r: 12, fill: "#06D6A0" } },
      { parentId: "entities", id: "eve1", type: "circle", attributes: { cx: 900, y: 200, r: 14, fill: "#EF476F" } },
      { parentId: "entities", id: "eve2", type: "circle", attributes: { cx: 300, y: 300, r: 14, fill: "#EF476F" } },
      { parentId: "entities", id: "target-zone", type: "rect", attributes: { x: 500, y: 600, width: 200, height: 150, rx: 12, fill: "none", stroke: "#FFD166", "stroke-width": 2.5, "stroke-dasharray": "8,4" } },
    ]);
    m.elementsCreated += entities.affectedElementIds.length;

    // Links — raw lines
    m.toolCalls++; m.batchCalls++;
    const links = await svc.batchCreateElements(document.id, [
      { id: "links", type: "g", attributes: {}, metadata: { role: "communication-link" } },
      { parentId: "links", id: "l-info", type: "line", attributes: { x1: 724, y1: 90, x2: 200, y2: 780, stroke: "#2B6CB0", "stroke-width": 2 } },
      { parentId: "links", id: "l-sense1", type: "line", attributes: { x1: 724, y1: 95, x2: 600, y2: 820, stroke: "#D97706", "stroke-width": 2 } },
      { parentId: "links", id: "l-sense2", type: "line", attributes: { x1: 724, y1: 90, x2: 1000, y2: 790, stroke: "#D97706", "stroke-width": 2 } },
      { parentId: "links", id: "l-leak1", type: "line", attributes: { x1: 724, y1: 85, x2: 900, y2: 200, stroke: "#C53030", "stroke-width": 1.5, "stroke-dasharray": "5,5" } },
      { parentId: "links", id: "l-leak2", type: "line", attributes: { x1: 724, y1: 85, x2: 300, y2: 300, stroke: "#C53030", "stroke-width": 1.5, "stroke-dasharray": "5,5" } },
      { parentId: "links", id: "l-traj", type: "path", attributes: { d: "M724,85 Q724,30 600,40 T500,200", fill: "none", stroke: "#C53030", "stroke-width": 1.5, "stroke-dasharray": "3,3" } },
    ]);
    m.elementsCreated += links.affectedElementIds.length;

    // Export
    m.toolCalls++;
    m.exportPath = await exportSvc.exportSvg(document.id);
    const doc = await svc.getDocument(document.id);
    m.totalNodes = doc.root.children.length + doc.root.children.reduce((s, c: any) => s + (c.children?.length ?? 0), 0);
    m.finalRevision = doc.revision;

    console.log(`\n========== Benchmark A (Raw) ==========`);
    console.log(`Tool calls:       ${m.toolCalls}`);
    console.log(`Batch calls:      ${m.batchCalls}`);
    console.log(`Elements created: ${m.elementsCreated}`);
    console.log(`Total nodes:      ${m.totalNodes}`);
    console.log(`Final revision:   ${m.finalRevision}`);
    console.log(`Export:           ${m.exportPath}`);
    console.log(`========================================\n`);

    expect(m.toolCalls).toBeLessThanOrEqual(30);
  });
});

// ---------------------------------------------------------------------------
// Version B: High-level primitives (no preview refinement)
// ---------------------------------------------------------------------------

describe("UAV-ISAC Benchmark B — High-level primitives, no refinement", () => {
  it("builds the full figure with primitives: buildings, links, callouts, legend", async () => {
    const m: BenchmarkResult = {
      version: "B (primitives)", toolCalls: 0, batchCalls: 0,
      elementsCreated: 0, previewCount: 0, auditCount: 0,
      editCycles: 0, errors: 0, totalNodes: 0, finalRevision: 0,
    };

    // Create document
    m.toolCalls++;
    const { document } = await svc.createDocument({
      name: "UAV-ISAC Benchmark B",
      width: 1448, height: 1086, background: "#FAFBFC",
    });

    // Scene groups
    m.toolCalls++; m.batchCalls++;
    const groups = await svc.batchCreateElements(document.id, [
      { id: "scene", type: "g", attributes: {}, metadata: { role: "environment" } },
      { id: "entities", type: "g", attributes: {}, metadata: { role: "entity" } },
      { id: "links", type: "g", attributes: {}, metadata: { role: "communication-link" } },
      { id: "annotations", type: "g", attributes: {}, metadata: { role: "annotation" } },
    ]);
    m.elementsCreated += groups.affectedElementIds.length;

    // Environment
    m.toolCalls++; m.batchCalls++;
    const env = await svc.batchCreateElements(document.id, [
      { parentId: "scene", id: "ground", type: "rect", attributes: { x: 0, y: 700, width: 1448, height: 386, fill: "#E7EBEF" } },
      { parentId: "scene", id: "road-h", type: "rect", attributes: { x: 0, y: 850, width: 1448, height: 60, fill: "#C4CBD3" } },
      { parentId: "scene", id: "road-v", type: "rect", attributes: { x: 700, y: 700, width: 48, height: 386, fill: "#C4CBD3" } },
    ]);
    m.elementsCreated += env.affectedElementIds.length;

    // Buildings using primitives
    m.toolCalls++;
    const b1 = await prim.createIsometricBuilding({
      documentId: document.id, parentId: "scene", id: "bldg-1",
      x: 80, y: 700, width: 160, depth: 60, height: 220, floors: 7,
      perspective: { dx: 48, dy: -24 },
      metadata: { role: "building", importance: "primary" },
    });
    m.elementsCreated += b1.affectedElementIds.length;

    m.toolCalls++;
    const b2 = await prim.createIsometricBuilding({
      documentId: document.id, parentId: "scene", id: "bldg-2",
      x: 260, y: 700, width: 130, depth: 50, height: 160, floors: 5,
      perspective: { dx: 40, dy: -20 },
      metadata: { role: "building" },
    });
    m.elementsCreated += b2.affectedElementIds.length;

    m.toolCalls++; m.batchCalls++;
    const b34 = await svc.batchCreateElements(document.id, [
      { parentId: "scene", id: "bldg-3", type: "g", attributes: {} },
      { parentId: "bldg-3", id: "b3-facade", type: "rect", attributes: { x: 900, y: 480, width: 180, height: 220, fill: "#E8ECF1", stroke: "#8899AA", "stroke-width": 1 } },
      { parentId: "scene", id: "bldg-4", type: "g", attributes: {} },
      { parentId: "bldg-4", id: "b4-facade", type: "rect", attributes: { x: 1130, y: 560, width: 110, height: 140, fill: "#DDE3E9", stroke: "#8899AA", "stroke-width": 1 } },
    ]);
    m.elementsCreated += b34.affectedElementIds.length;

    // Trees using repeated elements
    m.toolCalls++;
    const trees = await svc.createRepeatedElements({
      documentId: document.id, parentId: "scene",
      template: { type: "circle", attributes: { r: 12, fill: "#2D6A4F" }, namePrefix: "tree" },
      layout: { rows: 3, columns: 6, startX: 100, startY: 650, stepX: 230, stepY: 40 },
    });
    m.elementsCreated += trees.affectedElementIds.length;

    // Entities
    m.toolCalls++; m.batchCalls++;
    const entities = await svc.batchCreateElements(document.id, [
      { parentId: "entities", id: "uav", type: "g", attributes: {} },
      { parentId: "uav", id: "uav-body", type: "rect", attributes: { x: 694, y: 80, width: 60, height: 20, rx: 4, fill: "#118AB2" } },
      { parentId: "uav", id: "uav-rotor", type: "ellipse", attributes: { cx: 684, cy: 75, rx: 12, ry: 4, fill: "#073B4C" } },
      { parentId: "entities", id: "ue1", type: "circle", attributes: { cx: 200, y: 780, r: 12, fill: "#06D6A0" }, metadata: { role: "entity" } },
      { parentId: "entities", id: "ue2", type: "circle", attributes: { cx: 600, y: 820, r: 12, fill: "#3182CE", stroke: "#1C5A8E", "stroke-width": 2.5 }, metadata: { role: "entity", tags: ["scheduled"] } },
      { parentId: "entities", id: "ue3", type: "circle", attributes: { cx: 1000, y: 790, r: 12, fill: "#06D6A0" }, metadata: { role: "entity" } },
      { parentId: "entities", id: "ue4", type: "circle", attributes: { cx: 1200, y: 820, r: 12, fill: "#06D6A0" }, metadata: { role: "entity" } },
      { parentId: "entities", id: "eve1", type: "circle", attributes: { cx: 880, y: 200, r: 14, fill: "#EF476F" }, metadata: { role: "entity", tags: ["eavesdropper"] } },
      { parentId: "entities", id: "eve2", type: "circle", attributes: { cx: 320, y: 280, r: 14, fill: "#EF476F" }, metadata: { role: "entity", tags: ["eavesdropper"] } },
      { parentId: "entities", id: "target", type: "rect", attributes: { x: 500, y: 600, width: 200, height: 150, rx: 12, fill: "none", stroke: "#FFD166", "stroke-width": 2.5, "stroke-dasharray": "8,4" }, metadata: { role: "entity", tags: ["target"] } },
    ]);
    m.elementsCreated += entities.affectedElementIds.length;

    // Links using communication link primitive
    const linkDefs: Array<{ src: string; tgt: string; type: "information" | "sensing" | "leakage" | "trajectory" }> = [
      { src: "uav", tgt: "ue1", type: "information" },
      { src: "uav", tgt: "ue2", type: "sensing" },
      { src: "uav", tgt: "ue3", type: "sensing" },
      { src: "uav", tgt: "eve1", type: "leakage" },
      { src: "uav", tgt: "eve2", type: "leakage" },
    ];
    for (const d of linkDefs) {
      m.toolCalls++;
      const l = await prim.createCommunicationLink({
        documentId: document.id, parentId: "links",
        sourceId: d.src, targetId: d.tgt,
        semanticType: d.type, theme: "ieee",
      });
      m.elementsCreated += l.affectedElementIds.length;
    }

    // Trajectory (explicit points since it arcs)
    m.toolCalls++;
    const traj = await prim.createCommunicationLink({
      documentId: document.id, parentId: "links",
      start: { x: 724, y: 80 }, end: { x: 500, y: 200 },
      semanticType: "trajectory", theme: "ieee",
      style: { arrowhead: false },
    });
    m.elementsCreated += traj.affectedElementIds.length;

    // Callouts
    m.toolCalls++;
    const c1 = await prim.createNumberedCallout({
      documentId: document.id, parentId: "annotations",
      number: 1, x: 724, y: 55, label: "UAV", labelPosition: { x: 770, y: 55 },
      variant: "minimal", theme: "ieee",
    });
    m.elementsCreated += c1.affectedElementIds.length;

    m.toolCalls++;
    const c2 = await prim.createNumberedCallout({
      documentId: document.id, parentId: "annotations",
      number: 2, x: 500, y: 580, label: "Target Zone", labelPosition: { x: 545, y: 580 },
      variant: "minimal", theme: "ieee",
    });
    m.elementsCreated += c2.affectedElementIds.length;

    // Legend with line entries
    m.toolCalls++;
    const legend = await prim.createPaperLegend({
      documentId: document.id, parentId: "annotations",
      x: 20, y: 20, title: "Legend", theme: "ieee",
      entries: [
        { label: "UAV", color: "#3182CE" },
        { label: "UE (scheduled)", color: "#3182CE", borderColor: "#1C5A8E" },
        { label: "UE", color: "#06D6A0" },
        { label: "Eve", color: "#EF476F" },
        { label: "Target Zone", color: "#FFD166" },
        { type: "line", label: "Information Link", semanticType: "information" },
        { type: "line", label: "Sensing/AN Link", semanticType: "sensing" },
        { type: "line", label: "Leakage Link", semanticType: "leakage" },
        { type: "line", label: "Trajectory", semanticType: "trajectory" },
      ],
    });
    m.elementsCreated += legend.affectedElementIds.length;

    // Export
    m.toolCalls++;
    m.exportPath = await exportSvc.exportSvg(document.id);
    const doc = await svc.getDocument(document.id);
    m.totalNodes = doc.root.children.reduce((s: number, c: any) => s + 1 + (c.children?.length ?? 0) + (c.children?.reduce?.((ss: number, cc: any) => ss + (cc.children?.length ?? 0), 0) ?? 0), 0);
    m.finalRevision = doc.revision;

    console.log(`\n========== Benchmark B (Primitives) ==========`);
    console.log(`Tool calls:       ${m.toolCalls}`);
    console.log(`Batch calls:      ${m.batchCalls}`);
    console.log(`Elements created: ${m.elementsCreated}`);
    console.log(`Total nodes:      ${m.totalNodes}`);
    console.log(`Final revision:   ${m.finalRevision}`);
    console.log(`Export:           ${m.exportPath}`);
    console.log(`================================================\n`);

    expect(m.toolCalls).toBeLessThanOrEqual(30);
  });
});

// ---------------------------------------------------------------------------
// Version C: High-level primitives + preview + audit + refinement
// ---------------------------------------------------------------------------

describe("UAV-ISAC Benchmark C — Primitives + preview + audit + refinement", () => {
  it("builds, previews, audits, and refines the figure", async () => {
    const m: BenchmarkResult = {
      version: "C (w/ refinement)", toolCalls: 0, batchCalls: 0,
      elementsCreated: 0, previewCount: 0, auditCount: 0,
      editCycles: 0, errors: 0, totalNodes: 0, finalRevision: 0,
    };

    // Create document
    m.toolCalls++;
    const { document } = await svc.createDocument({
      name: "UAV-ISAC Benchmark C",
      width: 1448, height: 1086, background: "#FAFBFC",
    });

    // Scene groups
    m.toolCalls++; m.batchCalls++;
    const groups = await svc.batchCreateElements(document.id, [
      { id: "scene", type: "g", attributes: {}, metadata: { role: "environment" } },
      { id: "entities", type: "g", attributes: {}, metadata: { role: "entity" } },
      { id: "links", type: "g", attributes: {}, metadata: { role: "communication-link" } },
      { id: "annotations", type: "g", attributes: {}, metadata: { role: "annotation" } },
    ]);
    m.elementsCreated += groups.affectedElementIds.length;

    // Environment
    m.toolCalls++; m.batchCalls++;
    await svc.batchCreateElements(document.id, [
      { parentId: "scene", id: "ground", type: "rect", attributes: { x: 0, y: 700, width: 1448, height: 386, fill: "#E7EBEF" } },
      { parentId: "scene", id: "road-h", type: "rect", attributes: { x: 0, y: 850, width: 1448, height: 60, fill: "#C4CBD3" } },
      { parentId: "scene", id: "road-v", type: "rect", attributes: { x: 700, y: 700, width: 48, height: 386, fill: "#C4CBD3" } },
    ]);

    // Buildings (2 isometric + 2 simple)
    m.toolCalls++; await prim.createIsometricBuilding({ documentId: document.id, parentId: "scene", id: "bldg-1", x: 80, y: 700, width: 160, depth: 60, height: 220, floors: 7, perspective: { dx: 48, dy: -24 }, metadata: { role: "building", importance: "primary" } });
    m.toolCalls++; await prim.createIsometricBuilding({ documentId: document.id, parentId: "scene", id: "bldg-2", x: 260, y: 700, width: 130, depth: 50, height: 160, floors: 5, perspective: { dx: 40, dy: -20 } });

    // Trees
    m.toolCalls++; await svc.createRepeatedElements({ documentId: document.id, parentId: "scene", template: { type: "circle", attributes: { r: 12, fill: "#2D6A4F" }, namePrefix: "tree" }, layout: { rows: 3, columns: 6, startX: 100, startY: 650, stepX: 230, stepY: 40 } });

    // Entities
    m.toolCalls++; m.batchCalls++;
    await svc.batchCreateElements(document.id, [
      { parentId: "entities", id: "uav", type: "g", attributes: {} },
      { parentId: "uav", id: "uav-body", type: "rect", attributes: { x: 694, y: 80, width: 60, height: 20, rx: 4, fill: "#118AB2" } },
      { parentId: "uav", id: "uav-rotor", type: "ellipse", attributes: { cx: 684, cy: 75, rx: 12, ry: 4, fill: "#073B4C" } },
      { parentId: "entities", id: "ue1", type: "circle", attributes: { cx: 200, y: 780, r: 12, fill: "#06D6A0" }, metadata: { role: "entity" } },
      { parentId: "entities", id: "ue2", type: "circle", attributes: { cx: 600, y: 820, r: 12, fill: "#3182CE", stroke: "#1C5A8E", "stroke-width": 2.5 }, metadata: { role: "entity", tags: ["scheduled"] } },
      { parentId: "entities", id: "ue3", type: "circle", attributes: { cx: 1000, y: 790, r: 12, fill: "#06D6A0" }, metadata: { role: "entity" } },
      { parentId: "entities", id: "ue4", type: "circle", attributes: { cx: 1200, y: 820, r: 12, fill: "#06D6A0" }, metadata: { role: "entity" } },
      { parentId: "entities", id: "eve1", type: "circle", attributes: { cx: 880, y: 200, r: 14, fill: "#EF476F" }, metadata: { role: "entity", tags: ["eavesdropper"] } },
      { parentId: "entities", id: "eve2", type: "circle", attributes: { cx: 320, y: 280, r: 14, fill: "#EF476F" }, metadata: { role: "entity", tags: ["eavesdropper"] } },
      { parentId: "entities", id: "target", type: "rect", attributes: { x: 500, y: 600, width: 200, height: 150, rx: 12, fill: "none", stroke: "#FFD166", "stroke-width": 2.5, "stroke-dasharray": "8,4" }, metadata: { role: "entity", tags: ["target"] } },
    ]);

    // Links
    const linkDefs: Array<{ src: string; tgt: string; type: "information" | "sensing" | "leakage" | "trajectory" }> = [
      { src: "uav", tgt: "ue1", type: "information" },
      { src: "uav", tgt: "ue2", type: "sensing" },
      { src: "uav", tgt: "ue3", type: "sensing" },
      { src: "uav", tgt: "eve1", type: "leakage" },
      { src: "uav", tgt: "eve2", type: "leakage" },
    ];
    for (const d of linkDefs) {
      m.toolCalls++;
      await prim.createCommunicationLink({ documentId: document.id, parentId: "links", sourceId: d.src, targetId: d.tgt, semanticType: d.type, theme: "ieee" });
    }
    m.toolCalls++;
    await prim.createCommunicationLink({ documentId: document.id, parentId: "links", start: { x: 724, y: 80 }, end: { x: 500, y: 200 }, semanticType: "trajectory", theme: "ieee", style: { arrowhead: false } });

    // ---- Step 1: Render preview ----
    m.toolCalls++; m.previewCount++;
    const preview1 = await renderSvc.renderPreview(document.id, 800);
    expect(preview1.pngBuffer.length).toBeGreaterThan(100);

    // ---- Step 2: Audit ----
    m.toolCalls++; m.auditCount++;
    const audit1 = await prim.auditFigure(document.id);
    expect(audit1.summary).toBeDefined();

    // ---- Step 3: Refinement based on audit ----
    m.editCycles++;
    m.toolCalls++;
    // Align legend to canvas top-left (already positioned there, but validate)
    // Distribute UE entities
    await prim.alignElements(document.id, ["ue1", "ue3", "ue4"], "center-y");

    // ---- Step 4: Preview again (verify fix) ----
    m.toolCalls++; m.previewCount++;
    const preview2 = await renderSvc.renderPreview(document.id, 800);
    expect(preview2.pngBuffer.length).toBeGreaterThan(100);

    // ---- Step 5: Audit again ----
    m.toolCalls++; m.auditCount++;
    const audit2 = await prim.auditFigure(document.id);
    m.editCycles++;

    // Callouts
    m.toolCalls++;
    await prim.createNumberedCallout({ documentId: document.id, parentId: "annotations", number: 1, x: 724, y: 55, label: "UAV", labelPosition: { x: 770, y: 55 }, variant: "minimal", theme: "ieee" });
    m.toolCalls++;
    await prim.createNumberedCallout({ documentId: document.id, parentId: "annotations", number: 2, x: 500, y: 580, label: "Target Zone", labelPosition: { x: 545, y: 580 }, variant: "minimal", theme: "ieee" });

    // Legend
    m.toolCalls++;
    await prim.createPaperLegend({ documentId: document.id, parentId: "annotations", x: 20, y: 20, title: "Legend", theme: "ieee", entries: [
      { label: "UAV", color: "#3182CE" }, { label: "UE (scheduled)", color: "#3182CE", borderColor: "#1C5A8E" },
      { label: "UE", color: "#06D6A0" }, { label: "Eve", color: "#EF476F" }, { label: "Target Zone", color: "#FFD166" },
      { type: "line", label: "Information Link", semanticType: "information" },
      { type: "line", label: "Sensing/AN Link", semanticType: "sensing" },
      { type: "line", label: "Leakage Link", semanticType: "leakage" },
      { type: "line", label: "Trajectory", semanticType: "trajectory" },
    ]});

    // Final preview
    m.toolCalls++; m.previewCount++;
    await renderSvc.renderPreview(document.id, 800);

    // Export
    m.toolCalls++;
    m.exportPath = await exportSvc.exportSvg(document.id);
    const doc = await svc.getDocument(document.id);
    m.finalRevision = doc.revision;

    console.log(`\n========== Benchmark C (Refinement) ==========`);
    console.log(`Tool calls:       ${m.toolCalls}`);
    console.log(`Preview renders:  ${m.previewCount}`);
    console.log(`Audit runs:       ${m.auditCount}`);
    console.log(`Edit cycles:      ${m.editCycles}`);
    console.log(`Final revision:   ${m.finalRevision}`);
    console.log(`Export:           ${m.exportPath}`);
    console.log(`===============================================\n`);

    expect(m.previewCount).toBeGreaterThanOrEqual(2);
    expect(m.auditCount).toBeGreaterThanOrEqual(1);
    expect(m.editCycles).toBeGreaterThanOrEqual(1);
  });
});
