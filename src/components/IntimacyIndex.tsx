import { useState, useEffect, useRef, useCallback } from "react";
import { loadLocal, getLevel, getLevelProgress, LEVELS, type IntimacyLocal, type LevelIconId } from "@/data/intimacy";
import type { Lang } from "@/data/i18n";

/* ─── Palette — muted wine/ivory/gold, boutique rather than gamified ──── */
const INK = "20,9,14";          // near-black plum, the base of every surface
const WINE = "110,26,46";       // deep garnet, the app's own accent (kept subtle here)
const GOLD = "196,164,112";     // warm champagne-gold hairline accent
const IVORY = "245,235,228";    // warm off-white for type

const SERIF = "'Cormorant Garamond', 'Times New Roman', serif";
const SANS = "'Plus Jakarta Sans', sans-serif";

const T = {
  ru: { title:"Индекс близости", level:"Уровень",
    streak:(n:number)=>n===1?"1 день подряд":`${n} ${n<5?"дня":"дней"} подряд`,
    tasks:(n:number)=>`${n} ${n===1?"задание":n<5?"задания":"заданий"} выполнено`,
    noStreak:"Выполните первое задание", progress:"До следующего уровня",
    maxLevel:"Высший уровень", history:"7 дней", noHistory:"Выполните первое задание вместе",
    close:"Закрыть", today:"сег.", yesterday:"вчера", pts:"баллов",
    decay:"−5% за пропуск дня (макс. 50 бал.)", tapHint:"нажмите, чтобы открыть категории",
    collapseHint:"свернуть", detailsHint:"подробная статистика",
  },
  en: { title:"Intimacy Index", level:"Level",
    streak:(n:number)=>`${n} day${n===1?"":"s"} streak`,
    tasks:(n:number)=>`${n} task${n===1?"":"s"} done`,
    noStreak:"Complete your first task", progress:"To next level",
    maxLevel:"Highest level", history:"7 days", noHistory:"Complete your first task together",
    close:"Close", today:"today", yesterday:"yest.", pts:"pts",
    decay:"−5% per missed day (max 50 pts)", tapHint:"tap to open categories",
    collapseHint:"collapse", detailsHint:"detailed stats",
  },
};
function getT(lang: Lang) { return T[lang==="ru"?"ru":"en"]; }

/** Motion tokens — one shared rhythm for every animation in this component. */
const MOTION_DURATION = 420;
const MOTION_EASE = "cubic-bezier(.19,1,.22,1)";

function haptic(kind: "impact" | "success", style: "light"|"medium"|"heavy" = "medium") {
  const wa = (window as unknown as { Telegram?: { WebApp?: {
    HapticFeedback?: { impactOccurred:(s:string)=>void; notificationOccurred?:(s:string)=>void };
  } } }).Telegram?.WebApp;
  if (kind === "success") wa?.HapticFeedback?.notificationOccurred?.("success");
  else wa?.HapticFeedback?.impactOccurred(style);
}

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

/* ─── LevelGlyph — fine, engraved-style line-art per level, never emoji ── */
function LevelGlyph({ id, color, size=22, opacity=1 }:{ id:LevelIconId; color:string; size?:number; opacity?:number; }) {
  const common = {
    width: size, height: size, viewBox: "0 0 24 24", fill: "none",
    stroke: color, strokeWidth: 1.1, strokeLinecap: "round" as const, strokeLinejoin: "round" as const,
    style: { opacity, display: "block" as const },
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
          <path d="M12 12c0-6-6-9-9-9 0 6 4 10 9 9z" fill={color} fillOpacity={0.10}/>
          <path d="M12 10c0-5 5-8 9-8 0 5-4 9-9 8z" fill={color} fillOpacity={0.10}/>
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
            fill={color} fillOpacity={0.12} />
        </svg>
      );
    case "closeness":
      return (
        <svg {...common}>
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
            fill={color} fillOpacity={0.14} />
        </svg>
      );
    case "deepbond":
      return (
        <svg {...common}>
          <path d="M12 22s-8-4.5-8-11.8A5.6 5.6 0 0 1 8.8 4.8C10.4 4.1 12 5 12 5s1.6-.9 3.2-.2A5.6 5.6 0 0 1 20 10.2C20 17.5 12 22 12 22z"
            fill={color} fillOpacity={0.16} />
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

/* ─── Silhouette motif — a single, quiet embrace line-drawing used as the ──
   card's watermark. Abstract, editorial, never explicit; reads as "intimacy"
   through gesture rather than iconography. ────────────────────────────── */
function EmbraceMotif({ color, opacity=1 }:{ color:string; opacity?:number }) {
  return (
    <svg width="100%" height="100%" viewBox="0 0 200 260" fill="none" preserveAspectRatio="xMidYMid slice" style={{ opacity }}>
      <path d="M60 40c-22 10-34 34-30 60 5 32 32 54 40 84 3 12 2 26-4 40"
        stroke={color} strokeWidth="1" strokeLinecap="round" fill="none" />
      <path d="M140 30c24 8 38 32 35 58-4 33-30 56-36 87-2 12 0 26 6 39"
        stroke={color} strokeWidth="1" strokeLinecap="round" fill="none" />
      <path d="M92 70c6 18 6 34 0 52M108 70c-6 18-6 34 0 52"
        stroke={color} strokeWidth="0.7" strokeLinecap="round" fill="none" opacity={0.7} />
    </svg>
  );
}

/* ─── LevelWatermark — quiet, editorial full-bleed treatment ───────────── */
function LevelWatermark({ nameRu, nameEn, lang, iconId, color }:{ nameRu:string; nameEn:string; lang:Lang; iconId:LevelIconId; color:string; }) {
  const label = lang==="ru" ? nameRu : nameEn;
  return (
    <div aria-hidden style={{ position:"absolute", inset:0, overflow:"hidden", borderRadius:"inherit", pointerEvents:"none" }}>
      {/* an abstract embrace line-drawing, faint, filling the card */}
      <div style={{ position:"absolute", inset:0, animation:"motifDrift 11s ease-in-out infinite" }}>
        <EmbraceMotif color={color} opacity={0.10} />
      </div>
      {/* single quiet glyph, upper right, engraved */}
      <div style={{ position:"absolute", top:18, right:18 }}>
        <LevelGlyph id={iconId} color={color} size={26} opacity={0.5} />
      </div>
      {/* italic serif caption running low across the card, ink not glow */}
      <div style={{
        position:"absolute", left:24, bottom:16, right:24,
        fontFamily:SERIF, fontStyle:"italic", fontWeight:500, fontSize:15,
        letterSpacing:"0.02em", color:`rgba(${IVORY},0.16)`, userSelect:"none",
      }}>
        {label}
      </div>
      {/* soft warm vignette, candlelight rather than neon */}
      <div style={{ position:"absolute", inset:0, background:`radial-gradient(120% 80% at 50% 0%, rgba(${INK},0) 0%, rgba(${INK},0.35) 100%)` }} />
    </div>
  );
}

function Ring({progress,color,size=80}:{progress:number;color:string;size?:number}) {
  const r=(size-6)/2; const circ=2*Math.PI*r; const off=circ*(1-Math.min(1,Math.max(0,progress)));
  return (
    <svg width={size} height={size} style={{transform:"rotate(-90deg)"}}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={`rgba(${IVORY},0.08)`} strokeWidth={2}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={2}
        strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round"
        style={{transition:`stroke-dashoffset 1.1s ${MOTION_EASE}`}}/>
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
            <div style={{width:"100%",borderRadius:3,height:`${Math.max(8,hp*0.44)}px`,
              background:isT?`rgb(${GOLD})`:`rgba(${IVORY},0.10)`,
              transition:`height .8s ${MOTION_EASE}`}}/>
            <span style={{fontSize:9,color:isT?`rgb(${GOLD})`:`rgba(${IVORY},0.28)`,fontFamily:SANS}}>{isT?"·":h.date.slice(8)}</span>
          </div>
        );
      })}
    </div>
  );
}

function StatGlyph({ id, color, size=17 }:{ id:"streak"|"tasks"|"decay"; color:string; size?:number }) {
  const common = { width:size, height:size, viewBox:"0 0 24 24", fill:"none", stroke:color, strokeWidth:1.2, strokeLinecap:"round" as const, strokeLinejoin:"round" as const };
  if (id==="streak") return (
    <svg {...common}><path d="M12 2c0 0-1.5 3-1.5 5.5C10.5 9.5 11 11 12 12c1-1 1.5-2.5 1.5-4.5 0 0 2 2.5 2 5 0 2-1 4-3.5 5.5C9.5 16.5 8 14.5 8 12.5c0-1.5.5-2.5.5-2.5S6 12.5 6 15.5C6 19 8.5 22 12 22s6-3 6-6.5C18 10 12 2 12 2z" fill={color} fillOpacity={0.12}/></svg>
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
      <div style={{position:"relative",zIndex:1,background:`linear-gradient(180deg,rgba(${INK},1) 0%,rgba(10,4,7,1) 100%)`,
        borderRadius:"28px 28px 0 0",padding:`0 22px max(34px,env(safe-area-inset-bottom))`,
        border:`1px solid rgba(${GOLD},0.16)`,borderBottom:"none",
        boxShadow:`0 -16px 48px rgba(0,0,0,0.45)`,
        transform:mounted?"translateY(0)":"translateY(100%)",
        transition:`transform ${MOTION_DURATION}ms ${MOTION_EASE}`,maxHeight:"92dvh",overflowY:"auto"}}>
        <div style={{display:"flex",justifyContent:"center",padding:"14px 0 6px"}}>
          <div style={{width:36,height:3,borderRadius:99,background:`rgba(${IVORY},0.14)`}}/>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:20,marginBottom:22,paddingTop:8}}>
          <div style={{position:"relative",flexShrink:0}}>
            <Ring progress={prog} color={lvl.color} size={88}/>
            <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
              <LevelGlyph id={lvl.iconId} color={lvl.color} size={28} opacity={0.85}/>
            </div>
          </div>
          <div style={{flex:1}}>
            <div style={{fontFamily:SERIF,fontWeight:600,fontSize:46,color:`rgba(${IVORY},0.95)`,lineHeight:1,letterSpacing:"-0.01em"}}>{score}</div>
            <div style={{fontFamily:SANS,fontSize:10,color:`rgba(${IVORY},0.32)`,marginTop:4,letterSpacing:"0.12em",textTransform:"uppercase"}}>{t.title}</div>
            <div style={{fontFamily:SERIF,fontStyle:"italic",fontWeight:600,fontSize:17,color:lvl.color,marginTop:6}}>
              {t.level}: {lang==="ru"?lvl.nameRu:lvl.nameEn}
            </div>
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
          {[{id:"streak" as const,main:data.streakDays>0?t.streak(data.streakDays):t.noStreak},{id:"tasks" as const,main:t.tasks(data.totalTasks)}].map((item,i)=>(
            <div key={i} style={{padding:"13px 14px",borderRadius:14,background:`rgba(${IVORY},0.03)`,border:`1px solid rgba(${GOLD},0.14)`}}>
              <div style={{marginBottom:7}}><StatGlyph id={item.id} color={`rgb(${GOLD})`}/></div>
              <div style={{fontFamily:SANS,fontWeight:600,fontSize:13,color:`rgba(${IVORY},0.82)`,lineHeight:1.35}}>{item.main}</div>
            </div>
          ))}
        </div>
        <div style={{marginBottom:16,padding:"10px 14px",borderRadius:14,background:`rgba(${IVORY},0.02)`,border:`1px solid rgba(${IVORY},0.06)`,display:"flex",alignItems:"center",gap:10}}>
          <StatGlyph id="decay" color={`rgba(${IVORY},0.34)`} size={15}/>
          <span style={{fontFamily:SANS,fontSize:12,color:`rgba(${IVORY},0.34)`,lineHeight:1.4}}>{t.decay}</span>
        </div>
        <div style={{marginBottom:20}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <span style={{fontFamily:SANS,fontSize:11,color:`rgba(${IVORY},0.34)`,letterSpacing:"0.08em",textTransform:"uppercase"}}>{nextLvl?t.progress:t.maxLevel}</span>
            {nextLvl&&<span style={{fontFamily:SERIF,fontStyle:"italic",fontSize:14,color:lvl.color,display:"flex",alignItems:"center",gap:5}}><LevelGlyph id={nextLvl.iconId} color={lvl.color} size={14}/> {lang==="ru"?nextLvl.nameRu:nextLvl.nameEn}</span>}
          </div>
          <div style={{height:2,borderRadius:99,background:`rgba(${IVORY},0.08)`,overflow:"hidden"}}>
            <div style={{height:"100%",borderRadius:99,width:`${Math.round(prog*100)}%`,background:`rgb(${GOLD})`,transition:`width 1.1s ${MOTION_EASE}`}}/>
          </div>
          {nextLvl&&<div style={{display:"flex",justifyContent:"space-between",marginTop:5}}>
            <span style={{fontFamily:SANS,fontSize:10,color:`rgba(${IVORY},0.30)`}}>{data.score}</span>
            <span style={{fontFamily:SANS,fontSize:10,color:`rgba(${IVORY},0.30)`}}>{nextLvl.min}</span>
          </div>}
        </div>
        {data.history.length>0&&(
          <div style={{marginBottom:18}}>
            <div style={{fontFamily:SANS,fontSize:11,color:`rgba(${IVORY},0.34)`,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:10}}>{t.history}</div>
            <HistoryChart history={data.history}/>
          </div>
        )}
        <div style={{marginBottom:18}}>
          {data.history.length===0
            ?<div style={{textAlign:"center",padding:"22px 0",fontFamily:SANS,fontSize:13,color:`rgba(${IVORY},0.28)`}}>{t.noHistory}</div>
            :<div style={{display:"flex",flexDirection:"column",gap:7}}>
              {[...data.history].reverse().slice(0,5).map((h,i)=>{
                const label=h.date===today?t.today:h.date===yest?t.yesterday:h.date.slice(5).replace("-",".");
                return (
                  <div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 14px",borderRadius:12,background:`rgba(${IVORY},0.02)`,border:`1px solid rgba(${IVORY},0.06)`}}>
                    <span style={{fontFamily:SANS,fontSize:12,color:`rgba(${IVORY},0.38)`}}>{label}</span>
                    <span style={{fontFamily:SERIF,fontWeight:600,fontSize:15,color:`rgb(${GOLD})`}}>+{h.points} {t.pts}</span>
                  </div>
                );
              })}
            </div>
          }
        </div>
        <div style={{marginBottom:20}}>
          <div style={{fontFamily:SANS,fontSize:11,color:`rgba(${IVORY},0.34)`,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:10}}>{lang==="ru"?"Уровни":"Levels"}</div>
          <div style={{display:"flex",flexDirection:"column",gap:4}}>
            {LEVELS.map((l,i)=>{
              const active=getLevel(data.score)===l;
              return (
                <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"9px 14px",borderRadius:11,background:active?`rgba(${GOLD},0.08)`:"transparent",border:`1px solid ${active?`rgba(${GOLD},0.22)`:"transparent"}`,transition:`all ${MOTION_DURATION}ms`}}>
                  <div style={{width:22,display:"flex",justifyContent:"center"}}><LevelGlyph id={l.iconId} color={active?l.color:`rgba(${IVORY},0.28)`} size={16}/></div>
                  <div style={{flex:1}}>
                    <span style={{fontFamily:active?SERIF:SANS,fontStyle:active?"italic":"normal",fontWeight:active?600:400,fontSize:14,color:active?l.color:`rgba(${IVORY},0.36)`}}>{lang==="ru"?l.nameRu:l.nameEn}</span>
                  </div>
                  <span style={{fontFamily:SANS,fontSize:11,color:`rgba(${IVORY},0.22)`}}>{l.max===Infinity?`${l.min}+`:`${l.min}–${l.max}`}</span>
                </div>
              );
            })}
          </div>
        </div>
        <button onClick={onClose} style={{width:"100%",padding:"14px",borderRadius:14,border:`1px solid rgba(${IVORY},0.08)`,background:`rgba(${IVORY},0.02)`,color:`rgba(${IVORY},0.34)`,fontFamily:SANS,fontWeight:500,fontSize:14,cursor:"pointer"}}>
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
  const prevLevelRef=useRef<string|null>(null);
  const prevMaxedRef=useRef(false);

  useEffect(()=>{setData(loadLocal());},[refreshKey]);
  useEffect(()=>{
    const h=()=>{setData(loadLocal());setPulse(true);setTimeout(()=>setPulse(false),1000);};
    window.addEventListener("touche-intimacy-updated",h);
    return ()=>window.removeEventListener("touche-intimacy-updated",h);
  },[]);

  const score=useCountUp(data.score,800);
  const lvl=getLevel(data.score); const prog=getLevelProgress(data.score);
  const nextLvl=LEVELS[LEVELS.indexOf(lvl)+1]; const t=getT(lang);

  useEffect(()=>{
    if (prevLevelRef.current !== null && prevLevelRef.current !== lvl.iconId) haptic("success");
    prevLevelRef.current = lvl.iconId;
    const maxed = prog >= 1 && !!nextLvl;
    if (maxed && !prevMaxedRef.current) haptic("impact","heavy");
    prevMaxedRef.current = maxed;
  },[lvl.iconId, prog, nextLvl]);

  const toggle=useCallback(()=>{
    setOpen(o=>!o);
    haptic("impact","medium");
  },[]);
  const openDetails=useCallback((e:React.MouseEvent)=>{
    e.stopPropagation();
    setModalOpen(true);
    haptic("impact","light");
  },[]);

  return (
    <>
      <style>{`
        @keyframes motifDrift {
          0%,100% { transform: translateY(0px) scale(1); }
          50%      { transform: translateY(-5px) scale(1.015); }
        }
        @keyframes categoriesIn {
          from { opacity:0; transform:translateY(-6px); }
          to   { opacity:1; transform:translateY(0); }
        }
      `}</style>
      <div style={{
        width:"100%", borderRadius:24, position:"relative", overflow:"hidden",
        background:`linear-gradient(165deg, rgba(${WINE},0.10) 0%, rgba(${INK},1) 45%, rgba(8,3,5,1) 100%)`,
        border:`1px solid rgba(${GOLD},${pulse?0.34:0.20})`,
        boxShadow: pulse ? `0 0 0 1px rgba(${GOLD},0.12), 0 18px 40px rgba(0,0,0,0.5)` : `0 14px 32px rgba(0,0,0,0.4)`,
        animation:`fadeSlideUp ${MOTION_DURATION}ms ${MOTION_EASE} ${index*55}ms both`,
        transition:`box-shadow 0.6s ease, border-color 0.6s ease, padding ${MOTION_DURATION}ms ${MOTION_EASE}, min-height ${MOTION_DURATION}ms ${MOTION_EASE}`,
        padding: open ? "18px 18px 16px" : "30px 26px 26px",
        minHeight: open ? "auto" : 300,
      }}>
        {!open && <LevelWatermark nameRu={lvl.nameRu} nameEn={lvl.nameEn} lang={lang} iconId={lvl.iconId} color={lvl.color} />}
        <div style={{position:"absolute",top:0,left:"14%",right:"14%",height:1,background:`linear-gradient(90deg,transparent,rgba(${GOLD},0.32),transparent)`,pointerEvents:"none"}}/>

        <button onClick={toggle} style={{ all:"unset", display:"flex", flexDirection:"column", width:"100%", height: open?"auto":"100%", cursor:"pointer", position:"relative", zIndex:1 }}>
          {!open ? (
            <>
              <span style={{fontFamily:SANS,fontSize:11,fontWeight:600,color:`rgba(${IVORY},0.34)`,letterSpacing:"0.20em",textTransform:"uppercase",marginBottom:"auto"}}>{t.title}</span>

              {/* centerpiece: quiet ring, serif score, italic level name — no glow */}
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:14,margin:"22px 0 24px"}}>
                <div style={{position:"relative",width:168,height:168,flexShrink:0}}>
                  <Ring progress={prog} color={lvl.color} size={168}/>
                  <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2}}>
                    <span style={{fontFamily:SERIF,fontWeight:600,fontSize:56,color:`rgba(${IVORY},0.96)`,lineHeight:1,letterSpacing:"-0.01em"}}>{score}</span>
                    <span style={{fontFamily:SANS,fontSize:10,color:`rgba(${IVORY},0.30)`,letterSpacing:"0.14em",textTransform:"uppercase",marginTop:2}}>{t.pts}</span>
                  </div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <LevelGlyph id={lvl.iconId} color={lvl.color} size={15} opacity={0.85}/>
                  <span style={{fontFamily:SERIF,fontStyle:"italic",fontWeight:600,fontSize:19,color:lvl.color,letterSpacing:"0.01em"}}>{lang==="ru"?lvl.nameRu:lvl.nameEn}</span>
                </div>
              </div>

              {/* progress + next level, understated */}
              <div style={{marginBottom:16}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:7}}>
                  <span style={{fontFamily:SANS,fontSize:10,color:`rgba(${IVORY},0.28)`,letterSpacing:"0.10em",textTransform:"uppercase"}}>
                    {nextLvl?t.progress:t.maxLevel}
                  </span>
                  {nextLvl && <span style={{fontFamily:SERIF,fontStyle:"italic",fontSize:13,color:`rgba(${IVORY},0.55)`}}>{lang==="ru"?nextLvl.nameRu:nextLvl.nameEn}</span>}
                </div>
                <div style={{height:2,borderRadius:99,background:`rgba(${IVORY},0.08)`,overflow:"hidden"}}>
                  <div style={{height:"100%",borderRadius:99,width:`${Math.round(prog*100)}%`,background:`rgb(${GOLD})`,transition:`width 1.1s ${MOTION_EASE}`}}/>
                </div>
              </div>

              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                {data.streakDays>0?(
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <StatGlyph id="streak" color={`rgba(${GOLD},0.85)`} size={14}/>
                    <span style={{fontFamily:SANS,fontWeight:500,fontSize:11,color:`rgba(${GOLD},0.85)`}}>{t.streak(data.streakDays)}</span>
                  </div>
                ):(
                  <span style={{fontFamily:SANS,fontSize:11,color:`rgba(${IVORY},0.22)`}}>{t.noStreak}</span>
                )}
                <span onClick={openDetails} role="button" aria-label={t.detailsHint} style={{
                  fontFamily:SANS,fontSize:10,color:`rgba(${IVORY},0.30)`,letterSpacing:"0.06em",
                  textDecoration:"underline",textUnderlineOffset:3,textDecorationColor:`rgba(${IVORY},0.16)`,cursor:"pointer",
                }}>
                  {t.detailsHint}
                </span>
              </div>

              <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:4,marginTop:18}}>
                <span style={{fontFamily:SANS,fontSize:9,color:`rgba(${IVORY},0.20)`,letterSpacing:"0.08em"}}>{t.tapHint}</span>
              </div>
            </>
          ) : (
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <LevelGlyph id={lvl.iconId} color={lvl.color} size={16} opacity={0.85}/>
                <span style={{fontFamily:SERIF,fontWeight:600,fontSize:22,color:`rgba(${IVORY},0.95)`}}>{score}</span>
                <span style={{fontFamily:SERIF,fontStyle:"italic",fontWeight:600,fontSize:13,color:lvl.color}}>{lang==="ru"?lvl.nameRu:lvl.nameEn}</span>
              </div>
              <span style={{fontFamily:SANS,fontSize:10,color:`rgba(${IVORY},0.32)`,display:"flex",alignItems:"center",gap:4}}>
                {t.collapseHint}
                <svg width={8} height={8} viewBox="0 0 24 24" fill="none" stroke={`rgba(${IVORY},0.4)`} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
              </span>
            </div>
          )}
        </button>

        {open && (
          <div style={{ marginTop:14, display:"flex", flexDirection:"column", gap:9, position:"relative", zIndex:1, animation:`categoriesIn ${MOTION_DURATION}ms ${MOTION_EASE} both` }}>
            {children}
          </div>
        )}
      </div>
      {modalOpen&&<IntimacyModal lang={lang} data={data} onClose={()=>setModalOpen(false)}/>}
    </>
  );
}
