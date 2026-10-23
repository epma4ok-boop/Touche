import { useState } from "react";
import type { CSSProperties } from "react";
import type { Lang } from "@/data/i18n";
import WheelScreen from "./LotteryScreen";
import DiceScreen from "./DiceScreen";
import useTelegramTopInset from "./useTelegramTopInset";
import "./GamesScreen.css";

type Game = "wheel" | "dice";
type Props = { lang: Lang; onBack: () => void };

const COPY: Record<Lang, {
  title: string; subtitle: string; wheel: string; wheelNote: string; dice: string; diceNote: string;
  back: string; number: string;
}> = {
  ru: { title: "Игры", subtitle: "Выберите, с чего начнётся ваш вечер.", wheel: "Колесо", wheelNote: "Двадцать вариантов — один выбор", dice: "Кости", diceNote: "Бросьте две кости одновременно", back: "Назад", number: "Игра" },
  en: { title: "Games", subtitle: "Choose how your evening begins.", wheel: "Wheel", wheelNote: "Twenty possibilities, one choice", dice: "Dice", diceNote: "Roll two dice at once", back: "Back", number: "Game" },
  hi: { title: "खेल", subtitle: "चुनें, आपकी शाम कैसे शुरू होगी।", wheel: "व्हील", wheelNote: "बीस विकल्प, एक चुनाव", dice: "पासे", diceNote: "दो पासे एक साथ फेंकें", back: "वापस", number: "खेल" },
  pt: { title: "Jogos", subtitle: "Escolham como a noite vai começar.", wheel: "Roleta", wheelNote: "Vinte possibilidades, uma escolha", dice: "Dados", diceNote: "Jogue dois dados de uma vez", back: "Voltar", number: "Jogo" },
  es: { title: "Juegos", subtitle: "Elijan cómo empieza su noche.", wheel: "Ruleta", wheelNote: "Veinte posibilidades, una elección", dice: "Dados", diceNote: "Lancen dos dados a la vez", back: "Volver", number: "Juego" },
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

export default function GamesScreen({ lang, onBack }: Props) {
  const [game, setGame] = useState<Game | null>(null);
  const top = useTelegramTopInset();
  const copy = COPY[lang];
  if (game === "wheel") return <WheelScreen lang={lang} onBack={() => setGame(null)} />;
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
            <span className="touche-games__choice-copy"><strong>{copy.wheel}</strong><small>{copy.wheelNote}</small></span>
            <span className="touche-games__arrow" aria-hidden="true">↗</span>
          </button>
          <button type="button" className="touche-games__choice touche-games__choice--dice" onClick={() => setGame("dice")} data-testid="button-game-dice">
            <span className="touche-games__choice-index">02 <small>{copy.number}</small></span>
            <span className="touche-games__art-wrap"><CubeMark /></span>
            <span className="touche-games__choice-copy"><strong>{copy.dice}</strong><small>{copy.diceNote}</small></span>
            <span className="touche-games__arrow" aria-hidden="true">↗</span>
          </button>
        </section>
        <p className="touche-games__footnote"><span /> {lang === "ru" ? "Только для вас двоих" : lang === "hi" ? "सिर्फ़ आप दोनों के लिए" : lang === "pt" ? "Só para vocês dois" : lang === "es" ? "Solo para ustedes dos" : "Just for the two of you"}</p>
      </div>
    </main>
  );
}
