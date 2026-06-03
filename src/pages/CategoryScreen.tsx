import { useEffect, useCallback, useState, useRef } from "react";
import HeartbeatCanvas from "@/components/HeartbeatCanvas";
import { UI, CATEGORY_CONFIG, CATEGORIES_ORDER, type Lang, type Category } from "@/data/i18n";
import { playReveal, playDismiss } from "@/hooks/useSensualSound";
import { tasks as staticTasks } from "@/data/tasks";

const BG = "#0d0610";
const TEXT_P = "rgba(255,238,248,0.88)";
const TEXT_S = "rgba(255,238,248,0.44)";
const TEXT_T = "rgba(255,238,248,0.22)";

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

const HISTORY_KEY = "touche_history_v2";
type HistoryEntry = { id: string; text: string; category: Category; date: string };

function getTodayStr() { return new Date().toISOString().slice(0, 10); }
function loadHistory(): HistoryEntry[]  { try { const v = localStorage.getItem(HISTORY_KEY); if (v) return JSON.parse(v); } catch {} return []; }
function saveHistory(h: HistoryEntry[]) { try { localStorage.setItem(HISTORY_KEY, JSON.stringify(h)); } catch {} }

// ── Server helpers ─────────────────────────────────────────────────────────────

function getInitData(): string { return window.Telegram?.WebApp?.initData ?? ""; }

async function fetchServerRemaining(category: Category): Promise<{ remaining: number; locked: boolean } | null> {
  try {
    const res = await fetch(`/api/limits/get?category=${category}`, {
      headers: { "x-telegram-init-data": getInitData() },
    });
    if (!res.ok) return null;
    const d = await res.json();
    return { remaining: d.remaining ?? 0, locked: false };
  } catch {
    return null;
  }
}

async function consumeServerLimit(category: Category): Promise<boolean> {
  try {
    const res = await fetch("/api/limits/use", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-telegram-init-data": getInitData() },
      body: JSON.stringify({ category }),
    });
    return res.ok;
  } catch {
    return true;
  }
}

async function generateAITask(category: Category, lang: Lang): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch("/api/tasks/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-telegram-init-data": getInitData() },
      body: JSON.stringify({ category, lang }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const data = await res.json();
    return data.task ?? null;
  } catch {
    return null;
  }
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
      const safe    = tg?.safeAreaInset?.top ?? 0;
      const total   = content + safe;
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

// ── Canvas share card ──────────────────────────────────────────────────────────

function wrapTextCanvas(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
): number {
  const words = text.split(" ");
  let line = "";
  let currentY = y;

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + " ";
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      ctx.fillText(line.trim(), x, currentY);
      line = words[n] + " ";
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line.trim(), x, currentY);
  return currentY;
}

function generateTaskCard(
  taskText: string,
  catLabel: string,
  color: { r: number; g: number; b: number }
): string {
  const SIZE = 1080;
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d")!;
  const { r, g, b } = color;

  // Background
  const bgGrad = ctx.createLinearGradient(0, 0, 0, SIZE);
  bgGrad.addColorStop(0, "#110612");
  bgGrad.addColorStop(1, "#080310");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Center radial glow
  const glow = ctx.createRadialGradient(SIZE / 2, SIZE / 2, 0, SIZE / 2, SIZE / 2, 560);
  glow.addColorStop(0, `rgba(${r},${g},${b},0.22)`);
  glow.addColorStop(0.5, `rgba(${r},${g},${b},0.08)`);
  glow.addColorStop(1, "transparent");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Top-right corner accent
  const corner = ctx.createRadialGradient(SIZE, 0, 0, SIZE, 0, 400);
  corner.addColorStop(0, `rgba(${r},${g},${b},0.14)`);
  corner.addColorStop(1, "transparent");
  ctx.fillStyle = corner;
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Thin border frame
  ctx.strokeStyle = `rgba(${r},${g},${b},0.18)`;
  ctx.lineWidth = 2;
  const margin = 48;
  ctx.strokeRect(margin, margin, SIZE - margin * 2, SIZE - margin * 2);

  // Corner dots
  const cornerDots = [[margin, margin], [SIZE - margin, margin], [margin, SIZE - margin], [SIZE - margin, SIZE - margin]] as [number, number][];
  cornerDots.forEach(([cx, cy]) => {
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${r},${g},${b},0.55)`;
    ctx.fill();
  });

  // Category label — top
  ctx.font = "300 32px 'Plus Jakarta Sans', 'Helvetica Neue', sans-serif";
  ctx.fillStyle = `rgba(${r},${g},${b},0.70)`;
  ctx.textAlign = "center";
  ctx.letterSpacing = "12px";
  ctx.fillText(catLabel.toUpperCase(), SIZE / 2, 200);

  // Divider line
  ctx.fillStyle = `rgba(${r},${g},${b},0.25)`;
  ctx.fillRect(SIZE / 2 - 60, 224, 120, 1);

  // Task text — main body
  ctx.font = "600 58px 'Plus Jakarta Sans', 'Helvetica Neue', sans-serif";
  ctx.fillStyle = "rgba(255,238,248,0.97)";
  ctx.textAlign = "center";
  ctx.letterSpacing = "-1px";
  ctx.shadowColor = `rgba(${r},${g},${b},0.35)`;
  ctx.shadowBlur = 40;
  wrapTextCanvas(ctx, taskText, SIZE / 2, 400, 900, 84);
  ctx.shadowBlur = 0;

  // Branding — bottom
  ctx.font = "700 38px 'Plus Jakarta Sans', 'Helvetica Neue', sans-serif";
  ctx.fillStyle = "rgba(255,238,248,0.20)";
  ctx.textAlign = "center";
  ctx.letterSpacing = "3px";
  ctx.fillText("Touché", SIZE / 2, SIZE - 100);

  // Small decorative dot below branding
  ctx.beginPath();
  ctx.arc(SIZE / 2, SIZE - 74, 3, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(${r},${g},${b},0.40)`;
  ctx.fill();

  return canvas.toDataURL("image/png");
}

function downloadTaskCard(
  taskText: string,
  catLabel: string,
  color: { r: number; g: number; b: number }
) {
  try {
    const dataUrl = generateTaskCard(taskText, catLabel, color);
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `touche-${catLabel.toLowerCase().replace(/\s+/g, "-")}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch {
    // Silent fail — canvas unavailable
  }
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function CategoryHeader({ category, catLabel, catSub }: { category: Category; catLabel: string; catSub: string }) {
  const { r, g, b } = CATEGORY_CONFIG[category];
  const imgSrc = `/images/cat-${category}.png`;
  return (
    <div style={{ flexShrink: 0, position: "relative", height: 72, overflow: "hidden", borderBottom: `0.5px solid rgba(${r},${g},${b},0.20)` }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: `url(${imgSrc})`, backgroundSize: "cover", backgroundPosition: "center 30%", opacity: 0.22, filter: "saturate(1.5) brightness(0.85)" }} />
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at 80% 50%, rgba(${r},${g},${b},0.25) 0%, transparent 65%), radial-gradient(ellipse at 20% 50%, rgba(${r},${g},${b},0.12) 0%, transparent 60%)` }} />
      <div style={{ position: "absolute", inset: 0, background: `linear-gradient(90deg, ${BG}cc 0%, ${BG}88 40%, transparent 100%)` }} />
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent 0%, rgba(${r},${g},${b},0.55) 50%, transparent 100%)` }} />
      <div style={{ position: "relative", zIndex: 2, height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 24px" }}>
        <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700, fontSize: 20, letterSpacing: "-0.02em", color: TEXT_P, lineHeight: 1.2 }}>{catLabel}</div>
        <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 300, fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: `rgba(${r},${g},${b},0.65)`, marginTop: 4 }}>{catSub}</div>
      </div>
    </div>
  );
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

// ── Task reveal overlay ────────────────────────────────────────────────────────
function TaskReveal({ text, color, visible, onDismiss, lang, catLabel, source, topPadding }: {
  text: string; color: { r: number; g: number; b: number };
  visible: boolean; onDismiss: () => void; lang: Lang; catLabel: string;
  source?: "ai" | "fallback"; topPadding: string;
}) {
  const { r, g, b } = color;
  const t = UI[lang];
  const [textVisible, setTextVisible] = useState(false);
  const [shareToast, setShareToast] = useState(false);

  useEffect(() => {
    if (visible) { const tm = setTimeout(() => setTextVisible(true), 220); return () => clearTimeout(tm); }
    else setTextVisible(false);
  }, [visible]);

  useEffect(() => { if (visible) playReveal(); }, [visible]);

  const handleShare = useCallback(() => {
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred("light");
    downloadTaskCard(text, catLabel, color);
    setShareToast(true);
    setTimeout(() => setShareToast(false), 2800);
  }, [text, catLabel, color]);

  const shareLabel: Record<Lang, string> = {
    ru: "Поделиться",
    en: "Share",
    hi: "शेयर करें",
    pt: "Compartilhar",
    es: "Compartir",
  };
  const toastLabel: Record<Lang, string> = {
    ru: "Картинка сохранена — поделись!",
    en: "Image saved — share it!",
    hi: "छवि सहेजी गई — शेयर करें!",
    pt: "Imagem salva — compartilhe!",
    es: "Imagen guardada — ¡compártela!",
  };

  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 30, background: `rgba(${r},${g},${b},.96)`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: `32px 28px max(32px,env(safe-area-inset-bottom))`, opacity: visible ? 1 : 0, pointerEvents: visible ? "auto" : "none", transition: "opacity .38s cubic-bezier(.22,1,.36,1)", backdropFilter: "blur(2px)" }}>
      {/* Top category label */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, display: "flex", justifyContent: "center", paddingTop: topPadding, opacity: textVisible ? 1 : 0, transform: textVisible ? "translateY(0)" : "translateY(-8px)", transition: "opacity .5s ease .1s,transform .5s ease .1s" }}>
        <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 400, fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(255,255,255,.55)" }}>{catLabel}</span>
      </div>

      {/* Task text */}
      <div style={{ opacity: textVisible ? 1 : 0, transform: textVisible ? "translateY(0)" : "translateY(28px)", transition: "opacity .6s cubic-bezier(.16,1,.3,1) .18s,transform .6s cubic-bezier(.16,1,.3,1) .18s", textAlign: "center", width: "100%" }}>
        <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 600, fontSize: "clamp(22px,6.5vw,34px)", color: "#ffffff", lineHeight: 1.45, letterSpacing: "-0.01em", margin: 0, textShadow: "0 2px 24px rgba(0,0,0,.20)" }}>{text}</p>
        {source === "ai" && (
          <div style={{ marginTop: 12, display: "inline-flex", padding: "3px 10px", borderRadius: 20, border: "1px solid rgba(255,255,255,.22)" }}>
            <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 300, fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(255,255,255,.40)" }}>✦ ai</span>
          </div>
        )}
      </div>

      {/* Buttons */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: `0 28px max(28px,env(safe-area-inset-bottom))`, opacity: textVisible ? 1 : 0, transform: textVisible ? "translateY(0)" : "translateY(12px)", transition: "opacity .5s ease .35s,transform .5s ease .35s" }}>
        {/* Share toast */}
        {shareToast && (
          <div style={{
            marginBottom: 12,
            background: "rgba(255,255,255,0.14)",
            border: "1px solid rgba(255,255,255,0.25)",
            borderRadius: 14,
            padding: "10px 16px",
            textAlign: "center",
            fontFamily: "'Plus Jakarta Sans',sans-serif",
            fontSize: 13,
            color: "rgba(255,255,255,0.85)",
            backdropFilter: "blur(8px)",
          }}>
            {toastLabel[lang]}
          </div>
        )}
        <div style={{ display: "flex", gap: 10 }}>
          {/* Share image button */}
          <button onClick={handleShare} style={{
            flex: 1,
            padding: "18px 8px",
            borderRadius: 18,
            background: "rgba(255,255,255,.10)",
            border: "1px solid rgba(255,255,255,.22)",
            cursor: "pointer",
            fontFamily: "'Plus Jakarta Sans',sans-serif",
            fontWeight: 500,
            fontSize: 15,
            letterSpacing: "0.01em",
            color: "rgba(255,255,255,.80)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 7,
          }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
              <polyline points="16 6 12 2 8 6"/>
              <line x1="12" y1="2" x2="12" y2="15"/>
            </svg>
            {shareLabel[lang]}
          </button>
          {/* Done button */}
          <button onClick={onDismiss} style={{ flex: 1, padding: "18px 8px", borderRadius: 18, background: "rgba(255,255,255,.18)", border: "1px solid rgba(255,255,255,.32)", cursor: "pointer", fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 500, fontSize: 16, letterSpacing: "0.02em", color: "#ffffff", backdropFilter: "blur(8px)" }}>
            {t.taskDone}
          </button>
        </div>
      </div>

      {/* Decorative blobs */}
      <div style={{ position: "absolute", top: "-15%", right: "-20%", width: "55vw", height: "55vw", borderRadius: "50%", background: "rgba(255,255,255,.06)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: "-10%", left: "-18%", width: "45vw", height: "45vw", borderRadius: "50%", background: "rgba(255,255,255,.05)", pointerEvents: "none" }} />
    </div>
  );
}

// ── Stars Shop (kept for future use but never shown in free mode) ──────────────
function StarsShop({ open, onClose, onPurchased, accentRgb, lang, category }: {
  open: boolean; onClose: () => void; onPurchased: (n: number) => void;
  accentRgb: { r: number; g: number; b: number }; lang: Lang; category: Category;
}) {
  // Intentionally disabled in free mode — component kept for future re-enabling
  void category;
  const { r, g, b } = accentRgb; const t = UI[lang];
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
        <div style={{ padding: "0 20px" }}>
          <button onClick={onClose} style={{ width: "100%", padding: "12px 8px", borderRadius: 14, background: "transparent", border: "1px solid rgba(255,238,248,.10)", cursor: "pointer", fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 300, fontSize: 13, color: TEXT_S }}>{t.starsCancel}</button>
        </div>
      </div>
    </>
  );
}

// ── History Panel ──────────────────────────────────────────────────────────────
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
              <p style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 300, fontSize: 10, color: `rgba(${r},${g},${b},.55)`, margin: "4px 0 0", letterSpacing: "0.08em" }}>{new Date(e.date).toLocaleDateString(lang === "ru" ? "ru-RU" : lang === "hi" ? "hi-IN" : lang === "pt" ? "pt-BR" : lang === "es" ? "es-ES" : "en-US", { month: "short", day: "numeric" })}</p>
            </div>
          ))
        }
        <button onClick={onClose} style={{ marginTop: 16, width: "100%", padding: "12px", background: "transparent", border: `1px solid rgba(${r},${g},${b},.22)`, borderRadius: 12, cursor: "pointer", fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 300, fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: `rgba(${r},${g},${b},.60)` }}>{t.panelClose}</button>
      </div>
    </div>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────────
interface Props { lang: Lang; category: Category; onBack: () => void; onCategoryChange: (c: Category) => void; swipeDir: "left" | "right"; }

export default function CategoryScreen({ lang, category, onBack, onCategoryChange, swipeDir }: Props) {
  const cfg = CATEGORY_CONFIG[category]; const { r, g, b } = cfg; const t = UI[lang];

  const [mounted, setMounted] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>(loadHistory);

  // Free mode: always 3 tasks per day, never locked
  const [remaining, setRemaining] = useState<number>(3);
  const [isLocked]                = useState<boolean>(false);
  const [subChecked]              = useState<boolean>(true);

  const [isCasting, setIsCasting] = useState(false);
  const [taskText, setTaskText] = useState("");
  const [taskSource, setTaskSource] = useState<"ai" | "fallback">("fallback");
  const [showReveal, setShowReveal] = useState(false);
  const [hintText, setHintText] = useState(t.hint);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [vh, setVh] = useState<number | null>(null);
  const topPadding = useTelegramTopInset();

  const touchStartX = useRef(0); const touchStartY = useRef(0); const swipeLocked = useRef(false);
  const revealTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const catIdx = CATEGORIES_ORDER.indexOf(category);

  useEffect(() => {
    requestAnimationFrame(() => setMounted(true));

    const tg = window.Telegram?.WebApp;
    function updateVh() { const h = tg?.viewportStableHeight ?? tg?.viewportHeight; if (h && h > 100) setVh(h); }
    updateVh();
    tg?.onEvent?.("viewportChanged", updateVh);
    const tm = setTimeout(updateVh, 500);

    // Fetch today's remaining count from server (free — no subscription check)
    fetchServerRemaining(category).then((data) => {
      if (data !== null) setRemaining(data.remaining);
    });

    return () => { tg?.offEvent?.("viewportChanged", updateVh); clearTimeout(tm); };
  }, [category]);

  const catLabels: Record<Category, string> = { compliments: t.catCompliments, tenderness: t.catTenderness, desire: t.catDesire, passion: t.catPassion, hard: t.catHard };
  const catSubs:   Record<Category, string> = { compliments: t.catComplimentsSub, tenderness: t.catTendernessSub, desire: t.catDesireSub, passion: t.catPassionSub, hard: t.catHardSub };

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
    if (Math.abs(dx) < 50 || Math.abs(dy) > Math.abs(dx) * .9) return;
    swipeLocked.current = true;
    if (dx < 0 && catIdx < CATEGORIES_ORDER.length - 1) goToCategory(CATEGORIES_ORDER[catIdx + 1]);
    else if (dx > 0 && catIdx > 0) goToCategory(CATEGORIES_ORDER[catIdx - 1]);
  }, [catIdx, goToCategory]);

  const handleHoldComplete = useCallback(async () => {
    if (isCasting || isLocked) return;
    const tg = window.Telegram?.WebApp;
    if (remaining <= 0) {
      tg?.HapticFeedback?.notificationOccurred("error");
      // Free mode: no paywall — just show the "out of tasks" message below
      return;
    }
    tg?.HapticFeedback?.impactOccurred("medium");
    setIsCasting(true);
    setHintText(t.tapping);

    const [aiTask] = await Promise.all([
      generateAITask(category, lang),
      consumeServerLimit(category),
    ]);

    const picked = aiTask ?? pickStaticTask(category);
    const src: "ai" | "fallback" = aiTask ? "ai" : "fallback";

    setRemaining(prev => Math.max(0, prev - 1));

    const newEntry: HistoryEntry = { id: `${Date.now()}-${Math.random()}`, text: picked, category, date: new Date().toISOString() };
    const newHistory = [...history, newEntry];
    saveHistory(newHistory);
    setHistory(newHistory);

    setTaskText(picked);
    setTaskSource(src);
    setIsCasting(false);
    tg?.HapticFeedback?.notificationOccurred("success");

    if (revealTimer.current) clearTimeout(revealTimer.current);
    revealTimer.current = setTimeout(() => setShowReveal(true), 80);
  }, [isCasting, isLocked, remaining, category, lang, history, t]);

  const handleDismiss = useCallback(() => {
    setShowReveal(false);
    setTimeout(() => { setTaskText(""); setHintText(t.hint); }, 400);
  }, [t.hint]);

  const enterX = swipeDir === "left" ? 60 : -60;
  const height = vh ? `${vh}px` : "100dvh";

  // "Come back tomorrow" labels for when daily limit is reached
  const limitLabels: Record<Lang, string> = {
    ru: "На сегодня всё — возвращайся завтра ✦",
    en: "That's all for today — come back tomorrow ✦",
    hi: "आज के लिए बस — कल वापस आएं ✦",
    pt: "Por hoje é tudo — volte amanhã ✦",
    es: "Eso es todo por hoy — vuelve mañana ✦",
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{ position: "fixed", inset: 0, background: BG, display: "flex", flexDirection: "column", overflow: "hidden", height, opacity: mounted ? 1 : 0, transform: mounted ? "translateX(0)" : `translateX(${enterX}px)`, transition: mounted ? "opacity .32s ease,transform .38s cubic-bezier(.22,1,.36,1)" : "none" }}
    >
      {/* Top bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: topPadding, paddingLeft: 20, paddingRight: 20, paddingBottom: 6, flexShrink: 0, position: "relative", zIndex: 10 }}>
        <button onClick={onBack} style={{ background: "transparent", border: "none", cursor: "pointer", fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 400, fontSize: 14, letterSpacing: "0.01em", color: TEXT_S, padding: "4px 0", minWidth: 56 }}>
          {t.backLabel}
        </button>
        <div style={{ flex: 1 }} />
        {/* Free badge (replaces premium badge) */}
        <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 500, fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: `rgba(${r},${g},${b},0.70)`, background: `rgba(${r},${g},${b},0.10)`, border: `1px solid rgba(${r},${g},${b},0.22)`, borderRadius: 20, padding: "3px 9px", marginRight: 8 }}>
          free ✦
        </span>
        <button onClick={() => setHistoryOpen(true)} style={{ background: "transparent", border: "none", cursor: "pointer", fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 400, fontSize: 14, color: TEXT_S, padding: "4px 0", minWidth: 56, textAlign: "right" }}>
          {t.history}
        </button>
      </div>

      <CategoryHeader category={category} catLabel={catLabels[category]} catSub={catSubs[category]} />

      {!isLocked && remaining > 0 && (
        <div style={{ textAlign: "center", flexShrink: 0, position: "relative", zIndex: 10, paddingTop: 4 }}>
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
          ? <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 300, fontSize: 11, letterSpacing: "0.10em", textTransform: "uppercase", color: `rgba(${r},${g},${b},.50)` }}>{limitLabels[lang]}</span>
          : <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 300, fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: TEXT_T }}>touché</span>
        }
      </div>

      <TaskReveal text={taskText} color={cfg} visible={showReveal} onDismiss={handleDismiss} lang={lang} catLabel={catLabels[category]} source={taskSource} topPadding={topPadding} />
      <HistoryPanel entries={history.filter(e => e.category === category)} open={historyOpen} onClose={() => setHistoryOpen(false)} accentRgb={cfg} lang={lang} />
      <StarsShop open={false} onClose={() => {}} onPurchased={() => {}} accentRgb={cfg} lang={lang} category={category} />
    </div>
  );
}
