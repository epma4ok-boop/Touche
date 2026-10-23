import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { Lang } from "@/data/i18n";
import "./LotteryScreen.css";

type Props = { lang: Lang; onBack: () => void };
type Phase = "idle" | "spinning" | "revealed";
const POSES = Array.from({ length: 20 }, (_, index) => {
  const id = String(index + 1).padStart(2, "0");
  return { id, src: `/images/lottery-poses/pose-cutout-${id}.png` };
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

const SECTOR_COLORS = ["#F07870", "#F3B851", "#A9BF79", "#7698C0", "#D17E98", "#F0A16C", "#E3C45D", "#84A984", "#E78B84", "#B497B8", "#E9B66C", "#78AAA7", "#F18479", "#D69CA8", "#E8C56B", "#9BB681", "#D77983", "#EBA06C", "#819ABD", "#D7A1A8"];
const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

export default function LotteryScreen({ lang, onBack }: Props) {
  const copy = COPY[lang];
  const [phase, setPhase] = useState<Phase>("idle");
  const [poseIndex, setPoseIndex] = useState<number | null>(null);
  const [rotation, setRotation] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rotationRef = useRef(0);
  const busy = phase === "spinning";
  const chosen = poseIndex === null ? null : POSES[poseIndex];

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function spin() {
    if (busy) return;
    if (timer.current) clearTimeout(timer.current);
    const selection = Math.floor(Math.random() * POSES.length);
    const sectorCenter = selection * 18 + 9;
    const normalized = ((rotationRef.current % 360) + 360) % 360;
    const alignment = ((360 - sectorCenter - normalized) % 360 + 360) % 360;
    const target = rotationRef.current + 360 * 6 + alignment;
    rotationRef.current = target;
    setPoseIndex(selection);
    setRotation(target);
    setPhase("spinning");
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred("medium");
    const reduceMotion = window.matchMedia?.(REDUCED_MOTION).matches ?? false;
    timer.current = setTimeout(() => {
      setPhase("revealed");
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred?.("success");
    }, reduceMotion ? 80 : 4100);
  }

  const wheelStyle = {
    "--wheel-rotation": `${rotation}deg`,
    "--wheel-sectors": `conic-gradient(${POSES.map((pose, index) => `${SECTOR_COLORS[index]} ${index * 18}deg ${(index + 1) * 18}deg`).join(",")})`,
  } as CSSProperties;

  return (
    <main className="pose-lottery" data-phase={phase}>
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
          <div className="pose-lottery__wheel-wrap" aria-hidden="true">
            <span className="pose-lottery__pointer" />
            <div className="pose-lottery__wheel" style={wheelStyle}>
              {POSES.map((pose, index) => (
                <span
                  className="pose-lottery__sector-number"
                  key={pose.id}
                  style={{ transform: `translate(-50%,-50%) rotate(${index * 18 + 9}deg) translateY(calc(clamp(122px, 35vw, 158px) * -1)) rotate(${-(index * 18 + 9)}deg)` }}
                >{pose.id}</span>
              ))}
              <span className="pose-lottery__wheel-center">Touché</span>
            </div>
          </div>
          {phase === "revealed" && chosen && (
            <section className="pose-lottery__result" aria-label={copy.result}>
              <img src={chosen.src} alt={copy.result} className="pose-lottery__pose-image" />
              <span className="pose-lottery__result-label">{copy.result}</span>
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
