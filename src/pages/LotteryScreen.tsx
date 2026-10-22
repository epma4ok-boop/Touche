import { useEffect, useRef, useState } from "react";
import type { Lang } from "@/data/i18n";
import "./LotteryScreen.css";

type Props = { lang: Lang; onBack: () => void };
type Phase = "idle" | "rolling" | "revealed";

const POSES = Array.from({ length: 20 }, (_, index) => {
  const id = String(index + 1).padStart(2, "0");
  return `/images/lottery-poses/pose-${id}.png`;
});

const COPY: Record<Lang, {
  back: string; title: string; subtitle: string; roll: string; rolling: string;
  reveal: string; again: string; hint: string;
}> = {
  ru: {
    back: "Назад", title: "Лототрон поз", subtitle: "Поверните шар — и узнайте, что выпадет.",
    roll: "Запустить лототрон", rolling: "Шар уже катится…", reveal: "Ваша поза",
    again: "Ещё раз", hint: "Каждый запуск — новая случайная поза",
  },
  en: {
    back: "Back", title: "Pose lottery", subtitle: "Give the ball a spin and see what comes up.",
    roll: "Start the lottery", rolling: "The ball is rolling…", reveal: "Your pose",
    again: "Roll again", hint: "Every roll reveals a random pose",
  },
  hi: {
    back: "वापस", title: "पोज़ लॉटरी", subtitle: "गेंद घुमाएँ और देखें कौन-सी पोज़ आती है।",
    roll: "लॉटरी शुरू करें", rolling: "गेंद घूम रही है…", reveal: "आपकी पोज़",
    again: "फिर से घुमाएँ", hint: "हर बार एक रैंडम पोज़",
  },
  pt: {
    back: "Voltar", title: "Roleta de poses", subtitle: "Gire a esfera e descubra o que vem.",
    roll: "Girar a roleta", rolling: "A esfera está rolando…", reveal: "Sua pose",
    again: "Girar de novo", hint: "Cada rodada revela uma pose aleatória",
  },
  es: {
    back: "Volver", title: "Lotería de poses", subtitle: "Gira la bola y descubre qué aparece.",
    roll: "Iniciar la lotería", rolling: "La bola está rodando…", reveal: "Tu pose",
    again: "Girar otra vez", hint: "Cada giro revela una pose aleatoria",
  },
};

export default function LotteryScreen({ lang, onBack }: Props) {
  const copy = COPY[lang];
  const [phase, setPhase] = useState<Phase>("idle");
  const [pose, setPose] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const busy = phase === "rolling";

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function roll() {
    if (busy) return;
    let next = Math.floor(Math.random() * POSES.length);
    if (POSES.length > 1 && next === pose) next = (next + 1 + Math.floor(Math.random() * (POSES.length - 1))) % POSES.length;
    setPose(next);
    setPhase("rolling");
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred("medium");
    timer.current = setTimeout(() => {
      setPhase("revealed");
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred?.("success");
    }, 1850);
  }

  return (
    <main className="pose-lottery" data-phase={phase}>
      <header className="pose-lottery__header">
        <button type="button" className="pose-lottery__back" onClick={onBack} aria-label={copy.back}>‹</button>
        <span className="pose-lottery__brand">Touch<em>é</em></span>
        <span className="pose-lottery__header-space" />
      </header>

      <div className="pose-lottery__body">
        <section className="pose-lottery__intro">
          <span className="pose-lottery__eyebrow">18+ · TOUCHÉ</span>
          <h1>{copy.title}</h1>
          <p>{copy.subtitle}</p>
        </section>

        <div className={`pose-lottery__machine ${busy ? "is-rolling" : ""} ${phase === "revealed" ? "is-done" : ""}`} aria-label={copy.title}>
          <div className="pose-lottery__dome">
            <div className="pose-lottery__glow" />
            <div className="pose-lottery__wire pose-lottery__wire--one" />
            <div className="pose-lottery__wire pose-lottery__wire--two" />
            <div className="pose-lottery__wire pose-lottery__wire--three" />
            <div className="pose-lottery__dome-shine" />
          </div>
          <div className="pose-lottery__machine-base">
            <span className="pose-lottery__machine-label">T O U C H É</span>
            <span className="pose-lottery__slot" />
          </div>
          <div className="pose-lottery__stand" />
          {pose !== null && (
            <div className={`pose-lottery__ball ${busy ? "is-moving" : ""} ${phase === "revealed" ? "is-settled" : ""}`}>
              <img src={POSES[pose]} alt="" />
            </div>
          )}
          <span className="pose-lottery__spark pose-lottery__spark--a" />
          <span className="pose-lottery__spark pose-lottery__spark--b" />
          <span className="pose-lottery__spark pose-lottery__spark--c" />
        </div>

        <p className="pose-lottery__status" aria-live="polite">
          {busy ? copy.rolling : phase === "revealed" ? copy.reveal : copy.hint}
        </p>

        {phase === "revealed" && pose !== null && (
          <section className="pose-lottery__result" aria-label={copy.reveal}>
            <div className="pose-lottery__result-image">
              <img src={POSES[pose]} alt={copy.reveal} />
            </div>
            <span>{copy.reveal}</span>
          </section>
        )}

        <button type="button" className="pose-lottery__button" onClick={roll} disabled={busy}>
          {busy ? <><i className="pose-lottery__spinner" />{copy.rolling}</> : phase === "revealed" ? copy.again : copy.roll}
        </button>
      </div>
    </main>
  );
}
