import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import type { Lang } from "@/data/i18n";
import "./FirstRunTutorial.css";

export type TutorialStep = 1 | 2 | 3 | 4 | 5;

type TutorialCopy = {
  welcomeTitle: string;
  welcomeBody: string;
  start: string;
  modeTitle: string;
  modeBody: string;
  complimentsTitle: string;
  complimentsBody: string;
  holdTitle: string;
  holdBody: string;
  demoTitle: string;
  demoBody: string;
  finish: string;
  skip: string;
  step: string;
  progressLabel: (step: number) => string;
  dialog: string;
};

const COPY: Record<Lang, TutorialCopy> = {
  ru: {
    welcomeTitle: "Ваш общий момент начинается здесь",
    welcomeBody: "Выберите настроение, а Touché предложит небольшой ритуал только для вас двоих.",
    start: "Начать",
    modeTitle: "Поодиночке или вместе",
    modeBody: "Выберите один из двух режимов. «Вместе» откроет подключение пары — закройте окно, чтобы продолжить.",
    complimentsTitle: "Выберите настроение",
    complimentsBody: "Начнём с тёплых слов. Нажмите на карточку «Комплименты».",
    holdTitle: "Побудьте в этом мгновении",
    holdBody: "Коснитесь сердца и удерживайте около 2,6 секунды. Это безопасный пример — ничего не будет сохранено или отправлено.",
    demoTitle: "Вот как рождается момент",
    demoBody: "Это демонстрационный пример. Он не создаёт настоящее задание и не влияет на ваш дневной лимит.",
    finish: "Завершить знакомство",
    skip: "Пропустить",
    step: "Шаг",
    progressLabel: (step) => `Шаг ${step} из 5`,
    dialog: "Знакомство с Touché",
  },
  en: {
    welcomeTitle: "Your shared moment starts here",
    welcomeBody: "Choose a mood and Touché will shape a small ritual that belongs to the two of you.",
    start: "Begin",
    modeTitle: "On your own or together",
    modeBody: "Choose either mode. Together opens pair linking; close that window when you’re ready to continue.",
    complimentsTitle: "Choose a mood",
    complimentsBody: "Let’s begin with warm words. Tap the Compliments card.",
    holdTitle: "Stay with this moment",
    holdBody: "Touch the heart and hold for about 2.6 seconds. This is a safe sample; nothing will be saved or sent.",
    demoTitle: "A moment, made together",
    demoBody: "This is a tutorial sample. It does not create a real task or use today’s allowance.",
    finish: "Finish the tour",
    skip: "Skip",
    step: "Step",
    progressLabel: (step) => `Step ${step} of 5`,
    dialog: "Touché first-run tutorial",
  },
  hi: {
    welcomeTitle: "आपका साझा पल यहीं से शुरू होता है",
    welcomeBody: "एक मूड चुनें और Touché आप दोनों के लिए एक छोटा-सा खास पल बनाएगा।",
    start: "शुरू करें",
    modeTitle: "अकेले या साथ में",
    modeBody: "दोनों मोड में से एक चुनें। साथ वाला मोड जोड़ी जोड़ने का तरीका खोलेगा; आगे बढ़ने के लिए विंडो बंद करें।",
    complimentsTitle: "एक मूड चुनें",
    complimentsBody: "आइए, प्यारे शब्दों से शुरू करें। तारीफ़ें कार्ड दबाएँ।",
    holdTitle: "इस पल के साथ रहें",
    holdBody: "दिल को छूकर लगभग 2.6 सेकंड दबाए रखें। यह सुरक्षित नमूना है; कुछ भी सेव या भेजा नहीं जाएगा।",
    demoTitle: "एक साझा पल, बस आप दोनों के लिए",
    demoBody: "यह ट्यूटोरियल का नमूना है। इससे असली कार्य नहीं बनेगा और आज की सीमा पर असर नहीं पड़ेगा।",
    finish: "परिचय पूरा करें",
    skip: "छोड़ें",
    step: "चरण",
    progressLabel: (step) => `5 में से चरण ${step}`,
    dialog: "Touché का परिचय",
  },
  pt: {
    welcomeTitle: "O momento de vocês começa aqui",
    welcomeBody: "Escolham um clima e o Touché cria um pequeno ritual só para vocês dois.",
    start: "Começar",
    modeTitle: "Só ou a dois",
    modeBody: "Escolha um dos dois modos. A dois abre o vínculo do casal; feche a janela para continuar.",
    complimentsTitle: "Escolha um clima",
    complimentsBody: "Vamos começar com palavras gentis. Toque no cartão Elogios.",
    holdTitle: "Fique neste instante",
    holdBody: "Toque no coração e segure por cerca de 2,6 segundos. É uma amostra segura; nada será salvo nem enviado.",
    demoTitle: "Um momento criado para vocês",
    demoBody: "Esta é uma amostra do tutorial. Ela não cria uma tarefa real nem usa o limite diário.",
    finish: "Concluir apresentação",
    skip: "Pular",
    step: "Etapa",
    progressLabel: (step) => `Etapa ${step} de 5`,
    dialog: "Apresentação inicial do Touché",
  },
  es: {
    welcomeTitle: "Su momento compartido empieza aquí",
    welcomeBody: "Elijan un ánimo y Touché creará un pequeño ritual solo para ustedes dos.",
    start: "Empezar",
    modeTitle: "A solas o en pareja",
    modeBody: "Elige uno de los dos modos. En pareja abre la conexión; cierra esa ventana para continuar.",
    complimentsTitle: "Elige un ánimo",
    complimentsBody: "Empecemos con palabras cálidas. Toca la tarjeta Piropos.",
    holdTitle: "Quédate en este instante",
    holdBody: "Toca el corazón y mantenlo pulsado unos 2,6 segundos. Es una muestra segura; no se guardará ni enviará nada.",
    demoTitle: "Un momento creado para ustedes",
    demoBody: "Esta es una muestra del tutorial. No crea una tarea real ni consume el límite de hoy.",
    finish: "Terminar recorrido",
    skip: "Saltar",
    step: "Paso",
    progressLabel: (step) => `Paso ${step} de 5`,
    dialog: "Presentación inicial de Touché",
  },
};

type Rect = { top: number; left: number; right: number; bottom: number; width: number; height: number };

const TARGETS: Partial<Record<TutorialStep, string>> = {
  2: '[data-testid="tutorial-mode-switcher"]',
  3: '[data-testid="button-category-compliments"]',
  4: '[data-testid="tutorial-heartbeat-target"]',
};

interface Props {
  lang: Lang;
  step: TutorialStep;
  suspended?: boolean;
  onStart: () => void;
  onFinish: () => void;
  onSkip: () => void;
}

export default function FirstRunTutorial({ lang, step, suspended = false, onStart, onFinish, onSkip }: Props) {
  const copy = COPY[lang];
  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const [viewport, setViewport] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [bubbleTop, setBubbleTop] = useState<number | null>(null);
  const cardRef = useRef<HTMLElement>(null);
  const primaryRef = useRef<HTMLButtonElement>(null);
  const skipRef = useRef<HTMLButtonElement>(null);
  const targetSelector = TARGETS[step];

  const measure = useCallback(() => {
    const width = window.visualViewport?.width ?? window.innerWidth;
    const height = window.visualViewport?.height ?? window.innerHeight;
    setViewport((previous) => previous.width === width && previous.height === height ? previous : { width, height });
    if (!targetSelector) {
      setTargetRect(null);
      return;
    }
    const element = document.querySelector<HTMLElement>(targetSelector);
    if (!element) {
      setTargetRect(null);
      return;
    }
    const r = element.getBoundingClientRect();
    const next = {
      top: Math.max(0, Math.min(height, r.top)),
      left: Math.max(0, Math.min(width, r.left)),
      right: Math.max(0, Math.min(width, r.right)),
      bottom: Math.max(0, Math.min(height, r.bottom)),
      width: Math.max(0, Math.min(width, r.right) - Math.max(0, r.left)),
      height: Math.max(0, Math.min(height, r.bottom) - Math.max(0, r.top)),
    };
    setTargetRect((previous) => {
      if (previous && Math.abs(previous.top - next.top) < 1 && Math.abs(previous.left - next.left) < 1
        && Math.abs(previous.width - next.width) < 1 && Math.abs(previous.height - next.height) < 1) return previous;
      return next;
    });
  }, [targetSelector]);

  useEffect(() => {
    if (suspended) return;
    measure();
    const tg = window.Telegram?.WebApp as any;
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    let observedTarget: Element | null = null;
    let observedCard: Element | null = null;
    const attachObserver = () => {
      const target = targetSelector ? document.querySelector(targetSelector) : null;
      if (target !== observedTarget || cardRef.current !== observedCard) {
        observer?.disconnect();
        observedTarget = target;
        observedCard = cardRef.current;
        if (observedTarget) observer?.observe(observedTarget);
        if (observedCard) observer?.observe(observedCard);
      }
    };
    attachObserver();
    const interval = window.setInterval(() => {
      measure();
      attachObserver();
    }, 140);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    window.visualViewport?.addEventListener("resize", measure);
    window.visualViewport?.addEventListener("scroll", measure);
    tg?.onEvent?.("viewportChanged", measure);
    tg?.onEvent?.("safeAreaChanged", measure);
    tg?.onEvent?.("contentSafeAreaInsetChanged", measure);
    return () => {
      observer?.disconnect();
      clearInterval(interval);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
      window.visualViewport?.removeEventListener("resize", measure);
      window.visualViewport?.removeEventListener("scroll", measure);
      tg?.offEvent?.("viewportChanged", measure);
      tg?.offEvent?.("safeAreaChanged", measure);
      tg?.offEvent?.("contentSafeAreaInsetChanged", measure);
    };
  }, [measure, suspended, targetSelector]);

  useEffect(() => {
    if (suspended || !targetSelector) return;
    const target = document.querySelector<HTMLElement>(targetSelector);
    target?.scrollIntoView({ block: "center", behavior: "auto" });
    measure();
  }, [measure, suspended, targetSelector]);

  useEffect(() => {
    if (!suspended) (primaryRef.current ?? skipRef.current)?.focus({ preventScroll: true });
  }, [step, suspended]);

  useEffect(() => {
    if (!targetRect || !cardRef.current || suspended || step === 5) {
      setBubbleTop(null);
      return;
    }
    const cardHeight = cardRef.current.getBoundingClientRect().height;
    const tg = window.Telegram?.WebApp as any;
    const safeTop = tg ? Math.max(92, (tg.safeAreaInset?.top ?? 0) + (tg.contentSafeAreaInset?.top ?? 0) + 18) : 14;
    const safeBottom = 18 + (tg?.safeAreaInset?.bottom ?? 0) + (tg?.contentSafeAreaInset?.bottom ?? 0);
    const above = targetRect.top - cardHeight - 14;
    const below = targetRect.bottom + 14;
    const fitsAbove = above >= safeTop;
    const fitsAtSafeTop = safeTop + cardHeight + 14 <= targetRect.top;
    const fitsBelow = below + cardHeight <= viewport.height - safeBottom;
    const preferred = fitsAbove ? above : fitsAtSafeTop ? safeTop : fitsBelow ? below : safeTop;
    setBubbleTop(Math.max(safeTop, Math.min(preferred, viewport.height - cardHeight - safeBottom)));
  }, [targetRect, viewport.height, step, suspended]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onSkip();
      }
    };
    if (!suspended) window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onSkip, suspended]);

  if (suspended) return null;

  const holePadding = 9;
  const hasTarget = !!targetRect && targetRect.width > 0 && targetRect.height > 0 && !!targetSelector && step !== 5;
  const hole = hasTarget ? {
    top: Math.max(0, targetRect!.top - holePadding),
    left: Math.max(0, targetRect!.left - holePadding),
    right: Math.min(viewport.width, targetRect!.right + holePadding),
    bottom: Math.min(viewport.height, targetRect!.bottom + holePadding),
  } : null;
  const tourTg = window.Telegram?.WebApp as any;
  const tourSafeTop = tourTg
    ? Math.max(92, (tourTg.safeAreaInset?.top ?? 0) + (tourTg.contentSafeAreaInset?.top ?? 0) + 18)
    : 14;
  const tourSafeBottom = 18 + (tourTg?.safeAreaInset?.bottom ?? 0) + (tourTg?.contentSafeAreaInset?.bottom ?? 0);
  const cardStyle = step === 1
    ? { top: (tourSafeTop + viewport.height - tourSafeBottom) / 2, transform: "translate(-50%, -50%)" }
    : step === 5
      ? {
          top: `max(${Math.max(
            14,
            (window.Telegram?.WebApp?.safeAreaInset?.top ?? 0)
              + (window.Telegram?.WebApp?.contentSafeAreaInset?.top ?? 0)
              + (window.Telegram?.WebApp ? 18 : 0),
          )}px, env(safe-area-inset-top))`,
          transform: "translateX(-50%)",
        }
      : { top: bubbleTop ?? "max(96px, env(safe-area-inset-top))", transform: "translateX(-50%)" };

  const panelStyle = (style: CSSProperties) => ({
    ...style,
    position: "fixed" as const,
    zIndex: 9000,
    background: "rgba(30, 22, 26, .69)",
    backdropFilter: "blur(2px)",
    touchAction: "none" as const,
  });

  return (
    <div className="first-run-tour" data-testid="tutorial-overlay">
      {hole ? (
        <>
          <div aria-hidden="true" className="first-run-tour__shade" style={panelStyle({ top: 0, left: 0, right: 0, height: hole.top })} />
          <div aria-hidden="true" className="first-run-tour__shade" style={panelStyle({ top: hole.bottom, left: 0, right: 0, bottom: 0 })} />
          <div aria-hidden="true" className="first-run-tour__shade" style={panelStyle({ top: hole.top, left: 0, width: hole.left, height: hole.bottom - hole.top })} />
          <div aria-hidden="true" className="first-run-tour__shade" style={panelStyle({ top: hole.top, left: hole.right, right: 0, height: hole.bottom - hole.top })} />
          <div aria-hidden="true" className="first-run-tour__spotlight" style={{ top: hole.top, left: hole.left, width: hole.right - hole.left, height: hole.bottom - hole.top }} />
        </>
      ) : step !== 5 ? (
        <div aria-hidden="true" className="first-run-tour__shade first-run-tour__shade--full" />
      ) : null}

      <section
        ref={cardRef}
        className={`first-run-tour__card${step === 1 ? " first-run-tour__card--welcome" : ""}${step === 5 ? " first-run-tour__card--result" : ""}`}
        style={{ left: "50%", ...cardStyle }}
        role="dialog"
        aria-modal={step !== 5}
        aria-labelledby="first-run-tour-title"
        aria-describedby="first-run-tour-description"
        data-testid="tutorial-dialog"
      >
        <div className="first-run-tour__topline">
          <span className="first-run-tour__brand">Touché <i>·</i> {copy.step} {String(step).padStart(2, "0")} / 05</span>
          <button ref={skipRef} type="button" className="first-run-tour__skip" onClick={onSkip} data-testid="tutorial-skip">
            {copy.skip}
          </button>
        </div>
        <div className="first-run-tour__progress" role="status" aria-live="polite" aria-label={copy.progressLabel(step)}>
          {Array.from({ length: 5 }, (_, index) => <span key={index} className={index < step ? "is-active" : ""} />)}
        </div>
        <p className="first-run-tour__eyebrow">{copy.dialog}</p>
        <h2 id="first-run-tour-title">
          {step === 1 ? copy.welcomeTitle
            : step === 2 ? copy.modeTitle
              : step === 3 ? copy.complimentsTitle
                : step === 4 ? copy.holdTitle : copy.demoTitle}
        </h2>
        <p id="first-run-tour-description">
          {step === 1 ? copy.welcomeBody
            : step === 2 ? copy.modeBody
              : step === 3 ? copy.complimentsBody
                : step === 4 ? copy.holdBody : copy.demoBody}
        </p>
        {(step === 1 || step === 5) && (
          <button
            ref={primaryRef}
            type="button"
            className="first-run-tour__primary"
            data-testid={step === 1 ? "tutorial-start" : "tutorial-finish"}
            onClick={step === 1 ? onStart : onFinish}
          >
            {step === 1 ? copy.start : copy.finish}
            <span aria-hidden="true">→</span>
          </button>
        )}
      </section>
    </div>
  );
}
