import { useEffect, useCallback, useState, useRef } from "react";
import HeartbeatCanvas from "@/components/HeartbeatCanvas";
import { UI, CATEGORY_CONFIG, CATEGORIES_ORDER, type Lang, type Category } from "@/data/i18n";
import { playReveal, playDismiss } from "@/hooks/useSensualSound";
import { tasks as staticTasks } from "@/data/tasks";

const BG = "#0d0610";
const TEXT_P = "rgba(255,238,248,0.88)";
const TEXT_S = "rgba(255,238,248,0.44)";
const TEXT_T = "rgba(255,238,248,0.22)";
const DIVIDER = "rgba(255,255,255,0.05)";

declare global {
  interface Window {
    Telegram?: { WebApp: {
      HapticFeedback?: { impactOccurred: (s: string) => void; notificationOccurred: (s: string) => void };
      initData?: string;
      viewportHeight?: number; viewportStableHeight?: number;
      onEvent?: (e: string, cb: () => void) => void;
      offEvent?: (e: string, cb: () => void) => void;
      openInvoice?: (url: string, cb: (s: string) => void) => void;
      safeAreaInset?: { top: number; bottom: number; left: number; right: number };
      contentSafeAreaInset?: { top: number; bottom: number; left: number; right: number };
    } };
  }
}

const LIMITS_KEY  = "touche_limits_v2";
const HISTORY_KEY = "touche_history_v2";

type LimitEntry  = { date: string; count: number; bonus: number };
type Limits      = Record<Category, LimitEntry>;
type HistoryEntry = { id: string; text: string; category: Category; date: string };

function getTodayStr() { return new Date().toISOString().slice(0, 10); }
function emptyLimits(): Limits {
  const e = () => ({ date: getTodayStr(), count: 0, bonus: 0 });
  return { compliments: e(), tenderness: e(), desire: e(), passion: e(), hard: e() };
}
function loadLimits():  Limits          { try { const v = localStorage.getItem(LIMITS_KEY);  if (v) return JSON.parse(v); } catch {} return emptyLimits(); }
function saveLimits(l:  Limits)         { try { localStorage.setItem(LIMITS_KEY,  JSON.stringify(l)); } catch {} }
function loadHistory(): HistoryEntry[]  { try { const v = localStorage.getItem(HISTORY_KEY); if (v) return JSON.parse(v); } catch {} return []; }
function saveHistory(h: HistoryEntry[]) { try { localStorage.setItem(HISTORY_KEY, JSON.stringify(h)); } catch {} }
function getCachedRemaining(limits: Limits, category: Category): number {
  const e = limits[category]; const today = getTodayStr();
  if (e.date !== today) return 1;
  return Math.max(0, 1 + e.bonus - e.count);
}

async function fetchServerRemaining(category: Category): Promise<number | null> {
  try {
    const initData = window.Telegram?.WebApp?.initData;
    if (!initData) return null;
    const res = await fetch(`/api/limits/get?category=${category}`, { headers: { "x-telegram-init-data": initData } });
    if (!res.ok) return null;
    const d = await res.json(); return d.remaining ?? null;
  } catch { return null; }
}

async function useServerLimit(category: Category): Promise<boolean> {
  try {
    const initData = window.Telegram?.WebApp?.initData;
    if (!initData) return true;
    const res = await fetch("/api/limits/use", { method: "POST", headers: { "Content-Type": "application/json", "x-telegram-init-data": initData }, body: JSON.stringify({ category }) });
    return res.ok;
  } catch { return true; }
}

async function generateAITask(category: Category, lang: Lang): Promise<string | null> {
  try {
    const initData = window.Telegram?.WebApp?.initData;
    if (!initData) return null;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch("/api/tasks/generate", { method: "POST", headers: { "Content-Type": "application/json", "x-telegram-init-data": initData }, body: JSON.stringify({ category, lang }), signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const data = await res.json();
    return data.task ?? null;
  } catch { return null; }
}

function pickStaticTask(category: Category): string {
  const pool = staticTasks[category] ?? [];
  return pool[Math.floor(Math.random() * pool.length)] ?? "Обними партнёра.";
}

function useTelegramTopInset(): string {
  const [topPx, setTopPx] = useState<number>(0);
  useEffect(() => {
    const tg = window.Telegram?.WebApp as any;
    function compute() {
      const content = tg?.contentSafeAreaInset?.top ?? 0;
      const safe = tg?.safeAreaInset?.top ?? 0;
      const total = content + safe;
      if (total > 10) setTopPx(total + 10);
    }
    compute();
    tg?.onEvent?.("safeAreaChanged", compute);
    tg?.onEvent?.("contentSafeAreaInsetChanged", compute);
    const tm = setTimeout(compute, 800);
    return () => {
      tg?.offEvent?.("safeAreaChanged", compute);
      tg?.offEvent?.("contentSafeAreaInsetChanged", compute);
      clearTimeout(tm);
    };
  }, []);
  return topPx > 0 ? `${topPx}px` : "max(80px, env(safe-area-inset-top))";
}

function CategoryDots({ current, onDotPress }: { current: Category; onDotPress: (c: Category) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
      {CATEGORIES_ORDER.map(cat => {
        const cfg = CATEGORY_CONFIG[cat]; const active = cat === current;
        return (
          <button key={cat} onClick={() => onDotPress(cat)} style={{ background: "none", border: "none", padding: "8px 4px", cursor: "pointer", display: "flex", alignItems: "center" }}>
            <div style={{ width: active ? 24 : 7, height: 4, borderRadius: 99, background: active ? `rgb(${cfg.r},${cfg.g},${cfg.b})` : "rgba(255,238,248,0.18)", boxShadow: active ? `0 0 10px rgba(${cfg.r},${cfg.g},${cfg.b},.55)` : "none", transition: "all .35s cubic-bezier(.32,.72,0,1)" }} />
          </button>
        );
      })}
    </div>
  );
}

function TaskReveal({ text, color, visible, onDismiss, lang, catLabel, source, topPadding }: {
  text: string; color: { r: number; g: number; b: number };
  visible: boolean; onDismiss: () => void; lang: Lang; catLabel: string;
  source?: "ai" | "fallback"; topPadding: string;
}) {
  const { r, g, b } = color; const t = UI[lang];
  const [textVisible, setTextVisible] = useState(false);
  useEffect(() => {
    if (visible) { const tm = setTimeout(() => setTextVisible(true), 220); return () => clearTimeout(tm); }
    else setTextVisible(false);
  }, [visible]);
  useEffect(() => { if (visible) playReveal(); }, [visible]);

  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 30, background: `rgba(${r},${g},${b},.96)`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: `32px 28px max(32px,env(safe-area-inset-bottom))`, opacity: visible ? 1 : 0, pointerEvents: visible ? "auto" : "none", transition: "opacity .38s cubic-bezier(.22,1,.36,1)", backdropFilter: "blur(2px)" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, display: "flex", justifyContent: "center", paddingTop: topPadding, opacity: textVisible ? 1 : 0, transform: textVisible ? "translateY(0)" : "translateY(-8px)", transition: "opacity .5s ease .1s,transform .5s ease .1s" }}>
        <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 400, fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(255,255,255,.55)" }}>{catLabel}</span>
      </div>
      <div style={{ opacity: textVisible ? 1 : 0, transform: textVisible ? "translateY(0)" : "translateY(28px)", transition: "opacity .6s cubic-bezier(.16,1,.3,1) .18s,transform .6s cubic-bezier(.16,1,.3,1) .18s", textAlign: "center", width: "100%" }}>
        <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 600, fontSize: "clamp(22px,6.5vw,34px)", color: "#ffffff", lineHeight: 1.45, letterSpacing: "-0.01em", margin: 0, textShadow: "0 2px 24px rgba(0,0,0,.20)" }}>{text}</p>
        {source === "ai" && (
          <div style={{ marginTop: 12, display: "inline-flex", padding: "3px 10px", borderRadius: 20, border: "1px solid rgba(255,255,255,.22)" }}>
            <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 300, fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(255,255,255,.40)" }}>✦ ai</span>
          </div>
        )}
      </div>
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: `0 28px max(28px,env(safe-area-inset-bottom))`, opacity: textVisible ? 1 : 0, transform: textVisible ? "translateY(0)" : "translateY(12px)", transition: "opacity .5s ease .35s,transform .5s ease .35s" }}>
        <button onClick={onDismiss} style={{ width: "100%", padding: "18px 8px", borderRadius: 18, background: "rgba(255,255,255,.18)", border: "1px solid rgba(255,255,255,.32)", cursor: "pointer", fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 500, fontSize: 16, letterSpacing: "0.02em", color: "#ffffff", backdropFilter: "blur(8px)" }}>{t.taskDone}</button>
      </div>
      <div style={{ position: "absolute", top: "-15%", right: "-20%", width: "55vw", height: "55vw", borderRadius: "50%", background: "rgba(255,255,255,.06)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: "-10%", left: "-18%", width: "45vw", height: "45vw", borderRadius: "50%", background: "rgba(255,255,255,.05)", pointerEvents: "none" }} />
    </div>
  );
}

function StarsShop({ open, onClose, onPurchased, accentRgb, lang, paid }: {
  open: boolean; onClose: () => void; onPurchased: (n: number) => void;
  accentRgb: { r: number; g: number; b: number }; lang: Lang; paid: boolean;
}) {
  const { r, g, b } = accentRgb; const t = UI[lang];
  const [loading, setLoading] = useState(false);
  const handleBuy = useCallback(async () => {
    setLoading(true);
    try {
      const initData = window.Telegram?.WebApp?.initData;
      const res = await fetch("/api/payments/invoice", { method: "POST", headers: { "Content-Type": "application/json", "x-telegram-init-data": initData ?? "" }, body: JSON.stringify({ paid }) });
      const data = await res.json();
      if (data.invoiceLink) window.Telegram?.WebApp?.openInvoice?.(data.invoiceLink, (s: string) => { if (s === "paid") { onPurchased(1); onClose(); } setLoading(false); });
    } catch { setLoading(false); }
  }, [paid, onPurchased, onClose]);

  return (
    <>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, zIndex: 40, background: "rgba(0,0,0,.45)", opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none", transition: "opacity .3s", backdropFilter: open ? "blur(4px)" : "none" }} />
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 50, borderRadius: "22px 22px 0 0", background: "rgba(22,13,20,.99)", backdropFilter: "blur(32px)", borderTop: `1px solid rgba(${r},${g},${b},.28)`, boxShadow: "0 -14px 50px rgba(0,0,0,.40)", transform: open ? "translateY(0)" : "translateY(110%)", transition: "transform .42s cubic-bezier(.32,.72,0,1)", paddingBottom: 28 }}>
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 13, paddingBottom: 5 }}>
          <div style={{ width: 34, height: 3, borderRadius: 99, background: `rgba(${r},${g},${b},.28)` }} />
        </div>
        <div style={{ textAlign: "center", padding: "8px 24px 22px" }}>
          <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 600, fontSize: 22, color: TEXT_P, margin: 0 }}>{t.starsTitle}</p>
          <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 300, fontSize: 13, color: `rgba(${r},${g},${b},.70)`, margin: "8px 0 0" }}>{t.starsSub}</p>
        </div>
        <div style={{ padding: "0 20px 14px" }}>
          <button onClick={handleBuy} disabled={loading} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "17px 20px", borderRadius: 16, background: `rgba(${r},${g},${b},.10)`, border: `1px solid rgba(${r},${g},${b},.28)`, cursor: loading ? "default" : "pointer" }}>
            <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 500, fontSize: 17, color: TEXT_P }}>{paid ? t.starsPackPaid : t.starsPackFree}</span>
            <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 600, fontSize: 17, color: `rgba(${r},${g},${b},.95)` }}>{loading ? "..." : (paid ? t.starsPricePaid : t.starsPriceFree)}</span>
          </button>
        </div>
        <div style={{ padding: "0 20px" }}>
          <button onClick={() => { playDismiss(); onClose(); }} style={{ width: "100%", padding: "12px 8px", borderRadius: 14, background: "transparent", border: "1px solid rgba(255,238,248,.10)", cursor: "pointer", fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 300, fontSize: 13, color: TEXT_S }}>{t.starsCancel}</button>
        </div>
      </div>
    </>
  );
}

function HistoryPanel({ entries, open, onClose, accentRgb, lang }: {
  entries: HistoryEntry[]; open: boolean; onClose: () => void;
  accentRgb: { r: number; g: number; b: number }; lang: Lang;
}) {
  const { r, g, b } = accentRgb; const t = UI[lang];
  if (!open) return null;
  return (
    <div style={{ position: "absolute", inset: 0, background: "rgba(10,4,16,.75)", display: "flex", alignItems: "flex-end", zIndex: 30, backdropFilter: "blur(6px)" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", background: "#160d14", borderRadius: "24px 24px 0 0", borderTop: `1px solid rgba(${r},${g},${b},.22)`, padding: `24px 20px max(24px,env(safe-area-inset-bottom))`, maxHeight: "70dvh", overflowY: "auto" }}>
        <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 600, fontSize: 16, color: TEXT_P, margin: "0 0 16px", letterSpacing: "-0.01em" }}>{t.history} · {t.historyCount(entries.length)}</p>
        {entries.length === 0
          ? <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 300, fontSize: 13, color: TEXT_S, textAlign: "center", padding: "20px 0" }}>{t.historyEmpty}</p>
          : [...entries].reverse().map(e => (
            <div key={e.id} style={{ padding: "12px 0", borderBottom: `0.5px solid rgba(255,255,255,0.06)` }}>
              <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, color: TEXT_P, margin: 0, lineHeight: 1.5 }}>{e.text}</p>
              <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 300, fontSize: 10, color: `rgba(${r},${g},${b},.55)`, margin: "4px 0 0", letterSpacing: "0.08em" }}>{new Date(e.date).toLocaleDateString(lang === "ru" ? "ru-RU" : "en-US", { month: "short", day: "numeric" })}</p>
            </div>
          ))
        }
        <button onClick={onClose} style={{ marginTop: 16, width: "100%", padding: "12px", background: "transparent", border: `1px solid rgba(${r},${g},${b},.22)`, borderRadius: 12, cursor: "pointer", fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 300, fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: `rgba(${r},${g},${b},.60)` }}>{t.panelClose}</button>
      </div>
    </div>
  );
}

interface Props { lang: Lang; category: Category; onBack: () => void; onCategoryChange: (c: Category) => void; swipeDir: "left" | "right"; }

export default function CategoryScreen({ lang, category, onBack, onCategoryChange, swipeDir }: Props) {
  const cfg = CATEGORY_CONFIG[category]; const { r, g, b } = cfg; const t = UI[lang];
  const [mounted, setMounted] = useState(false);
  const [limits, setLimits] = useState<Limits>(loadLimits);
  const [history, setHistory] = useState<HistoryEntry[]>(loadHistory);
  const [remaining, setRemaining] = useState<number>(() => getCachedRemaining(loadLimits(), category));
  const [isCasting, setIsCasting] = useState(false);
  const [taskText, setTaskText] = useState("");
  const [taskSource, setTaskSource] = useState<"ai" | "fallback">("fallback");
  const [showReveal, setShowReveal] = useState(false);
  const [hintText, setHintText] = useState(t.hint);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [starsShopOpen, setStarsShopOpen] = useState(false);
  const [vh, setVh] = useState<number | null>(null);
  const topPadding = useTelegramTopInset();

  const touchStartX = useRef(0); const touchStartY = useRef(0); const swipeLocked = useRef(false);
  const revealTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const catIdx = CATEGORIES_ORDER.indexOf(category);

  useEffect(() => {
    requestAnimationFrame(() => setMounted(true));
    fetchServerRemaining(category).then(n => { if (n !== null) setRemaining(n); });
    const tg = window.Telegram?.WebApp;
    function updateVh() { const h = tg?.viewportStableHeight ?? tg?.viewportHeight; if (h && h > 100) setVh(h); }
    updateVh();
    tg?.onEvent?.("viewportChanged", updateVh);
    const tm = setTimeout(updateVh, 500);
    return () => { tg?.offEvent?.("viewportChanged", updateVh); clearTimeout(tm); };
  }, [category]);

  const catLabels: Record<Category, string> = { compliments: t.catCompliments, tenderness: t.catTenderness, desire: t.catDesire, passion: t.catPassion, hard: t.catHard };
  const catSubs:   Record<Category, string> = { compliments: t.catComplimentsSub, tenderness: t.catTendernessSub, desire: t.catDesireSub, passion: t.catPassionSub, hard: t.catHardSub };

  const goToCategory = useCallback((cat: Category) => { window.Telegram?.WebApp?.HapticFeedback?.impactOccurred("light"); onCategoryChange(cat); }, [onCategoryChange]);
  const handleTouchStart = useCallback((e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; touchStartY.current = e.touches[0].clientY; swipeLocked.current = false; }, []);
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (swipeLocked.current) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(dx) < 50 || Math.abs(dy) > Math.abs(dx) * .9) return;
    swipeLocked.current = true;
    if (dx < 0 && catIdx < CATEGORIES_ORDER.length - 1) goToCategory(CATEGORIES_ORDER[catIdx + 1]);
    else if (dx > 0 && catIdx > 0) goToCategory(CATEGORIES_ORDER[catIdx - 1]);
  }, [catIdx, goToCategory]);

  const handleHoldComplete = useCallback(async () => {
    if (isCasting) return;
    const tg = window.Telegram?.WebApp;
    if (remaining <= 0) { tg?.HapticFeedback?.notificationOccurred("error"); setStarsShopOpen(true); return; }
    tg?.HapticFeedback?.impactOccurred("medium");
    setIsCasting(true); setHintText(t.tapping);
    const [aiTask] = await Promise.all([generateAITask(category, lang), useServerLimit(category)]);
    const picked = aiTask ?? pickStaticTask(category);
    const src: "ai" | "fallback" = aiTask ? "ai" : "fallback";
    const today = getTodayStr();
    const newLimits = { ...limits };
    const entry = newLimits[category];
    if (entry.date !== today) { entry.date = today; entry.count = 0; entry.bonus = 0; }
    entry.count++;
    saveLimits(newLimits); setLimits({ ...newLimits }); setRemaining(r => Math.max(0, r - 1));
    const newEntry: HistoryEntry = { id: `${Date.now()}-${Math.random()}`, text: picked, category, date: new Date().toISOString() };
    const newHistory = [...history, newEntry]; saveHistory(newHistory); setHistory(newHistory);
    setTaskText(picked); setTaskSource(src); setIsCasting(false);
    tg?.HapticFeedback?.notificationOccurred("success");
    if (revealTimer.current) clearTimeout(revealTimer.current);
    revealTimer.current = setTimeout(() => setShowReveal(true), 80);
  }, [isCasting, remaining, category, lang, limits, history, t]);

  const handleDismiss = useCallback(() => { setShowReveal(false); setTimeout(() => { setTaskText(""); setHintText(t.hint); }, 400); }, [t.hint]);
  const handleStarsPurchased = useCallback((bonus: number) => {
    const today = getTodayStr(); const newLimits = { ...limits };
    const entry = newLimits[category];
    if (entry.date !== today) { entry.date = today; entry.count = 0; entry.bonus = 0; }
    entry.bonus += bonus; saveLimits(newLimits); setLimits({ ...newLimits }); setRemaining(r => r + bonus);
  }, [limits, category]);

  const enterX = swipeDir === "left" ? 60 : -60;
  const height = vh ? `${vh}px` : "100dvh";

  return (
    <div
      onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}
      style={{ position: "fixed", inset: 0, background: BG, display: "flex", flexDirection: "column", overflow: "hidden", height, opacity: mounted ? 1 : 0, transform: mounted ? "translateX(0)" : `translateX(${enterX}px)`, transition: mounted ? "opacity .32s ease,transform .38s cubic-bezier(.22,1,.36,1)" : "none" }}
    >
      {/* Top bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: topPadding, paddingLeft: 20, paddingRight: 20, paddingBottom: 6, flexShrink: 0, position: "relative", zIndex: 10 }}>
        <button onClick={onBack} style={{ background: "transparent", border: "none", cursor: "pointer", fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 400, fontSize: 14, letterSpacing: "0.01em", color: TEXT_S, padding: "4px 0", minWidth: 56 }}>
          {t.backLabel}
        </button>
        <div style={{ textAlign: "center", flex: 1 }}>
          <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 600, fontSize: 19, color: TEXT_P, letterSpacing: "-0.01em", margin: 0 }}>{catLabels[category]}</p>
        </div>
        <button onClick={() => setHistoryOpen(true)} style={{ background: "transparent", border: "none", cursor: "pointer", fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 400, fontSize: 14, color: TEXT_S, padding: "4px 0", minWidth: 56, textAlign: "right" }}>
          {t.history}
        </button>
      </div>

      <div style={{ textAlign: "center", flexShrink: 0, position: "relative", zIndex: 10, padding: "0 24px 2px" }}>
        <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 300, fontSize: 12, letterSpacing: "0.14em", textTransform: "uppercase", color: `rgba(${r},${g},${b},.65)`, margin: 0 }}>{catSubs[category]}</p>
      </div>

      {remaining > 0 && (
        <div style={{ textAlign: "center", flexShrink: 0, position: "relative", zIndex: 10, paddingTop: 3 }}>
          <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 300, fontSize: 11, letterSpacing: "0.10em", textTransform: "uppercase", color: `rgba(${r},${g},${b},.48)` }}>{t.remaining(remaining)}</span>
        </div>
      )}

      <div style={{ flex: 1, position: "relative", minHeight: 0 }}>
        <HeartbeatCanvas
          onHoldComplete={handleHoldComplete}
          isCasting={isCasting}
          color={cfg}
          hintText={hintText}
          holdDuration={2600}
          baseRScale={0.28}
          bgColor={BG}
        />
      </div>

      <div style={{ flexShrink: 0, position: "relative", zIndex: 10, paddingBottom: 6 }}>
        <CategoryDots current={category} onDotPress={goToCategory} />
        <p style={{ textAlign: "center", fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 400, fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: TEXT_T, margin: "6px 0 0" }}>{t.swipeHint}</p>
      </div>

      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: `8px 20px max(16px,env(safe-area-inset-bottom))`, flexShrink: 0, position: "relative", zIndex: 10 }}>
        {remaining === 0
          ? <button onClick={() => setStarsShopOpen(true)} style={{ background: `rgba(${r},${g},${b},.10)`, border: `1px solid rgba(${r},${g},${b},.28)`, borderRadius: 12, cursor: "pointer", fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 500, fontSize: 12, letterSpacing: "0.10em", textTransform: "uppercase", color: `rgba(${r},${g},${b},.80)`, padding: "10px 18px" }}>{t.limitBtn}</button>
          : <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 300, fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: TEXT_T }}>touché</span>
        }
      </div>

      <TaskReveal text={taskText} color={cfg} visible={showReveal} onDismiss={handleDismiss} lang={lang} catLabel={catLabels[category]} source={taskSource} topPadding={topPadding} />
      <HistoryPanel entries={history.filter(e => e.category === category)} open={historyOpen} onClose={() => setHistoryOpen(false)} accentRgb={cfg} lang={lang} />
      <StarsShop open={starsShopOpen} onClose={() => setStarsShopOpen(false)} onPurchased={handleStarsPurchased} accentRgb={cfg} lang={lang} paid={cfg.paid} />
    </div>
  );
}
