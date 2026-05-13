import { useState, useCallback, useRef, useEffect } from "react";
import FlameCanvas from "@/components/FlameCanvas";
import HistoryPanel, { type HistoryEntry } from "@/components/HistoryPanel";
import { UI, CATEGORY_CONFIG, CATEGORIES_ORDER, type Lang, type Category } from "@/data/i18n";
import { TASKS_RU, TASKS_EN } from "@/data/tasks";
import { useSensualSound } from "@/hooks/useSensualSound";

const LIMITS_KEY = "touche_limits_v1";
const HISTORY_KEY = "touche_history";
const MAX_HISTORY = 30;
const DAILY_FREE = 1;
const STARS_ENDPOINT = "/api/payments/invoice";

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        HapticFeedback?: {
          impactOccurred: (style: string) => void;
          notificationOccurred: (type: string) => void;
        };
        openInvoice?: (url: string, cb: (status: string) => void) => void;
        initData?: string;
      };
    };
  }
}

type LimitEntry = { date: string; count: number; bonus: number };
type LimitsData = Record<Category, LimitEntry>;

function getTodayStr() { return new Date().toISOString().slice(0, 10); }

function loadLimits(): LimitsData {
  try { const s = localStorage.getItem(LIMITS_KEY); if (s) return JSON.parse(s); } catch {}
  const empty = { date: "", count: 0, bonus: 0 };
  return { compliments: { ...empty }, tenderness: { ...empty }, desire: { ...empty }, passion: { ...empty }, hard: { ...empty } };
}
function saveLimits(l: LimitsData) { localStorage.setItem(LIMITS_KEY, JSON.stringify(l)); }

function getRemaining(limits: LimitsData, cat: Category): number {
  const today = getTodayStr();
  const e = limits[cat];
  const used = e.date === today ? e.count : 0;
  const bonus = e.date === today ? e.bonus : 0;
  return Math.max(0, DAILY_FREE + bonus - used);
}

function loadHistory(): HistoryEntry[] {
  try { const s = localStorage.getItem(HISTORY_KEY); if (s) return JSON.parse(s); } catch {}
  return [];
}
function saveHistory(h: HistoryEntry[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(h.slice(-MAX_HISTORY)));
}

// ── Stars shop ─────────────────────────────────────────────────────────────
interface StarsShopProps {
  open: boolean; onClose: () => void;
  onPurchased: (bonus: number) => void;
  accentRgb: { r: number; g: number; b: number };
  lang: Lang; paid: boolean;
}
function StarsShop({ open, onClose, onPurchased, accentRgb, lang, paid }: StarsShopProps) {
  const { r, g, b } = accentRgb;
  const [loading, setLoading] = useState(false);
  const t = UI[lang];
  const tg = window.Telegram?.WebApp;
  const handleBuy = async () => {
    if (loading) return;
    setLoading(true);
    try {
      if (tg?.openInvoice) {
        const res = await fetch(STARS_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-telegram-init-data": tg.initData ?? "" },
          body: JSON.stringify({ paid }),
        });
        const data = await res.json();
        if (data.invoiceLink) {
          tg.openInvoice(data.invoiceLink, (status) => {
            if (status === "paid") { onPurchased(1); onClose(); }
            setLoading(false);
          });
          return;
        }
      }
      alert(lang === "ru"
        ? "Покупка Stars доступна после подключения бота. Инструкция в README."
        : "Stars purchase available after connecting a bot. See README.");
    } catch { alert(lang === "ru" ? "Ошибка. Попробуй позже." : "Error. Try again later."); }
    setLoading(false);
  };
  return (
    <>
      <div onClick={onClose} style={{ position:"absolute",inset:0,zIndex:40,background:"rgba(0,0,0,0.72)",opacity:open?1:0,pointerEvents:open?"auto":"none",transition:"opacity 0.3s" }} />
      <div style={{ position:"absolute",bottom:0,left:0,right:0,zIndex:50,borderRadius:"22px 22px 0 0",background:"rgba(4,5,14,0.98)",backdropFilter:"blur(32px)",borderTop:`0.5px solid rgba(${r},${g},${b},0.3)`,boxShadow:`0 -14px 50px rgba(0,0,0,0.85)`,transform:open?"translateY(0)":"translateY(110%)",transition:"transform 0.42s cubic-bezier(0.32,0.72,0,1)",paddingBottom:28 }}>
        <div style={{ display:"flex",justifyContent:"center",paddingTop:13,paddingBottom:5 }}>
          <div style={{ width:34,height:3,borderRadius:99,background:`rgba(${r},${g},${b},0.28)` }} />
        </div>
        <div style={{ textAlign:"center",padding:"8px 24px 22px" }}>
          <p style={{ fontFamily:"'Cormorant Garamond',Georgia,serif",fontStyle:"italic",fontWeight:400,fontSize:26,color:"rgba(255,252,245,0.92)",margin:0,letterSpacing:"0.03em" }}>{t.starsTitle}</p>
          <p style={{ fontFamily:"'Raleway',sans-serif",fontWeight:300,fontSize:11,color:`rgba(${r},${g},${b},0.55)`,margin:"8px 0 0",letterSpacing:"0.06em" }}>{t.starsSub}</p>
        </div>
        <div style={{ padding:"0 20px 14px" }}>
          <button onClick={handleBuy} disabled={loading} style={{ display:"flex",alignItems:"center",justifyContent:"space-between",width:"100%",padding:"17px 20px",borderRadius:16,background:`rgba(${r},${g},${b},0.09)`,border:`1px solid rgba(${r},${g},${b},${loading?0.7:0.38})`,cursor:loading?"default":"pointer",transition:"all 0.2s" }}>
            <span style={{ fontFamily:"'Cormorant Garamond',Georgia,serif",fontStyle:"italic",fontWeight:500,fontSize:19,color:"rgba(255,252,245,0.88)",letterSpacing:"0.02em" }}>{paid?t.starsPackPaid:t.starsPackFree}</span>
            <span style={{ fontFamily:"'Raleway',sans-serif",fontWeight:400,fontSize:17,color:`rgba(${r},${g},${b},0.9)`,flexShrink:0,marginLeft:12 }}>{loading?"...":(paid?t.starsPricePaid:t.starsPriceFree)}</span>
          </button>
        </div>
        <div style={{ padding:"0 20px" }}>
          <button onClick={onClose} style={{ width:"100%",padding:"12px 8px",borderRadius:14,background:"transparent",border:"0.5px solid rgba(255,255,255,0.1)",cursor:"pointer",fontFamily:"'Raleway',sans-serif",fontWeight:300,fontSize:12,letterSpacing:"0.14em",textTransform:"uppercase",color:"rgba(255,255,255,0.26)" }}>{t.starsCancel}</button>
        </div>
      </div>
    </>
  );
}

// ── Category dots ──────────────────────────────────────────────────────────
function CategoryDots({ current, lang, onDotPress }: { current: Category; lang: Lang; onDotPress: (c: Category) => void }) {
  return (
    <div style={{ display:"flex",alignItems:"center",justifyContent:"center",gap:8,padding:"8px 0 0" }}>
      {CATEGORIES_ORDER.map(cat => {
        const cfg = CATEGORY_CONFIG[cat];
        const active = cat === current;
        return (
          <button key={cat} onClick={() => onDotPress(cat)} style={{ background:"none",border:"none",padding:"6px 3px",cursor:"pointer",display:"flex",alignItems:"center" }}>
            <div style={{
              width: active ? 20 : 6,
              height: 3,
              borderRadius: 99,
              background: active ? `rgb(${cfg.r},${cfg.g},${cfg.b})` : "rgba(255,255,255,0.15)",
              boxShadow: active ? `0 0 8px rgba(${cfg.r},${cfg.g},${cfg.b},0.6)` : "none",
              transition: "all 0.35s cubic-bezier(0.32,0.72,0,1)",
            }} />
          </button>
        );
      })}
    </div>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────
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
  const tasks = lang === "en" ? TASKS_EN : TASKS_RU;
  const { playTap, playReveal, playSwitch } = useSensualSound();

  const [isCasting, setIsCasting] = useState(false);
  const [taskText, setTaskText] = useState("");
  const [hintText, setHintText] = useState(t.hint);
  const [revealProgress, setRevealProgress] = useState(0);
  const [flashTrigger, setFlashTrigger] = useState(0);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [starsShopOpen, setStarsShopOpen] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>(() => loadHistory());
  const [limits, setLimits] = useState<LimitsData>(() => loadLimits());

  // Enter animation
  const [mounted, setMounted] = useState(false);
  useEffect(() => { requestAnimationFrame(() => setMounted(true)); }, []);

  const revealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Touch swipe tracking
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const swipeLocked = useRef(false);

  const catTasks = tasks[category];
  const remaining = getRemaining(limits, category);
  const catIdx = CATEGORIES_ORDER.indexOf(category);

  const goToCategory = useCallback((cat: Category) => {
    playSwitch(440);
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred("light");
    onCategoryChange(cat);
  }, [onCategoryChange, playSwitch]);

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
    if (dx < 0 && catIdx < CATEGORIES_ORDER.length - 1) {
      goToCategory(CATEGORIES_ORDER[catIdx + 1]);
    } else if (dx > 0 && catIdx > 0) {
      goToCategory(CATEGORIES_ORDER[catIdx - 1]);
    }
  }, [catIdx, goToCategory]);

  const handleTap = useCallback(() => {
    if (isCasting) return;
    const tg = window.Telegram?.WebApp;
    if (remaining <= 0) {
      tg?.HapticFeedback?.notificationOccurred("error");
      setStarsShopOpen(true);
      return;
    }
    tg?.HapticFeedback?.impactOccurred("medium");
    playTap();
    setIsCasting(true);
    setRevealProgress(0);
    setTaskText("");
    setHintText(t.tapping);
    setFlashTrigger(v => v + 1);
    const castDelay = 1000 + Math.random() * 600;
    if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
    revealTimerRef.current = setTimeout(() => {
      const picked = catTasks[Math.floor(Math.random() * catTasks.length)];
      const today = getTodayStr();
      const newLimits = { ...limits };
      const entry = newLimits[category];
      if (entry.date !== today) { entry.date = today; entry.count = 0; entry.bonus = 0; }
      entry.count++;
      saveLimits(newLimits);
      setLimits({ ...newLimits });
      const newEntry: HistoryEntry = { id:`${Date.now()}-${Math.random()}`, text: picked, category, date: new Date().toISOString() };
      const newHistory = [...history, newEntry];
      saveHistory(newHistory);
      setHistory(newHistory);
      setTaskText(picked);
      setHintText(t.received);
      setIsCasting(false);
      tg?.HapticFeedback?.notificationOccurred("success");
      playReveal();
      let prog = 0;
      const step = () => { prog = Math.min(1, prog + 0.025); setRevealProgress(prog); if (prog < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    }, castDelay);
  }, [isCasting, remaining, category, catTasks, history, limits, playTap, playReveal, t]);

  const handleStarsPurchased = useCallback((bonus: number) => {
    const today = getTodayStr();
    const newLimits = { ...limits };
    const entry = newLimits[category];
    if (entry.date !== today) { entry.date = today; entry.count = 0; entry.bonus = 0; }
    entry.bonus += bonus;
    saveLimits(newLimits);
    setLimits({ ...newLimits });
  }, [limits, category]);

  const catLabels: Record<Category, string> = {
    compliments: t.catCompliments, tenderness: t.catTenderness,
    desire: t.catDesire, passion: t.catPassion, hard: t.catHard,
  };
  const catDescs: Record<Category, string> = {
    compliments: t.catComplimentsDesc, tenderness: t.catTendernessDesc,
    desire: t.catDesireDesc, passion: t.catPassionDesc, hard: t.catHardDesc,
  };

  const enterX = swipeDir === "left" ? 60 : -60;

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{
        position: "fixed", inset: 0,
        background: "#060409",
        display: "flex", flexDirection: "column",
        overflow: "hidden",
        opacity: mounted ? 1 : 0,
        transform: mounted ? "translateX(0)" : `translateX(${enterX}px)`,
        transition: mounted
          ? "opacity 0.32s ease, transform 0.38s cubic-bezier(0.22,1,0.36,1)"
          : "none",
      }}
    >
      {/* Top bar */}
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 20px 6px",flexShrink:0,position:"relative",zIndex:10 }}>
        <button onClick={onBack} style={{ background:"transparent",border:"none",cursor:"pointer",fontFamily:"'Raleway',sans-serif",fontWeight:200,fontSize:10,letterSpacing:"0.18em",textTransform:"uppercase",color:"rgba(255,255,255,0.28)",padding:"4px 0" }}>
          {t.backLabel}
        </button>
        <div style={{ textAlign:"center" }}>
          <p style={{ fontFamily:"'Cormorant Garamond',Georgia,serif",fontStyle:"italic",fontWeight:400,fontSize:20,color:"rgba(255,252,245,0.88)",letterSpacing:"0.04em",margin:0,textShadow:`0 0 22px rgba(${r},${g},${b},0.6)` }}>
            {catLabels[category]}
          </p>
        </div>
        <button onClick={() => setHistoryOpen(true)} style={{ background:"transparent",border:"none",cursor:"pointer",fontFamily:"'Raleway',sans-serif",fontWeight:200,fontSize:10,letterSpacing:"0.18em",textTransform:"uppercase",color:"rgba(255,255,255,0.28)",padding:"4px 0" }}>
          {t.history}
        </button>
      </div>

      {/* Category description */}
      <div style={{ textAlign:"center",flexShrink:0,position:"relative",zIndex:10,padding:"0 24px 2px" }}>
        <p style={{ fontFamily:"'Raleway',sans-serif",fontWeight:200,fontSize:9,letterSpacing:"0.20em",textTransform:"uppercase",color:`rgba(${r},${g},${b},0.48)`,margin:0 }}>
          {catDescs[category]}
        </p>
      </div>

      {/* Remaining */}
      {remaining > 0 && (
        <div style={{ textAlign:"center",flexShrink:0,position:"relative",zIndex:10,paddingTop:2 }}>
          <span style={{ fontFamily:"'Raleway',sans-serif",fontWeight:200,fontSize:8,letterSpacing:"0.18em",textTransform:"uppercase",color:`rgba(${r},${g},${b},0.32)` }}>
            {t.remaining(remaining)}
          </span>
        </div>
      )}

      {/* Flame canvas */}
      <div style={{ flex:1,position:"relative",minHeight:0 }}>
        <FlameCanvas
          onTap={handleTap}
          isCasting={isCasting}
          flashTrigger={flashTrigger}
          color={cfg}
          taskText={taskText}
          revealProgress={revealProgress}
          hintText={hintText}
        />
      </div>

      {/* Category dots + swipe hint */}
      <div style={{ flexShrink:0,position:"relative",zIndex:10,paddingBottom:4 }}>
        <CategoryDots current={category} lang={lang} onDotPress={goToCategory} />
        <p style={{ textAlign:"center",fontFamily:"'Raleway',sans-serif",fontWeight:200,fontSize:7,letterSpacing:"0.20em",textTransform:"uppercase",color:"rgba(255,255,255,0.10)",margin:"4px 0 0" }}>
          {t.swipeHint}
        </p>
      </div>

      {/* Bottom */}
      <div style={{ display:"flex",justifyContent:"center",alignItems:"center",padding:"8px 20px max(16px,env(safe-area-inset-bottom))",flexShrink:0,position:"relative",zIndex:10 }}>
        {remaining === 0 ? (
          <button onClick={() => setStarsShopOpen(true)} style={{ background:"transparent",border:"none",cursor:"pointer",fontFamily:"'Raleway',sans-serif",fontWeight:200,fontSize:9,letterSpacing:"0.20em",textTransform:"uppercase",color:`rgba(${r},${g},${b},0.45)`,padding:"4px 12px" }}>
            {lang==="ru"?"ВЕРНИСЬ ЗАВТРА · ИЛИ КУПИ ★":"COME BACK TOMORROW · OR BUY ★"}
          </button>
        ) : (
          <span style={{ fontFamily:"'Raleway',sans-serif",fontWeight:200,fontSize:8,letterSpacing:"0.16em",textTransform:"uppercase",color:"rgba(255,255,255,0.09)" }}>touché</span>
        )}
      </div>

      <HistoryPanel entries={history.filter(e => e.category === category)} open={historyOpen} onClose={() => setHistoryOpen(false)} accentRgb={cfg} lang={lang} />
      <StarsShop open={starsShopOpen} onClose={() => setStarsShopOpen(false)} onPurchased={handleStarsPurchased} accentRgb={cfg} lang={lang} paid={cfg.paid} />
    </div>
  );
}
