/**
 * Default Academic Theme.
 *
 * A versatile, warm-toned palette suitable for general academic
 * publications. Uses muted, professional colors with serif-friendly
 * typography.
 *
 * @module academic-theme
 */

import type { AcademicFigureTheme } from "./theme-types.js";

export const academicTheme: AcademicFigureTheme = {
  name: "academic",
  label: "Academic (Default)",

  colors: {
    background: "#FAFBFC",

    textPrimary: "#222831",
    textSecondary: "#6B7280",

    environmentPrimary: "#EEF2F5",
    environmentSecondary: "#E1E6EB",

    informationLink: "#2563EB",
    sensingLink: "#EA580C",
    artificialNoise: "rgba(234,88,12,0.2)",
    leakageLink: "#DC2626",
    trajectory: "#DC2626",

    target: "#16A34A",
    scheduledEntity: "#3B82F6",
    eavesdropper: "#DC2626",

    buildingFront: "#ECEDF0",
    buildingSide: "#DEE0E4",
    buildingRoof: "#CFD2D8",
    buildingWindow: "#B4C8E0",

    calloutFill: "#FFFFFF",
    calloutStroke: "#374151",
    legendFill: "#F9FAFB",
    legendStroke: "#D1D5DB",
  },

  strokes: {
    thin: 1,
    normal: 1.5,
    emphasis: 2.5,
    linkThin: 1.5,
    linkNormal: 2,
    linkEmphasis: 3,
  },

  typography: {
    fontFamily: "Georgia, 'Times New Roman', serif",
    labelSize: 18,
    calloutSize: 18,
    legendSize: 16,
    titleSize: 24,
    axisLabelSize: 14,
  },

  geometry: {
    calloutRadius: 10,
    legendCornerRadius: 8,
    legendPadding: 14,
    entityRadius: 10,
  },
};
