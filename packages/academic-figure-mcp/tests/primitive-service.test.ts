/**
 * Tests for high-level primitives: communication links, callouts,
 * legends, audit, and layout helpers.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";

import { FileDocumentStore } from "../src/store/document-store.js";
import { DocumentService } from "../src/services/document-service.js";
import { PrimitiveService } from "../src/services/primitive-service.js";

const testDir = path.join(os.tmpdir(), `mcp-prim-test-${Date.now()}`);
const store = new FileDocumentStore(testDir);
const svc = new DocumentService(store);
const prim = new PrimitiveService(svc);

beforeAll(async () => {
  await fs.mkdir(testDir, { recursive: true });
});

afterAll(async () => {
  await fs.rm(testDir, { recursive: true, force: true });
});

async function createTestDoc() {
  const { document } = await svc.createDocument({ name: "Prim Test", width: 1200, height: 800 });
  // Create some reference elements for auto-positioning
  await svc.createElement(document.id, { id: "uav", type: "circle", attributes: { cx: 600, cy: 300, r: 20 } });
  await svc.createElement(document.id, { id: "ue1", type: "circle", attributes: { cx: 200, cy: 500, r: 12 } });
  await svc.createElement(document.id, { id: "eve1", type: "circle", attributes: { cx: 900, cy: 400, r: 14 } });
  return document;
}

// ---------------------------------------------------------------------------
// Communication Link
// ---------------------------------------------------------------------------

describe("create_communication_link", () => {
  it("creates an information link between two entities", async () => {
    const doc = await createTestDoc();
    const r = await prim.createCommunicationLink({
      documentId: doc.id,
      sourceId: "uav", targetId: "ue1",
      semanticType: "information",
    });
    expect(r.success).toBe(true);
    expect(r.affectedElementIds.length).toBeGreaterThanOrEqual(1);
    expect(r.extra!.semanticType).toBe("information");
  });

  it("creates a leakage link with dashed style", async () => {
    const doc = await createTestDoc();
    const r = await prim.createCommunicationLink({
      documentId: doc.id,
      sourceId: "uav", targetId: "eve1",
      semanticType: "leakage",
    });
    expect(r.success).toBe(true);

    // Verify the link was created with correct semantic type
    const linkId = r.affectedElementIds[0]!;
    const d = await svc.getDocument(doc.id);
    const link = d.root.children.find((c: { id: string }) => c.id === linkId);
    expect(link).toBeDefined();
  });

  it("creates a beam-type sensing link", async () => {
    const doc = await createTestDoc();
    const r = await prim.createCommunicationLink({
      documentId: doc.id,
      sourceId: "uav", targetId: "ue1",
      semanticType: "sensing",
      geometry: { type: "beam", beamWidth: 15 },
    });
    expect(r.success).toBe(true);
  });

  it("creates a trajectory link with explicit points", async () => {
    const doc = await createTestDoc();
    const r = await prim.createCommunicationLink({
      documentId: doc.id,
      start: { x: 600, y: 100 },
      end: { x: 600, y: 300 },
      semanticType: "trajectory",
    });
    expect(r.success).toBe(true);
  });

  it("all 5 semantic types create successfully", async () => {
    const doc = await createTestDoc();
    const types = ["information", "sensing", "artificial-noise", "leakage", "trajectory"] as const;
    for (const t of types) {
      const r = await prim.createCommunicationLink({
        documentId: doc.id,
        start: { x: 100, y: 100 },
        end: { x: 200, y: 200 },
        semanticType: t,
      });
      expect(r.success).toBe(true);
    }
  });

  it("uses IEEE theme colors when specified", async () => {
    const doc = await createTestDoc();
    const r = await prim.createCommunicationLink({
      documentId: doc.id,
      sourceId: "uav", targetId: "ue1",
      semanticType: "information",
      theme: "ieee",
    });
    expect(r.success).toBe(true);
    expect(r.extra!.color).toBe("#2B6CB0");
  });
});

// ---------------------------------------------------------------------------
// Numbered Callout
// ---------------------------------------------------------------------------

describe("create_numbered_callout", () => {
  it("creates a callout with marker, number, leader, and label", async () => {
    const doc = await createTestDoc();
    const r = await prim.createNumberedCallout({
      documentId: doc.id,
      number: 1,
      x: 600, y: 250,
      label: "UAV",
      labelPosition: { x: 630, y: 250 },
    });
    expect(r.success).toBe(true);
    // marker + number + leader + box + label = 5 elements (default: boxed)
    expect(r.affectedElementIds.length).toBe(5);
  });

  it("creates callout without label (leader-only style)", async () => {
    const doc = await createTestDoc();
    const r = await prim.createNumberedCallout({
      documentId: doc.id,
      number: 2,
      x: 200, y: 480,
      labelPosition: { x: 200, y: 480 },
    });
    expect(r.success).toBe(true);
    // marker + number + leader = 3 (no label)
    expect(r.affectedElementIds.length).toBeGreaterThanOrEqual(3);
  });

  it("creates minimal callout (no label, no leader)", async () => {
    const doc = await createTestDoc();
    const r = await prim.createNumberedCallout({
      documentId: doc.id,
      number: 3,
      x: 900, y: 380,
    });
    expect(r.success).toBe(true);
    // marker + number = 2 (minimal)
    expect(r.affectedElementIds.length).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Paper Legend
// ---------------------------------------------------------------------------

describe("create_paper_legend", () => {
  it("creates a legend with title and entries", async () => {
    const doc = await createTestDoc();
    const r = await prim.createPaperLegend({
      documentId: doc.id,
      x: 20, y: 20,
      title: "Legend",
      entries: [
        { label: "UAV", color: "#3182CE" },
        { label: "UE", color: "#06D6A0" },
        { label: "Eve", color: "#EF476F" },
        { label: "Target", color: "#4F7D32" },
      ],
    });
    expect(r.success).toBe(true);
    expect(r.extra!.entryCount).toBe(4);
    // bg + title + 4*(swatch+label) = 10 elements
    expect(r.affectedElementIds.length).toBe(10);
  });

  it("creates a legend without title", async () => {
    const doc = await createTestDoc();
    const r = await prim.createPaperLegend({
      documentId: doc.id,
      x: 20, y: 20,
      entries: [
        { label: "Info", color: "#2B6CB0" },
        { label: "Sensing", color: "#D97706" },
      ],
    });
    expect(r.success).toBe(true);
    // bg + 2*(swatch+label) = 5 (no title)
    expect(r.affectedElementIds.length).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// Figure Audit
// ---------------------------------------------------------------------------

describe("audit_figure", () => {
  it("runs all checks and returns a structured report", async () => {
    const doc = await createTestDoc();
    // Add some elements that might overlap
    await svc.createElement(doc.id, {
      id: "rect1", type: "rect",
      attributes: { x: 10, y: 10, width: 50, height: 50 },
    });
    await svc.createElement(doc.id, {
      id: "rect2", type: "rect",
      attributes: { x: 15, y: 15, width: 50, height: 50 },
    });

    const report = await prim.auditFigure(doc.id);
    expect(report.documentId).toBe(doc.id);
    expect(report.revision).toBeGreaterThan(0);
    expect(report.issues).toBeDefined();
    expect(report.summary).toBeDefined();
    expect(report.summary!.totalIssues).toBeGreaterThanOrEqual(0);
    expect(report.summary!.bySeverity).toBeDefined();
    expect(report.summary!.bySeverity.error).toBeGreaterThanOrEqual(0);
  });

  it("detects overlapping rectangles", async () => {
    const doc = await createTestDoc();
    await svc.createElement(doc.id, {
      id: "box1", type: "rect", attributes: { x: 0, y: 0, width: 100, height: 100 },
    });
    await svc.createElement(doc.id, {
      id: "box2", type: "rect", attributes: { x: 50, y: 50, width: 100, height: 100 },
    });

    const report = await prim.auditFigure(doc.id, ["overlap"]);
    const overlaps = report.issues.filter((i: { type: string }) => i.type === "overlap");
    expect(overlaps.length).toBeGreaterThanOrEqual(1);
  });

  it("detects small text", async () => {
    const doc = await createTestDoc();
    await svc.createElement(doc.id, {
      id: "tiny", type: "text",
      attributes: { x: 10, y: 10, "font-size": 6 },
      text: "tiny text",
    });

    const report = await prim.auditFigure(doc.id, ["text-size"]);
    const small = report.issues.filter((i: { type: string }) => i.type === "text-size");
    expect(small.length).toBeGreaterThanOrEqual(1);
  });

  it("detects out-of-bounds elements", async () => {
    const doc = await createTestDoc();
    await svc.createElement(doc.id, {
      id: "far", type: "rect",
      attributes: { x: -200, y: -200, width: 50, height: 50 },
    });

    const report = await prim.auditFigure(doc.id, ["bounds"]);
    const bounds = report.issues.filter((i: { type: string }) => i.type === "bounds");
    expect(bounds.length).toBeGreaterThanOrEqual(1);
  });

  it("runs a subset of checks", async () => {
    const doc = await createTestDoc();
    const report = await prim.auditFigure(doc.id, ["overlap", "bounds"]);
    expect(report.issues).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Layout helpers
// ---------------------------------------------------------------------------

describe("align_elements", () => {
  it("aligns elements on center-y", async () => {
    const doc = await createTestDoc();
    await svc.batchCreateElements(doc.id, [
      { id: "a1", type: "rect", attributes: { x: 10, y: 50, width: 20, height: 20 } },
      { id: "a2", type: "rect", attributes: { x: 10, y: 80, width: 20, height: 20 } },
      { id: "a3", type: "rect", attributes: { x: 10, y: 110, width: 20, height: 20 } },
    ]);
    const r = await prim.alignElements(doc.id, ["a1", "a2", "a3"], "center-y");
    expect(r.success).toBe(true);
    expect(r.affectedElementIds.length).toBe(3);
  });

  it("aligns elements on center-x", async () => {
    const doc = await createTestDoc();
    await svc.batchCreateElements(doc.id, [
      { id: "b1", type: "rect", attributes: { x: 50, y: 10, width: 20, height: 20 } },
      { id: "b2", type: "rect", attributes: { x: 80, y: 10, width: 20, height: 20 } },
    ]);
    const r = await prim.alignElements(doc.id, ["b1", "b2"], "center-x");
    expect(r.success).toBe(true);
  });
});

describe("distribute_elements", () => {
  it("distributes elements evenly horizontally", async () => {
    const doc = await createTestDoc();
    await svc.batchCreateElements(doc.id, [
      { id: "d1", type: "rect", attributes: { x: 10, y: 10, width: 10, height: 10 } },
      { id: "d2", type: "rect", attributes: { x: 20, y: 10, width: 10, height: 10 } },
      { id: "d3", type: "rect", attributes: { x: 110, y: 10, width: 10, height: 10 } },
    ]);
    const r = await prim.distributeElements(doc.id, ["d1", "d2", "d3"], "horizontal");
    expect(r.success).toBe(true);
  });

  it("distributes elements evenly vertically", async () => {
    const doc = await createTestDoc();
    await svc.batchCreateElements(doc.id, [
      { id: "e1", type: "rect", attributes: { x: 10, y: 10, width: 10, height: 10 } },
      { id: "e2", type: "rect", attributes: { x: 10, y: 50, width: 10, height: 10 } },
      { id: "e3", type: "rect", attributes: { x: 10, y: 90, width: 10, height: 10 } },
    ]);
    const r = await prim.distributeElements(doc.id, ["e1", "e2", "e3"], "vertical");
    expect(r.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Isometric Building (existing, verify still works)
// ---------------------------------------------------------------------------

describe("create_isometric_building", () => {
  it("creates a building with windows, rooftop, and entrance", async () => {
    const doc = await createTestDoc();
    const r = await prim.createIsometricBuilding({
      documentId: doc.id,
      x: 100, y: 500,
      width: 160, depth: 60, height: 200,
      floors: 6,
      perspective: { dx: 50, dy: -25 },
    });
    expect(r.success).toBe(true);
    expect(r.affectedElementIds.length).toBeGreaterThan(10);
    expect(r.extra!.generatedNodeCount).toBeGreaterThan(10);
    expect(r.extra!.hasWindows).toBe(true);
    expect(r.extra!.hasEntrance).toBe(true);
  });
});
