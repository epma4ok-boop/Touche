import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { Lang } from "@/data/i18n";
import { TAROT_POSITIONS, drawTarotSpread, getTarotCard, getTarotText, isTarotSpread, tarotImageUrl } from "@/data/tarot";
import type { TarotDraw } from "@/data/tarot";
import tarotCardBack from "@/assets/tarot-card-back.svg";
import useTelegramTopInset from "./useTelegramTopInset";
import "./TarotScreen.css";

type Phase = "cards" | "reflection" | "done";
type Session = { v: 1; spread: TarotDraw[]; step: 0 | 1 | 2; revealed: boolean; phase: Phase };
type Props = { lang: Lang; onBack: () => void };

const KEY = "touche.tarot.session.v1";
const FINAL_QUESTION = "Что ты услышал(а) о себе сегодня? Что ты услышал(а) о нас?";

function loadSession(): Session | null {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Partial<Session>;
    if (!s || s.v !== 1 || !isTarotSpread(s.spread)) return null;
    if (s.step !== 0 && s.step !== 1 && s.step !== 2) return null;
    if (typeof s.revealed !== "boolean") return null;
    if (s.phase !== "cards" && s.phase !== "reflection" && s.phase !== "done") return null;
    return { v: 1, spread: s.spread, step: s.step, revealed: s.revealed, phase: s.phase };
  } catch { return null; }
}
function saveSession(s: Session | null) {
  try {
    if (s) window.sessionStorage.setItem(KEY, JSON.stringify(s));
    else window.sessionStorage.removeItem(KEY);
  } catch { /* storage unavailable: progress lives in memory only */ }
}

type Copy = {
  title: string; back: string; lead: string; positionsHead: string; positions: [string, string, string];
  rulesHead: string; rules: string[]; notice: string; start: string; resume: string; resumeNote: string; reset: string;
  confirmReset: string; confirmYes: string; confirmNo: string; cardOf: string; cardBack: string; reveal: string;
  pause: string; discussed: string; toReflection: string; reflectionHead: string; reflectionNote: string; finish: string;
  doneHead: string; doneNote: string; newSpread: string; toGames: string; loading: string; imgError: string; retry: string;
  authorNote: string; artAlt: string;
};

const COPY: Record<Lang, Copy> = {
  ru: {
    title: "Таро для двоих", back: "На главную",
    lead: "Три карты — три слоя одной встречи. Вы открываете их по очереди и говорите о каждой, прежде чем идти дальше.",
    positionsHead: "Три позиции",
    positions: ["Что видите — но не говорите", "Что чувствуете — но не показываете", "Что хотите — но не просите"],
    rulesHead: "Правила разговора",
    rules: ["Говорят оба — по очереди, не перебивая.", "Каждый говорит только о себе: «я замечаю», «мне», «я хочу».", "Не спорим, не защищаемся, не даём советов."],
    notice: "Карта — образ для разговора, а не диагноз и не предсказание. Можно не соглашаться с толкованием: важно то, что откликается именно вам.",
    start: "Разложить три карты", resume: "Продолжить расклад", resumeNote: "У вас есть незавершённый расклад.", reset: "Начать заново",
    confirmReset: "Сбросить незавершённый расклад? Карты будут вытянуты заново.", confirmYes: "Да, сбросить", confirmNo: "Оставить",
    cardOf: "Карта", cardBack: "Закрытая карта. Откройте, когда оба готовы.", reveal: "Открыть карту",
    pause: "Сделайте паузу. Пусть выскажутся оба. Говорите от себя: «я чувствую», «мне важно».",
    discussed: "Мы обсудили — дальше", toReflection: "Мы обсудили — к итогу",
    reflectionHead: "Последний вопрос", reflectionNote: "Ответьте вслух, каждый по очереди. Ничего не нужно записывать.",
    finish: "Завершить", doneHead: "Ваш расклад", doneNote: "Спасибо, что выслушали друг друга.", newSpread: "Новый расклад", toGames: "На главную",
    loading: "Загружаем изображение", imgError: "Изображение не загрузилось.", retry: "Повторить", authorNote: "", artAlt: "Иллюстрация карты",
  },
  en: {
    title: "Tarot for two", back: "Home",
    lead: "Three cards, three layers of one conversation. Open them one at a time and talk about each before moving on.",
    positionsHead: "Three positions",
    positions: ["What you see but don't say", "What you feel but don't show", "What you want but don't ask for"],
    rulesHead: "Conversation rules",
    rules: ["You both speak, in turn, without interrupting.", "Each speaks only about themselves: \"I notice\", \"I feel\", \"I want\".", "No arguing, no defending, no advice."],
    notice: "A card is an image for conversation, not a diagnosis or a prediction. You don't have to agree with the interpretation.",
    start: "Lay out three cards", resume: "Continue spread", resumeNote: "You have an unfinished spread.", reset: "Start over",
    confirmReset: "Reset the unfinished spread? New cards will be drawn.", confirmYes: "Yes, reset", confirmNo: "Keep it",
    cardOf: "Card", cardBack: "Face-down card. Open it when you are both ready.", reveal: "Reveal card",
    pause: "Pause. Let both of you speak. Use I statements: \"I feel\", \"it matters to me\".",
    discussed: "We've discussed it, next", toReflection: "We've discussed it, to the closing",
    reflectionHead: "Closing question", reflectionNote: "Answer aloud, one at a time. Nothing is recorded.",
    finish: "Finish", doneHead: "Your spread", doneNote: "Thank you for hearing each other.", newSpread: "New spread", toGames: "Home",
    loading: "Loading image", imgError: "The image didn't load.", retry: "Retry",
    authorNote: "Card names and the closing question remain in Russian, as in the original.", artAlt: "Card illustration",
  },
  hi: {
    title: "दो के लिए टैरो", back: "होम",
    lead: "तीन कार्ड, एक बातचीत की तीन परतें। उन्हें एक-एक करके खोलें और आगे बढ़ने से पहले हर एक पर बात करें।",
    positionsHead: "तीन स्थितियाँ",
    positions: ["जो आप देखते हैं पर कहते नहीं", "जो आप महसूस करते हैं पर दिखाते नहीं", "जो आप चाहते हैं पर माँगते नहीं"],
    rulesHead: "बातचीत के नियम",
    rules: ["दोनों बोलें, बारी-बारी से, बिना टोके।", "हर कोई सिर्फ़ अपने बारे में बोले: \"मैं महसूस करता/करती हूँ\"।", "बहस नहीं, बचाव नहीं, सलाह नहीं।"],
    notice: "कार्ड बातचीत के लिए एक छवि है, निदान या भविष्यवाणी नहीं। व्याख्या से सहमत होना ज़रूरी नहीं।",
    start: "तीन कार्ड बिछाएँ", resume: "जारी रखें", resumeNote: "आपका एक अधूरा स्प्रेड है।", reset: "फिर से शुरू करें",
    confirmReset: "अधूरा स्प्रेड रीसेट करें? नए कार्ड निकाले जाएँगे।", confirmYes: "हाँ, रीसेट", confirmNo: "रहने दें",
    cardOf: "कार्ड", cardBack: "उल्टा कार्ड। जब दोनों तैयार हों, खोलें।", reveal: "कार्ड खोलें",
    pause: "रुकें। दोनों को बोलने दें। \"मैं\" से वाक्य शुरू करें।",
    discussed: "हमने बात कर ली, आगे", toReflection: "हमने बात कर ली, समापन",
    reflectionHead: "अंतिम प्रश्न", reflectionNote: "बारी-बारी से ज़ोर से जवाब दें। कुछ भी दर्ज नहीं होता।",
    finish: "समाप्त", doneHead: "आपका स्प्रेड", doneNote: "एक-दूसरे को सुनने के लिए धन्यवाद।", newSpread: "नया स्प्रेड", toGames: "होम",
    loading: "छवि लोड हो रही है", imgError: "छवि लोड नहीं हुई।", retry: "फिर कोशिश करें",
    authorNote: "मूल रूप में कार्डों के नाम और अंतिम प्रश्न रूसी में ही रखे गए हैं।", artAlt: "कार्ड चित्र",
  },
  pt: {
    title: "Tarô para dois", back: "Início",
    lead: "Três cartas, três camadas de uma conversa. Abram uma de cada vez e conversem sobre cada uma antes de seguir.",
    positionsHead: "Três posições",
    positions: ["O que veem, mas não dizem", "O que sentem, mas não mostram", "O que querem, mas não pedem"],
    rulesHead: "Regras da conversa",
    rules: ["Os dois falam, em turnos, sem interromper.", "Cada um fala só de si: \"eu percebo\", \"eu sinto\", \"eu quero\".", "Sem discutir, sem se defender, sem dar conselhos."],
    notice: "A carta é uma imagem para conversar, não um diagnóstico nem uma previsão. Não precisam concordar com a interpretação.",
    start: "Abrir três cartas", resume: "Continuar tiragem", resumeNote: "Vocês têm uma tiragem não concluída.", reset: "Recomeçar",
    confirmReset: "Descartar a tiragem não concluída? Novas cartas serão tiradas.", confirmYes: "Sim, recomeçar", confirmNo: "Manter",
    cardOf: "Carta", cardBack: "Carta virada. Abram quando os dois estiverem prontos.", reveal: "Revelar carta",
    pause: "Pausa. Deixem os dois falarem. Usem frases com \"eu\".",
    discussed: "Conversamos, próxima", toReflection: "Conversamos, ao fechamento",
    reflectionHead: "Pergunta final", reflectionNote: "Respondam em voz alta, um de cada vez. Nada é registrado.",
    finish: "Concluir", doneHead: "Sua tiragem", doneNote: "Obrigado por se ouvirem.", newSpread: "Nova tiragem", toGames: "Início",
    loading: "Carregando imagem", imgError: "A imagem não carregou.", retry: "Tentar de novo",
    authorNote: "Os nomes das cartas e a pergunta final permanecem em russo, como no original.", artAlt: "Ilustração da carta",
  },
  es: {
    title: "Tarot para dos", back: "Inicio",
    lead: "Tres cartas, tres capas de una conversación. Ábranlas una a una y hablen de cada una antes de seguir.",
    positionsHead: "Tres posiciones",
    positions: ["Lo que ven pero no dicen", "Lo que sienten pero no muestran", "Lo que quieren pero no piden"],
    rulesHead: "Reglas de la conversación",
    rules: ["Hablan los dos, por turnos, sin interrumpir.", "Cada uno habla solo de sí: \"yo noto\", \"yo siento\", \"yo quiero\".", "Sin discutir, sin defenderse, sin dar consejos."],
    notice: "La carta es una imagen para conversar, no un diagnóstico ni una predicción. No hace falta estar de acuerdo con la interpretación.",
    start: "Sacar tres cartas", resume: "Continuar tirada", resumeNote: "Tienen una tirada sin terminar.", reset: "Empezar de nuevo",
    confirmReset: "¿Descartar la tirada sin terminar? Se sacarán cartas nuevas.", confirmYes: "Sí, descartar", confirmNo: "Conservar",
    cardOf: "Carta", cardBack: "Carta boca abajo. Ábranla cuando ambos estén listos.", reveal: "Revelar carta",
    pause: "Pausa. Que hablen los dos. Usen frases en primera persona.",
    discussed: "Ya lo hablamos, siguiente", toReflection: "Ya lo hablamos, al cierre",
    reflectionHead: "Pregunta final", reflectionNote: "Respondan en voz alta, por turnos. No se guarda nada.",
    finish: "Terminar", doneHead: "Su tirada", doneNote: "Gracias por escucharse.", newSpread: "Nueva tirada", toGames: "Inicio",
    loading: "Cargando imagen", imgError: "La imagen no se cargó.", retry: "Reintentar",
    authorNote: "Los nombres de las cartas y la pregunta final se mantienen en ruso, como en el original.", artAlt: "Ilustración de la carta",
  },
};

function CardArt({ image, alt, copy }: { image: string; alt: string; copy: Copy }) {
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");
  const [attempt, setAttempt] = useState(0);
  const src = tarotImageUrl(image) + (attempt ? `?r=${attempt}` : "");
  return (
    <figure className="tarot-art" data-state={state}>
      {state !== "error" && (
        <img key={src} src={src} alt={alt} decoding="async" onLoad={() => setState("ok")} onError={() => setState("error")} data-testid="img-tarot-card" />
      )}
      {state === "loading" && <span className="tarot-art__skeleton" role="status" aria-label={copy.loading} />}
      {state === "error" && (
        <div className="tarot-art__error" role="alert">
          <span>{copy.imgError}</span>
          <button type="button" className="tarot-btn tarot-btn--ghost" onClick={() => { setAttempt(a => a + 1); setState("loading"); }} data-testid="button-tarot-image-retry">{copy.retry}</button>
        </div>
      )}
    </figure>
  );
}

function BackIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 18 9 12l6-6" /></svg>;
}

export default function TarotScreen({ lang, onBack }: Props) {
  const top = useTelegramTopInset();
  const copy = COPY[lang];
  const [session, setSession] = useState<Session | null>(() => loadSession());
  const [view, setView] = useState<"intro" | "play">("intro");
  const [confirming, setConfirming] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => { saveSession(session); }, [session]);
  useEffect(() => { headingRef.current?.focus(); }, [view, session?.step, session?.phase, session?.revealed]);

  const start = () => {
    setSession({ v: 1, spread: drawTarotSpread(), step: 0, revealed: false, phase: "cards" });
    setConfirming(false);
    setView("play");
  };
  const update = (patch: Partial<Session>) => setSession(s => (s ? { ...s, ...patch } : s));
  const unfinished = session && session.phase !== "done";

  const header = (
    <header className="tarot__header">
      <button type="button" className="tarot__back" onClick={onBack} aria-label={copy.back} data-testid="button-tarot-back">
        <BackIcon />
      </button>
      <span className="tarot__brand">Touch<em>é</em></span>
      <span />
    </header>
  );

  const authorNote = copy.authorNote && <p className="tarot__ru-note" data-testid="text-tarot-original-language">{copy.authorNote}</p>;

  let body;
  if (view === "intro" || !session) {
    body = (
      <section className="tarot__intro tarot-enter">
        <span className="tarot__eyebrow">18+ <i /> TOUCHÉ</span>
        <h1 ref={headingRef} tabIndex={-1}>{copy.title}</h1>
        <p className="tarot__lead">{copy.lead}</p>
        <div className="tarot__panel">
          <h2>{copy.positionsHead}</h2>
          <ol className="tarot__positions">
            {TAROT_POSITIONS.map((p, i) => (
              <li key={p.layer}><span>0{i + 1}</span><div><strong lang="ru">{p.title}</strong><small lang="ru">{p.subtitle}</small>{lang !== "ru" && <small>{copy.positions[i]}</small>}</div></li>
            ))}
          </ol>
        </div>
        <div className="tarot__panel">
          <h2>{copy.rulesHead}</h2>
          <ul className="tarot__rules">{copy.rules.map(r => <li key={r}>{r}</li>)}</ul>
        </div>
        <p className="tarot__notice">{copy.notice}</p>
        {authorNote}
        <div className="tarot__actions">
          {unfinished ? (
            <>
              <p className="tarot__resume-note">{copy.resumeNote}</p>
              <button type="button" className="tarot-btn" onClick={() => setView("play")} data-testid="button-tarot-resume">{copy.resume}</button>
              {confirming ? (
                <div className="tarot__confirm" role="alertdialog" aria-label={copy.confirmReset}>
                  <p>{copy.confirmReset}</p>
                  <div>
                    <button type="button" className="tarot-btn tarot-btn--danger" onClick={start} data-testid="button-tarot-reset-confirm">{copy.confirmYes}</button>
                    <button type="button" className="tarot-btn tarot-btn--ghost" onClick={() => setConfirming(false)} data-testid="button-tarot-reset-cancel">{copy.confirmNo}</button>
                  </div>
                </div>
              ) : (
                <button type="button" className="tarot-btn tarot-btn--ghost" onClick={() => setConfirming(true)} data-testid="button-tarot-reset">{copy.reset}</button>
              )}
            </>
          ) : (
            <button type="button" className="tarot-btn" onClick={start} data-testid="button-tarot-start">{copy.start}</button>
          )}
        </div>
      </section>
    );
  } else if (session.phase === "cards") {
    const draw = session.spread[session.step];
    const card = getTarotCard(draw);
    const pos = TAROT_POSITIONS[session.step];
    const last = session.step === 2;
    body = (
      <section className="tarot__stage" key={`${session.step}-${session.revealed}`}>
        <div className="tarot__progress" aria-label={`${copy.cardOf} ${session.step + 1} / 3`}>
          {[0, 1, 2].map(i => <span key={i} data-on={i <= session.step} />)}
        </div>
        <p className="tarot__pos-index">{copy.cardOf} {session.step + 1} / 3</p>
        <h1 ref={headingRef} tabIndex={-1} lang="ru" className="tarot__pos-title" data-testid="text-tarot-position">{pos.title}</h1>
        <p lang="ru" className="tarot__pos-sub">{pos.subtitle}{lang !== "ru" && <span lang={lang}> · {copy.positions[session.step]}</span>}</p>
        {!session.revealed ? (
          <div className="tarot-enter">
            <button type="button" className="tarot-cardback" onClick={() => update({ revealed: true })} aria-label={`${copy.reveal}. ${copy.cardBack}`} data-testid="button-tarot-cardback">
              <img className="tarot-cardback__image" src={tarotCardBack} alt="" aria-hidden="true" draggable={false} />
            </button>
            <p className="tarot__hint">{copy.cardBack}</p>
            <button type="button" className="tarot-btn" onClick={() => update({ revealed: true })} data-testid="button-tarot-reveal">{copy.reveal}</button>
          </div>
        ) : (
          <div className="tarot-reveal">
            <CardArt image={draw.image} alt={`${copy.artAlt}: ${card.title}`} copy={copy} />
            <h2 lang="ru" className="tarot__card-title" data-testid="text-tarot-card-title">{card.title}</h2>
            <p lang={lang} className="tarot__card-text" data-testid="text-tarot-card-text">{getTarotText(card, pos.layer, lang)}</p>
            {authorNote}
            <p className="tarot__pause" role="note">{copy.pause}</p>
            <button type="button" className="tarot-btn" data-testid="button-tarot-next"
              onClick={() => (last ? update({ phase: "reflection" }) : update({ step: (session.step + 1) as 1 | 2, revealed: false }))}>
              {last ? copy.toReflection : copy.discussed}
            </button>
          </div>
        )}
      </section>
    );
  } else if (session.phase === "reflection") {
    body = (
      <section className="tarot__stage tarot-enter">
        <p className="tarot__pos-index">{copy.reflectionHead}</p>
        <h1 ref={headingRef} tabIndex={-1} lang="ru" className="tarot__question" data-testid="text-tarot-final-question">{FINAL_QUESTION}</h1>
        {authorNote}
        <p className="tarot__hint">{copy.reflectionNote}</p>
        <button type="button" className="tarot-btn" onClick={() => update({ phase: "done" })} data-testid="button-tarot-finish">{copy.finish}</button>
      </section>
    );
  } else {
    body = (
      <section className="tarot__stage tarot-enter">
        <h1 ref={headingRef} tabIndex={-1} className="tarot__done-title">{copy.doneHead}</h1>
        <ol className="tarot__summary">
          {session.spread.map((d, i) => {
            const c = getTarotCard(d);
            return (
              <li key={d.cardId} data-testid={`row-tarot-summary-${i}`}>
                <span>0{i + 1}</span>
                <div><small lang="ru">{TAROT_POSITIONS[i].title}</small><strong lang="ru">{c.title}</strong></div>
              </li>
            );
          })}
        </ol>
        <p className="tarot__hint">{copy.doneNote}</p>
        <button type="button" className="tarot-btn" onClick={start} data-testid="button-tarot-restart">{copy.newSpread}</button>
        <button type="button" className="tarot-btn tarot-btn--ghost" onClick={onBack} data-testid="button-tarot-to-home">{copy.toGames}</button>
      </section>
    );
  }

  return (
    <main className="tarot" style={{ "--tarot-top": `${top}px` } as CSSProperties}>
      {header}
      <div className="tarot__body">
        <div className={`tarot__composition tarot__composition--${view}`}>
          <div className="tarot__folio" aria-hidden="true"><span>TOUCHÉ / 18+</span><span>01 — 03</span></div>
          {body}
        </div>
      </div>
    </main>
  );
}
