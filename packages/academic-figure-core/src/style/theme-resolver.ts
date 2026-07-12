/**
 * Theme resolver — load a theme by name.
 *
 * Built-in themes:
 *   "academic" — warm, muted, serif-friendly
 *   "ieee"     — clean blue-primary, sans-serif, high contrast
 *
 * @module theme-resolver
 */

import type { AcademicFigureTheme } from "./theme-types.js";
import { academicTheme } from "./academic-theme.js";
import { ieeeTheme } from "./ieee-theme.js";

const BUILT_IN: Record<string, AcademicFigureTheme> = {
  academic: academicTheme,
  ieee: ieeeTheme,
};

/** List available theme names. */
export function listThemes(): string[] {
  return Object.keys(BUILT_IN);
}

/** Get theme metadata for all built-in themes. */
export function describeThemes(): Array<{ name: string; label: string }> {
  return Object.values(BUILT_IN).map((t) => ({ name: t.name, label: t.label }));
}

/**
 * Resolve a theme by name. Falls back to "academic" if the name
 * is not recognized.
 */
export function resolveTheme(name?: string): AcademicFigureTheme {
  if (name && BUILT_IN[name]) {
    return BUILT_IN[name]!;
  }
  return academicTheme;
}
