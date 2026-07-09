import { useState, useEffect, useRef, useCallback } from "react";
import { loadLocal, getLevel, getLevelProgress, LEVELS, type IntimacyLocal, type LevelIconId } from "@/data/intimacy";
import type { Lang } from "@/data/i18n";

const PR = 220, PG = 36, PB = 118;
const PINK = `rgb(${PR},${PG},${PB})`;

const T = {
  ru: { title:"Индекс близости", level:"Уровень",
    streak:(n:number)=>n===1?"1 день подряд":`${n} ${n<5?"дня":"дней"} подряд`,
    tasks:(n:number)=>`${n} ${n===1?"задание":n<5?"задания":"заданий"} выполнено`,
    noStreak:"Выполните первое задание", progress:"До следующего уровня",
    maxLevel:"Высший уровень!", history:"7 дней", noHistory:"Выполните первое задание вместе",
    close:"Закрыть", today:"сег.", yesterday:"вчера", pts:"бал.",
    decay:"−5% за пропуск дня (макс. 50 бал.)", tapHint:"нажмите, чтобы открыть категории",
    collapseHint:"свернуть", detailsHint:"подробная статистика",
  },
  en: { title:"Intimacy Index", level:"Level",
    streak:(n:number)=>`${n} day${n===1?"":"s"} streak`,
    tasks:(n:number)=>`${n} task${n===1?"":"s"} done`,
    noStreak:"Complete your first task", progress:"To next level",
    maxLevel:"Highest level!", history:"7 days", noHistory:"Complete your first task together",
    close:"Close", today:"today", yesterday:"yest.", pts:"pts",
    decay:"−5% per missed day (max 50 pts)", tapHint:"tap to open categories",
    collapseHint:"collapse", detailsHint:"detailed stats",
  },
};
function getT(lang: Lang) { return T[lang==="ru"?"ru":"en"]; }

function useCountUp(target: number, duration=900) {
  const [val, setVal] = useState(target);
  const prev = useRef(target);
  useEffect(()=>{
    const from=prev.current; prev.current=target;
    if(from===target) return;
    const diff=target-from; const start=performance.now(); let raf:number;
    const tick=(now:number)=>{ const p=Math.min(1,(now-start)/duration); setVal(Math.round(from+diff*(1-Math.pow(1-p,3)))); if(p<1) raf=requestAnimationFrame(tick); };
    raf=requestAnimationFrame(tick); return ()=>cancelAnimationFrame(raf);
  },[target,duration]);
  return val;
}

/* ─── LevelGlyph — hand-drawn line-art per level, never emoji ───── */
function LevelGlyph({ id, color, size=22, opacity=1, glow=false }:{ id:LevelIconId; color:string; size?:number; opacity?:number; glow?:boolean; }) {
  const common = {
    width: size, height: size, viewBox: "0 0 24 24", fill: "none",
    stroke: color, strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const,
    style: { opacity, display: "block" as const, filter: glow ? `drop-shadow(0 0 6px ${color})` : undefined },
  };
  switch (id) {
    case "ice":
      return (
        <svg {...common}>
          <line x1="12" y1="2" x2="12" y2="22"/>
          <line x1="3.5" y1="7" x2="20.5" y2="17"/>
          <line x1="3.5" y1="17" x2="20.5" y2="7"/>
          <path d="M12 2 L9.5 5.5 M12 2 L14.5 5.5"/>
          <path d="M12 22 L9.5 18.5 M12 22 L14.5 18.5"/>
          <path d="M3.5 7 L6.5 6.3 M3.5 7 L5.3 9.6"/>
          <path d="M20.5 17 L17.5 17.7 M20.5 17 L18.7 14.4"/>
          <path d="M3.5 17 L6.5 17.7 M3.5 17 L5.3 14.4"/>
          <path d="M20.5 7 L17.5 6.3 M20.5 7 L18.7 9.6"/>
        </svg>
      );
    case "sprout":
      return (
        <svg {...common}>
          <path d="M12 21 V11"/>
          <path d="M12 12c0-6-6-9-9-9 0 6 4 10 9 9z" fill={`${color}`} fillOpacity={0.14}/>
          <path d="M12 10c0-5 5-8 9-8 0 5-4 9-9 8z" fill={`${color}`} fillOpacity={0.14}/>
        </svg>
      );
    case "sun":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="4.6"/>
          <line x1="12" y1="1.5" x2="12" y2="4.5"/>
          <line x1="12" y1="19.5" x2="12" y2="22.5"/>
          <line x1="1.5" y1="12" x2="4.5" y2="12"/>
          <line x1="19.5" y1="12" x2="22.5" y2="12"/>
          <line x1="4.4" y1="4.4" x2="6.5" y2="6.5"/>
          <line x1="17.5" y1="17.5" x2="19.6" y2="19.6"/>
          <line x1="19.6" y1="4.4" x2="17.5" y2="6.5"/>
          <line x1="6.5" y1="17.5" x2="4.4" y2="19.6"/>
        </svg>
      );
    case "flame":
      return (
        <svg {...common}>
          <path d="M12 2c0 0-1.5 3-1.5 5.5C10.5 9.5 11 11 12 12c1-1 1.5-2.5 1.5-4.5 0 0 2 2.5 2 5 0 2-1 4-3.5 5.5C9.5 16.5 8 14.5 8 12.5c0-1.5.5-2.5.5-2.5S6 12.5 6 15.5C6 19 8.5 22 12 22s6-3 6-6.5C18 10 12 2 12 2z"
            fill={color} fillOpacity={0.18} />
        </svg>
      );
    case "closeness":
      return (
        <svg {...common}>
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
            fill={color} fillOpacity={0.20} />
        </svg>
      );
    case "deepbond":
      return (
        <svg {...common}>
          <path d="M12 22s-8-4.5-8-11.8A5.6 5.6 0 0 1 8.8 4.8C10.4 4.1 12 5 12 5s1.6-.9 3.2-.2A5.6 5.6 0 0 1 20 10.2C20 17.5 12 22 12 22z"
            fill={color} fillOpacity={0.22} />
          <path d="M12 8.5c0 0 .8 1.2.8 2.2 0 .9-.8 1.8-.8 1.8s-.8-.9-.8-1.8c0-1 .8-2.2.8-2.2z" fill={color} stroke="none" />
        </svg>
      );
    case "onesoul":
      return (
        <svg {...common}>
          <circle cx="8.2" cy="12" r="5"/>
          <circle cx="15.8" cy="12" r="5"/>
        </svg>
      );
    default: return null;
  }
}

/* ─── LevelWatermark — the "expensive" full-bleed treatment ─────── */
function LevelWatermark({ nameRu, nameEn, lang, iconId, color }:{ nameRu:string; nameEn:string; lang:Lang; iconId:LevelIconId; color:string; }) {
  const label = (lang==="ru" ? nameRu : nameEn).toUpperCase();
  return (
    <div aria-hidden style={{ position:"absolute", inset:0, overflow:"hidden", borderRadius:"inherit", pointerEvents:"none" }}>
      {/* huge translucent type running across the whole card */}
      <div style={{
        position:"absolute", right:-6, bottom:-20, whiteSpace:"nowrap",
        fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:800, fontSize:64,
        letterSpacing:"-0.02em", lineHeight:1, color:"transparent",
        WebkitTextStroke:`1px ${color}55`,
        opacity:0.5, userSelect:"none",
      }}>
        {label}
      </div>
      {/* soft drifting glyph, large and faint */}
      <div style={{ position:"absolute", top:"6%", right:"4%", animation:"levelDrift 7s ease-in-out infinite" }}>
        <LevelGlyph id={iconId} color={color} size={118} opacity={0.16} />
      </div>
      {/* ambient wash */}
      <div style={{ position:"absolute", inset:0, background:`radial-gradient(120% 90% at 82% -10%, ${color}2e 0%, transparent 60%)` }} />
    </div>
  );
}

function Ring({progress,color,size=80}:{progress:number;color:string;size?:number}) {
  const r=(size-8)/2; const circ=2*Math.PI*r; const off=circ*(1-Math.min(1,Math.max(0,progress)));
  return (
    <svg width={size} height={size} style={{transform:"rotate(-90deg)"}}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={6}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={6}
        strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round"
        style={{transition:"stroke-dashoffset 1.2s cubic-bezier(.22,1,.36,1)",filter:`drop-shadow(0 0 5px ${color})`}}/>
    </svg>
  );
}

function HistoryChart({history}:{history:IntimacyLocal["history"]}) {
  const last7=history.slice(-7); const max=Math.max(...last7.map(h=>h.points),1);
  const today=new Date().toISOString().slice(0,10);
  return (
    <div style={{display:"flex",alignItems:"flex-end",gap:5,height:52,padding:"0 2px"}}>
      {last7.map((h,i)=>{
        const hp=(h.points/max)*100; const isT=h.date===today;
        return (
          <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
            <div style={{width:"100%",borderRadius:4,height:`${Math.max(8,hp*0.44)}px`,
              background:isT?`linear-gradient(180deg,rgba(${PR},${PG},${PB},0.9),rgba(${PR},${PG},${PB},0.5))`:"rgba(255,238,248,0.12)",
              boxShadow:isT?`0 0 8px rgba(${PR},${PG},${PB},0.5)`:"none",transition:"height .8s cubic-bezier(.22,1,.36,1)"}}/>
            <span style={{fontSize:9,color:isT?PINK:"rgba(255,238,248,0.28)",fontFamily:"'Plus Jakarta Sans',sans-serif"}}>{isT?"·":h.date.slice(8)}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Small line-icons used inside the modal (replace 🔥 ✓ 📉) ──── */
function StatGlyph({ id, color=PINK, size=17 }:{ id:"streak"|"tasks"|"decay"; color?:string; size?:number }) {
  const common = { width:size, height:size, viewBox:"0 0 24 24", fill:"none", stroke:color, strokeWidth:1.8, strokeLinecap:"round" as const, strokeLinejoin:"round" as const };
  if (id==="streak") return (
    <svg {...common}><path d="M12 2c0 0-1.5 3-1.5 5.5C10.5 9.5 11 11 12 12c1-1 1.5-2.5 1.5-4.5 0 0 2 2.5 2 5 0 2-1 4-3.5 5.5C9.5 16.5 8 14.5 8 12.5c0-1.5.5-2.5.5-2.5S6 12.5 6 15.5C6 19 8.5 22 12 22s6-3 6-6.5C18 10 12 2 12 2z" fill={color} fillOpacity={0.18}/></svg>
  );
  if (id==="tasks") return (
    <svg {...common}><circle cx="12" cy="12" r="9"/><polyline points="8 12.5 10.8 15 16 9.5"/></svg>
  );
  return (
    <svg {...common}><polyline points="4 8 10 14 14 10 20 17"/><polyline points="15 17 20 17 20 12"/></svg>
  );
}

function IntimacyModal({lang,data,onClose}:{lang:Lang;data:IntimacyLocal;onClose:()=>void}) {
  const t=getT(lang); const lvl=getLevel(data.score); const prog=getLevelProgress(data.score);
  const nextLvl=LEVELS[LEVELS.indexOf(lvl)+1]; const score=useCountUp(data.score);
  const [mounted,setMounted]=useState(false);
  useEffect(()=>{requestAnimationFrame(()=>setMounted(true));},[]);
  const today=new Date().toISOString().slice(0,10);
  const yest=(()=>{const d=new Date();d.setDate(d.getDate()-1);return d.toISOString().slice(0,10);})();
  return (
    <div style={{position:"fixed",inset:0,zIndex:900,display:"flex",flexDirection:"column",justifyContent:"flex-end"}}>
      <div onClick={onClose} style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.72)",backdropFilter:"blur(8px)"}}/>
      <div style={{position:"relative",zIndex:1,background:"linear-gradient(180deg,#1a0a1e 0%,#110810 100%)",
        borderRadius:"28px 28px 0 0",padding:`0 22px max(34px,env(safe-area-inset-bottom))`,
        border:`1px solid rgba(${PR},${PG},${PB},0.20)`,borderBottom:"none",
        boxShadow:`0 -10px 60px rgba(${PR},${PG},${PB},0.22)`,
        transform:mounted?"translateY(0)":"translateY(100%)",
        transition:"transform 0.42s cubic-bezier(.22,1,.36,1)",maxHeight:"92dvh",overflowY:"auto"}}>
        {/* Handle */}
        <div style={{display:"flex",justifyContent:"center",padding:"14px 0 6px"}}>
          <div style={{width:40,height:4,borderRadius:99,background:"rgba(255,238,248,0.15)"}}/>
        </div>
        {/* Hero row */}
        <div style={{display:"flex",alignItems:"center",gap:20,marginBottom:22,paddingTop:8}}>
          <div style={{position:"relative",flexShrink:0}}>
            <Ring progress={prog} color={lvl.color} size={88}/>
            <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
              <LevelGlyph id={lvl.iconId} color={lvl.color} size={30} glow/>
            </div>
          </div>
          <div style={{flex:1}}>
            <div style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontWeight:800,fontSize:44,color:"rgba(255,238,248,0.97)",lineHeight:1,letterSpacing:"-0.03em"}}>{score}</div>
            <div style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:11,color:"rgba(255,238,248,0.36)",marginTop:2,letterSpacing:"0.08em",textTransform:"uppercase"}}>{t.title}</div>
            <div style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontWeight:700,fontSize:15,color:lvl.color,marginTop:5,textShadow:`0 0 14px ${lvl.color}`}}>
              {t.level}: {lang==="ru"?lvl.nameRu:lvl.nameEn}
            </div>
          </div>
        </div>
        {/* Stats */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
          {[{id:"streak" as const,main:data.streakDays>0?t.streak(data.streakDays):t.noStreak},{id:"tasks" as const,main:t.tasks(data.totalTasks)}].map((item,i)=>(
            <div key={i} style={{padding:"13px 14px",borderRadius:16,background:`rgba(${PR},${PG},${PB},0.07)`,border:`1px solid rgba(${PR},${PG},${PB},0.14)`}}>
              <div style={{marginBottom:7}}><StatGlyph id={item.id}/></div>
              <div style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontWeight:700,fontSize:13,color:"rgba(255,238,248,0.88)",lineHeight:1.35}}>{item.main}</div>
            </div>
          ))}
        </div>
        {/* Decay */}
        <div style={{marginBottom:16,padding:"10px 14px",borderRadius:14,background:"rgba(255,238,248,0.03)",border:"1px solid rgba(255,238,248,0.06)",display:"flex",alignItems:"center",gap:10}}>
          <StatGlyph id="decay" color="rgba(255,238,248,0.32)" size={15}/>
          <span style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:12,color:"rgba(255,238,248,0.30)",lineHeight:1.4}}>{t.decay}</span>
        </div>
        {/* Progress bar */}
        <div style={{marginBottom:20}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <span style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:11,color:"rgba(255,238,248,0.32)",letterSpacing:"0.06em",textTransform:"uppercase"}}>{nextLvl?t.progress:t.maxLevel}</span>
            {nextLvl&&<span style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:12,color:lvl.color,display:"flex",alignItems:"center",gap:5}}><LevelGlyph id={nextLvl.iconId} color={lvl.color} size={13}/> {lang==="ru"?nextLvl.nameRu:nextLvl.nameEn}</span>}
          </div>
          <div style={{height:5,borderRadius:99,background:"rgba(255,238,248,0.07)",overflow:"hidden"}}>
            <div style={{height:"100%",borderRadius:99,width:`${Math.round(prog*100)}%`,background:`linear-gradient(90deg,rgba(${PR},${PG},${PB},0.5),${lvl.color})`,boxShadow:`0 0 8px ${lvl.color}`,transition:"width 1.2s cubic-bezier(.22,1,.36,1)"}}/>
          </div>
          {nextLvl&&<div style={{display:"flex",justifyContent:"space-between",marginTop:4}}>
            <span style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:10,color:"rgba(255,238,248,0.20)"}}>{data.score}</span>
            <span style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:10,color:"rgba(255,238,248,0.20)"}}>{nextLvl.min}</span>
          </div>}
        </div>
        {/* Chart */}
        {data.history.length>0&&(
          <div style={{marginBottom:18}}>
            <div style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:11,color:"rgba(255,238,248,0.32)",letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:10}}>{t.history}</div>
            <HistoryChart history={data.history}/>
          </div>
        )}
        {/* History list */}
        <div style={{marginBottom:18}}>
          {data.history.length===0
            ?<div style={{textAlign:"center",padding:"22px 0",fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:13,color:"rgba(255,238,248,0.25)"}}>{t.noHistory}</div>
            :<div style={{display:"flex",flexDirection:"column",gap:7}}>
              {[...data.history].reverse().slice(0,5).map((h,i)=>{
                const label=h.date===today?t.today:h.date===yest?t.yesterday:h.date.slice(5).replace("-",".");
                return (
                  <div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 14px",borderRadius:13,background:"rgba(255,238,248,0.03)",border:"1px solid rgba(255,238,248,0.06)"}}>
                    <span style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:12,color:"rgba(255,238,248,0.35)"}}>{label}</span>
                    <span style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontWeight:700,fontSize:14,color:PINK}}>+{h.points} {t.pts}</span>
                  </div>
                );
              })}
            </div>
          }
        </div>
        {/* Level map */}
        <div style={{marginBottom:20}}>
          <div style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:11,color:"rgba(255,238,248,0.32)",letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:10}}>{lang==="ru"?"Уровни":"Levels"}</div>
          <div style={{display:"flex",flexDirection:"column",gap:5}}>
            {LEVELS.map((l,i)=>{
              const active=getLevel(data.score)===l;
              return (
                <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"9px 14px",borderRadius:12,background:active?`rgba(${PR},${PG},${PB},0.12)`:"transparent",border:`1px solid ${active?`rgba(${PR},${PG},${PB},0.28)`:"transparent"}`,transition:"all .3s"}}>
                  <div style={{width:22,display:"flex",justifyContent:"center"}}><LevelGlyph id={l.iconId} color={active?l.color:"rgba(255,238,248,0.30)"} size={16}/></div>
                  <div style={{flex:1}}>
                    <span style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontWeight:active?700:400,fontSize:13,color:active?l.color:"rgba(255,238,248,0.38)"}}>{lang==="ru"?l.nameRu:l.nameEn}</span>
                  </div>
                  <span style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:11,color:"rgba(255,238,248,0.20)"}}>{l.max===Infinity?`${l.min}+`:`${l.min}–${l.max}`}</span>
                </div>
              );
            })}
          </div>
        </div>
        <button onClick={onClose} style={{width:"100%",padding:"14px",borderRadius:16,border:"1px solid rgba(255,238,248,0.07)",background:"rgba(255,238,248,0.03)",color:"rgba(255,238,248,0.28)",fontFamily:"'Plus Jakarta Sans',sans-serif",fontWeight:500,fontSize:14,cursor:"pointer"}}>
          {t.close}
        </button>
      </div>
    </div>
  );
}

interface IntimacyIndexProps {
  lang: Lang;
  refreshKey?: number;
  index?: number;
  /** Category cards rendered inside the index once it is opened/collapsed. */
  children?: React.ReactNode;
}

export default function IntimacyIndex({lang,refreshKey=0,index=0,children}:IntimacyIndexProps) {
  const [data,setData]=useState<IntimacyLocal>(()=>loadLocal());
  const [open,setOpen]=useState(false);       // false = big hero, true = compact header + categories
  const [modalOpen,setModalOpen]=useState(false);
  const [pulse,setPulse]=useState(false);

  useEffect(()=>{setData(loadLocal());},[refreshKey]);
  useEffect(()=>{
    const h=()=>{setData(loadLocal());setPulse(true);setTimeout(()=>setPulse(false),900);};
    window.addEventListener("touche-intimacy-updated",h);
    return ()=>window.removeEventListener("touche-intimacy-updated",h);
  },[]);

  const score=useCountUp(data.score,800);
  const lvl=getLevel(data.score); const prog=getLevelProgress(data.score);
  const nextLvl=LEVELS[LEVELS.indexOf(lvl)+1]; const t=getT(lang);
  const rgb=lvl.color.match(/[\d.]+/g)?.slice(0,3).join(",")??`${PR},${PG},${PB}`;

  const toggle=useCallback(()=>{
    setOpen(o=>!o);
    (window.Telegram?.WebApp as {HapticFeedback?:{impactOccurred:(s:string)=>void}})?.HapticFeedback?.impactOccurred("medium");
  },[]);
  const openDetails=useCallback((e:React.MouseEvent)=>{
    e.stopPropagation();
    setModalOpen(true);
    (window.Telegram?.WebApp as {HapticFeedback?:{impactOccurred:(s:string)=>void}})?.HapticFeedback?.impactOccurred("light");
  },[]);

  return (
    <>
      <style>{`
        @keyframes levelDrift {
          0%,100% { transform: translateY(0px) rotate(0deg); }
          50%      { transform: translateY(-8px) rotate(3deg); }
        }
        @keyframes categoriesIn {
          from { opacity:0; transform:translateY(-6px); }
          to   { opacity:1; transform:translateY(0); }
        }
      `}</style>
      <div style={{
        width:"100%", borderRadius:26, position:"relative", overflow:"hidden",
        background:`linear-gradient(150deg,rgba(${rgb},0.17) 0%,rgba(${PR},${PG},${PB},0.06) 55%,rgba(12,6,10,0.98) 100%)`,
        border:`1px solid rgba(${rgb},0.35)`,
        boxShadow:pulse?`0 0 44px rgba(${rgb},0.45),0 0 88px rgba(${rgb},0.18)`:`0 0 28px rgba(${rgb},0.18),0 0 56px rgba(${PR},${PG},${PB},0.07)`,
        animation:`fadeSlideUp .42s cubic-bezier(.22,1,.36,1) ${index*55}ms both`,
        transition:"box-shadow 0.55s ease, padding .38s cubic-bezier(.22,1,.36,1)",
        padding: open ? "16px 16px 14px" : "22px 22px 20px",
      }}>
        {!open && <LevelWatermark nameRu={lvl.nameRu} nameEn={lvl.nameEn} lang={lang} iconId={lvl.iconId} color={lvl.color} />}
        {/* shimmer line */}
        <div style={{position:"absolute",top:0,left:"8%",right:"8%",height:1,background:`linear-gradient(90deg,transparent,rgba(${rgb},0.72),transparent)`,pointerEvents:"none"}}/>

        <button onClick={toggle} style={{ all:"unset", display:"block", width:"100%", cursor:"pointer", position:"relative", zIndex:1 }}>
          {!open ? (
            <>
              {/* Row 1: title + level badge + details button */}
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
                <span style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:12,fontWeight:600,color:"rgba(255,238,248,0.42)",letterSpacing:"0.13em",textTransform:"uppercase"}}>{t.title}</span>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <div style={{display:"flex",alignItems:"center",gap:6,padding:"5px 12px",borderRadius:99,background:`rgba(${rgb},0.15)`,border:`1px solid rgba(${rgb},0.32)`}}>
                    <LevelGlyph id={lvl.iconId} color={lvl.color} size={14} glow/>
                    <span style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontWeight:700,fontSize:12,color:lvl.color,textShadow:`0 0 10px ${lvl.color}`}}>{lang==="ru"?lvl.nameRu:lvl.nameEn}</span>
                  </div>
                  <span onClick={openDetails} role="button" aria-label={t.detailsHint} style={{
                    width:26,height:26,borderRadius:99,display:"flex",alignItems:"center",justifyContent:"center",
                    border:"1px solid rgba(255,238,248,0.14)",background:"rgba(255,238,248,0.04)",cursor:"pointer",
                  }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,238,248,0.45)" strokeWidth="2.2" strokeLinecap="round"><line x1="12" y1="11" x2="12" y2="17"/><circle cx="12" cy="7.2" r="0.6" fill="rgba(255,238,248,0.45)" stroke="none"/></svg>
                  </span>
                </div>
              </div>

              {/* Row 2: circular gauge — score + progress fused into one dial */}
              <div style={{display:"flex",alignItems:"center",gap:22,marginBottom:16}}>
                <div style={{position:"relative",flexShrink:0,width:132,height:132}}>
                  <Ring progress={prog} color={lvl.color} size={132}/>
                  <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:1}}>
                    <span style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontWeight:900,fontSize:38,color:"rgba(255,238,248,0.97)",lineHeight:1,letterSpacing:"-0.03em",textShadow:`0 0 30px rgba(${rgb},0.5)`}}>{score}</span>
                    <span style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:10,color:"rgba(255,238,248,0.30)",letterSpacing:"0.08em",textTransform:"uppercase"}}>{lang==="ru"?"баллов":"pts"}</span>
                    <span style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontWeight:700,fontSize:11,color:lvl.color,marginTop:3}}>{Math.round(prog*100)}%</span>
                  </div>
                </div>
                <div style={{flex:1,display:"flex",flexDirection:"column",gap:9,minWidth:0}}>
                  <div>
                    <div style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:10,color:"rgba(255,238,248,0.24)",letterSpacing:"0.07em",textTransform:"uppercase",marginBottom:3}}>
                      {nextLvl?t.progress:t.maxLevel}
                    </div>
                    {nextLvl && (
                      <div style={{display:"flex",alignItems:"center",gap:6}}>
                        <LevelGlyph id={nextLvl.iconId} color={lvl.color} size={13}/>
                        <span style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontWeight:700,fontSize:14,color:"rgba(255,238,248,0.82)"}}>{lang==="ru"?nextLvl.nameRu:nextLvl.nameEn}</span>
                      </div>
                    )}
                    {nextLvl && <div style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:11,color:"rgba(255,238,248,0.20)",marginTop:2}}>{data.score} / {nextLvl.min}</div>}
                  </div>
                  {data.streakDays>0?(
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      <StatGlyph id="streak" color="rgba(255,185,60,0.92)" size={16}/>
                      <span style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontWeight:700,fontSize:12,color:"rgba(255,185,60,0.92)"}}>{t.streak(data.streakDays)}</span>
                    </div>
                  ):(
                    <div style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:11,color:"rgba(255,238,248,0.20)",lineHeight:1.4}}>{t.noStreak}</div>
                  )}
                </div>
              </div>

              {/* Row 4: tap hint */}
              <div style={{display:"flex",alignItems:"center",justifyContent:"flex-end",gap:4}}>
                <span style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:10,color:"rgba(255,238,248,0.18)",letterSpacing:"0.05em"}}>{t.tapHint}</span>
                <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke={`rgba(${PR},${PG},${PB},0.32)`} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{transform:"rotate(90deg)"}}><polyline points="9 18 15 12 9 6"/></svg>
              </div>
            </>
          ) : (
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <LevelGlyph id={lvl.iconId} color={lvl.color} size={18} glow/>
                <span style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontWeight:800,fontSize:22,color:"rgba(255,238,248,0.95)",letterSpacing:"-0.02em"}}>{score}</span>
                <span style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontWeight:600,fontSize:12,color:lvl.color}}>{lang==="ru"?lvl.nameRu:lvl.nameEn}</span>
              </div>
              <span style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:11,color:"rgba(255,238,248,0.32)",display:"flex",alignItems:"center",gap:4}}>
                {t.collapseHint}
                <svg width={9} height={9} viewBox="0 0 24 24" fill="none" stroke="rgba(255,238,248,0.4)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
              </span>
            </div>
          )}
        </button>

        {open && (
          <div style={{ marginTop:14, display:"flex", flexDirection:"column", gap:9, position:"relative", zIndex:1, animation:"categoriesIn .32s cubic-bezier(.22,1,.36,1) both" }}>
            {children}
          </div>
        )}
      </div>
      {modalOpen&&<IntimacyModal lang={lang} data={data} onClose={()=>setModalOpen(false)}/>}
    </>
  );
}
