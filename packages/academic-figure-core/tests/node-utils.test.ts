/**
 * Unit tests for node-utils — the core tree traversal utilities.
 */
import { describe, it, expect } from "vitest";
import type { SvgNode } from "../src/document/types.js";
import {
  findNode,
  ensureNode,
  findNodes,
  removeNode,
  moveNode,
  countNodes,
  cloneNode,
  getAncestry,
} from "../src/document/node-utils.js";

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function makeTree(): SvgNode {
  return {
    id: "root",
    type: "svg",
    attributes: {},
    children: [
      {
        id: "g1",
        type: "g",
        attributes: {},
        children: [
          { id: "rect1", type: "rect", attributes: { x: 10, y: 20, width: 100, height: 50, fill: "#ff0000" }, children: [] },
          { id: "circle1", type: "circle", attributes: { cx: 50, cy: 50, r: 30 }, children: [] },
        ],
      },
      {
        id: "g2",
        type: "g",
        attributes: {},
        children: [
          { id: "text1", type: "text", attributes: { x: 0, y: 0 }, text: "Hello", children: [] },
        ],
      },
    ],
  };
}

// ---------------------------------------------------------------------------

describe("findNode", () => {
  const root = makeTree();

  it("finds a top-level child", () => {
    const result = findNode(root, "g1");
    expect(result).not.toBeNull();
    expect(result!.node.id).toBe("g1");
    expect(result!.parent!.id).toBe("root");
  });

  it("finds a deeply nested child", () => {
    const result = findNode(root, "rect1");
    expect(result).not.toBeNull();
    expect(result!.node.id).toBe("rect1");
    expect(result!.node.type).toBe("rect");
    expect(result!.parent!.id).toBe("g1");
  });

  it("finds the root itself", () => {
    const result = findNode(root, "root");
    expect(result).not.toBeNull();
    expect(result!.node.id).toBe("root");
    expect(result!.parent).toBeNull();
  });

  it("returns null for missing nodes", () => {
    expect(findNode(root, "nonexistent")).toBeNull();
  });
});

describe("ensureNode", () => {
  const root = makeTree();

  it("returns the node when found", () => {
    const result = ensureNode(root, "rect1");
    expect(result.node.id).toBe("rect1");
  });

  it("throws for missing nodes", () => {
    expect(() => ensureNode(root, "bad_id")).toThrow("SVG element not found: bad_id");
  });
});

describe("findNodes", () => {
  const root = makeTree();

  it("finds all rect elements", () => {
    const rects = findNodes(root, (n) => n.type === "rect");
    expect(rects).toHaveLength(1);
    expect(rects[0]!.id).toBe("rect1");
  });

  it("finds all g elements", () => {
    const groups = findNodes(root, (n) => n.type === "g");
    expect(groups).toHaveLength(2);
  });

  it("returns empty array when nothing matches", () => {
    const ellipses = findNodes(root, (n) => n.type === "ellipse");
    expect(ellipses).toHaveLength(0);
  });
});

describe("removeNode", () => {
  it("removes a child from its parent", () => {
    const root = makeTree();
    const removed = removeNode(root, "rect1");
    expect(removed).not.toBeNull();
    expect(removed!.id).toBe("rect1");

    // Verify it's gone
    expect(findNode(root, "rect1")).toBeNull();

    // Verify parent still has other children
    const g1 = ensureNode(root, "g1");
    expect(g1.node.children).toHaveLength(1);
    expect(g1.node.children[0]!.id).toBe("circle1");
  });

  it("returns null for non-existent node", () => {
    const root = makeTree();
    expect(removeNode(root, "nonexistent")).toBeNull();
  });

  it("returns null when trying to remove root", () => {
    const root = makeTree();
    expect(removeNode(root, "root")).toBeNull();
  });
});

describe("moveNode", () => {
  it("moves a node from one parent to another", () => {
    const root = makeTree();
    moveNode(root, "rect1", "g2");

    // Should no longer be in g1
    const g1 = ensureNode(root, "g1");
    expect(g1.node.children.map((c) => c.id)).not.toContain("rect1");

    // Should now be in g2
    const g2 = ensureNode(root, "g2");
    expect(g2.node.children.map((c) => c.id)).toContain("rect1");
    expect(g2.node.children).toHaveLength(2);
  });

  it("throws for missing nodes", () => {
    const root = makeTree();
    expect(() => moveNode(root, "bad", "g2")).toThrow("SVG element not found");
    expect(() => moveNode(root, "rect1", "bad")).toThrow("SVG element not found");
  });
});

describe("countNodes", () => {
  it("counts all nodes including root", () => {
    const root = makeTree();
    // root, g1, rect1, circle1, g2, text1 = 6
    expect(countNodes(root)).toBe(6);
  });

  it("returns 1 for an empty root", () => {
    const root: SvgNode = { id: "root", type: "svg", attributes: {}, children: [] };
    expect(countNodes(root)).toBe(1);
  });
});

describe("cloneNode", () => {
  it("deep-clones a tree", () => {
    const root = makeTree();
    const clone = cloneNode(root);

    expect(clone).not.toBe(root);
    expect(clone.id).toBe(root.id);
    expect(clone.children).toHaveLength(root.children.length);

    // Mutating clone shouldn't affect original
    clone.children[0]!.id = "changed";
    expect(root.children[0]!.id).toBe("g1");
  });

  it("clones metadata and tags", () => {
    const root: SvgNode = {
      id: "root",
      type: "svg",
      attributes: {},
      metadata: { role: "environment", tags: ["a", "b"] },
      children: [],
    };
    const clone = cloneNode(root);
    expect(clone.metadata?.role).toBe("environment");
    expect(clone.metadata?.tags).toEqual(["a", "b"]);
    clone.metadata!.tags!.push("c");
    expect(root.metadata!.tags).toEqual(["a", "b"]); // original unchanged
  });
});

describe("getAncestry", () => {
  it("returns the chain from root to target", () => {
    const root = makeTree();
    const chain = getAncestry(root, "rect1");
    expect(chain.map((n) => n.id)).toEqual(["root", "g1", "rect1"]);
  });

  it("returns only the node if it is the root", () => {
    const root = makeTree();
    const chain = getAncestry(root, "root");
    expect(chain.map((n) => n.id)).toEqual(["root"]);
  });

  it("returns empty array for missing node", () => {
    const root = makeTree();
    expect(getAncestry(root, "bad")).toHaveLength(0);
  });
});
