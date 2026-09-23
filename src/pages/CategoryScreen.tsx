import { useCallback, useEffect, useRef, useState, type TouchEvent } from "react";
import type { Gender } from "@/components/GenderSelect";
import type { AppMode } from "@/App";
import HeartbeatCanvas from "@/components/HeartbeatCanvas";
import { UI, CATEGORY_CONFIG, CATEGORIES_ORDER, type Lang, type Category } from "@/data/i18n";
import { playReveal } from "@/hooks/useSensualSound";
import { addLocalPoints } from "@/data/intimacy";
import HistoryPanel, { type HistoryEntry } from "@/components/HistoryPanel";
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
): Promise<{ result?: TaskResult; error?: TaskError }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25_000);
  try {
    const response = await fetch("/api/tasks/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-telegram-init-data": getInitData() },
      body: JSON.stringify({ category, lang, gender, mode, coupleId }),
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

function TaskReveal({ text, color, visible, onDismiss, onGenerateAgain, lang, catLabel, source }: {
  text: string; color: { r: number; g: number; b: number }; visible: boolean;
  onDismiss: () => void; onGenerateAgain: () => void; lang: Lang; catLabel: string; source?: "ai" | "fallback";
}) {
  const t = UI[lang];
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
      {source === "ai" && <span className="task-reveal__source">AI prompt</span>}
      <div className="task-reveal__actions">
        <button data-testid="button-task-again" onClick={onGenerateAgain}>{t.taskAgain}</button>
        <button data-testid="button-share-task" onClick={share} disabled={sharing}>{sharing ? "..." : t.share}</button>
        <button className="task-reveal__done" data-testid="button-task-done" onClick={onDismiss}>{t.taskDone}</button>
      </div>
    </div>
  );
}

interface Props {
  lang: Lang; gender?: Gender; category: Category; onBack: () => void;
  onCategoryChange: (category: Category) => void; swipeDir: "left" | "right";
  coupleId?: string | null; mode?: AppMode; onUpgrade?: () => Promise<boolean>;
}

export default function CategoryScreen({ lang, gender, category, onBack, onCategoryChange, swipeDir, coupleId, mode = "solo", onUpgrade }: Props) {
  const cfg = CATEGORY_CONFIG[category];
  const popColor = POP_COLORS[category];
  const t = UI[lang];
  const topPadding = useTelegramTopInset();
  const [mounted, setMounted] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>(loadHistory);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [taskText, setTaskText] = useState("");
  const [taskSource, setTaskSource] = useState<"ai" | "fallback">("fallback");
  const [isCasting, setIsCasting] = useState(false);
  const [showReveal, setShowReveal] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [errorKind, setErrorKind] = useState<TaskError["kind"] | null>(null);
  const [generatedErrorCode, setGeneratedErrorCode] = useState<string | null>(null);
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);
  const touchStart = useRef({ x: 0, y: 0 });
  const revealTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const index = CATEGORIES_ORDER.indexOf(category);
  const label = categoryLabel(category, t);
  const sub = categorySub(category, t);
  const sensitive = category === "passion" || category === "hard";
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
    const generated = await generateAITask(category, lang, gender, mode, coupleId ?? null);
    if (!generated.result) {
      setErrorKind(generated.error?.kind ?? "unknown"); setGeneratedErrorCode(generated.error?.message ?? null);
      setIsCasting(false); tg?.HapticFeedback?.notificationOccurred?.("error"); return;
    }
    const picked = generated.result.task;
    if (typeof generated.result.remaining === "number") setRemaining(generated.result.remaining);
    const entry: HistoryEntry = { id: `${Date.now()}-${Math.random()}`, text: picked, category, date: new Date().toISOString() };
    const nextHistory = [...history, entry]; saveHistory(nextHistory); setHistory(nextHistory);
    setTaskId(generated.result.taskId); setTaskText(picked); setTaskSource(generated.result.source ?? "ai"); setIsCasting(false);
    tg?.HapticFeedback?.notificationOccurred?.("success");
    if (revealTimer.current) clearTimeout(revealTimer.current);
    revealTimer.current = setTimeout(() => setShowReveal(true), 80);
  }, [category, coupleId, gender, history, isCasting, lang, mode]);

  const dismiss = useCallback(() => {
    if (mode === "together" && coupleId && taskId) {
      fetch("/api/couple/intimacy?action=complete", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-telegram-init-data": getInitData() },
        body: JSON.stringify({ task_id: taskId }),
      }).then((response) => {
        if (response.ok) { addLocalPoints(category); window.dispatchEvent(new CustomEvent("touche-intimacy-updated")); }
      }).catch(() => {});
    }
    setShowReveal(false);
    setTimeout(() => setTaskText(""), 400);
  }, [category, coupleId, mode, taskId]);

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
           <div className="category-pop__orb" style={{ backgroundImage: `linear-gradient(rgba(31,10,27,.18),rgba(31,10,27,.58)),url(/images/cat-${category}-tile.webp)` }} aria-hidden="true">{String(index + 1).padStart(2, "0")}</div>
          <p className="category-pop__eyebrow">{categorySub(category, t)}</p>
          <h1 data-testid="text-category-title">{label}</h1>
           <p className="category-pop__description">{({
             compliments: t.catComplimentsDesc, tenderness: t.catTendernessDesc,
             desire: t.catDesireDesc, passion: t.catPassionDesc, hard: t.catHardDesc,
           })[category]}</p>
        </section>
         {sensitive && <div className="category-pop__warning" role="note">18+ · {t.lockSub}</div>}
         {mode === "together" && <div className="category-pop__mode"><span className="category-pop__mode-dot" style={{ background: `rgb(${popColor.r},${popColor.g},${popColor.b})` }} /><strong>{t.sharedTask}</strong><small>{coupleId ? t.linked : t.appSub}</small></div>}
        {remaining !== null && <div className="category-pop__remaining" data-testid="status-remaining">{t.remaining(remaining)}</div>}
        <section className="category-pop__generator">
           <div className="category-pop__generator-head"><span>{t.hint}</span><b>{String(index + 1).padStart(2, "0")} / {String(CATEGORIES_ORDER.length).padStart(2, "0")}</b></div>
          <div className="category-pop__heartbeat">
             <HeartbeatCanvas onHoldComplete={generate} isCasting={isCasting} color={popColor} hintText={isCasting ? t.tapping : t.hint} holdDuration={2600} baseRScale={0.28} bgColor="#fffaf3" />
          </div>
          {errorKind && <div className="category-pop__error" role="alert" data-testid="status-task-error"><strong>{errorCopy[errorKind]}</strong>{errorKind === "unknown" && generatedErrorCode && <small>{generatedErrorCode}</small>}{errorKind === "subscription_required" && onUpgrade && <button data-testid="button-open-premium" onClick={() => void onUpgrade()}>{lang === "ru" ? "Открыть Premium" : "Open Premium"}</button>}<button onClick={() => setErrorKind(null)}>{lang === "ru" ? "Понятно" : "Dismiss"}</button></div>}
        </section>
        <div className="category-pop__dots" aria-label="Categories">
           {CATEGORIES_ORDER.map((item) => <button key={item} data-testid={`button-category-${item}`} className={item === category ? "active" : ""} onClick={() => goToCategory(item)} style={{ background: item === category ? `rgb(${POP_COLORS[item].r},${POP_COLORS[item].g},${POP_COLORS[item].b})` : undefined }} aria-label={categoryLabel(item, t)} />)}
        </div>
        <p className="category-pop__hold-label">{t.holdHint}</p>
         {sensitive && onUpgrade && <button className="category-pop__premium" data-testid="button-premium-category" onClick={() => void onUpgrade()}><span>P</span><strong>Touché Premium</strong><small>{t.subTagline}</small><b>→</b></button>}
         <footer className="category-pop__footer"><strong>Touché</strong><span>{t.appSub}</span></footer>
      </div>
      <TaskReveal text={taskText} color={cfg} visible={showReveal} onDismiss={dismiss} onGenerateAgain={() => { setShowReveal(false); setTimeout(generate, 120); }} lang={lang} catLabel={label} source={taskSource} />
      <HistoryPanel entries={history.filter((entry) => entry.category === category)} open={historyOpen} onClose={() => setHistoryOpen(false)} accentRgb={cfg} lang={lang} />
    </main>
  );
}