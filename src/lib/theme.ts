import { useEffect } from "react";
import type { ThemePref } from "@/store";

export interface AccentPreset {
  id: string;
  name: string;
  hex: string;
}

/** Curated Windows 11-style accent swatches. */
export const ACCENT_PRESETS: AccentPreset[] = [
  { id: "violet", name: "Violet", hex: "#7C5CFC" },
  { id: "blue", name: "Blue", hex: "#0078D4" },
  { id: "indigo", name: "Indigo", hex: "#5B5BD6" },
  { id: "teal", name: "Teal", hex: "#008272" },
  { id: "green", name: "Green", hex: "#107C10" },
  { id: "red", name: "Red", hex: "#C42B1C" },
  { id: "pink", name: "Pink", hex: "#C2185B" },
];

/** Default accent used on first run (matches the existing brand violet). */
export const DEFAULT_ACCENT = "#7C5CFC";

function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace("#", "").trim();
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16);
  if (Number.isNaN(n)) return [124, 92, 252];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  const c = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

function mix(hex: string, target: string, weight: number): string {
  const a = hexToRgb(hex);
  const b = hexToRgb(target);
  return rgbToHex(
    a[0] * (1 - weight) + b[0] * weight,
    a[1] * (1 - weight) + b[1] * weight,
    a[2] * (1 - weight) + b[2] * weight,
  );
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Pick a readable foreground (near-black or white) for a given accent. */
export function foregroundFor(hex: string): string {
  return relativeLuminance(hex) > 0.45 ? "#0b0b0f" : "#ffffff";
}

/**
 * Applies the accent color as CSS custom properties on the document root so
 * existing components that reference accent-tinted tokens (--primary, --ring,
 * --accent, etc.) pick it up automatically in both light and dark mode.
 */
export function applyAccent(root: HTMLElement, hex: string, isDark: boolean) {
  const fg = foregroundFor(hex);
  root.style.setProperty("--primary", hex);
  root.style.setProperty("--primary-foreground", fg);
  root.style.setProperty("--ring", hex);
  root.style.setProperty("--accent-foreground", fg);

  const tintTarget = isDark ? "#15151a" : "#ffffff";
  root.style.setProperty("--accent", mix(hex, tintTarget, isDark ? 0.8 : 0.86));
  root.style.setProperty("--accent-hover", mix(hex, tintTarget, isDark ? 0.7 : 0.8));
  root.style.setProperty("--accent-muted", mix(hex, tintTarget, isDark ? 0.9 : 0.92));
  root.style.setProperty("--sidebar-accent", mix(hex, tintTarget, isDark ? 0.82 : 0.88));
  root.style.setProperty("--sidebar-accent-foreground", fg);
}

function resolveDark(pref: ThemePref): boolean {
  if (pref === "dark") return true;
  if (pref === "light") return false;
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/**
 * Applies the active theme (dark/light/system) and the chosen accent color.
 * Runs from App load so the accent is correct from first paint.
 */
export function useApplyTheme(pref: ThemePref, accentColor: string) {
  useEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      const isDark = resolveDark(pref);
      root.classList.toggle("dark", isDark);
      applyAccent(root, accentColor, isDark);
    };
    apply();

    if (pref === "system" && typeof window !== "undefined") {
      const mql = window.matchMedia("(prefers-color-scheme: dark)");
      mql.addEventListener("change", apply);
      return () => mql.removeEventListener("change", apply);
    }
  }, [pref, accentColor]);
}
