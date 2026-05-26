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

// Stylised lips — shy one-sided bite
function LipsIllustration() {
  return (
    <svg viewBox="0 0 260 160" width="260" height="160" style={{ overflow: "visible" }}>
      <defs>
        {/* Lip body gradient */}
        <radialGradient id="lipMain" cx="50%" cy="40%" r="60%">
          <stop offset="0%"   stopColor="rgba(235,90,128,.95)"/>
          <stop offset="55%"  stopColor="rgba(195,48,88,.90)"/>
          <stop offset="100%" stopColor="rgba(148,22,60,.85)"/>
        </radialGradient>
        {/* Upper lip shade — slightly darker */}
        <radialGradient id="lipUpper" cx="50%" cy="60%" r="55%">
          <stop offset="0%"   stopColor="rgba(210,65,105,.92)"/>
          <stop offset="100%" stopColor="rgba(155,28,65,.88)"/>
        </radialGradient>
        {/* Gloss highlight */}
        <radialGradient id="gloss" cx="42%" cy="30%" r="45%">
          <stop offset="0%"   stopColor="rgba(255,195,215,.72)"/>
          <stop offset="60%"  stopColor="rgba(255,160,190,.18)"/>
          <stop offset="100%" stopColor="rgba(255,140,175,0)"/>
        </radialGradient>
        {/* Lower lip gloss */}
        <radialGradient id="glossLow" cx="35%" cy="38%" r="50%">
          <stop offset="0%"   stopColor="rgba(255,185,210,.55)"/>
          <stop offset="100%" stopColor="rgba(255,140,175,0)"/>
        </radialGradient>
        {/* Outer ambient glow */}
        <radialGradient id="lipsGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="rgba(210,60,105,.22)"/>
          <stop offset="100%" stopColor="rgba(0,0,0,0)"/>
        </radialGradient>
        <filter id="lipBlur">
          <feGaussianBlur stdDeviation="1.0"/>
        </filter>
        <filter id="lipsGlowF">
          <feGaussianBlur stdDeviation="8" result="blur"/>
          <feComposite in="SourceGraphic" in2="blur" operator="over"/>
        </filter>
      </defs>

      {/* Ambient glow behind lips */}
      <ellipse cx="130" cy="82" rx="112" ry="58" fill="url(#lipsGlow)" filter="url(#lipBlur)"/>

      {/* ── UPPER LIP ─────────────────────────────────────── */}
      {/*
          Shape: classic Cupid's bow
          Left corner  → (38, 82)
          Left peak    → (88, 52)
          Center dip   → (130, 66)
          Right peak   → (172, 52)
          Right corner → (222, 82)
          Bottom line  → straight back to (38,82) with slight concave
      */}
      <path
        d="
          M 38 82
          C 55 82, 72 56, 88 52
          C 102 48, 118 62, 130 66
          C 142 62, 158 48, 172 52
          C 188 56, 205 82, 222 82
          C 205 80, 168 76, 130 76
          C 92 76, 55 80, 38 82
          Z
        "
        fill="url(#lipUpper)"
      />
      {/* Upper lip gloss overlay */}
      <path
        d="
          M 68 68
          C 85 55, 110 54, 130 66
          C 150 54, 175 55, 192 68
          C 175 62, 152 60, 130 66
          C 108 60, 85 62, 68 68
          Z
        "
        fill="url(#gloss)"
      />

      {/* ── TEETH — visible in the gap ──────────────────────── */}
      {/*
          A thin strip of teeth between upper and lower lips.
          Left half: normal gap, small teeth strip.
          Right half: teeth press down into lower lip — bite!
      */}
      {/* Teeth strip — left side, subtle */}
      <path
        d="M 72 76 C 95 77, 112 77, 130 77 L 130 82 C 112 82, 95 82, 72 82 Z"
        fill="rgba(255,248,245,.92)"
        opacity="0.70"
      />
      {/* Teeth strip — right side, more visible (biting side) */}
      <path
        d="M 130 76 C 150 76, 170 74, 190 72 L 193 80 C 172 82, 151 83, 130 82 Z"
        fill="rgba(255,250,248,.96)"
      />
      {/* Tooth dividers — right side, biting teeth */}
      <line x1="148" y1="75.5" x2="148" y2="82" stroke="rgba(220,190,200,.35)" strokeWidth="0.8"/>
      <line x1="164" y1="74"   x2="164" y2="81" stroke="rgba(220,190,200,.30)" strokeWidth="0.8"/>
      <line x1="180" y1="72.5" x2="180" y2="80" stroke="rgba(220,190,200,.25)" strokeWidth="0.8"/>

      {/* ── LOWER LIP ─────────────────────────────────────── */}
      {/*
          From left corner (38,82) → full round bottom (130,118) → right corner (222,82)
          Right side bitten: right portion (from ~155) curves back up more sharply,
          creating the bite indentation and exposing teeth pressing in.
      */}
      <path
        d="
          M 38 82
          C 60 82, 85 116, 130 118
          C 155 118, 152 100, 155 90
          C 160 83, 168 79, 178 77
          C 188 75, 200 75, 222 82
          C 205 82, 185 84, 175 87
          C 162 92, 158 102, 155 110
          C 150 122, 140 126, 130 126
          C 105 126, 72 110, 52 90
          C 44 84, 40 82, 38 82
          Z
        "
        fill="url(#lipMain)"
      />
      {/* Lower lip gloss */}
      <path
        d="
          M 68 96
          C 82 108, 105 120, 130 121
          C 148 121, 148 109, 150 100
          C 140 116, 110 118, 88 110
          C 78 106, 72 101, 68 96
          Z
        "
        fill="url(#glossLow)"
        opacity="0.65"
      />
      {/* Bite crease — subtle shadow where teeth press */}
      <path
        d="M 155 88 C 162 82, 172 79, 180 77"
        fill="none"
        stroke="rgba(140,28,58,.45)"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      {/* Teeth pressing into lower lip — indentation shadow */}
      <path
        d="M 152 82 C 158 80, 166 78, 174 77 C 182 76, 192 76, 200 78"
        fill="none"
        stroke="rgba(255,245,248,.28)"
        strokeWidth="2"
        strokeLinecap="round"
        filter="url(#lipBlur)"
      />

      {/* ── LIP CORNER SHADOWS ────────────────────────────── */}
      <ellipse cx="38"  cy="82" rx="7" ry="4" fill="rgba(120,18,45,.38)" filter="url(#lipBlur)"/>
      <ellipse cx="222" cy="82" rx="7" ry="4" fill="rgba(120,18,45,.38)" filter="url(#lipBlur)"/>

      {/* ── Animated shimmer sparkles ─────────────────────── */}
      <circle cx="94"  cy="58" r="1.8" fill="rgba(255,170,200,.80)">
        <animate attributeName="opacity" values=".4;1;.4" dur="2.2s" repeatCount="indefinite"/>
      </circle>
      <circle cx="166" cy="58" r="1.8" fill="rgba(255,170,200,.80)">
        <animate attributeName="opacity" values=".4;1;.4" dur="2.2s" begin="0.7s" repeatCount="indefinite"/>
      </circle>
      <circle cx="130" cy="44" r="2.2" fill="rgba(255,180,210,.85)">
        <animate attributeName="opacity" values=".3;.9;.3" dur="2.8s" repeatCount="indefinite"/>
      </circle>
      <circle cx="58"  cy="90" r="1.4" fill="rgba(220,90,140,.55)">
        <animate attributeName="opacity" values=".3;.8;.3" dur="3.0s" begin="1.1s" repeatCount="indefinite"/>
      </circle>
      <circle cx="202" cy="90" r="1.4" fill="rgba(220,90,140,.55)">
        <animate attributeName="opacity" values=".3;.8;.3" dur="3.0s" begin="0.4s" repeatCount="indefinite"/>
      </circle>
      <circle cx="130" cy="132" r="1.6" fill="rgba(210,75,120,.50)">
        <animate attributeName="opacity" values=".2;.7;.2" dur="2.6s" begin="1.5s" repeatCount="indefinite"/>
      </circle>

      {/* ── Ambient pulse ring ────────────────────────────── */}
      <ellipse cx="130" cy="95" rx="90" ry="48" fill="none" stroke="rgba(210,70,110,.18)" strokeWidth="1">
        <animate attributeName="rx"      values="72;108;72" dur="2.8s" repeatCount="indefinite"/>
        <animate attributeName="ry"      values="38;58;38"  dur="2.8s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values=".5;0;.5"   dur="2.8s" repeatCount="indefinite"/>
      </ellipse>
      <ellipse cx="130" cy="95" rx="55" ry="34" fill="none" stroke="rgba(225,90,130,.22)" strokeWidth="1">
        <animate attributeName="rx"      values="44;78;44"  dur="2.8s" begin="0.9s" repeatCount="indefinite"/>
        <animate attributeName="ry"      values="26;46;26"  dur="2.8s" begin="0.9s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values=".6;0;.6"   dur="2.8s" begin="0.9s" repeatCount="indefinite"/>
      </ellipse>
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
        {/* Lips illustration */}
        <div style={{flexShrink:0,marginBottom:-8}}>
          <LipsIllustration/>
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
