/**
 * Structured SVG → XML string serializer.
 * Produces clean, indented SVG output from the internal SvgDocument model.
 * Metadata fields are serialized as data-* attributes.
 *
 * @module svg-serializer
 */

import type { SvgDocument, SvgNode } from "../document/types.js";

/**
 * Escape XML special characters in text content and attribute values.
 */
function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

/**
 * Serialize a flat attributes record into an XML attribute string.
 */
function serializeAttributes(
  attributes: Record<string, string | number>,
): string {
  const entries = Object.entries(attributes);
  if (entries.length === 0) return "";
  return (
    " " +
    entries
      .map(([key, value]) => `${key}="${escapeXml(String(value))}"`)
      .join(" ")
  );
}

/**
 * Recursively serialize a single SvgNode to an indented XML string.
 */
function serializeNode(node: SvgNode, depth = 1): string {
  const indent = "  ".repeat(depth);

  // Build attributes, including metadata as data-* attrs
  const attrs: Record<string, string | number> = { ...node.attributes };

  // Always emit id unless it's the synthetic root
  if (node.id && node.type !== "svg") {
    attrs.id = node.id;
  }

  if (node.name) {
    attrs["data-name"] = node.name;
  }

  if (node.metadata?.role) {
    attrs["data-role"] = node.metadata.role;
  }

  if (node.metadata?.semanticName) {
    attrs["data-semantic-name"] = node.metadata.semanticName;
  }

  if (node.metadata?.importance) {
    attrs["data-importance"] = node.metadata.importance;
  }

  if (node.metadata?.category) {
    attrs["data-category"] = node.metadata.category;
  }

  const attrText = serializeAttributes(attrs);

  // Self-closing tag for leaf elements without text
  if (node.children.length === 0 && node.text === undefined) {
    return `${indent}<${node.type}${attrText} />`;
  }

  const lines: string[] = [];
  lines.push(`${indent}<${node.type}${attrText}>`);

  if (node.text !== undefined) {
    lines.push(`${indent}  ${escapeXml(node.text)}`);
  }

  for (const child of node.children) {
    lines.push(serializeNode(child, depth + 1));
  }

  lines.push(`${indent}</${node.type}>`);

  return lines.join("\n");
}

/**
 * Serialize a full SvgDocument to a complete, standalone SVG XML string.
 *
 * @param document - The structured SVG document
 * @returns Valid SVG XML string
 */
export function serializeSvgDocument(document: SvgDocument): string {
  const children = document.root.children
    .map((node) => serializeNode(node))
    .join("\n");

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg`,
    `  xmlns="http://www.w3.org/2000/svg"`,
    `  xmlns:xlink="http://www.w3.org/1999/xlink"`,
    `  width="${document.width}"`,
    `  height="${document.height}"`,
    `  viewBox="${document.viewBox}"`,
    `>`,
    children ? children : "",
    `</svg>`,
    "",
  ].join("\n");
}
