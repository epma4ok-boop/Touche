import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { Lang } from "@/data/i18n";
import FeatureLimitNotice from "@/components/FeatureLimitNotice";
import { useFeatureTrial } from "@/hooks/useFeatureTrial";
import useTelegramTopInset from "./useTelegramTopInset";
import "./PoseBallScreen.css";

type Props = { lang: Lang; onBack: () => void; onUpgrade: () => void | Promise<boolean> };
type Phase = "idle" | "shaking" | "revealed";

const SHAKE_DURATION_MS = 1450;
const POSES = Array.from({ length: 20 }, (_, index) => {
  const id = String(index + 1).padStart(2, "0");
  return { id, src: `/images/lottery-poses/pose-${id}.svg` };
});

const COPY: Record<Lang, {
  back: string;
  title: string;
  subtitle: string;
  shake: string;
  shaking: string;
  again: string;
  hint: string;
  result: string;
  footnote: string;
  status: (number: number) => string;
}> = {
  ru: {
    back: "Назад",
    title: "Шар ответов",
    subtitle: "Встряхни — и увидишь, какую позу он выбрал.",
    shake: "Встряхнуть шар",
    shaking: "Шар встряхивается…",
    again: "Встряхнуть ещё раз",
    hint: "Поза появится на экране шара",
    result: "Ваш вариант на сегодня",
    footnote: "Бесплатно — 1 попытка в день · Premium без ограничений",
    status: n => `Шар выбрал позу ${n}`,
  },
  en: {
    back: "Back",
    title: "Pose ball",
    subtitle: "Shake it to reveal a pose for the two of you.",
    shake: "Shake the ball",
    shaking: "The ball is shaking…",
    again: "Shake again",
    hint: "The pose will appear on the ball's screen",
    result: "Your pose for today",
    footnote: "Free: 1 try a day · unlimited with Premium",
    status: n => `The ball chose pose ${n}`,
  },
  hi: {
    back: "वापस",
    title: "पोज़ बॉल",
    subtitle: "हिलाएँ और आप दोनों के लिए एक पोज़ देखें।",
    shake: "बॉल हिलाएँ",
    shaking: "बॉल हिल रही है…",
    again: "फिर से हिलाएँ",
    hint: "पोज़ बॉल की स्क्रीन पर दिखाई देगी",
    result: "आज की आपकी पोज़",
    footnote: "मुफ़्त: रोज़ 1 बार · Premium में असीमित",
    status: n => `बॉल ने पोज़ ${n} चुनी`,
  },
  pt: {
    back: "Voltar",
    title: "Bola das poses",
    subtitle: "Agitem para revelar uma pose para vocês dois.",
    shake: "Agitar a bola",
    shaking: "A bola está a agitar…",
    again: "Agitar novamente",
    hint: "A pose aparecerá no ecrã da bola",
    result: "A pose de hoje",
    footnote: "Grátis: 1 tentativa por dia · ilimitado no Premium",
    status: n => `A bola escolheu a pose ${n}`,
  },
  es: {
    back: "Volver",
    title: "Bola de poses",
    subtitle: "Agítala y descubre una pose para los dos.",
    shake: "Agitar la bola",
    shaking: "La bola se está agitando…",
    again: "Agitar de nuevo",
    hint: "La pose aparecerá en la pantalla de la bola",
    result: "La pose de hoy",
    footnote: "Gratis: 1 intento al día · ilimitado con Premium",
    status: n => `La bola eligió la pose ${n}`,
  },
};

export default function PoseBallScreen({ lang, onBack, onUpgrade }: Props) {
  const copy = COPY[lang];
  const top = useTelegramTopInset();
  const trial = useFeatureTrial("pose_ball");
  const [phase, setPhase] = useState<Phase>("idle");
  const [poseIndex, setPoseIndex] = useState<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const chosen = poseIndex === null ? null : POSES[poseIndex];
  const bodyStyle = { "--pose-ball-top": `${top}px` } as CSSProperties;

  useEffect(() => () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
  }, []);

  async function shakeBall() {
    if (phase === "shaking" || !(await trial.consume())) return;
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);

    setPoseIndex(null);
    setPhase("shaking");
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred?.("light");

    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    timerRef.current = window.setTimeout(() => {
      setPoseIndex(Math.floor(Math.random() * POSES.length));
      setPhase("revealed");
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred?.("success");
    }, reducedMotion ? 80 : SHAKE_DURATION_MS);
  }

  return (
    <main className="pose-ball-screen" data-phase={phase} style={bodyStyle}>
      <header className="pose-ball__header">
        <button type="button" className="pose-ball__back" onClick={onBack} aria-label={copy.back} data-testid="button-pose-wheel-back">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 18 9 12l6-6" /></svg>
        </button>
        <span className="pose-ball__brand">Touch<em>é</em></span>
        <span className="pose-ball__header-space" />
      </header>

      <div className="pose-ball__body">
        <section className="pose-ball__intro" aria-labelledby="pose-ball-title">
          <span className="pose-ball__eyebrow">18+ <i /> TOUCHÉ</span>
          <h1 id="pose-ball-title">{copy.title}</h1>
          <p>{copy.subtitle}</p>
        </section>

        <section className="pose-ball__stage" aria-label={copy.title}>
          <div
            className={`pose-ball__device${phase === "shaking" ? " is-shaking" : ""}${phase === "revealed" ? " has-pose" : ""}`}
            role="img"
            aria-label={chosen ? copy.status(poseIndex! + 1) : copy.title}
          >
            <img className="pose-ball__render" src="/images/lottery-poses/pose-ball.png" alt="" draggable={false} />
            <div className="pose-ball__display" aria-hidden="true">
              <span className="pose-ball__reflection" />
              {chosen && <img className="pose-ball__pose" src={chosen.src} alt="" draggable={false} />}
            </div>
            <span className="pose-ball__ground" aria-hidden="true" />
          </div>
        </section>

        <p className="pose-ball__status" role="status" aria-live="polite" data-result={phase === "revealed"}>
          {phase === "idle" ? copy.hint : phase === "shaking" ? copy.shaking : copy.result}
        </p>
        <button
          type="button"
          className="pose-ball__button"
          onClick={shakeBall}
          disabled={phase === "shaking" || trial.busy}
          data-testid="button-pose-wheel-spin"
        >
          {phase === "shaking" ? copy.shaking : phase === "revealed" ? copy.again : copy.shake}
        </button>
        <p className="pose-ball__footnote">{copy.footnote}</p>
      </div>
      <FeatureLimitNotice lang={lang} kind="game" notice={trial.notice} onUpgrade={onUpgrade} onDismiss={trial.dismiss} />
    </main>
  );
}
