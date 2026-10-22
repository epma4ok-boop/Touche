import { useEffect, useRef, useState } from "react";
import type { SyntheticEvent } from "react";
import type { Lang } from "@/data/i18n";
import "./LotteryScreen.css";

type Props = { lang: Lang; onBack: () => void };
type Phase = "idle" | "rolling" | "revealed";

const BALLS = Array.from({ length: 20 }, (_, index) => {
  const id = String(index + 1).padStart(2, "0");
  const image = `/images/lottery-poses/pose-${id}.png`;
  return { id, ball: image, pose: image };
});

const COPY: Record<Lang, {
  back: string; title: string; subtitle: string; roll: string; rolling: string;
  reveal: string; again: string; hint: string; selected: string;
}> = {
  ru: { back: "Назад", title: "Лототрон для взрослых", subtitle: "Двадцать шаров. Один случайный выбор.", roll: "Запустить лототрон", rolling: "Шары перемешиваются…", reveal: "Ваша поза", again: "Крутить ещё раз", hint: "Нажмите, чтобы вытянуть шар", selected: "Выпавший шар" },
  en: { back: "Back", title: "Adult pose lottery", subtitle: "Twenty glossy balls. One unexpected pick.", roll: "Start the lottery", rolling: "Mixing the balls…", reveal: "Your pose", again: "Roll again", hint: "Tap to draw a ball", selected: "The selected ball" },
  hi: { back: "वापस", title: "वयस्कों के लिए लॉटरी", subtitle: "बीस चमकदार गेंदें। एक यादृच्छिक चुनाव।", roll: "लॉटरी शुरू करें", rolling: "गेंदें मिल रही हैं…", reveal: "आपकी पोज़", again: "फिर से घुमाएँ", hint: "गेंद निकालने के लिए दबाएँ", selected: "चुनी गई गेंद" },
  pt: { back: "Voltar", title: "Roleta para adultos", subtitle: "Vinte esferas brilhantes. Uma escolha inesperada.", roll: "Iniciar a roleta", rolling: "Misturando as esferas…", reveal: "Sua pose", again: "Girar novamente", hint: "Toque para sortear uma esfera", selected: "Esfera escolhida" },
  es: { back: "Volver", title: "Lotería para adultos", subtitle: "Veinte bolas brillantes. Una elección inesperada.", roll: "Iniciar la lotería", rolling: "Mezclando las bolas…", reveal: "Tu pose", again: "Girar otra vez", hint: "Toca para sacar una bola", selected: "La bola elegida" },
};

export default function LotteryScreen({ lang, onBack }: Props) {
  const copy = COPY[lang];
  const [phase, setPhase] = useState<Phase>("idle");
  const [pose, setPose] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const busy = phase === "rolling";
  const featured = pose === null ? null : BALLS[pose];

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function roll() {
    if (busy) return;
    let next = Math.floor(Math.random() * BALLS.length);
    if (BALLS.length > 1 && next === pose) next = (next + 1 + Math.floor(Math.random() * (BALLS.length - 1))) % BALLS.length;
    setPose(next);
    setPhase("rolling");
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred("medium");
    timer.current = setTimeout(() => {
      setPhase("revealed");
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred?.("success");
    }, 2650);
  }

  function usePoseFallback(event: SyntheticEvent<HTMLImageElement>, poseSrc: string) {
    const image = event.currentTarget;
    if (!image.dataset.fallback) {
      image.dataset.fallback = "true";
      image.src = poseSrc;
    }
  }

  function useBallFallback(event: SyntheticEvent<HTMLImageElement>, ballSrc: string) {
    const image = event.currentTarget;
    if (!image.dataset.fallback) {
      image.dataset.fallback = "true";
      image.src = ballSrc;
    }
  }

  return (
    <main className="pose-lottery" data-phase={phase}>
      <header className="pose-lottery__header">
        <button type="button" className="pose-lottery__back" onClick={onBack} aria-label={copy.back}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 18 9 12l6-6" /></svg>
        </button>
        <span className="pose-lottery__brand">Touch<em>é</em></span>
        <span className="pose-lottery__header-space" />
      </header>

      <div className="pose-lottery__body">
        <section className="pose-lottery__intro">
          <span className="pose-lottery__eyebrow">18+ <i /> TOUCHÉ</span>
          <h1>{copy.title}</h1>
          <p>{copy.subtitle}</p>
        </section>

        <div className={`pose-lottery__scene ${busy ? "is-rolling" : ""} ${phase === "revealed" ? "is-done" : ""}`} aria-label={copy.title}>
          <div className="pose-lottery__machine">
            <div className="pose-lottery__dome">
              <div className="pose-lottery__dome-shine" />
              {BALLS.slice(0, 11).map((ball, index) => (
                <img
                  key={ball.id}
                  className={`pose-lottery__orb pose-lottery__orb--${index + 1}`}
                  src={ball.ball}
                  alt=""
                  onError={(event) => usePoseFallback(event, ball.pose)}
                />
              ))}
              <div className="pose-lottery__glass-reflection" />
            </div>
            <div className="pose-lottery__neck" />
            <div className="pose-lottery__machine-base">
              <span className="pose-lottery__machine-label">TOUCHÉ · 18+</span>
              <span className="pose-lottery__slot" />
              <span className="pose-lottery__base-rule" />
            </div>
            <div className="pose-lottery__pedestal"><i /><i /></div>
            {featured && (
              <div className={`pose-lottery__drawn-ball ${busy ? "is-drawn" : ""} ${phase === "revealed" ? "is-hidden" : ""}`}>
                <img src={featured.ball} alt="" onError={(event) => usePoseFallback(event, featured.pose)} />
              </div>
            )}
            <span className="pose-lottery__spark pose-lottery__spark--a" />
            <span className="pose-lottery__spark pose-lottery__spark--b" />
            <span className="pose-lottery__spark pose-lottery__spark--c" />
          </div>
          {phase === "revealed" && featured && (
            <section className="pose-lottery__result" aria-label={copy.reveal}>
              <div className="pose-lottery__result-image">
                <img src={featured.ball} alt={copy.reveal} onError={(event) => usePoseFallback(event, featured.pose)} />
                <span className="pose-lottery__result-number">{featured.id}</span>
              </div>
              <span className="pose-lottery__result-label">{copy.reveal}</span>
            </section>
          )}
        </div>

        <p className="pose-lottery__status" aria-live="polite">
          {busy ? copy.rolling : phase === "revealed" ? copy.reveal : copy.hint}
        </p>

        <button type="button" className="pose-lottery__button" onClick={roll} disabled={busy}>
          <span className="pose-lottery__button-mark" aria-hidden="true" />
          {busy ? copy.rolling : phase === "revealed" ? copy.again : copy.roll}
        </button>
      </div>
    </main>
  );
}
