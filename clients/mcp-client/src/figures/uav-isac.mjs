/**
 * Build a sample "UAV-ISAC" academic scenario figure.
 *
 * This is intentionally a self-contained, copy-pasteable example of how to
 * compose the MCP tools into a real figure. Modify it, or write your own,
 * then drive it from src/demo.mjs (or any script that imports client.mjs).
 *
 * @param {{ call: Function, documentId: string }} ctx
 */
export async function buildUavIsac({ call, documentId }) {
  // Ground
  await call("create_element", {
    documentId,
    id: "ground",
    type: "rect",
    attributes: {
      x: 0, y: 560, width: 1000, height: 140,
      fill: "#e9eef5", "data-role": "environment",
    },
  });

  // Building A (isometric)
  await call("create_isometric_building", {
    documentId, id: "building-a",
    x: 150, y: 560, width: 200, depth: 110, height: 320, floors: 6,
    perspective: { dx: 55, dy: -28 },
    facade: {
      frontFill: "#dce6f0", sideFill: "#c2d2e3",
      roofFill: "#aebfd2", windowFill: "#fdf6c9",
    },
    rooftop: { enabled: true, hvacUnits: 3 },
    entrance: { enabled: true, canopy: true },
  });

  // Building B (isometric)
  await call("create_isometric_building", {
    documentId, id: "building-b",
    x: 620, y: 560, width: 180, depth: 100, height: 260, floors: 5,
    perspective: { dx: 50, dy: -25 },
    facade: {
      frontFill: "#e3ddd2", sideFill: "#cdc4b3",
      roofFill: "#b3a892", windowFill: "#cfe8f5",
    },
    rooftop: { enabled: true, hvacUnits: 2 },
    entrance: { enabled: true, canopy: false },
  });

  // UAV entities (circle + label group)
  const uavs = [
    { id: "uav-1", cx: 320, cy: 200, label: "UAV-1" },
    { id: "uav-2", cx: 520, cy: 150, label: "UAV-2" },
    { id: "uav-3", cx: 700, cy: 230, label: "UAV-3" },
  ];
  for (const u of uavs) {
    await call("create_element", {
      documentId, id: u.id, type: "g", name: u.label,
      attributes: { "data-role": "entity", "data-semantic-name": "UAV" },
    });
    await call("create_element", {
      documentId, parentId: u.id, type: "circle",
      attributes: {
        cx: u.cx, cy: u.cy, r: 18,
        fill: "#ff7a59", stroke: "#c43e1c", "stroke-width": 2,
      },
    });
    await call("create_element", {
      documentId, parentId: u.id, type: "text",
      attributes: {
        x: u.cx, y: u.cy + 40,
        "text-anchor": "middle", "font-size": 16, fill: "#333",
      },
      text: u.label,
    });
  }

  // Communication links (auto-colored by semantic type)
  await call("create_communication_link", {
    documentId, id: "link-1",
    start: { x: 320, y: 200 }, end: { x: 250, y: 320 },
    semanticType: "information",
  });
  await call("create_communication_link", {
    documentId, id: "link-2",
    start: { x: 520, y: 150 }, end: { x: 670, y: 320 },
    semanticType: "sensing",
  });
  await call("create_communication_link", {
    documentId, id: "link-3",
    start: { x: 700, y: 230 }, end: { x: 760, y: 420 },
    semanticType: "leakage",
  });

  // Legend
  await call("create_paper_legend", {
    documentId, id: "legend", x: 720, y: 70, title: "Legend",
    entries: [
      { type: "color", label: "UAV entity", color: "#ff7a59" },
      { type: "line", label: "Information link", semanticType: "information" },
      { type: "line", label: "Sensing link", semanticType: "sensing" },
      { type: "line", label: "Leakage", semanticType: "leakage" },
    ],
  });

  // Numbered callouts
  await call("create_numbered_callout", {
    documentId, number: 1, x: 250, y: 400,
    label: "Building A (sensing target)",
    labelPosition: { x: 270, y: 405 }, variant: "minimal",
  });
  await call("create_numbered_callout", {
    documentId, number: 2, x: 320, y: 200,
    label: "UAV-1 (relay)",
    labelPosition: { x: 345, y: 205 }, variant: "minimal",
  });
}
