/**
 * Academic Figure MCP Server — Entry Point.
 *
 * Starts the MCP server over stdio for integration with Claude Code,
 * Codex, Cursor, and other MCP-compatible clients.
 *
 * Optionally also starts the HTTP bridge for SVG-Edit integration.
 * Set SVG_MCP_HTTP_PORT=0 to disable, or set to a custom port (default: 4321).
 *
 * Usage:
 *   node dist/index.js                          # MCP stdio only
 *   SVG_MCP_HTTP_PORT=4321 node dist/index.js    # MCP stdio + HTTP bridge
 *   SVG_MCP_WORKSPACE=/path/to/workspace node dist/index.js
 *
 * @module academic-figure-mcp
 */

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { FileDocumentStore } from "./store/document-store.js";
import { DocumentService } from "./services/document-service.js";
import { RenderService } from "./services/render-service.js";
import { ExportService } from "./services/export-service.js";
import { PrimitiveService } from "./services/primitive-service.js";
import { createMcpServer } from "./server.js";
import { resolveWorkspaceRoot } from "./utils/paths.js";

function resolveHttpPort(): number | null {
  const env = process.env.SVG_MCP_HTTP_PORT;
  if (env === "0" || env === "false" || env === "no") return null;
  const port = env ? parseInt(env, 10) : 4321;
  return isNaN(port) ? null : port;
}

async function main(): Promise<void> {
  const workspaceRoot = resolveWorkspaceRoot();

  process.stderr.write(
    `[academic-figure-mcp] Workspace: ${workspaceRoot}\n`,
  );

  // Build the dependency graph
  const store = new FileDocumentStore(workspaceRoot);
  const documentService = new DocumentService(store);
  const renderService = new RenderService(store, workspaceRoot);
  const exportService = new ExportService(store, workspaceRoot);
  const primitiveService = new PrimitiveService(documentService);

  // Start the MCP server over stdio
  const server = createMcpServer({
    documentService,
    renderService,
    exportService,
    primitiveService,
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);

  process.stderr.write(
    `[academic-figure-mcp] Server ready (stdio transport)\n`,
  );

  // Start the HTTP bridge for SVG-Edit (if enabled)
  const httpPort = resolveHttpPort();
  if (httpPort !== null) {
    const { startHttpBridge } = await import("./http/bridge-server.js");
    startHttpBridge({
      port: httpPort,
      documentService,
      renderService,
      exportService,
    });
  }
}

main().catch((error: unknown) => {
  const message =
    error instanceof Error ? (error.stack ?? error.message) : String(error);

  process.stderr.write(`[academic-figure-mcp] FATAL: ${message}\n`);
  process.exitCode = 1;
});
