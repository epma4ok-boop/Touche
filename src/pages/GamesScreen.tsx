import { useState } from "react";
import type { CSSProperties } from "react";
import type { Lang } from "@/data/i18n";
import WheelScreen from "./LotteryScreen";
import DiceScreen from "./DiceScreen";
import StripGameScreen from "./StripGameScreen";
import useTelegramTopInset from "./useTelegramTopInset";
import "./GamesScreen.css";

type Game = "wheel" | "dice" | "strip";
type Props = { lang: Lang; onBack: () => void };

const COPY: Record<Lang, {
  title: string; subtitle: string;
  wheel: string; wheelNote: string; wheelMood: string;
  dice: string; diceNote: string; diceMood: string;
  back: string;
  strip: string; stripNote: string; stripMood: string;
}> = {
  ru: {
    title: "Игры", subtitle: "Выберите, с чего начнётся ваш вечер.",
    wheel: "Шар ответов", wheelNote: "Встряхни — получи одну из 20 поз", wheelMood: "СЛУЧАЙ",
    dice: "Кубики действий", diceNote: "Два броска — новый повод сблизиться", diceMood: "ИМПУЛЬС",
     back: "Назад",
    strip: "Стрип или действие", stripNote: "Пять уровней. Только ваш выбор.", stripMood: "ИГРА 18+",
  },
  en: {
    title: "Games", subtitle: "Choose how your evening begins.",
    wheel: "Pose ball", wheelNote: "Shake to reveal one of 20 poses", wheelMood: "CHANCE",
    dice: "Action dice", diceNote: "Two rolls to bring you closer", diceMood: "SPONTANEITY",
     back: "Back",
    strip: "Strip or dare", stripNote: "Five levels. Your next move.", stripMood: "GAME 18+",
  },
  hi: {
    title: "खेल", subtitle: "चुनें, आपकी शाम कैसे शुरू होगी।",
    wheel: "पोज़ बॉल", wheelNote: "हिलाएँ और 20 पोज़ में से एक देखें", wheelMood: "क़िस्मत",
    dice: "क्रिया के पासे", diceNote: "दो दाँव, और भी क़रीब आने का नया बहाना", diceMood: "रोमांच",
     back: "वापस",
    strip: "स्ट्रिप या डेयर", stripNote: "पाँच स्तर। अगला कदम आपका।", stripMood: "18+ खेल",
  },
  pt: {
    title: "Jogos", subtitle: "Escolham como a noite vai começar.",
    wheel: "Bola das poses", wheelNote: "Agite e revele uma das 20 poses", wheelMood: "SURPRESA",
    dice: "Dados de ação", diceNote: "Dois lançamentos para aproximar vocês", diceMood: "SURPRESA",
     back: "Voltar",
    strip: "Tire ou ouse", stripNote: "Cinco níveis. A próxima escolha é sua.", stripMood: "JOGO 18+",
  },
  es: {
    title: "Juegos", subtitle: "Elijan cómo empieza su noche.",
    wheel: "Bola de poses", wheelNote: "Agítala y descubre una de las 20 poses", wheelMood: "AZAR",
    dice: "Dados de acción", diceNote: "Dos lanzamientos para acercarse", diceMood: "SORPRESA",
     back: "Volver",
    strip: "Quítate o atrévete", stripNote: "Cinco niveles. Tú eliges el siguiente paso.", stripMood: "JUEGO 18+",
  },
};

export default function GamesScreen({ lang, onBack }: Props) {
  const [game, setGame] = useState<Game | null>(null);
  const top = useTelegramTopInset();
  const copy = COPY[lang];
  if (game === "wheel") return <WheelScreen lang={lang} onBack={() => setGame(null)} />;
  if (game === "dice") return <DiceScreen lang={lang} onBack={() => setGame(null)} />;
  if (game === "strip") return <StripGameScreen lang={lang} onBack={() => setGame(null)} />;

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
          <button type="button" className="touche-games__choice touche-games__choice--pose-ball" onClick={() => setGame("wheel")} data-testid="button-game-wheel">
            <span className="touche-games__art-wrap"><img className="touche-games__art-image touche-games__art-image--pose-ball" src="/images/lottery-poses/pose-ball.png" alt="" aria-hidden="true" /></span>
            <span className="touche-games__choice-copy"><small className="touche-games__choice-mood">{copy.wheelMood}</small><strong>{copy.wheel}</strong><small>{copy.wheelNote}</small></span>
          </button>
          <button type="button" className="touche-games__choice touche-games__choice--dice" onClick={() => setGame("dice")} data-testid="button-game-dice">
            <span className="touche-games__art-wrap"><img className="touche-games__art-image touche-games__art-image--dice" src="/images/game-cards/action-dice.jpg" alt="" aria-hidden="true" /></span>
            <span className="touche-games__choice-copy"><small className="touche-games__choice-mood">{copy.diceMood}</small><strong>{copy.dice}</strong><small>{copy.diceNote}</small></span>
          </button>
          <button type="button" className="touche-games__choice touche-games__choice--strip" onClick={() => setGame("strip")} data-testid="button-game-strip">
            <span className="touche-games__art-wrap"><img className="touche-games__art-image touche-games__art-image--strip" src="/images/game-cards/strip-or-action.jpg" alt="" aria-hidden="true" /></span>
            <span className="touche-games__choice-copy"><small className="touche-games__choice-mood">{copy.stripMood}</small><strong>{copy.strip}</strong><small>{copy.stripNote}</small></span>
          </button>
        </section>
        <p className="touche-games__footnote"><span /> {lang === "ru" ? "Только для вас двоих" : lang === "hi" ? "सिर्फ़ आप दोनों के लिए" : lang === "pt" ? "Só para vocês dois" : lang === "es" ? "Solo para ustedes dos" : "Just for the two of you"}</p>
      </div>
    </main>
  );
}
