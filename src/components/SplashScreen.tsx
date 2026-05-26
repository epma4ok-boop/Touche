import { useEffect, useRef, useState } from "react";
import { playHeartbeat } from "@/hooks/useSensualSound";

interface Props { onDone: () => void; linkStatus?: "idle"|"linking"|"linked"|"error"; }

function ECGLine({ visible }: { visible: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const raf = useRef<number>(0);
  useEffect(() => {
    if (!visible) return;
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    const W = canvas.width, H = canvas.height, cy = H / 2;
    const beats: [number,number][] = [
      [0,0],[0.04,0],[0.07,-0.08],[0.10,0],
      [0.11,-0.06],[0.14,0.55],[0.17,-0.32],[0.20,0.08],[0.24,0],
      [0.35,0],[0.38,-0.08],[0.41,0],
      [0.42,-0.06],[0.45,0.55],[0.48,-0.32],[0.51,0.08],[0.55,0],
      [0.66,0],[0.69,-0.08],[0.72,0],
      [0.73,-0.06],[0.76,0.55],[0.79,-0.32],[0.82,0.08],[0.88,0],
      [1.0,0],
    ];
    function getY(px: number): number {
      for (let i = 0; i < beats.length - 1; i++) {
        const [x0,y0]=beats[i],[x1,y1]=beats[i+1];
        if (px>=x0&&px<=x1) { const t=(px-x0)/(x1-x0); return cy-(y0+(y1-y0)*t)*(H*.38); }
      }
      return cy;
    }
    let start: number|null = null;
    const dur = 2400;
    function draw(ts: number) {
      if (!start) start = ts;
      const p = Math.min((ts-start)/dur, 1);
      ctx!.clearRect(0,0,W,H);
      const tail = Math.max(0, p - 0.22);
      const grad = ctx!.createLinearGradient(tail*W,0,p*W,0);
      grad.addColorStop(0,"rgba(255,255,255,0)");
      grad.addColorStop(.5,"rgba(210,80,130,.45)");
      grad.addColorStop(1,"rgba(230,100,150,.95)");
      ctx!.beginPath(); ctx!.strokeStyle=grad; ctx!.lineWidth=2.2; ctx!.lineCap="round"; ctx!.lineJoin="round";
      let s=false;
      for (let i=0;i<=200;i++) {
        const px=tail+(p-tail)*(i/200); const x=px*W,y=getY(px);
        if(!s){ctx!.moveTo(x,y);s=true;}else ctx!.lineTo(x,y);
      }
      ctx!.stroke();
      const hx=p*W,hy=getY(p);
      const g=ctx!.createRadialGradient(hx,hy,0,hx,hy,12);
      g.addColorStop(0,"rgba(240,110,160,.95)"); g.addColorStop(1,"rgba(0,0,0,0)");
      ctx!.beginPath(); ctx!.fillStyle=g; ctx!.arc(hx,hy,12,0,Math.PI*2); ctx!.fill();
      if (p<1) raf.current=requestAnimationFrame(draw);
    }
    raf.current=requestAnimationFrame(draw);
    return ()=>cancelAnimationFrame(raf.current);
  },[visible]);
  return <canvas ref={ref} width={280} height={56} style={{width:280,height:56,opacity:visible?1:0,transition:"opacity .5s"}}/>;
}

export default function SplashScreen({ onDone, linkStatus="idle" }: Props) {
  const [phase, setPhase] = useState<"enter"|"show"|"exit">("enter");
  const [ecgVisible, setEcgVisible] = useState(false);
  const doneCalled = useRef(false);

  useEffect(() => {
    const t1 = setTimeout(()=>setPhase("show"), 60);
    const t2 = setTimeout(()=>{ playHeartbeat(false); setEcgVisible(true); }, 480);
    const isLinking = linkStatus==="linking";
    const t3 = setTimeout(()=>setPhase("exit"),  isLinking ? 99999 : 3000);
    const t4 = setTimeout(()=>{ if(!doneCalled.current){doneCalled.current=true;onDone();} }, isLinking ? 99999 : 3450);
    return ()=>{ clearTimeout(t1);clearTimeout(t2);clearTimeout(t3);clearTimeout(t4); };
  }, []);

  useEffect(() => {
    if ((linkStatus==="linked"||linkStatus==="error") && !doneCalled.current) {
      setTimeout(()=>setPhase("exit"), 300);
      setTimeout(()=>{ if(!doneCalled.current){doneCalled.current=true;onDone();} }, 750);
    }
  }, [linkStatus, onDone]);

  const opacity = phase==="show" ? 1 : 0;
  const ty = phase==="show" ? 0 : phase==="enter" ? 18 : -10;

  const statusMsg =
    linkStatus==="linking" ? "Соединяем пару…" :
    linkStatus==="linked"  ? "Пара соединена 💕" :
    linkStatus==="error"   ? "Попробуй позже" : "";

  return (
    <div style={{
      position:"fixed",inset:0,display:"flex",flexDirection:"column",
      alignItems:"center",justifyContent:"center",overflow:"hidden",
      background:"radial-gradient(ellipse 130% 110% at 50% 58%, #2a0a18 0%, #1a0610 50%, #0e040a 100%)",
    }}>
      {/* Background pulse rings */}
      <div style={{position:"absolute",width:340,height:340,borderRadius:"50%",
        border:"1px solid rgba(200,60,100,.10)",animation:"bgPulse 3.2s ease-in-out infinite",
        top:"50%",left:"50%",transform:"translate(-50%,-50%)"}}/>
      <div style={{position:"absolute",width:230,height:230,borderRadius:"50%",
        border:"1px solid rgba(200,60,100,.08)",animation:"bgPulse 3.2s ease-in-out .9s infinite",
        top:"50%",left:"50%",transform:"translate(-50%,-50%)"}}/>
      <div style={{position:"absolute",width:150,height:150,borderRadius:"50%",
        border:"1px solid rgba(200,60,100,.06)",animation:"bgPulse 3.2s ease-in-out 1.7s infinite",
        top:"50%",left:"50%",transform:"translate(-50%,-50%)"}}/>

      {/* Main content */}
      <div style={{
        display:"flex",flexDirection:"column",alignItems:"center",gap:0,
        opacity,transform:`translateY(${ty}px)`,
        transition:"opacity .6s ease, transform .6s cubic-bezier(.22,1,.36,1)",
      }}>
        {/* Lips — transparent PNG floats on dark background */}
        <div style={{ position:"relative", flexShrink:0, marginBottom: -4 }}>
          {/* Radial glow underneath */}
          <div style={{
            position:"absolute", inset:"-20%",
            background:"radial-gradient(ellipse 70% 55% at 50% 60%, rgba(195,42,88,.30) 0%, transparent 70%)",
            filter:"blur(16px)",
            pointerEvents:"none",
          }}/>
          <img
            src="/images/splash-lips.png"
            alt=""
            draggable={false}
            style={{
              width:220, height:220,
              objectFit:"contain",
              position:"relative", zIndex:1,
              filter:"drop-shadow(0 4px 32px rgba(195,42,88,.55)) drop-shadow(0 0 12px rgba(215,60,110,.30))",
              userSelect:"none",
            }}
          />
        </div>

        {/* App name */}
        <div style={{textAlign:"center",zIndex:2}}>
          <p style={{
            fontFamily:"'Plus Jakarta Sans',sans-serif",fontWeight:700,fontSize:44,
            letterSpacing:"-0.038em",color:"rgba(255,238,246,.97)",
            margin:0,lineHeight:1,
            textShadow:"0 0 48px rgba(210,60,110,.40), 0 2px 12px rgba(0,0,0,.50)",
          }}>Touché</p>
          <p style={{
            fontFamily:"'Plus Jakarta Sans',sans-serif",fontWeight:300,fontSize:10,
            letterSpacing:"0.34em",textTransform:"uppercase",
            color:"rgba(220,120,160,.52)",margin:"13px 0 0",
          }}>for two</p>
        </div>

        {/* ECG / link status */}
        <div style={{marginTop:28,height:60,display:"flex",alignItems:"center",justifyContent:"center",width:"100%"}}>
          {statusMsg ? (
            <p style={{
              fontFamily:"'Plus Jakarta Sans',sans-serif",fontWeight:400,fontSize:13,
              letterSpacing:"0.05em",
              color:linkStatus==="linked"?"rgba(220,140,170,.95)":"rgba(210,120,150,.60)",
              margin:0,transition:"color .4s",
            }}>{statusMsg}</p>
          ) : (
            <ECGLine visible={ecgVisible}/>
          )}
        </div>
      </div>

      <style>{`
        @keyframes bgPulse {
          0%,100% { opacity:.4; transform:translate(-50%,-50%) scale(1); }
          50%      { opacity:.9; transform:translate(-50%,-50%) scale(1.07); }
        }
      `}</style>
    </div>
  );
}
