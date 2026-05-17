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

interface HomeProps {
  lang: Lang;
  onCategorySelect: (cat: Category) => void;
  onScenarioOpen: () => void;
}

const BOT_USERNAME = "ToucheBot";

// ── SVG icons ────────────────────────────────────────────────────────────────
function IconCompliments({ r, g, b, active }: { r:number; g:number; b:number; active:boolean }) {
  const a = active ? 0.75 : 0.50;
  return (
    <svg viewBox="0 0 44 44" fill="none" style={{ width: 44, height: 44 }}>
      <path d="M22 34C22 34 9 25.5 9 16a7 7 0 0 1 13-3.6A7 7 0 0 1 35 16c0 9.5-13 18-13 18z"
        fill={`rgba(${r},${g},${b},${active ? 0.14 : 0.07})`}
        stroke={`rgba(${r},${g},${b},${a})`} strokeWidth="1.6" strokeLinejoin="round"/>
      <circle cx="17" cy="16" r="1.5" fill={`rgba(${r},${g},${b},${a})`}/>
      <circle cx="22" cy="13.5" r="1.5" fill={`rgba(${r},${g},${b},${a})`}/>
      <circle cx="27" cy="16" r="1.5" fill={`rgba(${r},${g},${b},${a})`}/>
    </svg>
  );
}
function IconTenderness({ r, g, b, active }: { r:number; g:number; b:number; active:boolean }) {
  const a = active ? 0.75 : 0.50;
  return (
    <svg viewBox="0 0 44 44" fill="none" style={{ width: 44, height: 44 }}>
      <circle cx="16.5" cy="22" r="8.5" fill={`rgba(${r},${g},${b},${active?0.12:0.06})`} stroke={`rgba(${r},${g},${b},${a})`} strokeWidth="1.6"/>
      <circle cx="27.5" cy="22" r="8.5" fill={`rgba(${r},${g},${b},${active?0.12:0.06})`} stroke={`rgba(${r},${g},${b},${a})`} strokeWidth="1.6"/>
      <path d="M22 17.5 Q22 22 22 26.5" stroke={`rgba(${r},${g},${b},${a*0.6})`} strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
}
function IconDesire({ r, g, b, active }: { r:number; g:number; b:number; active:boolean }) {
  const a = active ? 0.75 : 0.50;
  return (
    <svg viewBox="0 0 44 44" fill="none" style={{ width: 44, height: 44 }}>
      <path d="M5 22C5 22 11.5 11 22 11C32.5 11 39 22 39 22C39 22 32.5 33 22 33C11.5 33 5 22 5 22Z"
        fill={`rgba(${r},${g},${b},${active?0.10:0.05})`} stroke={`rgba(${r},${g},${b},${a})`} strokeWidth="1.6" strokeLinejoin="round"/>
      <circle cx="22" cy="22" r="5.5" fill={`rgba(${r},${g},${b},${active?0.30:0.18})`} stroke={`rgba(${r},${g},${b},${a})`} strokeWidth="1.2"/>
      <circle cx="24" cy="20" r="1.6" fill={`rgba(${r},${g},${b},${a})`}/>
    </svg>
  );
}
function IconPassion({ r, g, b, active }: { r:number; g:number; b:number; active:boolean }) {
  const a = active ? 0.75 : 0.50;
  return (
    <svg viewBox="0 0 44 44" fill="none" style={{ width: 44, height: 44 }}>
      <path d="M6 18C6 18 14 8 22 8C30 8 38 18 38 18" stroke={`rgba(${r},${g},${b},${a})`} strokeWidth="2" strokeLinecap="round"/>
      <path d="M6 22C6 22 14 32 22 32C30 32 38 22 38 22" stroke={`rgba(${r},${g},${b},${a*0.7})`} strokeWidth="2" strokeLinecap="round"/>
      <path d="M6 26C6 26 14 36 22 36C30 36 38 26 38 26" stroke={`rgba(${r},${g},${b},${a*0.35})`} strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="22" cy="22" r="3.5" fill={`rgba(${r},${g},${b},${active?0.50:0.30})`}/>
    </svg>
  );
}
function IconHard({ r, g, b, active }: { r:number; g:number; b:number; active:boolean }) {
  const a = active ? 0.75 : 0.50;
  return (
    <svg viewBox="0 0 44 44" fill="none" style={{ width: 44, height: 44 }}>
      <rect x="6" y="17" width="12" height="10" rx="5" fill={`rgba(${r},${g},${b},${active?0.12:0.06})`} stroke={`rgba(${r},${g},${b},${a})`} strokeWidth="1.8"/>
      <rect x="26" y="17" width="12" height="10" rx="5" fill={`rgba(${r},${g},${b},${active?0.12:0.06})`} stroke={`rgba(${r},${g},${b},${a})`} strokeWidth="1.8"/>
      <line x1="18" y1="22" x2="26" y2="22" stroke={`rgba(${r},${g},${b},${a})`} strokeWidth="2" strokeLinecap="round"/>
      <circle cx="22" cy="22" r="2" fill={`rgba(${r},${g},${b},${active?0.55:0.30})`}/>
    </svg>
  );
}

const CATEGORY_ICONS: Record<Category, typeof IconCompliments> = {
  compliments: IconCompliments, tenderness: IconTenderness,
  desire: IconDesire, passion: IconPassion, hard: IconHard,
};

// ── Category band ────────────────────────────────────────────────────────────
function CategoryBand({ category, lang, onClick, index }: { category:Category; lang:Lang; onClick:()=>void; index:number }) {
  const cfg = CATEGORY_CONFIG[category];
  const { r, g, b } = cfg;
  const t = UI[lang];
  const [pressed, setPressed] = useState(false);
  const [visible, setVisible] = useState(false);
  useEffect(() => { const tm = setTimeout(() => setVisible(true), index * 65 + 80); return () => clearTimeout(tm); }, [index]);
  const Icon = CATEGORY_ICONS[category];
  const labels: Record<Category,{main:string;sub:string}> = {
    compliments:{main:t.catCompliments,sub:t.catComplimentsSub},
    tenderness: {main:t.catTenderness, sub:t.catTendernessSub},
    desire:     {main:t.catDesire,     sub:t.catDesireSub},
    passion:    {main:t.catPassion,    sub:t.catPassionSub},
    hard:       {main:t.catHard,       sub:t.catHardSub},
  };
  const lbl = labels[category];
  return (
    <button onClick={onClick}
      onMouseEnter={()=>setPressed(true)} onMouseLeave={()=>setPressed(false)}
      onTouchStart={()=>setPressed(true)} onTouchEnd={()=>setPressed(false)}
      style={{ position:"relative",width:"100%",background:pressed?`rgba(${r},${g},${b},0.07)`:"transparent",border:"none",borderBottom:"0.5px solid rgba(40,30,50,0.07)",cursor:"pointer",display:"flex",alignItems:"center",flex:1,minHeight:0,overflow:"hidden",transition:"background 0.2s,opacity 0.4s,transform 0.4s",opacity:visible?1:0,transform:visible?"translateX(0)":"translateX(-18px)" }}>
      <div style={{ width:pressed?5:3,alignSelf:"stretch",flexShrink:0,background:`linear-gradient(to bottom,rgba(${r},${g},${b},0),rgba(${r},${g},${b},${pressed?0.90:0.50}),rgba(${r},${g},${b},0))`,transition:"width 0.2s",borderRadius:"0 2px 2px 0" }} />
      <div style={{ flexShrink:0,width:54,height:54,display:"flex",alignItems:"center",justifyContent:"center",marginLeft:14,background:`rgba(${r},${g},${b},${pressed?0.10:0.05})`,borderRadius:16,transition:"background 0.2s,transform 0.2s",transform:pressed?"scale(1.07)":"scale(1)",border:`1px solid rgba(${r},${g},${b},${pressed?0.20:0.09})` }}>
        <Icon r={r} g={g} b={b} active={pressed} />
      </div>
      <div style={{ flex:1,display:"flex",flexDirection:"column",alignItems:"flex-start",justifyContent:"center",padding:"0 12px 0 16px",position:"relative",zIndex:2 }}>
        <p style={{ fontFamily:"'Plus Jakarta Sans','DM Sans',sans-serif",fontWeight:600,fontSize:"clamp(20px,5.2vw,28px)",color:pressed?`rgb(${r},${g},${b})`:"rgba(40,30,50,0.85)",letterSpacing:"-0.02em",margin:0,lineHeight:1.15,transition:"color 0.2s" }}>
          {lbl.main}
          {cfg.paid && <span style={{ fontFamily:"'Plus Jakarta Sans','DM Sans',sans-serif",fontWeight:400,fontSize:9,letterSpacing:"0.14em",textTransform:"uppercase",color:`rgba(${r},${g},${b},0.55)`,marginLeft:9,verticalAlign:"middle" }}>18+</span>}
        </p>
        <p style={{ fontFamily:"'Plus Jakarta Sans','DM Sans',sans-serif",fontWeight:300,fontSize:"clamp(9px,2.2vw,12px)",letterSpacing:"0.13em",textTransform:"uppercase",color:`rgba(${r},${g},${b},${pressed?0.65:0.42})`,margin:"4px 0 0",transition:"color 0.2s" }}>{lbl.sub}</p>
      </div>
      <div style={{ flexShrink:0,padding:"0 20px 0 0",zIndex:2 }}>
        {cfg.paid ? (
          <div style={{ padding:"4px 10px",borderRadius:8,border:`1px solid rgba(${r},${g},${b},${pressed?0.45:0.18})`,background:`rgba(${r},${g},${b},0.06)`,transition:"all 0.2s" }}>
            <span style={{ fontFamily:"'Plus Jakarta Sans','DM Sans',sans-serif",fontWeight:400,fontSize:9,letterSpacing:"0.16em",textTransform:"uppercase",color:`rgba(${r},${g},${b},${pressed?0.72:0.42})` }}>18+</span>
          </div>
        ) : (
          <span style={{ opacity:pressed?0.72:0.24,fontSize:22,fontWeight:300,color:`rgb(${r},${g},${b})`,display:"block",transition:"opacity 0.2s,transform 0.2s",transform:pressed?"translateX(4px)":"translateX(0)" }}>›</span>
        )}
      </div>
    </button>
  );
}

// ── Scenario band (separate block below categories) ──────────────────────────
function ScenarioBand({ lang, onClick, index }: { lang:Lang; onClick:()=>void; index:number }) {
  const [pressed, setPressed] = useState(false);
  const [visible, setVisible] = useState(false);
  useEffect(() => { const tm = setTimeout(() => setVisible(true), index * 65 + 80); return () => clearTimeout(tm); }, [index]);
  const r=155, g=15, b=90;
  const label = lang === "en" ? "Scenarios" : "Сценарии";
  const sub   = lang === "en" ? "roleplay · for two · 18+" : "ролевые · на двоих · 18+";
  return (
    <button onClick={onClick}
      onMouseEnter={()=>setPressed(true)} onMouseLeave={()=>setPressed(false)}
      onTouchStart={()=>setPressed(true)} onTouchEnd={()=>setPressed(false)}
      style={{ position:"relative",width:"100%",background:pressed?`rgba(${r},${g},${b},0.08)`:`rgba(${r},${g},${b},0.03)`,border:"none",borderTop:"0.5px solid rgba(40,30,50,0.08)",cursor:"pointer",display:"flex",alignItems:"center",minHeight:72,overflow:"hidden",transition:"background 0.2s,opacity 0.45s,transform 0.45s",opacity:visible?1:0,transform:visible?"translateY(0)":"translateY(14px)" }}>
      {/* gradient left bar */}
      <div style={{ width:pressed?5:3,alignSelf:"stretch",flexShrink:0,background:`linear-gradient(to bottom,rgba(${r},${g},${b},0),rgba(${r},${g},${b},${pressed?0.95:0.55}),rgba(${r},${g},${b},0))`,transition:"width 0.2s",borderRadius:"0 2px 2px 0" }} />
      {/* icon — two masks */}
      <div style={{ flexShrink:0,width:54,height:54,display:"flex",alignItems:"center",justifyContent:"center",marginLeft:14,background:`rgba(${r},${g},${b},${pressed?0.14:0.07})`,borderRadius:16,transition:"background 0.2s,transform 0.2s",transform:pressed?"scale(1.07)":"scale(1)",border:`1px solid rgba(${r},${g},${b},${pressed?0.28:0.12})` }}>
        <svg viewBox="0 0 44 44" fill="none" style={{ width:44,height:44 }}>
          {/* mask left (comedy) */}
          <ellipse cx="16" cy="22" rx="9" ry="11" fill={`rgba(${r},${g},${b},${pressed?0.18:0.09})`} stroke={`rgba(${r},${g},${b},${pressed?0.75:0.50})`} strokeWidth="1.6"/>
          <path d="M12 24 Q16 28 20 24" stroke={`rgba(${r},${g},${b},${pressed?0.75:0.50})`} strokeWidth="1.4" strokeLinecap="round" fill="none"/>
          <circle cx="14" cy="19" r="1.3" fill={`rgba(${r},${g},${b},${pressed?0.75:0.50})`}/>
          <circle cx="18" cy="19" r="1.3" fill={`rgba(${r},${g},${b},${pressed?0.75:0.50})`}/>
          {/* mask right (tragedy) */}
          <ellipse cx="28" cy="22" rx="9" ry="11" fill={`rgba(${r},${g},${b},${pressed?0.14:0.06})`} stroke={`rgba(${r},${g},${b},${pressed?0.55:0.35})`} strokeWidth="1.4"/>
          <path d="M24 27 Q28 23 32 27" stroke={`rgba(${r},${g},${b},${pressed?0.55:0.35})`} strokeWidth="1.3" strokeLinecap="round" fill="none"/>
          <circle cx="26" cy="19" r="1.2" fill={`rgba(${r},${g},${b},${pressed?0.55:0.35})`}/>
          <circle cx="30" cy="19" r="1.2" fill={`rgba(${r},${g},${b},${pressed?0.55:0.35})`}/>
        </svg>
      </div>
      {/* text */}
      <div style={{ flex:1,display:"flex",flexDirection:"column",alignItems:"flex-start",justifyContent:"center",padding:"0 12px 0 16px" }}>
        <p style={{ fontFamily:"'Plus Jakarta Sans','DM Sans',sans-serif",fontWeight:700,fontSize:"clamp(20px,5.2vw,28px)",color:pressed?`rgb(${r},${g},${b})`:"rgba(40,30,50,0.85)",letterSpacing:"-0.02em",margin:0,lineHeight:1.15,transition:"color 0.2s" }}>
          {label}
          <span style={{ fontFamily:"'Plus Jakarta Sans','DM Sans',sans-serif",fontWeight:400,fontSize:9,letterSpacing:"0.14em",textTransform:"uppercase",color:`rgba(${r},${g},${b},0.55)`,marginLeft:9,verticalAlign:"middle" }}>18+</span>
        </p>
        <p style={{ fontFamily:"'Plus Jakarta Sans','DM Sans',sans-serif",fontWeight:300,fontSize:"clamp(9px,2.2vw,12px)",letterSpacing:"0.13em",textTransform:"uppercase",color:`rgba(${r},${g},${b},${pressed?0.65:0.42})`,margin:"4px 0 0",transition:"color 0.2s" }}>{sub}</p>
      </div>
      {/* NEW badge */}
      <div style={{ flexShrink:0,padding:"0 20px 0 0" }}>
        <div style={{ padding:"4px 10px",borderRadius:8,border:`1px solid rgba(${r},${g},${b},${pressed?0.55:0.22})`,background:`rgba(${r},${g},${b},${pressed?0.14:0.07})`,transition:"all 0.2s" }}>
          <span style={{ fontFamily:"'Plus Jakarta Sans','DM Sans',sans-serif",fontWeight:500,fontSize:9,letterSpacing:"0.18em",textTransform:"uppercase",color:`rgba(${r},${g},${b},${pressed?0.90:0.55})` }}>NEW</span>
        </div>
      </div>
    </button>
  );
}

// ── Toast ────────────────────────────────────────────────────────────────────
function Toast({ visible, text }: { visible:boolean; text:string }) {
  return (
    <div style={{ position:"absolute",top:64,left:"50%",transform:`translateX(-50%) translateY(${visible?0:-8}px)`,zIndex:60,pointerEvents:"none",opacity:visible?1:0,transition:"opacity 0.4s,transform 0.4s",background:"rgba(255,252,248,0.98)",border:"1px solid rgba(200,100,160,0.22)",boxShadow:"0 4px 40px rgba(0,0,0,0.10)",borderRadius:14,padding:"11px 20px",whiteSpace:"nowrap",backdropFilter:"blur(20px)" }}>
      <span style={{ fontFamily:"'Plus Jakarta Sans','DM Sans',sans-serif",fontWeight:500,fontSize:15,color:"rgba(40,30,50,0.85)" }}>{text}</span>
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function Home({ lang, onCategorySelect, onScenarioOpen }: HomeProps) {
  const t = UI[lang];
  const [inviteToast, setInviteToast] = useState(false);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.ready(); tg.expand();
      const sp = tg.initDataUnsafe?.start_param;
      if (sp?.startsWith("ref_")) { setInviteToast(true); setTimeout(() => setInviteToast(false), 3500); }
    }
  }, []);

  const handleInvite = useCallback(() => {
    const tg = window.Telegram?.WebApp;
    const userId = tg?.initDataUnsafe?.user?.id;
    if (tg?.openTelegramLink && userId) {
      tg.openTelegramLink(`https://t.me/share/url?url=https://t.me/${BOT_USERNAME}?start=ref_${userId}&text=${encodeURIComponent(t.inviteText)}`);
    }
  }, [t.inviteText]);

  return (
    <div style={{ position:"fixed",inset:0,background:"#fdf8f5",display:"flex",flexDirection:"column",overflow:"hidden" }}>
      <div style={{ position:"absolute",top:0,left:0,right:0,height:180,background:"linear-gradient(to bottom,rgba(220,130,185,0.07) 0%,rgba(253,248,245,0) 100%)",pointerEvents:"none",zIndex:0 }} />

      {/* Header */}
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"18px 22px 14px",flexShrink:0,position:"relative",zIndex:2 }}>
        <div style={{ display:"flex",alignItems:"center",gap:10 }}>
          <svg viewBox="0 0 24 24" fill="none" style={{ width:22,height:22 }}>
            <path d="M12 20C12 20 3 14 3 8a5 5 0 0 1 9-3A5 5 0 0 1 21 8c0 6-9 12-9 12z" fill="rgba(162,18,55,0.18)" stroke="rgba(162,18,55,0.70)" strokeWidth="1.5" strokeLinejoin="round"/>
          </svg>
          <p style={{ fontFamily:"'Plus Jakarta Sans','DM Sans',sans-serif",fontWeight:700,fontSize:22,color:"rgba(40,30,50,0.88)",letterSpacing:"-0.03em",margin:0 }}>Touché</p>
        </div>
        <button onClick={handleInvite} style={{ background:"rgba(220,110,170,0.08)",border:"1px solid rgba(220,110,170,0.18)",borderRadius:99,padding:"8px 18px",cursor:"pointer",fontFamily:"'Plus Jakarta Sans','DM Sans',sans-serif",fontWeight:400,fontSize:11,letterSpacing:"0.08em",textTransform:"uppercase",color:"rgba(40,30,50,0.42)" }}>
          {t.invite}
        </button>
      </div>
      <div style={{ height:"0.5px",background:"linear-gradient(to right,transparent,rgba(220,110,170,0.18),transparent)",flexShrink:0,position:"relative",zIndex:2 }} />

      {/* Category bands */}
      <div style={{ flex:1,display:"flex",flexDirection:"column",position:"relative",zIndex:2,minHeight:0 }}>
        {CATEGORIES_ORDER.map((cat,i) => (
          <CategoryBand key={cat} category={cat} lang={lang} onClick={() => onCategorySelect(cat)} index={i} />
        ))}
        {/* Scenario block — sits below the 5 bands */}
        <ScenarioBand lang={lang} onClick={onScenarioOpen} index={CATEGORIES_ORDER.length} />
      </div>

      {/* Footer */}
      <div style={{ flexShrink:0,position:"relative",zIndex:2,padding:"10px 0 max(16px,env(safe-area-inset-bottom))",textAlign:"center" }}>
        <p style={{ fontFamily:"'Plus Jakarta Sans','DM Sans',sans-serif",fontWeight:300,fontSize:10,letterSpacing:"0.20em",textTransform:"uppercase",color:"rgba(40,30,50,0.16)",margin:0 }}>{t.footerHint}</p>
      </div>

      <Toast visible={inviteToast} text={t.inviteBonus} />
    </div>
  );
}
