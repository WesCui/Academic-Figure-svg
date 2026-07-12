/**
 * Core document CRUD operations.
 * This is the primary business-logic layer — all element manipulation
 * flows through here, keeping the MCP tool handlers thin.
 *
 * All write operations return a unified {@link WriteResult} and throw
 * structured errors ({@link RevisionConflictError}, etc.) on failure.
 *
 * @module document-service
 */

import type {
  SvgDocument,
  SvgNode,
  CreateElementInput,
  ElementTransform,
  GridLayout,
} from "@academic-figure/core";

import { ensureNode, countNodes } from "@academic-figure/core";

import type { DocumentStore } from "../store/document-store.js";
import { generateDocumentId, generateElementId } from "../utils/ids.js";
import {
  ElementNotFoundError,
  RevisionConflictError,
  InvalidElementError,
} from "../utils/errors.js";

// ---------------------------------------------------------------------------
// Public interfaces
// ---------------------------------------------------------------------------

export interface CreateDocumentInput {
  name: string;
  width: number;
  height: number;
  background?: string;
}

export interface UpdateElementInput {
  attributes?: Record<string, string | number | null>;
  text?: string;
  name?: string;
}

export interface BatchCreateInput {
  documentId: string;
  elements: CreateElementInput[];
}

export interface RepeatedElementsInput {
  documentId: string;
  parentId?: string;
  template: {
    type: CreateElementInput["type"];
    attributes: Record<string, string | number>;
    namePrefix?: string;
  };
  layout: GridLayout;
}

export interface QueryElementsInput {
  parentId?: string;
  type?: string;
  role?: string;
  importance?: string;
  tags?: string[];
}

/**
 * Unified return type for all write operations.
 */
export interface WriteResult {
  success: true;
  documentId: string;
  revision: number;
  affectedElementIds: string[];
  /** Additional operation-specific data (e.g. element count, grid dimensions) */
  extra?: Record<string, unknown>;
}

/**
 * Unified error shape returned to the MCP client.
 */
export interface ToolError {
  success: false;
  code: string;
  message: string;
  expectedRevision?: number;
  currentRevision?: number;
  details?: unknown;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ok(
  document: SvgDocument,
  affectedElementIds: string[],
  extra?: Record<string, unknown>,
): WriteResult {
  return {
    success: true,
    documentId: document.id,
    revision: document.revision,
    affectedElementIds,
    ...(extra ? { extra } : {}),
  };
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class DocumentService {
  constructor(private readonly store: DocumentStore) {}

  // -------------------------------------------------------------------
  // Document lifecycle
  // -------------------------------------------------------------------

  public async createDocument(
    input: CreateDocumentInput,
  ): Promise<{ document: SvgDocument; result: WriteResult }> {
    const now = new Date().toISOString();

    const document: SvgDocument = {
      id: generateDocumentId(),
      name: input.name,
      width: input.width,
      height: input.height,
      viewBox: `0 0 ${input.width} ${input.height}`,
      revision: 0,
      createdAt: now,
      updatedAt: now,
      root: {
        id: "root",
        type: "svg",
        attributes: {},
        children: [],
      },
    };

    const affectedIds: string[] = [];

    if (input.background) {
      const bgId = "background";
      document.root.children.push({
        id: bgId,
        type: "rect",
        attributes: {
          x: 0,
          y: 0,
          width: input.width,
          height: input.height,
          fill: input.background,
        },
        metadata: { role: "environment", importance: "background" },
        children: [],
      });
      affectedIds.push(bgId);
    }

    await this.store.create(document);

    return {
      document,
      result: ok(document, [...affectedIds, "root"]),
    };
  }

  public async getDocument(documentId: string): Promise<SvgDocument> {
    return this.store.get(documentId);
  }

  public async deleteDocument(documentId: string): Promise<void> {
    await this.store.delete(documentId);
  }

  // -------------------------------------------------------------------
  // Element CRUD
  // -------------------------------------------------------------------

  public async createElement(
    documentId: string,
    input: CreateElementInput,
    expectedRevision?: number,
  ): Promise<WriteResult> {
    const document = await this.store.get(documentId);
    this.checkRevision(document, expectedRevision);

    const parentId = input.parentId ?? "root";
    const { node: parent } = this.getNode(document.root, parentId);

    const node: SvgNode = {
      id: input.id ?? generateElementId(),
      type: input.type,
      name: input.name,
      attributes: { ...input.attributes },
      text: input.text,
      metadata: input.metadata,
      children: [],
    };

    parent.children.push(node);
    document.revision += 1;
    await this.store.save(document);

    return ok(document, [node.id]);
  }

  /**
   * Batch-create elements with **transaction semantics** (all-or-nothing).
   *
   * All parent IDs are validated first. If any parent is missing, the
   * operation fails before touching the document. This ensures the
   * Agent never sees a partially-mutated tree.
   */
  public async batchCreateElements(
    documentId: string,
    inputs: CreateElementInput[],
    expectedRevision?: number,
  ): Promise<WriteResult> {
    const document = await this.store.get(documentId);
    this.checkRevision(document, expectedRevision);

    // ---- Phase 1: Validate all inputs first (pre-flight) ----
    const parents = new Map<string, SvgNode>();
    for (let i = 0; i < inputs.length; i++) {
      const parentId = inputs[i]!.parentId ?? "root";
      if (!parents.has(parentId)) {
        try {
          parents.set(parentId, this.getNode(document.root, parentId).node);
        } catch {
          throw new InvalidElementError(
            `batch_create_elements[${i}]: parent "${parentId}" not found`,
          );
        }
      }
    }

    // ---- Phase 2: Create all nodes (all-or-nothing from here) ----
    const createdIds: string[] = [];

    for (const input of inputs) {
      const parentId = input.parentId ?? "root";
      const parent = parents.get(parentId)!;

      const node: SvgNode = {
        id: input.id ?? generateElementId(),
        type: input.type,
        name: input.name,
        attributes: { ...input.attributes },
        text: input.text,
        metadata: input.metadata,
        children: [],
      };

      parent.children.push(node);
      createdIds.push(node.id);
    }

    document.revision += 1;
    await this.store.save(document);

    return ok(document, createdIds, { count: createdIds.length });
  }

  public async createRepeatedElements(
    input: RepeatedElementsInput,
    expectedRevision?: number,
  ): Promise<WriteResult> {
    const document = await this.store.get(input.documentId);
    this.checkRevision(document, expectedRevision);

    const parentId = input.parentId ?? "root";
    const { node: parent } = this.getNode(document.root, parentId);

    const createdIds: string[] = [];
    const { rows, columns, startX, startY, stepX, stepY } = input.layout;
    const namePrefix = input.template.namePrefix ?? input.template.type;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < columns; col++) {
        const x = startX + col * stepX;
        const y = startY + row * stepY;

        const node: SvgNode = {
          id: generateElementId(),
          type: input.template.type,
          name: `${namePrefix}_${row}_${col}`,
          attributes: {
            ...input.template.attributes,
            x,
            y,
          },
          children: [],
        };

        parent.children.push(node);
        createdIds.push(node.id);
      }
    }

    document.revision += 1;
    await this.store.save(document);

    return ok(document, createdIds, {
      count: createdIds.length,
      grid: `${rows}×${columns}`,
    });
  }

  public async updateElement(
    documentId: string,
    elementId: string,
    input: UpdateElementInput,
    expectedRevision?: number,
  ): Promise<WriteResult> {
    const document = await this.store.get(documentId);
    this.checkRevision(document, expectedRevision);

    const { node } = this.getNode(document.root, elementId);

    if (input.attributes) {
      for (const [key, value] of Object.entries(input.attributes)) {
        if (value === null) {
          delete node.attributes[key];
        } else {
          node.attributes[key] = value;
        }
      }
    }

    if (input.text !== undefined) {
      node.text = input.text;
    }

    if (input.name !== undefined) {
      node.name = input.name;
    }

    document.revision += 1;
    await this.store.save(document);

    return ok(document, [elementId]);
  }

  public async transformElements(
    documentId: string,
    elementIds: string[],
    transform: ElementTransform,
    expectedRevision?: number,
  ): Promise<WriteResult> {
    const document = await this.store.get(documentId);
    this.checkRevision(document, expectedRevision);

    // Pre-validate all element IDs
    for (const elementId of elementIds) {
      this.getNode(document.root, elementId);
    }

    for (const elementId of elementIds) {
      const { node } = this.getNode(document.root, elementId);

      if (
        transform.translateX !== undefined ||
        transform.translateY !== undefined
      ) {
        const currentTransform =
          (node.attributes["transform"] as string) ?? "";
        const tx = transform.translateX ?? 0;
        const ty = transform.translateY ?? 0;
        node.attributes["transform"] =
          `${currentTransform} translate(${tx}, ${ty})`.trim();
      }

      if (transform.scaleX !== undefined || transform.scaleY !== undefined) {
        const currentTransform =
          (node.attributes["transform"] as string) ?? "";
        const sx = transform.scaleX ?? 1;
        const sy = transform.scaleY ?? 1;
        node.attributes["transform"] =
          `${currentTransform} scale(${sx}, ${sy})`.trim();
      }

      if (transform.rotate !== undefined) {
        const currentTransform =
          (node.attributes["transform"] as string) ?? "";
        node.attributes["transform"] =
          `${currentTransform} rotate(${transform.rotate})`.trim();
      }
    }

    document.revision += 1;
    await this.store.save(document);

    return ok(document, elementIds);
  }

  public async deleteElements(
    documentId: string,
    elementIds: string[],
    expectedRevision?: number,
  ): Promise<WriteResult> {
    const document = await this.store.get(documentId);
    this.checkRevision(document, expectedRevision);

    // Pre-validate all exist and are not root
    for (const elementId of elementIds) {
      const loc = this.getNode(document.root, elementId);
      if (!loc.parent) {
        throw new InvalidElementError(
          `Cannot delete root element: ${elementId}`,
        );
      }
    }

    const deleted: string[] = [];

    for (const elementId of elementIds) {
      const loc = this.getNode(document.root, elementId);
      if (!loc.parent) continue; // should not happen after pre-validation

      const idx = loc.parent.children.indexOf(loc.node);
      if (idx !== -1) {
        loc.parent.children.splice(idx, 1);
        deleted.push(elementId);
      }
    }

    document.revision += 1;
    await this.store.save(document);

    return ok(document, deleted, { deletedCount: deleted.length });
  }

  // -------------------------------------------------------------------
  // Queries
  // -------------------------------------------------------------------

  public async getDocumentTree(
    documentId: string,
    parentId?: string,
    maxDepth = 10,
  ): Promise<{
    document: SvgDocument;
    tree: string;
    nodeCount: number;
  }> {
    const document = await this.store.get(documentId);

    const startNode = parentId
      ? this.getNode(document.root, parentId).node
      : document.root;

    const { renderTree } = await import("@academic-figure/core");
    const tree = renderTree(startNode, maxDepth);
    const nodeCount = countNodes(document.root);

    return { document, tree, nodeCount };
  }

  public async queryElements(
    documentId: string,
    filters: QueryElementsInput,
  ): Promise<SvgNode[]> {
    const document = await this.store.get(documentId);

    const startNode = filters.parentId
      ? this.getNode(document.root, filters.parentId).node
      : document.root;

    const { findNodes } = await import("@academic-figure/core");

    return findNodes(startNode, (node) => {
      if (filters.type && node.type !== filters.type) return false;
      if (filters.role && node.metadata?.role !== filters.role) return false;
      if (filters.importance && node.metadata?.importance !== filters.importance)
        return false;
      if (filters.tags && filters.tags.length > 0) {
        const nodeTags = node.metadata?.tags ?? [];
        if (!filters.tags.some((t) => nodeTags.includes(t))) return false;
      }
      return true;
    });
  }

  // -------------------------------------------------------------------
  // SVG import (bidirectional bridge with SVG-Edit)
  // -------------------------------------------------------------------

  /**
   * Import an SVG string and replace the document contents.
   *
   * When the SVG parser is available, this parses the SVG into the
   * structured node tree and merges metadata. Otherwise it falls back
   * to storing the raw SVG as a root attribute.
   */
  public async importSvgString(
    documentId: string,
    svgString: string,
  ): Promise<WriteResult> {
    const document = await this.store.get(documentId);

    // Try to use the parser if available
    try {
      const { parseSvgDocument } = await import("@academic-figure/core");
      const parsed = parseSvgDocument(svgString, {
        preserveUnknownAttributes: true,
        preserveUnknownElements: true,
      });

      // Merge semantic metadata from existing document
      this.mergeMetadata(document.root, parsed.root);

      // Replace root children with parsed children
      document.root.children = parsed.root.children;
      document.width = parsed.width;
      document.height = parsed.height;
      document.viewBox = parsed.viewBox;
    } catch {
      // Parser not available or parse failed — store raw SVG
      document.root.attributes["_importedSvg"] = svgString;
    }

    document.revision += 1;
    await this.store.save(document);

    return ok(document, ["root"], {
      importMethod: document.root.attributes["_importedSvg"]
        ? "raw"
        : "parsed",
    });
  }

  /**
   * Walk the existing tree and copy metadata (role, importance, tags, etc.)
   * into the corresponding nodes of the freshly-parsed tree, keyed by id.
   */
  private mergeMetadata(oldNode: SvgNode, newNode: SvgNode): void {
    if (oldNode.metadata) {
      newNode.metadata = {
        ...oldNode.metadata,
        ...(newNode.metadata ?? {}),
        tags: [
          ...(oldNode.metadata.tags ?? []),
          ...(newNode.metadata?.tags ?? []),
        ],
      };
    }

    const oldChildrenById = new Map<string, SvgNode>();
    for (const child of oldNode.children) {
      oldChildrenById.set(child.id, child);
    }

    for (const newChild of newNode.children) {
      const oldChild = oldChildrenById.get(newChild.id);
      if (oldChild) {
        this.mergeMetadata(oldChild, newChild);
      }
    }
  }

  // -------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------

  /**
   * Wrapper around ensureNode that converts the core's generic Error
   * to an ElementNotFoundError with the unified format.
   */
  private getNode(root: SvgNode, elementId: string) {
    try {
      return ensureNode(root, elementId);
    } catch (e) {
      if (e instanceof Error && e.message.includes("not found")) {
        throw new ElementNotFoundError(elementId);
      }
      throw e;
    }
  }

  private checkRevision(
    document: SvgDocument,
    expectedRevision?: number,
  ): void {
    if (
      expectedRevision !== undefined &&
      expectedRevision !== document.revision
    ) {
      throw new RevisionConflictError(document.revision, expectedRevision);
    }
  }
}
