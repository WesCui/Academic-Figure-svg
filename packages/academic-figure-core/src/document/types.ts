/**
 * Core types for the Academic Figure structured SVG document model.
 * These types define the internal representation that is independent of
 * any browser DOM, allowing MCP server, resvg, and SVG-Edit to all work
 * from the same source of truth.
 *
 * @module academic-figure-core
 */

export type SvgElementType =
  | "svg"
  | "g"
  | "rect"
  | "circle"
  | "ellipse"
  | "line"
  | "polyline"
  | "polygon"
  | "path"
  | "text"
  | "image"
  | "use";

export type SvgAttributeValue = string | number;

/**
 * Semantic metadata attached to SVG elements.
 * Stored as data-* attributes in the serialized SVG,
 * and as a first-class field in the JSON document model.
 */
export interface SvgMetadata {
  /** Human-readable semantic name (e.g. "Left Building") */
  semanticName?: string;

  /** Semantic role of this element in the figure */
  role?:
    | "environment"
    | "building"
    | "road"
    | "vegetation"
    | "entity"
    | "communication-link"
    | "annotation"
    | "legend";

  /** Visual importance level */
  importance?: "background" | "secondary" | "primary";

  /** Category for organizational grouping */
  category?: string;

  /** Whether this element can be manually edited in SVG-Edit */
  editable?: boolean;

  /** Free-form tags for querying */
  tags?: string[];
}

/**
 * A node in the structured SVG tree.
 */
export interface SvgNode {
  /** Unique element ID (maps to SVG id attribute) */
  id: string;

  /** SVG element type */
  type: SvgElementType;

  /** Optional display name (maps to data-name attribute) */
  name?: string;

  /** SVG presentation attributes (e.g. fill, stroke, x, y, width, height) */
  attributes: Record<string, SvgAttributeValue>;

  /** Text content for <text> elements */
  text?: string;

  /** Semantic metadata */
  metadata?: SvgMetadata;

  /** Child elements */
  children: SvgNode[];
}

/**
 * Top-level SVG document.
 */
export interface SvgDocument {
  /** Unique document identifier */
  id: string;

  /** Human-readable document name */
  name: string;

  /** Canvas width in user units */
  width: number;

  /** Canvas height in user units */
  height: number;

  /** SVG viewBox string (e.g. "0 0 800 600") */
  viewBox: string;

  /** Monotonic revision counter for optimistic locking */
  revision: number;

  /** ISO 8601 creation timestamp */
  createdAt: string;

  /** ISO 8601 last-modified timestamp */
  updatedAt: string;

  /** The root <svg> node (children are the document contents) */
  root: SvgNode;
}

/**
 * Result of a node lookup within the tree.
 */
export interface NodeLocation {
  node: SvgNode;
  parent: SvgNode | null;
}

/**
 * Input shape for creating a single element.
 */
export interface CreateElementInput {
  /** Parent group/node ID. Defaults to "root". */
  parentId?: string;

  /** Explicit element ID. Auto-generated if omitted. */
  id?: string;

  type: SvgElementType;

  name?: string;

  attributes: Record<string, SvgAttributeValue>;

  text?: string;

  metadata?: SvgMetadata;
}

/**
 * Input for batch element creation.
 */
export interface BatchCreateInput {
  documentId: string;
  elements: CreateElementInput[];
}

/**
 * Transform applied to a set of elements.
 */
export interface ElementTransform {
  translateX?: number;
  translateY?: number;
  scaleX?: number;
  scaleY?: number;
  rotate?: number;
}

/**
 * Layout descriptor for repeated element grids.
 */
export interface GridLayout {
  rows: number;
  columns: number;
  startX: number;
  startY: number;
  stepX: number;
  stepY: number;
}
