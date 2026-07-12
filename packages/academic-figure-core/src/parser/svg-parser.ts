/**
 * SVG XML → SvgDocument parser.
 *
 * Enables round-trip synchronization between SVG-Edit (which produces SVG XML)
 * and the MCP server (which uses SvgDocument JSON). Parses a well-formed SVG
 * string into the structured node tree, preserving IDs, data-* attributes,
 * group hierarchy, and transform attributes.
 *
 * Supported elements:
 *   svg, g, rect, circle, ellipse, line, polyline, polygon, path, text,
 *   tspan, use, defs, symbol, marker, linearGradient, radialGradient,
 *   clipPath, image, style
 *
 * @module svg-parser
 */

import type { SvgDocument, SvgNode, SvgElementType, SvgMetadata } from "../document/types.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ParseSvgOptions {
  /** Keep attributes not in the recognized set (default: true) */
  preserveUnknownAttributes?: boolean;
  /** Keep elements with unrecognized tag names (default: true) */
  preserveUnknownElements?: boolean;
}

interface XmlNode {
  tagName: string;
  attributes: Record<string, string>;
  children: XmlNode[];
  textContent: string;
  isSelfClosing: boolean;
}

// ---------------------------------------------------------------------------
// XML Tokenizer & Parser
// ---------------------------------------------------------------------------

const CDATA_START = "<![CDATA[";
const CDATA_END = "]]>";
const COMMENT_START = "<!--";
const COMMENT_END = "-->";

const SUPPORTED_SVG_ELEMENTS = new Set<string>([
  "svg", "g", "rect", "circle", "ellipse", "line",
  "polyline", "polygon", "path", "text", "tspan",
  "use", "defs", "symbol", "marker",
  "linearGradient", "radialGradient", "clipPath",
  "image", "style", "title", "desc",
]);

const SELF_CLOSING_ELEMENTS = new Set<string>([
  "rect", "circle", "ellipse", "line", "polyline", "polygon",
  "path", "use", "image",
]);

/**
 * Minimal recursive-descent XML parser for SVG content.
 * Handles elements, attributes, text, CDATA, and comments.
 */
function parseXml(svg: string): XmlNode {
  let pos = 0;

  function skipWhitespace(): void {
    while (pos < svg.length && /[\s\n\r\t]/.test(svg[pos]!)) {
      pos++;
    }
  }

  function skipComments(): void {
    while (svg.startsWith(COMMENT_START, pos)) {
      const end = svg.indexOf(COMMENT_END, pos);
      if (end === -1) break;
      pos = end + COMMENT_END.length;
      skipWhitespace();
    }
  }

  function readUntil(stop: string): string {
    let result = "";
    while (pos < svg.length && !svg.startsWith(stop, pos)) {
      result += svg[pos];
      pos++;
    }
    return result;
  }

  function readName(): string {
    let name = "";
    while (pos < svg.length && /[a-zA-Z0-9_:.\-]/.test(svg[pos]!)) {
      name += svg[pos];
      pos++;
    }
    return name;
  }

  function readQuotedValue(): string {
    const quote = svg[pos]!;
    pos++; // skip opening quote
    let value = "";
    while (pos < svg.length && svg[pos] !== quote) {
      if (svg[pos] === "&") {
        const semi = svg.indexOf(";", pos);
        if (semi !== -1) {
          const entity = svg.slice(pos, semi + 1);
          const char = ENTITY_MAP[entity];
          value += char ?? entity;
          pos = semi + 1;
          continue;
        }
      }
      value += svg[pos];
      pos++;
    }
    if (pos < svg.length) pos++; // skip closing quote
    return value;
  }

  function readAttributes(): Record<string, string> {
    const attrs: Record<string, string> = {};
    while (pos < svg.length) {
      skipWhitespace();
      const ch = svg[pos];
      if (ch === undefined || ch === ">" || ch === "/") break;
      const name = readName();
      if (!name) break;
      skipWhitespace();
      if (svg[pos] !== "=") {
        attrs[name] = name; // boolean attribute
        continue;
      }
      pos++; // skip =
      skipWhitespace();
      if (svg[pos] === '"' || svg[pos] === "'") {
        attrs[name] = readQuotedValue();
      } else {
        attrs[name] = readName();
      }
    }
    return attrs;
  }

  function parseNode(): XmlNode | null {
    skipWhitespace();
    skipComments();

    if (pos >= svg.length) return null;

    // Text content
    if (svg[pos] !== "<") {
      const text = readUntil("<");
      if (text.trim()) {
        return {
          tagName: "#text",
          attributes: {},
          children: [],
          textContent: text.trim(),
          isSelfClosing: true,
        };
      }
      pos++; // skip <
      return parseNode();
    }

    pos++; // skip <

    // Closing tag — return null to let caller handle it
    if (svg[pos] === "/") return null;

    // Processing instruction or DOCTYPE
    if (svg[pos] === "?" || svg[pos] === "!") {
      const ch = svg[pos]!;
      if (ch === "!" && svg.startsWith(CDATA_START, pos)) {
        pos += CDATA_START.length;
        const cdata = readUntil(CDATA_END);
        pos += CDATA_END.length;
        return cdata.trim()
          ? { tagName: "#text", attributes: {}, children: [], textContent: cdata.trim(), isSelfClosing: true }
          : parseNode();
      }
      // Skip DOCTYPE and PI
      const end = svg.indexOf(">", pos);
      if (end !== -1) pos = end + 1;
      return parseNode();
    }

    const tagName = readName();
    const attributes = readAttributes();
    skipWhitespace();

    const children: XmlNode[] = [];
    let textContent = "";
    let isSelfClosing = false;

    if (svg[pos] === "/") {
      pos++; // skip /
      isSelfClosing = true;
    }

    if (svg[pos] === ">") {
      pos++; // skip >
    }

    if (!isSelfClosing) {
      const closeTag = `</${tagName}>`;

      while (pos < svg.length) {
        skipWhitespace();
        skipComments();

        if (svg.startsWith(closeTag, pos)) {
          pos += closeTag.length;
          break;
        }

        // Handle self-closing children
        if (svg[pos] === "<" && svg[pos + 1] !== "/") {
          const child = parseNode();
          if (child) {
            if (child.tagName === "#text") {
              textContent += (textContent ? " " : "") + child.textContent;
            } else {
              children.push(child);
            }
          }
        } else if (svg[pos] === "<" && svg[pos + 1] === "/") {
          break; // closing tag — handled above
        } else {
          const text = readUntil("<");
          if (text.trim()) {
            textContent += (textContent ? " " : "") + text.trim();
          }
        }
      }
    }

    // Merge text content from direct text children
    const textChildren = children.filter((c) => c.tagName === "#text");
    for (const tc of textChildren) {
      textContent += (textContent ? " " : "") + tc.textContent;
    }

    return {
      tagName,
      attributes,
      children: children.filter((c) => c.tagName !== "#text"),
      textContent: textContent || "",
      isSelfClosing: isSelfClosing || SELF_CLOSING_ELEMENTS.has(tagName),
    };
  }

  const root = parseNode();
  if (!root) {
    throw new Error("Failed to parse SVG: no root element found");
  }
  return root;
}

// ---------------------------------------------------------------------------
// XML entity map
// ---------------------------------------------------------------------------

const ENTITY_MAP: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&apos;": "'",
  "&nbsp;": " ",
};

// ---------------------------------------------------------------------------
// XmlNode → SvgDocument conversion
// ---------------------------------------------------------------------------

function parseMetadata(
  attributes: Record<string, string>,
): SvgMetadata | undefined {
  const metadata: SvgMetadata = {};
  let hasMetadata = false;

  if (attributes["data-role"]) {
    metadata.role = attributes["data-role"] as SvgMetadata["role"];
    hasMetadata = true;
  }
  if (attributes["data-semantic-name"]) {
    metadata.semanticName = attributes["data-semantic-name"];
    hasMetadata = true;
  }
  if (attributes["data-importance"]) {
    metadata.importance = attributes["data-importance"] as SvgMetadata["importance"];
    hasMetadata = true;
  }
  if (attributes["data-category"]) {
    metadata.category = attributes["data-category"];
    hasMetadata = true;
  }

  return hasMetadata ? metadata : undefined;
}

/**
 * Map a parsed XmlNode to an SvgNode.
 */
function xmlToSvgNode(
  xml: XmlNode,
  options: ParseSvgOptions,
): SvgNode | null {
  const tagName = xml.tagName.toLowerCase();

  // Filter unsupported elements
  if (!SUPPORTED_SVG_ELEMENTS.has(tagName) && !options.preserveUnknownElements) {
    return null;
  }

  // Build clean attributes (strip data-*, keep presentation attrs)
  const cleanAttrs: Record<string, string | number> = {};
  let name: string | undefined;

  for (const [key, value] of Object.entries(xml.attributes)) {
    if (key === "id") continue; // stored as node.id
    if (key === "data-name") {
      name = value;
      continue;
    }
    if (key.startsWith("data-")) continue; // parsed into metadata

    // Try to convert numeric values
    if (key !== "fill" && key !== "stroke" && key !== "transform" && key !== "style") {
      const num = Number(value);
      if (!isNaN(num) && String(num) === value) {
        cleanAttrs[key] = num;
        continue;
      }
    }
    cleanAttrs[key] = value;
  }

  const metadata = parseMetadata(xml.attributes);

  // Recursively convert children, filtering nulls
  const children = xml.children
    .map((c) => xmlToSvgNode(c, options))
    .filter((c): c is SvgNode => c !== null);

  const text: string | undefined = xml.textContent || undefined;

  return {
    id: xml.attributes["id"] ?? `el_${Math.random().toString(36).slice(2, 10)}`,
    type: tagName as SvgElementType,
    name,
    attributes: cleanAttrs,
    text,
    metadata,
    children,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parse an SVG string into a structured SvgDocument.
 *
 * @param svg       - The SVG XML string to parse
 * @param options   - Parsing options
 * @returns A fully-structured SvgDocument suitable for editing via MCP tools
 */
export function parseSvgDocument(
  svg: string,
  options: ParseSvgOptions = {},
): SvgDocument {
  const {
    preserveUnknownAttributes = true,
    preserveUnknownElements = true,
  } = options;

  const xmlRoot = parseXml(svg);

  // Find the <svg> element (may be at root or nested)
  let svgEl: XmlNode;
  if (xmlRoot.tagName.toLowerCase() === "svg") {
    svgEl = xmlRoot;
  } else {
    // Look for <svg> in children
    const found = xmlRoot.children.find(
      (c) => c.tagName.toLowerCase() === "svg",
    );
    if (!found) {
      throw new Error("No <svg> element found in SVG string");
    }
    svgEl = found;
  }

  // Parse dimensions
  const width = parseFloat(svgEl.attributes["width"] ?? "800") || 800;
  const height = parseFloat(svgEl.attributes["height"] ?? "600") || 600;
  const viewBox =
    svgEl.attributes["viewBox"] ?? `0 0 ${width} ${height}`;

  // Convert children
  const children = svgEl.children
    .map((c) => xmlToSvgNode(c, { preserveUnknownAttributes, preserveUnknownElements }))
    .filter((c): c is SvgNode => c !== null);

  const now = new Date().toISOString();
  const docId = `doc_${Math.random().toString(36).slice(2, 10)}`;

  return {
    id: docId,
    name: svgEl.attributes["data-name"] ?? "Imported SVG",
    width,
    height,
    viewBox,
    revision: 0,
    createdAt: now,
    updatedAt: now,
    root: {
      id: "root",
      type: "svg",
      attributes: {},
      children,
    },
  };
}
