import { useState, useEffect, useRef, useCallback } from "react";
import { loadLocal, getLevel, getLevelProgress, LEVELS, type IntimacyLocal } from "@/data/intimacy";
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
    decay:"−5% за пропуск дня (макс. 50 бал.)", tapHint:"нажмите для деталей",
  },
  en: { title:"Intimacy Index", level:"Level",
    streak:(n:number)=>`${n} day${n===1?"":"s"} streak`,
    tasks:(n:number)=>`${n} task${n===1?"":"s"} done`,
    noStreak:"Complete your first task", progress:"To next level",
    maxLevel:"Highest level!", history:"7 days", noHistory:"Complete your first task together",
    close:"Close", today:"today", yesterday:"yest.", pts:"pts",
    decay:"−5% per missed day (max 50 pts)", tapHint:"tap for details",
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
              <span style={{fontSize:22}}>{lvl.icon}</span>
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
          {[{icon:"🔥",main:data.streakDays>0?t.streak(data.streakDays):t.noStreak},{icon:"✓",main:t.tasks(data.totalTasks)}].map((item,i)=>(
            <div key={i} style={{padding:"13px 14px",borderRadius:16,background:`rgba(${PR},${PG},${PB},0.07)`,border:`1px solid rgba(${PR},${PG},${PB},0.14)`}}>
              <div style={{fontSize:18,marginBottom:5}}>{item.icon}</div>
              <div style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontWeight:700,fontSize:13,color:"rgba(255,238,248,0.88)",lineHeight:1.35}}>{item.main}</div>
            </div>
          ))}
        </div>
        {/* Decay */}
        <div style={{marginBottom:16,padding:"10px 14px",borderRadius:14,background:"rgba(255,238,248,0.03)",border:"1px solid rgba(255,238,248,0.06)",display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:15}}>📉</span>
          <span style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:12,color:"rgba(255,238,248,0.30)",lineHeight:1.4}}>{t.decay}</span>
        </div>
        {/* Progress bar */}
        <div style={{marginBottom:20}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <span style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:11,color:"rgba(255,238,248,0.32)",letterSpacing:"0.06em",textTransform:"uppercase"}}>{nextLvl?t.progress:t.maxLevel}</span>
            {nextLvl&&<span style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:12,color:lvl.color}}>{nextLvl.icon} {lang==="ru"?nextLvl.nameRu:nextLvl.nameEn}</span>}
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
                  <span style={{fontSize:15,width:22,textAlign:"center"}}>{l.icon}</span>
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

interface IntimacyIndexProps { lang:Lang; refreshKey?:number; index?:number; }

export default function IntimacyIndex({lang,refreshKey=0,index=0}:IntimacyIndexProps) {
  const [data,setData]=useState<IntimacyLocal>(()=>loadLocal());
  const [open,setOpen]=useState(false);
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

  const handleOpen=useCallback(()=>{
    setOpen(true);
    (window.Telegram?.WebApp as {HapticFeedback?:{impactOccurred:(s:string)=>void}})?.HapticFeedback?.impactOccurred("medium");
  },[]);

  return (
    <>
      <button onClick={handleOpen} style={{
        width:"100%",textAlign:"left",cursor:"pointer",
        background:`linear-gradient(135deg,rgba(${rgb},0.16) 0%,rgba(${PR},${PG},${PB},0.06) 55%,rgba(0,0,0,0) 100%)`,
        border:`1px solid rgba(${rgb},0.35)`,borderRadius:22,padding:"18px 20px 16px",
        animation:`fadeSlideUp .42s cubic-bezier(.22,1,.36,1) ${index*55}ms both`,
        boxShadow:pulse?`0 0 44px rgba(${rgb},0.45),0 0 88px rgba(${rgb},0.18)`:`0 0 28px rgba(${rgb},0.18),0 0 56px rgba(${PR},${PG},${PB},0.07)`,
        position:"relative",overflow:"hidden",transition:"box-shadow 0.55s ease",
      }}>
        {/* bg orb */}
        <div style={{position:"absolute",top:-60,right:-40,width:200,height:200,borderRadius:"50%",background:`radial-gradient(circle,rgba(${rgb},0.20) 0%,transparent 68%)`,pointerEvents:"none",transition:"background 1s"}}/>
        {/* shimmer line */}
        <div style={{position:"absolute",top:0,left:"8%",right:"8%",height:1,background:`linear-gradient(90deg,transparent,rgba(${rgb},0.72),transparent)`,pointerEvents:"none"}}/>

        {/* Row 1: title + level badge */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
          <span style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:11,fontWeight:600,color:"rgba(255,238,248,0.40)",letterSpacing:"0.13em",textTransform:"uppercase"}}>{t.title}</span>
          <div style={{display:"flex",alignItems:"center",gap:6,padding:"4px 11px",borderRadius:99,background:`rgba(${rgb},0.15)`,border:`1px solid rgba(${rgb},0.32)`}}>
            <span style={{fontSize:13}}>{lvl.icon}</span>
            <span style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontWeight:700,fontSize:12,color:lvl.color,textShadow:`0 0 10px ${lvl.color}`}}>{lang==="ru"?lvl.nameRu:lvl.nameEn}</span>
          </div>
        </div>

        {/* Row 2: big score + streak */}
        <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",marginBottom:14}}>
          <div style={{display:"flex",alignItems:"baseline",gap:6}}>
            <span style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontWeight:900,fontSize:54,color:"rgba(255,238,248,0.97)",lineHeight:1,letterSpacing:"-0.04em",textShadow:`0 0 32px rgba(${rgb},0.42)`}}>{score}</span>
            <span style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:14,color:"rgba(255,238,248,0.26)",paddingBottom:4}}>{lang==="ru"?"бал.":"pts"}</span>
          </div>
          {data.streakDays>0?(
            <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:2,paddingBottom:4}}>
              <span style={{fontSize:24}}>🔥</span>
              <span style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontWeight:700,fontSize:13,color:"rgba(255,185,60,0.92)"}}>{t.streak(data.streakDays)}</span>
            </div>
          ):(
            <div style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:12,color:"rgba(255,238,248,0.20)",maxWidth:110,textAlign:"right",lineHeight:1.4,paddingBottom:4}}>{t.noStreak}</div>
          )}
        </div>

        {/* Row 3: progress bar */}
        <div style={{marginBottom:10}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
            <span style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:11,color:"rgba(255,238,248,0.26)"}}>
              {nextLvl?`${lang==="ru"?nextLvl.nameRu:nextLvl.nameEn} ${nextLvl.icon}`:t.maxLevel}
            </span>
            <span style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:11,color:"rgba(255,238,248,0.20)"}}>{nextLvl?`${data.score} / ${nextLvl.min}`:""}</span>
          </div>
          <div style={{height:5,borderRadius:99,background:"rgba(255,238,248,0.07)",overflow:"hidden"}}>
            <div style={{height:"100%",borderRadius:99,width:`${Math.round(prog*100)}%`,background:`linear-gradient(90deg,rgba(${PR},${PG},${PB},0.55),${lvl.color})`,boxShadow:`0 0 10px ${lvl.color}`,transition:"width 1.2s cubic-bezier(.22,1,.36,1)"}}/>
          </div>
        </div>

        {/* Row 4: tap hint */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"flex-end",gap:4}}>
          <span style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:10,color:"rgba(255,238,248,0.16)",letterSpacing:"0.05em"}}>{t.tapHint}</span>
          <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke={`rgba(${PR},${PG},${PB},0.32)`} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </div>
      </button>
      {open&&<IntimacyModal lang={lang} data={data} onClose={()=>setOpen(false)}/>}
    </>
  );
}
