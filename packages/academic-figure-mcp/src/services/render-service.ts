/**
 * SVG → PNG rendering service using resvg.
 * Produces deterministic, high-quality preview images without a browser.
 *
 * @module render-service
 */

import { promises as fs } from "node:fs";

import { Resvg } from "@resvg/resvg-js";
import { serializeSvgDocument } from "@academic-figure/core";

import type { DocumentStore } from "../store/document-store.js";
import { getPreviewPath } from "../utils/paths.js";

export interface PreviewResult {
  previewPath: string;
  width: number;
  height: number;
}

export class RenderService {
  constructor(
    private readonly store: DocumentStore,
    private readonly workspaceRoot: string,
  ) {}

  /**
   * Render a document to PNG preview.
   *
   * @param documentId - The document to render
   * @param width - Optional output width in pixels (maintains aspect ratio)
   * @returns Path and dimensions of the rendered PNG
   */
  public async renderPreview(
    documentId: string,
    width?: number,
  ): Promise<PreviewResult> {
    const document = await this.store.get(documentId);
    const svg = serializeSvgDocument(document);

    const options = width
      ? {
          fitTo: {
            mode: "width" as const,
            value: width,
          },
        }
      : undefined;

    const resvg = new Resvg(svg, options);
    const rendered = resvg.render();
    const pngBuffer = rendered.asPng();

    const previewPath = getPreviewPath(this.workspaceRoot, documentId);

    // Ensure directory exists
    await fs.mkdir(
      previewPath.substring(0, previewPath.lastIndexOf("/")),
      { recursive: true },
    );

    await fs.writeFile(previewPath, pngBuffer);

    return {
      previewPath,
      width: rendered.width,
      height: rendered.height,
    };
  }
}
