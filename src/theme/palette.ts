/**
 * Shared, minimal color system for the whole app.
 * One muted garnet brand accent instead of scattered bright pinks/magentas —
 * every screen (Home, categories, scenarios, the intimacy card) draws from
 * this file so nothing reads as a separate, disconnected design.
 */

// Muted violet identity shared throughout the app.
export const BRAND = { r: 128, g: 100, b: 162 };
export const CHAMPAGNE = { r: 215, g: 201, b: 236 };
export const IVORY = { r: 248, g: 245, b: 252 };

// Shared pale-violet surface used by cards and panels across the app.
export const SURFACE = "rgba(248,245,252,0.97)";
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
  compliments: { hue: 250, saturate: 0.72, brightness: 1.12 },
  tenderness:  { hue: 262, saturate: 0.58, brightness: 1.2 },
  desire:      { hue: 274, saturate: 0.78, brightness: 1.04 },
  passion:     { hue: 282, saturate: 0.92, brightness: 0.98 },
  hard:        { hue: 276, saturate: 0.62, brightness: 0.72 },
};
