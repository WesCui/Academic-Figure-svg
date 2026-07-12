/**
 * Academic Figure MCP Server — Entry Point.
 *
 * Starts the MCP server over stdio for integration with Claude Code,
 * Codex, Cursor, and other MCP-compatible clients.
 *
 * Usage:
 *   node dist/index.js                          # default workspace at ./workspace
 *   SVG_MCP_WORKSPACE=/path/to/workspace node dist/index.js
 *
 * @module academic-figure-mcp
 */

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { FileDocumentStore } from "./store/document-store.js";
import { DocumentService } from "./services/document-service.js";
import { RenderService } from "./services/render-service.js";
import { ExportService } from "./services/export-service.js";
import { createMcpServer } from "./server.js";
import { resolveWorkspaceRoot } from "./utils/paths.js";

async function main(): Promise<void> {
  const workspaceRoot = resolveWorkspaceRoot();

  // Report startup info on stderr (stdout is the MCP transport)
  process.stderr.write(
    `[academic-figure-mcp] Workspace: ${workspaceRoot}\n`,
  );

  // Build the dependency graph
  const store = new FileDocumentStore(workspaceRoot);
  const documentService = new DocumentService(store);
  const renderService = new RenderService(store, workspaceRoot);
  const exportService = new ExportService(store, workspaceRoot);

  const server = createMcpServer({
    documentService,
    renderService,
    exportService,
  });

  // Connect via stdio
  const transport = new StdioServerTransport();
  await server.connect(transport);

  process.stderr.write(
    `[academic-figure-mcp] Server ready (stdio transport)\n`,
  );
}

main().catch((error: unknown) => {
  const message =
    error instanceof Error ? (error.stack ?? error.message) : String(error);

  process.stderr.write(`[academic-figure-mcp] FATAL: ${message}\n`);
  process.exitCode = 1;
});
