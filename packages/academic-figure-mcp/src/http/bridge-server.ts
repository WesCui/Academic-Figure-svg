/**
 * Lightweight HTTP bridge for SVG-Edit ↔ MCP document synchronization.
 *
 * This runs alongside the stdio MCP server on a separate port (default 4321).
 * SVG-Edit uses this to load/save documents via simple REST calls.
 *
 * The key invariant: **PUT is the single entry point for SVG-Edit → MCP sync.**
 * When SVG-Edit saves, we parse the incoming SVG XML, merge semantic metadata,
 * update the document.json source of truth, and re-export current.svg.
 * This prevents the "dual source of truth" problem.
 *
 * API:
 *   GET  /api/documents/:id/svg      — Get current SVG (→ load into SVG-Edit)
 *   PUT  /api/documents/:id/svg      — Save edited SVG (← SVG-Edit edits)
 *                                      → parse → merge metadata → save json
 *                                      → re-export svg → re-render preview
 *   GET  /api/documents/:id/status   — Document metadata
 *   POST /api/documents/:id/render   — Re-render preview
 *
 * @module http-bridge
 */

import { createServer, IncomingMessage, ServerResponse } from "node:http";
import type { DocumentService } from "../services/document-service.js";
import type { RenderService } from "../services/render-service.js";
import type { ExportService } from "../services/export-service.js";

interface HttpBridgeOptions {
  port?: number;
  host?: string;
  documentService: DocumentService;
  renderService: RenderService;
  exportService: ExportService;
}

/**
 * Parse the request body as a UTF-8 string.
 */
function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

/**
 * Extract document ID from a URL like /api/documents/<id>/svg
 */
function extractDocumentId(url: string): string | null {
  const match = url.match(/^\/api\/documents\/([^/]+)\/(svg|status)$/);
  return match ? match[1]! : null;
}

/**
 * Simple JSON response helper.
 */
function json(res: ServerResponse, status: number, data: unknown): void {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

export function startHttpBridge(
  options: HttpBridgeOptions,
): ReturnType<typeof createServer> {
  const {
    port = 4321,
    host = "127.0.0.1",
    documentService,
    renderService,
    exportService,
  } = options;

  const server = createServer(
    async (req: IncomingMessage, res: ServerResponse) => {
      // CORS header for SVG-Edit browser access
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, PUT, POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");

      if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
      }

      const url = req.url ?? "/";
      const documentId = extractDocumentId(url);

      // GET /api/documents/:id/svg
      if (req.method === "GET" && url.endsWith("/svg") && documentId) {
        try {
          const svgPath = await exportService.exportSvg(documentId);
          const { readFile } = await import("node:fs/promises");
          const svgContent = await readFile(svgPath, "utf8");
          res.writeHead(200, { "Content-Type": "image/svg+xml" });
          res.end(svgContent);
        } catch (e) {
          json(res, 404, {
            success: false,
            code: "DOCUMENT_NOT_FOUND",
            message: String(e),
          });
        }
        return;
      }

      // PUT /api/documents/:id/svg
      // This is the critical path: SVG-Edit saves its SVG string.
      // We parse it back into the structured document tree, merge
      // semantic metadata, and re-export the canonical SVG + preview.
      if (req.method === "PUT" && url.endsWith("/svg") && documentId) {
        try {
          const svgString = await readBody(req);

          // Parse SVG → structured tree, merge metadata, save document.json
          const result = await documentService.importSvgString(
            documentId,
            svgString,
          );

          // Re-export canonical SVG (current.svg)
          await exportService.exportSvg(documentId);

          // Re-render preview
          let preview: { width: number; height: number; previewPath: string } | null = null;
          try {
            preview = await renderService.renderPreview(documentId);
          } catch {
            // Preview is best-effort
          }

          json(res, 200, {
            success: true,
            documentId,
            revision: result.revision,
            importMethod: result.extra?.importMethod ?? "unknown",
            preview: preview
              ? { width: preview.width, height: preview.height }
              : undefined,
          });
        } catch (e) {
          json(res, 500, {
            success: false,
            code: "SAVE_FAILED",
            message: String(e),
          });
        }
        return;
      }

      // GET /api/documents/:id/status
      if (req.method === "GET" && url.endsWith("/status") && documentId) {
        try {
          const document = await documentService.getDocument(documentId);
          json(res, 200, {
            success: true,
            documentId: document.id,
            name: document.name,
            revision: document.revision,
            updatedAt: document.updatedAt,
          });
        } catch (e) {
          json(res, 404, {
            success: false,
            code: "DOCUMENT_NOT_FOUND",
            message: String(e),
          });
        }
        return;
      }

      // POST /api/documents/:id/render
      if (req.method === "POST" && url.endsWith("/render") && documentId) {
        try {
          const result = await renderService.renderPreview(documentId);
          json(res, 200, {
            success: true,
            documentId,
            previewPath: result.previewPath,
            width: result.width,
            height: result.height,
          });
        } catch (e) {
          json(res, 500, {
            success: false,
            code: "RENDER_FAILED",
            message: String(e),
          });
        }
        return;
      }

      // Health check
      if (req.method === "GET" && url === "/health") {
        json(res, 200, { status: "ok" });
        return;
      }

      // 404
      json(res, 404, { success: false, code: "NOT_FOUND" });
    },
  );

  server.listen(port, host, () => {
    process.stderr.write(
      `[academic-figure-mcp] HTTP bridge listening at http://${host}:${port}\n`,
    );
  });

  return server;
}
