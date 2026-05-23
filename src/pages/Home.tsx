import { useEffect, useCallback, useState } from "react";
import { UI, CATEGORY_CONFIG, CATEGORIES_ORDER, type Lang, type Category } from "@/data/i18n";
import { BOT_USERNAME } from "@/config";

declare global {
  interface Window {
    Telegram?: { WebApp: {
      ready:()=>void; expand:()=>void;
      viewportHeight?:number; viewportStableHeight?:number;
      HapticFeedback?:{impactOccurred:(s:string)=>void};
      initDataUnsafe?:{user?:{username?:string;id?:number};start_param?:string};
      initData?:string;
      openTelegramLink?:(url:string)=>void;
      onEvent?:(e:string,cb:()=>void)=>void;
      offEvent?:(e:string,cb:()=>void)=>void;
      colorScheme?:"light"|"dark";
    }};
  }
}

interface HomeProps { lang:Lang; onCategorySelect:(cat:Category)=>void; onScenarioOpen:()=>void; }

// ── Icons — 5 completely different, elegant ──────────────────────────────────

// Compliments: love letter / envelope with heart
function IconCompliments({ r,g,b,active }: {r:number;g:number;b:number;active:boolean}) {
  const a = active ? .80 : .50;
  return (
    <svg viewBox="0 0 44 44" fill="none" style={{width:44,height:44}}>
      <rect x="7" y="13" width="30" height="20" rx="3"
        fill={`rgba(${r},${g},${b},${active?.14:.07})`}
        stroke={`rgba(${r},${g},${b},${a})`} strokeWidth="1.5"/>
      <path d="M7 16 L22 25 L37 16"
        stroke={`rgba(${r},${g},${b},${a})`} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      <path d="M22 30 C22 30 18 27.5 18 25.5 A2 2 0 0 1 22 24.2 A2 2 0 0 1 26 25.5 C26 27.5 22 30 22 30 Z"
        fill={`rgba(${r},${g},${b},${active?.70:.38})`}/>
    </svg>
  );
}

// Tenderness: feather — softness and delicacy
function IconTenderness({ r,g,b,active }: {r:number;g:number;b:number;active:boolean}) {
  const a = active ? .80 : .50;
  return (
    <svg viewBox="0 0 44 44" fill="none" style={{width:44,height:44}}>
      <path d="M34 9 C34 9 14 18 10 35"
        stroke={`rgba(${r},${g},${b},${a})`} strokeWidth="1.4" strokeLinecap="round" fill="none"/>
      <path d="M34 9 C38 14, 36 22, 30 27 C24 32, 14 33, 10 35 C14 28, 20 20, 26 16 C30 13, 33 10, 34 9 Z"
        fill={`rgba(${r},${g},${b},${active?.16:.08})`}
        stroke={`rgba(${r},${g},${b},${a})`} strokeWidth="1.4" strokeLinejoin="round"/>
      <path d="M28 14 C24 18, 20 22, 15 28" stroke={`rgba(${r},${g},${b},${a*.5})`} strokeWidth=".9" strokeLinecap="round" fill="none"/>
      <path d="M31 18 C27 22, 23 25, 18 30" stroke={`rgba(${r},${g},${b},${a*.4})`} strokeWidth=".9" strokeLinecap="round" fill="none"/>
      <path d="M32 22 C29 25, 26 28, 22 32" stroke={`rgba(${r},${g},${b},${a*.3})`} strokeWidth=".9" strokeLinecap="round" fill="none"/>
    </svg>
  );
}

// Desire: elegant flame — want and yearning
function IconDesire({ r,g,b,active }: {r:number;g:number;b:number;active:boolean}) {
  const a = active ? .80 : .50;
  return (
    <svg viewBox="0 0 44 44" fill="none" style={{width:44,height:44}}>
      <path d="M22 8 C22 8 28 14 27 20 C26 24 24 25 24 25 C24 25 30 22 29 16 C29 16 33 22 32 28 C31 33 27 36 22 36 C17 36 12 33 12 28 C12 22 16 18 16 18 C16 18 14 24 17 27 C17 27 15 23 18 20 C18 20 16 14 22 8 Z"
        fill={`rgba(${r},${g},${b},${active?.20:.09})`}
        stroke={`rgba(${r},${g},${b},${a})`} strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M22 18 C22 18 25 22 24 26 C23.5 28 22 29 22 29 C22 29 19 28 19 26 C19 22 22 18 22 18 Z"
        fill={`rgba(${r},${g},${b},${active?.55:.28})`}/>
    </svg>
  );
}

// Passion: lips — the classic sensual symbol
function IconPassion({ r,g,b,active }: {r:number;g:number;b:number;active:boolean}) {
  const a = active ? .80 : .50;
  return (
    <svg viewBox="0 0 44 44" fill="none" style={{width:44,height:44}}>
      <path d="M9 21 C9 21 14 14 18.5 16 C20 16.5 21 17.5 22 17.5 C23 17.5 24 16.5 25.5 16 C30 14 35 21 35 21"
        fill={`rgba(${r},${g},${b},${active?.18:.08})`}
        stroke={`rgba(${r},${g},${b},${a})`} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M18 18 C20 20 22 19 22 18 C22 19 24 20 26 18"
        stroke={`rgba(${r},${g},${b},${a*.6})`} strokeWidth="1" strokeLinecap="round" fill="none"/>
      <path d="M9 21 C9 21 13 29 22 29 C31 29 35 21 35 21"
        fill={`rgba(${r},${g},${b},${active?.25:.12})`}
        stroke={`rgba(${r},${g},${b},${a})`} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M15 26 C18 28 26 28 29 26"
        stroke={`rgba(${r},${g},${b},${active?.50:.25})`} strokeWidth="2" strokeLinecap="round" fill="none"/>
      <path d="M9 21 Q22 22.5 35 21"
        stroke={`rgba(${r},${g},${b},${a*.75})`} strokeWidth="1" strokeLinecap="round" fill="none"/>
    </svg>
  );
}

// Hard: handcuffs — bold and direct
function IconHard({ r,g,b,active }: {r:number;g:number;b:number;active:boolean}) {
  const a = active ? .80 : .50;
  return (
    <svg viewBox="0 0 44 44" fill="none" style={{width:44,height:44}}>
      <circle cx="14" cy="22" r="7"
        fill={`rgba(${r},${g},${b},${active?.14:.06})`}
        stroke={`rgba(${r},${g},${b},${a})`} strokeWidth="2"/>
      <circle cx="14" cy="22" r="3.5"
        fill={`rgba(${r},${g},${b},${active?.35:.16})`}/>
      <circle cx="30" cy="22" r="7"
        fill={`rgba(${r},${g},${b},${active?.14:.06})`}
        stroke={`rgba(${r},${g},${b},${a})`} strokeWidth="2"/>
      <circle cx="30" cy="22" r="3.5"
        fill={`rgba(${r},${g},${b},${active?.35:.16})`}/>
      <path d="M21 20 C21 20 22 18 23 20 C24 22 23 24 22 24 C21 24 20 22 21 20 Z"
        fill={`rgba(${r},${g},${b},${active?.60:.32})`}
        stroke={`rgba(${r},${g},${b},${a})`} strokeWidth=".8"/>
      <line x1="21" y1="22" x2="23" y2="22" stroke={`rgba(${r},${g},${b},${a*.7})`} strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
}

const ICONS: Record<Category, typeof IconCompliments> = {
  compliments:IconCompliments, tenderness:IconTenderness,
  desire:IconDesire, passion:IconPassion, hard:IconHard,
};

// ── Category row ─────────────────────────────────────────────────────────────
function CategoryRow({ category,lang,onClick,index }: {category:Category;lang:Lang;onClick:()=>void;index:number}) {
  const cfg = CATEGORY_CONFIG[category]; const {r,g,b}=cfg; const t=UI[lang];
  const [pressed,setPressed]=useState(false);
  const [visible,setVisible]=useState(false);
  useEffect(()=>{ const tm=setTimeout(()=>setVisible(true),index*55+50); return()=>clearTimeout(tm); },[index]);
  const Icon = ICONS[category];

  const labels: Record<Category,{main:string;sub:string}> = {
    compliments:{main:t.catCompliments,sub:t.catComplimentsSub},
    tenderness: {main:t.catTenderness, sub:t.catTendernessSub},
    desire:     {main:t.catDesire,     sub:t.catDesireSub},
    passion:    {main:t.catPassion,    sub:t.catPassionSub},
    hard:       {main:t.catHard,       sub:t.catHardSub},
  };
  const lbl = labels[category];

  return (
    <button
      onClick={onClick}
      onPointerDown={()=>setPressed(true)}
      onPointerUp={()=>setPressed(false)}
      onPointerLeave={()=>setPressed(false)}
      style={{
        width:"100%", background:pressed?`rgba(${r},${g},${b},.08)`:"transparent",
        border:"none", borderBottom:"0.5px solid rgba(40,30,50,.07)",
        cursor:"pointer", display:"flex", alignItems:"center",
        flex:"1 1 0", minHeight:0,
        transition:"background .15s, opacity .4s, transform .4s",
        opacity:visible?1:0, transform:visible?"translateX(0)":"translateX(-14px)",
        padding:0, textAlign:"left",
      }}
    >
      {/* Accent bar */}
      <div style={{width:pressed?5:3,alignSelf:"stretch",flexShrink:0,
        background:`linear-gradient(to bottom,rgba(${r},${g},${b},0),rgba(${r},${g},${b},${pressed?.88:.48}),rgba(${r},${g},${b},0))`,
        transition:"width .15s",borderRadius:"0 2px 2px 0"}}/>

      {/* Icon */}
      <div style={{flexShrink:0,width:52,height:52,display:"flex",alignItems:"center",justifyContent:"center",
        marginLeft:14,
        background:`rgba(${r},${g},${b},${pressed?.12:.06})`,
        borderRadius:16,
        transition:"background .15s,transform .15s",
        transform:pressed?"scale(1.05)":"scale(1)",
        border:`1px solid rgba(${r},${g},${b},${pressed?.22:.10})`}}>
        <Icon r={r} g={g} b={b} active={pressed}/>
      </div>

      {/* Text */}
      <div style={{flex:1,display:"flex",flexDirection:"column",justifyContent:"center",padding:"0 10px 0 14px"}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontWeight:600,
            fontSize:"clamp(18px,4.8vw,26px)",
            color:pressed?`rgb(${r},${g},${b})`:"rgba(40,30,50,.86)",
            letterSpacing:"-0.022em",lineHeight:1.15,transition:"color .15s"}}>
            {lbl.main}
          </span>
          {cfg.paid && <span style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontWeight:400,fontSize:9,
            letterSpacing:"0.14em",textTransform:"uppercase",
            color:`rgba(${r},${g},${b},.52)`,flexShrink:0}}>18+</span>}
        </div>
        <span style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontWeight:300,
          fontSize:"clamp(9px,2vw,11px)",letterSpacing:"0.14em",textTransform:"uppercase",
          color:`rgba(${r},${g},${b},${pressed?.65:.40})`,marginTop:3,
          transition:"color .15s"}}>
          {lbl.sub}
        </span>
      </div>

      {/* Right badge */}
      <div style={{flexShrink:0,paddingRight:18}}>
        {cfg.paid ? (
          <div style={{padding:"4px 10px",borderRadius:8,
            border:`1px solid rgba(${r},${g},${b},${pressed?.42:.18})`,
            background:`rgba(${r},${g},${b},.06)`,
            fontFamily:"'Plus Jakarta Sans',sans-serif",fontWeight:500,fontSize:10,
            letterSpacing:"0.12em",textTransform:"uppercase",
            color:`rgba(${r},${g},${b},${pressed?.80:.52})`,
            transition:"all .15s"}}>★</div>
        ) : (
          <svg viewBox="0 0 16 16" width="14" height="14" fill="none">
            <path d="M6 4 L10 8 L6 12" stroke={`rgba(${r},${g},${b},${pressed?.58:.28})`}
              strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </div>
    </button>
  );
}

// ── Scenario row ──────────────────────────────────────────────────────────────
function ScenarioRow({ lang, onClick, index }: {lang:Lang;onClick:()=>void;index:number}) {
  const [pressed,setPressed]=useState(false);
  const [visible,setVisible]=useState(false);
  const r=155,g=15,b=90;
  useEffect(()=>{ const tm=setTimeout(()=>setVisible(true),index*55+50); return()=>clearTimeout(tm); },[index]);

  return (
    <button
      onClick={onClick}
      onPointerDown={()=>setPressed(true)}
      onPointerUp={()=>setPressed(false)}
      onPointerLeave={()=>setPressed(false)}
      style={{
        width:"100%",background:pressed?`rgba(${r},${g},${b},.08)`:"transparent",
        border:"none",borderBottom:"0.5px solid rgba(40,30,50,.07)",
        cursor:"pointer",display:"flex",alignItems:"center",
        flex:"1 1 0",minHeight:0,
        transition:"background .15s,opacity .4s,transform .4s",
        opacity:visible?1:0,transform:visible?"translateX(0)":"translateX(-14px)",
        padding:0,textAlign:"left",
      }}
    >
      <div style={{width:pressed?5:3,alignSelf:"stretch",flexShrink:0,
        background:`linear-gradient(to bottom,rgba(${r},${g},${b},0),rgba(${r},${g},${b},${pressed?.88:.48}),rgba(${r},${g},${b},0))`,
        transition:"width .15s",borderRadius:"0 2px 2px 0"}}/>
      <div style={{flexShrink:0,width:52,height:52,display:"flex",alignItems:"center",justifyContent:"center",
        marginLeft:14,
        background:`rgba(${r},${g},${b},${pressed?.12:.06})`,
        borderRadius:16,border:`1px solid rgba(${r},${g},${b},${pressed?.22:.10})`,
        transition:"background .15s,transform .15s",transform:pressed?"scale(1.05)":"scale(1)"}}>
        <svg viewBox="0 0 44 44" fill="none" width="44" height="44">
          <rect x="10" y="13" width="18" height="22" rx="3"
            fill={`rgba(${r},${g},${b},${pressed?.14:.07})`}
            stroke={`rgba(${r},${g},${b},${pressed?.80:.50})`} strokeWidth="1.5"/>
          <rect x="16" y="9" width="18" height="22" rx="3"
            fill={`rgba(${r},${g},${b},${pressed?.18:.09})`}
            stroke={`rgba(${r},${g},${b},${pressed?.80:.50})`} strokeWidth="1.5"/>
          <path d="M20 17 L30 17 M20 21 L27 21"
            stroke={`rgba(${r},${g},${b},${pressed?.60:.35})`} strokeWidth="1.3" strokeLinecap="round"/>
        </svg>
      </div>
      <div style={{flex:1,display:"flex",flexDirection:"column",justifyContent:"center",padding:"0 10px 0 14px"}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontWeight:600,
            fontSize:"clamp(18px,4.8vw,26px)",
            color:pressed?`rgb(${r},${g},${b})`:"rgba(40,30,50,.86)",
            letterSpacing:"-0.022em",lineHeight:1.15,transition:"color .15s"}}>
            {lang==="ru"?"Сценарии":"Scenarios"}
          </span>
          <span style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontWeight:400,fontSize:9,
            letterSpacing:"0.14em",textTransform:"uppercase",color:`rgba(${r},${g},${b},.52)`}}>
            18+
          </span>
        </div>
        <span style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontWeight:300,
          fontSize:"clamp(9px,2vw,11px)",letterSpacing:"0.14em",textTransform:"uppercase",
          color:`rgba(${r},${g},${b},${pressed?.65:.40})`,marginTop:3}}>
          {lang==="ru"?"ролевые · на двоих":"roleplay · for two"}
        </span>
      </div>
      <div style={{flexShrink:0,paddingRight:18}}>
        <div style={{padding:"4px 10px",borderRadius:8,
          border:`1px solid rgba(${r},${g},${b},${pressed?.42:.18})`,
          background:`rgba(${r},${g},${b},.06)`,
          fontFamily:"'Plus Jakarta Sans',sans-serif",fontWeight:600,fontSize:9,
          letterSpacing:"0.14em",textTransform:"uppercase",
          color:`rgba(${r},${g},${b},${pressed?.80:.52})`,
          transition:"all .15s"}}>NEW</div>
      </div>
    </button>
  );
}

// ── Home ─────────────────────────────────────────────────────────────────────
export default function Home({ lang,onCategorySelect,onScenarioOpen }: HomeProps) {
  const t = UI[lang];
  const [mounted,setMounted]=useState(false);
  const [vh,setVh]=useState<number|null>(null);

  useEffect(()=>{
    const tg=window.Telegram?.WebApp;
    tg?.ready(); tg?.expand();
    requestAnimationFrame(()=>setMounted(true));
    function updateVh(){ const h=tg?.viewportStableHeight??tg?.viewportHeight; if(h) setVh(h); }
    updateVh();
    tg?.onEvent?.("viewportChanged",updateVh);
    return()=>tg?.offEvent?.("viewportChanged",updateVh);
  },[]);

  const handleInvite=useCallback(()=>{
    const tg=window.Telegram?.WebApp;
    const uid=tg?.initDataUnsafe?.user?.id;
    if (tg?.openTelegramLink&&uid) {
      tg.openTelegramLink(`https://t.me/share/url?url=https://t.me/${BOT_USERNAME}?start=ref_${uid}&text=${encodeURIComponent(t.inviteText)}`);
    }
    tg?.HapticFeedback?.impactOccurred("light");
  },[t.inviteText]);

  const height=vh?`${vh}px`:"100dvh";

  return (
    <div style={{position:"fixed",inset:0,background:"#fdf8f5",display:"flex",flexDirection:"column",
      overflow:"hidden",height,
      opacity:mounted?1:0,transition:"opacity .28s ease"}}>

      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
        padding:"max(12px,env(safe-area-inset-top)) 20px 10px",
        flexShrink:0,borderBottom:"0.5px solid rgba(40,30,50,.06)"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
            <path d="M12 20 C12 20 3 13 3 7.5 A4.5 4.5 0 0 1 12 5.2 A4.5 4.5 0 0 1 21 7.5 C21 13 12 20 12 20 Z"
              fill="rgba(190,30,90,.18)" stroke="rgba(190,30,90,.70)" strokeWidth="1.5" strokeLinejoin="round"/>
          </svg>
          <p style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontWeight:700,fontSize:24,
            letterSpacing:"-0.03em",color:"rgba(40,30,50,.90)",margin:0,lineHeight:1}}>
            {t.appName}
          </p>
        </div>
        <button onClick={handleInvite} style={{
          background:"rgba(190,30,90,.08)",border:"1px solid rgba(190,30,90,.18)",
          borderRadius:20,cursor:"pointer",
          fontFamily:"'Plus Jakarta Sans',sans-serif",fontWeight:500,fontSize:11,
          letterSpacing:"0.10em",textTransform:"uppercase",
          color:"rgba(190,30,90,.70)",padding:"8px 16px",
          transition:"background .15s",
        }}>
          {t.invite}
        </button>
      </div>

      {/* Categories — fill all available space evenly */}
      <div style={{flex:1,display:"flex",flexDirection:"column",minHeight:0}}>
        {CATEGORIES_ORDER.map((cat,i)=>(
          <CategoryRow key={cat} category={cat} lang={lang}
            onClick={()=>{ window.Telegram?.WebApp?.HapticFeedback?.impactOccurred("light"); onCategorySelect(cat); }}
            index={i}/>
        ))}
        <ScenarioRow lang={lang} onClick={onScenarioOpen} index={CATEGORIES_ORDER.length}/>
      </div>

      {/* Footer */}
      <div style={{flexShrink:0,padding:`8px 20px max(14px,env(safe-area-inset-bottom))`,
        borderTop:"0.5px solid rgba(40,30,50,.06)",textAlign:"center"}}>
        <p style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontWeight:300,fontSize:10,
          letterSpacing:"0.16em",textTransform:"uppercase",color:"rgba(40,30,50,.22)",margin:0}}>
          {t.footerHint}
        </p>
      </div>
    </div>
  );
}
