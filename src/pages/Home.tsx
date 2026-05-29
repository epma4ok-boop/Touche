import { useEffect, useCallback, useState } from "react";
import { UI, CATEGORY_CONFIG, CATEGORIES_ORDER, LANG_CYCLE, type Lang, type Category } from "@/data/i18n";
import { BOT_USERNAME } from "@/config";

const BG = "#0d0610";
const TEXT_P = "rgba(255,238,248,0.88)";
const TEXT_S = "rgba(255,238,248,0.44)";
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

/* ── Single category card ── */
function CategoryCard({
  category, lang, onClick, index,
}: { category: Category; lang: Lang; onClick: () => void; index: number }) {
  const cfg = CATEGORY_CONFIG[category];
  const { r, g, b } = cfg;
  const color = `rgb(${r},${g},${b})`;
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
        <div style={{ width:44,height:44,borderRadius:"50%",flexShrink:0, background:`radial-gradient(circle at 35% 35%,rgba(${r},${g},${b},0.55),rgba(${r},${g},${b},0.15) 60%,transparent)`, border:`1px solid rgba(${r},${g},${b},0.32)`, boxShadow:`0 0 18px rgba(${r},${g},${b},0.18)`, display:"flex",alignItems:"center",justifyContent:"center" }}>
          <div style={{ width:14,height:14,borderRadius:"50%", background:`radial-gradient(circle at 35% 35%,${color},rgba(${r},${g},${b},0.70))`, boxShadow:`0 0 10px rgba(${r},${g},${b},0.70)` }} />
        </div>
        <div style={{ flex:1,minWidth:0 }}>
          <div style={{ fontSize:17,fontWeight:700,letterSpacing:"-0.3px", color:"rgba(255,238,248,0.96)", textShadow:"0 1px 8px rgba(0,0,0,0.6)", whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{lbl.main}</div>
          <div style={{ fontSize:12,color:"rgba(255,238,248,0.42)",marginTop:3, whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{lbl.sub}</div>
        </div>
        <div style={{ display:"flex",flexDirection:"column",alignItems:"flex-end",gap:5,flexShrink:0 }}>
          <div style={{ fontSize:10,fontWeight:700,letterSpacing:"0.6px",textTransform:"uppercase",color, textShadow:`0 0 12px rgba(${r},${g},${b},0.80)` }}>{level}</div>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeOpacity="0.45" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
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
  ru: { coupleTitle: "Пригласить друга",    coupleSub: "Поделиться ссылкой на Touché", partnerTitle: "Пригласить партнёра", partnerSub: "Поделись ссылкой — вечер начнётся", level: "Ссылка"  },
  en: { coupleTitle: "Invite a friend",     coupleSub: "Share the Touché link",         partnerTitle: "Invite your partner", partnerSub: "Share the link — the evening begins", level: "Link"    },
  hi: { coupleTitle: "मित्र को आमंत्रित करें", coupleSub: "Touché लिंक साझा करें",       partnerTitle: "साथी को आमंत्रित करें", partnerSub: "लिंक साझा करें — शाम शुरू होगी", level: "लिंक"   },
  pt: { coupleTitle: "Convidar um amigo",   coupleSub: "Compartilhar o link do Touché", partnerTitle: "Convidar seu parceiro", partnerSub: "Compartilhe o link — a noite começa", level: "Link" },
  es: { coupleTitle: "Invitar a un amigo",  coupleSub: "Compartir el enlace de Touché", partnerTitle: "Invitar a tu pareja",  partnerSub: "Comparte el enlace — la noche comienza", level: "Enlace" },
};

const INVITE_MSG: Record<Lang, string> = {
  ru: "Присоединяйся ко мне в Touché — вечер для двоих 💕",
  en: "Join me on Touché — an evening for two 💕",
  hi: "Touché से जुड़ें — दो के लिए एक शाम 💕",
  pt: "Junte-se a mim no Touché — uma noite para dois 💕",
  es: "Únete a mí en Touché — una noche para dos 💕",
};

/* ── Scenario card ── */
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
          <div style={{ width:14,height:14,borderRadius:"50%",background:`radial-gradient(circle at 35% 35%,${color},rgba(${r},${g},${b},0.70))`,boxShadow:`0 0 10px rgba(${r},${g},${b},0.70)` }} />
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

/* ── Invite banner card ── */
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
      {/* Top edge glow */}
      <div style={{ position:"absolute",top:0,left:0,right:0,height:1,background:`linear-gradient(90deg,transparent,rgba(${r},${g},${b},0.65),transparent)` }} />
      {/* Left bar */}
      <div style={{ position:"absolute",left:0,top:0,bottom:0,width:3,background:`linear-gradient(180deg,rgba(${r},${g},${b},0.90),rgba(${r},${g},${b},0.20))`,borderRadius:"20px 0 0 20px" }} />

      <div style={{ padding:"16px 18px 16px 22px",display:"flex",alignItems:"center",gap:14,position:"relative" }}>
        {/* Heart icon */}
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

/* ── Main screen ── */
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
    if (tg?.openTelegramLink && uid) {
      // Mini app deeplink format (same as ScenarioScreen)
      const link = `https://t.me/${BOT_USERNAME}/Touche?startapp=ref_${uid}`;
      const msg = INVITE_MSG[lang];
      tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(msg)}`);
    }
  }, [lang]);

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

        {/* Invite card — always visible */}
        <InviteCard lang={lang} onClick={handleInvite} coupled={coupled} index={CATEGORIES_ORDER.length + 1} />

        {/* Footer hint */}
        <div style={{ textAlign:"center",fontSize:11,color:TEXT_T,paddingTop:6,letterSpacing:"0.3px" }}>
          {t.footerHint}
        </div>
      </div>
    </div>
  );
}
