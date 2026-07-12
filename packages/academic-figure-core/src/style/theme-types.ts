/**
 * Academic Figure Theme System — Type Definitions.
 *
 * A theme defines the complete visual language for an academic figure:
 * colors, strokes, typography, and geometry defaults. Primitives and
 * tools consume a theme to produce consistent, publication-quality output
 * without the Agent needing to specify every visual parameter.
 *
 * Design principle:
 *   Agent expresses WHAT to draw → Theme decides HOW it looks.
 *
 * @module theme-types
 */

export type SemanticLinkType =
  | "information"
  | "sensing"
  | "artificial-noise"
  | "leakage"
  | "trajectory";

export type SemanticEntityType =
  | "uav"
  | "ue"
  | "eve"
  | "target"
  | "building"
  | "vehicle"
  | "pedestrian";

export type SemanticRole =
  | "environment"
  | "building"
  | "road"
  | "vegetation"
  | "entity"
  | "communication-link"
  | "annotation"
  | "legend";

export interface ThemeColors {
  /** Canvas background */
  background: string;

  /** Primary text (labels, callouts) */
  textPrimary: string;
  /** Secondary text (sub-labels, notes) */
  textSecondary: string;

  /** Scene environment fills */
  environmentPrimary: string;
  environmentSecondary: string;

  /** Semantic link colors */
  informationLink: string;
  sensingLink: string;
  artificialNoise: string;
  leakageLink: string;
  trajectory: string;

  /** Entity marker colors */
  target: string;
  scheduledEntity: string;
  eavesdropper: string;

  /** Building facade colors */
  buildingFront: string;
  buildingSide: string;
  buildingRoof: string;
  buildingWindow: string;

  /** Callout / annotation */
  calloutFill: string;
  calloutStroke: string;
  legendFill: string;
  legendStroke: string;
}

export interface ThemeStrokes {
  thin: number;
  normal: number;
  emphasis: number;
  linkThin: number;
  linkNormal: number;
  linkEmphasis: number;
}

export interface ThemeTypography {
  fontFamily: string;
  labelSize: number;
  calloutSize: number;
  legendSize: number;
  titleSize: number;
  axisLabelSize: number;
}

export interface ThemeGeometry {
  calloutRadius: number;
  legendCornerRadius: number;
  legendPadding: number;
  entityRadius: number;
}

/**
 * A complete academic figure theme.
 */
export interface AcademicFigureTheme {
  /** Theme identifier */
  name: string;
  /** Human-readable label */
  label: string;
  /** Semantic color palette */
  colors: ThemeColors;
  /** Stroke widths */
  strokes: ThemeStrokes;
  /** Typography settings */
  typography: ThemeTypography;
  /** Geometry defaults */
  geometry: ThemeGeometry;
}

/**
 * Resolve a color for a semantic link type.
 */
export function resolveLinkColor(
  theme: AcademicFigureTheme,
  type: SemanticLinkType,
): string {
  const map: Record<SemanticLinkType, string> = {
    information: theme.colors.informationLink,
    sensing: theme.colors.sensingLink,
    "artificial-noise": theme.colors.artificialNoise,
    leakage: theme.colors.leakageLink,
    trajectory: theme.colors.trajectory,
  };
  return map[type];
}

/**
 * Resolve a color for a semantic entity type.
 */
export function resolveEntityColor(
  theme: AcademicFigureTheme,
  type: SemanticEntityType,
): string {
  const map: Record<SemanticEntityType, string> = {
    uav: theme.colors.scheduledEntity,
    ue: theme.colors.scheduledEntity,
    eve: theme.colors.eavesdropper,
    target: theme.colors.target,
    building: theme.colors.buildingFront,
    vehicle: theme.colors.scheduledEntity,
    pedestrian: theme.colors.textPrimary,
  };
  return map[type];
}
