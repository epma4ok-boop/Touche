import { useEffect, useRef, useState } from "react";
import { playHeartbeat } from "@/hooks/useSensualSound";

interface Props { onDone: () => void; linkStatus?: "idle"|"linking"|"linked"|"error"; }

// 3-beat ECG animation
function ECGLine({ visible }: { visible: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const raf = useRef<number>(0);
  useEffect(() => {
    if (!visible) return;
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    const W = canvas.width, H = canvas.height, cy = H / 2;
    // 3 QRS spikes across the canvas
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
      // glow dot
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

// Elegant minimal hands — two line-art arms reaching toward each other
function HandsIllustration() {
  return (
    <svg viewBox="0 0 320 280" width="320" height="280" style={{overflow:"visible"}}>
      <defs>
        <radialGradient id="centerGlow" cx="50%" cy="52%" r="30%">
          <stop offset="0%" stopColor="rgba(210,60,110,.45)"/>
          <stop offset="100%" stopColor="transparent"/>
        </radialGradient>
        <filter id="handBlur">
          <feGaussianBlur stdDeviation=".6"/>
        </filter>
        <linearGradient id="armLeft" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgba(180,50,90,.65)"/>
          <stop offset="100%" stopColor="rgba(150,30,70,.90)"/>
        </linearGradient>
        <linearGradient id="armRight" x1="100%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="rgba(160,25,65,.60)"/>
          <stop offset="100%" stopColor="rgba(130,20,55,.85)"/>
        </linearGradient>
      </defs>

      {/* Ambient center glow */}
      <ellipse cx="160" cy="146" rx="90" ry="70" fill="url(#centerGlow)"/>

      {/* LEFT ARM (from top-left) */}
      <path
        d="M 20 20
           C 40 30, 70 55, 95 85
           C 108 100, 118 112, 125 122
           C 130 129, 133 134, 132 138
           C 131 143, 127 146, 122 147
           C 115 148, 108 144, 103 140
           C 96 134, 88 128, 80 124
           C 65 118, 45 114, 25 118
           C 10 120, 2 112, 5 100
           C 8 88, 18 58, 20 20 Z"
        fill="url(#armLeft)" filter="url(#handBlur)"
      />
      {/* Index finger */}
      <path
        d="M 125 122 C 128 116, 133 108, 137 100 C 140 94, 142 88, 140 83
           C 138 78, 134 76, 131 78 C 128 80, 127 86, 126 93
           C 125 102, 124 112, 124 120 Z"
        fill="rgba(155,35,75,.88)"
      />
      {/* Middle finger — longest, reaching furthest */}
      <path
        d="M 130 125 C 135 117, 143 107, 150 97 C 155 89, 158 82, 155 76
           C 153 71, 148 70, 145 72 C 141 75, 139 82, 137 91
           C 135 101, 132 115, 130 125 Z"
        fill="rgba(158,37,78,.90)"
      />
      {/* Ring finger */}
      <path
        d="M 133 130 C 140 122, 149 113, 156 105 C 161 98, 164 92, 161 87
           C 159 82, 154 81, 151 84 C 148 87, 146 94, 143 103
           C 140 113, 136 124, 133 130 Z"
        fill="rgba(152,33,72,.86)"
      />
      {/* Pinky */}
      <path
        d="M 135 136 C 142 130, 149 123, 154 117 C 158 112, 160 107, 158 103
           C 156 99, 152 98, 149 101 C 146 104, 144 110, 141 118
           C 138 126, 136 133, 135 136 Z"
        fill="rgba(146,30,68,.82)"
      />
      {/* Bracelet hint */}
      <path d="M 68 118 C 72 114, 82 112, 92 115 C 102 118, 108 124, 104 128"
        fill="none" stroke="rgba(220,140,170,.50)" strokeWidth="2" strokeLinecap="round"/>

      {/* RIGHT ARM (from bottom-right) */}
      <path
        d="M 300 260
           C 280 250, 250 225, 225 195
           C 212 180, 202 168, 195 158
           C 190 151, 187 146, 188 142
           C 189 137, 193 134, 198 133
           C 205 132, 212 136, 217 140
           C 224 146, 232 152, 240 156
           C 255 162, 275 166, 295 162
           C 310 160, 318 168, 315 180
           C 312 192, 302 222, 300 260 Z"
        fill="url(#armRight)" filter="url(#handBlur)"
      />
      {/* Index finger */}
      <path
        d="M 195 158 C 192 164, 187 172, 183 180 C 180 186, 178 192, 180 197
           C 182 202, 186 204, 189 202 C 192 200, 193 194, 194 187
           C 195 178, 196 168, 196 160 Z"
        fill="rgba(135,22,60,.86)"
      />
      {/* Middle finger */}
      <path
        d="M 190 155 C 185 163, 177 173, 170 183 C 165 191, 162 198, 165 204
           C 167 209, 172 210, 175 208 C 179 205, 181 198, 183 189
           C 185 179, 188 165, 190 155 Z"
        fill="rgba(138,24,62,.88)"
      />
      {/* Ring finger */}
      <path
        d="M 187 150 C 180 158, 171 167, 164 175 C 159 182, 156 188, 159 193
           C 161 198, 166 199, 169 196 C 172 193, 174 186, 177 177
           C 180 167, 184 156, 187 150 Z"
        fill="rgba(132,20,58,.84)"
      />
      {/* Pinky */}
      <path
        d="M 185 144 C 178 150, 171 157, 166 163 C 162 168, 160 173, 162 177
           C 164 181, 168 182, 171 179 C 174 176, 176 170, 179 162
           C 182 154, 184 148, 185 144 Z"
        fill="rgba(126,18,54,.80)"
      />
      {/* Ring on finger */}
      <ellipse cx="169" cy="195" rx="4" ry="2.2" transform="rotate(-42 169 195)"
        fill="none" stroke="rgba(220,150,170,.60)" strokeWidth="1.8"/>

      {/* Fingertip glow — the meeting point */}
      <ellipse cx="161" cy="137" rx="18" ry="18" fill="rgba(220,90,140,.22)">
        <animate attributeName="rx" values="14;22;14" dur="2.2s" repeatCount="indefinite"/>
        <animate attributeName="ry" values="14;22;14" dur="2.2s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values=".6;1;.6" dur="2.2s" repeatCount="indefinite"/>
      </ellipse>
      <circle cx="161" cy="137" r="4" fill="rgba(240,120,160,.70)">
        <animate attributeName="r" values="3;5.5;3" dur="2.2s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values=".7;1;.7" dur="2.2s" repeatCount="indefinite"/>
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
    const t3 = setTimeout(()=>setPhase("exit"), isLinking ? 99999 : 3000);
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

  const statusMsg = linkStatus==="linking" ? "Соединяем пару…" : linkStatus==="linked" ? "Пара соединена 💕" : linkStatus==="error" ? "Попробуй позже" : "";

  return (
    <div style={{position:"fixed",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",overflow:"hidden",
      background:"radial-gradient(ellipse 120% 100% at 50% 60%, #2a0a18 0%, #1a0610 50%, #0e040a 100%)"}}>

      {/* Background pulse rings */}
      <div style={{position:"absolute",width:320,height:320,borderRadius:"50%",
        border:"1px solid rgba(200,60,100,.12)",
        animation:"bgPulse 3s ease-in-out infinite",top:"50%",left:"50%",transform:"translate(-50%,-50%)"}}/>
      <div style={{position:"absolute",width:220,height:220,borderRadius:"50%",
        border:"1px solid rgba(200,60,100,.08)",
        animation:"bgPulse 3s ease-in-out .8s infinite",top:"50%",left:"50%",transform:"translate(-50%,-50%)"}}/>

      {/* Content */}
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:0,
        opacity,transform:`translateY(${ty}px)`,
        transition:"opacity .6s ease, transform .6s cubic-bezier(.22,1,.36,1)"}}>

        {/* Hands */}
        <div style={{flexShrink:0,marginBottom:-20}}>
          <HandsIllustration/>
        </div>

        {/* App name */}
        <div style={{textAlign:"center",zIndex:2}}>
          <p style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontWeight:700,fontSize:42,
            letterSpacing:"-0.035em",color:"rgba(255,238,246,.97)",margin:0,lineHeight:1,
            textShadow:"0 0 40px rgba(200,60,110,.35)"}}>
            Touché
          </p>
          <p style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontWeight:300,fontSize:10,
            letterSpacing:"0.32em",textTransform:"uppercase",
            color:"rgba(210,120,155,.55)",margin:"12px 0 0"}}>
            for two
          </p>
        </div>

        {/* ECG / status */}
        <div style={{marginTop:30,height:60,display:"flex",alignItems:"center",justifyContent:"center",width:"100%"}}>
          {statusMsg ? (
            <p style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontWeight:400,fontSize:13,
              letterSpacing:"0.05em",color:linkStatus==="linked"?"rgba(220,140,170,.95)":"rgba(210,120,150,.60)",
              margin:0,transition:"color .4s"}}>{statusMsg}</p>
          ) : (
            <ECGLine visible={ecgVisible}/>
          )}
        </div>
      </div>

      <style>{`
        @keyframes bgPulse {
          0%,100% { opacity:.5; transform:translate(-50%,-50%) scale(1); }
          50%      { opacity:1;  transform:translate(-50%,-50%) scale(1.06); }
        }
      `}</style>
    </div>
  );
}
