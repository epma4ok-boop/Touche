import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { createPortal } from "react-dom";
import type { Lang } from "@/data/i18n";
import { createWishShareImage } from "../utils/wishShareImage";

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
  nextMilestone: number | null;
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
    privateNote: "A wish is a request, never an obligation.",
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
    createWish: "Send to partner",
    deliverySent: "Sent.",
    deliveryFailed: "Your wish is saved, but Telegram could not send the image.",
    wishAlreadySaved: "This wish was already saved, so it won’t be created twice. Resend the image only if needed.",
    deliveryRetry: "Send again",
    receivedHeading: "A wish for you",
    sentHeading: "Your wishes",
    openWish: "Open wish card",
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
    close: "Close",
  },
  ru: {
    eyebrow: "Личное пространство для двоих",
    title: "Дневник желаний",
    intro: "Собирайте ваши общие моменты и храните личные желания в одном месте.",
    stars: "звёзд",
    toNext: (n: number) => `Ещё ${n} до следующей карточки желаний`,
    cardReady: (n: number) => `Доступно карточек желаний: ${n}`,
    howItWorks: "Одна карточка желания за каждые 20 звёзд. Звёзды сохраняются и не тратятся.",
    privateNote: "Желание — просьба, а не обязанность.",
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
    createWish: "Отправить партнёру",
    deliverySent: "Отправлено.",
    deliveryFailed: "Желание сохранено, но Telegram не смог отправить картинку.",
    wishAlreadySaved: "Это желание уже сохранено и повторно не создастся. При необходимости можно ещё раз отправить картинку.",
    deliveryRetry: "Отправить ещё раз",
    receivedHeading: "Желание для вас",
    sentHeading: "Ваши желания",
    openWish: "Открыть карточку",
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
    close: "Закрыть",
  },
  hi: {
    eyebrow: "आप दोनों के लिए निजी जगह",
    title: "आपकी इच्छा डायरी",
    intro: "साथ बिताए छोटे पलों और निजी इच्छाओं को एक जगह सहेजें।",
    stars: "तारे",
    toNext: (n: number) => `अगले इच्छा कार्ड के लिए ${n} और`,
    cardReady: (n: number) => `${n} इच्छा कार्ड उपलब्ध`,
    howItWorks: "हर 20 तारों पर एक इच्छा कार्ड मिलता है। तारे आपके पास रहते हैं; खर्च नहीं होते।",
    privateNote: "इच्छा एक अनुरोध है, कोई बाध्यता नहीं।",
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
    createWish: "साथी को भेजें",
    deliverySent: "भेज दिया गया।",
    deliveryFailed: "इच्छा सहेज ली गई, लेकिन Telegram तस्वीर नहीं भेज सका।",
    wishAlreadySaved: "यह इच्छा पहले ही सहेजी जा चुकी है, इसलिए दोबारा नहीं बनेगी। ज़रूरत हो तो तस्वीर फिर भेजें।",
    deliveryRetry: "फिर भेजें",
    receivedHeading: "आपके लिए एक इच्छा",
    sentHeading: "आपकी इच्छाएँ",
    openWish: "इच्छा कार्ड खोलें",
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
    close: "बंद करें",
  },
  pt: {
    eyebrow: "Um espaço privado para vocês",
    title: "Diário de Desejos",
    intro: "Guardem os pequenos momentos juntos e os desejos privados em um só lugar.",
    stars: "estrelas",
    toNext: (n: number) => `Faltam ${n} para o próximo Cartão de Desejo`,
    cardReady: (n: number) => `${n} Cartão${n === 1 ? "" : "ões"} de Desejo disponível`,
    howItWorks: "Um Cartão de Desejo a cada 20 estrelas. As estrelas continuam com vocês; nada é gasto.",
    privateNote: "Um desejo é um pedido, nunca uma obrigação.",
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
    createWish: "Enviar ao parceiro",
    deliverySent: "Cartão enviado.",
    deliveryFailed: "O desejo foi salvo, mas o Telegram não conseguiu enviar a imagem.",
    wishAlreadySaved: "Este desejo já foi salvo e não será criado duas vezes. Reenvie a imagem apenas se precisar.",
    deliveryRetry: "Enviar novamente",
    receivedHeading: "Um desejo para você",
    sentHeading: "Seus desejos",
    openWish: "Abrir cartão",
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
    close: "Fechar",
  },
  es: {
    eyebrow: "Un espacio privado para ustedes",
    title: "Diario de Deseos",
    intro: "Guarden sus pequeños momentos y deseos privados en un mismo lugar.",
    stars: "estrellas",
    toNext: (n: number) => `Faltan ${n} para la próxima Tarjeta de Deseo`,
    cardReady: (n: number) => `${n} Tarjeta${n === 1 ? "" : "s"} de Deseo disponible${n === 1 ? "" : "s"}`,
    howItWorks: "Una Tarjeta de Deseo por cada 20 estrellas. Las estrellas se conservan; no se gastan.",
    privateNote: "Un deseo es una petición, nunca una obligación.",
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
    createWish: "Enviar a mi pareja",
    deliverySent: "Tarjeta enviada.",
    deliveryFailed: "El deseo se guardó, pero Telegram no pudo enviar la imagen.",
    wishAlreadySaved: "Este deseo ya está guardado y no se creará otra vez. Reenvía la imagen solo si hace falta.",
    deliveryRetry: "Volver a enviar",
    receivedHeading: "Un deseo para ti",
    sentHeading: "Tus deseos",
    openWish: "Abrir tarjeta",
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
    close: "Cerrar",
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
  deliverySent: string;
  deliveryFailed: string;
  wishAlreadySaved: string;
  deliveryRetry: string;
  receivedHeading: string;
  sentHeading: string;
  openWish: string;
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

type WishSource = "received" | "sent";

interface ActiveWish {
  wish: SentWish | ReceivedWish;
  source: WishSource;
}

interface WishDeliveryState {
  delivered: boolean;
  alreadySaved: boolean;
  wishId: string | null;
  imageData: string | null;
}

interface PendingWishRequest {
  wishId: string;
  milestone: number;
  text: string;
  imageData: string;
}

function WishCard({
  wish,
  t,
  source,
  onOpen,
}: {
  wish: SentWish | ReceivedWish;
  t: (typeof COPY)[Lang];
  source: WishSource;
  onOpen(wish: SentWish | ReceivedWish, source: WishSource, trigger: HTMLButtonElement): void;
}) {
  return (
    <button
      className="wm-wish-card"
      type="button"
      aria-haspopup="dialog"
      aria-label={`${t.openWish}: ${wish.text}`}
      onClick={(event) => onOpen(wish, source, event.currentTarget)}
    >
      <span className="wm-wish-top">
        <span className={`wm-status wm-status-${wish.status}`}>{statusCopy(wish.status, t)}</span>
        <span className="wm-wish-mark"><StarMark size={14} /></span>
      </span>
      <span className="wm-wish-text">{wish.text}</span>
      <span className="wm-card-open">
        {t.openWish}
        <svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none">
          <path d="M5 12h13M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </button>
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
  const [wishDelivery, setWishDelivery] = useState<WishDeliveryState | null>(null);
  const [pendingWishRequest, setPendingWishRequest] = useState<PendingWishRequest | null>(null);
  const pendingWishRequestRef = useRef<PendingWishRequest | null>(null);
  const [attestMessage, setAttestMessage] = useState("");
  const requestId = useRef(0);
  const [diaryOpen, setDiaryOpen] = useState(false);
  const diaryTriggerRef = useRef<HTMLButtonElement>(null);
  const diaryDialogRef = useRef<HTMLDivElement>(null);
  const diaryCloseButtonRef = useRef<HTMLButtonElement>(null);
  const [selectedWish, setSelectedWish] = useState<ActiveWish | null>(null);
  const [flightOrigin, setFlightOrigin] = useState<Pick<DOMRect, "left" | "top" | "width" | "height"> | null>(null);
  const [flightStyle, setFlightStyle] = useState<{
    x: number;
    y: number;
    scaleX: number;
    scaleY: number;
    isAtOrigin: boolean;
  } | null>(null);
  const modalCardRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLButtonElement | null>(null);
  const dialogOpen = selectedWish !== null;

  const openWish = (wish: SentWish | ReceivedWish, source: WishSource, trigger: HTMLButtonElement) => {
    const { left, top, width, height } = trigger.getBoundingClientRect();
    openerRef.current = trigger;
    setFlightOrigin({ left, top, width, height });
    setFlightStyle(null);
    setSelectedWish({ wish, source });
  };

  const closeWish = () => {
    setSelectedWish(null);
    setFlightOrigin(null);
    setFlightStyle(null);
  };

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
        nextMilestone: Number.isFinite(Number(result.nextMilestone)) && Number(result.nextMilestone) > 0
          ? Number(result.nextMilestone)
          : null,
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
    pendingWishRequestRef.current = null;
    setPendingWishRequest(null);
    setWishText("");
    setWishDelivery(null);
  }, [coupleId]);

  useEffect(() => {
    if (!pendingWishRequestRef.current) void refresh();
    const refreshWhenActive = () => {
      if (document.visibilityState === "visible" && !pendingWishRequestRef.current) void refresh();
    };
    window.addEventListener("focus", refreshWhenActive);
    document.addEventListener("visibilitychange", refreshWhenActive);
    return () => {
      requestId.current += 1;
      window.removeEventListener("focus", refreshWhenActive);
      document.removeEventListener("visibilitychange", refreshWhenActive);
    };
  }, [refresh, refreshKey]);

  useLayoutEffect(() => {
    if (!selectedWish || !flightOrigin || !modalCardRef.current) return;

    const target = modalCardRef.current.getBoundingClientRect();
    const x = flightOrigin.left + flightOrigin.width / 2 - (target.left + target.width / 2);
    const y = flightOrigin.top + flightOrigin.height / 2 - (target.top + target.height / 2);
    const scaleX = Math.max(0.12, Math.min(1, flightOrigin.width / target.width));
    const scaleY = Math.max(0.12, Math.min(1, flightOrigin.height / target.height));
    const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

    setFlightStyle({ x, y, scaleX, scaleY, isAtOrigin: !prefersReducedMotion });
    if (prefersReducedMotion) return;

    let secondFrame = 0;
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => {
        setFlightStyle({ x, y, scaleX, scaleY, isAtOrigin: false });
      });
    });
    return () => {
      cancelAnimationFrame(firstFrame);
      if (secondFrame) cancelAnimationFrame(secondFrame);
    };
  }, [flightOrigin, selectedWish]);

  useEffect(() => {
    if (!dialogOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusFrame = requestAnimationFrame(() => closeButtonRef.current?.focus());
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedWish(null);
        setFlightOrigin(null);
        setFlightStyle(null);
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = Array.from(
        modalRef.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled),[href],input:not(:disabled),textarea:not(:disabled),[tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );
      if (!focusable.length) {
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || !modalRef.current?.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !modalRef.current?.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      cancelAnimationFrame(focusFrame);
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (openerRef.current?.isConnected) openerRef.current.focus();
    };
  }, [dialogOpen]);

  useEffect(() => {
    if (!diaryOpen || selectedWish) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusFrame = requestAnimationFrame(() => diaryCloseButtonRef.current?.focus());
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDiaryOpen(false);
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = Array.from(
        diaryDialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled),[href],input:not(:disabled),textarea:not(:disabled),[tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );
      if (!focusable.length) {
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || !diaryDialogRef.current?.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !diaryDialogRef.current?.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      cancelAnimationFrame(focusFrame);
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (diaryTriggerRef.current?.isConnected) diaryTriggerRef.current.focus();
    };
  }, [diaryOpen, selectedWish]);

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
    if (!pendingWishRequest && !data.nextMilestone) return;
    setPendingAction("create");
    setMutationError(false);
    setWishDelivery(null);
    try {
      let request = pendingWishRequest;
      if (!request || request.text !== text) {
        const imageData = await createWishShareImage(text, lang);
        request = {
          wishId: window.crypto.randomUUID(),
          milestone: data.nextMilestone!,
          text,
          imageData,
        };
        pendingWishRequestRef.current = request;
        setPendingWishRequest(request);
      }
      const result = await post("create_wish", {
        wish_text: request.text,
        wish_id: request.wishId,
        milestone: String(request.milestone),
        lang,
        wish_image: request.imageData,
      });
      const wishId = typeof result.wishId === "string" ? result.wishId : null;
      const delivered = result.notified === true;
      const alreadySaved = result.alreadyCreated === true;
      setWishDelivery({
        delivered,
        alreadySaved,
        wishId,
        imageData: delivered ? null : request.imageData,
      });
      const createdAt = new Date().toISOString();
      setData((current) => {
        if (!current) return current;
        const sentWishes = current.sentWishes.some((item) => item.id === wishId)
          ? current.sentWishes
          : [{
            id: wishId ?? request.wishId,
            text,
            status: "pending" as const,
            createdAt,
            milestone: request.milestone,
          }, ...current.sentWishes];
        const usedMilestones = new Set(sentWishes.map((item) => item.milestone));
        let nextMilestone: number | null = null;
        for (let candidate = 1; candidate <= Math.floor(current.hearts / current.threshold); candidate += 1) {
          if (!usedMilestones.has(candidate * current.threshold)) {
            nextMilestone = candidate * current.threshold;
            break;
          }
        }
        return {
          ...current,
          availableWishes: Math.max(0, current.availableWishes - 1),
          nextMilestone,
          sentWishes,
        };
      });
      setWishText("");
      pendingWishRequestRef.current = null;
      setPendingWishRequest(null);
      void refresh();
    } catch {
      setMutationError(true);
    } finally {
      setPendingAction(null);
    }
  };

  const retryWishDelivery = async () => {
    if (!wishDelivery?.wishId || !wishDelivery.imageData || wishDelivery.delivered) return;
    setPendingAction("delivery");
    setMutationError(false);
    try {
      const result = await post("send_wish_photo", {
        wish_id: wishDelivery.wishId,
        wish_image: wishDelivery.imageData,
        lang,
      });
      const delivered = result.notified === true;
      setWishDelivery((current) => current
        ? { ...current, delivered, alreadySaved: false, imageData: delivered ? null : current.imageData }
        : current);
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
      if (selectedWish?.wish.id === wish.id) closeWish();
      void refresh();
    } catch {
      setMutationError(true);
    } finally {
      setPendingAction(null);
    }
  };

  const stars = data?.hearts ?? 0;
  const threshold = data?.threshold ?? 20;
  const progressValue = data?.availableWishes ? threshold : stars % threshold;
  const progress = Math.max(0, Math.min(100, progressValue / threshold * 100));
  const starsToNext = threshold - progressValue;
  const visibleCollectedStars = data?.availableWishes ? threshold : stars % threshold;

  return (
    <>
    <section className="wm-shell">
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
         .wm-wish-card{position:relative;display:block;width:100%;overflow:hidden;isolation:isolate;text-align:left;appearance:none;padding:13px 14px 12px;border:1px solid rgba(189,101,92,.2);border-radius:16px;background:radial-gradient(circle at 92% 5%,rgba(255,111,97,.15),transparent 31%),linear-gradient(145deg,#fffefb 0%,#fff9f1 58%,#f8e9e1 100%);color:var(--wm-ink);font:inherit;cursor:pointer;box-shadow:0 7px 18px rgba(76,48,39,.07),inset 0 1px 0 rgba(255,255,255,.9);transition:transform .22s cubic-bezier(.2,.8,.2,1),box-shadow .22s ease,border-color .22s ease}
         .wm-wish-card:after{content:"";position:absolute;z-index:-1;left:14px;right:14px;bottom:0;height:1px;background:linear-gradient(90deg,transparent,rgba(189,101,92,.32),transparent)}
         .wm-wish-card:hover{transform:translateY(-2px) rotate(-.25deg);border-color:rgba(189,101,92,.38);box-shadow:0 12px 24px rgba(76,48,39,.12),inset 0 1px 0 rgba(255,255,255,.95)}
         .wm-wish-card:active{transform:translateY(0) scale(.99)}
         .wm-wish-card:focus-visible{outline:3px solid rgba(255,111,97,.42);outline-offset:3px}
        .wm-wish-top{display:flex;justify-content:space-between;align-items:center;gap:8px}
        .wm-status{display:inline-flex;align-items:center;min-height:19px;border-radius:20px;padding:2px 8px;background:#f1e8dc;color:#716354;font-size:9px;font-weight:750}
        .wm-status-accepted{background:#e8eee4;color:#557053}
        .wm-status-adjust{background:#f6e9de;color:#986443}
        .wm-status-not_now{background:#ece9e4;color:#716e67}
         .wm-wish-mark{display:grid;place-items:center;width:25px;height:25px;border:1px solid rgba(209,112,101,.18);border-radius:50%;color:#d17065;background:rgba(255,255,255,.54)}
         .wm-wish-text{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:3;overflow:hidden;margin:9px 0 0;color:#2e3540;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.5;overflow-wrap:anywhere}
         .wm-card-open{display:inline-flex;align-items:center;gap:6px;margin-top:10px;color:#a94f48;font-size:10px;font-weight:750}
         .wm-card-open svg{transition:transform .18s ease}
         .wm-wish-card:hover .wm-card-open svg{transform:translateX(3px)}
         .wm-dialog-backdrop{position:fixed;z-index:10000;inset:0;display:grid;place-items:center;overflow:auto;padding:16px;background:rgba(20,24,32,.44);backdrop-filter:blur(8px);animation:wm-dialog-fade .24s ease both}
         .wm-dialog-shell{position:relative;width:min(100%,440px);max-height:calc(100dvh - 32px);overflow:auto;padding:26px 22px 22px;border:1px solid rgba(189,101,92,.24);border-radius:27px;background:radial-gradient(circle at 93% 3%,rgba(255,111,97,.16),transparent 28%),linear-gradient(150deg,#fffefb 0%,#fff9f1 61%,#f7e6de 100%);color:#162238;box-shadow:0 24px 70px rgba(18,24,35,.28),inset 0 1px 0 rgba(255,255,255,.94);font-family:'DM Sans',sans-serif;transform-origin:center;transition:transform .58s cubic-bezier(.18,.82,.22,1),opacity .3s ease}
         .wm-dialog-shell:after{content:"";position:absolute;left:22px;right:22px;bottom:0;height:1px;background:linear-gradient(90deg,transparent,rgba(189,101,92,.4),transparent)}
         .wm-dialog-close{position:absolute;z-index:2;top:13px;right:13px;display:grid;place-items:center;width:34px;height:34px;border:1px solid rgba(22,34,56,.1);border-radius:50%;background:rgba(255,255,255,.68);color:#48515d;cursor:pointer;transition:background .18s ease,transform .18s ease}
         .wm-dialog-close:hover{transform:rotate(5deg);background:#fff}
         .wm-dialog-close:focus-visible{outline:3px solid rgba(255,111,97,.42);outline-offset:2px}
         .wm-dialog-kicker{margin:0 42px 12px 0;color:#bc655b;font-size:10px;font-weight:800;letter-spacing:.12em;text-transform:uppercase}
         .wm-dialog-top{display:flex;align-items:center;justify-content:space-between;gap:12px}
         .wm-dialog-mark{display:grid;place-items:center;width:38px;height:38px;border:1px solid rgba(209,112,101,.2);border-radius:50%;background:rgba(255,255,255,.64);color:#d17065}
         .wm-dialog-text{margin:18px 0 22px;color:#242d39;font-family:Georgia,'Times New Roman',serif;font-size:clamp(19px,5vw,23px);line-height:1.55;overflow-wrap:anywhere;white-space:pre-wrap}
         .wm-dialog-rule{height:1px;margin:0 0 17px;background:linear-gradient(90deg,rgba(22,34,56,.03),rgba(22,34,56,.13),rgba(22,34,56,.03))}
         .wm-dialog-actions{display:grid;gap:8px}
         .wm-dialog-actions .wm-btn{width:100%;min-height:42px;font-size:11px}
         .wm-dialog-hint{margin:11px 0 0;color:#707987;font-size:10px;line-height:1.5}
         @keyframes wm-dialog-fade{from{opacity:0}to{opacity:1}}
        .wm-empty{padding:12px;border:1px dashed rgba(22,34,56,.2);border-radius:13px;color:var(--wm-muted);font-size:11px;line-height:1.55}
        .wm-empty-mark{display:flex;align-items:center;gap:7px;margin-bottom:5px;color:#bb6a60}
        .wm-empty-mark span{font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase}
        .wm-alert{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:10px;padding:9px 10px;border:1px solid rgba(169,79,72,.2);border-radius:11px;background:#fbefeb;color:#8d4942;font-size:10px;line-height:1.45}
        .wm-alert button{flex:none;border:0;background:transparent;color:inherit;font:inherit;font-weight:800;text-decoration:underline;cursor:pointer}
        .wm-skeleton{height:72px;margin-top:10px;border-radius:14px;background:#f1ebe2}
        .wm-skeleton-line{height:10px;width:58%;margin:0 0 8px;border-radius:6px;background:#e9e1d7}
        @media(min-width:560px){.wm-inner{padding:19px 20px 17px}.wm-title{font-size:23px}.wm-progress{padding:13px 14px}.wm-content-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:14px}.wm-content-grid>.wm-section{margin-top:0}.wm-divider{display:none}}
         @media(max-width:420px){.wm-dialog-shell{padding:23px 18px 19px;border-radius:23px}}
         @media(prefers-reduced-motion:reduce){.wm-shell *{animation:none!important;scroll-behavior:auto!important;transition:none!important}.wm-dialog-backdrop,.wm-dialog-shell{animation:none!important;scroll-behavior:auto!important;transition:none!important}}
       `}</style>
      <style>{`
        .wm-shell{position:relative;isolation:isolate;overflow:visible;border:0;border-radius:0;background:transparent;color:inherit;box-shadow:none}
        .wm-shell:before{display:none}
        .wm-diary-trigger{display:grid;gap:13px;width:100%;padding:17px 18px;border:1px solid rgba(101,57,66,.14);border-radius:21px;background:radial-gradient(circle at 100% 0%,rgba(215,151,128,.2),transparent 35%),linear-gradient(135deg,#fffaf5 0%,#f7e8df 100%);color:#321d26;text-align:left;cursor:pointer;box-shadow:0 12px 28px rgba(49,22,31,.08),inset 0 1px 0 rgba(255,255,255,.9);transition:transform .2s ease,box-shadow .2s ease}
        .wm-diary-trigger:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 16px 34px rgba(49,22,31,.13),inset 0 1px 0 rgba(255,255,255,.95)}
        .wm-diary-trigger:focus-visible{outline:3px solid rgba(155,85,100,.4);outline-offset:3px}
        .wm-diary-trigger:disabled{cursor:not-allowed;opacity:.76}
        .wm-entry-top,.wm-entry-bottom{display:flex;align-items:center;justify-content:space-between;gap:12px}
        .wm-entry-copy{display:grid;gap:4px;min-width:0}
        .wm-entry-eyebrow{color:#95606a;font-size:9px;font-weight:800;letter-spacing:.14em;text-transform:uppercase}
        .wm-entry-title{font-family:Georgia,'Times New Roman',serif;font-size:21px;font-weight:600;line-height:1.15;letter-spacing:-.025em}
        .wm-entry-seal{display:grid;place-items:center;width:40px;height:40px;flex:none;border:1px solid rgba(171,117,95,.35);border-radius:50%;background:rgba(255,255,255,.55);color:#aa765d}
        .wm-entry-total{display:flex;align-items:baseline;gap:5px;font-variant-numeric:tabular-nums}
        .wm-entry-total strong{font-family:Georgia,'Times New Roman',serif;font-size:20px;font-weight:600}
        .wm-entry-total small{color:#80666a;font-size:10px;font-weight:650}
        .wm-entry-status{color:#8b5a63;font-size:10px;font-weight:750;text-align:right}
        .wm-entry-track{height:4px;overflow:hidden;border-radius:9px;background:rgba(108,67,74,.13)}
        .wm-entry-track span{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#bd8190,#c79a74);transition:width .35s ease}
        .wm-entry-unavailable{margin-top:9px}
        .wm-diary-backdrop{position:fixed;z-index:9990;inset:0;display:grid;place-items:center;overflow:auto;padding:14px;background:rgba(24,8,17,.72);backdrop-filter:blur(12px);animation:wm-dialog-fade .24s ease both}
        .wm-diary-panel{--wm-paper:#27121e;--wm-ink:#fff2e5;--wm-muted:#d0b0b5;--wm-coral:#e3ad8b;--wm-line:rgba(255,233,219,.13);position:relative;width:min(100%,560px);max-height:calc(100dvh - 28px);overflow:auto;border:1px solid rgba(237,195,167,.28);border-radius:28px;background:radial-gradient(ellipse at 8% 0%,rgba(174,86,111,.28),transparent 40%),radial-gradient(ellipse at 100% 100%,rgba(148,91,76,.18),transparent 42%),linear-gradient(145deg,#351522 0%,#21101d 60%,#1b101c 100%);color:var(--wm-ink);box-shadow:0 30px 90px rgba(9,3,9,.48),inset 0 1px 0 rgba(255,230,210,.12);font-family:'DM Sans',sans-serif}
        .wm-diary-panel .wm-inner{padding:25px 25px 22px}
        .wm-diary-close{position:absolute;z-index:3;top:14px;right:14px;display:grid;place-items:center;width:36px;height:36px;border:1px solid rgba(255,226,209,.18);border-radius:50%;background:rgba(255,245,232,.08);color:#f8e2d5;cursor:pointer}
        .wm-diary-close:hover{background:rgba(255,245,232,.15)}
        .wm-diary-close:focus-visible{outline:3px solid rgba(227,173,139,.55);outline-offset:2px}
        .wm-diary-panel .wm-eyebrow{color:#e2b39b}
        .wm-diary-panel .wm-title{font-family:Georgia,'Times New Roman',serif;font-size:clamp(25px,6vw,31px);font-weight:500;letter-spacing:-.025em;color:#fff1e2}
        .wm-diary-panel .wm-intro{max-width:380px;color:#d5b7bb}
        .wm-diary-panel .wm-seal{border-color:rgba(227,173,139,.35);background:rgba(255,233,215,.08);color:#edbf9d}
        .wm-diary-panel .wm-progress{border:1px solid rgba(255,225,208,.12);background:linear-gradient(135deg,rgba(255,238,222,.09),rgba(159,89,99,.12))}
        .wm-diary-panel .wm-count{color:#fff0e2}
        .wm-diary-panel .wm-count strong{font-family:Georgia,'Times New Roman',serif;font-size:25px;font-weight:500}
        .wm-diary-panel .wm-count-label,.wm-diary-panel .wm-progress-note{color:#d1afb4}
        .wm-diary-panel .wm-availability{color:#f2c6a5}
        .wm-diary-panel .wm-track{background:rgba(255,230,216,.15)}
        .wm-diary-panel .wm-track-fill{background:linear-gradient(90deg,#c47d91,#e7bc91)}
        .wm-star-collection{display:grid;grid-template-columns:repeat(10,minmax(0,1fr));gap:4px;margin-top:11px}
        .wm-star-dot{display:grid;place-items:center;aspect-ratio:1;border:1px solid rgba(255,226,209,.13);border-radius:50%;background:rgba(255,238,222,.035);color:rgba(255,238,222,.23)}
        .wm-star-dot.is-earned{border-color:rgba(237,196,157,.3);background:rgba(227,173,139,.13);color:#edc49d}
        .wm-diary-panel .wm-privacy{color:#d8b9bc}
        .wm-diary-panel .wm-privacy svg{color:#e8b894}
        .wm-diary-panel .wm-rule{background:rgba(255,227,211,.15)}
        .wm-diary-panel .wm-section-title{color:#fff0e2;font-family:Georgia,'Times New Roman',serif;font-size:17px;font-weight:500}
        .wm-diary-panel .wm-task,.wm-diary-panel .wm-form{border-color:rgba(255,226,209,.15);background:rgba(255,238,222,.055)}
        .wm-diary-panel .wm-task-kicker{color:#e1b296}
        .wm-diary-panel .wm-task-name{color:#fff0e5}
        .wm-diary-panel .wm-question,.wm-diary-panel .wm-hint{color:#d2b2b8}
        .wm-diary-panel .wm-open-task{color:#f1c6a5}
        .wm-diary-panel .wm-btn{border-color:rgba(255,229,213,.24);background:rgba(255,238,222,.06);color:#fff0e4}
        .wm-diary-panel .wm-btn:hover:not(:disabled){background:rgba(255,238,222,.14)}
        .wm-diary-panel .wm-btn-primary{border-color:#dba382;background:#dba382;color:#29151e}
        .wm-diary-panel .wm-btn-primary:hover:not(:disabled){background:#efbd9b}
        .wm-diary-panel .wm-btn:focus-visible,.wm-diary-panel .wm-open-task:focus-visible,.wm-diary-panel .wm-textarea:focus-visible{outline-color:rgba(227,173,139,.62)}
        .wm-diary-panel .wm-textarea{border-color:rgba(255,224,205,.28);background:#fff8f0;color:#38232a}
        .wm-diary-panel .wm-textarea::placeholder{color:#9c8586}
        .wm-diary-panel .wm-wish-card{border-color:rgba(232,185,154,.25);background:radial-gradient(circle at 94% 0%,rgba(211,142,119,.18),transparent 34%),linear-gradient(145deg,#38202b 0%,#2a1723 100%);color:#fff0e5;box-shadow:0 7px 18px rgba(8,3,8,.15),inset 0 1px 0 rgba(255,238,220,.08)}
        .wm-diary-panel .wm-wish-card:hover{border-color:rgba(232,185,154,.45);box-shadow:0 12px 24px rgba(8,3,8,.25),inset 0 1px 0 rgba(255,238,220,.12)}
        .wm-diary-panel .wm-wish-text{color:#f5e5da}
        .wm-diary-panel .wm-card-open{color:#efbd9b}
        .wm-diary-panel .wm-wish-mark{border-color:rgba(232,185,154,.25);background:rgba(255,239,222,.08);color:#edbc98}
        .wm-diary-panel .wm-status{background:rgba(255,237,220,.14);color:#f2ddd0}
        .wm-diary-panel .wm-status-accepted{background:rgba(149,182,144,.18);color:#c4dfbb}
        .wm-diary-panel .wm-status-adjust{background:rgba(224,174,126,.17);color:#f1c99f}
        .wm-diary-panel .wm-status-not_now{background:rgba(255,237,220,.1);color:#dfc9c2}
        .wm-diary-panel .wm-empty{border-color:rgba(255,225,208,.2);color:#d6b8bd}
        .wm-diary-panel .wm-empty-mark{color:#e8b894}
        .wm-diary-panel .wm-skeleton{background:rgba(255,238,222,.09)}
        .wm-diary-panel .wm-skeleton-line{background:rgba(255,238,222,.16)}
        .wm-delivery-feedback{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:10px;padding:10px 11px;border:1px solid rgba(162,196,148,.23);border-radius:12px;background:rgba(116,153,102,.12);color:#d7e8cf;font-size:10px;line-height:1.45}
        .wm-delivery-feedback.is-failed{border-color:rgba(227,157,141,.28);background:rgba(176,89,91,.12);color:#f0c8bf}
        .wm-delivery-feedback button{flex:none;border:0;background:transparent;color:inherit;font:inherit;font-weight:800;text-decoration:underline;text-underline-offset:3px;cursor:pointer}
        .wm-dialog-backdrop{z-index:10010}
        .wm-dialog-shell{border-color:rgba(237,195,167,.28);background:radial-gradient(ellipse at 8% 0%,rgba(174,86,111,.28),transparent 40%),linear-gradient(145deg,#351522 0%,#21101d 75%);color:#fff2e5;box-shadow:0 30px 90px rgba(9,3,9,.5)}
        .wm-dialog-shell:after{background:linear-gradient(90deg,transparent,rgba(237,195,167,.45),transparent)}
        .wm-dialog-close{border-color:rgba(255,226,209,.18);background:rgba(255,245,232,.08);color:#f8e2d5}
        .wm-dialog-close:hover{background:rgba(255,245,232,.15)}
        .wm-dialog-kicker{color:#e2b39b}
        .wm-dialog-mark{border-color:rgba(227,173,139,.35);background:rgba(255,233,215,.08);color:#edbf9d}
        .wm-dialog-text{color:#fff0e5}
        .wm-dialog-rule{background:linear-gradient(90deg,transparent,rgba(255,227,211,.2),transparent)}
        .wm-dialog-hint{color:#d5b7bb}
        @media(max-width:560px){.wm-diary-panel{border-radius:23px}.wm-diary-panel .wm-inner{padding:23px 18px 18px}.wm-diary-backdrop{padding:9px}}
        @media(prefers-reduced-motion:reduce){.wm-diary-trigger,.wm-diary-panel *,.wm-diary-backdrop{animation:none!important;transition:none!important}}
        /* Touché's paper-and-ink language: playful on the surface, intimate inside. */
        .wm-diary-trigger{gap:12px;border:2px solid #162238;border-radius:18px;background:linear-gradient(120deg,#fff2bd 0%,#ffe2d6 100%);color:#162238;box-shadow:4px 4px 0 #162238}
        .wm-diary-trigger:hover:not(:disabled){transform:translate(-2px,-2px);box-shadow:6px 6px 0 #162238}
        .wm-entry-eyebrow{color:#78183d;font-family:"Space Grotesk",sans-serif;letter-spacing:.1em}
        .wm-entry-title,.wm-entry-total strong{font-family:"Space Grotesk",sans-serif;font-weight:700;letter-spacing:-.055em}
        .wm-entry-seal{border:2px solid #162238;background:#ff6f61;color:#fffaf3;box-shadow:2px 2px 0 #162238}
        .wm-entry-status{color:#78183d}
        .wm-entry-track{height:6px;border:1px solid #162238;background:rgba(22,34,56,.1)}
        .wm-entry-track span{background:#78183d}
        .wm-diary-backdrop{background:rgba(22,34,56,.56);backdrop-filter:blur(6px)}
        .wm-diary-panel{--wm-paper:#fffaf3;--wm-ink:#162238;--wm-muted:#596578;--wm-coral:#ff6f61;--wm-line:rgba(22,34,56,.16);width:min(100%,590px);border:2px solid #162238;border-radius:24px;background:#fffaf3;color:#162238;box-shadow:7px 7px 0 rgba(255,111,97,.8),0 24px 70px rgba(12,20,35,.25);font-family:"DM Sans",sans-serif}
        .wm-diary-cover{position:relative;height:clamp(138px,29vw,190px);overflow:hidden;border-bottom:2px solid #162238;background:#f2d6bd}
        .wm-diary-cover img{display:block;width:100%;height:100%;object-fit:cover;object-position:center 34%}
        .wm-diary-cover:after{content:"";position:absolute;inset:45% 0 0;background:linear-gradient(180deg,transparent,rgba(22,34,56,.16));pointer-events:none}
        .wm-diary-panel .wm-inner{padding:18px 22px 22px}
        .wm-diary-close{top:12px;right:12px;border:2px solid #162238;background:rgba(255,250,243,.94);color:#162238;box-shadow:2px 2px 0 #162238}
        .wm-diary-close:hover{background:#ffd45d}
        .wm-diary-close:focus-visible{outline-color:#3e5bff}
        .wm-diary-panel .wm-eyebrow{color:#78183d;font-family:"Space Grotesk",sans-serif}
        .wm-diary-panel .wm-title{font-family:"Space Grotesk",sans-serif;font-size:clamp(27px,6vw,34px);font-weight:700;letter-spacing:-.07em;color:#162238}
        .wm-diary-panel .wm-intro{max-width:390px;color:#596578}
        .wm-diary-panel .wm-seal{border:2px solid #162238;background:#ffd45d;color:#78183d}
        .wm-diary-panel .wm-progress{border:2px solid #162238;border-radius:16px;background:#f0e9df}
        .wm-diary-panel .wm-count{color:#162238}
        .wm-diary-panel .wm-count strong{font-family:"Space Grotesk",sans-serif;font-size:25px;font-weight:700}
        .wm-diary-panel .wm-count-label,.wm-diary-panel .wm-progress-note{color:#596578}
        .wm-diary-panel .wm-availability{color:#78183d}
        .wm-diary-panel .wm-track{height:7px;border:1px solid rgba(22,34,56,.3);background:#e1d8cc}
        .wm-diary-panel .wm-track-fill{background:#ff6f61}
        .wm-star-dot{border-color:rgba(22,34,56,.16);background:rgba(255,250,243,.65);color:rgba(22,34,56,.2)}
        .wm-star-dot.is-earned{border-color:#162238;background:#ffd45d;color:#78183d}
        .wm-diary-panel .wm-privacy{color:#596578}
        .wm-diary-panel .wm-privacy svg{color:#78183d}
        .wm-diary-panel .wm-rule{background:rgba(22,34,56,.16)}
        .wm-diary-panel .wm-section-title{color:#162238;font-family:"Space Grotesk",sans-serif;font-size:16px;font-weight:700}
        .wm-diary-panel .wm-task,.wm-diary-panel .wm-form{border:2px solid #162238;border-radius:15px;background:#fff}
        .wm-diary-panel .wm-task-kicker{color:#78183d}
        .wm-diary-panel .wm-task-name{color:#162238}
        .wm-diary-panel .wm-question,.wm-diary-panel .wm-hint{color:#596578}
        .wm-diary-panel .wm-open-task{color:#78183d}
        .wm-diary-panel .wm-btn{border:2px solid #162238;background:#fffaf3;color:#162238}
        .wm-diary-panel .wm-btn:hover:not(:disabled){background:#ffe5e1}
        .wm-diary-panel .wm-btn-primary{border-color:#162238;background:#ff6f61;color:#fff}
        .wm-diary-panel .wm-btn-primary:hover:not(:disabled){background:#e95c54}
        .wm-diary-panel .wm-btn:focus-visible,.wm-diary-panel .wm-open-task:focus-visible,.wm-diary-panel .wm-textarea:focus-visible{outline-color:#3e5bff}
        .wm-diary-panel .wm-textarea{min-height:102px;border:2px solid #162238;border-radius:12px;background:#fffaf3;color:#162238;font-size:13px}
        .wm-diary-panel .wm-textarea::placeholder{color:#737d8b}
        .wm-diary-panel .wm-wish-card{border:2px solid #162238;border-radius:16px;background:#fff2bd;color:#162238;box-shadow:3px 3px 0 rgba(22,34,56,.16)}
        .wm-diary-panel .wm-wish-card:hover{border-color:#162238;box-shadow:5px 5px 0 rgba(22,34,56,.2)}
        .wm-diary-panel .wm-wish-text{color:#162238}
        .wm-diary-panel .wm-card-open{color:#78183d}
        .wm-diary-panel .wm-wish-mark{border-color:#162238;background:#ff6f61;color:#fff}
        .wm-diary-panel .wm-status{background:#f0e9df;color:#162238}
        .wm-diary-panel .wm-status-accepted{background:#e4efba;color:#31513c}
        .wm-diary-panel .wm-status-adjust{background:#ffe4d8;color:#72451f}
        .wm-diary-panel .wm-status-not_now{background:#e5e9ff;color:#394475}
        .wm-diary-panel .wm-empty{border-color:rgba(22,34,56,.4);color:#596578}
        .wm-diary-panel .wm-empty-mark{color:#78183d}
        .wm-diary-panel .wm-skeleton{background:#f0e9df}
        .wm-diary-panel .wm-skeleton-line{background:#e1d8cc}
        .wm-delivery-feedback{border:1px solid rgba(49,81,60,.24);background:#eaf1e2;color:#31513c;font-size:11px}
        .wm-delivery-feedback.is-failed{border-color:rgba(181,63,72,.28);background:#fff0ec;color:#963c43}
        .wm-delivery-feedback button{min-height:30px;padding:4px 3px}
        .wm-diary-panel .wm-alert{border-color:rgba(181,63,72,.25);background:#fff0ec;color:#963c43}
        .wm-diary-panel .wm-alert button{color:inherit}
        @media(min-width:560px){.wm-diary-panel .wm-inner{padding:20px 24px 24px}}
        @media(max-width:420px){.wm-diary-panel{border-radius:20px}.wm-diary-panel .wm-inner{padding:17px 15px 18px}.wm-diary-cover{height:132px}}
        @media(prefers-reduced-motion:reduce){.wm-diary-trigger,.wm-diary-panel *,.wm-diary-backdrop{animation:none!important;transition:none!important;scroll-behavior:auto!important}}
      `}</style>
      <button
        ref={diaryTriggerRef}
        className="wm-diary-trigger"
        type="button"
        aria-haspopup={coupleId ? "dialog" : undefined}
        aria-expanded={coupleId ? diaryOpen : undefined}
        aria-label={`${t.title}. ${data ? `${stars} ${t.stars}.` : ""} ${data ? (data.availableWishes > 0 ? t.cardReady(data.availableWishes) : t.toNext(starsToNext)) : ""}`}
        disabled={!coupleId}
        onClick={() => setDiaryOpen(true)}
      >
        <span className="wm-entry-top">
          <span className="wm-entry-copy">
            <span className="wm-entry-eyebrow">{t.eyebrow}</span>
            <span className="wm-entry-title">{t.title}</span>
          </span>
          <span className="wm-entry-seal"><StarMark size={19} /></span>
        </span>
        <span className="wm-entry-bottom">
          <span className="wm-entry-total"><strong>{data ? stars : "—"}</strong><small>{t.stars}</small></span>
          <span className="wm-entry-status">
            {data ? (data.availableWishes > 0 ? t.cardReady(data.availableWishes) : t.toNext(starsToNext)) : loading ? t.loading : t.error}
          </span>
        </span>
        <span className="wm-entry-track" aria-hidden="true"><span style={{ width: `${data ? progress : 0}%` }} /></span>
      </button>
      {!coupleId && <div className="wm-empty wm-entry-unavailable" role="status">{t.unavailable}</div>}
      <style>{`.wm-sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}`}</style>
    </section>
    {diaryOpen && createPortal(
      <div
        className="wm-diary-backdrop"
        onClick={(event) => {
          if (event.currentTarget === event.target) setDiaryOpen(false);
        }}
      >
        <section
          ref={diaryDialogRef}
          className="wm-diary-panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="wm-title"
        >
          <button ref={diaryCloseButtonRef} className="wm-diary-close" type="button" aria-label={t.close} onClick={() => setDiaryOpen(false)}>
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
      <div className="wm-diary-cover" aria-hidden="true">
        <img src="/images/wish-diary-cover.png" alt="" />
      </div>
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
                  <div className="wm-track" role="progressbar" aria-label={data.availableWishes > 0 ? t.cardReady(data.availableWishes) : t.toNext(starsToNext)} aria-valuemin={0} aria-valuemax={threshold} aria-valuenow={progressValue}>
                    <div className="wm-track-fill" style={{ transform: `scaleX(${progress / 100})` }} />
                  </div>
                  <div className="wm-star-collection" aria-hidden="true">
                    {Array.from({ length: threshold }, (_, index) => (
                      <span className={`wm-star-dot${index < visibleCollectedStars ? " is-earned" : ""}`} key={index}>
                        <StarMark size={12} />
                      </span>
                    ))}
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
                        <textarea className="wm-textarea" id="wm-wish-input" value={wishText} onChange={(event) => setWishText(event.target.value)} placeholder={t.writePlaceholder} maxLength={280} disabled={!!pendingAction || !!pendingWishRequest} required />
                        <div className="wm-form-foot">
                          <button className="wm-btn wm-btn-primary" type="submit" disabled={!wishText.trim() || !!pendingAction}>{pendingAction === "create" ? t.loading : pendingWishRequest ? t.deliveryRetry : t.createWish}</button>
                        </div>
                      </form>
                    ) : (
                      <div className="wm-empty"><div className="wm-empty-mark"><StarMark size={14} /><span>{t.cardReady(0)}</span></div>{t.toNext(starsToNext)}</div>
                    )}
                    {wishDelivery && (
                      <div
                        className={`wm-delivery-feedback${wishDelivery.delivered ? "" : " is-failed"}`}
                        role={wishDelivery.delivered || wishDelivery.alreadySaved ? "status" : "alert"}
                      >
                        <span>
                          {wishDelivery.alreadySaved
                            ? t.wishAlreadySaved
                            : wishDelivery.delivered ? t.deliverySent : t.deliveryFailed}
                        </span>
                        {!wishDelivery.delivered && wishDelivery.wishId && wishDelivery.imageData && (
                          <button type="button" disabled={!!pendingAction} onClick={() => void retryWishDelivery()}>
                            {pendingAction === "delivery" ? t.loading : t.deliveryRetry}
                          </button>
                        )}
                      </div>
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
                          <WishCard key={wish.id} wish={wish} t={t} source="received" onOpen={openWish} />
                        ))}
                      </div>
                    ) : <div className="wm-empty">{t.emptyReceived}</div>}
                  </section>

                  <section className="wm-section" aria-labelledby="wm-sent-title">
                    <div className="wm-section-head"><h3 className="wm-section-title" id="wm-sent-title">{t.sentHeading}</h3></div>
                    {data.sentWishes.length ? (
                      <div className="wm-wish-list">{data.sentWishes.map((wish) => <WishCard key={wish.id} wish={wish} t={t} source="sent" onOpen={openWish} />)}</div>
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
      </div>,
      document.body,
    )}
    {selectedWish && createPortal(
      <div
        className="wm-dialog-backdrop"
        onClick={(event) => {
          if (event.currentTarget === event.target) closeWish();
        }}
      >
        <div
          ref={(node) => {
            modalRef.current = node;
            modalCardRef.current = node;
          }}
          className="wm-dialog-shell"
          role="dialog"
          aria-modal="true"
          aria-labelledby="wm-dialog-title"
          style={{
            transform: flightStyle
              ? flightStyle.isAtOrigin
                ? `translate3d(${flightStyle.x}px,${flightStyle.y}px,0) scale(${flightStyle.scaleX},${flightStyle.scaleY})`
                : "translate3d(0,0,0) scale(1)"
              : undefined,
            opacity: flightStyle?.isAtOrigin ? 0.9 : 1,
            transition: flightStyle?.isAtOrigin ? "none" : undefined,
          }}
        >
            <button ref={closeButtonRef} className="wm-dialog-close" type="button" aria-label={t.close} onClick={closeWish}>
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
            <p className="wm-dialog-kicker" id="wm-dialog-title">
              {selectedWish.source === "received" ? t.receivedHeading : t.sentHeading}
            </p>
            <div className="wm-dialog-top">
              <span className={`wm-status wm-status-${selectedWish.wish.status}`}>
                {statusCopy(selectedWish.wish.status, t)}
              </span>
              <span className="wm-dialog-mark"><StarMark size={18} /></span>
            </div>
            <p className="wm-dialog-text">{selectedWish.wish.text}</p>
            {selectedWish.source === "received" && selectedWish.wish.status === "pending" && (
              <>
                <div className="wm-dialog-rule" />
                <div className="wm-dialog-actions" aria-label={t.receivedHeading}>
                  <button
                    className="wm-btn wm-btn-primary"
                    type="button"
                    disabled={!!pendingAction}
                    onClick={() => void respond(selectedWish.wish as ReceivedWish, "accept")}
                  >
                    {t.accept}
                  </button>
                  <button
                    className="wm-btn"
                    type="button"
                    disabled={!!pendingAction}
                    onClick={() => void respond(selectedWish.wish as ReceivedWish, "adjust")}
                  >
                    {t.discuss}
                  </button>
                  <button
                    className="wm-btn"
                    type="button"
                    disabled={!!pendingAction}
                    onClick={() => void respond(selectedWish.wish as ReceivedWish, "not_now")}
                  >
                    {t.decline}
                  </button>
                </div>
                {pendingAction === `wish:${selectedWish.wish.id}` && (
                  <p className="wm-dialog-hint" role="status">{t.loading}</p>
                )}
              </>
            )}
        </div>
      </div>,
      document.body,
    )}
    </>
  );
}