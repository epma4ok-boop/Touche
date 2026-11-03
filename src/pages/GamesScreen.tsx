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
  back: string; number: string;
  strip: string; stripNote: string; stripMood: string;
}> = {
  ru: {
    title: "Игры", subtitle: "Выберите, с чего начнётся ваш вечер.",
    wheel: "Колесо поз", wheelNote: "Двадцать вариантов — один выбор", wheelMood: "ДВИЖЕНИЕ",
    dice: "Кубики действий", diceNote: "Два броска — новый повод сблизиться", diceMood: "ИМПУЛЬС",
    back: "Назад", number: "Игра",
    strip: "Стрип или действие", stripNote: "Пять уровней. Только ваш выбор.", stripMood: "ИГРА 18+",
  },
  en: {
    title: "Games", subtitle: "Choose how your evening begins.",
    wheel: "Wheel of poses", wheelNote: "Twenty possibilities, one shared choice", wheelMood: "MOVEMENT",
    dice: "Action dice", diceNote: "Two rolls to bring you closer", diceMood: "SPONTANEITY",
    back: "Back", number: "Game",
    strip: "Strip or dare", stripNote: "Five levels. Your next move.", stripMood: "GAME 18+",
  },
  hi: {
    title: "खेल", subtitle: "चुनें, आपकी शाम कैसे शुरू होगी।",
    wheel: "पोज़ का पहिया", wheelNote: "बीस विकल्प, एक साझा चुनाव", wheelMood: "क़रीबी",
    dice: "क्रिया के पासे", diceNote: "दो दाँव, और भी क़रीब आने का नया बहाना", diceMood: "रोमांच",
    back: "वापस", number: "खेल",
    strip: "स्ट्रिप या डेयर", stripNote: "पाँच स्तर। अगला कदम आपका।", stripMood: "18+ खेल",
  },
  pt: {
    title: "Jogos", subtitle: "Escolham como a noite vai começar.",
    wheel: "Roleta das poses", wheelNote: "Vinte opções, uma escolha a dois", wheelMood: "MOVIMENTO",
    dice: "Dados de ação", diceNote: "Dois lançamentos para aproximar vocês", diceMood: "SURPRESA",
    back: "Voltar", number: "Jogo",
    strip: "Tire ou ouse", stripNote: "Cinco níveis. A próxima escolha é sua.", stripMood: "JOGO 18+",
  },
  es: {
    title: "Juegos", subtitle: "Elijan cómo empieza su noche.",
    wheel: "Ruleta de posturas", wheelNote: "Veinte opciones, una elección compartida", wheelMood: "MOVIMIENTO",
    dice: "Dados de acción", diceNote: "Dos lanzamientos para acercarse", diceMood: "SORPRESA",
    back: "Volver", number: "Juego",
    strip: "Quítate o atrévete", stripNote: "Cinco niveles. Tú eliges el siguiente paso.", stripMood: "JUEGO 18+",
  },
};

const EXTRA_COPY: Record<Lang, {
  headerNote: string; eyebrow: string; heroFirst: string; heroSecond: string;
  heroText: string; you: string; me: string; scroll: string; gameLabel: string;
  wheelAction: string; diceAction: string; stripAction: string;
  footerLead: string; footerNote: string;
}> = {
  ru: {
    headerNote: "ИГРА ДЛЯ ДВОИХ", eyebrow: "ТОЛЬКО ВАШИ ПРАВИЛА",
    heroFirst: "ИГРАЙ.", heroSecond: "БЛИЖЕ.",
    heroText: "Один телефон. Два человека. Сколько искры — решаете вы.",
    you: "ТЫ", me: "Я", scroll: "ВЫБИРАЙ СВОЙ РИТМ", gameLabel: "ИГРА",
    wheelAction: "ВЫБРАТЬ ИГРУ", diceAction: "БРОСАЙ", stripAction: "ТВОЙ ХОД",
    footerLead: "ДА — это тоже часть игры.",
    footerNote: "Можно остановиться в любой момент. Главное — чтобы обоим было хорошо.",
  },
  en: {
    headerNote: "GAMES FOR TWO", eyebrow: "YOUR RULES ONLY",
    heroFirst: "PLAY.", heroSecond: "CLOSER.",
    heroText: "One phone. Two people. How much spark? You decide.",
    you: "YOU", me: "ME", scroll: "PICK YOUR RHYTHM", gameLabel: "GAME",
    wheelAction: "CHOOSE GAME", diceAction: "ROLL", stripAction: "YOUR MOVE",
    footerLead: "YES IS PART OF THE GAME.",
    footerNote: "You can stop at any moment. What matters is that you both feel good.",
  },
  hi: {
    headerNote: "दो लोगों के लिए खेल", eyebrow: "नियम आपके",
    heroFirst: "खेलें.", heroSecond: "करीब.",
    heroText: "एक फ़ोन। दो लोग। कितनी चिंगारी — यह आप तय करें।",
    you: "तुम", me: "मैं", scroll: "अपनी लय चुनें", gameLabel: "खेल",
    wheelAction: "खेल चुनें", diceAction: "पासा फेंकें", stripAction: "आपकी चाल",
    footerLead: "हाँ भी खेल का हिस्सा है।",
    footerNote: "आप किसी भी समय रुक सकते हैं। ज़रूरी है कि आप दोनों सहज हों।",
  },
  pt: {
    headerNote: "JOGOS A DOIS", eyebrow: "AS REGRAS SÃO DE VOCÊS",
    heroFirst: "JOGUEM.", heroSecond: "MAIS PERTO.",
    heroText: "Um celular. Duas pessoas. A faísca é vocês que decidem.",
    you: "VOCÊ", me: "EU", scroll: "ESCOLHAM O RITMO", gameLabel: "JOGO",
    wheelAction: "ESCOLHER JOGO", diceAction: "JOGAR DADOS", stripAction: "SUA VEZ",
    footerLead: "SIM também faz parte do jogo.",
    footerNote: "Vocês podem parar a qualquer momento. O importante é que ambos se sintam bem.",
  },
  es: {
    headerNote: "JUEGOS PARA DOS", eyebrow: "SOLO SUS REGLAS",
    heroFirst: "JUEGA.", heroSecond: "MÁS CERCA.",
    heroText: "Un teléfono. Dos personas. Ustedes deciden la chispa.",
    you: "TÚ", me: "YO", scroll: "ELIJAN EL RITMO", gameLabel: "JUEGO",
    wheelAction: "ELEGIR JUEGO", diceAction: "LANZAR", stripAction: "TU TURNO",
    footerLead: "SÍ también es parte del juego.",
    footerNote: "Pueden parar en cualquier momento. Lo importante es que ambos estén a gusto.",
  },
};

function WheelMark() {
  return (
    <svg viewBox="0 0 180 180" aria-hidden="true" className="tx-wheel">
      <circle cx="90" cy="90" r="78" fill="#221d2d" />
      {Array.from({ length: 8 }, (_, index) => (
        <path key={index} d="M90 90V13A77 77 0 0 1 144.4 35.6Z"
          fill={index % 2 ? "#d9fb4a" : "#ff477e"} stroke="#221d2d"
          strokeWidth="2" transform={`rotate(${index * 45} 90 90)`} />
      ))}
      <circle cx="90" cy="90" r="23" fill="#fff9ed" stroke="#221d2d" strokeWidth="2" />
      <circle cx="90" cy="90" r="6" fill="#221d2d" />
      <path d="m8 82 19 8-19 8z" fill="#ffb849" stroke="#221d2d" strokeWidth="2" />
    </svg>
  );
}

function CubeMark() {
  return (
    <svg viewBox="0 0 140 112" aria-hidden="true" className="tx-dice">
      <g transform="rotate(-13 42 48)">
        <rect x="9" y="17" width="65" height="65" rx="15" fill="#d9fb4a" stroke="#221d2d" strokeWidth="3" />
        <circle cx="27" cy="35" r="5" fill="#221d2d" /><circle cx="56" cy="35" r="5" fill="#221d2d" />
        <circle cx="42" cy="50" r="5" fill="#221d2d" /><circle cx="27" cy="65" r="5" fill="#221d2d" />
        <circle cx="56" cy="65" r="5" fill="#221d2d" />
      </g>
      <g transform="rotate(12 93 63)">
        <rect x="66" y="34" width="61" height="61" rx="15" fill="#ff477e" stroke="#221d2d" strokeWidth="3" />
        <path d="M85 51h5v5h-5zm19 19h5v5h-5z" fill="#221d2d" />
        <circle cx="88" cy="75" r="4" fill="#221d2d" /><circle cx="110" cy="53" r="4" fill="#221d2d" />
      </g>
    </svg>
  );
}

function StripMark() {
  return (
    <svg viewBox="0 0 126 130" aria-hidden="true" className="tx-cards">
      <g transform="rotate(-14 52 65)">
        <rect x="13" y="12" width="74" height="102" rx="10" fill="#ffb849" stroke="#221d2d" strokeWidth="3" />
      </g>
      <g transform="rotate(9 72 65)">
        <rect x="36" y="12" width="74" height="102" rx="10" fill="#fff9ed" stroke="#221d2d" strokeWidth="3" />
        <path d="m72 29 7 19 20 1-16 12 6 20-17-12-17 12 6-20-16-12 20-1z" fill="#ff477e" stroke="#221d2d" strokeWidth="2" />
      </g>
    </svg>
  );
}

export default function GamesScreen({ lang, onBack }: Props) {
  const [game, setGame] = useState<Game | null>(null);
  const top = useTelegramTopInset();
  const copy = COPY[lang];
  if (game === "wheel") return <WheelScreen lang={lang} onBack={() => setGame(null)} />;
  if (game === "dice") return <DiceScreen lang={lang} onBack={() => setGame(null)} />;
  if (game === "strip") return <StripGameScreen lang={lang} onBack={() => setGame(null)} />;

  const extra = EXTRA_COPY[lang];
  return (
    <main className="touche-games tx-games" style={{ "--games-top": `${top}px` } as CSSProperties}>
      <header className="tx-header">
        <button type="button" className="tx-back" onClick={onBack} aria-label={copy.back} data-testid="button-games-back">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 18 9 12l6-6" /></svg>
        </button>
        <span className="tx-brand">Touché<span>®</span></span>
        <span className="tx-header-note">{extra.headerNote}</span>
        <span className="tx-age" aria-label="18+">18+</span>
      </header>

      <div className="tx-body">
        <section className="tx-hero">
          <div className="tx-eyebrow"><span className="tx-pulse" />{extra.eyebrow}</div>
          <h1>{extra.heroFirst}<br /><em>{extra.heroSecond}</em></h1>
          <div className="tx-hero-sticker" aria-hidden="true">
            <span>{extra.you}<br />+ {extra.me}</span><i />
          </div>
          <p>{extra.heroText}</p>
          <div className="tx-scroll-mark">{extra.scroll}</div>
        </section>

        <section className="tx-games" aria-label={copy.title}>
          <button type="button" className="tx-game tx-game--wheel" onClick={() => setGame("wheel")} aria-label={`${copy.wheel}: ${copy.wheelNote}`} data-testid="button-game-wheel">
            <span className="tx-game-num">01 <i>{extra.gameLabel}</i></span>
            <span className="tx-w-label">{copy.wheelMood}</span>
            <strong>{copy.wheel}</strong>
            <span className="tx-choose">{extra.wheelAction}<b aria-hidden="true">+</b></span>
            <WheelMark />
            <span className="tx-w-dots" aria-hidden="true">● ● ●</span>
          </button>

          <div className="tx-sidegames">
            <button type="button" className="tx-game tx-game--dice" onClick={() => setGame("dice")} aria-label={`${copy.dice}: ${copy.diceNote}`} data-testid="button-game-dice">
              <span className="tx-game-num">02 <i>{extra.gameLabel}</i></span>
              <strong>{copy.dice}</strong>
              <span className="tx-choose">{extra.diceAction}<b aria-hidden="true">+</b></span>
              <CubeMark />
            </button>
            <button type="button" className="tx-game tx-game--strip" onClick={() => setGame("strip")} aria-label={`${copy.strip}: ${copy.stripNote}`} data-testid="button-game-strip">
              <span className="tx-game-num">03 <i>{extra.gameLabel}</i></span>
              <strong>{copy.strip}</strong>
              <span className="tx-choose">{extra.stripAction}<b aria-hidden="true">+</b></span>
              <StripMark />
            </button>
          </div>
        </section>

        <footer className="tx-footer">
          <strong>{extra.footerLead}</strong>
          <span>{extra.footerNote}</span>
        </footer>
      </div>
    </main>
  );
}
