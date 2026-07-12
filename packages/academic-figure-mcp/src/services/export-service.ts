/**
 * SVG export service.
 * Serializes a document's internal tree to a standalone SVG file.
 *
 * @module export-service
 */

import { promises as fs } from "node:fs";
import path from "node:path";

import { serializeSvgDocument } from "@academic-figure/core";

import type { DocumentStore } from "../store/document-store.js";
import { getDocumentSvgPath, getExportsDir } from "../utils/paths.js";

export class ExportService {
  constructor(
    private readonly store: DocumentStore,
    private readonly workspaceRoot: string,
  ) {}

  /**
   * Export a document to a standalone SVG file.
   *
   * @param documentId - The document to export
   * @param outputPath  - Optional custom output path; defaults to the document's current.svg
   * @returns The absolute path to the exported SVG file
   */
  public async exportSvg(
    documentId: string,
    outputPath?: string,
  ): Promise<string> {
    const document = await this.store.get(documentId);
    const svg = serializeSvgDocument(document);

    const targetPath = outputPath
      ? path.resolve(outputPath)
      : getDocumentSvgPath(this.workspaceRoot, documentId);

    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.writeFile(targetPath, svg, "utf8");

    return targetPath;
  }

  /**
   * Export to the shared exports directory.
   */
  public async exportToDir(
    documentId: string,
    filename?: string,
  ): Promise<string> {
    const exportsDir = getExportsDir(this.workspaceRoot);
    await fs.mkdir(exportsDir, { recursive: true });

    const outputPath = path.join(
      exportsDir,
      filename ?? `${documentId}.svg`,
    );

    return this.exportSvg(documentId, outputPath);
  }
}
