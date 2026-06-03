import { useEffect, useCallback, useState } from "react";
import { UI, CATEGORY_CONFIG, CATEGORIES_ORDER, LANG_CYCLE, type Lang, type Category } from "@/data/i18n";
import { BOT_USERNAME } from "@/config";

const BG = "#0d0610";
const TEXT_T = "rgba(255,238,248,0.18)";

declare global {
  interface Window {
    Telegram?: { WebApp: {
      ready: () => void; expand: () => void;
      viewportHeight?: number; viewportStableHeight?: number;
      HapticFeedback?: { impactOccurred: (s: string) => void };
      initDataUnsafe?: { user?: { username?: string; id?: number }; start_param?: string };
      initData?: string;
      openTelegramLink?: (url: string) => void;
      onEvent?: (e: string, cb: () => void) => void;
      offEvent?: (e: string, cb: () => void) => void;
      safeAreaInset?: { top: number; bottom: number; left: number; right: number };
      contentSafeAreaInset?: { top: number; bottom: number; left: number; right: number };
    } };
  }
}

function getCoupleId(): string | null {
  try { return localStorage.getItem("touche_couple_id"); } catch { return null; }
}

interface HomeProps {
  lang: Lang;
  onCategorySelect: (cat: Category) => void;
  onScenarioOpen: () => void;
  onLangSwitch: () => void;
}

function useTelegramTopInset(): number {
  const [topPx, setTopPx] = useState<number>(0);
  useEffect(() => {
    const tg = window.Telegram?.WebApp as any;
    function compute() {
      const content = tg?.contentSafeAreaInset?.top ?? 0;
      const safe = tg?.safeAreaInset?.top ?? 0;
      const total = content + safe;
      setTopPx(total > 10 ? total + 10 : 44);
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
  return topPx || 44;
}

const LEVEL_LABELS: Record<Category, Record<string, string>> = {
  compliments: { ru: "Легко",  en: "Easy",  hi: "आसान", pt: "Fácil",    es: "Fácil"    },
  tenderness:  { ru: "Нежно",  en: "Soft",  hi: "कोमल", pt: "Suave",    es: "Suave"    },
  desire:      { ru: "Средне", en: "Warm",  hi: "गर्म",  pt: "Quente",   es: "Cálido"   },
  passion:     { ru: "Горячо", en: "Hot",   hi: "गरम",   pt: "Ardente",  es: "Ardiente" },
  hard:        { ru: "18+",    en: "18+",   hi: "18+",   pt: "18+",      es: "18+"      },
};

function categoryHex(cat: Category): string {
  const { r, g, b } = CATEGORY_CONFIG[cat];
  return `rgb(${r},${g},${b})`;
}

/* Neon SVG icon per category */
function CategoryIcon({ category, r, g, b }: { category: Category; r: number; g: number; b: number }) {
  const color = `rgb(${r},${g},${b})`;
  const glow = `drop-shadow(0 0 5px rgba(${r},${g},${b},0.95))`;
  const props = {
    width: "18", height: "18", viewBox: "0 0 24 24", fill: "none",
    stroke: color, strokeWidth: "2" as const, strokeLinecap: "round" as const, strokeLinejoin: "round" as const,
    style: { filter: glow, display: "block" as const },
  };
  switch (category) {
    case "compliments":
      return (
        <svg {...props}>
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
      );
    case "tenderness":
      return (
        <svg {...props}>
          <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"/>
          <line x1="16" y1="8" x2="2" y2="22"/>
          <line x1="17.5" y1="15" x2="9" y2="15"/>
        </svg>
      );
    case "desire":
      return (
        <svg {...props}>
          <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
        </svg>
      );
    case "passion":
      return (
        <svg {...props}>
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
        </svg>
      );
    case "hard":
      return (
        <svg {...props}>
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
        </svg>
      );
    default:
      return null;
  }
}

/* Single category card */
function CategoryCard({
  category, lang, onClick, index,
}: { category: Category; lang: Lang; onClick: () => void; index: number }) {
  const cfg = CATEGORY_CONFIG[category];
  const { r, g, b } = cfg;
  const [pressed, setPressed] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const tm = setTimeout(() => setVisible(true), index * 60 + 30);
    return () => clearTimeout(tm);
  }, [index]);

  const t = UI[lang];
  const labels: Record<Category, { main: string; sub: string }> = {
    compliments: { main: t.catCompliments, sub: t.catComplimentsSub },
    tenderness:  { main: t.catTenderness,  sub: t.catTendernessSub },
    desire:      { main: t.catDesire,      sub: t.catDesireSub },
    passion:     { main: t.catPassion,     sub: t.catPassionSub },
    hard:        { main: t.catHard,        sub: t.catHardSub },
  };
  const lbl = labels[category];
  const level = LEVEL_LABELS[category][lang] ?? LEVEL_LABELS[category].en;

  return (
    <button
      onClick={onClick}
      onPointerDown={() => { setPressed(true); window.Telegram?.WebApp?.HapticFeedback?.impactOccurred("light"); }}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      style={{
        border: `1px solid rgba(${r},${g},${b},${pressed ? 0.30 : 0.15})`,
        borderRadius: 20, padding: 0, cursor: "pointer", textAlign: "left",
        width: "100%", position: "relative", overflow: "hidden",
        background: pressed ? `rgba(${r},${g},${b},0.08)` : "#110810",
        opacity: visible ? 1 : 0,
        transform: visible ? (pressed ? "scale(0.985)" : "scale(1)") : "translateY(12px)",
        transition: visible
          ? "opacity .35s, transform .18s, border-color .18s, background .18s"
          : "opacity .35s, transform .35s",
        flexShrink: 0,
      }}
    >
      <div style={{ position:"absolute",inset:0, backgroundImage:`url(/images/cat-${category}.png)`, backgroundSize:"cover", backgroundPosition:"center", opacity:pressed?0.34:0.26, filter:"saturate(1.4) brightness(0.9)", transition:"opacity .18s" }} />
      <div style={{ position:"absolute",inset:0, background:`linear-gradient(90deg,#0d0610ee 0%,#0d061088 45%,transparent 100%)` }} />
      <div style={{ position:"absolute",inset:0, background:`linear-gradient(135deg,rgba(${r},${g},${b},0.10) 0%,transparent 60%)` }} />
      <div style={{ position:"absolute",top:0,left:0,right:0,height:1, background:`linear-gradient(90deg,transparent,rgba(${r},${g},${b},0.50),transparent)` }} />
      <div style={{ position:"absolute",left:0,top:0,bottom:0,width:3, background:`linear-gradient(180deg,rgba(${r},${g},${b},0.90),rgba(${r},${g},${b},0.20))`, borderRadius:"20px 0 0 20px" }} />

      <div style={{ padding:"17px 18px 17px 22px", display:"flex", alignItems:"center", gap:14, position:"relative" }}>
        {/* Neon icon circle */}
        <div style={{
          width:44, height:44, borderRadius:"50%", flexShrink:0,
          background:`radial-gradient(circle at 35% 35%,rgba(${r},${g},${b},0.55),rgba(${r},${g},${b},0.15) 60%,transparent)`,
          border:`1px solid rgba(${r},${g},${b},0.32)`,
          boxShadow:`0 0 18px rgba(${r},${g},${b},0.18)`,
          display:"flex", alignItems:"center", justifyContent:"center",
        }}>
          <CategoryIcon category={category} r={r} g={g} b={b} />
        </div>
        <div style={{ flex:1,minWidth:0 }}>
          <div style={{ fontSize:17,fontWeight:700,letterSpacing:"-0.3px", color:"rgba(255,238,248,0.96)", textShadow:"0 1px 8px rgba(0,0,0,0.6)", whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{lbl.main}</div>
          <div style={{ fontSize:12,color:"rgba(255,238,248,0.42)",marginTop:3, whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{lbl.sub}</div>
        </div>
        <div style={{ display:"flex",flexDirection:"column",alignItems:"flex-end",gap:5,flexShrink:0 }}>
          <div style={{ fontSize:10,fontWeight:700,letterSpacing:"0.6px",textTransform:"uppercase",color:categoryHex(category), textShadow:`0 0 12px rgba(${r},${g},${b},0.80)` }}>{level}</div>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={categoryHex(category)} strokeOpacity="0.45" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </div>
      </div>
    </button>
  );
}

const LANG_ABBREV: Record<Lang, string> = { ru: "RU", en: "EN", hi: "हिं", pt: "PT", es: "ES" };

const SCENARIO_LABELS: Record<Lang, { title: string; sub: string; level: string }> = {
  ru: { title: "Сценарии",   sub: "Ролевые игры и фантазии",  level: "Особое"   },
  en: { title: "Scenarios",  sub: "Roleplay · for two",        level: "Special"  },
  hi: { title: "दृश्य",      sub: "रोलप्ले · दो के लिए",       level: "विशेष"    },
  pt: { title: "Cenários",   sub: "Roleplay · para dois",      level: "Especial" },
  es: { title: "Escenarios", sub: "Roleplay · para dos",       level: "Especial" },
};

const INVITE_LABELS: Record<Lang, { coupleTitle: string; coupleSub: string; partnerTitle: string; partnerSub: string; level: string }> = {
  ru: { coupleTitle: "Поделиться Touché",    coupleSub: "Отправить другу ссылку на приложение", partnerTitle: "Пригласить партнёра", partnerSub: "Поделись ссылкой — вечер начнётся", level: "Ссылка"  },
  en: { coupleTitle: "Share Touché",         coupleSub: "Send the app link to a friend",          partnerTitle: "Invite your partner", partnerSub: "Share the link — the evening begins", level: "Link"    },
  hi: { coupleTitle: "Touché शेयर करें",     coupleSub: "दोस्त को ऐप लिंक भेजें",               partnerTitle: "साथी को आमंत्रित करें", partnerSub: "लिंक साझा करें — शाम शुरू होगी", level: "लिंक"   },
  pt: { coupleTitle: "Compartilhar Touché",  coupleSub: "Enviar o link do app para um amigo",     partnerTitle: "Convidar seu parceiro", partnerSub: "Compartilhe o link — a noite começa", level: "Link" },
  es: { coupleTitle: "Compartir Touché",     coupleSub: "Enviar el enlace de la app a un amigo",  partnerTitle: "Invitar a tu pareja",  partnerSub: "Comparte el enlace — la noche comienza", level: "Enlace" },
};

const INVITE_MSG: Record<Lang, string> = {
  ru: "Присоединяйся ко мне в Touché — вечер для двоих 💕",
  en: "Join me on Touché — an evening for two 💕",
  hi: "Touché से जुड़ें — दो के लिए एक शाम 💕",
  pt: "Junte-se a mim no Touché — uma noite para dois 💕",
  es: "Únete a mí en Touché — una noche para dos 💕",
};

/* Scenario card with theatrical masks icon */
function ScenarioCard({ lang, onClick, index }: { lang: Lang; onClick: () => void; index: number }) {
  const r = 123, g = 94, b = 167;
  const color = `rgb(${r},${g},${b})`;
  const [pressed, setPressed] = useState(false);
  const [visible, setVisible] = useState(false);
  useEffect(() => { const tm = setTimeout(() => setVisible(true), index * 60 + 30); return () => clearTimeout(tm); }, [index]);

  return (
    <button
      onClick={onClick}
      onPointerDown={() => { setPressed(true); window.Telegram?.WebApp?.HapticFeedback?.impactOccurred("light"); }}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      style={{
        border:`1px solid rgba(${r},${g},${b},${pressed?0.30:0.15})`,
        borderRadius:20,padding:0,cursor:"pointer",textAlign:"left",
        width:"100%",position:"relative",overflow:"hidden",
        background:pressed?`rgba(${r},${g},${b},0.08)`:"#110810",
        opacity:visible?1:0,
        transform:visible?(pressed?"scale(0.985)":"scale(1)"):"translateY(12px)",
        transition:visible?"opacity .35s, transform .18s, border-color .18s, background .18s":"opacity .35s, transform .35s",
        flexShrink:0,
      }}
    >
      <div style={{ position:"absolute",inset:0,backgroundImage:"url(/images/cat-scenarios.png)",backgroundSize:"cover",backgroundPosition:"center",opacity:pressed?0.34:0.26,filter:"saturate(1.4) brightness(0.9)",transition:"opacity .18s" }} />
      <div style={{ position:"absolute",inset:0,background:`linear-gradient(90deg,#0d0610ee 0%,#0d061088 45%,transparent 100%)` }} />
      <div style={{ position:"absolute",inset:0,background:`linear-gradient(135deg,rgba(${r},${g},${b},0.10) 0%,transparent 60%)` }} />
      <div style={{ position:"absolute",top:0,left:0,right:0,height:1,background:`linear-gradient(90deg,transparent,rgba(${r},${g},${b},0.50),transparent)` }} />
      <div style={{ position:"absolute",left:0,top:0,bottom:0,width:3,background:`linear-gradient(180deg,rgba(${r},${g},${b},0.90),rgba(${r},${g},${b},0.20))`,borderRadius:"20px 0 0 20px" }} />

      <div style={{ padding:"17px 18px 17px 22px",display:"flex",alignItems:"center",gap:14,position:"relative" }}>
        <div style={{ width:44,height:44,borderRadius:"50%",flexShrink:0,background:`radial-gradient(circle at 35% 35%,rgba(${r},${g},${b},0.55),rgba(${r},${g},${b},0.15) 60%,transparent)`,border:`1px solid rgba(${r},${g},${b},0.32)`,boxShadow:`0 0 18px rgba(${r},${g},${b},0.18)`,display:"flex",alignItems:"center",justifyContent:"center" }}>
          {/* Star / theatrical icon */}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            style={{ filter:`drop-shadow(0 0 5px rgba(${r},${g},${b},0.95))`, display:"block" }}>
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
        </div>
        <div style={{ flex:1,minWidth:0 }}>
          <div style={{ fontSize:17,fontWeight:700,letterSpacing:"-0.3px",color:"rgba(255,238,248,0.96)",textShadow:"0 1px 8px rgba(0,0,0,0.6)" }}>{SCENARIO_LABELS[lang].title}</div>
          <div style={{ fontSize:12,color:"rgba(255,238,248,0.42)",marginTop:3 }}>{SCENARIO_LABELS[lang].sub}</div>
        </div>
        <div style={{ display:"flex",flexDirection:"column",alignItems:"flex-end",gap:5,flexShrink:0 }}>
          <div style={{ fontSize:10,fontWeight:700,letterSpacing:"0.6px",textTransform:"uppercase",color,textShadow:`0 0 12px rgba(${r},${g},${b},0.80)` }}>{SCENARIO_LABELS[lang].level}</div>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeOpacity="0.45" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </div>
      </div>
    </button>
  );
}

/* Invite / share card */
function InviteCard({ lang, onClick, coupled, index }: { lang: Lang; onClick: () => void; coupled: boolean; index: number }) {
  const [pressed, setPressed] = useState(false);
  const [visible, setVisible] = useState(false);
  useEffect(() => { const tm = setTimeout(() => setVisible(true), index * 60 + 30); return () => clearTimeout(tm); }, [index]);

  const r = 190, g = 30, b = 90;

  return (
    <button
      onClick={onClick}
      onPointerDown={() => { setPressed(true); window.Telegram?.WebApp?.HapticFeedback?.impactOccurred("light"); }}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      style={{
        border:`1px solid rgba(${r},${g},${b},${pressed?0.45:0.28})`,
        borderRadius:20,padding:0,cursor:"pointer",textAlign:"left",
        width:"100%",position:"relative",overflow:"hidden",
        background:pressed?`rgba(${r},${g},${b},0.12)`:`rgba(${r},${g},${b},0.06)`,
        opacity:visible?1:0,
        transform:visible?(pressed?"scale(0.985)":"scale(1)"):"translateY(12px)",
        transition:visible?"opacity .35s, transform .18s, border-color .18s, background .18s":"opacity .35s, transform .35s",
        flexShrink:0,
      }}
    >
      <div style={{ position:"absolute",top:0,left:0,right:0,height:1,background:`linear-gradient(90deg,transparent,rgba(${r},${g},${b},0.65),transparent)` }} />
      <div style={{ position:"absolute",left:0,top:0,bottom:0,width:3,background:`linear-gradient(180deg,rgba(${r},${g},${b},0.90),rgba(${r},${g},${b},0.20))`,borderRadius:"20px 0 0 20px" }} />

      <div style={{ padding:"16px 18px 16px 22px",display:"flex",alignItems:"center",gap:14,position:"relative" }}>
        <div style={{ width:44,height:44,borderRadius:"50%",flexShrink:0,background:`radial-gradient(circle at 35% 35%,rgba(${r},${g},${b},0.45),rgba(${r},${g},${b},0.10) 70%,transparent)`,border:`1px solid rgba(${r},${g},${b},0.38)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20 }}>
          {coupled ? "💌" : "💑"}
        </div>
        <div style={{ flex:1,minWidth:0 }}>
          <div style={{ fontSize:16,fontWeight:700,letterSpacing:"-0.2px",color:"rgba(255,238,248,0.92)" }}>
            {coupled ? INVITE_LABELS[lang].coupleTitle : INVITE_LABELS[lang].partnerTitle}
          </div>
          <div style={{ fontSize:12,color:`rgba(${r},${g},${b},0.70)`,marginTop:3,fontWeight:400 }}>
            {coupled ? INVITE_LABELS[lang].coupleSub : INVITE_LABELS[lang].partnerSub}
          </div>
        </div>
        <div style={{ flexShrink:0,display:"flex",flexDirection:"column",alignItems:"flex-end",gap:5 }}>
          <div style={{ fontSize:10,fontWeight:700,letterSpacing:"0.6px",textTransform:"uppercase",color:`rgb(${r},${g},${b})`,textShadow:`0 0 12px rgba(${r},${g},${b},0.80)` }}>
            {INVITE_LABELS[lang].level}
          </div>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={`rgb(${r},${g},${b})`} strokeOpacity="0.55" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </div>
      </div>
    </button>
  );
}

/* Main screen */
export default function Home({ lang, onCategorySelect, onScenarioOpen, onLangSwitch }: HomeProps) {
  const t = UI[lang];
  const [mounted, setMounted] = useState(false);
  const [vh, setVh] = useState<number | null>(null);
  const [coupled, setCoupled] = useState(false);
  const topPx = useTelegramTopInset();

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    tg?.ready(); tg?.expand();
    function updateVh() {
      const h = tg?.viewportStableHeight ?? tg?.viewportHeight;
      if (h && h > 100) setVh(h);
    }
    updateVh();
    tg?.onEvent?.("viewportChanged", updateVh);
    const tm = setTimeout(updateVh, 500);
    setCoupled(!!getCoupleId());
    requestAnimationFrame(() => setMounted(true));
    return () => { tg?.offEvent?.("viewportChanged", updateVh); clearTimeout(tm); };
  }, []);

  const handleInvite = useCallback(() => {
    const tg = window.Telegram?.WebApp;
    const uid = tg?.initDataUnsafe?.user?.id;
    tg?.HapticFeedback?.impactOccurred("light");
    if (tg?.openTelegramLink) {
      let link: string;
      if (coupled) {
        // Already in a couple — share plain app link (no ref_ param)
        link = `https://t.me/${BOT_USERNAME}/Touche`;
      } else {
        // Not yet coupled — share referral link to invite partner
        link = uid
          ? `https://t.me/${BOT_USERNAME}/Touche?startapp=ref_${uid}`
          : `https://t.me/${BOT_USERNAME}/Touche`;
      }
      const msg = INVITE_MSG[lang];
      tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(msg)}`);
    }
  }, [lang, coupled]);

  const height = vh ? `${vh}px` : "100dvh";

  return (
    <div style={{
      position:"fixed",inset:0,background:BG,
      display:"flex",flexDirection:"column",
      overflow:"hidden",height,
      opacity:mounted?1:0,transition:"opacity .28s ease",
      fontFamily:"'Plus Jakarta Sans','DM Sans',sans-serif",
    }}>
      {/* Ambient top glow */}
      <div style={{ position:"absolute",top:-120,left:"50%",transform:"translateX(-50%)", width:480,height:480,borderRadius:"50%", background:"radial-gradient(circle,rgba(200,32,114,0.09) 0%,transparent 70%)", pointerEvents:"none",zIndex:0 }} />

      {/* Header */}
      <div style={{
        paddingTop:topPx,paddingLeft:20,paddingRight:20,paddingBottom:14,
        display:"flex",alignItems:"center",justifyContent:"space-between",
        position:"relative",zIndex:1,flexShrink:0,
        borderBottom:"0.5px solid rgba(255,255,255,0.05)",
      }}>
        <div>
          <div style={{ fontSize:24,fontWeight:800,letterSpacing:"-0.8px",color:"rgba(255,238,248,0.96)",lineHeight:1 }}>{t.appName}</div>
          <div style={{ fontSize:12,color:"rgba(255,238,248,0.36)",marginTop:2,letterSpacing:"0.4px" }}>
            {t.chooseNow}
          </div>
        </div>

        <div style={{ display:"flex",alignItems:"center",gap:8 }}>
          {coupled && (
            <div style={{ background:"rgba(255,238,248,0.05)",border:"1px solid rgba(255,238,248,0.08)", borderRadius:20,padding:"5px 12px", fontSize:12,color:"rgba(255,238,248,0.50)", display:"flex",alignItems:"center",gap:5 }}>
              <span style={{ fontSize:14 }}>💑</span>
              {t.linked}
            </div>
          )}
          <button onClick={onLangSwitch} style={{
            background:"rgba(255,238,248,.06)",border:"1px solid rgba(255,238,248,.10)",
            borderRadius:14,cursor:"pointer",
            fontFamily:"'Plus Jakarta Sans','DM Sans',sans-serif",
            fontWeight:500,fontSize:10,letterSpacing:"0.10em",textTransform:"uppercase",
            color:"rgba(255,238,248,0.44)",padding:"7px 10px",flexShrink:0,
          }}>
            {LANG_ABBREV[LANG_CYCLE[(LANG_CYCLE.indexOf(lang) + 1) % LANG_CYCLE.length]]}
          </button>
        </div>
      </div>

      {/* Scrollable card list */}
      <div style={{
        flex:1,overflowY:"auto",overflowX:"hidden",
        padding:`12px 14px max(28px,env(safe-area-inset-bottom))`,
        display:"flex",flexDirection:"column",gap:9,
        position:"relative",zIndex:1,
        scrollbarWidth:"none",
      }}>
        {CATEGORIES_ORDER.map((cat, i) => (
          <CategoryCard key={cat} category={cat} lang={lang}
            onClick={() => onCategorySelect(cat)} index={i} />
        ))}
        <ScenarioCard lang={lang} onClick={onScenarioOpen} index={CATEGORIES_ORDER.length} />
        <InviteCard lang={lang} onClick={handleInvite} coupled={coupled} index={CATEGORIES_ORDER.length + 1} />
        <div style={{ textAlign:"center",fontSize:11,color:TEXT_T,paddingTop:6,letterSpacing:"0.3px" }}>
          {t.footerHint}
        </div>
      </div>
    </div>
  );
}
