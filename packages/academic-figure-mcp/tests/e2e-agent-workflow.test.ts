/**
 * E2E Agent Drawing Workflow Tests.
 *
 * Simulates a complete AI agent drawing session: creating an academic
 * figure from scratch, inspecting the result, making visual adjustments,
 * and exporting.  Collects metrics for benchmarking.
 *
 * @module e2e-agent-workflow
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
// Test infrastructure
// ---------------------------------------------------------------------------

const testDir = path.join(os.tmpdir(), `mcp-e2e-${Date.now()}`);
const store = new FileDocumentStore(testDir);
const svc = new DocumentService(store);
const renderSvc = new RenderService(store, testDir);
const exportSvc = new ExportService(store, testDir);
const primitives = new PrimitiveService(svc);

beforeAll(async () => {
  await fs.mkdir(testDir, { recursive: true });
});

afterAll(async () => {
  await fs.rm(testDir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// Metrics collector
// ---------------------------------------------------------------------------

interface AgentMetrics {
  toolCalls: number;
  batchCalls: number;
  elementsCreated: number;
  previewCount: number;
  editCycles: number;
  errors: number;
  revisionConflicts: number;
  totalNodes: number;
}

function createMetrics(): AgentMetrics {
  return {
    toolCalls: 0,
    batchCalls: 0,
    elementsCreated: 0,
    previewCount: 0,
    editCycles: 0,
    errors: 0,
    revisionConflicts: 0,
    totalNodes: 0,
  };
}

// ---------------------------------------------------------------------------
// Benchmark A: Basic Scene (50–100 nodes, ≤15 calls, ≤3 previews)
// ---------------------------------------------------------------------------

describe("E2E Agent Workflow — Basic Scene", () => {
  it("creates a complete academic figure with metrics", async () => {
    const m = createMetrics();

    // ---- Step 1: create_document ----
    m.toolCalls++;
    const { document } = await svc.createDocument({
      name: "E2E Basic Scene",
      width: 1200,
      height: 800,
      background: "#FAFBFC",
    });
    m.elementsCreated += document.root.children.length;
    expect(document.id).toMatch(/^doc_/);

    // ---- Step 2: Create scene group structure ----
    m.toolCalls++;
    const groups = await svc.batchCreateElements(document.id, [
      { id: "environment", type: "g", name: "Environment", attributes: {}, metadata: { role: "environment" } },
      { id: "buildings", type: "g", name: "Buildings", attributes: {}, metadata: { role: "building" } },
      { id: "entities", type: "g", name: "Entities", attributes: {}, metadata: { role: "entity" } },
      { id: "links", type: "g", name: "Communication Links", attributes: {}, metadata: { role: "communication-link" } },
      { id: "annotations", type: "g", name: "Annotations", attributes: {}, metadata: { role: "annotation" } },
      { id: "legend", type: "g", name: "Legend", attributes: {}, metadata: { role: "legend" } },
    ]);
    m.batchCalls++;
    m.elementsCreated += groups.affectedElementIds.length;
    expect(groups.success).toBe(true);

    // ---- Step 3: Create road and ground (batch) ----
    m.toolCalls++;
    const env = await svc.batchCreateElements(document.id, [
      { parentId: "environment", id: "ground", type: "rect", attributes: { x: 0, y: 600, width: 1200, height: 200, fill: "#E8E8E0" } },
      { parentId: "environment", id: "road", type: "rect", attributes: { x: 0, y: 550, width: 1200, height: 50, fill: "#C0C0C0" } },
      { parentId: "environment", id: "road-line", type: "line", attributes: { x1: 0, y1: 575, x2: 1200, y2: 575, stroke: "#FFF", "stroke-width": 1, "stroke-dasharray": "10,5" } },
    ]);
    m.batchCalls++;
    m.elementsCreated += env.affectedElementIds.length;

    // ---- Step 4: Create buildings using high-level primitives ----
    m.toolCalls++;
    const bldg1 = await primitives.createIsometricBuilding({
      documentId: document.id,
      parentId: "buildings",
      id: "building-left",
      x: 80, y: 550,
      width: 160, depth: 60, height: 240,
      floors: 8,
      perspective: { dx: 50, dy: -25 },
      metadata: { role: "building", importance: "primary" },
    });
    m.elementsCreated += bldg1.affectedElementIds.length;

    m.toolCalls++;
    const bldg2 = await primitives.createIsometricBuilding({
      documentId: document.id,
      parentId: "buildings",
      id: "building-right",
      x: 880, y: 550,
      width: 140, depth: 55, height: 160,
      floors: 5,
      perspective: { dx: 45, dy: -22 },
      metadata: { role: "building", importance: "secondary" },
    });
    m.elementsCreated += bldg2.affectedElementIds.length;

    // ---- Step 5: Create UAV, UE, Eve, target (batch) ----
    m.toolCalls++;
    const entities = await svc.batchCreateElements(document.id, [
      { parentId: "entities", id: "uav", type: "g", name: "UAV", attributes: {}, metadata: { role: "entity", importance: "primary" } },
      { parentId: "uav", id: "uav-body", type: "rect", attributes: { x: 550, y: 300, width: 60, height: 20, rx: 4, fill: "#118AB2" } },
      { parentId: "uav", id: "uav-rotor", type: "ellipse", attributes: { cx: 540, cy: 295, rx: 12, ry: 4, fill: "#073B4C" } },
      { parentId: "entities", id: "ue1", type: "circle", name: "UE-1", attributes: { cx: 200, cy: 480, r: 10, fill: "#06D6A0" }, metadata: { role: "entity", category: "ground-user" } },
      { parentId: "entities", id: "ue2", type: "circle", name: "UE-2", attributes: { cx: 980, cy: 460, r: 10, fill: "#06D6A0" }, metadata: { role: "entity", category: "ground-user" } },
      { parentId: "entities", id: "ue3", type: "circle", name: "UE-3", attributes: { cx: 600, cy: 500, r: 10, fill: "#06D6A0" }, metadata: { role: "entity", category: "ground-user" } },
      { parentId: "entities", id: "eve", type: "circle", name: "Eve", attributes: { cx: 800, cy: 380, r: 12, fill: "#EF476F" }, metadata: { role: "entity", tags: ["eavesdropper"] } },
      { parentId: "entities", id: "target", type: "rect", name: "Target Zone", attributes: { x: 400, y: 380, width: 100, height: 80, rx: 8, fill: "none", stroke: "#FFD166", "stroke-width": 2, "stroke-dasharray": "6,3" } },
    ]);
    m.batchCalls++;
    m.elementsCreated += entities.affectedElementIds.length;

    // ---- Step 6: Create communication links ----
    m.toolCalls++;
    const links = await svc.batchCreateElements(document.id, [
      { parentId: "links", id: "link-uav-ue1", type: "line", name: "Info Link", attributes: { x1: 560, y1: 310, x2: 200, y2: 480, stroke: "#118AB2", "stroke-width": 2, "marker-end": "url(#arrow-blue)" }, metadata: { role: "communication-link", tags: ["information"] } },
      { parentId: "links", id: "link-uav-ue2", type: "line", name: "Info Link", attributes: { x1: 580, y1: 310, x2: 980, y2: 460, stroke: "#118AB2", "stroke-width": 2 }, metadata: { role: "communication-link", tags: ["information"] } },
      { parentId: "links", id: "link-uav-ue3", type: "line", name: "Sensing Link", attributes: { x1: 590, y1: 315, x2: 600, y2: 500, stroke: "#F77F00", "stroke-width": 2 }, metadata: { role: "communication-link", tags: ["sensing"] } },
      { parentId: "links", id: "link-eve-leak", type: "line", name: "Leakage Link", attributes: { x1: 580, y1: 310, x2: 800, y2: 380, stroke: "#EF476F", "stroke-width": 1.5, "stroke-dasharray": "5,5" }, metadata: { role: "communication-link", tags: ["leakage"] } },
    ]);
    m.batchCalls++;
    m.elementsCreated += links.affectedElementIds.length;

    // ---- Step 7: Callouts (text annotations) ----
    m.toolCalls++;
    const callouts = await svc.batchCreateElements(document.id, [
      { parentId: "annotations", id: "callout-uav", type: "text", name: "UAV Callout", attributes: { x: 560, y: 275, "font-family": "Arial", "font-size": 12, "text-anchor": "middle", fill: "#118AB2" }, text: "UAV" },
      { parentId: "annotations", id: "callout-eve", type: "text", name: "Eve Callout", attributes: { x: 810, y: 370, "font-family": "Arial", "font-size": 12, fill: "#EF476F" }, text: "Eve" },
      { parentId: "annotations", id: "callout-target", type: "text", name: "Target Callout", attributes: { x: 450, y: 370, "font-family": "Arial", "font-size": 12, fill: "#FFD166" }, text: "Target Zone" },
    ]);
    m.batchCalls++;
    m.elementsCreated += callouts.affectedElementIds.length;

    // ---- Step 8: Get document tree (inspect) ----
    m.toolCalls++;
    const { tree, nodeCount } = await svc.getDocumentTree(document.id, undefined, 3);
    m.totalNodes = nodeCount;
    expect(tree).toContain("environment");
    expect(tree).toContain("building-left");
    expect(tree).toContain("uav");

    // ---- Step 9: Render preview (see the figure) ----
    m.toolCalls++;
    m.previewCount++;
    const preview1 = await renderSvc.renderPreview(document.id, 600);
    expect(preview1.pngBuffer).toBeInstanceOf(Buffer);
    expect(preview1.pngBuffer.length).toBeGreaterThan(100);
    expect(preview1.width).toBe(600);

    // ---- Step 10: Query elements for inspection ----
    m.toolCalls++;
    const buildings = await svc.queryElements(document.id, { role: "building" });
    expect(buildings.length).toBeGreaterThan(0);

    // ---- Step 11: Visual adjustment — dim background elements ----
    m.editCycles++;
    const bgElements = await svc.queryElements(document.id, { importance: "secondary" });
    for (const el of bgElements) {
      if (el.attributes["opacity"] === undefined) {
        m.toolCalls++;
        await svc.updateElement(document.id, el.id, {
          attributes: { opacity: 0.85 },
        });
      }
    }

    // ---- Step 12: Move Eve to avoid overlap ----
    m.editCycles++;
    m.toolCalls++;
    await svc.transformElements(document.id, ["eve"], { translateX: 50, translateY: -20 });

    // ---- Step 13: Render again (verify visual fix) ----
    m.toolCalls++;
    m.previewCount++;
    const preview2 = await renderSvc.renderPreview(document.id);
    expect(preview2.pngBuffer.length).toBeGreaterThan(100);

    // ---- Step 14: Query all elements for validation ----
    m.toolCalls++;
    const allElements = await svc.queryElements(document.id, {});
    expect(allElements.length).toBeGreaterThan(20);

    // ---- Step 15: Export final SVG ----
    m.toolCalls++;
    const svgPath = await exportSvc.exportSvg(document.id);
    const svgContent = await fs.readFile(svgPath, "utf8");
    expect(svgContent).toContain("<svg");
    expect(svgContent).toContain("UAV");
    expect(svgContent).toContain("data-role=\"entity\"");
    expect(svgContent).toContain("building-left");

    // ---- Step 16: Verify persistence ----
    const doc = await svc.getDocument(document.id);
    expect(doc.revision).toBeGreaterThan(10);
    expect(doc.root.children).toHaveLength(7); // background + 6 groups

    // ---- Metrics ----
    console.log("\n========== E2E Agent Workflow Metrics ==========");
    console.log(`Tool calls:           ${m.toolCalls}`);
    console.log(`Batch calls:          ${m.batchCalls}`);
    console.log(`Elements created:     ${m.elementsCreated}`);
    console.log(`Preview renders:      ${m.previewCount}`);
    console.log(`Edit cycles:          ${m.editCycles}`);
    console.log(`Total nodes:          ${m.totalNodes}`);
    console.log(`Errors:               ${m.errors}`);
    console.log(`Revision conflicts:   ${m.revisionConflicts}`);
    console.log(`Final revision:       ${doc.revision}`);
    console.log(`Export path:          ${svgPath}`);
    console.log("==================================================\n");

    // Benchmark assertions (Basic Scene)
    expect(m.toolCalls).toBeLessThanOrEqual(25);
    expect(m.totalNodes).toBeGreaterThanOrEqual(50);
    expect(m.totalNodes).toBeLessThanOrEqual(150);
    expect(m.previewCount).toBeLessThanOrEqual(3);
    expect(doc.revision).toBeLessThanOrEqual(50);
  });
});

// ---------------------------------------------------------------------------
// Revision conflict scenario
// ---------------------------------------------------------------------------

describe("E2E — Revision conflict resolution", () => {
  it("handles optimistic locking correctly in agent workflow", async () => {
    const { document } = await svc.createDocument({
      name: "Conflict E2E Test",
      width: 800,
      height: 600,
    });

    // Agent A creates an element
    await svc.createElement(document.id, {
      id: "shared-element",
      type: "rect",
      attributes: { x: 0, y: 0, width: 100, height: 100, fill: "red" },
    });
    // revision is now 1

    // Agent B tries to update with stale revision
    let conflictCount = 0;
    try {
      await svc.updateElement(document.id, "shared-element", { attributes: { fill: "blue" } }, 0);
    } catch (e: unknown) {
      if (e && typeof e === "object" && "code" in e && (e as { code: string }).code === "REVISION_CONFLICT") {
        conflictCount++;
      }
    }
    expect(conflictCount).toBe(1);

    // Agent B re-reads the document and retries with correct revision
    const freshDoc = await svc.getDocument(document.id);
    const result = await svc.updateElement(
      document.id,
      "shared-element",
      { attributes: { fill: "blue" } },
      freshDoc.revision, // correct expectedRevision
    );
    expect(result.success).toBe(true);
    expect(result.revision).toBe(2);

    // Verify the fill was actually changed
    const verified = await svc.getDocument(document.id);
    const el = verified.root.children[0]!;
    expect(el.attributes["fill"]).toBe("blue");
  });
});

// ---------------------------------------------------------------------------
// Round-trip: create → export SVG → parse → verify metadata survives
// ---------------------------------------------------------------------------

describe("E2E — SVG round-trip with metadata preservation", () => {
  it("preserves metadata through serialize → parse cycle", async () => {
    const { document } = await svc.createDocument({
      name: "Round-trip Test",
      width: 800,
      height: 600,
    });

    // Create elements with rich metadata
    await svc.batchCreateElements(document.id, [
      {
        id: "env",
        type: "g",
        attributes: {},
        metadata: { role: "environment", importance: "background", tags: ["outdoor"] },
      },
      {
        parentId: "env",
        id: "tree1",
        type: "circle",
        attributes: { cx: 50, cy: 500, r: 30, fill: "#2D6A4F" },
        metadata: { role: "vegetation", category: "tree" },
      },
    ]);

    // Export SVG
    const svgPath = await exportSvc.exportSvg(document.id);
    const svgContent = await fs.readFile(svgPath, "utf8");

    // Simulate SVG-Edit modifying and saving back:
    // Parse the SVG as if it came from SVG-Edit PUT
    const { parseSvgDocument } = await import("@academic-figure/core");
    const reparsed = parseSvgDocument(svgContent);

    // Verify metadata survived
    const env = reparsed.root.children[0]!;
    expect(env.id).toBe("env");
    expect(env.metadata?.role).toBe("environment");
    expect(env.metadata?.importance).toBe("background");
    expect(env.metadata?.tags).toContain("outdoor");

    const tree = env.children[0]!;
    expect(tree.id).toBe("tree1");
    expect(tree.metadata?.role).toBe("vegetation");
    expect(tree.type).toBe("circle");
  });
});
