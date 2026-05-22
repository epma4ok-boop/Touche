// src/pages/CategoryScreen.tsx — fullscreen fix + server-side limits
import { useEffect, useCallback, useState, useRef } from "react";
import { UI, CATEGORY_CONFIG, CATEGORIES_ORDER, type Lang, type Category } from "@/data/i18n";
import { playHeartbeat, playReveal, playDismiss } from "@/hooks/useSensualSound";

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        HapticFeedback?: { impactOccurred: (s: string) => void; notificationOccurred: (s: string) => void };
        initData?: string;
        viewportHeight?: number;
        viewportStableHeight?: number;
        onEvent?: (event: string, cb: () => void) => void;
        offEvent?: (event: string, cb: () => void) => void;
      };
    };
  }
}

// ── localStorage helpers (cache only — truth is server-side) ──────────────
const LIMITS_KEY = "touche_limits_v2";
const HISTORY_KEY = "touche_history_v2";

type LimitEntry = { date: string; count: number; bonus: number };
type Limits = Record<Category, LimitEntry>;
type HistoryEntry = { id: string; text: string; category: Category; date: string };

function emptyLimits(): Limits {
  const today = getTodayStr();
  const entry = () => ({ date: today, count: 0, bonus: 0 });
  return { compliments: entry(), tenderness: entry(), desire: entry(), passion: entry(), hard: entry() };
}
function getTodayStr() { return new Date().toISOString().slice(0, 10); }
function loadLimits(): Limits {
  try { const v = localStorage.getItem(LIMITS_KEY); if (v) return JSON.parse(v); } catch {}
  return emptyLimits();
}
function saveLimits(l: Limits) {
  try { localStorage.setItem(LIMITS_KEY, JSON.stringify(l)); } catch {}
}
function loadHistory(): HistoryEntry[] {
  try { const v = localStorage.getItem(HISTORY_KEY); if (v) return JSON.parse(v); } catch {}
  return [];
}
function saveHistory(h: HistoryEntry[]) {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(h)); } catch {}
}
function getCachedRemaining(limits: Limits, category: Category): number {
  const entry = limits[category];
  const today = getTodayStr();
  if (entry.date !== today) return 1; // fresh day
  return Math.max(0, 1 + entry.bonus - entry.count);
}

// ── Server limit helpers ────────────────────────────────────────────────────
async function fetchServerRemaining(category: Category): Promise<number | null> {
  try {
    const initData = window.Telegram?.WebApp?.initData;
    if (!initData) return null;
    const res = await fetch(`/api/limits/get?category=${category}`, {
      headers: { "x-telegram-init-data": initData },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.remaining ?? null;
  } catch { return null; }
}

async function useServerLimit(category: Category): Promise<boolean> {
  try {
    const initData = window.Telegram?.WebApp?.initData;
    if (!initData) return true; // fallback: allow if no Telegram context
    const res = await fetch("/api/limits/use", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-telegram-init-data": initData },
      body: JSON.stringify({ category }),
    });
    return res.ok;
  } catch { return true; } // network error → don't block user
}

// ── Tasks (imported inline to avoid circular issues) ─────────────────────
// tasks come from data/tasks.ts — we just reference it
import { tasks } from "@/data/tasks";

// ── Category dots ───────────────────────────────────────────────────────────
function CategoryDots({ current, onDotPress }: { current: Category; onDotPress: (c: Category) => void }) {
  return (
    <div style={{ display: "flex", justifyContent: "center", gap: 8, paddingTop: 4 }}>
      {CATEGORIES_ORDER.map((cat) => {
        const cfg = CATEGORY_CONFIG[cat];
        const active = cat === current;
        return (
          <button key={cat} onClick={() => onDotPress(cat)} style={{
            width: active ? 20 : 7, height: 7,
            borderRadius: 4, border: "none", cursor: "pointer",
            background: active
              ? `rgba(${cfg.r},${cfg.g},${cfg.b},0.75)`
              : `rgba(${cfg.r},${cfg.g},${cfg.b},0.22)`,
            transition: "width 0.3s cubic-bezier(0.22,1,0.36,1), background 0.2s",
            padding: 0,
          }} />
        );
      })}
    </div>
  );
}

// ── Hold button ─────────────────────────────────────────────────────────────
function HoldButton({
  onHoldComplete, isCasting, color, hintText, holdDuration, baseRScale,
}: {
  onHoldComplete: () => void;
  isCasting: boolean;
  color: { r: number; g: number; b: number };
  hintText: string;
  holdDuration: number;
  baseRScale: number;
}) {
  const { r, g, b } = color;
  const [holding, setHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const holdStart = useRef<number | null>(null);
  const animRef = useRef<number>(0);
  const firedRef = useRef(false);

  const startHold = useCallback(() => {
    if (isCasting) return;
    setHolding(true);
    firedRef.current = false;
    holdStart.current = performance.now();
    playHeartbeat(true);

    function animate() {
      if (!holdStart.current) return;
      const elapsed = performance.now() - holdStart.current;
      const p = Math.min(elapsed / holdDuration, 1);
      setProgress(p);
      if (p >= 1 && !firedRef.current) {
        firedRef.current = true;
        onHoldComplete();
      }
      if (p < 1) animRef.current = requestAnimationFrame(animate);
    }
    animRef.current = requestAnimationFrame(animate);
  }, [isCasting, holdDuration, onHoldComplete]);

  const stopHold = useCallback(() => {
    setHolding(false);
    holdStart.current = null;
    cancelAnimationFrame(animRef.current);
    setProgress(0);
  }, []);

  useEffect(() => () => cancelAnimationFrame(animRef.current), []);

  const size = 180;
  const radius = 74;
  const circ = 2 * Math.PI * radius;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 22 }}>
      <div
        onMouseDown={startHold} onMouseUp={stopHold} onMouseLeave={stopHold}
        onTouchStart={e => { e.preventDefault(); startHold(); }}
        onTouchEnd={e => { e.preventDefault(); stopHold(); }}
        style={{ width: size, height: size, position: "relative", cursor: "pointer", userSelect: "none", WebkitUserSelect: "none" }}
      >
        {/* Outer pulse rings */}
        {holding && (
          <>
            <div style={{
              position: "absolute", inset: -16, borderRadius: "50%",
              border: `1px solid rgba(${r},${g},${b},0.20)`,
              animation: "pulseRing 1.2s ease-out infinite",
            }}/>
            <div style={{
              position: "absolute", inset: -8, borderRadius: "50%",
              border: `1px solid rgba(${r},${g},${b},0.14)`,
              animation: "pulseRing 1.2s ease-out 0.4s infinite",
            }}/>
          </>
        )}
        <svg width={size} height={size} style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }}>
          {/* Track */}
          <circle cx={size/2} cy={size/2} r={radius} fill="none"
            stroke={`rgba(${r},${g},${b},0.10)`} strokeWidth={3}/>
          {/* Progress */}
          <circle cx={size/2} cy={size/2} r={radius} fill="none"
            stroke={`rgba(${r},${g},${b},0.72)`} strokeWidth={3}
            strokeDasharray={circ} strokeDashoffset={circ * (1 - progress)}
            strokeLinecap="round"
            style={{ transition: holding ? "none" : "stroke-dashoffset 0.3s ease" }}
          />
        </svg>
        {/* Center dot */}
        <div style={{
          position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
          borderRadius: "50%",
          background: holding ? `rgba(${r},${g},${b},0.12)` : `rgba(${r},${g},${b},0.06)`,
          transition: "background 0.2s",
        }}>
          <div style={{
            width: 16, height: 16, borderRadius: "50%",
            background: `rgba(${r},${g},${b},${holding ? 0.85 : 0.40})`,
            transition: "all 0.2s",
            transform: holding ? "scale(1.5)" : "scale(1)",
            boxShadow: holding ? `0 0 32px rgba(${r},${g},${b},0.60)` : "none",
          }}/>
        </div>
      </div>
      <p style={{
        fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 400,
        fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase",
        color: `rgba(${r},${g},${b},0.55)`, margin: 0,
        transition: "opacity 0.2s",
      }}>
        {hintText}
      </p>
      <style>{`
        @keyframes pulseRing {
          0%   { transform: scale(0.92); opacity: 0.8; }
          100% { transform: scale(1.18); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

// ── Task reveal overlay ─────────────────────────────────────────────────────
function TaskReveal({ text, color, visible, onDismiss, lang, catLabel }: {
  text: string; color: { r: number; g: number; b: number };
  visible: boolean; onDismiss: () => void; lang: Lang; catLabel: string;
}) {
  const { r, g, b } = color;
  const t = UI[lang];
  useEffect(() => { if (visible) playReveal(); }, [visible]);

  return (
    <div onClick={onDismiss} style={{
      position: "absolute", inset: 0,
      background: `rgba(${r},${g},${b},0.96)`,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "32px 28px",
      opacity: visible ? 1 : 0,
      transform: visible ? "scale(1)" : "scale(0.96)",
      transition: "opacity 0.35s ease, transform 0.35s cubic-bezier(0.22,1,0.36,1)",
      pointerEvents: visible ? "auto" : "none",
      zIndex: 20,
    }}>
      <p style={{
        fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 300,
        fontSize: 10, letterSpacing: "0.24em", textTransform: "uppercase",
        color: "rgba(255,240,250,0.55)", margin: "0 0 28px", textAlign: "center",
      }}>
        {catLabel}
      </p>
      <p style={{
        fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 400,
        fontSize: "clamp(18px,5vw,24px)", lineHeight: 1.55,
        color: "rgba(255,240,250,0.96)", textAlign: "center",
        letterSpacing: "0.01em", margin: 0,
      }}>
        {text}
      </p>
      <div style={{ marginTop: 40 }}>
        <p style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 300,
          fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase",
          color: "rgba(255,240,250,0.40)", margin: 0,
        }}>
          {t.taskDone} · tap to close
        </p>
      </div>
    </div>
  );
}

// ── Stars shop modal ────────────────────────────────────────────────────────
function StarsShop({ open, onClose, onPurchased, accentRgb, lang, paid }: {
  open: boolean; onClose: () => void;
  onPurchased: (bonus: number) => void;
  accentRgb: { r: number; g: number; b: number };
  lang: Lang; paid: boolean;
}) {
  const { r, g, b } = accentRgb;
  const t = UI[lang];
  const [loading, setLoading] = useState(false);

  const handleBuy = useCallback(async () => {
    setLoading(true);
    try {
      const initData = window.Telegram?.WebApp?.initData;
      const res = await fetch("/api/payments/invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-telegram-init-data": initData ?? "" },
        body: JSON.stringify({ paid }),
      });
      const data = await res.json();
      if (data.invoiceLink) {
        // Open the Telegram Stars invoice
        (window as any).Telegram?.WebApp?.openInvoice?.(data.invoiceLink, (status: string) => {
          if (status === "paid") {
            onPurchased(1);
            onClose();
            window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred("success");
          }
          setLoading(false);
        });
      }
    } catch { setLoading(false); }
  }, [paid, onPurchased, onClose]);

  if (!open) return null;
  return (
    <div style={{
      position: "absolute", inset: 0, background: "rgba(20,10,15,0.70)",
      display: "flex", alignItems: "flex-end", justifyContent: "center",
      zIndex: 30, backdropFilter: "blur(8px)",
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        width: "100%", maxWidth: 420,
        background: "#fdf8f5", borderRadius: "24px 24px 0 0",
        padding: "28px 24px max(24px,env(safe-area-inset-bottom))",
      }}>
        <p style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600,
          fontSize: 20, letterSpacing: "-0.02em", color: "rgba(40,30,50,0.90)",
          margin: "0 0 6px", textAlign: "center",
        }}>{t.starsTitle}</p>
        <p style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 300,
          fontSize: 12, letterSpacing: "0.06em", color: "rgba(40,30,50,0.45)",
          margin: "0 0 24px", textAlign: "center",
        }}>{t.starsSub}</p>
        <button onClick={handleBuy} disabled={loading} style={{
          width: "100%", padding: "14px",
          background: loading ? `rgba(${r},${g},${b},0.30)` : `rgba(${r},${g},${b},0.90)`,
          border: "none", borderRadius: 14, cursor: loading ? "default" : "pointer",
          fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600,
          fontSize: 14, letterSpacing: "0.04em",
          color: "rgba(255,240,250,0.96)", transition: "background 0.2s",
        }}>
          {loading ? "..." : `${t.starsPackFree}  ·  ${paid ? t.starsPricePaid : t.starsPriceFree}`}
        </button>
        <button onClick={() => { playDismiss(); onClose(); }} style={{
          width: "100%", marginTop: 10, padding: "12px",
          background: "transparent", border: "none", cursor: "pointer",
          fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 300,
          fontSize: 12, letterSpacing: "0.10em", textTransform: "uppercase",
          color: "rgba(40,30,50,0.35)",
        }}>
          {t.starsCancel}
        </button>
      </div>
    </div>
  );
}

// ── History panel ─────────────────────────────────────────────────────────
function HistoryPanel({ entries, open, onClose, accentRgb, lang }: {
  entries: HistoryEntry[]; open: boolean;
  onClose: () => void;
  accentRgb: { r: number; g: number; b: number }; lang: Lang;
}) {
  const { r, g, b } = accentRgb;
  const t = UI[lang];
  if (!open) return null;
  return (
    <div style={{
      position: "absolute", inset: 0, background: "rgba(20,10,15,0.65)",
      display: "flex", alignItems: "flex-end", zIndex: 30, backdropFilter: "blur(6px)",
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        width: "100%", maxWidth: 480, background: "#fdf8f5",
        borderRadius: "24px 24px 0 0",
        padding: "24px 20px max(24px,env(safe-area-inset-bottom))",
        maxHeight: "70dvh", overflowY: "auto",
      }}>
        <p style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600,
          fontSize: 16, color: "rgba(40,30,50,0.85)", margin: "0 0 16px", letterSpacing: "-0.01em",
        }}>{t.history} · {t.historyCount(entries.length)}</p>
        {entries.length === 0 ? (
          <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 300, fontSize: 13,
            color: "rgba(40,30,50,0.40)", textAlign: "center", padding: "20px 0" }}>
            {t.historyEmpty}
          </p>
        ) : (
          [...entries].reverse().map((e) => (
            <div key={e.id} style={{
              padding: "12px 0", borderBottom: "0.5px solid rgba(40,30,50,0.08)",
            }}>
              <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13,
                color: "rgba(40,30,50,0.80)", margin: 0, lineHeight: 1.5 }}>{e.text}</p>
              <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 300,
                fontSize: 10, color: `rgba(${r},${g},${b},0.45)`, margin: "4px 0 0",
                letterSpacing: "0.08em" }}>
                {new Date(e.date).toLocaleDateString(lang === "ru" ? "ru-RU" : "en-US", { month: "short", day: "numeric" })}
              </p>
            </div>
          ))
        )}
        <button onClick={onClose} style={{
          marginTop: 16, width: "100%", padding: "12px", background: "transparent",
          border: `1px solid rgba(${r},${g},${b},0.18)`, borderRadius: 12, cursor: "pointer",
          fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 300, fontSize: 11,
          letterSpacing: "0.14em", textTransform: "uppercase", color: `rgba(${r},${g},${b},0.55)`,
        }}>{t.panelClose}</button>
      </div>
    </div>
  );
}

// ── Main CategoryScreen ─────────────────────────────────────────────────────
interface CategoryScreenProps {
  lang: Lang;
  category: Category;
  onBack: () => void;
  onCategoryChange: (cat: Category) => void;
  swipeDir: "left" | "right";
}

export default function CategoryScreen({ lang, category, onBack, onCategoryChange, swipeDir }: CategoryScreenProps) {
  const cfg = CATEGORY_CONFIG[category];
  const { r, g, b } = cfg;
  const t = UI[lang];

  const [mounted, setMounted] = useState(false);
  const [limits, setLimits] = useState<Limits>(loadLimits);
  const [history, setHistory] = useState<HistoryEntry[]>(loadHistory);
  const [remaining, setRemaining] = useState<number>(() => getCachedRemaining(loadLimits(), category));
  const [isCasting, setIsCasting] = useState(false);
  const [taskText, setTaskText] = useState("");
  const [showReveal, setShowReveal] = useState(false);
  const [hintText, setHintText] = useState(t.hint);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [starsShopOpen, setStarsShopOpen] = useState(false);
  const [vh, setVh] = useState<number | null>(null);

  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const swipeLocked = useRef(false);
  const revealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const catIdx = CATEGORIES_ORDER.indexOf(category);

  useEffect(() => {
    requestAnimationFrame(() => setMounted(true));

    // Fetch server-side remaining for accurate count
    fetchServerRemaining(category).then((serverRemaining) => {
      if (serverRemaining !== null) setRemaining(serverRemaining);
    });

    // Telegram viewport height
    const tg = window.Telegram?.WebApp;
    function updateVh() {
      const h = tg?.viewportStableHeight ?? tg?.viewportHeight;
      if (h) setVh(h);
    }
    updateVh();
    tg?.onEvent?.("viewportChanged", updateVh);
    return () => tg?.offEvent?.("viewportChanged", updateVh);
  }, [category]);

  const goToCategory = useCallback((cat: Category) => {
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred("light");
    onCategoryChange(cat);
  }, [onCategoryChange]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    swipeLocked.current = false;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (swipeLocked.current) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(dx) < 50 || Math.abs(dy) > Math.abs(dx) * 0.9) return;
    swipeLocked.current = true;
    if (dx < 0 && catIdx < CATEGORIES_ORDER.length - 1) goToCategory(CATEGORIES_ORDER[catIdx + 1]);
    else if (dx > 0 && catIdx > 0) goToCategory(CATEGORIES_ORDER[catIdx - 1]);
  }, [catIdx, goToCategory]);

  const handleHoldComplete = useCallback(async () => {
    if (isCasting) return;
    const tg = window.Telegram?.WebApp;

    if (remaining <= 0) {
      tg?.HapticFeedback?.notificationOccurred("error");
      setStarsShopOpen(true);
      return;
    }

    tg?.HapticFeedback?.impactOccurred("medium");
    setIsCasting(true);
    setHintText(t.tapping);

    // Call server to consume limit (fire-and-forget: optimistic UI)
    const allowed = await useServerLimit(category);
    if (!allowed) {
      // Server denied — sync remaining
      setRemaining(0);
      const newLimits = { ...limits };
      const entry = newLimits[category];
      entry.date = getTodayStr();
      entry.count = 999;
      saveLimits(newLimits);
      setLimits({ ...newLimits });
      setIsCasting(false);
      setHintText(t.hint);
      tg?.HapticFeedback?.notificationOccurred("error");
      setStarsShopOpen(true);
      return;
    }

    // Update local cache
    const newLimits = { ...limits };
    const entry = newLimits[category];
    const today = getTodayStr();
    if (entry.date !== today) { entry.date = today; entry.count = 0; entry.bonus = 0; }
    entry.count++;
    saveLimits(newLimits);
    setLimits({ ...newLimits });
    setRemaining(r => Math.max(0, r - 1));

    const castDelay = 700 + Math.random() * 350;
    if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
    revealTimerRef.current = setTimeout(() => {
      const catTasks = tasks[category];
      const picked = catTasks[Math.floor(Math.random() * catTasks.length)];
      const newEntry: HistoryEntry = {
        id: `${Date.now()}-${Math.random()}`, text: picked, category,
        date: new Date().toISOString(),
      };
      const newHistory = [...history, newEntry];
      saveHistory(newHistory);
      setHistory(newHistory);
      setTaskText(picked);
      setIsCasting(false);
      tg?.HapticFeedback?.notificationOccurred("success");
      setTimeout(() => setShowReveal(true), 80);
    }, castDelay);
  }, [isCasting, remaining, category, history, limits, t, r]);

  const handleDismiss = useCallback(() => {
    setShowReveal(false);
    playDismiss();
    setTimeout(() => { setTaskText(""); setHintText(t.hint); }, 400);
  }, [t.hint]);

  const handleStarsPurchased = useCallback((bonus: number) => {
    const today = getTodayStr();
    const newLimits = { ...limits };
    const entry = newLimits[category];
    if (entry.date !== today) { entry.date = today; entry.count = 0; entry.bonus = 0; }
    entry.bonus += bonus;
    saveLimits(newLimits);
    setLimits({ ...newLimits });
    setRemaining(r => r + bonus);
  }, [limits, category]);

  const enterX = swipeDir === "left" ? 60 : -60;

  const catLabels: Record<Category, string> = {
    compliments: t.catCompliments, tenderness: t.catTenderness,
    desire: t.catDesire, passion: t.catPassion, hard: t.catHard,
  };
  const catSubs: Record<Category, string> = {
    compliments: t.catComplimentsSub, tenderness: t.catTendernessSub,
    desire: t.catDesireSub, passion: t.catPassionSub, hard: t.catHardSub,
  };

  const height = vh ? `${vh}px` : "100dvh";

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{
        position: "fixed", inset: 0,
        background: "#fdf8f5",
        display: "flex", flexDirection: "column",
        overflow: "hidden",
        height,
        opacity: mounted ? 1 : 0,
        transform: mounted ? "translateX(0)" : `translateX(${enterX}px)`,
        transition: mounted ? "opacity 0.32s ease, transform 0.38s cubic-bezier(0.22,1,0.36,1)" : "none",
      }}
    >
      {/* Top bar */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "max(14px, env(safe-area-inset-top)) 20px 6px",
        flexShrink: 0, position: "relative", zIndex: 10,
      }}>
        <button onClick={onBack} style={{
          background: "transparent", border: "none", cursor: "pointer",
          fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 400, fontSize: 14,
          letterSpacing: "0.01em", color: "rgba(40,30,50,0.40)", padding: "4px 0",
        }}>{t.backLabel}</button>
        <div style={{ textAlign: "center" }}>
          <p style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600, fontSize: 19,
            color: "rgba(40,30,50,0.85)", letterSpacing: "-0.01em", margin: 0,
          }}>{catLabels[category]}</p>
        </div>
        <button onClick={() => setHistoryOpen(true)} style={{
          background: "transparent", border: "none", cursor: "pointer",
          fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 400, fontSize: 14,
          color: "rgba(40,30,50,0.40)", padding: "4px 0",
        }}>{t.history}</button>
      </div>

      {/* Subtitle */}
      <div style={{ textAlign: "center", flexShrink: 0, position: "relative", zIndex: 10, padding: "0 24px 2px" }}>
        <p style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 300, fontSize: 12,
          letterSpacing: "0.14em", textTransform: "uppercase",
          color: `rgba(${r},${g},${b},0.55)`, margin: 0,
        }}>{catSubs[category]}</p>
      </div>

      {/* Remaining count */}
      {remaining > 0 && (
        <div style={{ textAlign: "center", flexShrink: 0, position: "relative", zIndex: 10, paddingTop: 4 }}>
          <span style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 300, fontSize: 11,
            letterSpacing: "0.10em", textTransform: "uppercase",
            color: `rgba(${r},${g},${b},0.38)`,
          }}>{t.remaining(remaining)}</span>
        </div>
      )}

      {/* Hold zone — takes all remaining space */}
      <div style={{ flex: 1, position: "relative", minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <HoldButton
          onHoldComplete={handleHoldComplete}
          isCasting={isCasting}
          color={cfg}
          hintText={hintText}
          holdDuration={2600}
          baseRScale={0.20}
        />
      </div>

      {/* Dots + swipe hint */}
      <div style={{ flexShrink: 0, position: "relative", zIndex: 10, paddingBottom: 6 }}>
        <CategoryDots current={category} onDotPress={goToCategory} />
        <p style={{
          textAlign: "center",
          fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 400, fontSize: 11,
          letterSpacing: "0.16em", textTransform: "uppercase",
          color: "rgba(40,30,50,0.28)", margin: "6px 0 0",
        }}>{t.swipeHint}</p>
      </div>

      {/* Bottom action */}
      <div style={{
        display: "flex", justifyContent: "center", alignItems: "center",
        padding: `8px 20px max(18px, env(safe-area-inset-bottom))`,
        flexShrink: 0, position: "relative", zIndex: 10,
      }}>
        {remaining === 0 ? (
          <button onClick={() => setStarsShopOpen(true)} style={{
            background: `rgba(${r},${g},${b},0.07)`,
            border: `1px solid rgba(${r},${g},${b},0.22)`,
            borderRadius: 12, cursor: "pointer",
            fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 500, fontSize: 12,
            letterSpacing: "0.10em", textTransform: "uppercase",
            color: `rgba(${r},${g},${b},0.70)`, padding: "10px 18px",
          }}>{t.limitBtn}</button>
        ) : (
          <span style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 300, fontSize: 11,
            letterSpacing: "0.14em", textTransform: "uppercase",
            color: "rgba(40,30,50,0.14)",
          }}>touché</span>
        )}
      </div>

      {/* Overlays */}
      <TaskReveal
        text={taskText} color={cfg} visible={showReveal}
        onDismiss={handleDismiss} lang={lang} catLabel={catLabels[category]}
      />
      <HistoryPanel
        entries={history.filter(e => e.category === category)}
        open={historyOpen} onClose={() => setHistoryOpen(false)}
        accentRgb={cfg} lang={lang}
      />
      <StarsShop
        open={starsShopOpen} onClose={() => setStarsShopOpen(false)}
        onPurchased={handleStarsPurchased} accentRgb={cfg} lang={lang}
        paid={cfg.paid}
      />
    </div>
  );
}
