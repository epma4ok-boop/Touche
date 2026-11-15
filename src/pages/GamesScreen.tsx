import { useState } from "react";
import type { CSSProperties } from "react";
import type { Lang } from "@/data/i18n";
import PoseBallScreen from "./PoseBallScreen";
import DiceScreen from "./DiceScreen";
import StripGameScreen from "./StripGameScreen";
import useTelegramTopInset from "./useTelegramTopInset";
import "./GamesScreen.css";

type Game = "wheel" | "dice" | "strip";
type Props = { lang: Lang; onBack: () => void; onUpgrade: () => void | Promise<boolean> };

const COPY: Record<Lang, {
  title: string;
  wheel: string; wheelNote: string;
  dice: string; diceNote: string;
  back: string;
  strip: string; stripNote: string;
  trialNote: string;
}> = {
  ru: {
    title: "Игры",
    wheel: "Шар ответов", wheelNote: "Встряхни — получи одну из 20 поз",
    dice: "Кубики действий", diceNote: "Два броска — новый повод сблизиться",
     back: "Назад",
    strip: "Стрип или действие", stripNote: "Пять уровней. Только ваш выбор.",
    trialNote: "Бесплатно — по 1 игре каждого типа в день · Premium без ограничений",
  },
  en: {
    title: "Games",
    wheel: "Pose ball", wheelNote: "Shake to reveal one of 20 poses",
    dice: "Action dice", diceNote: "Two rolls to bring you closer",
     back: "Back",
    strip: "Strip or dare", stripNote: "Five levels. Your next move.",
    trialNote: "Free: 1 game of each type daily · unlimited with Premium",
  },
  hi: {
    title: "खेल",
    wheel: "पोज़ बॉल", wheelNote: "हिलाएँ और 20 पोज़ में से एक देखें",
    dice: "क्रिया के पासे", diceNote: "दो दाँव, और भी क़रीब आने का नया बहाना",
     back: "वापस",
    strip: "स्ट्रिप या डेयर", stripNote: "पाँच स्तर। अगला कदम आपका।",
    trialNote: "मुफ़्त: हर खेल रोज़ 1 बार · Premium में असीमित",
  },
  pt: {
    title: "Jogos",
    wheel: "Bola das poses", wheelNote: "Agitem e revelem uma das 20 poses",
    dice: "Dados de ação", diceNote: "Dois lançamentos para aproximar vocês",
     back: "Voltar",
    strip: "Tire ou ouse", stripNote: "Cinco níveis. A próxima escolha é sua.",
    trialNote: "Grátis: 1 partida de cada tipo por dia · ilimitado no Premium",
  },
  es: {
    title: "Juegos",
    wheel: "Bola de poses", wheelNote: "Agítala y descubre una de las 20 poses",
    dice: "Dados de acción", diceNote: "Dos lanzamientos para acercarse",
     back: "Volver",
    strip: "Quítate o atrévete", stripNote: "Cinco niveles. Tú eliges el siguiente paso.",
    trialNote: "Gratis: 1 partida de cada tipo al día · ilimitado con Premium",
  },
};

export default function GamesScreen({ lang, onBack, onUpgrade }: Props) {
  const [game, setGame] = useState<Game | null>(null);
  const top = useTelegramTopInset();
  const copy = COPY[lang];
  if (game === "wheel") return <PoseBallScreen lang={lang} onBack={() => setGame(null)} onUpgrade={onUpgrade} />;
  if (game === "dice") return <DiceScreen lang={lang} onBack={() => setGame(null)} onUpgrade={onUpgrade} />;
  if (game === "strip") return <StripGameScreen lang={lang} onBack={() => setGame(null)} onUpgrade={onUpgrade} />;

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
          <h1>{copy.title}</h1>
        </div>
        <section className="touche-games__choices" aria-label={copy.title}>
          <button type="button" className="touche-games__choice touche-games__choice--pose-ball" onClick={() => setGame("wheel")} data-testid="button-game-wheel">
            <span className="touche-games__art-wrap"><img className="touche-games__art-image touche-games__art-image--pose-ball" src="/images/game-cards/pose-ball-button.jpg" alt="" aria-hidden="true" /></span>
            <span className="touche-games__choice-copy"><strong>{copy.wheel}</strong><small>{copy.wheelNote}</small></span>
          </button>
          <button type="button" className="touche-games__choice touche-games__choice--dice" onClick={() => setGame("dice")} data-testid="button-game-dice">
            <span className="touche-games__art-wrap"><img className="touche-games__art-image touche-games__art-image--dice" src="/images/game-cards/action-dice.jpg" alt="" aria-hidden="true" /></span>
            <span className="touche-games__choice-copy"><strong>{copy.dice}</strong><small>{copy.diceNote}</small></span>
          </button>
          <button type="button" className="touche-games__choice touche-games__choice--strip" onClick={() => setGame("strip")} data-testid="button-game-strip">
            <span className="touche-games__art-wrap"><img className="touche-games__art-image touche-games__art-image--strip" src="/images/game-cards/strip-or-action.jpg" alt="" aria-hidden="true" /></span>
            <span className="touche-games__choice-copy"><strong>{copy.strip}</strong><small>{copy.stripNote}</small></span>
          </button>
        </section>
        <p className="touche-games__footnote"><span /> {copy.trialNote}</p>
      </div>
    </main>
  );
}
