/**
 * Tree utilities for traversing and manipulating the SVG node tree.
 * All operations are pure — they mutate the tree in place for performance
 * but never touch the DOM.
 *
 * @module node-utils
 */

import type { SvgNode, NodeLocation } from "./types.js";

/**
 * Find a node by ID in the tree (depth-first).
 * Returns both the node and its parent for easy mutation.
 */
export function findNode(
  root: SvgNode,
  targetId: string,
  parent: SvgNode | null = null,
): NodeLocation | null {
  if (root.id === targetId) {
    return { node: root, parent };
  }

  for (const child of root.children) {
    const result = findNode(child, targetId, root);
    if (result) {
      return result;
    }
  }

  return null;
}

/**
 * Like findNode, but throws if the node is not found.
 */
export function ensureNode(root: SvgNode, targetId: string): NodeLocation {
  const result = findNode(root, targetId);
  if (!result) {
    throw new Error(`SVG element not found: ${targetId}`);
  }
  return result;
}

/**
 * Find all nodes matching a predicate (depth-first).
 */
export function findNodes(
  root: SvgNode,
  predicate: (node: SvgNode) => boolean,
): SvgNode[] {
  const results: SvgNode[] = [];

  function walk(node: SvgNode): void {
    if (predicate(node)) {
      results.push(node);
    }
    for (const child of node.children) {
      walk(child);
    }
  }

  walk(root);
  return results;
}

/**
 * Remove a node from its parent's children array.
 * Returns the removed node, or null if not found.
 */
export function removeNode(root: SvgNode, targetId: string): SvgNode | null {
  const location = findNode(root, targetId);
  if (!location || !location.parent) {
    return null;
  }

  const index = location.parent.children.indexOf(location.node);
  if (index !== -1) {
    location.parent.children.splice(index, 1);
  }

  return location.node;
}

/**
 * Move a node to a new parent.
 */
export function moveNode(
  root: SvgNode,
  targetId: string,
  newParentId: string,
): void {
  const nodeLoc = ensureNode(root, targetId);
  const newParentLoc = ensureNode(root, newParentId);

  if (!nodeLoc.parent) {
    throw new Error("Cannot move the root node");
  }

  // Remove from old parent
  const idx = nodeLoc.parent.children.indexOf(nodeLoc.node);
  if (idx !== -1) {
    nodeLoc.parent.children.splice(idx, 1);
  }

  // Add to new parent
  newParentLoc.node.children.push(nodeLoc.node);
}

/**
 * Count all nodes in the tree (including root).
 */
export function countNodes(root: SvgNode): number {
  let count = 1;
  for (const child of root.children) {
    count += countNodes(child);
  }
  return count;
}

/**
 * Deep-clone a SvgNode tree.
 */
export function cloneNode(node: SvgNode): SvgNode {
  return {
    id: node.id,
    type: node.type,
    name: node.name,
    attributes: { ...node.attributes },
    text: node.text,
    metadata: node.metadata ? { ...node.metadata, tags: [...(node.metadata.tags ?? [])] } : undefined,
    children: node.children.map((child) => cloneNode(child)),
  };
}

/**
 * Get the ancestry chain from root to a node (root first).
 */
export function getAncestry(root: SvgNode, targetId: string): SvgNode[] {
  const chain: SvgNode[] = [];

  function walk(node: SvgNode, ancestors: SvgNode[]): boolean {
    if (node.id === targetId) {
      chain.push(...ancestors, node);
      return true;
    }
    for (const child of node.children) {
      if (walk(child, [...ancestors, node])) {
        return true;
      }
    }
    return false;
  }

  walk(root, []);
  return chain;
}
