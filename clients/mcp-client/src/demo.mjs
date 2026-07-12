/**
 * Out-of-the-box demo: connects to the Academic Figure MCP server, builds a
 * sample "UAV-ISAC" figure, renders a PNG and exports an SVG.
 *
 *   npm run demo
 *
 * Output lands in ./output (figure.png + figure.svg).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { connectMcp } from "./client.mjs";
import { buildUavIsac } from "./figures/uav-isac.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../output");
mkdirSync(OUT, { recursive: true });

const { client, call, callText } = await connectMcp();

console.log("=== Available tools ===");
const { tools } = await client.listTools();
console.log(tools.map((t) => t.name).join(", "));

console.log("\n=== create_document ===");
const doc = await callText("create_document", {
  name: "UAV-ISAC Scenario",
  width: 1000,
  height: 700,
  background: "#f5f8fc",
});
const documentId = doc.documentId;
console.log(`documentId = ${documentId}`);

console.log("\n=== build scene ===");
await buildUavIsac({ call, documentId });

console.log("\n=== render_preview (PNG) ===");
const render = await call("render_preview", { documentId, width: 1000 });
for (const c of render.content ?? []) {
  if (c.type === "image") {
    const p = resolve(OUT, "figure.png");
    writeFileSync(p, Buffer.from(c.data, "base64"));
    console.log(`PNG  -> ${p}`);
  }
}

console.log("\n=== export_svg ===");
const exp = await callText("export_svg", {
  documentId,
  outputPath: resolve(OUT, "figure.svg"),
});
console.log(`SVG  -> ${exp.svgPath}`);

console.log(`\nDone. Output in: ${OUT}`);
await client.close();
process.exit(0);
