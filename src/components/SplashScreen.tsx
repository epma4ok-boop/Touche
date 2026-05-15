import { useEffect, useRef, useState } from "react";

interface SplashScreenProps {
  onDone: () => void;
}

// Synthesised moan via Web Audio API
function playMoan() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();

    // Pink noise buffer for breathiness
    const bufLen = ctx.sampleRate * 2.2;
    const noiseBuf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;
    for (let i = 0; i < bufLen; i++) {
      const w = Math.random() * 2 - 1;
      b0=0.99886*b0+w*0.0555179; b1=0.99332*b1+w*0.0750759;
      b2=0.96900*b2+w*0.1538520; b3=0.86650*b3+w*0.3104856;
      b4=0.55000*b4+w*0.5329522; b5=-0.7616*b5-w*0.0168980;
      data[i] = (b0+b1+b2+b3+b4+b5+b6+w*0.5362) * 0.11;
      b6 = w * 0.115926;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuf;

    // Band-pass filter to shape noise into voice-like breathiness
    const bpf = ctx.createBiquadFilter();
    bpf.type = "bandpass";
    bpf.frequency.value = 1100;
    bpf.Q.value = 0.8;

    // Voice oscillator — low feminine pitch with vibrato
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(210, ctx.currentTime);
    osc.frequency.setValueAtTime(230, ctx.currentTime + 0.18);
    osc.frequency.linearRampToValueAtTime(255, ctx.currentTime + 0.55);
    osc.frequency.linearRampToValueAtTime(235, ctx.currentTime + 0.9);
    osc.frequency.linearRampToValueAtTime(220, ctx.currentTime + 1.4);
    osc.frequency.linearRampToValueAtTime(195, ctx.currentTime + 2.0);

    // Vibrato LFO
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 5.5;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 6;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    // Overall gain envelope
    const master = ctx.createGain();
    master.gain.setValueAtTime(0, ctx.currentTime);
    master.gain.linearRampToValueAtTime(0.28, ctx.currentTime + 0.12);
    master.gain.setValueAtTime(0.28, ctx.currentTime + 0.80);
    master.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 1.50);
    master.gain.linearRampToValueAtTime(0, ctx.currentTime + 2.10);

    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.18;

    noise.connect(bpf);
    bpf.connect(noiseGain);
    noiseGain.connect(master);
    osc.connect(master);
    master.connect(ctx.destination);

    noise.start(ctx.currentTime);
    noise.stop(ctx.currentTime + 2.2);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 2.1);
    lfo.start(ctx.currentTime);
    lfo.stop(ctx.currentTime + 2.1);
  } catch {}
}

export default function SplashScreen({ onDone }: SplashScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [textVisible, setTextVisible] = useState(false);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    // Moan plays immediately
    const t0 = setTimeout(() => playMoan(), 200);
    const t1 = setTimeout(() => setTextVisible(true), 1000);
    const t2 = setTimeout(() => setFading(true), 3600);
    const t3 = setTimeout(onDone, 4400);
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

    // Floating rings
    const rings = Array.from({ length: 14 }, () => ({
      x: Math.random(), y: Math.random(),
      r: 10 + Math.random() * 30,
      alpha: 0.04 + Math.random() * 0.09,
      phase: Math.random() * Math.PI * 2,
      speed: 0.18 + Math.random() * 0.30,
      blue: Math.random() > 0.5,
    }));

    const startTime = performance.now();
    let raf: number;

    // Draw lips silhouette centred on canvas
    function drawLips(cx: number, cy: number, scale: number, alpha: number, pulse: number) {
      const s = scale * (1 + pulse * 0.018);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(cx, cy);

      // Outer lip fill — soft pink blush
      ctx.beginPath();
      // Upper lip — Cupid's bow
      ctx.moveTo(-s * 0.62, 0);
      ctx.bezierCurveTo(-s * 0.62, -s * 0.28, -s * 0.32, -s * 0.52, 0, -s * 0.38);
      ctx.bezierCurveTo(s * 0.32, -s * 0.52, s * 0.62, -s * 0.28, s * 0.62, 0);
      // Lower lip
      ctx.bezierCurveTo(s * 0.62, s * 0.42, s * 0.32, s * 0.60, 0, s * 0.58);
      ctx.bezierCurveTo(-s * 0.32, s * 0.60, -s * 0.62, s * 0.42, -s * 0.62, 0);
      ctx.closePath();

      // Gradient fill
      const grad = ctx.createRadialGradient(0, s*0.05, s*0.1, 0, s*0.05, s*0.72);
      grad.addColorStop(0, `rgba(255,160,190,${0.55 + pulse * 0.08})`);
      grad.addColorStop(0.5, `rgba(230,110,155,${0.40 + pulse * 0.05})`);
      grad.addColorStop(1, `rgba(200,70,120,0.12)`);
      ctx.fillStyle = grad;
      ctx.fill();

      // Cupid's bow dip accent
      ctx.beginPath();
      ctx.moveTo(-s * 0.22, -s * 0.30);
      ctx.bezierCurveTo(-s * 0.10, -s * 0.42, s * 0.10, -s * 0.42, s * 0.22, -s * 0.30);
      ctx.strokeStyle = `rgba(220,100,145,${0.22 + pulse * 0.08})`;
      ctx.lineWidth = s * 0.022;
      ctx.lineCap = "round";
      ctx.stroke();

      // Lower lip highlight
      ctx.beginPath();
      ctx.moveTo(-s * 0.28, s * 0.22);
      ctx.bezierCurveTo(-s * 0.14, s * 0.38, s * 0.14, s * 0.38, s * 0.28, s * 0.22);
      const hiGrad = ctx.createLinearGradient(-s*0.28, s*0.28, s*0.28, s*0.28);
      hiGrad.addColorStop(0, "rgba(255,230,240,0)");
      hiGrad.addColorStop(0.5, `rgba(255,230,240,${0.35 + pulse * 0.08})`);
      hiGrad.addColorStop(1, "rgba(255,230,240,0)");
      ctx.strokeStyle = hiGrad;
      ctx.lineWidth = s * 0.06;
      ctx.lineCap = "round";
      ctx.stroke();

      // Soft outer glow
      ctx.beginPath();
      ctx.moveTo(-s * 0.62, 0);
      ctx.bezierCurveTo(-s * 0.62, -s * 0.28, -s * 0.32, -s * 0.52, 0, -s * 0.38);
      ctx.bezierCurveTo(s * 0.32, -s * 0.52, s * 0.62, -s * 0.28, s * 0.62, 0);
      ctx.bezierCurveTo(s * 0.62, s * 0.42, s * 0.32, s * 0.60, 0, s * 0.58);
      ctx.bezierCurveTo(-s * 0.32, s * 0.60, -s * 0.62, s * 0.42, -s * 0.62, 0);
      ctx.closePath();
      ctx.strokeStyle = `rgba(220,100,145,${0.18 + pulse * 0.06})`;
      ctx.lineWidth = s * 0.035;
      ctx.stroke();

      ctx.restore();
    }

    const draw = (now: number) => {
      const t = (now - startTime) / 1000;
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      ctx.fillStyle = "#fdf8f5";
      ctx.fillRect(0, 0, w, h);

      // Soft glow centre
      const cg = ctx.createRadialGradient(w/2, h*0.44, 0, w/2, h*0.44, Math.min(w,h)*0.52);
      cg.addColorStop(0, `rgba(230,130,180,${0.07 + 0.03*Math.sin(t*0.5)})`);
      cg.addColorStop(0.5, "rgba(100,170,240,0.03)");
      cg.addColorStop(1, "rgba(253,248,245,0)");
      ctx.fillStyle = cg;
      ctx.fillRect(0, 0, w, h);

      // Floating rings
      const fade = Math.min(1, t / 0.9);
      for (const p of rings) {
        const pulse = 0.5 + 0.5 * Math.sin(t * p.speed + p.phase);
        ctx.save();
        ctx.globalAlpha = fade * p.alpha * pulse;
        ctx.strokeStyle = p.blue ? `rgba(110,175,235,1)` : `rgba(220,120,170,1)`;
        ctx.lineWidth = 0.8 + pulse * 0.5;
        ctx.beginPath();
        ctx.arc(
          p.x * w + Math.sin(t * p.speed * 0.4 + p.phase) * 10,
          p.y * h + Math.cos(t * p.speed * 0.3 + p.phase) * 7,
          p.r * (1 + pulse * 0.10), 0, Math.PI * 2
        );
        ctx.stroke();
        ctx.restore();
      }

      // Heartbeat rings at top-centre
      const bpm = 68;
      const bp = 60 / bpm;
      const bPhase = (t % bp) / bp;
      const bEnv = bPhase < 0.09 ? bPhase / 0.09 : Math.max(0, 1 - (bPhase - 0.09) / 0.52);
      const rx = w / 2, ry = h * 0.28;
      for (let i = 0; i < 4; i++) {
        const sp = ((t / bp - i / 4) % 1 + 1) % 1;
        const maxRing = Math.min(w, h) * (0.12 + i * 0.04);
        const rr = Math.min(w,h)*0.03 + sp * (maxRing - Math.min(w,h)*0.03);
        const alpha = (1-sp)*(0.10+bEnv*0.10)*fade;
        ctx.beginPath();
        ctx.arc(rx, ry, rr, 0, Math.PI*2);
        ctx.strokeStyle = i%2===0 ? `rgba(110,175,235,${alpha})` : `rgba(220,120,170,${alpha})`;
        ctx.lineWidth = 1.1 - i*0.12;
        ctx.stroke();
      }

      // Lips silhouette — large, centred lower
      const lipsAlpha = Math.min(1, t / 1.0) * 0.75;
      const lipsPulse = 0.5 + 0.5 * Math.sin(t * 0.7);
      const lipsScale = Math.min(w, h) * 0.30;
      drawLips(w / 2, h * 0.60, lipsScale, lipsAlpha, lipsPulse);

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

      {/* Text */}
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "flex-start",
        paddingTop: "16vw",
      }}>
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          opacity: textVisible ? 1 : 0,
          transform: textVisible ? "translateY(0)" : "translateY(16px)",
          transition: "opacity 1.2s cubic-bezier(0.16,1,0.3,1), transform 1.2s cubic-bezier(0.16,1,0.3,1)",
        }}>
          <p style={{
            fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif",
            fontWeight: 700, fontSize: "clamp(52px,13vw,72px)",
            color: "rgba(40,30,50,0.88)", letterSpacing: "-0.04em",
            margin: 0, textAlign: "center", lineHeight: 1,
          }}>
            Touché
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 16 }}>
            <div style={{ width: 26, height: 1, background: "rgba(200,100,160,0.28)", borderRadius: 99 }} />
            <p style={{
              fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif",
              fontWeight: 300, fontSize: 10,
              letterSpacing: "0.30em", textTransform: "uppercase",
              color: "rgba(40,30,50,0.32)", margin: 0,
            }}>
              для двоих
            </p>
            <div style={{ width: 26, height: 1, background: "rgba(200,100,160,0.28)", borderRadius: 99 }} />
          </div>
        </div>
      </div>
    </div>
  );
}
