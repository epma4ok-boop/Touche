import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { Lang } from "@/data/i18n";

interface DueTask {
  taskId: string;
  category: string;
  task: string;
  createdAt: string;
}

type WishStatus = "pending" | "accepted" | "adjust" | "not_now";

interface SentWish {
  id: string;
  text: string;
  status: WishStatus;
  createdAt: string;
  milestone: number;
}

interface ReceivedWish {
  id: string;
  text: string;
  status: WishStatus;
  createdAt: string;
}

interface WishMapData {
  hearts: number;
  threshold: number;
  availableWishes: number;
  dueTasks: DueTask[];
  sentWishes: SentWish[];
  receivedWishes: ReceivedWish[];
}

interface WishMapProps {
  lang: Lang;
  coupleId: string | null;
  refreshKey: number;
  onOpenTask(taskId: string): void;
}

const COPY = {
  en: {
    eyebrow: "A private space for two",
    title: "Your Wish Diary",
    intro: "Keep the small things you share and your private wishes in one place.",
    stars: "stars",
    toNext: (n: number) => `${n} more to the next Wish Card`,
    cardReady: (n: number) => `${n} Wish Card${n === 1 ? "" : "s"} ready`,
    howItWorks: "One Wish Card unlocks every 20 stars. Stars stay yours; nothing is spent.",
    privateNote: "A wish is a request, never an obligation. Wish text stays here in the app.",
    taskHeading: "Daily task check-in",
    taskQuestion: "Did your partner complete their part of this shared task?",
    yes: "Yes, they did",
    no: "Not this time",
    starAwarded: "A star was added to your partner’s Wish Diary.",
    noStar: "Your answer was saved. No star is added, and there is no penalty.",
    alreadyAnswered: "You have already answered this check-in.",
    noAnswer: "No answer is okay. Nothing changes unless you choose.",
    noTasks: "No partner-completion check-ins are due right now.",
    openTask: "Open task",
    taskCategory: "Shared task",
    writeHeading: "Write a Wish Card",
    writePlaceholder: "A small thing I’d love to share…",
    createWish: "Keep this wish",
    createHint: "Only your partner will see it here, in the app.",
    receivedHeading: "A wish for you",
    sentHeading: "Your wishes",
    emptyReceived: "No wishes waiting for you. This space is just for the two of you.",
    emptySent: "Your Wish Cards will stay here, private between you.",
    pending: "Waiting for a reply",
    accepted: "Accepted",
    adjust: "Let’s discuss",
    not_now: "Not now",
    accept: "Accept",
    discuss: "Discuss or adjust",
    decline: "Not now",
    unavailable: "Connect as a couple to open your shared Wish Diary.",
    loading: "Opening your private Wish Diary…",
    error: "Your Wish Diary could not be loaded.",
    retry: "Try again",
    mutationError: "That didn’t go through. Please try again.",
    close: "Dismiss",
  },
  ru: {
    eyebrow: "Личное пространство для двоих",
    title: "Дневник желаний",
    intro: "Собирайте ваши общие моменты и храните личные желания в одном месте.",
    stars: "звёзд",
    toNext: (n: number) => `Ещё ${n} до следующей карточки желаний`,
    cardReady: (n: number) => `Доступно карточек желаний: ${n}`,
    howItWorks: "Одна карточка желания за каждые 20 звёзд. Звёзды сохраняются и не тратятся.",
    privateNote: "Желание — это просьба, а не обязанность. Текст карточки остаётся в приложении.",
    taskHeading: "Вопрос по заданию",
    taskQuestion: "Партнёр выполнил свою часть общего задания?",
    yes: "Да, выполнил",
    no: "В этот раз нет",
    starAwarded: "Партнёру добавлена звезда в Дневник желаний.",
    noStar: "Ответ сохранён. Звезда не начисляется, штрафа нет.",
    alreadyAnswered: "Вы уже ответили на этот вопрос.",
    noAnswer: "Можно не отвечать. Ничего не изменится, пока вы сами не выберете.",
    noTasks: "Пока нет заданий, по которым нужно спросить о выполнении партнёром.",
    openTask: "Открыть задание",
    taskCategory: "Общее задание",
    writeHeading: "Написать карточку желания",
    writePlaceholder: "Мне бы хотелось разделить с тобой…",
    createWish: "Сохранить желание",
    createHint: "Партнёр увидит его здесь, в приложении.",
    receivedHeading: "Желание для вас",
    sentHeading: "Ваши желания",
    emptyReceived: "Пока нет желаний для вас. Это пространство только для вас двоих.",
    emptySent: "Ваши карточки желаний останутся здесь, только между вами.",
    pending: "Ждёт ответа",
    accepted: "Принято",
    adjust: "Обсудить",
    not_now: "Не сейчас",
    accept: "Принять",
    discuss: "Обсудить или изменить",
    decline: "Не сейчас",
    unavailable: "Создайте пару, чтобы открыть общий Дневник желаний.",
    loading: "Открываем ваш Дневник желаний…",
    error: "Не удалось загрузить Дневник желаний.",
    retry: "Попробовать снова",
    mutationError: "Не получилось сохранить. Попробуйте ещё раз.",
    close: "Скрыть",
  },
  hi: {
    eyebrow: "आप दोनों के लिए निजी जगह",
    title: "आपकी इच्छा डायरी",
    intro: "साथ बिताए छोटे पलों और निजी इच्छाओं को एक जगह सहेजें।",
    stars: "तारे",
    toNext: (n: number) => `अगले इच्छा कार्ड के लिए ${n} और`,
    cardReady: (n: number) => `${n} इच्छा कार्ड उपलब्ध`,
    howItWorks: "हर 20 तारों पर एक इच्छा कार्ड मिलता है। तारे आपके पास रहते हैं; खर्च नहीं होते।",
    privateNote: "इच्छा एक अनुरोध है, कोई बाध्यता नहीं। इच्छा का पाठ ऐप में ही रहता है।",
    taskHeading: "काम के बारे में सवाल",
    taskQuestion: "क्या आपके साथी ने इस साझा काम में अपना हिस्सा पूरा किया?",
    yes: "हाँ, किया",
    no: "इस बार नहीं",
    starAwarded: "आपके साथी की इच्छा डायरी में एक तारा जुड़ गया।",
    noStar: "आपका जवाब सहेजा गया। कोई तारा नहीं जुड़ा और कोई दंड नहीं है।",
    alreadyAnswered: "आप इस सवाल का जवाब पहले ही दे चुके हैं।",
    noAnswer: "जवाब न देना भी ठीक है। आपके चुनने तक कुछ नहीं बदलेगा।",
    noTasks: "अभी साथी के काम के बारे में पूछने वाला कोई चेक-इन नहीं है।",
    openTask: "काम खोलें",
    taskCategory: "साझा काम",
    writeHeading: "इच्छा कार्ड लिखें",
    writePlaceholder: "मैं तुम्हारे साथ एक छोटी-सी बात…",
    createWish: "इच्छा सहेजें",
    createHint: "आपका साथी इसे यहाँ, ऐप में देखेगा।",
    receivedHeading: "आपके लिए एक इच्छा",
    sentHeading: "आपकी इच्छाएँ",
    emptyReceived: "अभी आपके लिए कोई इच्छा नहीं है। यह जगह सिर्फ़ आप दोनों की है।",
    emptySent: "आपके इच्छा कार्ड यहाँ, सिर्फ़ आप दोनों के बीच रहेंगे।",
    pending: "जवाब का इंतज़ार",
    accepted: "स्वीकार किया",
    adjust: "बात करें",
    not_now: "अभी नहीं",
    accept: "स्वीकारें",
    discuss: "बात करें या बदलें",
    decline: "अभी नहीं",
    unavailable: "साझा इच्छा डायरी खोलने के लिए पहले जोड़ी बनाएँ।",
    loading: "आपकी निजी इच्छा डायरी खुल रही है…",
    error: "इच्छा डायरी लोड नहीं हो सकी।",
    retry: "फिर कोशिश करें",
    mutationError: "यह सेव नहीं हो सका। फिर कोशिश करें।",
    close: "हटाएँ",
  },
  pt: {
    eyebrow: "Um espaço privado para vocês",
    title: "Diário de Desejos",
    intro: "Guardem os pequenos momentos juntos e os desejos privados em um só lugar.",
    stars: "estrelas",
    toNext: (n: number) => `Faltam ${n} para o próximo Cartão de Desejo`,
    cardReady: (n: number) => `${n} Cartão${n === 1 ? "" : "ões"} de Desejo disponível`,
    howItWorks: "Um Cartão de Desejo a cada 20 estrelas. As estrelas continuam com vocês; nada é gasto.",
    privateNote: "Um desejo é um pedido, nunca uma obrigação. O texto fica no app.",
    taskHeading: "Pergunta sobre a tarefa",
    taskQuestion: "Seu parceiro concluiu a parte dele desta tarefa compartilhada?",
    yes: "Sim, concluiu",
    no: "Desta vez, não",
    starAwarded: "Uma estrela foi adicionada ao Diário de Desejos do seu parceiro.",
    noStar: "Sua resposta foi salva. Nenhuma estrela é adicionada e não há penalidade.",
    alreadyAnswered: "Você já respondeu a esta pergunta.",
    noAnswer: "Tudo bem não responder. Nada muda até você escolher.",
    noTasks: "Não há perguntas pendentes sobre a parte do seu parceiro.",
    openTask: "Abrir tarefa",
    taskCategory: "Tarefa compartilhada",
    writeHeading: "Escreva um Cartão de Desejo",
    writePlaceholder: "Uma coisa simples que eu adoraria viver com você…",
    createWish: "Guardar desejo",
    createHint: "Seu parceiro verá o desejo aqui, no app.",
    receivedHeading: "Um desejo para você",
    sentHeading: "Seus desejos",
    emptyReceived: "Nenhum desejo esperando por você. Este espaço é só de vocês.",
    emptySent: "Seus Cartões de Desejo ficam aqui, em privado.",
    pending: "Aguardando resposta",
    accepted: "Aceito",
    adjust: "Vamos conversar",
    not_now: "Agora não",
    accept: "Aceitar",
    discuss: "Conversar ou ajustar",
    decline: "Agora não",
    unavailable: "Conectem-se como casal para abrir o Diário de Desejos compartilhado.",
    loading: "Abrindo seu Diário de Desejos…",
    error: "Não foi possível carregar seu Diário de Desejos.",
    retry: "Tentar novamente",
    mutationError: "Não foi possível salvar. Tente novamente.",
    close: "Dispensar",
  },
  es: {
    eyebrow: "Un espacio privado para ustedes",
    title: "Diario de Deseos",
    intro: "Guarden sus pequeños momentos y deseos privados en un mismo lugar.",
    stars: "estrellas",
    toNext: (n: number) => `Faltan ${n} para la próxima Tarjeta de Deseo`,
    cardReady: (n: number) => `${n} Tarjeta${n === 1 ? "" : "s"} de Deseo disponible${n === 1 ? "" : "s"}`,
    howItWorks: "Una Tarjeta de Deseo por cada 20 estrellas. Las estrellas se conservan; no se gastan.",
    privateNote: "Un deseo es una petición, nunca una obligación. El texto se queda en la app.",
    taskHeading: "Pregunta sobre la tarea",
    taskQuestion: "¿Tu pareja completó su parte de esta tarea compartida?",
    yes: "Sí, la completó",
    no: "Esta vez, no",
    starAwarded: "Se añadió una estrella al Diario de Deseos de tu pareja.",
    noStar: "La respuesta se guardó. No se añade una estrella ni hay penalización.",
    alreadyAnswered: "Ya respondiste a esta pregunta.",
    noAnswer: "No responder está bien. Nada cambia hasta que tú elijas.",
    noTasks: "Ahora no hay preguntas pendientes sobre la parte de tu pareja.",
    openTask: "Abrir tarea",
    taskCategory: "Tarea compartida",
    writeHeading: "Escribe una Tarjeta de Deseo",
    writePlaceholder: "Algo sencillo que me encantaría compartir contigo…",
    createWish: "Guardar deseo",
    createHint: "Tu pareja lo verá aquí, dentro de la app.",
    receivedHeading: "Un deseo para ti",
    sentHeading: "Tus deseos",
    emptyReceived: "No hay deseos esperando. Este espacio es solo para ustedes.",
    emptySent: "Tus Tarjetas de Deseo se quedan aquí, en privado.",
    pending: "Esperando respuesta",
    accepted: "Aceptado",
    adjust: "Hablemos",
    not_now: "Ahora no",
    accept: "Aceptar",
    discuss: "Hablar o ajustar",
    decline: "Ahora no",
    unavailable: "Conéctense como pareja para abrir su Diario de Deseos compartido.",
    loading: "Abriendo tu Diario de Deseos…",
    error: "No se pudo cargar el Diario de Deseos.",
    retry: "Intentar de nuevo",
    mutationError: "No se pudo guardar. Inténtalo de nuevo.",
    close: "Descartar",
  },
} satisfies Record<Lang, {
  eyebrow: string;
  title: string;
  intro: string;
  stars: string;
  toNext: (n: number) => string;
  cardReady: (n: number) => string;
  howItWorks: string;
  privateNote: string;
  taskHeading: string;
  taskQuestion: string;
  yes: string;
  no: string;
  starAwarded: string;
  noStar: string;
  alreadyAnswered: string;
  noAnswer: string;
  noTasks: string;
  openTask: string;
  taskCategory: string;
  writeHeading: string;
  writePlaceholder: string;
  createWish: string;
  createHint: string;
  receivedHeading: string;
  sentHeading: string;
  emptyReceived: string;
  emptySent: string;
  pending: string;
  accepted: string;
  adjust: string;
  not_now: string;
  accept: string;
  discuss: string;
  decline: string;
  unavailable: string;
  loading: string;
  error: string;
  retry: string;
  mutationError: string;
  close: string;
}>;

function getInitData(): string {
  return window.Telegram?.WebApp?.initData ?? "";
}

function statusCopy(status: WishStatus, t: (typeof COPY)[Lang]): string {
  return t[status];
}

function StarMark({ size = 19 }: { size?: number }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="m12 2.8 2.82 5.72 6.31.92-4.57 4.45 1.08 6.28L12 17.2l-5.64 2.97 1.08-6.28-4.57-4.45 6.31-.92L12 2.8Z" fill="currentColor" />
    </svg>
  );
}

function WishCard({ wish, t }: { wish: SentWish | ReceivedWish; t: (typeof COPY)[Lang] }) {
  return (
    <article className="wm-wish-card">
      <div className="wm-wish-top">
        <span className={`wm-status wm-status-${wish.status}`}>{statusCopy(wish.status, t)}</span>
        <span className="wm-wish-mark"><StarMark size={14} /></span>
      </div>
      <p className="wm-wish-text">{wish.text}</p>
    </article>
  );
}

const SETUP_REQUIRED_COPY: Record<Lang, string> = {
  en: "The Wish Diary database update is missing. Run migration_wish_map.sql in Supabase, then retry.",
  ru: "Не применено обновление базы Дневника желаний. Выполните migration_wish_map.sql в Supabase и повторите попытку.",
  hi: "Wish Diary के लिए डेटाबेस अपडेट लागू नहीं हुआ है। Supabase में migration_wish_map.sql चलाकर फिर प्रयास करें।",
  pt: "A atualização do banco do Wish Diary não foi aplicada. Execute migration_wish_map.sql no Supabase e tente novamente.",
  es: "Falta la actualización de la base de datos del Wish Diary. Ejecuta migration_wish_map.sql en Supabase y vuelve a intentarlo.",
};

export default function WishMap({ lang, coupleId, refreshKey, onOpenTask }: WishMapProps) {
  const t = COPY[lang];
  const [data, setData] = useState<WishMapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [setupRequired, setSetupRequired] = useState(false);
  const [loadDiagnosticCode, setLoadDiagnosticCode] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [wishText, setWishText] = useState("");
  const [attestMessage, setAttestMessage] = useState("");
  const requestId = useRef(0);

  const refresh = useCallback(async () => {
    const request = ++requestId.current;
    const initData = getInitData();
    if (!coupleId || !initData) {
      setData(null);
      setLoading(false);
      setLoadError(!!coupleId);
      setSetupRequired(false);
      setLoadDiagnosticCode(coupleId ? "telegram_session_missing" : "no_couple");
      return;
    }
    setLoading(true);
    setLoadError(false);
    setSetupRequired(false);
    setLoadDiagnosticCode(null);
    let diagnosticCode = "network_error";
    try {
      const response = await fetch("/api/couple/intimacy?action=wish_map", {
        headers: { "x-telegram-init-data": initData },
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        diagnosticCode = typeof body.diagnosticCode === "string"
          ? body.diagnosticCode
          : typeof body.error === "string" ? body.error : `http_${response.status}`;
        if (request === requestId.current) setLoadDiagnosticCode(diagnosticCode);
        if (body.error === "wish_map_setup_required" && request === requestId.current) {
          setSetupRequired(true);
        }
        throw new Error(body.error ?? "wish_map_unavailable");
      }
      diagnosticCode = "invalid_response";
      const result = await response.json() as WishMapData;
      if (request !== requestId.current) return;
      setData({
        hearts: Number(result.hearts ?? 0),
        threshold: Math.max(1, Number(result.threshold ?? 20)),
        availableWishes: Number(result.availableWishes ?? 0),
        dueTasks: Array.isArray(result.dueTasks) ? result.dueTasks : [],
        sentWishes: Array.isArray(result.sentWishes) ? result.sentWishes : [],
        receivedWishes: Array.isArray(result.receivedWishes) ? result.receivedWishes : [],
      });
      setLoadDiagnosticCode(null);
    } catch {
      if (request === requestId.current) {
        setLoadError(true);
        setLoadDiagnosticCode(diagnosticCode);
      }
    } finally {
      if (request === requestId.current) setLoading(false);
    }
  }, [coupleId]);

  useEffect(() => {
    void refresh();
    const refreshWhenActive = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    window.addEventListener("focus", refreshWhenActive);
    document.addEventListener("visibilitychange", refreshWhenActive);
    return () => {
      requestId.current += 1;
      window.removeEventListener("focus", refreshWhenActive);
      document.removeEventListener("visibilitychange", refreshWhenActive);
    };
  }, [refresh, refreshKey]);

  const post = async (action: string, body: Record<string, string | boolean>): Promise<Record<string, unknown>> => {
    const response = await fetch(`/api/couple/intimacy?action=${action}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-telegram-init-data": getInitData(),
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`${action}_failed`);
    return await response.json().catch(() => ({})) as Record<string, unknown>;
  };

  const attest = async (task: DueTask, partnerCompleted: boolean) => {
    const key = `task:${task.taskId}`;
    setPendingAction(key);
    setMutationError(false);
    setAttestMessage("");
    try {
      const result = await post("attest", { task_id: task.taskId, partner_completed: partnerCompleted });
      setAttestMessage(result.heartAdded === true
        ? t.starAwarded
        : partnerCompleted ? t.alreadyAnswered : t.noStar);
      setData((current) => current ? {
        ...current,
        dueTasks: current.dueTasks.filter((item) => item.taskId !== task.taskId),
      } : current);
      void refresh();
    } catch {
      setMutationError(true);
    } finally {
      setPendingAction(null);
    }
  };

  const createWish = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = wishText.trim();
    if (!text || !data || data.availableWishes < 1) return;
    setPendingAction("create");
    setMutationError(false);
    try {
      await post("create_wish", { wish_text: text, lang });
      const createdAt = new Date().toISOString();
      setData((current) => current ? {
        ...current,
        availableWishes: Math.max(0, current.availableWishes - 1),
        sentWishes: [{
          id: `local-${createdAt}`,
          text,
          status: "pending",
          createdAt,
          milestone: Math.floor(current.hearts / current.threshold) * current.threshold,
        }, ...current.sentWishes],
      } : current);
      setWishText("");
      void refresh();
    } catch {
      setMutationError(true);
    } finally {
      setPendingAction(null);
    }
  };

  const respond = async (wish: ReceivedWish, response: "accept" | "adjust" | "not_now") => {
    const key = `wish:${wish.id}`;
    const status: WishStatus = response === "accept" ? "accepted" : response;
    setPendingAction(key);
    setMutationError(false);
    try {
      await post("respond_wish", { wish_id: wish.id, response });
      setData((current) => current ? {
        ...current,
        receivedWishes: current.receivedWishes.map((item) => item.id === wish.id ? { ...item, status } : item),
      } : current);
      void refresh();
    } catch {
      setMutationError(true);
    } finally {
      setPendingAction(null);
    }
  };

  const stars = data?.hearts ?? 0;
  const threshold = data?.threshold ?? 20;
  const progress = Math.max(0, Math.min(100, (stars % threshold) / threshold * 100));
  const starsToNext = threshold - (stars % threshold);

  return (
    <section className="wm-shell" aria-labelledby="wm-title">
      <style>{`
        .wm-shell{--wm-paper:#fffaf3;--wm-ink:#162238;--wm-muted:#657080;--wm-coral:#ff6f61;--wm-line:rgba(22,34,56,.12);position:relative;isolation:isolate;overflow:hidden;border:1px solid rgba(22,34,56,.08);border-radius:22px;background:var(--wm-paper);color:var(--wm-ink);box-shadow:0 10px 28px rgba(36,44,58,.08);font-family:'DM Sans',sans-serif}
        .wm-shell:before{content:"";position:absolute;z-index:-1;right:-46px;top:-88px;width:210px;height:210px;border-radius:50%;background:radial-gradient(circle,rgba(255,111,97,.13),rgba(255,111,97,0) 68%);pointer-events:none}
        .wm-inner{padding:17px 17px 15px}
        .wm-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}
        .wm-eyebrow{margin:0 0 5px;color:#bc655b;font-size:10px;font-weight:800;letter-spacing:.13em;text-transform:uppercase}
        .wm-title{margin:0;font-family:'Space Grotesk','DM Sans',sans-serif;font-size:21px;line-height:1.08;letter-spacing:-.045em;font-weight:700}
        .wm-intro{max-width:290px;margin:7px 0 0;color:var(--wm-muted);font-size:12px;line-height:1.5}
        .wm-seal{display:grid;place-items:center;width:39px;height:39px;flex:none;border:1px solid rgba(255,111,97,.24);border-radius:50%;color:var(--wm-coral);background:rgba(255,255,255,.56)}
        .wm-progress{margin-top:16px;padding:12px;border-radius:15px;background:#f4eee5}
        .wm-progress-top{display:flex;align-items:center;justify-content:space-between;gap:10px}
        .wm-count{display:flex;align-items:center;gap:7px;font-size:13px;font-weight:750}
        .wm-count strong{font-variant-numeric:tabular-nums;font-size:18px;letter-spacing:-.04em}
        .wm-count-label{color:var(--wm-muted);font-size:10px;font-weight:650}
        .wm-availability{color:#a94f48;font-size:10px;font-weight:750;text-align:right}
        .wm-track{height:5px;margin-top:10px;overflow:hidden;border-radius:9px;background:#e3d9ce}
        .wm-track-fill{width:100%;height:100%;border-radius:9px;background:var(--wm-coral);transition:transform .35s ease;transform:scaleX(0);transform-origin:left center}
         .wm-progress-note{margin:8px 0 0;color:var(--wm-muted);font-size:10px;line-height:1.4}
         .wm-confirmation{margin-top:9px;padding:9px 10px;border:1px solid rgba(85,112,83,.18);border-radius:11px;background:#edf3e9;color:#486146;font-size:10px;line-height:1.45}
        .wm-privacy{display:flex;align-items:flex-start;gap:8px;margin:11px 1px 0;color:#626e7a;font-size:10px;line-height:1.45}
        .wm-privacy svg{flex:none;margin-top:1px;color:#bd655c}
        .wm-rule{height:1px;margin:14px 0;background:var(--wm-line)}
        .wm-section{margin-top:14px}
        .wm-section:first-child{margin-top:0}
        .wm-section-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:9px}
        .wm-section-title{margin:0;font-family:'Space Grotesk','DM Sans',sans-serif;font-size:14px;font-weight:700;letter-spacing:-.025em}
        .wm-task-list,.wm-wish-list{display:grid;gap:8px}
        .wm-task{padding:11px;border:1px solid var(--wm-line);border-radius:14px;background:rgba(255,255,255,.56)}
        .wm-task-row{display:flex;justify-content:space-between;align-items:flex-start;gap:8px}
        .wm-task-copy{min-width:0}
        .wm-task-kicker{margin:0 0 4px;color:#9b6d62;font-size:9px;font-weight:800;letter-spacing:.1em;text-transform:uppercase}
        .wm-task-name{margin:0;font-size:12px;font-weight:650;line-height:1.4}
        .wm-open-task{border:0;padding:2px 0;background:none;color:#ad5149;font:inherit;font-size:10px;font-weight:750;text-decoration:underline;text-underline-offset:3px;cursor:pointer;white-space:nowrap}
        .wm-question{margin:10px 0 7px;color:var(--wm-muted);font-size:10px}
        .wm-actions{display:flex;gap:7px;flex-wrap:wrap}
        .wm-btn{min-height:34px;border:1px solid rgba(22,34,56,.15);border-radius:10px;padding:7px 11px;background:transparent;color:var(--wm-ink);font:inherit;font-size:10px;font-weight:750;cursor:pointer;transition:background .16s ease,transform .16s ease}
        .wm-btn:hover:not(:disabled){transform:translateY(-1px);background:rgba(22,34,56,.045)}
        .wm-btn:focus-visible,.wm-open-task:focus-visible,.wm-textarea:focus-visible{outline:3px solid rgba(255,111,97,.4);outline-offset:2px}
        .wm-btn:disabled{opacity:.55;cursor:wait}
        .wm-btn-primary{border-color:var(--wm-coral);background:var(--wm-coral);color:#fffaf3}
        .wm-btn-primary:hover:not(:disabled){background:#ed6256}
        .wm-form{padding:12px;border:1px solid rgba(255,111,97,.22);border-radius:15px;background:rgba(255,255,255,.52)}
        .wm-textarea{display:block;width:100%;min-height:68px;resize:vertical;box-sizing:border-box;border:1px solid var(--wm-line);border-radius:10px;padding:9px 10px;background:#fffdf9;color:var(--wm-ink);font:inherit;font-size:12px;line-height:1.45}
        .wm-textarea::placeholder{color:#92959a}
        .wm-form-foot{display:flex;align-items:center;justify-content:space-between;gap:9px;margin-top:8px}
        .wm-hint{margin:0;color:var(--wm-muted);font-size:9px;line-height:1.4}
        .wm-wish-card{padding:10px 11px;border:1px solid var(--wm-line);border-radius:13px;background:rgba(255,255,255,.56)}
        .wm-wish-top{display:flex;justify-content:space-between;align-items:center;gap:8px}
        .wm-status{display:inline-flex;align-items:center;min-height:19px;border-radius:20px;padding:2px 8px;background:#f1e8dc;color:#716354;font-size:9px;font-weight:750}
        .wm-status-accepted{background:#e8eee4;color:#557053}
        .wm-status-adjust{background:#f6e9de;color:#986443}
        .wm-status-not_now{background:#ece9e4;color:#716e67}
        .wm-wish-mark{display:grid;place-items:center;color:#d17065}
        .wm-wish-text{margin:7px 0 1px;font-size:12px;line-height:1.5;overflow-wrap:anywhere}
        .wm-empty{padding:12px;border:1px dashed rgba(22,34,56,.2);border-radius:13px;color:var(--wm-muted);font-size:11px;line-height:1.55}
        .wm-empty-mark{display:flex;align-items:center;gap:7px;margin-bottom:5px;color:#bb6a60}
        .wm-empty-mark span{font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase}
        .wm-alert{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:10px;padding:9px 10px;border:1px solid rgba(169,79,72,.2);border-radius:11px;background:#fbefeb;color:#8d4942;font-size:10px;line-height:1.45}
        .wm-alert button{flex:none;border:0;background:transparent;color:inherit;font:inherit;font-weight:800;text-decoration:underline;cursor:pointer}
        .wm-skeleton{height:72px;margin-top:10px;border-radius:14px;background:#f1ebe2}
        .wm-skeleton-line{height:10px;width:58%;margin:0 0 8px;border-radius:6px;background:#e9e1d7}
        @media(min-width:560px){.wm-inner{padding:19px 20px 17px}.wm-title{font-size:23px}.wm-progress{padding:13px 14px}.wm-content-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:14px}.wm-content-grid>.wm-section{margin-top:0}.wm-divider{display:none}}
        @media(prefers-reduced-motion:reduce){.wm-shell *{animation:none!important;scroll-behavior:auto!important;transition:none!important}}
      `}</style>
      <div className="wm-inner">
        <header className="wm-head">
          <div>
            <p className="wm-eyebrow">{t.eyebrow}</p>
            <h2 className="wm-title" id="wm-title">{t.title}</h2>
            <p className="wm-intro">{t.intro}</p>
          </div>
          <span className="wm-seal"><StarMark size={20} /></span>
        </header>

        {coupleId && (
          <>
            {data ? (
              <>
                <div className="wm-progress" aria-label={`${stars} ${t.stars}`}>
                  <div className="wm-progress-top">
                    <div className="wm-count"><StarMark size={17} /><strong>{stars}</strong><span className="wm-count-label">{t.stars}</span></div>
                    <span className="wm-availability">{data.availableWishes > 0 ? t.cardReady(data.availableWishes) : t.toNext(starsToNext)}</span>
                  </div>
                  <div className="wm-track" role="progressbar" aria-label={t.toNext(starsToNext)} aria-valuemin={0} aria-valuemax={threshold} aria-valuenow={stars % threshold}>
                    <div className="wm-track-fill" style={{ transform: `scaleX(${progress / 100})` }} />
                  </div>
                  <p className="wm-progress-note">{t.howItWorks}</p>
                </div>
                <p className="wm-privacy"><StarMark size={13} /> <span>{t.privateNote}</span></p>
              </>
            ) : loading ? (
              <div className="wm-skeleton" aria-label={t.loading} role="status"><div className="wm-skeleton-line" /></div>
            ) : null}

            {loadError && (
              <div className="wm-alert" role="alert">
                <span>
                  {setupRequired ? SETUP_REQUIRED_COPY[lang] : t.error}
                  {!setupRequired && loadDiagnosticCode && <code style={{ marginInlineStart: 6 }}>{loadDiagnosticCode}</code>}
                </span>
                <button type="button" onClick={() => void refresh()}>{t.retry}</button>
              </div>
            )}
            {mutationError && (
              <div className="wm-alert" role="alert"><span>{t.mutationError}</span><button type="button" onClick={() => setMutationError(false)}>{t.close}</button></div>
            )}
            {attestMessage && <div className="wm-confirmation" role="status">{attestMessage}</div>}

            {data && (
              <>
                <div className="wm-rule" />
                <div className="wm-content-grid">
                  <section className="wm-section" aria-labelledby="wm-tasks-title">
                    <div className="wm-section-head"><h3 className="wm-section-title" id="wm-tasks-title">{t.taskHeading}</h3></div>
                    {data.dueTasks.length ? (
                      <div className="wm-task-list">
                        {data.dueTasks.map((task) => {
                          const busy = pendingAction === `task:${task.taskId}`;
                          return (
                            <article className="wm-task" key={task.taskId}>
                              <div className="wm-task-row">
                                <div className="wm-task-copy"><p className="wm-task-kicker">{t.taskCategory}</p><p className="wm-task-name">{task.task}</p></div>
                                <button className="wm-open-task" type="button" onClick={() => onOpenTask(task.taskId)}>{t.openTask}</button>
                              </div>
                              <p className="wm-question">{t.taskQuestion}</p>
                              <div className="wm-actions">
                                <button className="wm-btn wm-btn-primary" type="button" disabled={!!pendingAction} onClick={() => void attest(task, true)}>{t.yes}</button>
                                <button className="wm-btn" type="button" disabled={!!pendingAction} onClick={() => void attest(task, false)}>{t.no}</button>
                              </div>
                              <p className="wm-hint" style={{ marginTop: 7 }}>{busy ? t.loading : t.noAnswer}</p>
                            </article>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="wm-empty"><div className="wm-empty-mark"><StarMark size={14} /><span>{t.taskHeading}</span></div>{t.noTasks}</div>
                    )}
                  </section>

                  <section className="wm-section" aria-labelledby="wm-create-title">
                    <div className="wm-section-head"><h3 className="wm-section-title" id="wm-create-title">{t.writeHeading}</h3></div>
                    {data.availableWishes > 0 ? (
                      <form className="wm-form" onSubmit={createWish}>
                        <label className="wm-sr-only" htmlFor="wm-wish-input">{t.writeHeading}</label>
                        <textarea className="wm-textarea" id="wm-wish-input" value={wishText} onChange={(event) => setWishText(event.target.value)} placeholder={t.writePlaceholder} required />
                        <div className="wm-form-foot">
                          <p className="wm-hint">{t.createHint}</p>
                          <button className="wm-btn wm-btn-primary" type="submit" disabled={!wishText.trim() || !!pendingAction}>{pendingAction === "create" ? t.loading : t.createWish}</button>
                        </div>
                      </form>
                    ) : (
                      <div className="wm-empty"><div className="wm-empty-mark"><StarMark size={14} /><span>{t.cardReady(0)}</span></div>{t.toNext(starsToNext)}</div>
                    )}
                  </section>
                </div>

                <div className="wm-rule" />
                <div className="wm-content-grid">
                  <section className="wm-section" aria-labelledby="wm-received-title">
                    <div className="wm-section-head"><h3 className="wm-section-title" id="wm-received-title">{t.receivedHeading}</h3></div>
                    {data.receivedWishes.length ? (
                      <div className="wm-wish-list">
                        {data.receivedWishes.map((wish) => (
                          <div key={wish.id}>
                            <WishCard wish={wish} t={t} />
                            {wish.status === "pending" && (
                              <div className="wm-actions" style={{ marginTop: 7 }} aria-label={t.receivedHeading}>
                                <button className="wm-btn wm-btn-primary" type="button" disabled={!!pendingAction} onClick={() => void respond(wish, "accept")}>{t.accept}</button>
                                <button className="wm-btn" type="button" disabled={!!pendingAction} onClick={() => void respond(wish, "adjust")}>{t.discuss}</button>
                                <button className="wm-btn" type="button" disabled={!!pendingAction} onClick={() => void respond(wish, "not_now")}>{t.decline}</button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : <div className="wm-empty">{t.emptyReceived}</div>}
                  </section>

                  <section className="wm-section" aria-labelledby="wm-sent-title">
                    <div className="wm-section-head"><h3 className="wm-section-title" id="wm-sent-title">{t.sentHeading}</h3></div>
                    {data.sentWishes.length ? (
                      <div className="wm-wish-list">{data.sentWishes.map((wish) => <WishCard key={wish.id} wish={wish} t={t} />)}</div>
                    ) : <div className="wm-empty">{t.emptySent}</div>}
                  </section>
                </div>
              </>
            )}
          </>
        )}
        {!coupleId && (
          <div className="wm-empty" role="status" style={{ marginTop: 15 }}>
            <div className="wm-empty-mark"><StarMark size={15} /><span>{t.eyebrow}</span></div>{t.unavailable}
          </div>
        )}
      </div>
      <style>{`.wm-sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}`}</style>
    </section>
  );
}