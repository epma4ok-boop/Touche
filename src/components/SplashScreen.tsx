import { useEffect, useRef, useState } from "react";
import { playHeartbeat } from "@/hooks/useSensualSound";

interface Props { onDone: () => void; linkStatus?: "idle"|"linking"|"linked"|"error"; }

// 3-beat ECG line animation
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

// Elegant double-heart illustration — no hands, pure elegance
function HeartIllustration() {
  return (
    <svg viewBox="0 0 260 240" width="260" height="240" style={{overflow:"visible"}}>
      <defs>
        {/* Main heart gradient — deep rose */}
        <radialGradient id="heartCore" cx="50%" cy="42%" r="55%">
          <stop offset="0%"   stopColor="rgba(235,90,130,.38)"/>
          <stop offset="60%"  stopColor="rgba(190,45,85,.20)"/>
          <stop offset="100%" stopColor="rgba(140,20,55,.08)"/>
        </radialGradient>
        {/* Outer ambient glow */}
        <radialGradient id="outerGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="rgba(210,60,105,.28)"/>
          <stop offset="100%" stopColor="rgba(0,0,0,0)"/>
        </radialGradient>
        {/* Petal shimmer */}
        <linearGradient id="petalShimmer" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="rgba(255,150,190,.65)"/>
          <stop offset="100%" stopColor="rgba(200,60,100,.40)"/>
        </linearGradient>
        <filter id="softBlur">
          <feGaussianBlur stdDeviation="1.2"/>
        </filter>
        <filter id="glow">
          <feGaussianBlur stdDeviation="4" result="blur"/>
          <feComposite in="SourceGraphic" in2="blur" operator="over"/>
        </filter>
      </defs>

      {/* ── Ambient background halo ── */}
      <ellipse cx="130" cy="130" rx="108" ry="92" fill="url(#outerGlow)"/>

      {/* ── Outer decorative rose petals (8-fold) ── */}
      {[0,45,90,135,180,225,270,315].map((deg, i) => (
        <ellipse key={i}
          cx={130 + Math.cos(deg*Math.PI/180)*72}
          cy={130 + Math.sin(deg*Math.PI/180)*72}
          rx="9" ry="22"
          transform={`rotate(${deg} ${130 + Math.cos(deg*Math.PI/180)*72} ${130 + Math.sin(deg*Math.PI/180)*72})`}
          fill={`rgba(200,60,100,${0.06 + (i%3)*0.02})`}
          filter="url(#softBlur)"
        />
      ))}

      {/* ── Outer heart — large, thin-stroke ── */}
      <path
        d="M 130 200
           C 55 158, 22 118, 22 84
           C 22 52, 48 30, 76 30
           C 98 30, 116 42, 130 60
           C 144 42, 162 30, 184 30
           C 212 30, 238 52, 238 84
           C 238 118, 205 158, 130 200 Z"
        fill="url(#heartCore)"
        stroke="rgba(210,75,115,.55)"
        strokeWidth="1.2"
      />

      {/* ── Mid heart — brighter inner fill ── */}
      <path
        d="M 130 180
           C 73 146, 46 114, 46 86
           C 46 62, 64 46, 86 49
           C 104 51, 120 63, 130 78
           C 140 63, 156 51, 174 49
           C 196 46, 214 62, 214 86
           C 214 114, 187 146, 130 180 Z"
        fill="rgba(220,75,115,.14)"
        stroke="rgba(230,95,135,.38)"
        strokeWidth="1"
      />

      {/* ── Inner heart — bright glowing core ── */}
      <path
        d="M 130 158
           C 92 134, 72 110, 72 90
           C 72 72, 86 60, 102 63
           C 116 65, 126 77, 130 88
           C 134 77, 144 65, 158 63
           C 174 60, 188 72, 188 90
           C 188 110, 168 134, 130 158 Z"
        fill="rgba(235,100,140,.22)"
        filter="url(#glow)"
      />

      {/* ── Bright center glow ── */}
      <circle cx="130" cy="105" r="30" fill="rgba(245,110,150,.16)" filter="url(#softBlur)"/>
      <circle cx="130" cy="105" r="14" fill="rgba(250,130,165,.28)"/>
      <circle cx="130" cy="105" r="6"  fill="rgba(255,155,185,.55)"/>

      {/* ── Highlight shimmer on top of outer heart ── */}
      <path
        d="M 76 50 C 90 38, 110 33, 130 52"
        fill="none" stroke="rgba(255,180,210,.45)" strokeWidth="2.5" strokeLinecap="round"
      />
      <path
        d="M 184 50 C 170 38, 150 33, 130 52"
        fill="none" stroke="rgba(255,180,210,.35)" strokeWidth="1.8" strokeLinecap="round"
      />

      {/* ── Floating sparkles ── */}
      {/* Top sparkles */}
      <circle cx="90"  cy="44"  r="1.8" fill="rgba(255,160,200,.75)"/>
      <circle cx="170" cy="44"  r="1.8" fill="rgba(255,160,200,.75)"/>
      <circle cx="130" cy="26"  r="2.2" fill="rgba(255,170,205,.85)">
        <animate attributeName="opacity" values=".5;1;.5" dur="2.4s" repeatCount="indefinite"/>
      </circle>
      {/* Side sparkles */}
      <circle cx="18"  cy="90"  r="1.5" fill="rgba(220,110,155,.60)"/>
      <circle cx="242" cy="90"  r="1.5" fill="rgba(220,110,155,.60)"/>
      <circle cx="24"  cy="118" r="1.2" fill="rgba(210,90,140,.45)"/>
      <circle cx="236" cy="118" r="1.2" fill="rgba(210,90,140,.45)"/>
      {/* Bottom sparkles */}
      <circle cx="80"  cy="178" r="1.4" fill="rgba(210,90,140,.50)"/>
      <circle cx="180" cy="178" r="1.4" fill="rgba(210,90,140,.50)"/>
      <circle cx="130" cy="208" r="1.8" fill="rgba(215,80,125,.55)">
        <animate attributeName="opacity" values=".4;.9;.4" dur="2.8s" repeatCount="indefinite"/>
      </circle>
      {/* Diagonal sparkles */}
      <circle cx="52"  cy="60"  r="1.3" fill="rgba(240,140,180,.55)"/>
      <circle cx="208" cy="60"  r="1.3" fill="rgba(240,140,180,.55)"/>
      <circle cx="46"  cy="148" r="1.2" fill="rgba(215,90,135,.45)"/>
      <circle cx="214" cy="148" r="1.2" fill="rgba(215,90,135,.45)"/>

      {/* ── Animated pulse ring ── */}
      <circle cx="130" cy="105" r="48" fill="none" stroke="rgba(220,80,120,.18)" strokeWidth="1">
        <animate attributeName="r"       values="38;68;38" dur="2.6s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values=".5;0;.5"  dur="2.6s" repeatCount="indefinite"/>
      </circle>
      <circle cx="130" cy="105" r="28" fill="none" stroke="rgba(230,100,140,.24)" strokeWidth="1">
        <animate attributeName="r"       values="22;52;22" dur="2.6s" begin="0.8s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values=".6;0;.6"  dur="2.6s" begin="0.8s" repeatCount="indefinite"/>
      </circle>
    </svg>
  );
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
        border:"1px solid rgba(200,60,100,.10)",
        animation:"bgPulse 3.2s ease-in-out infinite",
        top:"50%",left:"50%",transform:"translate(-50%,-50%)"}}/>
      <div style={{position:"absolute",width:230,height:230,borderRadius:"50%",
        border:"1px solid rgba(200,60,100,.08)",
        animation:"bgPulse 3.2s ease-in-out .9s infinite",
        top:"50%",left:"50%",transform:"translate(-50%,-50%)"}}/>
      <div style={{position:"absolute",width:150,height:150,borderRadius:"50%",
        border:"1px solid rgba(200,60,100,.06)",
        animation:"bgPulse 3.2s ease-in-out 1.7s infinite",
        top:"50%",left:"50%",transform:"translate(-50%,-50%)"}}/>

      {/* Main content */}
      <div style={{
        display:"flex",flexDirection:"column",alignItems:"center",gap:0,
        opacity,transform:`translateY(${ty}px)`,
        transition:"opacity .6s ease, transform .6s cubic-bezier(.22,1,.36,1)",
      }}>
        {/* Heart illustration */}
        <div style={{flexShrink:0,marginBottom:-16}}>
          <HeartIllustration/>
        </div>

        {/* App name */}
        <div style={{textAlign:"center",zIndex:2}}>
          <p style={{
            fontFamily:"'Plus Jakarta Sans',sans-serif",fontWeight:700,fontSize:44,
            letterSpacing:"-0.038em",color:"rgba(255,238,246,.97)",
            margin:0,lineHeight:1,
            textShadow:"0 0 48px rgba(210,60,110,.40), 0 2px 12px rgba(0,0,0,.50)",
          }}>
            Touché
          </p>
          <p style={{
            fontFamily:"'Plus Jakarta Sans',sans-serif",fontWeight:300,fontSize:10,
            letterSpacing:"0.34em",textTransform:"uppercase",
            color:"rgba(220,120,160,.52)",margin:"13px 0 0",
          }}>
            for two
          </p>
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
