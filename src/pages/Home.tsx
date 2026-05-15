import { useEffect, useCallback, useState } from "react";
import { UI, CATEGORY_CONFIG, CATEGORIES_ORDER, type Lang, type Category } from "@/data/i18n";

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        ready: () => void; expand: () => void;
        HapticFeedback?: { impactOccurred: (style: string) => void };
        initDataUnsafe?: { user?: { username?: string; id?: number }; start_param?: string };
        initData?: string;
        openTelegramLink?: (url: string) => void;
      };
    };
  }
}

interface HomeProps { lang: Lang; onCategorySelect: (cat: Category) => void; }

const BOT_USERNAME = "ToucheBot";
const UNLOCK_KEY = "touche_unlocked_18";
function getUnlocked18() { try { return localStorage.getItem(UNLOCK_KEY) === "1"; } catch { return false; } }
function setUnlocked18() { try { localStorage.setItem(UNLOCK_KEY, "1"); } catch {} }

// Category icon SVGs inline
const ICONS: Record<Category, string> = {
  compliments: "💬",
  tenderness:  "🌸",
  desire:      "💋",
  passion:     "🔥",
  hard:        "⛓️",
};

// ── Category band ─────────────────────────────────────────────────────────
function CategoryBand({ category, lang, onClick, index }: { category: Category; lang: Lang; onClick: () => void; index: number }) {
  const cfg = CATEGORY_CONFIG[category];
  const { r, g, b } = cfg;
  const t = UI[lang];
  const [pressed, setPressed] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), index * 65 + 80);
    return () => clearTimeout(timer);
  }, [index]);

  const labels: Record<Category, { main: string; sub: string }> = {
    compliments: { main: t.catCompliments, sub: t.catComplimentsSub },
    tenderness:  { main: t.catTenderness,  sub: t.catTendernessSub  },
    desire:      { main: t.catDesire,      sub: t.catDesireSub      },
    passion:     { main: t.catPassion,     sub: t.catPassionSub     },
    hard:        { main: t.catHard,        sub: t.catHardSub        },
  };
  const lbl = labels[category];

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setPressed(true)}
      onMouseLeave={() => setPressed(false)}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      style={{
        position: "relative", width: "100%",
        background: pressed ? `rgba(${r},${g},${b},0.06)` : "transparent",
        border: "none", borderBottom: "0.5px solid rgba(40,30,50,0.07)",
        cursor: "pointer", display: "flex", alignItems: "center",
        flex: 1, minHeight: 0, overflow: "hidden",
        transition: "background 0.2s, opacity 0.4s, transform 0.4s",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateX(0)" : "translateX(-18px)",
      }}
    >
      {/* Left accent bar */}
      <div style={{
        width: pressed ? 4 : 3, alignSelf: "stretch", flexShrink: 0,
        background: `linear-gradient(to bottom, rgba(${r},${g},${b},0), rgba(${r},${g},${b},${pressed?0.85:0.45}), rgba(${r},${g},${b},0))`,
        transition: "width 0.2s", borderRadius: "0 2px 2px 0",
      }} />

      {/* Icon */}
      <div style={{
        flexShrink: 0, width: 44, height: 44,
        display: "flex", alignItems: "center", justifyContent: "center",
        marginLeft: 16,
        background: `rgba(${r},${g},${b},${pressed ? 0.12 : 0.07})`,
        borderRadius: 14,
        fontSize: 22,
        transition: "background 0.2s, transform 0.2s",
        transform: pressed ? "scale(1.08)" : "scale(1)",
        border: `1px solid rgba(${r},${g},${b},${pressed ? 0.22 : 0.10})`,
      }}>
        {ICONS[category]}
      </div>

      {/* Text */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"flex-start", justifyContent:"center", padding:"0 12px 0 14px", position:"relative", zIndex:2 }}>
        <p style={{
          fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif", fontWeight: 600,
          fontSize: "clamp(18px, 4.8vw, 26px)",
          color: pressed ? `rgb(${r},${g},${b})` : "rgba(40,30,50,0.82)",
          letterSpacing: "-0.02em", margin: 0, lineHeight: 1.15,
          transition: "color 0.2s",
        }}>
          {lbl.main}
          {cfg.paid && (
            <span style={{ fontFamily:"'Plus Jakarta Sans','DM Sans',sans-serif", fontWeight:400, fontSize:9, letterSpacing:"0.14em", textTransform:"uppercase", color:`rgba(${r},${g},${b},0.55)`, marginLeft:9, verticalAlign:"middle" }}>
              18+
            </span>
          )}
        </p>
        <p style={{
          fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif", fontWeight: 300,
          fontSize: "clamp(9px,2vw,11px)", letterSpacing: "0.13em", textTransform: "uppercase",
          color: `rgba(${r},${g},${b},${pressed?0.60:0.38})`,
          margin: "3px 0 0", transition: "color 0.2s",
        }}>
          {lbl.sub}
        </p>
      </div>

      {/* Right */}
      <div style={{ flexShrink:0, padding:"0 18px 0 0", zIndex:2 }}>
        {cfg.paid ? (
          <div style={{
            padding:"3px 8px", borderRadius:8,
            border:`1px solid rgba(${r},${g},${b},${pressed?0.45:0.18})`,
            background:`rgba(${r},${g},${b},0.06)`, transition:"all 0.2s",
          }}>
            <span style={{ fontFamily:"'Plus Jakarta Sans','DM Sans',sans-serif", fontWeight:400, fontSize:9, letterSpacing:"0.16em", textTransform:"uppercase", color:`rgba(${r},${g},${b},${pressed?0.70:0.40})` }}>
              18+
            </span>
          </div>
        ) : (
          <span style={{
            opacity: pressed ? 0.70 : 0.22, fontSize: 20, fontWeight: 300,
            color: `rgb(${r},${g},${b})`, display: "block",
            transition: "opacity 0.2s, transform 0.2s",
            transform: pressed ? "translateX(3px)" : "translateX(0)",
          }}>›</span>
        )}
      </div>
    </button>
  );
}

// ── 18+ modal ─────────────────────────────────────────────────────────────
function UnlockModal({ open, category, onConfirm, onCancel, lang }: {
  open: boolean; category: Category | null; onConfirm: () => void; onCancel: () => void; lang: Lang;
}) {
  const t = UI[lang];
  const cfg = category ? CATEGORY_CONFIG[category] : CATEGORY_CONFIG.passion;
  const { r, g, b } = cfg;
  return (
    <>
      <div onClick={onCancel} style={{ position:"absolute",inset:0,zIndex:40,background:"rgba(0,0,0,0.22)",opacity:open?1:0,pointerEvents:open?"auto":"none",transition:"opacity 0.3s",backdropFilter:open?"blur(6px)":"none" }} />
      <div style={{ position:"absolute",bottom:0,left:0,right:0,zIndex:50,borderRadius:"24px 24px 0 0",background:"rgba(255,252,248,0.99)",borderTop:`1px solid rgba(${r},${g},${b},0.18)`,boxShadow:"0 -20px 60px rgba(0,0,0,0.10)",transform:open?"translateY(0)":"translateY(110%)",transition:"transform 0.42s cubic-bezier(0.32,0.72,0,1)",paddingBottom:"max(28px,env(safe-area-inset-bottom))" }}>
        <div style={{ display:"flex",justifyContent:"center",paddingTop:14,paddingBottom:6 }}>
          <div style={{ width:36,height:3,borderRadius:99,background:`rgba(${r},${g},${b},0.18)` }} />
        </div>
        <div style={{ textAlign:"center",padding:"10px 32px 24px" }}>
          <div style={{ fontSize:36,marginBottom:8 }}>🔞</div>
          <p style={{ fontFamily:"'Plus Jakarta Sans','DM Sans',sans-serif",fontWeight:700,fontSize:24,color:"rgba(40,30,50,0.88)",margin:0,letterSpacing:"-0.02em" }}>{t.lockTitle}</p>
          <p style={{ fontFamily:"'Plus Jakarta Sans','DM Sans',sans-serif",fontWeight:300,fontSize:13,color:`rgba(${r},${g},${b},0.60)`,margin:"10px 0 0" }}>{t.lockSub}</p>
        </div>
        <div style={{ padding:"0 22px 12px" }}>
          <button onClick={onConfirm} style={{ width:"100%",padding:"18px 8px",borderRadius:16,background:`rgba(${r},${g},${b},0.09)`,border:`1px solid rgba(${r},${g},${b},0.30)`,cursor:"pointer",fontFamily:"'Plus Jakarta Sans','DM Sans',sans-serif",fontWeight:600,fontSize:18,color:`rgb(${r},${g},${b})`,letterSpacing:"-0.01em" }}>{t.lockConfirm}</button>
        </div>
        <div style={{ padding:"0 22px" }}>
          <button onClick={onCancel} style={{ width:"100%",padding:"14px 8px",borderRadius:14,background:"transparent",border:"1px solid rgba(40,30,50,0.08)",cursor:"pointer",fontFamily:"'Plus Jakarta Sans','DM Sans',sans-serif",fontWeight:300,fontSize:13,letterSpacing:"0.06em",textTransform:"uppercase",color:"rgba(40,30,50,0.28)" }}>{t.lockCancel}</button>
        </div>
      </div>
    </>
  );
}

function Toast({ visible, text }: { visible: boolean; text: string }) {
  return (
    <div style={{ position:"absolute",top:64,left:"50%",transform:`translateX(-50%) translateY(${visible?0:-8}px)`,zIndex:60,pointerEvents:"none",opacity:visible?1:0,transition:"opacity 0.4s, transform 0.4s",background:"rgba(255,252,248,0.98)",border:"1px solid rgba(200,100,160,0.22)",boxShadow:"0 4px 40px rgba(0,0,0,0.10)",borderRadius:14,padding:"11px 20px",whiteSpace:"nowrap",backdropFilter:"blur(20px)" }}>
      <span style={{ fontFamily:"'Plus Jakarta Sans','DM Sans',sans-serif",fontWeight:500,fontSize:15,color:"rgba(40,30,50,0.85)" }}>{text}</span>
    </div>
  );
}

export default function Home({ lang, onCategorySelect }: HomeProps) {
  const t = UI[lang];
  const [inviteToast, setInviteToast] = useState(false);
  const [unlockModal, setUnlockModal] = useState<Category | null>(null);
  const [unlocked18, setUnlocked18State] = useState(getUnlocked18);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.ready(); tg.expand();
      const sp = tg.initDataUnsafe?.start_param;
      if (sp?.startsWith("ref_")) { setInviteToast(true); setTimeout(() => setInviteToast(false), 3500); }
    }
  }, []);

  const handleCategoryClick = useCallback((cat: Category) => {
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred("light");
    if (CATEGORY_CONFIG[cat].paid && !unlocked18) { setUnlockModal(cat); return; }
    onCategorySelect(cat);
  }, [unlocked18, onCategorySelect]);

  const handleUnlockConfirm = useCallback(() => {
    setUnlocked18(true); setUnlocked18State(true);
    const cat = unlockModal!; setUnlockModal(null);
    setTimeout(() => onCategorySelect(cat), 320);
  }, [unlockModal, onCategorySelect]);

  const handleInvite = useCallback(() => {
    const tg = window.Telegram?.WebApp;
    const userId = tg?.initDataUnsafe?.user?.id;
    if (tg?.openTelegramLink && userId) {
      tg.openTelegramLink(`https://t.me/share/url?url=https://t.me/${BOT_USERNAME}?start=ref_${userId}&text=${encodeURIComponent(t.inviteText)}`);
    }
  }, [t.inviteText]);

  return (
    <div style={{ position:"fixed",inset:0,background:"#fdf8f5",display:"flex",flexDirection:"column",overflow:"hidden" }}>
      {/* Top gradient accent */}
      <div style={{ position:"absolute",top:0,left:0,right:0,height:180,background:"linear-gradient(to bottom, rgba(220,130,185,0.07) 0%, rgba(253,248,245,0) 100%)",pointerEvents:"none",zIndex:0 }} />

      {/* Header */}
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"18px 22px 12px",flexShrink:0,position:"relative",zIndex:2 }}>
        <div style={{ display:"flex",alignItems:"center",gap:8 }}>
          <span style={{ fontSize:20 }}>💋</span>
          <p style={{ fontFamily:"'Plus Jakarta Sans','DM Sans',sans-serif",fontWeight:700,fontSize:22,color:"rgba(40,30,50,0.88)",letterSpacing:"-0.03em",margin:0 }}>Touché</p>
        </div>
        <button onClick={handleInvite} style={{ background:"rgba(220,110,170,0.08)",border:"1px solid rgba(220,110,170,0.18)",borderRadius:99,padding:"7px 16px",cursor:"pointer",fontFamily:"'Plus Jakarta Sans','DM Sans',sans-serif",fontWeight:400,fontSize:11,letterSpacing:"0.08em",textTransform:"uppercase",color:"rgba(40,30,50,0.40)" }}>
          {t.invite}
        </button>
      </div>

      {/* Divider */}
      <div style={{ height:"0.5px",background:"linear-gradient(to right,transparent,rgba(220,110,170,0.18),transparent)",flexShrink:0,position:"relative",zIndex:2 }} />

      {/* Bands */}
      <div style={{ flex:1,display:"flex",flexDirection:"column",position:"relative",zIndex:2,minHeight:0 }}>
        {CATEGORIES_ORDER.map((cat, i) => (
          <CategoryBand key={cat} category={cat} lang={lang} onClick={() => handleCategoryClick(cat)} index={i} />
        ))}
      </div>

      {/* Footer */}
      <div style={{ flexShrink:0,position:"relative",zIndex:2,padding:"10px 0 max(16px,env(safe-area-inset-bottom))",textAlign:"center" }}>
        <p style={{ fontFamily:"'Plus Jakarta Sans','DM Sans',sans-serif",fontWeight:300,fontSize:9,letterSpacing:"0.20em",textTransform:"uppercase",color:"rgba(40,30,50,0.14)",margin:0 }}>
          {lang==="ru"?"1 задание в день · больше за ★":"1 task a day · more for ★"}
        </p>
      </div>

      <Toast visible={inviteToast} text={t.inviteBonus} />
      <UnlockModal open={unlockModal!==null} category={unlockModal} onConfirm={handleUnlockConfirm} onCancel={() => setUnlockModal(null)} lang={lang} />
    </div>
  );
}
