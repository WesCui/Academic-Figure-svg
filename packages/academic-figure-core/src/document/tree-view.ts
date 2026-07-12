/**
 * Lightweight tree view builder for human-readable document inspection.
 * Produces a text-based tree similar to `tree` command output.
 *
 * @module tree-view
 */

import type { SvgNode } from "./types.js";

const TREE_BRANCH = "├── ";
const TREE_LAST = "└── ";
const TREE_PIPE = "│   ";
const TREE_SPACE = "    ";

function formatNodeLabel(node: SvgNode): string {
  const name = node.name ?? node.id;
  const typeTag = node.type;

  let label = `${name} [${typeTag}]`;

  if (node.metadata?.role) {
    label += ` role=${node.metadata.role}`;
  }

  if (node.text !== undefined && node.text.length > 0) {
    const truncated = node.text.length > 40 ? node.text.slice(0, 40) + "…" : node.text;
    label += ` "${truncated}"`;
  }

  return label;
}

function buildTree(
  node: SvgNode,
  prefix: string,
  isLast: boolean,
  maxDepth: number,
  currentDepth: number,
): string[] {
  const lines: string[] = [];

  if (currentDepth > maxDepth) {
    return lines;
  }

  const connector = isLast ? TREE_LAST : TREE_BRANCH;
  lines.push(`${prefix}${connector}${formatNodeLabel(node)}`);

  const childPrefix = prefix + (isLast ? TREE_SPACE : TREE_PIPE);

  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i]!;
    const childIsLast = i === node.children.length - 1;
    lines.push(
      ...buildTree(child, childPrefix, childIsLast, maxDepth, currentDepth + 1),
    );
  }

  return lines;
}

/**
 * Render a tree view of the SVG document structure.
 *
 * @param root - The root node to render from
 * @param maxDepth - Maximum depth to traverse (default: 10)
 * @returns Multi-line string suitable for display
 */
export function renderTree(root: SvgNode, maxDepth = 10): string {
  const rootLabel = `${root.id} [${root.type}]`;
  const lines = [rootLabel];

  for (let i = 0; i < root.children.length; i++) {
    const child = root.children[i]!;
    const isLast = i === root.children.length - 1;
    lines.push(...buildTree(child, "", isLast, maxDepth, 1));
  }

  return lines.join("\n");
}
