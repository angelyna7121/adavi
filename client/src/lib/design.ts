/**
 * adavi.ai Design System — single source of truth for all design tokens.
 * Import { DS } from "@/lib/design" in every page/component.
 */

export const DS = {
  /* ── Backgrounds ───────────────────────────────── */
  BG:      "#0D1929",   // page background (deep navy)
  CARD:    "#16233B",   // standard card surface
  CARD2:   "#1a2f4e",   // elevated / inner card surface
  DEEP:    "#0a1420",   // footer / deepest surface
  NAVY:    "#0D1929",   // alias for BG

  /* ── Brand Gold ────────────────────────────────── */
  GOLD:         "#C5A35A",               // primary accent
  GOLD_HOVER:   "#d4b06a",               // hover state
  GOLD_LIGHT:   "#e0c37a",               // active / pressed
  GOLD_BORDER:  "rgba(197,163,90,0.25)", // subtle gold border
  GOLD_BORDER2: "rgba(197,163,90,0.4)",  // stronger gold border (hover)
  GOLD_BG:      "rgba(197,163,90,0.08)", // gold tinted card fill
  GOLD_BG2:     "rgba(197,163,90,0.14)", // stronger gold fill (icon containers)
  GOLD_GLOW:    "rgba(197,163,90,0.12)", // hover glow shadow

  /* ── Silver / Text ─────────────────────────────── */
  WHITE:   "#FFFFFF",
  SILVER:  "rgba(255,255,255,0.80)",  // bright secondary text
  MUTED:   "rgba(255,255,255,0.55)",  // muted / helper text
  DIM:     "rgba(255,255,255,0.35)",  // dimmer metadata
  GHOST:   "rgba(255,255,255,0.18)",  // ghost element fills
  BORDER:  "rgba(255,255,255,0.08)",  // default card border
  BORDER2: "rgba(255,255,255,0.12)",  // slightly more visible border

  /* ── Status colours ────────────────────────────── */
  GREEN:  "#4ADE80",
  BLUE:   "#60A5FA",
  RED:    "#f87171",
  YELLOW: "#facc15",

  /* ── Typography ────────────────────────────────── */
  FONT: "Calibri, Arial, sans-serif",

  /* ── Gradients ─────────────────────────────────── */
  GRADIENT_GOLD: "linear-gradient(135deg, #b8952a 0%, #C5A35A 45%, #d4b06a 100%)",
  GRADIENT_NAVY: "linear-gradient(180deg, #0D1929 0%, #0a1420 100%)",
  GRADIENT_CARD: "linear-gradient(145deg, #16233B 0%, #1a2f4e 100%)",

  /* ── Shadows ───────────────────────────────────── */
  SHADOW_CARD: "0 4px 24px rgba(0,0,0,0.3), 0 1px 4px rgba(0,0,0,0.2)",
  SHADOW_GOLD: "0 0 24px rgba(197,163,90,0.15), 0 4px 16px rgba(0,0,0,0.25)",
  SHADOW_GOLD_SM: "0 0 12px rgba(197,163,90,0.1)",

  /* ── Spacing / Layout ──────────────────────────── */
  CONTAINER: "container mx-auto px-4 max-w-5xl",
  SECTION_PAD: "py-14 md:py-20",
} as const;

/** Convenience destructure for pages that need all tokens */
export const {
  BG, CARD, CARD2, DEEP, NAVY,
  GOLD, GOLD_HOVER, GOLD_BORDER, GOLD_BORDER2, GOLD_BG, GOLD_BG2, GOLD_GLOW,
  WHITE, SILVER, MUTED, DIM, GHOST, BORDER, BORDER2,
  GREEN, BLUE, RED, YELLOW,
  FONT,
  GRADIENT_GOLD, GRADIENT_NAVY,
  SHADOW_CARD, SHADOW_GOLD,
} = DS;

export default DS;
