/**
 * IEEE Academic Theme.
 *
 * Clean, professional palette optimized for IEEE conference/journal papers.
 * Blue-primary, high contrast, standard Arial/Helvetica typography.
 *
 * @module ieee-theme
 */

import type { AcademicFigureTheme } from "./theme-types.js";

export const ieeeTheme: AcademicFigureTheme = {
  name: "ieee",
  label: "IEEE Academic",

  colors: {
    background: "#FFFFFF",

    textPrimary: "#1C2533",
    textSecondary: "#596474",

    environmentPrimary: "#E7EBEF",
    environmentSecondary: "#D7DEE5",

    informationLink: "#2B6CB0",
    sensingLink: "#D97706",
    artificialNoise: "rgba(217,119,6,0.25)",
    leakageLink: "#C53030",
    trajectory: "#C53030",

    target: "#4F7D32",
    scheduledEntity: "#3182CE",
    eavesdropper: "#C53030",

    buildingFront: "#E8ECF1",
    buildingSide: "#D4D9E0",
    buildingRoof: "#C8CDD3",
    buildingWindow: "#AFCBE0",

    calloutFill: "#FFFFFF",
    calloutStroke: "#2B6CB0",
    legendFill: "#FAFBFC",
    legendStroke: "#C4CBD3",
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
    fontFamily: "Arial, Helvetica, sans-serif",
    labelSize: 18,
    calloutSize: 18,
    legendSize: 16,
    titleSize: 22,
    axisLabelSize: 14,
  },

  geometry: {
    calloutRadius: 10,
    legendCornerRadius: 6,
    legendPadding: 12,
    entityRadius: 10,
  },
};
