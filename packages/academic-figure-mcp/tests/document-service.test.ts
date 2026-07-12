/**
 * Tests for DocumentService — the core business logic.
 *
 * Critical test areas:
 *   1. Document lifecycle (create → edit → persist → reload → edit)
 *   2. Batch atomicity (all-or-nothing)
 *   3. Revision conflicts (optimistic locking)
 *   4. Unified WriteResult format
 *   5. Structured error format
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";

import { FileDocumentStore } from "../src/store/document-store.js";
import { DocumentService } from "../src/services/document-service.js";
import {
  RevisionConflictError,
  ElementNotFoundError,
  InvalidElementError,
  errorToJson,
} from "../src/utils/errors.js";

// ---------------------------------------------------------------------------
// Test infrastructure
// ---------------------------------------------------------------------------

const testDir = path.join(os.tmpdir(), `mcp-svc-test-${Date.now()}`);
const store = new FileDocumentStore(testDir);
const svc = new DocumentService(store);

beforeAll(async () => {
  await fs.mkdir(testDir, { recursive: true });
});

afterAll(async () => {
  await fs.rm(testDir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// 1. Document lifecycle
// ---------------------------------------------------------------------------

describe("Document lifecycle", () => {
  it("creates a document and returns unified WriteResult", async () => {
    const { document, result } = await svc.createDocument({
      name: "Lifecycle Test",
      width: 1200,
      height: 800,
    });

    expect(document.id).toMatch(/^doc_/);
    expect(document.name).toBe("Lifecycle Test");
    expect(document.revision).toBe(0);

    // Unified WriteResult
    expect(result.success).toBe(true);
    expect(result.documentId).toBe(document.id);
    expect(result.revision).toBe(0);
    expect(result.affectedElementIds).toContain("root");
  });

  it("creates a document with background", async () => {
    const { document, result } = await svc.createDocument({
      name: "With Background",
      width: 800,
      height: 600,
      background: "#f0f0f0",
    });

    expect(document.root.children).toHaveLength(1);
    expect(document.root.children[0]!.id).toBe("background");
    expect(document.root.children[0]!.attributes["fill"]).toBe("#f0f0f0");
    expect(result.affectedElementIds).toContain("background");
  });

  it("persists across 'server restart' (new store instance)", async () => {
    // Create
    const { document } = await svc.createDocument({
      name: "Persistence Test",
      width: 400,
      height: 300,
    });

    // Add elements
    await svc.createElement(document.id, {
      type: "rect",
      attributes: { x: 10, y: 10, width: 100, height: 100, fill: "blue" },
    });

    // Simulate restart: create a new store + service pointing at same dir
    const store2 = new FileDocumentStore(testDir);
    const svc2 = new DocumentService(store2);

    const doc = await svc2.getDocument(document.id);
    expect(doc.name).toBe("Persistence Test");
    expect(doc.revision).toBe(1); // One createElement was called
    expect(doc.root.children).toHaveLength(1);
    expect(doc.root.children[0]!.id).not.toBe("root");

    // Continue editing
    await svc2.createElement(doc.id, {
      type: "circle",
      attributes: { cx: 50, cy: 50, r: 25, fill: "red" },
    });

    const doc2 = await svc2.getDocument(document.id);
    expect(doc2.revision).toBe(2);
    expect(doc2.root.children).toHaveLength(2);
  });
});

// -------------------------------------------------------------------
// 2. Batch atomicity (ALL-OR-NOTHING)
// -------------------------------------------------------------------

describe("Batch create — transaction semantics", () => {
  it("creates all elements when inputs are valid", async () => {
    const { document } = await svc.createDocument({
      name: "Batch Test",
      width: 800,
      height: 600,
    });

    const result = await svc.batchCreateElements(document.id, [
      { type: "rect", attributes: { x: 0, y: 0, width: 50, height: 50 } },
      { type: "rect", attributes: { x: 50, y: 0, width: 50, height: 50 } },
      { type: "circle", attributes: { cx: 75, cy: 75, r: 25 } },
    ]);

    expect(result.success).toBe(true);
    expect(result.extra!.count).toBe(3);
    expect(result.affectedElementIds).toHaveLength(3);

    const doc = await svc.getDocument(document.id);
    expect(doc.root.children).toHaveLength(3);
  });

  it("creates zero elements when one input references a bad parent (ALL-OR-NOTHING)", async () => {
    const { document } = await svc.createDocument({
      name: "Batch Atomic Test",
      width: 800,
      height: 600,
    });

    const preRevision = document.revision;

    await expect(
      svc.batchCreateElements(document.id, [
        { type: "rect", attributes: { x: 0, y: 0, width: 50, height: 50 } },
        { type: "rect", parentId: "NONEXISTENT_PARENT", attributes: { x: 50, y: 0, width: 50, height: 50 } },
        { type: "circle", attributes: { cx: 75, cy: 75, r: 25 } },
      ]),
    ).rejects.toThrow(InvalidElementError);

    // Document should be UNCHANGED
    const doc = await svc.getDocument(document.id);
    expect(doc.root.children).toHaveLength(0);
    expect(doc.revision).toBe(preRevision);
  });

  it("validates all parent IDs before creating any elements", async () => {
    const { document } = await svc.createDocument({
      name: "Batch PreFlight Test",
      width: 800,
      height: 600,
    });

    // Create a valid group
    await svc.createElement(document.id, {
      id: "valid_group",
      type: "g",
      attributes: {},
    });

    const preChildren = (await svc.getDocument(document.id)).root.children.length;

    await expect(
      svc.batchCreateElements(document.id, [
        { type: "rect", parentId: "valid_group", attributes: { x: 0, y: 0, width: 50, height: 50 } },
        { type: "rect", parentId: "BAD_PARENT", attributes: { x: 50, y: 0, width: 50, height: 50 } },
      ]),
    ).rejects.toThrow('parent "BAD_PARENT" not found');

    // Valid group should STILL have zero children
    const doc = await svc.getDocument(document.id);
    expect(doc.root.children).toHaveLength(preChildren); // unchanged
  });
});

// -------------------------------------------------------------------
// 3. Revision conflicts (optimistic locking)
// -------------------------------------------------------------------

describe("Revision conflicts — optimistic locking", () => {
  it("succeeds when expectedRevision matches", async () => {
    const { document } = await svc.createDocument({
      name: "Revision Test",
      width: 800,
      height: 600,
    });

    const result = await svc.createElement(
      document.id,
      { type: "rect", attributes: { x: 0, y: 0, width: 100, height: 100 } },
      0, // expectedRevision = 0 (matches)
    );

    expect(result.success).toBe(true);
    expect(result.revision).toBe(1);
  });

  it("throws REVISION_CONFLICT with correct details when expectedRevision mismatches", async () => {
    const { document } = await svc.createDocument({
      name: "Conflict Test",
      width: 800,
      height: 600,
    });

    // First edit (AI A)
    await svc.createElement(document.id, { type: "rect", attributes: { x: 0, y: 0, width: 100, height: 100 } });
    // revision is now 1

    // Second edit with stale revision (AI B)
    try {
      await svc.createElement(
        document.id,
        { type: "circle", attributes: { cx: 50, cy: 50, r: 25 } },
        0, // expectedRevision = 0 (stale!)
      );
      // Should not reach here
      expect.unreachable("Expected RevisionConflictError was not thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(RevisionConflictError);
      const rce = e as RevisionConflictError;
      expect(rce.code).toBe("REVISION_CONFLICT");
      expect(rce.currentRevision).toBe(1);
      expect(rce.expectedRevision).toBe(0);
    }
  });

  it("serializes REVISION_CONFLICT with unified format", async () => {
    const { document } = await svc.createDocument({
      name: "Conflict Format Test",
      width: 800,
      height: 600,
    });

    await svc.createElement(document.id, { type: "rect", attributes: { x: 0, y: 0, width: 100, height: 100 } });

    try {
      await svc.createElement(
        document.id,
        { type: "circle", attributes: { cx: 50, cy: 50, r: 25 } },
        0,
      );
      expect.unreachable("Expected error");
    } catch (e) {
      const json = errorToJson(e);
      const parsed = JSON.parse(json);

      expect(parsed.success).toBe(false);
      expect(parsed.code).toBe("REVISION_CONFLICT");
      expect(parsed.currentRevision).toBe(1);
      expect(parsed.expectedRevision).toBe(0);
      expect(parsed.message).toContain("Document revision mismatch");
    }
  });

  it("allows writes without expectedRevision (no lock)", async () => {
    const { document } = await svc.createDocument({
      name: "No Lock Test",
      width: 800,
      height: 600,
    });

    // Without expectedRevision, should always succeed
    const r1 = await svc.createElement(document.id, {
      type: "rect", attributes: { x: 0, y: 0, width: 100, height: 100 },
    });
    expect(r1.success).toBe(true);

    const r2 = await svc.createElement(document.id, {
      type: "circle", attributes: { cx: 50, cy: 50, r: 25 },
    });
    expect(r2.success).toBe(true);
  });
});

// -------------------------------------------------------------------
// 4. Unified WriteResult format
// -------------------------------------------------------------------

describe("WriteResult format consistency", () => {
  it("create_element returns unified WriteResult", async () => {
    const { document } = await svc.createDocument({
      name: "Format Test",
      width: 800,
      height: 600,
    });

    const result = await svc.createElement(document.id, {
      type: "rect",
      attributes: { x: 0, y: 0, width: 100, height: 100 },
    });

    expect(result.success).toBe(true);
    expect(result.documentId).toBe(document.id);
    expect(typeof result.revision).toBe("number");
    expect(Array.isArray(result.affectedElementIds)).toBe(true);
    expect(result.affectedElementIds.length).toBeGreaterThan(0);
  });

  it("update_element returns unified WriteResult", async () => {
    const { document } = await svc.createDocument({
      name: "Update Format Test",
      width: 800,
      height: 600,
    });

    const created = await svc.createElement(document.id, {
      id: "target",
      type: "rect",
      attributes: { x: 0, y: 0, width: 100, height: 100, fill: "red" },
    });

    const result = await svc.updateElement(document.id, "target", {
      attributes: { fill: "blue" },
    });

    expect(result.success).toBe(true);
    expect(result.affectedElementIds).toEqual(["target"]);
    expect(result.revision).toBe(created.revision + 1);
  });

  it("delete_elements returns unified WriteResult", async () => {
    const { document } = await svc.createDocument({
      name: "Delete Format Test",
      width: 800,
      height: 600,
    });

    await svc.createElement(document.id, {
      id: "to_delete",
      type: "rect",
      attributes: { x: 0, y: 0, width: 100, height: 100 },
    });

    const result = await svc.deleteElements(document.id, ["to_delete"]);

    expect(result.success).toBe(true);
    expect(result.affectedElementIds).toEqual(["to_delete"]);
    expect(result.extra!.deletedCount).toBe(1);
  });

  it("transform_elements returns unified WriteResult", async () => {
    const { document } = await svc.createDocument({
      name: "Transform Format Test",
      width: 800,
      height: 600,
    });

    await svc.createElement(document.id, {
      id: "movable",
      type: "rect",
      attributes: { x: 0, y: 0, width: 100, height: 100 },
    });

    const result = await svc.transformElements(document.id, ["movable"], {
      translateX: 50,
      translateY: 30,
    });

    expect(result.success).toBe(true);
    expect(result.affectedElementIds).toEqual(["movable"]);
  });
});

// -------------------------------------------------------------------
// 5. Error format consistency
// -------------------------------------------------------------------

describe("Error format consistency", () => {
  it("DocumentNotFoundError has success:false and code", async () => {
    try {
      await svc.getDocument("does_not_exist");
      expect.unreachable("Expected error");
    } catch (e) {
      const json = errorToJson(e);
      const parsed = JSON.parse(json);
      expect(parsed.success).toBe(false);
      expect(parsed.code).toBe("DOCUMENT_NOT_FOUND");
    }
  });

  it("ElementNotFoundError has success:false and code", async () => {
    const { document } = await svc.createDocument({
      name: "Error Test",
      width: 800,
      height: 600,
    });

    try {
      await svc.updateElement(document.id, "no_such_element", { attributes: { fill: "red" } });
      expect.unreachable("Expected error");
    } catch (e) {
      expect(e).toBeInstanceOf(ElementNotFoundError);
      const json = errorToJson(e);
      const parsed = JSON.parse(json);
      expect(parsed.success).toBe(false);
      expect(parsed.code).toBe("ELEMENT_NOT_FOUND");
    }
  });

  it("Internal errors also have success:false", () => {
    const json = errorToJson(new Error("Something went wrong"));
    const parsed = JSON.parse(json);
    expect(parsed.success).toBe(false);
    expect(parsed.code).toBe("INTERNAL_ERROR");
    expect(parsed.message).toBe("Something went wrong");
  });
});

// -------------------------------------------------------------------
// 6. Create repeated elements
// -------------------------------------------------------------------

describe("Repeated elements", () => {
  it("creates a grid of elements", async () => {
    const { document } = await svc.createDocument({
      name: "Grid Test",
      width: 800,
      height: 600,
    });

    const result = await svc.createRepeatedElements({
      documentId: document.id,
      template: {
        type: "rect",
        attributes: { width: 14, height: 18, fill: "#B8D4E8", stroke: "#6889A3", "stroke-width": 0.8 },
        namePrefix: "window",
      },
      layout: {
        rows: 3,
        columns: 4,
        startX: 50,
        startY: 80,
        stepX: 24,
        stepY: 32,
      },
    });

    expect(result.success).toBe(true);
    expect(result.extra!.count).toBe(12);
    expect(result.extra!.grid).toBe("3×4");
    expect(result.affectedElementIds).toHaveLength(12);

    const doc = await svc.getDocument(document.id);
    expect(doc.root.children).toHaveLength(12);

    // Check naming
    expect(doc.root.children[0]!.name).toBe("window_0_0");
    expect(doc.root.children[11]!.name).toBe("window_2_3");

    // Check positioning
    const lastEl = doc.root.children[11]!;
    expect(lastEl.attributes["x"]).toBe(50 + 3 * 24); // 122
    expect(lastEl.attributes["y"]).toBe(80 + 2 * 32); // 144
  });
});

// -------------------------------------------------------------------
// 7. Query elements
// -------------------------------------------------------------------

describe("Query elements", () => {
  it("finds elements by type", async () => {
    const { document } = await svc.createDocument({
      name: "Query Test",
      width: 800,
      height: 600,
    });

    await svc.createElement(document.id, {
      id: "r1", type: "rect", attributes: { x: 0, y: 0, width: 100, height: 100 },
    });
    await svc.createElement(document.id, {
      id: "c1", type: "circle", attributes: { cx: 50, cy: 50, r: 25 },
    });

    const rects = await svc.queryElements(document.id, { type: "rect" });
    expect(rects).toHaveLength(1);
    expect(rects[0]!.id).toBe("r1");
  });

  it("finds elements by role", async () => {
    const { document } = await svc.createDocument({
      name: "Role Query Test",
      width: 800,
      height: 600,
    });

    await svc.createElement(document.id, {
      id: "env", type: "rect",
      attributes: { x: 0, y: 0, width: 100, height: 100 },
      metadata: { role: "environment" },
    });
    await svc.createElement(document.id, {
      id: "bldg", type: "rect",
      attributes: { x: 100, y: 0, width: 100, height: 100 },
      metadata: { role: "building" },
    });

    const buildings = await svc.queryElements(document.id, { role: "building" });
    expect(buildings).toHaveLength(1);
    expect(buildings[0]!.id).toBe("bldg");
  });
});
