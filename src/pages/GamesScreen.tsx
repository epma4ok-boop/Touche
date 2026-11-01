import { useState } from "react";
import type { CSSProperties } from "react";
import type { Lang } from "@/data/i18n";
import WheelScreen from "./LotteryScreen";
import DiceScreen from "./DiceScreen";
import TarotScreen from "./TarotScreen";
import useTelegramTopInset from "./useTelegramTopInset";
import "./GamesScreen.css";

type Game = "wheel" | "dice" | "tarot";
type Props = { lang: Lang; onBack: () => void };

const COPY: Record<Lang, {
  title: string; subtitle: string;
  wheel: string; wheelNote: string; wheelMood: string;
  dice: string; diceNote: string; diceMood: string;
  back: string; number: string;
  tarot: string; tarotNote: string; tarotMood: string;
}> = {
  ru: {
    title: "Игры", subtitle: "Выберите, с чего начнётся ваш вечер.",
    wheel: "Колесо поз", wheelNote: "Двадцать вариантов — один выбор", wheelMood: "ДВИЖЕНИЕ",
    dice: "Кубики действий", diceNote: "Два броска — новый повод сблизиться", diceMood: "ИМПУЛЬС",
    back: "Назад", number: "Игра",
    tarot: "Таро для двоих", tarotNote: "Три карты. Один честный разговор.", tarotMood: "БЛИЗОСТЬ",
  },
  en: {
    title: "Games", subtitle: "Choose how your evening begins.",
    wheel: "Wheel of poses", wheelNote: "Twenty possibilities, one shared choice", wheelMood: "MOVEMENT",
    dice: "Action dice", diceNote: "Two rolls to bring you closer", diceMood: "SPONTANEITY",
    back: "Back", number: "Game",
    tarot: "Tarot for two", tarotNote: "Three cards. One honest conversation.", tarotMood: "CONNECTION",
  },
  hi: {
    title: "खेल", subtitle: "चुनें, आपकी शाम कैसे शुरू होगी।",
    wheel: "पोज़ का पहिया", wheelNote: "बीस विकल्प, एक साझा चुनाव", wheelMood: "क़रीबी",
    dice: "क्रिया के पासे", diceNote: "दो दाँव, और भी क़रीब आने का नया बहाना", diceMood: "रोमांच",
    back: "वापस", number: "खेल",
    tarot: "दो के लिए टैरो", tarotNote: "तीन कार्ड। एक सच्ची बातचीत।", tarotMood: "जुड़ाव",
  },
  pt: {
    title: "Jogos", subtitle: "Escolham como a noite vai começar.",
    wheel: "Roleta das poses", wheelNote: "Vinte opções, uma escolha a dois", wheelMood: "MOVIMENTO",
    dice: "Dados de ação", diceNote: "Dois lançamentos para aproximar vocês", diceMood: "SURPRESA",
    back: "Voltar", number: "Jogo",
    tarot: "Tarô para dois", tarotNote: "Três cartas. Uma conversa sincera.", tarotMood: "CONEXÃO",
  },
  es: {
    title: "Juegos", subtitle: "Elijan cómo empieza su noche.",
    wheel: "Ruleta de posturas", wheelNote: "Veinte opciones, una elección compartida", wheelMood: "MOVIMIENTO",
    dice: "Dados de acción", diceNote: "Dos lanzamientos para acercarse", diceMood: "SORPRESA",
    back: "Volver", number: "Juego",
    tarot: "Tarot para dos", tarotNote: "Tres cartas. Una conversación sincera.", tarotMood: "CONEXIÓN",
  },
};

function WheelMark() {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" className="touche-games__wheel-mark">
      <circle cx="50" cy="50" r="43" />
      {Array.from({ length: 8 }, (_, index) => <path key={index} d="M50 50 C55 34 65 17 50 7 C35 17 45 34 50 50Z" transform={`rotate(${index * 45} 50 50)`} />)}
      <circle className="touche-games__wheel-center" cx="50" cy="50" r="9" />
    </svg>
  );
}

function CubeMark() {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" className="touche-games__cube-mark">
      <path d="m50 8 36 20v43L50 92 14 71V28L50 8Z" />
      <path d="m14 28 36 21 36-21M50 49v43" />
      <circle cx="50" cy="28" r="3" /><circle cx="38" cy="57" r="3" /><circle cx="62" cy="69" r="3" />
    </svg>
  );
}

function TarotMark() {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" className="touche-games__tarot-mark">
      <rect x="20" y="16" width="38" height="62" rx="5" transform="rotate(-12 39 47)" />
      <rect x="42" y="22" width="38" height="62" rx="5" transform="rotate(10 61 53)" />
      <circle cx="61" cy="53" r="9" />
    </svg>
  );
}

export default function GamesScreen({ lang, onBack }: Props) {
  const [game, setGame] = useState<Game | null>(null);
  const top = useTelegramTopInset();
  const copy = COPY[lang];
  if (game === "wheel") return <WheelScreen lang={lang} onBack={() => setGame(null)} />;
  if (game === "tarot") return <TarotScreen lang={lang} onBack={() => setGame(null)} />;
  if (game === "dice") return <DiceScreen lang={lang} onBack={() => setGame(null)} />;

  return (
    <main className="touche-games" style={{ "--games-top": `${top}px` } as CSSProperties}>
      <header className="touche-games__header">
        <button type="button" className="touche-games__back" onClick={onBack} aria-label={copy.back} data-testid="button-games-back">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 18 9 12l6-6" /></svg>
        </button>
        <span className="touche-games__brand">Touch<em>é</em></span>
        <span className="touche-games__header-space" />
      </header>
      <div className="touche-games__body">
        <div className="touche-games__intro">
          <span className="touche-games__eyebrow">18+ <i /> TOUCHÉ</span>
          <h1>{copy.title}</h1>
          <p>{copy.subtitle}</p>
        </div>
        <section className="touche-games__choices" aria-label={copy.title}>
          <button type="button" className="touche-games__choice touche-games__choice--wheel" onClick={() => setGame("wheel")} data-testid="button-game-wheel">
            <span className="touche-games__choice-index">01 <small>{copy.number}</small></span>
            <span className="touche-games__art-wrap"><WheelMark /></span>
            <span className="touche-games__choice-copy"><small className="touche-games__choice-mood">{copy.wheelMood}</small><strong>{copy.wheel}</strong><small>{copy.wheelNote}</small></span>
            <span className="touche-games__arrow" aria-hidden="true">↗</span>
          </button>
          <button type="button" className="touche-games__choice touche-games__choice--dice" onClick={() => setGame("dice")} data-testid="button-game-dice">
            <span className="touche-games__choice-index">02 <small>{copy.number}</small></span>
            <span className="touche-games__art-wrap"><CubeMark /></span>
            <span className="touche-games__choice-copy"><small className="touche-games__choice-mood">{copy.diceMood}</small><strong>{copy.dice}</strong><small>{copy.diceNote}</small></span>
            <span className="touche-games__arrow" aria-hidden="true">↗</span>
          </button>
          <button type="button" className="touche-games__choice touche-games__choice--tarot" onClick={() => setGame("tarot")} data-testid="button-game-tarot">
            <span className="touche-games__choice-index">03 <small>{copy.number}</small></span>
            <span className="touche-games__art-wrap"><TarotMark /></span>
            <span className="touche-games__choice-copy"><small className="touche-games__choice-mood">{copy.tarotMood}</small><strong>{copy.tarot}</strong><small>{copy.tarotNote}</small></span>
            <span className="touche-games__arrow" aria-hidden="true">↗</span>
          </button>
        </section>
        <p className="touche-games__footnote"><span /> {lang === "ru" ? "Только для вас двоих" : lang === "hi" ? "सिर्फ़ आप दोनों के लिए" : lang === "pt" ? "Só para vocês dois" : lang === "es" ? "Solo para ustedes dos" : "Just for the two of you"}</p>
      </div>
    </main>
  );
}
