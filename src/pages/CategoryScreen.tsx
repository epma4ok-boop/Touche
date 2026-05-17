import { useState, useCallback, useRef, useEffect } from "react";
import HeartbeatCanvas from "@/components/HeartbeatCanvas";
import HistoryPanel, { type HistoryEntry } from "@/components/HistoryPanel";
import { UI, CATEGORY_CONFIG, CATEGORIES_ORDER, type Lang, type Category } from "@/data/i18n";
import { TASKS_RU, TASKS_EN } from "@/data/tasks";

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
  return { compliments: {...empty}, tenderness: {...empty}, desire: {...empty}, passion: {...empty}, hard: {...empty} };
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

// Stars shop
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
      alert(lang === "ru" ? "Покупка Stars доступна после подключения бота." : "Stars purchase available after connecting a bot.");
    } catch { alert(lang === "ru" ? "Ошибка. Попробуй позже." : "Error. Try again later."); }
    setLoading(false);
  };
  return (
    <>
      <div onClick={onClose} style={{ position:"absolute",inset:0,zIndex:40,background:"rgba(0,0,0,0.25)",opacity:open?1:0,pointerEvents:open?"auto":"none",transition:"opacity 0.3s",backdropFilter:open?"blur(4px)":"none" }} />
      <div style={{ position:"absolute",bottom:0,left:0,right:0,zIndex:50,borderRadius:"22px 22px 0 0",background:"rgba(255,252,248,0.99)",backdropFilter:"blur(32px)",borderTop:`1px solid rgba(${r},${g},${b},0.18)`,boxShadow:`0 -14px 50px rgba(0,0,0,0.10)`,transform:open?"translateY(0)":"translateY(110%)",transition:"transform 0.42s cubic-bezier(0.32,0.72,0,1)",paddingBottom:28 }}>
        <div style={{ display:"flex",justifyContent:"center",paddingTop:13,paddingBottom:5 }}>
          <div style={{ width:34,height:3,borderRadius:99,background:`rgba(${r},${g},${b},0.18)` }} />
        </div>
        <div style={{ textAlign:"center",padding:"8px 24px 22px" }}>
          <p style={{ fontFamily:"'Plus Jakarta Sans','DM Sans',sans-serif",fontWeight:600,fontSize:22,color:"rgba(40,30,50,0.90)",margin:0 }}>{t.starsTitle}</p>
          <p style={{ fontFamily:"'Plus Jakarta Sans','DM Sans',sans-serif",fontWeight:300,fontSize:13,color:`rgba(${r},${g},${b},0.65)`,margin:"8px 0 0" }}>{t.starsSub}</p>
        </div>
        <div style={{ padding:"0 20px 14px" }}>
          <button onClick={handleBuy} disabled={loading} style={{ display:"flex",alignItems:"center",justifyContent:"space-between",width:"100%",padding:"17px 20px",borderRadius:16,background:`rgba(${r},${g},${b},0.07)`,border:`1px solid rgba(${r},${g},${b},0.22)`,cursor:loading?"default":"pointer" }}>
            <span style={{ fontFamily:"'Plus Jakarta Sans','DM Sans',sans-serif",fontWeight:500,fontSize:17,color:"rgba(40,30,50,0.85)" }}>{paid?t.starsPackPaid:t.starsPackFree}</span>
            <span style={{ fontFamily:"'Plus Jakarta Sans','DM Sans',sans-serif",fontWeight:600,fontSize:17,color:`rgba(${r},${g},${b},0.9)` }}>{loading?"...":(paid?t.starsPricePaid:t.starsPriceFree)}</span>
          </button>
        </div>
        <div style={{ padding:"0 20px" }}>
          <button onClick={onClose} style={{ width:"100%",padding:"12px 8px",borderRadius:14,background:"transparent",border:"1px solid rgba(40,30,50,0.10)",cursor:"pointer",fontFamily:"'Plus Jakarta Sans','DM Sans',sans-serif",fontWeight:300,fontSize:13,color:"rgba(40,30,50,0.32)" }}>{t.starsCancel}</button>
        </div>
      </div>
    </>
  );
}

// Category dots
function CategoryDots({ current, onDotPress }: { current: Category; onDotPress: (c: Category) => void }) {
  return (
    <div style={{ display:"flex",alignItems:"center",justifyContent:"center",gap:10 }}>
      {CATEGORIES_ORDER.map(cat => {
        const cfg = CATEGORY_CONFIG[cat];
        const active = cat === current;
        return (
          <button key={cat} onClick={() => onDotPress(cat)} style={{ background:"none",border:"none",padding:"8px 4px",cursor:"pointer",display:"flex",alignItems:"center" }}>
            <div style={{
              width: active ? 24 : 7, height: 4, borderRadius: 99,
              background: active ? `rgb(${cfg.r},${cfg.g},${cfg.b})` : "rgba(40,30,50,0.15)",
              boxShadow: active ? `0 0 10px rgba(${cfg.r},${cfg.g},${cfg.b},0.45)` : "none",
              transition: "all 0.35s cubic-bezier(0.32,0.72,0,1)",
            }} />
          </button>
        );
      })}
    </div>
  );
}

// Full-screen task reveal overlay
interface TaskRevealProps {
  text: string;
  color: { r: number; g: number; b: number };
  visible: boolean;
  onDismiss: () => void;
  lang: Lang;
  catLabel: string;
}
function TaskReveal({ text, color, visible, onDismiss, lang, catLabel }: TaskRevealProps) {
  const { r, g, b } = color;
  const t = UI[lang];
  const [textVisible, setTextVisible] = useState(false);

  useEffect(() => {
    if (visible) {
      const tm = setTimeout(() => setTextVisible(true), 220);
      return () => clearTimeout(tm);
    } else {
      setTextVisible(false);
    }
  }, [visible]);

  return (
    <div style={{
      position: "absolute", inset: 0, zIndex: 30,
      background: `rgba(${r},${g},${b},0.92)`,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "32px 28px max(32px,env(safe-area-inset-bottom))",
      opacity: visible ? 1 : 0,
      pointerEvents: visible ? "auto" : "none",
      transition: "opacity 0.38s cubic-bezier(0.22,1,0.36,1)",
      backdropFilter: "blur(2px)",
    }}>
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0,
        display: "flex", justifyContent: "center",
        padding: "20px 0 0",
        opacity: textVisible ? 1 : 0,
        transform: textVisible ? "translateY(0)" : "translateY(-8px)",
        transition: "opacity 0.5s ease 0.1s, transform 0.5s ease 0.1s",
      }}>
        <span style={{ fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif", fontWeight: 400, fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(255,255,255,0.55)" }}>
          {catLabel}
        </span>
      </div>

      <div style={{
        opacity: textVisible ? 1 : 0,
        transform: textVisible ? "translateY(0)" : "translateY(28px)",
        transition: "opacity 0.6s cubic-bezier(0.16,1,0.3,1) 0.18s, transform 0.6s cubic-bezier(0.16,1,0.3,1) 0.18s",
        textAlign: "center", width: "100%",
      }}>
        <p style={{
          fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif",
          fontWeight: 600,
          fontSize: "clamp(22px, 6.5vw, 34px)",
          color: "#ffffff", lineHeight: 1.45,
          letterSpacing: "-0.01em", margin: 0,
          textShadow: "0 2px 24px rgba(0,0,0,0.15)",
        }}>
          {text}
        </p>
      </div>

      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        padding: "0 28px max(28px,env(safe-area-inset-bottom))",
        opacity: textVisible ? 1 : 0,
        transform: textVisible ? "translateY(0)" : "translateY(12px)",
        transition: "opacity 0.5s ease 0.35s, transform 0.5s ease 0.35s",
      }}>
        <button onClick={onDismiss} style={{
          width: "100%", padding: "18px 8px", borderRadius: 18,
          background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.32)",
          cursor: "pointer",
          fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif",
          fontWeight: 500, fontSize: 16, letterSpacing: "0.02em",
          color: "#ffffff", backdropFilter: "blur(8px)",
        }}>
          {t.taskDone}
        </button>
      </div>

      <div style={{ position:"absolute",top:"-15%",right:"-20%",width:"55vw",height:"55vw",borderRadius:"50%",background:"rgba(255,255,255,0.06)",pointerEvents:"none" }} />
      <div style={{ position:"absolute",bottom:"-10%",left:"-18%",width:"45vw",height:"45vw",borderRadius:"50%",background:"rgba(255,255,255,0.05)",pointerEvents:"none" }} />
    </div>
  );
}

// Main
interface CategoryScreenProps {
  lang: Lang; category: Category;
  onBack: () => void; onCategoryChange: (cat: Category) => void;
  swipeDir: "left" | "right";
}

export default function CategoryScreen({ lang, category, onBack, onCategoryChange, swipeDir }: CategoryScreenProps) {
  const cfg = CATEGORY_CONFIG[category];
  const { r, g, b } = cfg;
  const t = UI[lang];
  const tasks = lang === "en" ? TASKS_EN : TASKS_RU;

  const [isCasting, setIsCasting] = useState(false);
  const [taskText, setTaskText] = useState("");
  const [hintText, setHintText] = useState(t.hint);
  const [showReveal, setShowReveal] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [starsShopOpen, setStarsShopOpen] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>(() => loadHistory());
  const [limits, setLimits] = useState<LimitsData>(() => loadLimits());

  const [mounted, setMounted] = useState(false);
  useEffect(() => { requestAnimationFrame(() => setMounted(true)); }, []);

  const revealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const swipeLocked = useRef(false);

  const catTasks = tasks[category];
  const remaining = getRemaining(limits, category);
  const catIdx = CATEGORIES_ORDER.indexOf(category);

  const catLabels: Record<Category, string> = {
    compliments: t.catCompliments, tenderness: t.catTenderness,
    desire: t.catDesire, passion: t.catPassion, hard: t.catHard,
  };
  const catSubs: Record<Category, string> = {
    compliments: t.catComplimentsSub, tenderness: t.catTendernessSub,
    desire: t.catDesireSub, passion: t.catPassionSub, hard: t.catHardSub,
  };

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

  const handleHoldComplete = useCallback(() => {
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

    const castDelay = 800 + Math.random() * 400;
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
  }, [isCasting, remaining, category, catTasks, history, limits, t]);

  const handleDismiss = useCallback(() => {
    setShowReveal(false);
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
  }, [limits, category]);

  const enterX = swipeDir === "left" ? 60 : -60;

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{
        position: "fixed", inset: 0, background: "#fdf8f5",
        display: "flex", flexDirection: "column", overflow: "hidden",
        opacity: mounted ? 1 : 0,
        transform: mounted ? "translateX(0)" : `translateX(${enterX}px)`,
        transition: mounted ? "opacity 0.32s ease, transform 0.38s cubic-bezier(0.22,1,0.36,1)" : "none",
      }}
    >
      {/* Top bar */}
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 20px 6px",flexShrink:0,position:"relative",zIndex:10 }}>
        <button onClick={onBack} style={{ background:"transparent",border:"none",cursor:"pointer",fontFamily:"'Plus Jakarta Sans','DM Sans',sans-serif",fontWeight:400,fontSize:14,letterSpacing:"0.01em",color:"rgba(40,30,50,0.40)",padding:"4px 0" }}>
          {t.backLabel}
        </button>
        <div style={{ textAlign:"center" }}>
          <p style={{ fontFamily:"'Plus Jakarta Sans','DM Sans',sans-serif",fontWeight:600,fontSize:19,color:"rgba(40,30,50,0.85)",letterSpacing:"-0.01em",margin:0 }}>
            {catLabels[category]}
          </p>
        </div>
        <button onClick={() => setHistoryOpen(true)} style={{ background:"transparent",border:"none",cursor:"pointer",fontFamily:"'Plus Jakarta Sans','DM Sans',sans-serif",fontWeight:400,fontSize:14,color:"rgba(40,30,50,0.40)",padding:"4px 0" }}>
          {t.history}
        </button>
      </div>

      {/* Subtitle */}
      <div style={{ textAlign:"center",flexShrink:0,position:"relative",zIndex:10,padding:"0 24px 2px" }}>
        <p style={{ fontFamily:"'Plus Jakarta Sans','DM Sans',sans-serif",fontWeight:300,fontSize:12,letterSpacing:"0.14em",textTransform:"uppercase",color:`rgba(${r},${g},${b},0.55)`,margin:0 }}>
          {catSubs[category]}
        </p>
      </div>

      {/* Remaining */}
      {remaining > 0 && (
        <div style={{ textAlign:"center",flexShrink:0,position:"relative",zIndex:10,paddingTop:3 }}>
          <span style={{ fontFamily:"'Plus Jakarta Sans','DM Sans',sans-serif",fontWeight:300,fontSize:11,letterSpacing:"0.10em",textTransform:"uppercase",color:`rgba(${r},${g},${b},0.38)` }}>
            {t.remaining(remaining)}
          </span>
        </div>
      )}

      {/* Heartbeat zone — bigger */}
      <div style={{ flex:1, position:"relative", minHeight:0 }}>
        <HeartbeatCanvas
          onHoldComplete={handleHoldComplete}
          isCasting={isCasting}
          color={cfg}
          hintText={hintText}
          holdDuration={2600}
          baseRScale={0.20}
        />
      </div>

      {/* Dots + swipe hint */}
      <div style={{ flexShrink:0, position:"relative", zIndex:10, paddingBottom:6 }}>
        <CategoryDots current={category} onDotPress={goToCategory} />
        <p style={{ textAlign:"center",fontFamily:"'Plus Jakarta Sans','DM Sans',sans-serif",fontWeight:400,fontSize:11,letterSpacing:"0.16em",textTransform:"uppercase",color:"rgba(40,30,50,0.28)",margin:"6px 0 0" }}>
          {t.swipeHint}
        </p>
      </div>

      {/* Bottom */}
      <div style={{ display:"flex",justifyContent:"center",alignItems:"center",padding:"8px 20px max(16px,env(safe-area-inset-bottom))",flexShrink:0,position:"relative",zIndex:10 }}>
        {remaining === 0 ? (
          <button onClick={() => setStarsShopOpen(true)} style={{ background:`rgba(${r},${g},${b},0.07)`,border:`1px solid rgba(${r},${g},${b},0.22)`,borderRadius:12,cursor:"pointer",fontFamily:"'Plus Jakarta Sans','DM Sans',sans-serif",fontWeight:500,fontSize:12,letterSpacing:"0.10em",textTransform:"uppercase",color:`rgba(${r},${g},${b},0.70)`,padding:"10px 18px" }}>
            {t.limitBtn}
          </button>
        ) : (
          <span style={{ fontFamily:"'Plus Jakarta Sans','DM Sans',sans-serif",fontWeight:300,fontSize:11,letterSpacing:"0.14em",textTransform:"uppercase",color:"rgba(40,30,50,0.14)" }}>touché</span>
        )}
      </div>

      <TaskReveal text={taskText} color={cfg} visible={showReveal} onDismiss={handleDismiss} lang={lang} catLabel={catLabels[category]} />
      <HistoryPanel entries={history.filter(e => e.category === category)} open={historyOpen} onClose={() => setHistoryOpen(false)} accentRgb={cfg} lang={lang} />
      <StarsShop open={starsShopOpen} onClose={() => setStarsShopOpen(false)} onPurchased={handleStarsPurchased} accentRgb={cfg} lang={lang} paid={cfg.paid} />
    </div>
  );
}
