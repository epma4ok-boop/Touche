import { useCallback, useEffect, useRef, useState, type TouchEvent } from "react";
import type { Gender } from "@/components/GenderSelect";
import type { AppMode } from "@/App";
import HeartbeatCanvas from "@/components/HeartbeatCanvas";
import { UI, CATEGORY_CONFIG, CATEGORIES_ORDER, type Lang, type Category } from "@/data/i18n";
import { playReveal } from "@/hooks/useSensualSound";
import HistoryPanel, { type HistoryEntry } from "@/components/HistoryPanel";
import type { SharedTaskSnapshot } from "@/data/sharedPair";
import "./CategoryPop.css";

const HISTORY_KEY = "touche_history_v2";
const FALLBACK_INK = "#162238";
const POP_COLORS: Record<Category, { r: number; g: number; b: number }> = {
  compliments: { r: 255, g: 212, b: 93 },
  tenderness: { r: 62, g: 91, b: 255 },
  desire: { r: 255, g: 111, b: 97 },
  passion: { r: 255, g: 111, b: 97 },
  hard: { r: 22, g: 34, b: 56 },
};

function loadHistory(): HistoryEntry[] {
  try {
    const value = localStorage.getItem(HISTORY_KEY);
    if (value) return JSON.parse(value) as HistoryEntry[];
  } catch { /* storage can be unavailable in Telegram previews */ }
  return [];
}

function saveHistory(history: HistoryEntry[]) {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history)); } catch { /* ignore */ }
}

function getInitData(): string {
  return window.Telegram?.WebApp?.initData ?? "";
}

type TaskResult = { task: string; taskId: string | null; remaining?: number; source?: "ai" | "fallback" };
type TaskError = { kind: "unauthorized" | "subscription_required" | "limit_exceeded" | "rate_limited" | "timeout" | "unknown"; message?: string };

async function generateAITask(
  category: Category,
  lang: Lang,
  gender: Gender | undefined,
  mode: AppMode,
  coupleId: string | null,
  requestId: string,
): Promise<{ result?: TaskResult; error?: TaskError }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25_000);
  try {
    const response = await fetch("/api/tasks/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-telegram-init-data": getInitData() },
      body: JSON.stringify({ category, lang, gender, mode, coupleId, requestId }),
      signal: controller.signal,
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      const kind = response.status === 401 ? "unauthorized"
        : response.status === 403 && body.error === "subscription_required" ? "subscription_required"
        : response.status === 403 && body.error === "limit_exceeded" ? "limit_exceeded"
        : response.status === 429 ? "rate_limited" : "unknown";
      return { error: { kind, message: body.message ?? body.error } };
    }
    const data = await response.json();
    return data.task
      ? { result: { task: data.task, taskId: data.taskId ?? null, remaining: data.remaining, source: data.source ?? "ai" } }
      : { error: { kind: "unknown" } };
  } catch (error) {
    return { error: { kind: error instanceof Error && error.name === "AbortError" ? "timeout" : "unknown" } };
  } finally {
    clearTimeout(timeout);
  }
}

function useTelegramTopInset(): string {
  const [top, setTop] = useState(() => window.Telegram?.WebApp ? 96 : 0);
  useEffect(() => {
    const tg = window.Telegram?.WebApp as any;
    const update = () => {
      const c = tg?.contentSafeAreaInset?.top ?? 0;
      const s = tg?.safeAreaInset?.top ?? 0;
      setTop(tg ? Math.max(96, s + 72, c + s + 16) : 0);
    };
    update();
    tg?.onEvent?.("safeAreaChanged", update);
    tg?.onEvent?.("contentSafeAreaInsetChanged", update);
    const timer = setTimeout(update, 700);
    return () => {
      tg?.offEvent?.("safeAreaChanged", update);
      tg?.offEvent?.("contentSafeAreaInsetChanged", update);
      clearTimeout(timer);
    };
  }, []);
  return top > 0 ? `${top}px` : "max(64px, env(safe-area-inset-top))";
}

function categoryLabel(category: Category, t: typeof UI["en"]): string {
  return ({
    compliments: t.catCompliments,
    tenderness: t.catTenderness,
    desire: t.catDesire,
    passion: t.catPassion,
    hard: t.catHard,
  })[category];
}

const SHARED_TASK_COPY: Record<Lang, {
  shared: string; checkInHint: string; close: string; openTask: string;
}> = {
  ru: {
    shared: "Общее задание для вас двоих",
    checkInHint: "Через 24 часа в Дневнике желаний можно будет ответить, выполнил ли партнёр свою часть. «Да» добавит ему звезду; «нет» не повлечёт штрафа.",
    close: "Закрыть", openTask: "Открыть задание",
  },
  en: {
    shared: "One shared task for both of you",
    checkInHint: "After 24 hours, Wish Diary will ask whether your partner completed their part. “Yes” gives them a star; “no” has no penalty.",
    close: "Close", openTask: "Open task",
  },
  hi: {
    shared: "आप दोनों के लिए साझा काम",
    checkInHint: "24 घंटे बाद Wish Diary पूछेगी कि साथी ने अपना हिस्सा पूरा किया या नहीं। “हाँ” पर उन्हें एक स्टार मिलेगा; “नहीं” पर कोई दंड नहीं है।",
    close: "बंद करें", openTask: "कार्य खोलें",
  },
  pt: {
    shared: "Uma tarefa compartilhada para vocês dois",
    checkInHint: "Após 24 horas, o Wish Diary perguntará se seu parceiro concluiu a parte dele. “Sim” dá uma estrela; “não” não gera penalidade.",
    close: "Fechar", openTask: "Abrir tarefa",
  },
  es: {
    shared: "Una tarea compartida para ambos",
    checkInHint: "Después de 24 horas, el Wish Diary preguntará si tu pareja completó su parte. Un “sí” le da una estrella; un “no” no tiene penalización.",
    close: "Cerrar", openTask: "Abrir tarea",
  },
};

function categorySub(category: Category, t: typeof UI["en"]): string {
  return ({
    compliments: t.catComplimentsSub,
    tenderness: t.catTendernessSub,
    desire: t.catDesireSub,
    passion: t.catPassionSub,
    hard: t.catHardSub,
  })[category];
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = "";
  text.split(" ").forEach((word) => {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > maxWidth) { lines.push(line); line = word; }
    else line = next;
  });
  if (line) lines.push(line);
  return lines;
}

function TaskReveal({ text, color, visible, onDismiss, onGenerateAgain, lang, catLabel, source, isShared }: {
  text: string; color: { r: number; g: number; b: number }; visible: boolean;
  onDismiss: () => void; onGenerateAgain: () => void; lang: Lang; catLabel: string; source?: "ai" | "fallback";
  isShared?: boolean;
}) {
  const t = UI[lang];
  const pairCopy = SHARED_TASK_COPY[lang];
  const [sharing, setSharing] = useState(false);
  useEffect(() => { if (visible) playReveal(); }, [visible]);
  const share = useCallback(async () => {
    if (sharing || !text) return;
    setSharing(true);
    try {
      const size = 1080;
      const canvas = document.createElement("canvas");
      canvas.width = size; canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = "#fffaf3"; ctx.fillRect(0, 0, size, size);
      ctx.strokeStyle = FALLBACK_INK; ctx.lineWidth = 5; ctx.strokeRect(48, 48, size - 96, size - 96);
      ctx.fillStyle = `rgb(${color.r},${color.g},${color.b})`; ctx.fillRect(48, 48, 230, 18);
      ctx.fillStyle = FALLBACK_INK; ctx.textAlign = "center";
      ctx.font = "700 32px sans-serif"; ctx.fillText(catLabel.toUpperCase(), size / 2, 180);
      ctx.font = "700 64px sans-serif";
      const lines = wrapText(ctx, text, 850);
      const lineHeight = 84;
      lines.forEach((line, index) => ctx.fillText(line, size / 2, (size - lines.length * lineHeight) / 2 + index * lineHeight));
      ctx.fillStyle = `rgb(${color.r},${color.g},${color.b})`;
      ctx.font = "700 30px sans-serif"; ctx.fillText("touché", size / 2, 970);
      await new Promise<void>((resolve) => canvas.toBlob(async (blob) => {
        if (!blob) { resolve(); return; }
        const file = new File([blob], "touche-task.png", { type: "image/png" });
        try {
          if (navigator.share && (navigator as any).canShare?.({ files: [file] })) await navigator.share({ files: [file], title: "Touché" });
          else {
            const url = URL.createObjectURL(blob); const link = document.createElement("a");
            link.href = url; link.download = "touche-task.png"; document.body.appendChild(link); link.click(); link.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
          }
        } catch { /* sharing was cancelled */ }
        resolve();
      }, "image/png"));
    } catch { /* keep the task usable when image sharing is unavailable */ }
    finally { setSharing(false); }
  }, [catLabel, color, sharing, text]);
  return (
    <div className={`task-reveal ${visible ? "is-visible" : ""}`} aria-hidden={!visible}>
      <div className="task-reveal__rule" style={{ background: `rgb(${color.r},${color.g},${color.b})` }} />
      <span className="task-reveal__label">{catLabel}</span>
      <p className="task-reveal__text">{text}</p>
      {isShared && (
        <div className="task-reveal__shared-status" role="status" data-testid="status-shared-task" style={{ maxWidth: 560, padding: "13px 16px", border: "1px solid rgba(22,34,56,.25)", borderRadius: 14, background: "rgba(255,250,243,.34)", color: "var(--pop-ink)", textAlign: "left" }}>
          <strong style={{ display: "block", fontSize: 13 }}>{pairCopy.shared}</strong>
          <small style={{ display: "block", marginTop: 4, lineHeight: 1.45 }}>{pairCopy.checkInHint}</small>
        </div>
      )}
      {source === "ai" && <span className="task-reveal__source">AI prompt</span>}
      <div className="task-reveal__actions">
        <button data-testid="button-task-again" onClick={onGenerateAgain}>{t.taskAgain}</button>
        <button data-testid="button-share-task" onClick={share} disabled={sharing}>{sharing ? "..." : t.share}</button>
        <button
          className="task-reveal__done"
          data-testid={isShared ? "button-close-shared-task" : "button-task-done"}
          onClick={onDismiss}
        >
          {isShared ? pairCopy.close : t.taskDone}
        </button>
      </div>
    </div>
  );
}

interface Props {
  lang: Lang; gender?: Gender; category: Category; onBack: () => void;
  onCategoryChange: (category: Category) => void; swipeDir: "left" | "right";
  coupleId?: string | null; mode?: AppMode; onUpgrade?: () => Promise<boolean>;
  onBuyPremiumTask?: (category: Category) => Promise<boolean>;
  initialSharedTask?: SharedTaskSnapshot | null;
}

const PREMIUM_GATE_COPY: Record<Lang, {
  title: string; description: string; premiumTitle: string; premiumDetails: string;
  taskTitle: string; taskDetails: (category: string) => string; close: string;
  processing: string; pending: string; unavailable: string; working: string;
}> = {
  ru: {
    title: "Откройте премиум-задание", description: "Выберите подходящий вариант для этой категории.",
    premiumTitle: "Touché Premium · 199 ⭐", premiumDetails: "Доступ ко всем премиум-функциям на 30 дней",
    taskTitle: "Одно задание · 20 ⭐", taskDetails: (category) => `Одно задание в категории «${category}»`,
    close: "Позже", processing: "Проверяем оплату…", pending: "Платёж обрабатывается. Задание появится здесь после подтверждения.",
    unavailable: "Оплата не завершена. Можно выбрать вариант ещё раз.", working: "Открываем оплату…",
  },
  en: {
    title: "Unlock a premium task", description: "Choose how you want to access this category.",
    premiumTitle: "Touché Premium · 199 ⭐", premiumDetails: "All premium features for 30 days",
    taskTitle: "One task · 20 ⭐", taskDetails: (category) => `One task in ${category}`,
    close: "Not now", processing: "Checking payment…", pending: "Payment is processing. This task will be available here once confirmed.",
    unavailable: "Payment was not completed. You can choose an option again.", working: "Opening payment…",
  },
  hi: {
    title: "प्रीमियम टास्क अनलॉक करें", description: "इस श्रेणी के लिए एक विकल्प चुनें।",
    premiumTitle: "Touché Premium · 199 ⭐", premiumDetails: "30 दिनों के लिए सभी प्रीमियम सुविधाएँ",
    taskTitle: "एक टास्क · 20 ⭐", taskDetails: (category) => `${category} श्रेणी में एक टास्क`,
    close: "अभी नहीं", processing: "भुगतान जाँच रहे हैं…", pending: "भुगतान प्रक्रिया में है। पुष्टि के बाद टास्क यहाँ उपलब्ध होगा।",
    unavailable: "भुगतान पूरा नहीं हुआ। आप फिर से विकल्प चुन सकते हैं।", working: "भुगतान खोल रहे हैं…",
  },
  pt: {
    title: "Desbloqueie uma tarefa Premium", description: "Escolha como acessar esta categoria.",
    premiumTitle: "Touché Premium · 199 ⭐", premiumDetails: "Todos os recursos Premium por 30 dias",
    taskTitle: "Uma tarefa · 20 ⭐", taskDetails: (category) => `Uma tarefa na categoria ${category}`,
    close: "Agora não", processing: "Verificando o pagamento…", pending: "O pagamento está sendo processado. A tarefa ficará disponível após a confirmação.",
    unavailable: "O pagamento não foi concluído. Você pode escolher novamente.", working: "Abrindo o pagamento…",
  },
  es: {
    title: "Desbloquea una tarea Premium", description: "Elige cómo acceder a esta categoría.",
    premiumTitle: "Touché Premium · 199 ⭐", premiumDetails: "Todas las funciones Premium durante 30 días",
    taskTitle: "Una tarea · 20 ⭐", taskDetails: (category) => `Una tarea en la categoría ${category}`,
    close: "Ahora no", processing: "Comprobando el pago…", pending: "El pago se está procesando. La tarea estará disponible cuando se confirme.",
    unavailable: "El pago no se completó. Puedes elegir una opción de nuevo.", working: "Abriendo el pago…",
  },
};

export default function CategoryScreen({ lang, gender, category, onBack, onCategoryChange, swipeDir, coupleId, mode = "solo", onUpgrade, onBuyPremiumTask, initialSharedTask }: Props) {
  const cfg = CATEGORY_CONFIG[category];
  const popColor = POP_COLORS[category];
  const t = UI[lang];
  const topPadding = useTelegramTopInset();
  const [mounted, setMounted] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>(loadHistory);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(() => initialSharedTask?.taskId ?? null);
  const [taskText, setTaskText] = useState(() => initialSharedTask?.task ?? "");
  const [sharedTask, setSharedTask] = useState<SharedTaskSnapshot | null>(() => initialSharedTask ?? null);
  const [taskSource, setTaskSource] = useState<"ai" | "fallback">(() => initialSharedTask?.source ?? "fallback");
  const [isCasting, setIsCasting] = useState(false);
  const [showReveal, setShowReveal] = useState(() => !!initialSharedTask);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [errorKind, setErrorKind] = useState<TaskError["kind"] | null>(null);
  const [generatedErrorCode, setGeneratedErrorCode] = useState<string | null>(null);
  const [paywallBusy, setPaywallBusy] = useState<"premium" | "single" | null>(null);
  const [paywallNotice, setPaywallNotice] = useState<string | null>(null);
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);
  const touchStart = useRef({ x: 0, y: 0 });
  const revealTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef<string | null>(null);
  const index = CATEGORIES_ORDER.indexOf(category);
  const label = categoryLabel(category, t);
  const sub = categorySub(category, t);
  const sensitive = category === "passion" || category === "hard";
  const paywallCopy = PREMIUM_GATE_COPY[lang];
  const sharedCopy = SHARED_TASK_COPY[lang];
  const sharedTaskStatus = sharedCopy.shared;
  const sharedTaskHint = sharedCopy.checkInHint;
  const errorCopy: Record<TaskError["kind"], string> = {
    subscription_required: lang === "ru" ? "Эта категория доступна в Premium." : "This category is available in Premium.",
    limit_exceeded: lang === "ru" ? "Лимит на сегодня закончился." : "Today's limit is used.",
    rate_limited: lang === "ru" ? "Слишком много запросов. Попробуйте чуть позже." : "Too many requests. Try again shortly.",
    unauthorized: lang === "ru" ? "Откройте приложение из Telegram заново." : "Please reopen the app from Telegram.",
    timeout: lang === "ru" ? "Сервер отвечает слишком долго. Попробуйте ещё раз." : "The server took too long. Please try again.",
    unknown: lang === "ru" ? "Не удалось получить задание. Попробуйте ещё раз." : "Could not get a task. Try again.",
  };

  useEffect(() => {
    requestAnimationFrame(() => setMounted(true));
    const tg = window.Telegram?.WebApp;
    const update = () => {
      const height = tg?.viewportStableHeight ?? tg?.viewportHeight;
      if (height && height > 100) setViewportHeight(height);
    };
    update(); tg?.onEvent?.("viewportChanged", update);
    const timer = setTimeout(update, 500);
    return () => { tg?.offEvent?.("viewportChanged", update); clearTimeout(timer); };
  }, [category]);

  const refreshLimits = useCallback(async () => {
    const initData = getInitData();
    if (!initData) return null;
    try {
      const res = await fetch(`/api/limits?category=${category}`, { headers: { "x-telegram-init-data": initData } });
      if (!res.ok) return null;
      const data = await res.json();
      setIsPremium(data.isPremium === true);
      setRemaining(data.isPremium ? null : Number(data.remaining));
      return data as { isPremium?: boolean; remaining?: number };
    } catch { return null; }
  }, [category]);

  useEffect(() => {
    const refresh = () => { void refreshLimits(); };
    refresh();
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [refreshLimits]);

  const goToCategory = useCallback((next: Category) => {
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred("light");
    onCategoryChange(next);
  }, [onCategoryChange]);
  const onTouchStart = useCallback((event: TouchEvent) => {
    touchStart.current = { x: event.touches[0].clientX, y: event.touches[0].clientY };
  }, []);
  const onTouchEnd = useCallback((event: TouchEvent) => {
    const dx = event.changedTouches[0].clientX - touchStart.current.x;
    const dy = event.changedTouches[0].clientY - touchStart.current.y;
    if (Math.abs(dx) < 50 || Math.abs(dy) > Math.abs(dx) * .9) return;
    if (dx < 0 && index < CATEGORIES_ORDER.length - 1) goToCategory(CATEGORIES_ORDER[index + 1]);
    if (dx > 0 && index > 0) goToCategory(CATEGORIES_ORDER[index - 1]);
  }, [goToCategory, index]);

  const generate = useCallback(async () => {
    if (isCasting) return;
    const tg = window.Telegram?.WebApp;
    tg?.HapticFeedback?.impactOccurred("medium");
    setIsCasting(true); setErrorKind(null); setGeneratedErrorCode(null);
    const requestKey = `touche_pending_task_${tg?.initDataUnsafe?.user?.id ?? "unknown"}_${mode}_${category}`;
    if (!requestIdRef.current) {
      try { requestIdRef.current = sessionStorage.getItem(requestKey); } catch { /* storage unavailable */ }
      if (!requestIdRef.current) requestIdRef.current = crypto.randomUUID();
      try { sessionStorage.setItem(requestKey, requestIdRef.current); } catch { /* retry still works in this view */ }
    }
    const generated = await generateAITask(category, lang, gender, mode, coupleId ?? null, requestIdRef.current);
    if (!generated.result) {
      setErrorKind(generated.error?.kind ?? "unknown"); setGeneratedErrorCode(generated.error?.message ?? null);
      setIsCasting(false); tg?.HapticFeedback?.notificationOccurred?.("error"); return;
    }
    requestIdRef.current = null;
    try { sessionStorage.removeItem(requestKey); } catch { /* storage unavailable */ }
    const picked = generated.result.task;
    if (typeof generated.result.remaining === "number") setRemaining(generated.result.remaining);
    const entry: HistoryEntry = { id: `${Date.now()}-${Math.random()}`, text: picked, category, date: new Date().toISOString() };
    const nextHistory = [...history, entry]; saveHistory(nextHistory); setHistory(nextHistory);
    setTaskId(generated.result.taskId);
    setTaskText(picked);
    setTaskSource(generated.result.source ?? "ai");
    if (mode === "together" && coupleId && generated.result.taskId) {
      setSharedTask({
        taskId: generated.result.taskId,
        coupleId,
        category,
        task: picked,
        source: generated.result.source ?? "ai",
        createdAt: new Date().toISOString(),
        completedAt: null,
        myCompleted: false,
        partnerCompleted: false,
        state: "ready",
      });
    } else {
      setSharedTask(null);
    }
    setIsCasting(false);
    tg?.HapticFeedback?.notificationOccurred?.("success");
    if (revealTimer.current) clearTimeout(revealTimer.current);
    revealTimer.current = setTimeout(() => setShowReveal(true), 80);
  }, [category, coupleId, gender, history, isCasting, lang, mode]);

  const openPremiumGate = useCallback(() => {
    setPaywallNotice(null);
    setErrorKind("subscription_required");
  }, []);

  const choosePremiumAccess = useCallback(async (choice: "premium" | "single") => {
    if (paywallBusy) return;
    setPaywallBusy(choice);
    setPaywallNotice(null);
    try {
      const invoiceOpened = choice === "premium"
        ? await onUpgrade?.()
        : await onBuyPremiumTask?.(category);
      if (!invoiceOpened) {
        setPaywallNotice(paywallCopy.unavailable);
        return;
      }
      setPaywallNotice(paywallCopy.processing);
      let accessReady = false;
      for (let attempt = 0; attempt < 16; attempt += 1) {
        const limits = await refreshLimits();
        if (limits && (limits.isPremium === true || Number(limits.remaining ?? 0) > 0)) {
          accessReady = true;
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 750));
      }
      if (!accessReady) {
        setPaywallNotice(paywallCopy.pending);
        return;
      }
      setPaywallNotice(null);
      setErrorKind(null);
      await generate();
    } catch {
      setPaywallNotice(paywallCopy.unavailable);
    } finally {
      setPaywallBusy(null);
    }
  }, [category, generate, onBuyPremiumTask, onUpgrade, paywallBusy, paywallCopy, refreshLimits]);

  const dismiss = useCallback(() => {
    setShowReveal(false);
    setTimeout(() => setTaskText(""), 400);
  }, []);

  const height = viewportHeight ? `${viewportHeight}px` : "100dvh";
  const enterX = swipeDir === "left" ? 60 : -60;
  return (
    <main className="category-pop" style={{ height, opacity: mounted ? 1 : 0, transform: mounted ? "translateX(0)" : `translateX(${enterX}px)` }} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <header className="category-pop__top" style={{ paddingTop: topPadding }}>
        <button data-testid="button-category-back" className="category-pop__menu" onClick={onBack} aria-label={t.backLabel}><span /><span /><span /></button>
        <div className="category-pop__logo">Touch<em>é</em></div>
        <button data-testid="button-open-history" className="category-pop__history" onClick={() => setHistoryOpen(true)}>{t.history}</button>
      </header>
      <div className="category-pop__content">
        <section className="category-pop__hero">
          <span className="category-pop__stamp">{mode === "together" ? t.sharedTask : `18+ · ${t.lockSub}`}</span>
           <div className="category-pop__orb" style={{ backgroundImage: `url(/images/cat-${category}-art.svg)` }} aria-hidden="true" />
          <p className="category-pop__eyebrow">{categorySub(category, t)}</p>
          <h1 data-testid="text-category-title">{label}</h1>
           <p className="category-pop__description">{({
             compliments: t.catComplimentsDesc, tenderness: t.catTendernessDesc,
             desire: t.catDesireDesc, passion: t.catPassionDesc, hard: t.catHardDesc,
           })[category]}</p>
        </section>
         {sensitive && <div className="category-pop__warning" role="note">18+ · {t.lockSub}</div>}
         {mode === "together" && <div className="category-pop__mode"><span className="category-pop__mode-dot" style={{ background: `rgb(${popColor.r},${popColor.g},${popColor.b})` }} /><strong>{t.sharedTask}</strong><small>{coupleId ? t.linked : t.appSub}</small></div>}
          {mode === "together" && sharedTask && !showReveal && (
            <div data-testid="card-shared-task-status" role="status" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 14px", borderRadius: 14, background: "rgba(22,34,56,.05)", border: "1px solid rgba(22,34,56,.10)" }}>
              <span style={{ minWidth: 0 }}>
                <strong style={{ display: "block", fontSize: 12, color: "#162238" }}>{sharedTaskStatus}</strong>
                <small style={{ display: "block", marginTop: 3, fontSize: 10, lineHeight: 1.4, color: "rgba(22,34,56,.68)" }}>{sharedTaskHint}</small>
              </span>
              <button type="button" data-testid="button-reopen-shared-task" onClick={() => setShowReveal(true)} style={{ flexShrink: 0, padding: "9px 11px", border: "1px solid rgba(22,34,56,.18)", borderRadius: 11, background: "#fffaf3", color: "#162238", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>{sharedCopy.openTask}</button>
            </div>
          )}
        {(remaining !== null || isPremium) && <div className="category-pop__remaining" data-testid="status-remaining">{isPremium ? (lang === "ru" ? "Задания без ограничений" : "Unlimited tasks") : t.remaining(remaining!)}</div>}
        <section className="category-pop__generator">
           <div className="category-pop__generator-head"><span>{t.hint}</span><b>{String(index + 1).padStart(2, "0")} / {String(CATEGORIES_ORDER.length).padStart(2, "0")}</b></div>
          <div className="category-pop__heartbeat">
             <HeartbeatCanvas onHoldComplete={generate} isCasting={isCasting} color={popColor} hintText={isCasting ? t.tapping : t.hint} holdDuration={2600} baseRScale={0.28} bgColor="#fffaf3" />
          </div>
          {errorKind && errorKind !== "subscription_required" && <div className="category-pop__error" role="alert" data-testid="status-task-error"><strong>{errorCopy[errorKind]}</strong>{errorKind === "unknown" && generatedErrorCode && <small>{generatedErrorCode}</small>}<button onClick={() => setErrorKind(null)}>{lang === "ru" ? "Понятно" : "Dismiss"}</button></div>}
        </section>
        <div className="category-pop__dots" aria-label="Categories">
           {CATEGORIES_ORDER.map((item) => <button key={item} data-testid={`button-category-${item}`} className={item === category ? "active" : ""} onClick={() => goToCategory(item)} style={{ background: item === category ? `rgb(${POP_COLORS[item].r},${POP_COLORS[item].g},${POP_COLORS[item].b})` : undefined }} aria-label={categoryLabel(item, t)} />)}
        </div>
        <p className="category-pop__hold-label">{t.holdHint}</p>
          {sensitive && !isPremium && onUpgrade && onBuyPremiumTask && <button className="category-pop__premium" data-testid="button-premium-category" onClick={openPremiumGate}><span>P</span><strong>Touché Premium</strong><small>{t.subTagline}</small><b>→</b></button>}
         <footer className="category-pop__footer"><strong>Touché</strong><span>{t.appSub}</span></footer>
      </div>
      {errorKind === "subscription_required" && (
        <div className="category-paywall-backdrop" role="presentation" onClick={() => { if (!paywallBusy) setErrorKind(null); }}>
          <section className="category-paywall" role="dialog" aria-modal="true" aria-labelledby="category-paywall-title" onClick={(event) => event.stopPropagation()}>
            <div className="category-paywall__topline"><span>18+ · Touché</span><button type="button" aria-label={paywallCopy.close} onClick={() => { setErrorKind(null); setPaywallNotice(null); }} disabled={!!paywallBusy}>×</button></div>
            <h2 id="category-paywall-title">{paywallCopy.title}</h2>
            <p>{paywallCopy.description}</p>
            <button className="category-paywall__offer category-paywall__offer--premium" data-testid="button-buy-premium" onClick={() => void choosePremiumAccess("premium")} disabled={!!paywallBusy}>
              <strong>{paywallBusy === "premium" ? paywallCopy.working : paywallCopy.premiumTitle}</strong>
              <small>{paywallCopy.premiumDetails}</small>
            </button>
            <button className="category-paywall__offer category-paywall__offer--single" data-testid="button-buy-premium-task" onClick={() => void choosePremiumAccess("single")} disabled={!!paywallBusy}>
              <strong>{paywallBusy === "single" ? paywallCopy.working : paywallCopy.taskTitle}</strong>
              <small>{paywallCopy.taskDetails(label)}</small>
            </button>
            {paywallNotice && <div className="category-paywall__notice" role="status">{paywallNotice}</div>}
          </section>
        </div>
      )}
      <TaskReveal
        text={taskText}
        color={cfg}
        visible={showReveal}
        onDismiss={dismiss}
        onGenerateAgain={() => { setShowReveal(false); setTimeout(generate, 120); }}
        lang={lang}
        catLabel={label}
        source={taskSource}
        isShared={mode === "together" && !!sharedTask}
      />
      <HistoryPanel entries={history.filter((entry) => entry.category === category)} open={historyOpen} onClose={() => setHistoryOpen(false)} accentRgb={cfg} lang={lang} />
    </main>
  );
}