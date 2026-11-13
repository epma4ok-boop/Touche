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

const LOCALIZED_TITLES: Record<string, Partial<Record<Lang, string>>> = {
  wall: { en: "Wall", hi: "दीवार", pt: "Parede", es: "Muro" },
  mirror: { en: "Mirror", hi: "आईना", pt: "Espelho", es: "Espejo" },
  judge: { en: "Judge", hi: "न्यायाधीश", pt: "Juiz", es: "Juez" },
  clown: { en: "Clown", hi: "मसखरा", pt: "Palhaço", es: "Bufón" },
  shield: { en: "Shield", hi: "ढाल", pt: "Escudo", es: "Escudo" },
  porcelain: { en: "Porcelain", hi: "चीनी-मिट्टी", pt: "Porcelana", es: "Porcelana" },
  crack: { en: "Crack", hi: "दरार", pt: "Rachadura", es: "Grieta" },
  timer: { en: "Clock", hi: "घड़ी", pt: "Relógio", es: "Reloj" },
  roots: { en: "Roots", hi: "जड़ें", pt: "Raízes", es: "Raíces" },
  third: { en: "The Third", hi: "तीसरा", pt: "O terceiro", es: "El tercero" },
  mask: { en: "Mask", hi: "मुखौटा", pt: "Máscara", es: "Máscara" },
  ash: { en: "Ash", hi: "राख", pt: "Cinzas", es: "Cenizas" },
  hunger: { en: "Hunger", hi: "भूख", pt: "Fome", es: "Hambre" },
  jealousy: { en: "Jealousy", hi: "ईर्ष्या", pt: "Ciúme", es: "Celos" },
  fog: { en: "Fog", hi: "धुंध", pt: "Névoa", es: "Niebla" },
  boredom: { en: "Boredom", hi: "ऊब", pt: "Tédio", es: "Aburrimiento" },
  laugh: { en: "Laughter", hi: "हँसी", pt: "Riso", es: "Risa" },
  home: { en: "Home", hi: "घर", pt: "Lar", es: "Hogar" },
  adventure: { en: "Adventure", hi: "साहसिक सफ़र", pt: "Aventura", es: "Aventura" },
  forgiveness: { en: "Forgiveness", hi: "क्षमा", pt: "Perdão", es: "Perdón" },
  faith: { en: "Faith", hi: "विश्वास", pt: "Confiança", es: "Confianza" },
  hope: { en: "Hope", hi: "आशा", pt: "Esperança", es: "Esperanza" },
  love: { en: "Love", hi: "प्रेम", pt: "Amor", es: "Amor" },
};

/** Return the card name in the selected language, with Russian as the source. */
export function getTarotCardTitle(card: TarotCard, lang: Lang): string {
  return LOCALIZED_TITLES[card.id]?.[lang] ?? card.title;
}

/** Localize authored meanings; Russian remains the source-language fallback. */
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
