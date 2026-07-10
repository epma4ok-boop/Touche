/**
 * Shared, minimal color system for the whole app.
 * One muted garnet brand accent instead of scattered bright pinks/magentas —
 * every screen (Home, categories, scenarios, the intimacy card) draws from
 * this file so nothing reads as a separate, disconnected design.
 */

// App-wide "resting" accent — muted modern garnet (was a brighter neon pink).
export const BRAND = { r: 188, g: 46, b: 74 };

// Shared dark surface used by every card/panel across the app.
export const SURFACE = "rgba(16,7,12,0.97)";
export const SURFACE_PRESSED_ALPHA = 0.09;

/**
 * Smoke-background color grading per category/mood, applied as a CSS
 * filter on top of the single ruby+gold smoke asset — cheaper than
 * generating a new image per category, and keeps the same silky texture
 * everywhere while shifting its temperature.
 *   hue        — degrees to rotate the base ruby/gold hue
 *   saturate   — 1 = unchanged
 *   brightness — 1 = unchanged
 */
export type SmokeTint = { hue: number; saturate: number; brightness: number };

export const SMOKE_DEFAULT: SmokeTint = { hue: 0, saturate: 1, brightness: 1 };

export const SMOKE_BY_CATEGORY: Record<string, SmokeTint> = {
  compliments: { hue: 26, saturate: 1.05, brightness: 1.08 }, // warm gold
  tenderness:  { hue: 48, saturate: 0.82, brightness: 1.16 }, // soft pale yellow
  desire:      { hue: 16, saturate: 1.18, brightness: 1.02 }, // warmer amber-orange
  passion:     { hue: -4, saturate: 1.45, brightness: 1.18 }, // bright vivid red
  hard:        { hue: -10, saturate: 1.15, brightness: 0.66 }, // deep, dark red
};
