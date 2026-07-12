/**
 * Lightweight HTTP bridge for SVG-Edit ↔ MCP document synchronization.
 *
 * This runs alongside the stdio MCP server on a separate port (default 4321).
 * SVG-Edit uses this to load/save documents via simple REST calls.
 *
 * API:
 *   GET  /api/documents/:id/svg      — Get current SVG
 *   PUT  /api/documents/:id/svg      — Save edited SVG (from SVG-Edit)
 *   GET  /api/documents/:id/status   — Document metadata
 *   POST /api/documents/:id/render   — Re-render preview
 *
 * @module http-bridge
 */

import { createServer, IncomingMessage, ServerResponse } from "node:http";
import type { DocumentStore } from "../store/document-store.js";
import type { RenderService } from "../services/render-service.js";
import type { ExportService } from "../services/export-service.js";

interface HttpBridgeOptions {
  port?: number;
  host?: string;
  documentStore: DocumentStore;
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

export function startHttpBridge(options: HttpBridgeOptions): ReturnType<typeof createServer> {
  const { port = 4321, host = "127.0.0.1", documentStore, renderService, exportService } = options;

  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
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
        json(res, 404, { error: "DOCUMENT_NOT_FOUND", message: String(e) });
      }
      return;
    }

    // PUT /api/documents/:id/svg
    if (req.method === "PUT" && url.endsWith("/svg") && documentId) {
      try {
        const svgString = await readBody(req);
        const document = await documentStore.get(documentId);
        // Store the imported SVG and increment revision
        document.root.attributes["_importedSvg"] = svgString;
        document.revision += 1;
        await documentStore.save(document);
        json(res, 200, { documentId, revision: document.revision });
      } catch (e) {
        json(res, 500, { error: "SAVE_FAILED", message: String(e) });
      }
      return;
    }

    // GET /api/documents/:id/status
    if (req.method === "GET" && url.endsWith("/status") && documentId) {
      try {
        const document = await documentStore.get(documentId);
        json(res, 200, {
          documentId: document.id,
          name: document.name,
          revision: document.revision,
          updatedAt: document.updatedAt,
        });
      } catch (e) {
        json(res, 404, { error: "DOCUMENT_NOT_FOUND", message: String(e) });
      }
      return;
    }

    // POST /api/documents/:id/render
    if (req.method === "POST" && url.endsWith("/render") && documentId) {
      try {
        const result = await renderService.renderPreview(documentId);
        json(res, 200, result);
      } catch (e) {
        json(res, 500, { error: "RENDER_FAILED", message: String(e) });
      }
      return;
    }

    // Health check
    if (req.method === "GET" && url === "/health") {
      json(res, 200, { status: "ok" });
      return;
    }

    // 404
    json(res, 404, { error: "NOT_FOUND" });
  });

  server.listen(port, host, () => {
    process.stderr.write(
      `[academic-figure-mcp] HTTP bridge listening at http://${host}:${port}\n`,
    );
  });

  return server;
}
