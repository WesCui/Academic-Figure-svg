/**
 * Tests for the Academic Theme System.
 */
import { describe, it, expect } from "vitest";
import { resolveTheme, listThemes, describeThemes } from "../src/style/theme-resolver.js";
import { resolveLinkColor, resolveEntityColor } from "../src/style/theme-types.js";
import { academicTheme } from "../src/style/academic-theme.js";
import { ieeeTheme } from "../src/style/ieee-theme.js";

describe("Theme resolver", () => {
  it("lists available themes", () => {
    const themes = listThemes();
    expect(themes).toContain("academic");
    expect(themes).toContain("ieee");
    expect(themes).toHaveLength(2);
  });

  it("describes themes with name and label", () => {
    const desc = describeThemes();
    expect(desc).toHaveLength(2);
    expect(desc[0]!.name).toBeTruthy();
    expect(desc[0]!.label).toBeTruthy();
  });

  it("resolves academic theme by name", () => {
    const t = resolveTheme("academic");
    expect(t.name).toBe("academic");
    expect(t.typography.fontFamily).toContain("Georgia");
  });

  it("resolves ieee theme by name", () => {
    const t = resolveTheme("ieee");
    expect(t.name).toBe("ieee");
    expect(t.typography.fontFamily).toContain("Arial");
  });

  it("falls back to academic for unknown theme", () => {
    const t = resolveTheme("nonexistent");
    expect(t.name).toBe("academic");
  });

  it("falls back to academic when no name given", () => {
    const t = resolveTheme();
    expect(t.name).toBe("academic");
  });
});

describe("Theme structure", () => {
  it("academic theme has all required fields", () => {
    expect(academicTheme.colors.background).toBeTruthy();
    expect(academicTheme.colors.informationLink).toBeTruthy();
    expect(academicTheme.colors.sensingLink).toBeTruthy();
    expect(academicTheme.colors.leakageLink).toBeTruthy();
    expect(academicTheme.strokes.normal).toBeGreaterThan(0);
    expect(academicTheme.typography.fontFamily).toBeTruthy();
    expect(academicTheme.geometry.calloutRadius).toBeGreaterThan(0);
  });

  it("ieee theme has all required fields", () => {
    expect(ieeeTheme.colors.background).toBe("#FFFFFF");
    expect(ieeeTheme.colors.informationLink).toBe("#2B6CB0");
    expect(ieeeTheme.colors.sensingLink).toBe("#D97706");
    expect(ieeeTheme.colors.leakageLink).toBe("#C53030");
    expect(ieeeTheme.strokes.emphasis).toBeGreaterThan(ieeeTheme.strokes.thin);
    expect(ieeeTheme.geometry.legendCornerRadius).toBeGreaterThan(0);
  });

  it("themes have different visual identities", () => {
    expect(academicTheme.typography.fontFamily).not.toBe(ieeeTheme.typography.fontFamily);
    expect(academicTheme.colors.background).not.toBe(ieeeTheme.colors.background);
  });
});

describe("Semantic link color resolution", () => {
  it("resolves information link color", () => {
    expect(resolveLinkColor(ieeeTheme, "information")).toBe("#2B6CB0");
  });

  it("resolves sensing link color", () => {
    expect(resolveLinkColor(ieeeTheme, "sensing")).toBe("#D97706");
  });

  it("resolves artificial-noise color", () => {
    const c = resolveLinkColor(ieeeTheme, "artificial-noise");
    expect(c).toContain("rgba"); // semi-transparent
  });

  it("resolves leakage link color", () => {
    expect(resolveLinkColor(ieeeTheme, "leakage")).toBe("#C53030");
  });

  it("resolves trajectory color", () => {
    expect(resolveLinkColor(ieeeTheme, "trajectory")).toBe("#C53030");
  });

  it("all 5 semantic link types resolve to valid colors", () => {
    const types = ["information", "sensing", "artificial-noise", "leakage", "trajectory"] as const;
    for (const t of types) {
      expect(resolveLinkColor(academicTheme, t)).toBeTruthy();
    }
  });
});

describe("Semantic entity color resolution", () => {
  it("resolves UAV color as scheduled entity", () => {
    expect(resolveEntityColor(ieeeTheme, "uav")).toBe("#3182CE");
  });

  it("resolves UE color as scheduled entity", () => {
    expect(resolveEntityColor(ieeeTheme, "ue")).toBe("#3182CE");
  });

  it("resolves Eve color as eavesdropper", () => {
    expect(resolveEntityColor(ieeeTheme, "eve")).toBe("#C53030");
  });

  it("resolves target color", () => {
    expect(resolveEntityColor(ieeeTheme, "target")).toBe("#4F7D32");
  });

  it("resolves building color", () => {
    const c = resolveEntityColor(academicTheme, "building");
    expect(c).toBeTruthy();
  });
});
