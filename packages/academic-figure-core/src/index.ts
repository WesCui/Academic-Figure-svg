/**
 * @academic-figure/core
 *
 * Structured SVG document core for AI-assisted academic figure creation.
 * Provides a DOM-independent SVG document model, tree utilities,
 * and a clean serializer.
 */

// Document types
export type {
  SvgElementType,
  SvgAttributeValue,
  SvgMetadata,
  SvgNode,
  SvgDocument,
  NodeLocation,
  CreateElementInput,
  BatchCreateInput,
  ElementTransform,
  GridLayout,
} from "./document/types.js";

// Node utilities
export {
  findNode,
  ensureNode,
  findNodes,
  removeNode,
  moveNode,
  countNodes,
  cloneNode,
  getAncestry,
} from "./document/node-utils.js";

// Tree view
export { renderTree } from "./document/tree-view.js";

// SVG serializer
export { serializeSvgDocument } from "./serializer/svg-serializer.js";

// SVG parser (XML → SvgDocument)
export { parseSvgDocument } from "./parser/svg-parser.js";
export type { ParseSvgOptions } from "./parser/svg-parser.js";

// Academic theme system
export type {
  AcademicFigureTheme,
  ThemeColors,
  ThemeStrokes,
  ThemeTypography,
  ThemeGeometry,
  SemanticLinkType,
  SemanticEntityType,
} from "./style/theme-types.js";
export { resolveLinkColor, resolveEntityColor } from "./style/theme-types.js";
export { academicTheme } from "./style/academic-theme.js";
export { ieeeTheme } from "./style/ieee-theme.js";
export { resolveTheme, listThemes, describeThemes } from "./style/theme-resolver.js";
