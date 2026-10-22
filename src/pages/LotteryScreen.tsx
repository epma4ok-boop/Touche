import { useEffect, useRef, useState } from "react";
import type { SyntheticEvent, CSSProperties } from "react";
import type { Lang } from "@/data/i18n";
import "./LotteryScreen.css";

type Props = { lang: Lang; onBack: () => void };
type Phase = "idle" | "rolling" | "revealed";

const POSES = Array.from({ length: 20 }, (_, index) => {
  const id = String(index + 1).padStart(2, "0");
  const image = `/images/lottery-poses/pose-${id}.png`;
  return { id, ball: image, pose: image };
});

const COPY: Record<Lang, {
  back: string; title: string; subtitle: string; roll: string; rolling: string;
  reveal: string; again: string; hint: string; selected: string;
  eyebrow: string; footer: string;
}> = {
  ru: { back: "Назад", title: "Колесо желания", subtitle: "Двадцать идей. Одна — для вас двоих.", roll: "Крутить колесо", rolling: "Колесо выбирает…", reveal: "Ваша поза", again: "Крутить ещё раз", hint: "Пусть случай решит", selected: "Ваш выбор", eyebrow: "НЕМНОГО УДАЧИ — И ЧУТЬ БЛИЖЕ", footer: "СОЗДАНО ДЛЯ ДВОИХ" },
  en: { back: "Back", title: "A turn of desire", subtitle: "Twenty ideas. One made for the two of you.", roll: "Spin the wheel", rolling: "The wheel is choosing…", reveal: "Your pose", again: "Spin again", hint: "Let chance decide", selected: "Your pick", eyebrow: "A LITTLE LUCK, A LITTLE CLOSER", footer: "MADE FOR TWO" },
  hi: { back: "वापस", title: "चाहत का पहिया", subtitle: "बीस ख़याल। आप दोनों के लिए एक।", roll: "पहिया घुमाएँ", rolling: "पहिया चुन रहा है…", reveal: "आपकी पोज़", again: "फिर घुमाएँ", hint: "फ़ैसला किस्मत पर छोड़ें", selected: "आपकी पसंद", eyebrow: "थोड़ी किस्मत, थोड़ा और करीब", footer: "आप दोनों के लिए" },
  pt: { back: "Voltar", title: "Uma volta de desejo", subtitle: "Vinte ideias. Uma feita para vocês dois.", roll: "Girar a roleta", rolling: "A roleta está escolhendo…", reveal: "Sua pose", again: "Girar novamente", hint: "Deixe o acaso decidir", selected: "Sua escolha", eyebrow: "UM POUCO DE SORTE, UM POUCO MAIS PERTO", footer: "FEITO PARA DOIS" },
  es: { back: "Volver", title: "Una vuelta de deseo", subtitle: "Veinte ideas. Una para descubrir juntos.", roll: "Girar la ruleta", rolling: "La ruleta está eligiendo…", reveal: "Tu pose", again: "Girar otra vez", hint: "Deja que decida el azar", selected: "Tu elección", eyebrow: "UN POCO DE SUERTE, UN POCO MÁS CERCA", footer: "HECHO PARA DOS" },
};

export default function LotteryScreen({ lang, onBack }: Props) {
  const copy = COPY[lang];
  const [phase, setPhase] = useState<Phase>("idle");
  const [pose, setPose] = useState<number | null>(null);
  const [rotation, setRotation] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const busy = phase === "rolling";
  const featured = pose === null ? null : POSES[pose];

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function startSpin() {
    if (busy) return;
    if (timer.current) clearTimeout(timer.current);
    const next = Math.floor(Math.random() * POSES.length);
    const step = 360 / POSES.length;
    const normalized = ((rotation % 360) + 360) % 360;
    const alignment = ((360 - next * step - normalized) % 360 + 360) % 360;
    const nextRotation = rotation + 5 * 360 + alignment;
    setPose(next);
    setRotation(nextRotation);
    setPhase("rolling");
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred("medium");
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    timer.current = setTimeout(() => {
      setPhase("revealed");
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred?.("success");
    }, reduced ? 80 : 4350);
  }

  function usePoseFallback(event: SyntheticEvent<HTMLImageElement>, poseSrc: string) {
    const image = event.currentTarget;
    if (!image.dataset.fallback) {
      image.dataset.fallback = "true";
      image.src = poseSrc;
    }
  }

  return (
    <main className="pose-lottery" data-phase={phase}>
      <header className="pose-lottery__header">
        <button type="button" className="pose-lottery__back" onClick={onBack} aria-label={copy.back} data-testid="button-lottery-back">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 18 9 12l6-6" /></svg>
        </button>
        <span className="pose-lottery__brand">Touch<em>é</em></span>
        <span className="pose-lottery__header-space" aria-hidden="true" />
      </header>

      <div className="pose-lottery__body">
        <section className="pose-lottery__intro">
          <span className="pose-lottery__eyebrow"><i /> {copy.eyebrow} <i /></span>
          <h1>{copy.title}</h1>
          <p>{copy.subtitle}</p>
        </section>

        <div className="pose-lottery__stage" aria-label={copy.title}>
          <div className={`pose-lottery__wheel-wrap ${busy ? "is-spinning" : ""} ${phase === "revealed" ? "is-revealed" : ""}`}>
            <div className="pose-lottery__pointer" aria-hidden="true"><span /></div>
            <div
              className="pose-lottery__wheel"
              style={{ "--wheel-rotation": `${rotation}deg` } as CSSProperties}
              aria-hidden="true"
            >
              <div className="pose-lottery__wheel-face">
                {POSES.map((item, index) => (
                  <div
                    className="pose-lottery__wheel-item"
                    key={item.id}
                    style={{ "--item-angle": `${index * 18}deg` } as CSSProperties}
                  >
                    <span className="pose-lottery__item-frame">
                      <img src={item.ball} alt="" onError={(event) => usePoseFallback(event, item.pose)} />
                    </span>
                    <span className="pose-lottery__item-number">{item.id}</span>
                  </div>
                ))}
                <div className="pose-lottery__wheel-hub">
                  <span className="pose-lottery__hub-mark">T</span>
                  <span className="pose-lottery__hub-rule" />
                </div>
              </div>
            </div>
            <div className="pose-lottery__wheel-shadow" />
            {phase === "revealed" && featured && (
              <section className="pose-lottery__result" aria-label={copy.reveal}>
                <div className="pose-lottery__result-image">
                  <img src={featured.pose} alt={copy.reveal} onError={(event) => usePoseFallback(event, featured.ball)} />
                  <span className="pose-lottery__result-number">{featured.id}</span>
                </div>
                <span className="pose-lottery__result-label">{copy.selected}</span>
              </section>
            )}
          </div>
        </div>

        <p className="pose-lottery__status" aria-live="polite" data-testid="status-lottery">
          {busy ? copy.rolling : phase === "revealed" ? copy.reveal : copy.hint}
        </p>
        <button type="button" className="pose-lottery__button" onClick={startSpin} disabled={busy} data-testid="button-spin-wheel">
          <span className="pose-lottery__button-mark" aria-hidden="true"><i /></span>
          {busy ? copy.rolling : phase === "revealed" ? copy.again : copy.roll}
          <span className="pose-lottery__button-arrow" aria-hidden="true">↗</span>
        </button>
        <span className="pose-lottery__footer-note">TOUCHÉ <i /> {copy.footer}</span>
      </div>
    </main>
  );
}
