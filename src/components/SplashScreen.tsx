import { useEffect, useRef, useState } from "react";

function playMoan() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const now = ctx.currentTime;

    const voc = ctx.createOscillator();
    voc.type = "sawtooth";
    voc.frequency.setValueAtTime(195, now);
    voc.frequency.linearRampToValueAtTime(220, now + 0.28);
    voc.frequency.linearRampToValueAtTime(250, now + 0.78);
    voc.frequency.linearRampToValueAtTime(260, now + 1.18);
    voc.frequency.linearRampToValueAtTime(240, now + 1.68);
    voc.frequency.linearRampToValueAtTime(205, now + 2.15);

    const lfo = ctx.createOscillator();
    lfo.frequency.value = 5.8;
    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(0, now);
    lfoGain.gain.linearRampToValueAtTime(7, now + 0.58);
    lfoGain.gain.setValueAtTime(7, now + 1.45);
    lfoGain.gain.linearRampToValueAtTime(4, now + 2.1);
    lfo.connect(lfoGain);
    lfoGain.connect(voc.frequency);

    const f1 = ctx.createBiquadFilter();
    f1.type = "bandpass"; f1.frequency.value = 680; f1.Q.value = 5.5;
    const f2 = ctx.createBiquadFilter();
    f2.type = "bandpass"; f2.frequency.value = 1090; f2.Q.value = 8;
    const f3 = ctx.createBiquadFilter();
    f3.type = "bandpass"; f3.frequency.value = 2500; f3.Q.value = 12;

    const g1 = ctx.createGain(); g1.gain.value = 1.0;
    const g2 = ctx.createGain(); g2.gain.value = 0.55;
    const g3 = ctx.createGain(); g3.gain.value = 0.18;
    voc.connect(f1); f1.connect(g1);
    voc.connect(f2); f2.connect(g2);
    voc.connect(f3); f3.connect(g3);

    const bufLen = ctx.sampleRate * 2.4;
    const noiseBuf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const nd = noiseBuf.getChannelData(0);
    let b0=0,b1=0,b2=0,b3=0,b4=0;
    for (let i = 0; i < bufLen; i++) {
      const w = Math.random() * 2 - 1;
      b0=0.99886*b0+w*0.0555179; b1=0.99332*b1+w*0.0750759;
      b2=0.96900*b2+w*0.1538520; b3=0.86650*b3+w*0.3104856;
      b4=0.55000*b4+w*0.5329522;
      nd[i] = (b0+b1+b2+b3+b4) * 0.10;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuf;
    const nbpf = ctx.createBiquadFilter();
    nbpf.type = "bandpass"; nbpf.frequency.value = 1600; nbpf.Q.value = 0.6;
    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.14, now);
    nGain.gain.linearRampToValueAtTime(0.07, now + 0.9);
    nGain.gain.linearRampToValueAtTime(0.11, now + 1.5);
    nGain.gain.linearRampToValueAtTime(0, now + 2.2);
    noise.connect(nbpf); nbpf.connect(nGain);

    const master = ctx.createGain();
    master.gain.setValueAtTime(0, now);
    master.gain.linearRampToValueAtTime(0.22, now + 0.08);
    master.gain.setValueAtTime(0.22, now + 0.6);
    master.gain.linearRampToValueAtTime(0.27, now + 1.1);
    master.gain.setValueAtTime(0.27, now + 1.6);
    master.gain.linearRampToValueAtTime(0, now + 2.2);

    g1.connect(master); g2.connect(master); g3.connect(master); nGain.connect(master);
    master.connect(ctx.destination);

    voc.start(now); voc.stop(now + 2.3);
    lfo.start(now); lfo.stop(now + 2.3);
    noise.start(now); noise.stop(now + 2.3);
  } catch {}
}

function drawKissMark(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  scale: number, alpha: number, pulse: number
) {
  const s = scale;
  const cr = 162, cg = 18, cb = 55;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(cx, cy);
  ctx.rotate(-0.07);

  // Upper lip — cupid's bow stamp impression
  ctx.beginPath();
  ctx.moveTo(-s * 0.54, s * 0.03);
  ctx.bezierCurveTo(-s * 0.57, -s * 0.16, -s * 0.38, -s * 0.38, -s * 0.19, -s * 0.22);
  ctx.bezierCurveTo(-s * 0.09, -s * 0.12, -s * 0.04, -s * 0.05, 0, -s * 0.13);
  ctx.bezierCurveTo(s * 0.04, -s * 0.05, s * 0.09, -s * 0.12, s * 0.19, -s * 0.22);
  ctx.bezierCurveTo(s * 0.38, -s * 0.38, s * 0.57, -s * 0.16, s * 0.54, s * 0.03);
  ctx.bezierCurveTo(s * 0.28, s * 0.09, -s * 0.28, s * 0.09, -s * 0.54, s * 0.03);
  ctx.closePath();
  const ug = ctx.createRadialGradient(0, -s * 0.12, s * 0.05, 0, -s * 0.12, s * 0.62);
  ug.addColorStop(0, `rgba(${cr},${cg},${cb},0.50)`);
  ug.addColorStop(0.42, `rgba(${cr},${cg},${cb},0.82)`);
  ug.addColorStop(1, `rgba(${cr - 18},${cg},${cb + 12},0.93)`);
  ctx.fillStyle = ug;
  ctx.fill();

  // Lower lip — fuller oval stamp
  ctx.beginPath();
  ctx.moveTo(-s * 0.51, s * 0.10);
  ctx.bezierCurveTo(-s * 0.57, s * 0.31, -s * 0.30, s * 0.52, 0, s * 0.51);
  ctx.bezierCurveTo(s * 0.30, s * 0.52, s * 0.57, s * 0.31, s * 0.51, s * 0.10);
  ctx.bezierCurveTo(s * 0.30, s * 0.14, -s * 0.30, s * 0.14, -s * 0.51, s * 0.10);
  ctx.closePath();
  const lg = ctx.createRadialGradient(0, s * 0.30, s * 0.04, 0, s * 0.30, s * 0.58);
  lg.addColorStop(0, `rgba(${cr},${cg},${cb},0.48)`);
  lg.addColorStop(0.40, `rgba(${cr},${cg},${cb},0.80)`);
  lg.addColorStop(1, `rgba(${cr - 18},${cg},${cb + 12},0.92)`);
  ctx.fillStyle = lg;
  ctx.fill();

  // Smudge left edge
  ctx.beginPath();
  ctx.ellipse(-s * 0.57, -s * 0.04, s * 0.09, s * 0.05, -0.55, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(${cr},${cg},${cb},0.30)`;
  ctx.fill();
  // Smudge right edge
  ctx.beginPath();
  ctx.ellipse(s * 0.57, -s * 0.04, s * 0.08, s * 0.05, 0.55, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(${cr},${cg},${cb},0.24)`;
  ctx.fill();
  // Smudge bottom
  ctx.beginPath();
  ctx.ellipse(s * 0.12, s * 0.54, s * 0.07, s * 0.04, 0.3, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(${cr},${cg},${cb},0.20)`;
  ctx.fill();
  // Glass shine highlight
  ctx.beginPath();
  ctx.ellipse(-s * 0.10, s * 0.29, s * 0.17, s * 0.07, -0.18, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(255,255,255,${0.12 + pulse * 0.07})`;
  ctx.fill();
  // Outer bleed
  ctx.beginPath();
  ctx.moveTo(-s * 0.54, s * 0.03);
  ctx.bezierCurveTo(-s * 0.57, -s * 0.16, -s * 0.38, -s * 0.38, -s * 0.19, -s * 0.22);
  ctx.bezierCurveTo(-s * 0.09, -s * 0.12, -s * 0.04, -s * 0.05, 0, -s * 0.13);
  ctx.bezierCurveTo(s * 0.04, -s * 0.05, s * 0.09, -s * 0.12, s * 0.19, -s * 0.22);
  ctx.bezierCurveTo(s * 0.38, -s * 0.38, s * 0.57, -s * 0.16, s * 0.54, s * 0.03);
  ctx.bezierCurveTo(s * 0.28, s * 0.09, -s * 0.28, s * 0.09, -s * 0.54, s * 0.03);
  ctx.closePath();
  ctx.strokeStyle = `rgba(${cr - 10},${cg},${cb + 8},${0.16 + pulse * 0.05})`;
  ctx.lineWidth = s * 0.038;
  ctx.stroke();

  ctx.restore();
}

interface SplashScreenProps { onDone: () => void; }

export default function SplashScreen({ onDone }: SplashScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [textVisible, setTextVisible] = useState(false);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const t0 = setTimeout(() => playMoan(), 180);
    const t1 = setTimeout(() => setTextVisible(true), 950);
    const t2 = setTimeout(() => setFading(true), 3500);
    const t3 = setTimeout(onDone, 4300);
    return () => { clearTimeout(t0); clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDone]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      canvas.width = Math.round(window.innerWidth * dpr);
      canvas.height = Math.round(window.innerHeight * dpr);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
    };
    resize();

    const rings = Array.from({ length: 12 }, () => ({
      x: Math.random(), y: Math.random(),
      r: 8 + Math.random() * 24,
      alpha: 0.03 + Math.random() * 0.065,
      phase: Math.random() * Math.PI * 2,
      speed: 0.16 + Math.random() * 0.26,
      pink: Math.random() > 0.4,
    }));

    const startTime = performance.now();
    let raf: number;
    const draw = (now: number) => {
      const t = (now - startTime) / 1000;
      const w = canvas.width / dpr, h = canvas.height / dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = "#fdf8f5";
      ctx.fillRect(0, 0, w, h);
      const cg = ctx.createRadialGradient(w / 2, h * 0.52, 0, w / 2, h * 0.52, Math.min(w, h) * 0.55);
      cg.addColorStop(0, `rgba(200,55,85,${0.05 + 0.022 * Math.sin(t * 0.5)})`);
      cg.addColorStop(0.5, "rgba(110,170,240,0.022)");
      cg.addColorStop(1, "rgba(253,248,245,0)");
      ctx.fillStyle = cg;
      ctx.fillRect(0, 0, w, h);
      const fade = Math.min(1, t / 0.9);
      for (const p of rings) {
        const pulse = 0.5 + 0.5 * Math.sin(t * p.speed + p.phase);
        ctx.save();
        ctx.globalAlpha = fade * p.alpha * pulse;
        ctx.strokeStyle = p.pink ? `rgba(180,35,70,1)` : `rgba(110,175,235,1)`;
        ctx.lineWidth = 0.7 + pulse * 0.4;
        ctx.beginPath();
        ctx.arc(
          p.x * w + Math.sin(t * p.speed * 0.4 + p.phase) * 9,
          p.y * h + Math.cos(t * p.speed * 0.3 + p.phase) * 7,
          p.r * (1 + pulse * 0.08), 0, Math.PI * 2
        );
        ctx.stroke();
        ctx.restore();
      }
      const bpm = 68, bp = 60 / bpm;
      const bPhase = (t % bp) / bp;
      const bEnv = bPhase < 0.09 ? bPhase / 0.09 : Math.max(0, 1 - (bPhase - 0.09) / 0.52);
      const rx = w / 2, ry = h * 0.25;
      for (let i = 0; i < 4; i++) {
        const sp = ((t / bp - i / 4) % 1 + 1) % 1;
        const maxR = Math.min(w, h) * (0.09 + i * 0.032);
        const rr = Math.min(w, h) * 0.022 + sp * (maxR - Math.min(w, h) * 0.022);
        const al = (1 - sp) * (0.08 + bEnv * 0.08) * fade;
        ctx.beginPath();
        ctx.arc(rx, ry, rr, 0, Math.PI * 2);
        ctx.strokeStyle = i % 2 === 0 ? `rgba(180,35,70,${al})` : `rgba(110,175,235,${al})`;
        ctx.lineWidth = 1.0 - i * 0.10;
        ctx.stroke();
      }
      const kissAlpha = Math.min(1, t / 1.0) * 0.82;
      const kissPulse = 0.5 + 0.5 * Math.sin(t * 0.65);
      const kissScale = Math.min(w, h) * 0.26;
      drawKissMark(ctx, w / 2, h * 0.58, kissScale, kissAlpha, kissPulse);
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100,
      opacity: fading ? 0 : 1,
      transition: fading ? "opacity 0.8s ease" : "opacity 0.3s ease",
      pointerEvents: fading ? "none" : "auto",
      background: "#fdf8f5",
    }}>
      <canvas ref={canvasRef} style={{ position: "absolute", inset: 0 }} />
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "flex-start",
        paddingTop: "15vw",
      }}>
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          opacity: textVisible ? 1 : 0,
          transform: textVisible ? "translateY(0)" : "translateY(18px)",
          transition: "opacity 1.2s cubic-bezier(0.16,1,0.3,1), transform 1.2s cubic-bezier(0.16,1,0.3,1)",
        }}>
          <p style={{
            fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif",
            fontWeight: 700, fontSize: "clamp(52px,13vw,72px)",
            color: "rgba(40,30,50,0.88)", letterSpacing: "-0.04em",
            margin: 0, textAlign: "center", lineHeight: 1,
          }}>Touché</p>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 16 }}>
            <div style={{ width: 26, height: 1, background: "rgba(162,18,55,0.25)", borderRadius: 99 }} />
            <p style={{
              fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif",
              fontWeight: 300, fontSize: 10,
              letterSpacing: "0.30em", textTransform: "uppercase",
              color: "rgba(40,30,50,0.30)", margin: 0,
            }}>for two</p>
            <div style={{ width: 26, height: 1, background: "rgba(162,18,55,0.25)", borderRadius: 99 }} />
          </div>
        </div>
      </div>
    </div>
  );
}
