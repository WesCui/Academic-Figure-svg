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
