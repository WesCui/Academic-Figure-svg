/**
 * File-based document persistence layer.
 *
 * Each document is stored as:
 *   workspace/documents/<documentId>/
 *     document.json   — full SvgDocument state
 *     current.svg     — exported SVG
 *     preview.png     — rendered preview
 *     snapshots/      — revision snapshots
 *
 * @module document-store
 */

import { promises as fs } from "node:fs";
import path from "node:path";

import type { SvgDocument } from "@academic-figure/core";
import { getDocumentJsonPath, getDocumentDir } from "../utils/paths.js";
import { DocumentNotFoundError } from "../utils/errors.js";

export interface DocumentStore {
  /** Persist a new document. */
  create(document: SvgDocument): Promise<void>;

  /** Load a document by ID. */
  get(documentId: string): Promise<SvgDocument>;

  /** Persist changes to an existing document. */
  save(document: SvgDocument): Promise<void>;

  /** Check whether a document exists. */
  exists(documentId: string): Promise<boolean>;

  /** Delete a document and all its files. */
  delete(documentId: string): Promise<void>;
}

export class FileDocumentStore implements DocumentStore {
  constructor(private readonly workspaceRoot: string) {}

  public async create(document: SvgDocument): Promise<void> {
    const directory = getDocumentDir(this.workspaceRoot, document.id);
    await fs.mkdir(path.join(directory, "snapshots"), { recursive: true });
    await this.save(document);
  }

  public async exists(documentId: string): Promise<boolean> {
    try {
      await fs.access(getDocumentJsonPath(this.workspaceRoot, documentId));
      return true;
    } catch {
      return false;
    }
  }

  public async get(documentId: string): Promise<SvgDocument> {
    const filePath = getDocumentJsonPath(this.workspaceRoot, documentId);

    try {
      const raw = await fs.readFile(filePath, "utf8");
      return JSON.parse(raw) as SvgDocument;
    } catch {
      throw new DocumentNotFoundError(documentId);
    }
  }

  public async save(document: SvgDocument): Promise<void> {
    const directory = getDocumentDir(this.workspaceRoot, document.id);
    await fs.mkdir(directory, { recursive: true });

    document.updatedAt = new Date().toISOString();

    await fs.writeFile(
      getDocumentJsonPath(this.workspaceRoot, document.id),
      JSON.stringify(document, null, 2),
      "utf8",
    );
  }

  public async delete(documentId: string): Promise<void> {
    const directory = getDocumentDir(this.workspaceRoot, documentId);
    try {
      await fs.rm(directory, { recursive: true, force: true });
    } catch {
      throw new DocumentNotFoundError(documentId);
    }
  }
}
