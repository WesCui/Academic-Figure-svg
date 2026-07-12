/**
 * Tests for SVG serializer and parser — round-trip verification.
 */
import { describe, it, expect } from "vitest";
import type { SvgDocument } from "../src/document/types.js";
import { serializeSvgDocument } from "../src/serializer/svg-serializer.js";
import { parseSvgDocument } from "../src/parser/svg-parser.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSimpleDocument(): SvgDocument {
  return {
    id: "doc_test",
    name: "Test Document",
    width: 800,
    height: 600,
    viewBox: "0 0 800 600",
    revision: 1,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    root: {
      id: "root",
      type: "svg",
      attributes: {},
      children: [
        {
          id: "bg",
          type: "rect",
          attributes: { x: 0, y: 0, width: 800, height: 600, fill: "#ffffff" },
          metadata: { role: "environment", importance: "background" },
          children: [],
        },
        {
          id: "building",
          type: "g",
          name: "Main Building",
          attributes: {},
          metadata: { role: "building", importance: "primary" },
          children: [
            {
              id: "wall",
              type: "rect",
              attributes: { x: 100, y: 200, width: 200, height: 300, fill: "#cccccc" },
              children: [],
            },
          ],
        },
      ],
    },
  };
}

// ---------------------------------------------------------------------------
// Serializer tests
// ---------------------------------------------------------------------------

describe("serializeSvgDocument", () => {
  it("produces a valid SVG string", () => {
    const doc = makeSimpleDocument();
    const svg = serializeSvgDocument(doc);

    expect(svg).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(svg).toContain('<svg');
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(svg).toContain('width="800"');
    expect(svg).toContain('height="600"');
    expect(svg).toContain('viewBox="0 0 800 600"');
    expect(svg).toContain("</svg>");
  });

  it("emits data-* attributes for metadata", () => {
    const doc = makeSimpleDocument();
    const svg = serializeSvgDocument(doc);

    expect(svg).toContain('data-role="environment"');
    expect(svg).toContain('data-role="building"');
    expect(svg).toContain('data-importance="background"');
    expect(svg).toContain('data-importance="primary"');
    expect(svg).toContain('data-name="Main Building"');
  });

  it("emits element IDs", () => {
    const doc = makeSimpleDocument();
    const svg = serializeSvgDocument(doc);

    expect(svg).toContain('id="bg"');
    expect(svg).toContain('id="building"');
    expect(svg).toContain('id="wall"');
  });

  it("produces self-closing tags for leaf elements", () => {
    const doc = makeSimpleDocument();
    const svg = serializeSvgDocument(doc);

    // rect and other leaf elements should self-close
    expect(svg).toContain('<rect');
    expect(svg).toContain("/>");
    expect(svg).toContain("</svg>");
  });

  it("handles elements with text content", () => {
    const doc: SvgDocument = {
      ...makeSimpleDocument(),
      root: {
        id: "root", type: "svg", attributes: {}, children: [
          { id: "label", type: "text", attributes: { x: 10, y: 30 }, text: "Figure 1", children: [] },
        ],
      },
    };
    const svg = serializeSvgDocument(doc);

    expect(svg).toContain("<text");
    expect(svg).toContain("Figure 1");
    expect(svg).toContain("</text>");
  });

  it("escapes XML special characters", () => {
    const doc: SvgDocument = {
      ...makeSimpleDocument(),
      root: {
        id: "root", type: "svg", attributes: {}, children: [
          {
            id: "label",
            type: "text",
            attributes: { x: 10, y: 30 },
            text: "A < B & C > D",
            children: [],
          },
        ],
      },
    };
    const svg = serializeSvgDocument(doc);

    expect(svg).toContain("A &lt; B &amp; C &gt; D");
  });
});

// ---------------------------------------------------------------------------
// Parser tests
// ---------------------------------------------------------------------------

describe("parseSvgDocument", () => {
  it("parses a simple SVG with rect", () => {
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
  <rect id="bg" x="0" y="0" width="800" height="600" fill="#ffffff" />
</svg>`;

    const doc = parseSvgDocument(svg);
    expect(doc.width).toBe(800);
    expect(doc.height).toBe(600);
    expect(doc.viewBox).toBe("0 0 800 600");
    expect(doc.root.children).toHaveLength(1);
    expect(doc.root.children[0]!.id).toBe("bg");
    expect(doc.root.children[0]!.type).toBe("rect");
    expect(doc.root.children[0]!.attributes["fill"]).toBe("#ffffff");
  });

  it("preserves group hierarchy", () => {
    const svg = `<?xml version="1.0"?>
<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
  <g id="group1">
    <rect id="r1" x="0" y="0" width="100" height="50"/>
    <circle id="c1" cx="50" cy="50" r="30"/>
  </g>
</svg>`;

    const doc = parseSvgDocument(svg);
    expect(doc.root.children).toHaveLength(1);
    const g = doc.root.children[0]!;
    expect(g.id).toBe("group1");
    expect(g.type).toBe("g");
    expect(g.children).toHaveLength(2);
    expect(g.children[0]!.id).toBe("r1");
    expect(g.children[1]!.id).toBe("c1");
  });

  it("parses data-* attributes as metadata", () => {
    const svg = `<?xml version="1.0"?>
<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">
  <rect id="r" x="0" y="0" width="100" height="100" data-role="building" data-importance="primary"/>
</svg>`;

    const doc = parseSvgDocument(svg);
    const rect = doc.root.children[0]!;
    expect(rect.metadata?.role).toBe("building");
    expect(rect.metadata?.importance).toBe("primary");
    // data-* should NOT be in attributes
    expect(rect.attributes["data-role"]).toBeUndefined();
    expect(rect.attributes["data-importance"]).toBeUndefined();
  });

  it("parses data-name attribute", () => {
    const svg = `<?xml version="1.0"?>
<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">
  <rect id="r" x="0" y="0" width="100" height="100" data-name="My Rectangle"/>
</svg>`;

    const doc = parseSvgDocument(svg);
    expect(doc.root.children[0]!.name).toBe("My Rectangle");
  });

  it("handles self-closing tags", () => {
    const svg = `<?xml version="1.0"?>
<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">
  <circle id="c" cx="50" cy="50" r="30" fill="red"/>
</svg>`;

    const doc = parseSvgDocument(svg);
    expect(doc.root.children).toHaveLength(1);
    expect(doc.root.children[0]!.type).toBe("circle");
    expect(doc.root.children[0]!.attributes["r"]).toBe(30);
  });

  it("handles text elements with content", () => {
    const svg = `<?xml version="1.0"?>
<svg xmlns="http://www.w3.org/2000/svg" width="200" height="50">
  <text id="label" x="10" y="30" font-size="14">Hello World</text>
</svg>`;

    const doc = parseSvgDocument(svg);
    const textEl = doc.root.children[0]!;
    expect(textEl.type).toBe("text");
    expect(textEl.text).toBe("Hello World");
    expect(textEl.attributes["font-size"]).toBe(14);
  });

  it("handles numeric attribute conversion", () => {
    const svg = `<?xml version="1.0"?>
<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">
  <rect x="10" y="20" width="80" height="60" stroke-width="2"/>
</svg>`;

    const doc = parseSvgDocument(svg);
    const r = doc.root.children[0]!;
    expect(r.attributes["x"]).toBe(10);
    expect(r.attributes["y"]).toBe(20);
    expect(r.attributes["width"]).toBe(80);
    expect(r.attributes["height"]).toBe(60);
    expect(r.attributes["stroke-width"]).toBe(2);
  });

  it("converts numeric attributes except fill/stroke/style/transform", () => {
    const svg = `<?xml version="1.0"?>
<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">
  <rect fill="#ff0000" stroke="blue" transform="translate(10,20)" style="opacity:0.5"/>
</svg>`;

    const doc = parseSvgDocument(svg);
    const r = doc.root.children[0]!;
    // These should remain strings
    expect(typeof r.attributes["fill"]).toBe("string");
    expect(typeof r.attributes["stroke"]).toBe("string");
    expect(typeof r.attributes["transform"]).toBe("string");
    expect(typeof r.attributes["style"]).toBe("string");
  });
});

// ---------------------------------------------------------------------------
// Round-trip: serialize → parse → verify
// ---------------------------------------------------------------------------

describe("round-trip: serialize → parse", () => {
  it("preserves structure through serialization and parsing", () => {
    const original = makeSimpleDocument();

    // Serialize
    const svg = serializeSvgDocument(original);

    // Parse back
    const parsed = parseSvgDocument(svg);

    // Verify structure
    expect(parsed.width).toBe(original.width);
    expect(parsed.height).toBe(original.height);
    expect(parsed.viewBox).toBe(original.viewBox);
    expect(parsed.root.children).toHaveLength(original.root.children.length);

    // Check first child (bg rect)
    const bg = parsed.root.children[0]!;
    expect(bg.id).toBe("bg");
    expect(bg.type).toBe("rect");
    expect(bg.metadata?.role).toBe("environment");
    expect(bg.metadata?.importance).toBe("background");

    // Check group hierarchy
    const building = parsed.root.children[1]!;
    expect(building.id).toBe("building");
    expect(building.type).toBe("g");
    expect(building.name).toBe("Main Building");
    expect(building.metadata?.role).toBe("building");
    expect(building.children).toHaveLength(1);
    expect(building.children[0]!.id).toBe("wall");
  });

  it("preserves a complex nested structure", () => {
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
  <g id="environment" data-role="environment">
    <rect id="ground" x="0" y="600" width="1200" height="200" fill="#90A955"/>
    <circle id="sun" cx="100" cy="80" r="40" fill="#FFD166"/>
  </g>
  <g id="entities" data-role="entity">
    <g id="uav" data-name="UAV">
      <rect id="uav-body" x="550" y="280" width="100" height="30" fill="#118AB2"/>
      <circle id="uav-rotor1" cx="560" cy="275" r="15" fill="#073B4C"/>
    </g>
  </g>
  <g id="legend" data-role="legend">
    <rect id="legend-bg" x="20" y="20" width="200" height="120" fill="#ffffff" stroke="#333" stroke-width="1"/>
    <text id="legend-title" x="30" y="45" font-size="14">Legend</text>
  </g>
</svg>`;

    // First parse
    const doc1 = parseSvgDocument(svg);

    // Serialize
    const svg2 = serializeSvgDocument(doc1);

    // Parse again
    const doc2 = parseSvgDocument(svg2);

    // Structure should be preserved through second round-trip
    expect(doc2.root.children).toHaveLength(3);

    const env = doc2.root.children[0]!;
    expect(env.id).toBe("environment");
    expect(env.metadata?.role).toBe("environment");
    expect(env.children).toHaveLength(2);

    const entities = doc2.root.children[1]!;
    expect(entities.id).toBe("entities");
    expect(entities.metadata?.role).toBe("entity");
    expect(entities.children[0]!.id).toBe("uav");
    expect(entities.children[0]!.name).toBe("UAV");
    expect(entities.children[0]!.children).toHaveLength(2);

    const legend = doc2.root.children[2]!;
    expect(legend.id).toBe("legend");
    expect(legend.metadata?.role).toBe("legend");
    expect(legend.children).toHaveLength(2);
    expect(legend.children[1]!.text).toBe("Legend");
  });
});

// ---------------------------------------------------------------------------
// Real-world SVG patterns (Review #2 feedback)
// ---------------------------------------------------------------------------

describe("real-world SVG patterns", () => {
  it("preserves transform='matrix(...)' as string", () => {
    const svg = `<?xml version="1.0"?>
<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
  <g transform="matrix(0.866,0.5,-0.5,0.866,100,50)">
    <rect width="80" height="60" fill="blue"/>
  </g>
</svg>`;
    const doc = parseSvgDocument(svg);
    const g = doc.root.children[0]!;
    expect(typeof g.attributes["transform"]).toBe("string");
    expect(g.attributes["transform"]).toBe("matrix(0.866,0.5,-0.5,0.866,100,50)");

    // Round-trip
    const reserialized = serializeSvgDocument(doc);
    const doc2 = parseSvgDocument(reserialized);
    expect(doc2.root.children[0]!.attributes["transform"]).toBe("matrix(0.866,0.5,-0.5,0.866,100,50)");
  });

  it("preserves fill='url(#gradient)' as string", () => {
    const svg = `<?xml version="1.0"?>
<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
  <defs>
    <linearGradient id="grad1" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ff0000"/>
      <stop offset="1" stop-color="#0000ff"/>
    </linearGradient>
  </defs>
  <rect fill="url(#grad1)" width="100" height="100"/>
</svg>`;
    const doc = parseSvgDocument(svg);

    // Check defs
    const defs = doc.root.children.find((c) => c.type === "defs");
    expect(defs).toBeDefined();
    expect(defs!.children).toHaveLength(1);
    expect(defs!.children[0]!.type).toBe("linearGradient");
    expect(defs!.children[0]!.children).toHaveLength(2); // two stops
    expect(defs!.children[0]!.children[0]!.type).toBe("stop");

    // Check rect fill remains a URL string
    const rect = doc.root.children.find((c) => c.type === "rect");
    expect(rect).toBeDefined();
    expect(typeof rect!.attributes["fill"]).toBe("string");
    expect(rect!.attributes["fill"]).toBe("url(#grad1)");
  });

  it("preserves inline style attribute as raw string", () => {
    const svg = `<?xml version="1.0"?>
<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
  <rect style="fill:#ff0000;stroke:#000000;stroke-width:2" width="100" height="100"/>
</svg>`;
    const doc = parseSvgDocument(svg);
    const rect = doc.root.children[0]!;
    expect(typeof rect.attributes["style"]).toBe("string");
    expect(rect.attributes["style"]).toBe("fill:#ff0000;stroke:#000000;stroke-width:2");
  });

  it("preserves <style> element content as raw CSS", () => {
    const svg = `<?xml version="1.0"?>
<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
  <style>
    .cls-1 { fill: red; stroke: blue; }
    .cls-2 { fill: green; opacity: 0.5; }
  </style>
  <rect class="cls-1" width="100" height="100"/>
</svg>`;
    const doc = parseSvgDocument(svg);
    const styleEl = doc.root.children.find((c) => c.type === "style");
    expect(styleEl).toBeDefined();
    expect(styleEl!.text).toContain(".cls-1");
    expect(styleEl!.text).toContain("fill: red");
    expect(styleEl!.text).toContain(".cls-2");
    expect(styleEl!.text).toContain("opacity: 0.5");

    // Round-trip preserves CSS
    const reserialized = serializeSvgDocument(doc);
    expect(reserialized).toContain(".cls-1");
    expect(reserialized).toContain("fill: red");
  });

  it("preserves <use> with href reference", () => {
    const svg = `<?xml version="1.0"?>
<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
  <defs>
    <circle id="myCircle" cx="50" cy="50" r="40"/>
  </defs>
  <use href="#myCircle" x="100" y="0"/>
</svg>`;
    const doc = parseSvgDocument(svg);
    const use = doc.root.children.find((c) => c.type === "use");
    expect(use).toBeDefined();
    expect(typeof use!.attributes["href"]).toBe("string");
    expect(use!.attributes["href"]).toBe("#myCircle");
  });

  it("preserves clip-path and marker-end as strings", () => {
    const svg = `<?xml version="1.0"?>
<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
  <defs>
    <clipPath id="clip1">
      <rect x="0" y="0" width="100" height="100"/>
    </clipPath>
    <marker id="arrow" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
      <polygon points="0 0, 10 3.5, 0 7" fill="red"/>
    </marker>
  </defs>
  <rect clip-path="url(#clip1)" fill="blue" width="200" height="200"/>
  <line x1="10" y1="10" x2="100" y2="100" stroke="black" marker-end="url(#arrow)"/>
</svg>`;
    const doc = parseSvgDocument(svg);
    const rect = doc.root.children.find((c) => c.type === "rect");
    expect(rect).toBeDefined();
    expect(typeof rect!.attributes["clip-path"]).toBe("string");
    expect(rect!.attributes["clip-path"]).toBe("url(#clip1)");

    const line = doc.root.children.find((c) => c.type === "line");
    expect(line).toBeDefined();
    expect(typeof line!.attributes["marker-end"]).toBe("string");
    expect(line!.attributes["marker-end"]).toBe("url(#arrow)");
  });

  it("preserves path d attribute as string", () => {
    const svg = `<?xml version="1.0"?>
<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
  <path d="M10,80 Q95,10 180,80 T350,80" fill="none" stroke="red" stroke-width="3"/>
</svg>`;
    const doc = parseSvgDocument(svg);
    const path = doc.root.children[0]!;
    expect(path.type).toBe("path");
    expect(typeof path.attributes["d"]).toBe("string");
    expect(path.attributes["d"]).toBe("M10,80 Q95,10 180,80 T350,80");
  });

  it("preserves font-family and text-anchor as strings", () => {
    const svg = `<?xml version="1.0"?>
<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100">
  <text font-family="Times New Roman, serif" font-size="14" text-anchor="middle" x="100" y="50">Hello</text>
</svg>`;
    const doc = parseSvgDocument(svg);
    const text = doc.root.children[0]!;
    expect(typeof text.attributes["font-family"]).toBe("string");
    expect(text.attributes["font-family"]).toBe("Times New Roman, serif");
    expect(typeof text.attributes["text-anchor"]).toBe("string");
    expect(text.attributes["text-anchor"]).toBe("middle");
    expect(text.attributes["font-size"]).toBe(14); // numeric
  });

  it("preserves xmlns:xlink namespace attributes", () => {
    const svg = `<?xml version="1.0"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="200" height="200">
  <use xlink:href="#icon" x="10" y="10"/>
</svg>`;
    const doc = parseSvgDocument(svg);
    expect(doc.root.children).toHaveLength(1);
    const use = doc.root.children[0]!;
    expect(typeof use.attributes["xlink:href"]).toBe("string");
    expect(use.attributes["xlink:href"]).toBe("#icon");
  });

  it("handles SVG-Edit-style output with multiple namespaces and attributes", () => {
    // Simulates a real SVG-Edit export
    const svg = `<?xml version="1.0"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="800" height="600" viewBox="0 0 800 600">
  <g id="layer1" data-role="environment">
    <rect id="bg" x="0" y="0" width="800" height="600" fill="#f5f5f5" stroke="none"/>
    <path id="road" d="M0,500 L800,500" fill="none" stroke="#999" stroke-width="3" stroke-dasharray="8,4"/>
  </g>
  <g id="layer2" data-role="entity" data-importance="primary">
    <circle id="uav" cx="400" cy="250" r="20" fill="#118AB2" stroke="#073B4C" stroke-width="2"/>
    <text id="uav-label" x="400" y="285" font-family="Arial" font-size="12" text-anchor="middle" fill="#333">UAV</text>
  </g>
</svg>`;

    const doc = parseSvgDocument(svg);
    expect(doc.root.children).toHaveLength(2);

    // Layer 1
    const layer1 = doc.root.children[0]!;
    expect(layer1.id).toBe("layer1");
    expect(layer1.metadata?.role).toBe("environment");
    expect(layer1.children).toHaveLength(2);

    const road = layer1.children.find((c) => c.id === "road")!;
    expect(road.attributes["stroke-dasharray"]).toBe("8,4");
    expect(typeof road.attributes["d"]).toBe("string");

    // Layer 2
    const layer2 = doc.root.children[1]!;
    expect(layer2.id).toBe("layer2");
    expect(layer2.metadata?.importance).toBe("primary");

    const uavLabel = layer2.children.find((c) => c.id === "uav-label")!;
    expect(uavLabel.text).toBe("UAV");
    expect(uavLabel.attributes["font-family"]).toBe("Arial");
    expect(uavLabel.attributes["text-anchor"]).toBe("middle");
    expect(uavLabel.attributes["fill"]).toBe("#333");

    // Round-trip
    const reserialized = serializeSvgDocument(doc);
    const doc2 = parseSvgDocument(reserialized);
    expect(doc2.root.children).toHaveLength(2);
    const layer2b = doc2.root.children[1]!;
    expect(layer2b.metadata?.role).toBe("entity");
    expect(layer2b.metadata?.importance).toBe("primary");
  });
});
