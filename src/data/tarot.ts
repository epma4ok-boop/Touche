import catalogue from "./tarot-cards.json";
import localizedText from "./tarot-translations.json";
import type { Lang } from "./i18n";

export type TarotLayer = "see" | "feel" | "want";
export type TarotCard = {
  id: string;
  title: string;
  text: Record<TarotLayer, string>;
  images: string[];
};
export type TarotDraw = { cardId: string; image: string };
export const TAROT_CARDS: readonly TarotCard[] = catalogue;
type LocalizedTarotLayers = Record<TarotLayer, string>;
const LOCALIZED_TEXT = localizedText as Partial<Record<string, Partial<Record<Lang, LocalizedTarotLayers>>>>;

/** Preserve the original Russian card names; localize only the authored meanings. */
export function getTarotText(card: TarotCard, layer: TarotLayer, lang: Lang): string {
  return LOCALIZED_TEXT[card.id]?.[lang]?.[layer] ?? card.text[layer];
}

export const TAROT_POSITIONS = [
  { layer: "see", title: "Что видите", subtitle: "Но не говорите" },
  { layer: "feel", title: "Что чувствуете", subtitle: "Но не показываете" },
  { layer: "want", title: "Что хотите", subtitle: "Но не просите" },
] as const;

/** Use the same selection for the entire reading, including image variants. */
export function drawTarotSpread(random: () => number = Math.random): TarotDraw[] {
  const deck = [...TAROT_CARDS];
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck.slice(0, 3).map(card => ({
    cardId: card.id,
    image: card.images[Math.floor(random() * card.images.length)],
  }));
}

export function getTarotCard(draw: TarotDraw): TarotCard {
  const card = TAROT_CARDS.find(item => item.id === draw.cardId);
  if (!card || !card.images.includes(draw.image)) {
    throw new Error("Invalid Tarot card selection");
  }
  return card;
}

/** Respect Vite's base path and preserve exact case-sensitive source filenames. */
export function tarotImageUrl(image: string): string {
  return `${import.meta.env.BASE_URL}images/tarot/${encodeURIComponent(image)}`;
}

export function isTarotSpread(value: unknown): value is TarotDraw[] {
  if (!Array.isArray(value) || value.length !== 3) return false;
  const ids = new Set<string>();
  for (const entry of value) {
    if (!entry || typeof entry !== "object") return false;
    const card = TAROT_CARDS.find(item => item.id === entry.cardId);
    if (!card || !card.images.includes(entry.image) || ids.has(card.id)) return false;
    ids.add(card.id);
  }
  return true;
}
