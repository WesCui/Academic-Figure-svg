/**
 * Reusable MCP client for the Academic Figure MCP server.
 *
 * Spawns `packages/academic-figure-mcp/dist/index.js` over stdio (the real
 * MCP transport Claude Code / Cursor / etc. use) and exposes a tiny helper so
 * you can drive figure creation from your own scripts.
 *
 * @module mcp-client
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "../../..");
const SERVER_DIR = resolve(REPO_ROOT, "packages/academic-figure-mcp");
const SERVER_ENTRY = resolve(SERVER_DIR, "dist/index.js");
const DEFAULT_WORKSPACE = resolve(__dirname, "../workspace");

/**
 * Launch the academic-figure-mcp server as a child process and connect to it.
 *
 * @param {object} [opts]
 * @param {string} [opts.workspace]  Absolute or cwd-relative workspace dir.
 * @param {number} [opts.httpPort]   HTTP bridge port; 0 disables it.
 * @returns {Promise<{ client: Client, call: Function, callText: Function, close: Function }>}
 */
export async function connectMcp({
  workspace = DEFAULT_WORKSPACE,
  httpPort = 0,
} = {}) {
  const transport = new StdioClientTransport({
    command: "node",
    args: [SERVER_ENTRY],
    cwd: SERVER_DIR,
    env: {
      ...process.env,
      SVG_MCP_HTTP_PORT: String(httpPort),
      SVG_MCP_WORKSPACE: workspace,
    },
    // Keep the server's own logs out of our stdout.
    stderr: "ignore",
  });

  const client = new Client({ name: "mcp-client", version: "0.1.0" });
  await client.connect(transport);

  /** Call a tool; throw if the tool itself reported an error. */
  async function call(name, args = {}) {
    const res = await client.callTool({ name, arguments: args });
    if (res.isError) {
      const text = (res.content ?? []).map((c) => c.text ?? "").join("\n");
      throw new Error(`Tool "${name}" failed:\n${text}`);
    }
    return res;
  }

  /** Call a tool and parse its first text block as JSON (fallback: raw text). */
  async function callText(name, args = {}) {
    const res = await call(name, args);
    const text = (res.content ?? []).find((c) => c.type === "text")?.text ?? "{}";
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  async function close() {
    await client.close();
  }

  return { client, call, callText, close };
}
