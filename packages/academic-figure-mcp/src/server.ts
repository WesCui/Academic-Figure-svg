/**
 * MCP Server definition for Academic Figure SVG.
 *
 * Registers all 12 core tools that Claude/Codex can use to create,
 * manipulate, and export academic SVG figures.
 *
 * @module mcp-server
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod";

import type { SvgElementType } from "@academic-figure/core";
import type { DocumentService } from "./services/document-service.js";
import type { RenderService } from "./services/render-service.js";
import type { ExportService } from "./services/export-service.js";
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
// Helper
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
}

export function createMcpServer(deps: McpDependencies): McpServer {
  const { documentService, renderService, exportService } = deps;

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
        const doc = await documentService.createDocument({
          name,
          width,
          height,
          background,
        });
        return jsonContent({
          documentId: doc.id,
          name: doc.name,
          width: doc.width,
          height: doc.height,
          viewBox: doc.viewBox,
          revision: doc.revision,
          createdAt: doc.createdAt,
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
        parentId: z.string().optional().describe("Parent group ID; defaults to root"),
        id: z.string().optional().describe("Custom element ID; auto-generated if omitted"),
        type: SvgElementTypeSchema,
        name: z.string().optional().describe("Display name (stored as data-name)"),
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
    async ({ documentId, parentId, id, type, name, attributes, text, expectedRevision }) => {
      try {
        const node = await documentService.createElement(
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
        return jsonContent({
          id: node.id,
          type: node.type,
          name: node.name,
        });
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
        "Create multiple SVG elements in a single atomic operation. Use this for efficiency when creating many elements at once (e.g., multiple windows on a building, multiple data points).",
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
        const nodes = await documentService.batchCreateElements(
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
        return jsonContent({
          created: nodes.length,
          ids: nodes.map((n) => n.id),
        });
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
        const nodes = await documentService.createRepeatedElements(
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
        return jsonContent({
          created: nodes.length,
          grid: `${layout.rows}×${layout.columns}`,
          firstId: nodes[0]?.id,
          lastId: nodes[nodes.length - 1]?.id,
        });
      } catch (e) {
        return errorContent(e);
      }
    },
  );

  // -----------------------------------------------------------------------
  // 6. update_element
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
    async ({ documentId, elementId, attributes, text, name, expectedRevision }) => {
      try {
        const node = await documentService.updateElement(
          documentId,
          elementId,
          { attributes, text, name },
          expectedRevision,
        );
        return jsonContent({
          updated: true,
          elementId: node.id,
        });
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
        await documentService.transformElements(
          documentId,
          elementIds,
          transform,
          expectedRevision,
        );
        return jsonContent({
          transformed: elementIds.length,
          elementIds,
        });
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
        const deleted = await documentService.deleteElements(
          documentId,
          elementIds,
          expectedRevision,
        );
        return jsonContent({
          deleted: deleted.length,
          elementIds: deleted,
        });
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
        parentId: z.string().optional().describe("Start from a specific node"),
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
        "Render the current SVG document to a PNG preview image using resvg (no browser required).",
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
        return jsonContent(result);
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
        return jsonContent({ svgPath });
      } catch (e) {
        return errorContent(e);
      }
    },
  );

  // -----------------------------------------------------------------------
  // 13. query_elements (alias maintained for discoverability)
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
          id: doc.id,
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

  return server;
}
