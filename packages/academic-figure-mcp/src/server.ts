/**
 * MCP Server definition for Academic Figure SVG.
 *
 * Registers all 13 core tools that Claude/Codex can use to create,
 * manipulate, and export academic SVG figures.
 *
 * All write tools return a unified WriteResult:
 *   { success: true, documentId, revision, affectedElementIds, extra? }
 *
 * All errors return a unified ToolError:
 *   { success: false, code, message, ...details }
 *
 * @module mcp-server
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod";

import type { SvgElementType, SemanticLinkType } from "@academic-figure/core";
import type { DocumentService } from "./services/document-service.js";
import type { RenderService } from "./services/render-service.js";
import type { ExportService } from "./services/export-service.js";
import type { PrimitiveService } from "./services/primitive-service.js";
import { errorToJson } from "./utils/errors.js";

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

const SvgElementTypeSchema = z.enum([
  "g",
  "rect",
  "circle",
  "ellipse",
  "line",
  "polyline",
  "polygon",
  "path",
  "text",
  "image",
  "use",
]);

const AttributesSchema = z.record(
  z.string(),
  z.union([z.string(), z.number()]),
);

const NullableAttributesSchema = z.record(
  z.string(),
  z.union([z.string(), z.number(), z.null()]),
);

const ElementTransformSchema = z.object({
  translateX: z.number().optional(),
  translateY: z.number().optional(),
  scaleX: z.number().optional(),
  scaleY: z.number().optional(),
  rotate: z.number().optional(),
});

const GridLayoutSchema = z.object({
  rows: z.number().int().positive(),
  columns: z.number().int().positive(),
  startX: z.number(),
  startY: z.number(),
  stepX: z.number(),
  stepY: z.number(),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function jsonContent(data: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

function errorContent(error: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: errorToJson(error),
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Server factory
// ---------------------------------------------------------------------------

export interface McpDependencies {
  documentService: DocumentService;
  renderService: RenderService;
  exportService: ExportService;
  primitiveService: PrimitiveService;
}

export function createMcpServer(deps: McpDependencies): McpServer {
  const { documentService, renderService, exportService, primitiveService } = deps;

  const server = new McpServer({
    name: "academic-figure-mcp",
    version: "0.1.0",
  });

  // -----------------------------------------------------------------------
  // 1. create_document
  // -----------------------------------------------------------------------
  server.registerTool(
    "create_document",
    {
      description:
        "Create a new editable SVG document for academic figure creation.",
      inputSchema: z.object({
        name: z.string().min(1).describe("Human-readable document name"),
        width: z.number().positive().describe("Canvas width in pixels"),
        height: z.number().positive().describe("Canvas height in pixels"),
        background: z
          .string()
          .optional()
          .describe("Optional background color (CSS value)"),
      }),
    },
    async ({ name, width, height, background }) => {
      try {
        const { document, result } = await documentService.createDocument({
          name,
          width,
          height,
          background,
        });
        return jsonContent({
          success: true,
          documentId: document.id,
          name: document.name,
          width: document.width,
          height: document.height,
          viewBox: document.viewBox,
          revision: document.revision,
          createdAt: document.createdAt,
          affectedElementIds: result.affectedElementIds,
        });
      } catch (e) {
        return errorContent(e);
      }
    },
  );

  // -----------------------------------------------------------------------
  // 2. load_document
  // -----------------------------------------------------------------------
  server.registerTool(
    "load_document",
    {
      description: "Load an existing SVG document by its ID.",
      inputSchema: z.object({
        documentId: z.string().min(1).describe("Document ID to load"),
      }),
    },
    async ({ documentId }) => {
      try {
        const doc = await documentService.getDocument(documentId);
        return jsonContent({
          success: true,
          documentId: doc.id,
          name: doc.name,
          width: doc.width,
          height: doc.height,
          viewBox: doc.viewBox,
          revision: doc.revision,
          elementCount: doc.root.children.length,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
        });
      } catch (e) {
        return errorContent(e);
      }
    },
  );

  // -----------------------------------------------------------------------
  // 3. create_element
  // -----------------------------------------------------------------------
  server.registerTool(
    "create_element",
    {
      description:
        "Create a new SVG element inside a document. Supports rect, circle, ellipse, line, polyline, polygon, path, text, g, image, and use.",
      inputSchema: z.object({
        documentId: z.string().min(1),
        parentId: z
          .string()
          .optional()
          .describe("Parent group ID; defaults to root"),
        id: z
          .string()
          .optional()
          .describe("Custom element ID; auto-generated if omitted"),
        type: SvgElementTypeSchema,
        name: z
          .string()
          .optional()
          .describe("Display name (stored as data-name)"),
        attributes: AttributesSchema.describe(
          "SVG presentation attributes (e.g. {x:10, y:20, fill:'#ff0000'})",
        ),
        text: z.string().optional().describe("Text content for <text> elements"),
        expectedRevision: z
          .number()
          .int()
          .optional()
          .describe("Optimistic lock: fail if document revision differs"),
      }),
    },
    async ({
      documentId,
      parentId,
      id,
      type,
      name,
      attributes,
      text,
      expectedRevision,
    }) => {
      try {
        const result = await documentService.createElement(
          documentId,
          {
            parentId,
            id,
            type: type as SvgElementType,
            name,
            attributes,
            text,
          },
          expectedRevision,
        );
        return jsonContent(result);
      } catch (e) {
        return errorContent(e);
      }
    },
  );

  // -----------------------------------------------------------------------
  // 4. batch_create_elements
  // -----------------------------------------------------------------------
  server.registerTool(
    "batch_create_elements",
    {
      description:
        "Create multiple SVG elements in a single atomic transaction. All-or-nothing: if any element fails validation, none are created. Use this for efficiency when creating many elements at once (e.g., multiple windows on a building). Batch limit: 500.",
      inputSchema: z.object({
        documentId: z.string().min(1),
        elements: z
          .array(
            z.object({
              parentId: z.string().optional(),
              id: z.string().optional(),
              type: SvgElementTypeSchema,
              name: z.string().optional(),
              attributes: AttributesSchema,
              text: z.string().optional(),
            }),
          )
          .min(1)
          .max(500)
          .describe("Array of elements to create (1-500)"),
        expectedRevision: z.number().int().optional(),
      }),
    },
    async ({ documentId, elements, expectedRevision }) => {
      try {
        const result = await documentService.batchCreateElements(
          documentId,
          elements.map((el) => ({
            parentId: el.parentId,
            id: el.id,
            type: el.type as SvgElementType,
            name: el.name,
            attributes: el.attributes,
            text: el.text,
          })),
          expectedRevision,
        );
        return jsonContent(result);
      } catch (e) {
        return errorContent(e);
      }
    },
  );

  // -----------------------------------------------------------------------
  // 5. create_repeated_elements
  // -----------------------------------------------------------------------
  server.registerTool(
    "create_repeated_elements",
    {
      description:
        "Create a grid of repeated SVG elements. Ideal for window arrays, antenna arrays, tree clusters, grid points, etc.",
      inputSchema: z.object({
        documentId: z.string().min(1),
        parentId: z.string().optional(),
        template: z.object({
          type: SvgElementTypeSchema,
          attributes: AttributesSchema,
          namePrefix: z.string().optional(),
        }),
        layout: GridLayoutSchema,
        expectedRevision: z.number().int().optional(),
      }),
    },
    async ({ documentId, parentId, template, layout, expectedRevision }) => {
      try {
        const result = await documentService.createRepeatedElements(
          {
            documentId,
            parentId,
            template: {
              type: template.type as SvgElementType,
              attributes: template.attributes,
              namePrefix: template.namePrefix,
            },
            layout,
          },
          expectedRevision,
        );
        return jsonContent(result);
      } catch (e) {
        return errorContent(e);
      }
    },
  );

  // -----------------------------------------------------------------------
  // 6. create_isometric_building
  // -----------------------------------------------------------------------
  server.registerTool(
    "create_isometric_building",
    {
      description:
        "Create a complete isometric/axonometric building in a single call. Generates front facade, side facade, roof, window grid, entrance with canopy, and rooftop HVAC units. This single call replaces 30-80 individual create_element calls. Ideal for academic diagrams showing urban environments, campus layouts, or architectural scenes.",
      inputSchema: z.object({
        documentId: z.string().min(1),
        parentId: z.string().optional().describe("Parent group ID; defaults to root"),
        id: z.string().optional().describe("Custom building group ID"),
        x: z.number().describe("Anchor X (bottom-left of front face)"),
        y: z.number().describe("Anchor Y (bottom of front face)"),
        width: z.number().positive().describe("Building width"),
        depth: z.number().positive().describe("Building depth (along isometric axis)"),
        height: z.number().positive().describe("Building height"),
        floors: z.number().int().min(1).max(50).optional().describe("Number of floors (controls window rows)"),
        perspective: z.object({
          dx: z.number().describe("Horizontal offset for depth axis (e.g. 60)"),
          dy: z.number().describe("Vertical offset for depth axis (e.g. -30)"),
        }).optional(),
        facade: z.object({
          frontFill: z.string().optional(),
          sideFill: z.string().optional(),
          roofFill: z.string().optional(),
          stroke: z.string().optional(),
          strokeWidth: z.number().optional(),
          windowFill: z.string().optional(),
          windowStroke: z.string().optional(),
          windowWidth: z.number().optional(),
          windowHeight: z.number().optional(),
          windowColumns: z.number().int().optional(),
          windowMarginX: z.number().optional(),
          windowMarginY: z.number().optional(),
        }).optional(),
        rooftop: z.object({
          enabled: z.boolean().optional(),
          hvacUnits: z.number().int().min(0).max(10).optional(),
        }).optional(),
        entrance: z.object({
          enabled: z.boolean().optional(),
          canopy: z.boolean().optional(),
        }).optional(),
        expectedRevision: z.number().int().optional(),
      }),
    },
    async (args) => {
      try {
        const result = await primitiveService.createIsometricBuilding(
          {
            documentId: args.documentId,
            parentId: args.parentId,
            id: args.id,
            x: args.x,
            y: args.y,
            width: args.width,
            depth: args.depth,
            height: args.height,
            floors: args.floors,
            perspective: args.perspective,
            facade: args.facade,
            rooftop: args.rooftop,
            entrance: args.entrance,
          },
          args.expectedRevision,
        );
        return jsonContent(result);
      } catch (e) {
        return errorContent(e);
      }
    },
  );

  // -----------------------------------------------------------------------
  // 7. update_element
  // -----------------------------------------------------------------------
  server.registerTool(
    "update_element",
    {
      description:
        "Update attributes, text, or name of an existing SVG element. Pass `null` as an attribute value to remove it.",
      inputSchema: z.object({
        documentId: z.string().min(1),
        elementId: z.string().min(1),
        attributes: NullableAttributesSchema.optional().describe(
          "Attributes to set; null values remove the attribute",
        ),
        text: z.string().optional().describe("New text content"),
        name: z.string().optional().describe("New display name"),
        expectedRevision: z.number().int().optional(),
      }),
    },
    async ({
      documentId,
      elementId,
      attributes,
      text,
      name,
      expectedRevision,
    }) => {
      try {
        const result = await documentService.updateElement(
          documentId,
          elementId,
          { attributes, text, name },
          expectedRevision,
        );
        return jsonContent(result);
      } catch (e) {
        return errorContent(e);
      }
    },
  );

  // -----------------------------------------------------------------------
  // 7. transform_elements
  // -----------------------------------------------------------------------
  server.registerTool(
    "transform_elements",
    {
      description:
        "Apply translate, scale, or rotate transforms to one or more elements.",
      inputSchema: z.object({
        documentId: z.string().min(1),
        elementIds: z.array(z.string()).min(1).max(200),
        transform: ElementTransformSchema,
        expectedRevision: z.number().int().optional(),
      }),
    },
    async ({ documentId, elementIds, transform, expectedRevision }) => {
      try {
        const result = await documentService.transformElements(
          documentId,
          elementIds,
          transform,
          expectedRevision,
        );
        return jsonContent(result);
      } catch (e) {
        return errorContent(e);
      }
    },
  );

  // -----------------------------------------------------------------------
  // 8. delete_elements
  // -----------------------------------------------------------------------
  server.registerTool(
    "delete_elements",
    {
      description: "Delete one or more SVG elements by ID.",
      inputSchema: z.object({
        documentId: z.string().min(1),
        elementIds: z.array(z.string()).min(1).max(200),
        expectedRevision: z.number().int().optional(),
      }),
    },
    async ({ documentId, elementIds, expectedRevision }) => {
      try {
        const result = await documentService.deleteElements(
          documentId,
          elementIds,
          expectedRevision,
        );
        return jsonContent(result);
      } catch (e) {
        return errorContent(e);
      }
    },
  );

  // -----------------------------------------------------------------------
  // 9. get_document_tree
  // -----------------------------------------------------------------------
  server.registerTool(
    "get_document_tree",
    {
      description:
        "Get a lightweight tree view of the document structure for inspection.",
      inputSchema: z.object({
        documentId: z.string().min(1),
        parentId: z
          .string()
          .optional()
          .describe("Start from a specific node"),
        maxDepth: z.number().int().min(1).max(20).default(10),
      }),
    },
    async ({ documentId, parentId, maxDepth }) => {
      try {
        const { tree, nodeCount } = await documentService.getDocumentTree(
          documentId,
          parentId,
          maxDepth ?? 10,
        );
        return {
          content: [
            {
              type: "text" as const,
              text: `Document tree (${nodeCount} nodes):\n\n${tree}`,
            },
          ],
        };
      } catch (e) {
        return errorContent(e);
      }
    },
  );

  // -----------------------------------------------------------------------
  // 10. query_elements
  // -----------------------------------------------------------------------
  server.registerTool(
    "query_elements",
    {
      description:
        "Find elements by type, role, importance, or tags. Useful for bulk operations like 'dim all background elements'.",
      inputSchema: z.object({
        documentId: z.string().min(1),
        parentId: z.string().optional(),
        type: z.string().optional(),
        role: z.string().optional(),
        importance: z.string().optional(),
        tags: z.array(z.string()).optional(),
      }),
    },
    async ({ documentId, parentId, type, role, importance, tags }) => {
      try {
        const nodes = await documentService.queryElements(documentId, {
          parentId,
          type,
          role,
          importance,
          tags,
        });
        return jsonContent({
          count: nodes.length,
          elements: nodes.map((n) => ({
            id: n.id,
            type: n.type,
            name: n.name,
            role: n.metadata?.role,
            importance: n.metadata?.importance,
            tags: n.metadata?.tags,
          })),
        });
      } catch (e) {
        return errorContent(e);
      }
    },
  );

  // -----------------------------------------------------------------------
  // 11. render_preview
  // -----------------------------------------------------------------------
  server.registerTool(
    "render_preview",
    {
      description:
        "Render the current SVG document to a PNG preview image using resvg (no browser required). Returns both a base64-encoded image (so the AI can visually inspect the result) and metadata (path, dimensions). This is the core of the visual feedback loop: create → preview → see → fix → preview again.",
      inputSchema: z.object({
        documentId: z.string().min(1),
        width: z
          .number()
          .positive()
          .optional()
          .describe("Output width in pixels; height auto-calculated"),
      }),
    },
    async ({ documentId, width }) => {
      try {
        const result = await renderService.renderPreview(documentId, width);

        // Get document revision for context
        let revision: number | undefined;
        try {
          const doc = await documentService.getDocument(documentId);
          revision = doc.revision;
        } catch {
          // best-effort
        }

        const metadata = {
          success: true,
          documentId,
          revision,
          previewPath: result.previewPath,
          width: result.width,
          height: result.height,
        };

        return {
          content: [
            {
              type: "image" as const,
              data: result.pngBuffer.toString("base64"),
              mimeType: "image/png" as const,
            },
            {
              type: "text" as const,
              text: JSON.stringify(metadata, null, 2),
            },
          ],
        };
      } catch (e) {
        return errorContent(e);
      }
    },
  );

  // -----------------------------------------------------------------------
  // 12. export_svg
  // -----------------------------------------------------------------------
  server.registerTool(
    "export_svg",
    {
      description:
        "Serialize and export the document to a standalone SVG file. Also saves to the document's current.svg for SVG-Edit integration.",
      inputSchema: z.object({
        documentId: z.string().min(1),
        outputPath: z.string().optional().describe("Custom output path"),
      }),
    },
    async ({ documentId, outputPath }) => {
      try {
        const svgPath = await exportService.exportSvg(documentId, outputPath);
        return jsonContent({
          success: true,
          documentId,
          svgPath,
        });
      } catch (e) {
        return errorContent(e);
      }
    },
  );

  // -----------------------------------------------------------------------
  // 13. get_document_info
  // -----------------------------------------------------------------------
  server.registerTool(
    "get_document_info",
    {
      description: "Get summary information about a document.",
      inputSchema: z.object({
        documentId: z.string().min(1),
      }),
    },
    async ({ documentId }) => {
      try {
        const doc = await documentService.getDocument(documentId);
        return jsonContent({
          success: true,
          documentId: doc.id,
          name: doc.name,
          width: doc.width,
          height: doc.height,
          viewBox: doc.viewBox,
          revision: doc.revision,
          rootChildren: doc.root.children.length,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
        });
      } catch (e) {
        return errorContent(e);
      }
    },
  );

  // -----------------------------------------------------------------------
  // 14. create_communication_link
  // -----------------------------------------------------------------------
  server.registerTool(
    "create_communication_link",
    {
      description:
        "Create a styled communication/sensing/leakage link between two points or entities. Automatically applies the correct color, stroke style, and arrowhead based on semantic type: information=blue solid, sensing=orange solid, artificial-noise=orange beam, leakage=red dashed, trajectory=red curved. Supports sourceId/targetId for auto-positioning between existing elements, or explicit start/end points.",
      inputSchema: z.object({
        documentId: z.string().min(1),
        parentId: z.string().optional(),
        id: z.string().optional(),
        sourceId: z.string().optional().describe("ID of source element for auto-positioning"),
        targetId: z.string().optional().describe("ID of target element for auto-positioning"),
        start: z.object({ x: z.number(), y: z.number() }).optional(),
        end: z.object({ x: z.number(), y: z.number() }).optional(),
        semanticType: z.enum(["information", "sensing", "artificial-noise", "leakage", "trajectory"]),
        geometry: z.object({
          type: z.enum(["line", "beam"]).optional(),
          beamWidth: z.number().optional(),
        }).optional(),
        style: z.object({
          color: z.string().optional(),
          strokeWidth: z.number().optional(),
          dashed: z.boolean().optional(),
          opacity: z.number().optional(),
          arrowhead: z.boolean().optional(),
        }).optional(),
        theme: z.string().optional().describe("Theme name (academic, ieee)"),
      }),
    },
    async (args) => {
      try {
        const result = await primitiveService.createCommunicationLink({
          documentId: args.documentId,
          parentId: args.parentId,
          id: args.id,
          sourceId: args.sourceId,
          targetId: args.targetId,
          start: args.start,
          end: args.end,
          semanticType: args.semanticType as SemanticLinkType,
          geometry: args.geometry as { type: "line" | "beam"; beamWidth?: number } | undefined,
          style: args.style,
          theme: args.theme,
        });
        return jsonContent(result);
      } catch (e) {
        return errorContent(e);
      }
    },
  );

  // -----------------------------------------------------------------------
  // 15. create_numbered_callout
  // -----------------------------------------------------------------------
  server.registerTool(
    "create_numbered_callout",
    {
      description:
        "Create a numbered callout annotation with a circled number marker, optional leader line, and text label. Variants: 'minimal' (no background box — clean academic style), 'boxed' (light border box for grouped callouts), 'leader-only' (number + leader line, no label — for high-density figures). Essential for academic figures that need to reference specific elements.",
      inputSchema: z.object({
        documentId: z.string().min(1),
        parentId: z.string().optional(),
        id: z.string().optional(),
        number: z.number().int().positive(),
        x: z.number().describe("Center X of the numbered circle"),
        y: z.number().describe("Center Y of the numbered circle"),
        label: z.string().optional().describe("Text label next to the callout"),
        labelPosition: z.object({ x: z.number(), y: z.number() }).optional().describe("Position for label text"),
        variant: z.enum(["minimal", "boxed", "leader-only"]).optional().describe("minimal=clean academic, boxed=card style, leader-only=no label text"),
        theme: z.string().optional(),
      }),
    },
    async (args) => {
      try {
        const result = await primitiveService.createNumberedCallout({
          documentId: args.documentId,
          parentId: args.parentId,
          id: args.id,
          number: args.number,
          x: args.x, y: args.y,
          label: args.label,
          labelPosition: args.labelPosition,
          variant: args.variant as "minimal" | "boxed" | "leader-only" | undefined,
          theme: args.theme,
        });
        return jsonContent(result);
      } catch (e) {
        return errorContent(e);
      }
    },
  );

  // -----------------------------------------------------------------------
  // 16. create_paper_legend
  // -----------------------------------------------------------------------
  server.registerTool(
    "create_paper_legend",
    {
      description:
        "Create a formatted legend box with title, color swatches, and/or line-style entries. Supports two entry types: color swatches ({label, color}) and line styles ({type:'line', label, semanticType}) that auto-resolve color/dash from the theme. Auto-calculates height. Essential for figures with multiple semantic element types.",
      inputSchema: z.object({
        documentId: z.string().min(1),
        parentId: z.string().optional(),
        id: z.string().optional(),
        x: z.number(),
        y: z.number(),
        title: z.string().optional().describe("Legend title (e.g., 'Legend')"),
        entries: z.array(
          z.union([
            z.object({
              type: z.literal("color").optional(),
              label: z.string(),
              color: z.string(),
              borderColor: z.string().optional(),
            }),
            z.object({
              type: z.literal("line"),
              label: z.string(),
              semanticType: z.enum(["information", "sensing", "artificial-noise", "leakage", "trajectory"]),
            }),
          ]),
        ).min(1),
        theme: z.string().optional(),
      }),
    },
    async (args) => {
      try {
        const result = await primitiveService.createPaperLegend({
          documentId: args.documentId,
          parentId: args.parentId,
          id: args.id,
          x: args.x, y: args.y,
          title: args.title,
          entries: args.entries as Array<{ label: string; color: string; borderColor?: string } | { type: "line"; label: string; semanticType: SemanticLinkType }>,
          theme: args.theme,
        });
        return jsonContent(result);
      } catch (e) {
        return errorContent(e);
      }
    },
  );

  // -----------------------------------------------------------------------
  // 17. audit_figure
  // -----------------------------------------------------------------------
  server.registerTool(
    "audit_figure",
    {
      description:
        "Run static visual audit checks on a figure: overlap detection, out-of-bounds elements, small text warnings, and density analysis. Returns a structured report that the AI can use to fix issues before the final render. No AI vision required — purely geometric analysis.",
      inputSchema: z.object({
        documentId: z.string().min(1),
        checks: z.array(z.enum(["overlap", "bounds", "text-size", "density"])).optional().describe("Which checks to run; all by default"),
      }),
    },
    async (args) => {
      try {
        const report = await primitiveService.auditFigure(args.documentId, args.checks);
        return jsonContent(report);
      } catch (e) {
        return errorContent(e);
      }
    },
  );

  // -----------------------------------------------------------------------
  // 18. align_elements
  // -----------------------------------------------------------------------
  server.registerTool(
    "align_elements",
    {
      description:
        "Align a set of elements along a common axis: center-x, center-y, left, right, top, bottom. Supports relativeTo: omit for average-of-selected, 'canvas' for canvas center, or {elementId} to align to another element. Use this to fix inconsistent positioning in AI-generated figures.",
      inputSchema: z.object({
        documentId: z.string().min(1),
        elementIds: z.array(z.string()).min(1),
        alignment: z.enum(["center-x", "center-y", "left", "right", "top", "bottom"]),
        relativeTo: z.union([
          z.literal("canvas"),
          z.object({ elementId: z.string() }),
        ]).optional().describe("Align relative to: 'canvas', a specific element, or omit for average of selected"),
      }),
    },
    async (args) => {
      try {
        const result = await primitiveService.alignElements(
          args.documentId, args.elementIds, args.alignment,
          args.relativeTo as "canvas" | { elementId: string } | undefined,
        );
        return jsonContent(result);
      } catch (e) {
        return errorContent(e);
      }
    },
  );

  // -----------------------------------------------------------------------
  // 19. distribute_elements
  // -----------------------------------------------------------------------
  server.registerTool(
    "distribute_elements",
    {
      description:
        "Distribute a set of elements evenly along a horizontal or vertical axis. Ensures uniform spacing between elements — critical for professional-looking legends, entity rows, and callout arrays.",
      inputSchema: z.object({
        documentId: z.string().min(1),
        elementIds: z.array(z.string()).min(2),
        axis: z.enum(["horizontal", "vertical"]),
      }),
    },
    async (args) => {
      try {
        const result = await primitiveService.distributeElements(
          args.documentId, args.elementIds, args.axis,
        );
        return jsonContent(result);
      } catch (e) {
        return errorContent(e);
      }
    },
  );

  // -----------------------------------------------------------------------
  // 20. list_themes
  // -----------------------------------------------------------------------
  server.registerTool(
    "list_themes",
    {
      description: "List available academic figure themes (academic, ieee). Use to select a consistent visual style for your figure.",
      inputSchema: z.object({}),
    },
    async () => {
      try {
        const { describeThemes } = await import("@academic-figure/core");
        return jsonContent({ themes: describeThemes() });
      } catch (e) {
        return errorContent(e);
      }
    },
  );

  return server;
}
