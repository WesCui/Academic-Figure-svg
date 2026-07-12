/**
 * Tests for FileDocumentStore — file-based persistence.
 * Verifies document lifecycle across "server restarts".
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";

import { FileDocumentStore } from "../src/store/document-store.js";
import type { SvgDocument } from "@academic-figure/core";

// Use a temp dir for test isolation
const testDir = path.join(os.tmpdir(), `mcp-test-${Date.now()}`);
const store = new FileDocumentStore(testDir);

function makeDoc(id: string): SvgDocument {
  const now = new Date().toISOString();
  return {
    id,
    name: `Test ${id}`,
    width: 800,
    height: 600,
    viewBox: "0 0 800 600",
    revision: 1,
    createdAt: now,
    updatedAt: now,
    root: {
      id: "root",
      type: "svg",
      attributes: {},
      children: [
        { id: "r1", type: "rect", attributes: { x: 10, y: 20, width: 100, height: 50, fill: "#ff0000" }, children: [] },
      ],
    },
  };
}

beforeAll(async () => {
  await fs.mkdir(testDir, { recursive: true });
});

afterAll(async () => {
  await fs.rm(testDir, { recursive: true, force: true });
});

describe("FileDocumentStore", () => {
  it("creates and saves a document", async () => {
    const doc = makeDoc("doc_create_test");
    await store.create(doc);

    expect(await store.exists("doc_create_test")).toBe(true);
  });

  it("loads a saved document", async () => {
    const doc = makeDoc("doc_load_test");
    await store.create(doc);

    const loaded = await store.get("doc_load_test");
    expect(loaded.id).toBe("doc_load_test");
    expect(loaded.name).toBe("Test doc_load_test");
    expect(loaded.width).toBe(800);
    expect(loaded.height).toBe(600);
    expect(loaded.root.children[0]!.attributes["fill"]).toBe("#ff0000");
  });

  it("returns false for non-existent document", async () => {
    expect(await store.exists("does_not_exist")).toBe(false);
  });

  it("throws DocumentNotFoundError for missing document", async () => {
    await expect(store.get("does_not_exist")).rejects.toThrow("SVG document not found");
  });

  it("persists document.json to disk", async () => {
    const doc = makeDoc("doc_persist_test");
    await store.create(doc);

    const filePath = path.join(testDir, "documents", "doc_persist_test", "document.json");
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as SvgDocument;

    expect(parsed.id).toBe("doc_persist_test");
    expect(parsed.name).toBe("Test doc_persist_test");
  });

  it("updates updatedAt on save", async () => {
    const doc = makeDoc("doc_timestamp_test");
    await store.create(doc);

    const first = (await store.get("doc_timestamp_test")).updatedAt;

    // Wait a tiny bit then re-save
    await new Promise((r) => setTimeout(r, 10));
    const loaded = await store.get("doc_timestamp_test");
    loaded.revision += 1;
    await store.save(loaded);

    const second = (await store.get("doc_timestamp_test")).updatedAt;
    expect(second).not.toBe(first);
  });

  it("deletes a document", async () => {
    const doc = makeDoc("doc_delete_test");
    await store.create(doc);
    expect(await store.exists("doc_delete_test")).toBe(true);

    await store.delete("doc_delete_test");
    expect(await store.exists("doc_delete_test")).toBe(false);
  });
});
