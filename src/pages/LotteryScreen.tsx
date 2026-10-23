import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { Lang } from "@/data/i18n";
import "./LotteryScreen.css";

type Props = { lang: Lang; onBack: () => void };
type Phase = "idle" | "spinning" | "revealed";
const SPIN_MS = 4600;
const POSES = Array.from({ length: 20 }, (_, index) => {
  const id = String(index + 1).padStart(2, "0");
  return { id, src: `/images/lottery-poses/pose-${id}.svg` };
});

const COPY: Record<Lang, {
  back: string; title: string; subtitle: string; spin: string; spinning: string;
  again: string; hint: string; result: string; status: (number: number) => string;
}> = {
  ru: { back: "Назад", title: "Колесо поз", subtitle: "Двадцать идей. Один общий момент.", spin: "Крутить колесо", spinning: "Колесо выбирает…", again: "Крутить ещё раз", hint: "Выберите идею для вашего вечера", result: "Ваша поза", status: n => `Выбрана поза ${n}` },
  en: { back: "Back", title: "Pose wheel", subtitle: "Twenty ideas. One moment for two.", spin: "Spin the wheel", spinning: "The wheel is turning…", again: "Spin again", hint: "Find an idea for your evening", result: "Your pose", status: n => `Pose ${n} selected` },
  hi: { back: "वापस", title: "पोज़ व्हील", subtitle: "बीस विचार। आप दोनों का एक पल।", spin: "व्हील घुमाएँ", spinning: "व्हील घूम रहा है…", again: "फिर घुमाएँ", hint: "अपनी शाम के लिए एक विचार चुनें", result: "आपकी पोज़", status: n => `पोज़ ${n} चुनी गई` },
  pt: { back: "Voltar", title: "Roda de poses", subtitle: "Vinte ideias. Um momento a dois.", spin: "Girar a roda", spinning: "A roda está girando…", again: "Girar novamente", hint: "Encontrem uma ideia para a noite", result: "Sua pose", status: n => `Pose ${n} selecionada` },
  es: { back: "Volver", title: "Rueda de poses", subtitle: "Veinte ideas. Un momento para dos.", spin: "Girar la rueda", spinning: "La rueda está girando…", again: "Girar otra vez", hint: "Encuentren una idea para esta noche", result: "Tu pose", status: n => `Pose ${n} seleccionada` },
};

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function useTelegramTopInset(): number {
  const [top, setTop] = useState(() => window.Telegram?.WebApp ? 96 : 14);
  useEffect(() => {
    const tg = window.Telegram?.WebApp as any;
    const update = () => {
      const safe = tg?.safeAreaInset?.top ?? 0;
      const content = tg?.contentSafeAreaInset?.top ?? 0;
      setTop(tg ? Math.max(96, safe + 72, content + safe + 16) : 14);
    };
    update();
    tg?.onEvent?.("safeAreaChanged", update);
    tg?.onEvent?.("contentSafeAreaInsetChanged", update);
    const t = window.setTimeout(update, 700);
    return () => {
      tg?.offEvent?.("safeAreaChanged", update);
      tg?.offEvent?.("contentSafeAreaInsetChanged", update);
      window.clearTimeout(t);
    };
  }, []);
  return top;
}

const polar = (r: number, deg: number) => {
  const a = (deg - 90) * Math.PI / 180;
  return [200 + r * Math.cos(a), 200 + r * Math.sin(a)] as const;
};

/* Static dial markings: hairline ticks on sector boundaries, fine minor ticks, numerals at sector centres. */
const MARKS = POSES.map((pose, index) => {
  const edge = index * 18;
  const [x1, y1] = polar(172, edge);
  const [x2, y2] = polar(150, edge);
  const minors = [6, 12].map(o => {
    const [a, b] = polar(172, edge + o);
    const [c, d] = polar(165, edge + o);
    return { a, b, c, d };
  });
  return { id: pose.id, x1, y1, x2, y2, minors, angle: edge + 9 };
});

export default function LotteryScreen({ lang, onBack }: Props) {
  const copy = COPY[lang];
  const top = useTelegramTopInset();
  const [phase, setPhase] = useState<Phase>("idle");
  const [poseIndex, setPoseIndex] = useState<number | null>(null);
  const [rotation, setRotation] = useState(0);
  const [instant, setInstant] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rotationRef = useRef(0);
  const busyRef = useRef(false);
  const busy = phase === "spinning";
  const chosen = poseIndex === null ? null : POSES[poseIndex];

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function spin() {
    if (busyRef.current) return;
    busyRef.current = true;
    if (timer.current) clearTimeout(timer.current);
    const selection = Math.floor(Math.random() * POSES.length);
    const sectorCenter = selection * 18 + 9;
    const normalized = ((rotationRef.current % 360) + 360) % 360;
    const alignment = ((360 - sectorCenter - normalized) % 360 + 360) % 360;
    const reduceMotion = window.matchMedia?.(REDUCED_MOTION).matches ?? false;
    const target = rotationRef.current + (reduceMotion ? 0 : 360 * 5) + alignment;
    rotationRef.current = target;
    setInstant(reduceMotion);
    setPoseIndex(selection);
    setRotation(target);
    setPhase("spinning");
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred("light");
    timer.current = setTimeout(() => {
      busyRef.current = false;
      setPhase("revealed");
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred?.("success");
    }, reduceMotion ? 80 : SPIN_MS);
  }

  const wheelStyle = { "--wheel-rotation": `${rotation}deg` } as CSSProperties;
  const bodyStyle = { "--lottery-top": `${top}px` } as CSSProperties;

  return (
    <main className="pose-lottery" data-phase={phase} style={bodyStyle}>
      <header className="pose-lottery__header">
        <button type="button" className="pose-lottery__back" onClick={onBack} aria-label={copy.back} data-testid="button-pose-wheel-back">
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

        <div className={`pose-lottery__scene ${busy ? "is-spinning" : ""} ${phase === "revealed" ? "is-done" : ""}`}>
          <div className="pose-lottery__dial" aria-hidden="true">
            <span className="pose-lottery__index" />
            <div className={`pose-lottery__wheel${instant ? " is-instant" : ""}`} style={wheelStyle}>
              <svg viewBox="0 0 400 400" className="pose-lottery__svg" focusable="false">
                <defs>
                  <radialGradient id="dial-face" cx="50%" cy="38%" r="70%">
                    <stop offset="0" stopColor="#fffdf8" />
                    <stop offset="1" stopColor="#f3e9dd" />
                  </radialGradient>
                </defs>
                <circle cx="200" cy="200" r="196" fill="#162238" />
                <circle cx="200" cy="200" r="193" fill="url(#dial-face)" />
                <circle cx="200" cy="200" r="186" fill="none" stroke="#78183d" strokeWidth="1.2" />
                <circle cx="200" cy="200" r="110" fill="none" stroke="#78183d" strokeOpacity=".28" strokeWidth=".8" />
                <circle cx="200" cy="200" r="62" fill="none" stroke="#162238" strokeOpacity=".14" strokeWidth=".8" />
                {MARKS.map(m => (
                  <g key={m.id}>
                    <line x1={m.x1} y1={m.y1} x2={m.x2} y2={m.y2} stroke="#78183d" strokeWidth="1.4" />
                    {m.minors.map((k, i) => <line key={i} x1={k.a} y1={k.b} x2={k.c} y2={k.d} stroke="#162238" strokeOpacity=".4" strokeWidth=".8" />)}
                    <text x="200" y="72" transform={`rotate(${m.angle} 200 200)`} textAnchor="middle" className="pose-lottery__numeral">{m.id}</text>
                  </g>
                ))}
                <circle cx="200" cy="200" r="30" fill="#162238" />
                <circle cx="200" cy="200" r="26" fill="none" stroke="#e8c4ae" strokeOpacity=".5" strokeWidth=".8" />
                <text x="200" y="203.5" textAnchor="middle" className="pose-lottery__hub-mark">T</text>
              </svg>
            </div>
          </div>
          {phase === "revealed" && chosen && (
            <section className="pose-lottery__result" aria-label={copy.result}>
              <img src={chosen.src} alt={copy.result} className="pose-lottery__pose-image" />
            </section>
          )}
        </div>

        <p className="pose-lottery__status" aria-live="polite" role="status" data-testid="status-pose-wheel">
          {busy ? copy.spinning : phase === "revealed" && chosen ? copy.status(Number(chosen.id)) : copy.hint}
        </p>
        <button type="button" className="pose-lottery__button" onClick={spin} disabled={busy} data-testid="button-pose-wheel-spin">
          <span className="pose-lottery__button-mark" aria-hidden="true" />
          {busy ? copy.spinning : phase === "revealed" ? copy.again : copy.spin}
        </button>
      </div>
    </main>
  );
}
