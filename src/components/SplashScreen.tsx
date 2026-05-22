import { useEffect, useRef, useState } from "react";
import { playHeartbeat } from "@/hooks/useSensualSound";

interface SplashScreenProps {
  onDone: () => void;
  linkStatus?: "idle" | "linking" | "linked" | "error";
}

function HeartbeatLine({ color, visible }: { color: string; visible: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  useEffect(() => {
    if (!visible) return;
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    const W = canvas.width, H = canvas.height, cy = H / 2;
    const ecg: [number, number][] = [
      [0,0],[0.15,0],[0.20,-0.12],[0.25,0],[0.30,-0.08],[0.35,0.60],
      [0.40,-0.35],[0.44,0.10],[0.50,0],[0.55,0],[0.60,-0.12],[0.65,0],
      [0.70,-0.08],[0.75,0.60],[0.80,-0.35],[0.84,0.10],[0.90,0],[1.0,0],
    ];
    function getY(px: number) {
      for (let i = 0; i < ecg.length - 1; i++) {
        const [x0,y0]=ecg[i],[x1,y1]=ecg[i+1];
        if (px>=x0&&px<=x1) { const t=(px-x0)/(x1-x0); return cy-(y0+(y1-y0)*t)*(H*0.28); }
      }
      return cy;
    }
    let start: number|null = null;
    function draw(ts: number) {
      if (!start) start = ts;
      const p = Math.min((ts-start)/1600, 1);
      ctx!.clearRect(0,0,W,H);
      const tail = Math.max(0,p-0.3);
      const grad = ctx!.createLinearGradient(tail*W,0,p*W,0);
      grad.addColorStop(0,"rgba(255,255,255,0)");
      grad.addColorStop(0.6,color.replace(")",",.55)").replace("rgb","rgba"));
      grad.addColorStop(1,color);
      ctx!.beginPath(); ctx!.strokeStyle=grad; ctx!.lineWidth=2; ctx!.lineCap="round";
      let s=false;
      for (let i=0;i<=120;i++) { const px=tail+(p-tail)*(i/120); const x=px*W,y=getY(px); if(!s){ctx!.moveTo(x,y);s=true;}else ctx!.lineTo(x,y); }
      ctx!.stroke();
      const hx=p*W,hy=getY(p);
      const g2=ctx!.createRadialGradient(hx,hy,0,hx,hy,10);
      g2.addColorStop(0,color.replace(")",",.9)").replace("rgb","rgba")); g2.addColorStop(1,"rgba(0,0,0,0)");
      ctx!.beginPath(); ctx!.fillStyle=g2; ctx!.arc(hx,hy,10,0,Math.PI*2); ctx!.fill();
      if (p<1) animRef.current=requestAnimationFrame(draw);
    }
    animRef.current=requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  },[visible,color]);
  return <canvas ref={canvasRef} width={260} height={60} style={{width:260,height:60,opacity:visible?1:0,transition:"opacity .4s"}} />;
}

export default function SplashScreen({ onDone, linkStatus="idle" }: SplashScreenProps) {
  const [phase, setPhase] = useState<"enter"|"show"|"exit">("enter");
  const [beatVisible, setBeatVisible] = useState(false);
  const doneCalled = useRef(false);

  useEffect(() => {
    const t1 = setTimeout(()=>setPhase("show"), 80);
    const t2 = setTimeout(()=>{ playHeartbeat(false); setBeatVisible(true); }, 500);
    const isLinking = linkStatus === "linking";
    const t3 = setTimeout(()=>setPhase("exit"), isLinking ? 99999 : 2600);
    const t4 = setTimeout(()=>{ if(!doneCalled.current){doneCalled.current=true;onDone();} }, isLinking ? 99999 : 3050);
    return ()=>{ clearTimeout(t1);clearTimeout(t2);clearTimeout(t3);clearTimeout(t4); };
  }, []);

  useEffect(() => {
    if ((linkStatus==="linked"||linkStatus==="error") && !doneCalled.current) {
      setTimeout(()=>setPhase("exit"), 200);
      setTimeout(()=>{ if(!doneCalled.current){doneCalled.current=true;onDone();} }, 650);
    }
  }, [linkStatus, onDone]);

  const opacity = phase==="show" ? 1 : 0;
  const scale   = phase==="show" ? 1 : phase==="enter" ? 0.97 : 1.02;

  const statusMsg =
    linkStatus==="linking" ? "Соединяем пару…" :
    linkStatus==="linked"  ? "Пара соединена 💕" :
    linkStatus==="error"   ? "Попробуй ещё раз" : "";

  return (
    <div style={{position:"fixed",inset:0,background:"linear-gradient(160deg,#1a0810 0%,#2d0820 40%,#1a0510 100%)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",overflow:"hidden"}}>
      <div style={{position:"absolute",inset:0,pointerEvents:"none",background:"radial-gradient(ellipse 70% 55% at 50% 45%,rgba(180,20,80,.25) 0%,transparent 70%)"}} />
      <div style={{position:"relative",width:"100%",maxWidth:340,opacity,transform:`scale(${scale})`,transition:"opacity .55s ease,transform .55s cubic-bezier(.22,1,.36,1)",display:"flex",flexDirection:"column",alignItems:"center"}}>
        <div style={{width:240,height:240,flexShrink:0}}>
          <svg viewBox="0 0 240 240" width="240" height="240" style={{overflow:"visible"}}>
            <defs>
              <radialGradient id="hg" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(200,40,90,.18)"/>
                <stop offset="100%" stopColor="transparent"/>
              </radialGradient>
              <radialGradient id="tg" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(255,140,180,.50)"/>
                <stop offset="100%" stopColor="transparent"/>
              </radialGradient>
            </defs>
            <ellipse cx="120" cy="125" rx="85" ry="70" fill="url(#hg)"/>
            <g transform="rotate(-38,120,120)">
              <path d="M60,30 C55,28 50,32 50,38 L52,105 C52,110 56,114 62,114 L80,114 C86,114 90,110 90,105 L88,38 C88,32 83,28 78,30 Z" fill="rgba(140,20,55,.88)" stroke="rgba(180,60,100,.35)" strokeWidth=".8"/>
              <path d="M62,38 C60,38 58,36 58,32 L58,12 C58,8 62,6 65,8 L67,32 C68,36 66,38 64,38 Z" fill="rgba(145,22,58,.90)" stroke="rgba(180,60,100,.3)" strokeWidth=".7"/>
              <path d="M70,37 C68,37 66,35 66,31 L66,6 C66,2 70,0 73,2 L75,31 C76,35 74,37 72,37 Z" fill="rgba(148,24,60,.90)" stroke="rgba(180,60,100,.3)" strokeWidth=".7"/>
              <path d="M78,38 C76,38 74,36 74,32 L74,10 C74,6 78,4 81,6 L82,32 C83,36 81,38 79,38 Z" fill="rgba(143,21,56,.88)" stroke="rgba(180,60,100,.3)" strokeWidth=".7"/>
              <path d="M85,41 C83,41 81,39 81,35 L81,20 C81,16 85,15 87,17 L88,35 C89,39 87,41 86,41 Z" fill="rgba(138,18,53,.85)" stroke="rgba(180,60,100,.3)" strokeWidth=".7"/>
              <path d="M55,60 C50,58 46,62 48,67 L54,86 C56,91 61,92 64,88 L68,70 C69,65 63,58 57,60 Z" fill="rgba(140,20,55,.87)" stroke="rgba(180,60,100,.3)" strokeWidth=".7"/>
              <rect x="53" y="95" width="36" height="5" rx="2.5" fill="none" stroke="rgba(210,120,140,.60)" strokeWidth="1.5"/>
            </g>
            <g transform="rotate(142,120,120)">
              <path d="M60,30 C55,28 50,32 50,38 L52,105 C52,110 56,114 62,114 L80,114 C86,114 90,110 90,105 L88,38 C88,32 83,28 78,30 Z" fill="rgba(120,15,48,.82)" stroke="rgba(160,50,85,.30)" strokeWidth=".8"/>
              <path d="M62,38 C60,38 58,36 58,32 L58,12 C58,8 62,6 65,8 L67,32 C68,36 66,38 64,38 Z" fill="rgba(125,16,50,.83)" stroke="rgba(160,50,85,.25)" strokeWidth=".7"/>
              <path d="M70,37 C68,37 66,35 66,31 L66,6 C66,2 70,0 73,2 L75,31 C76,35 74,37 72,37 Z" fill="rgba(128,18,52,.83)" stroke="rgba(160,50,85,.25)" strokeWidth=".7"/>
              <path d="M78,38 C76,38 74,36 74,32 L74,10 C74,6 78,4 81,6 L82,32 C83,36 81,38 79,38 Z" fill="rgba(123,15,49,.82)" stroke="rgba(160,50,85,.25)" strokeWidth=".7"/>
              <path d="M85,41 C83,41 81,39 81,35 L81,20 C81,16 85,15 87,17 L88,35 C89,39 87,41 86,41 Z" fill="rgba(118,13,46,.79)" stroke="rgba(160,50,85,.25)" strokeWidth=".7"/>
              <path d="M55,60 C50,58 46,62 48,67 L54,86 C56,91 61,92 64,88 L68,70 C69,65 63,58 57,60 Z" fill="rgba(120,15,48,.80)" stroke="rgba(160,50,85,.25)" strokeWidth=".7"/>
              <circle cx="70" cy="102" r="3.5" fill="none" stroke="rgba(210,120,140,.55)" strokeWidth="1.4"/>
            </g>
            <ellipse cx="120" cy="118" rx="22" ry="22" fill="url(#tg)">
              <animate attributeName="rx" values="18;26;18" dur="2.4s" repeatCount="indefinite"/>
              <animate attributeName="ry" values="18;26;18" dur="2.4s" repeatCount="indefinite"/>
              <animate attributeName="opacity" values=".7;1;.7" dur="2.4s" repeatCount="indefinite"/>
            </ellipse>
          </svg>
        </div>
        <div style={{textAlign:"center",marginTop:-8}}>
          <p style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontWeight:700,fontSize:38,letterSpacing:"-0.03em",color:"rgba(255,240,248,.96)",margin:0,lineHeight:1}}>Touché</p>
          <p style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontWeight:300,fontSize:11,letterSpacing:"0.28em",textTransform:"uppercase",color:"rgba(220,130,160,.65)",margin:"10px 0 0"}}>for two</p>
        </div>
        <div style={{marginTop:28,height:60,display:"flex",alignItems:"center",justifyContent:"center"}}>
          {statusMsg ? (
            <p style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontWeight:400,fontSize:13,letterSpacing:"0.06em",color:linkStatus==="linked"?"rgba(220,140,170,.90)":"rgba(220,140,170,.60)",margin:0,transition:"color .4s"}}>{statusMsg}</p>
          ) : (
            <HeartbeatLine color="rgb(210,80,130)" visible={beatVisible} />
          )}
        </div>
      </div>
    </div>
  );
}
