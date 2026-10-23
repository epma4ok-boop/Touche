import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { Lang } from "@/data/i18n";
import "./LotteryScreen.css";

type Props = { lang: Lang; onBack: () => void };
type Phase = "idle" | "spinning" | "revealed";
const SPIN_MS = 5000;
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

/* Twenty curved petals share their boundaries; their outer centres retain the pose mapping. */
const petal = (i: number) => {
  const a = i * 18;
  const point = (r: number, angle: number) => polar(r, a + angle).join(" ");
  return `M${point(52, -48)}C${point(104, -44)} ${point(158, -12)} ${point(188, 0)}Q${point(202, 9)} ${point(188, 18)}C${point(158, 6)} ${point(104, -26)} ${point(52, -30)}Z`;
};
const MARKS = POSES.map((pose, index) => ({ id: pose.id, index, d: petal(index), angle: index * 18 + 9 }));

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
                  <linearGradient id="petal-wine" x1="150" y1="200" x2="215" y2="10" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#350c24" />
                    <stop offset=".48" stopColor="#78183d" />
                    <stop offset=".82" stopColor="#ad4160" />
                    <stop offset="1" stopColor="#df9caa" />
                  </linearGradient>
                  <linearGradient id="petal-rose" x1="150" y1="200" x2="215" y2="10" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#460e2a" />
                    <stop offset=".48" stopColor="#8c2349" />
                    <stop offset=".82" stopColor="#bf5a73" />
                    <stop offset="1" stopColor="#f0bcc3" />
                  </linearGradient>
                  {MARKS.map(m => (
                    <linearGradient key={m.id} id={`petal-${m.id}`} href={m.index % 2 ? "#petal-wine" : "#petal-rose"} gradientTransform={`rotate(${m.index * 18} 200 200)`} />
                  ))}
                </defs>
                <circle cx="200" cy="200" r="186" fill="#4a102c" />
                {MARKS.map(m => (
                  <path key={m.id} d={m.d} fill={`url(#petal-${m.id})`} stroke="#f8d8d8" strokeOpacity=".32" strokeWidth=".85" strokeLinejoin="round" />
                ))}
              </svg>
            </div>
            <span className="pose-lottery__sheen" />
            <span className="pose-lottery__hub"><b>Touch<em>é</em></b></span>
          </div>
          {phase === "revealed" && chosen && (
            <section className="pose-lottery__result" aria-label={copy.result}>
              <img src={chosen.src} alt={copy.result} className="pose-lottery__pose-image" />
            </section>
          )}
        </div>

        <p className="pose-lottery__status" aria-live="polite" role="status" data-testid="status-pose-wheel">
          {busy ? copy.spinning : phase === "revealed" && chosen ? copy.result : copy.hint}
        </p>
        <button type="button" className="pose-lottery__button" onClick={spin} disabled={busy} data-testid="button-pose-wheel-spin">
          <span className="pose-lottery__button-mark" aria-hidden="true" />
          {busy ? copy.spinning : phase === "revealed" ? copy.again : copy.spin}
        </button>
      </div>
    </main>
  );
}
