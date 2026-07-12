/**
 * Core document CRUD operations.
 * This is the primary business-logic layer — all element manipulation
 * flows through here, keeping the MCP tool handlers thin.
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
import { ElementNotFoundError, RevisionConflictError } from "../utils/errors.js";

// ---------------------------------------------------------------------------
// Public interface
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

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class DocumentService {
  constructor(private readonly store: DocumentStore) {}

  // -------------------------------------------------------------------
  // Document lifecycle
  // -------------------------------------------------------------------

  public async createDocument(input: CreateDocumentInput): Promise<SvgDocument> {
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

    // Add background rect if specified
    if (input.background) {
      document.root.children.push({
        id: "background",
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
    }

    await this.store.create(document);
    return document;
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
  ): Promise<SvgNode> {
    const document = await this.store.get(documentId);
    this.checkRevision(document, expectedRevision);

    const parentId = input.parentId ?? "root";
    const { node: parent } = ensureNode(document.root, parentId);

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

    return node;
  }

  public async batchCreateElements(
    documentId: string,
    inputs: CreateElementInput[],
    expectedRevision?: number,
  ): Promise<SvgNode[]> {
    const document = await this.store.get(documentId);
    this.checkRevision(document, expectedRevision);

    const created: SvgNode[] = [];

    for (const input of inputs) {
      const parentId = input.parentId ?? "root";
      const { node: parent } = ensureNode(document.root, parentId);

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
      created.push(node);
    }

    document.revision += 1;
    await this.store.save(document);

    return created;
  }

  public async createRepeatedElements(
    input: RepeatedElementsInput,
    expectedRevision?: number,
  ): Promise<SvgNode[]> {
    const document = await this.store.get(input.documentId);
    this.checkRevision(document, expectedRevision);

    const parentId = input.parentId ?? "root";
    const { node: parent } = ensureNode(document.root, parentId);

    const created: SvgNode[] = [];
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
        created.push(node);
      }
    }

    document.revision += 1;
    await this.store.save(document);

    return created;
  }

  public async updateElement(
    documentId: string,
    elementId: string,
    input: UpdateElementInput,
    expectedRevision?: number,
  ): Promise<SvgNode> {
    const document = await this.store.get(documentId);
    this.checkRevision(document, expectedRevision);

    const { node } = ensureNode(document.root, elementId);

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

    return node;
  }

  public async transformElements(
    documentId: string,
    elementIds: string[],
    transform: ElementTransform,
    expectedRevision?: number,
  ): Promise<SvgNode[]> {
    const document = await this.store.get(documentId);
    this.checkRevision(document, expectedRevision);

    const results: SvgNode[] = [];

    for (const elementId of elementIds) {
      const { node } = ensureNode(document.root, elementId);

      if (transform.translateX !== undefined || transform.translateY !== undefined) {
        const currentTransform = (node.attributes["transform"] as string) ?? "";
        const tx = transform.translateX ?? 0;
        const ty = transform.translateY ?? 0;
        node.attributes["transform"] =
          `${currentTransform} translate(${tx}, ${ty})`.trim();
      }

      if (transform.scaleX !== undefined || transform.scaleY !== undefined) {
        const currentTransform = (node.attributes["transform"] as string) ?? "";
        const sx = transform.scaleX ?? 1;
        const sy = transform.scaleY ?? 1;
        node.attributes["transform"] =
          `${currentTransform} scale(${sx}, ${sy})`.trim();
      }

      if (transform.rotate !== undefined) {
        const currentTransform = (node.attributes["transform"] as string) ?? "";
        node.attributes["transform"] =
          `${currentTransform} rotate(${transform.rotate})`.trim();
      }

      results.push(node);
    }

    document.revision += 1;
    await this.store.save(document);

    return results;
  }

  public async deleteElements(
    documentId: string,
    elementIds: string[],
    expectedRevision?: number,
  ): Promise<string[]> {
    const document = await this.store.get(documentId);
    this.checkRevision(document, expectedRevision);

    const deleted: string[] = [];

    for (const elementId of elementIds) {
      const location = ensureNode(document.root, elementId);
      if (!location.parent) {
        throw new Error(`Cannot delete root element`);
      }

      const idx = location.parent.children.indexOf(location.node);
      if (idx !== -1) {
        location.parent.children.splice(idx, 1);
        deleted.push(elementId);
      }
    }

    if (deleted.length > 0) {
      document.revision += 1;
      await this.store.save(document);
    }

    return deleted;
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
      ? ensureNode(document.root, parentId).node
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
      ? ensureNode(document.root, filters.parentId).node
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
   * Parses the SVG into the structured node tree.
   * For v0.1 this is a simple replacement; v0.2 will do a real diff/merge.
   */
  public async importSvgString(
    documentId: string,
    svgString: string,
  ): Promise<SvgDocument> {
    const document = await this.store.get(documentId);

    // For v0.1: store the raw SVG as a text attribute on the root
    // and mark it as externally modified. A full SVG→SvgNode parser
    // is planned for v0.2.
    document.root.attributes["_importedSvg"] = svgString;
    document.revision += 1;
    await this.store.save(document);

    return document;
  }

  // -------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------

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
