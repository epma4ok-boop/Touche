import { useEffect, useRef, useState } from "react";

interface SplashScreenProps {
  onDone: () => void;
}

export default function SplashScreen({ onDone }: SplashScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [textVisible, setTextVisible] = useState(false);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setTextVisible(true), 1000);
    const t2 = setTimeout(() => setFading(true), 3600);
    const t3 = setTimeout(onDone, 4400);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDone]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;

    const resize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
    };
    resize();

    // Floating ring particles
    const rings = Array.from({ length: 18 }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: 8 + Math.random() * 28,
      alpha: 0.04 + Math.random() * 0.10,
      phase: Math.random() * Math.PI * 2,
      speed: 0.18 + Math.random() * 0.35,
      isBlue: Math.random() > 0.5,
    }));

    // Pink/blue palette
    const COLORS = [
      { r: 220, g: 130, b: 200 }, // pink
      { r: 100, g: 170, b: 240 }, // blue
      { r: 240, g: 160, b: 190 }, // rose
      { r: 130, g: 190, b: 230 }, // sky
    ];

    const startTime = performance.now();
    let raf: number;

    const draw = (now: number) => {
      const t = (now - startTime) / 1000;
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Warm cream background
      ctx.fillStyle = "#fdf8f5";
      ctx.fillRect(0, 0, w, h);

      // Soft centre glow
      const cg = ctx.createRadialGradient(w/2, h*0.42, 0, w/2, h*0.42, Math.min(w,h)*0.55);
      cg.addColorStop(0, `rgba(220,130,200,${0.07 + 0.03*Math.sin(t*0.6)})`);
      cg.addColorStop(0.5, `rgba(100,170,240,0.04)`);
      cg.addColorStop(1, "rgba(253,248,245,0)");
      ctx.fillStyle = cg;
      ctx.fillRect(0, 0, w, h);

      // Floating rings
      const fade = Math.min(1, t / 0.8);
      for (const p of rings) {
        const pulse = 0.5 + 0.5 * Math.sin(t * p.speed + p.phase);
        const c = COLORS[p.isBlue ? 1 : 0];
        ctx.save();
        ctx.globalAlpha = fade * p.alpha * pulse;
        ctx.strokeStyle = `rgb(${c.r},${c.g},${c.b})`;
        ctx.lineWidth = 0.8 + pulse * 0.6;
        ctx.beginPath();
        ctx.arc(
          p.x * w + Math.sin(t * p.speed * 0.4 + p.phase) * 12,
          p.y * h + Math.cos(t * p.speed * 0.3 + p.phase) * 8,
          p.r * (1 + pulse * 0.12),
          0, Math.PI * 2
        );
        ctx.stroke();
        ctx.restore();
      }

      // Pulsing concentric rings at centre
      const bpm = 68;
      const beatPeriod = 60 / bpm;
      const beatPhase = (t % beatPeriod) / beatPeriod;
      const beatEnv = beatPhase < 0.09 ? beatPhase / 0.09 : Math.max(0, 1 - (beatPhase - 0.09) / 0.5);
      const cx = w / 2, cy = h * 0.42;

      for (let i = 0; i < 4; i++) {
        const spread = ((t / beatPeriod - i / 4) % 1 + 1) % 1;
        const maxRing = Math.min(w, h) * (0.18 + i * 0.055);
        const minRing = Math.min(w, h) * 0.05;
        const rr = minRing + spread * (maxRing - minRing);
        const alpha = (1 - spread) * (0.10 + beatEnv * 0.12) * fade;
        const isBlue = i % 2 === 0;
        ctx.beginPath();
        ctx.arc(cx, cy, rr, 0, Math.PI * 2);
        ctx.strokeStyle = isBlue ? `rgba(100,170,240,${alpha})` : `rgba(220,130,200,${alpha})`;
        ctx.lineWidth = 1.2 - i * 0.15;
        ctx.stroke();
      }

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

      {/* Centered text */}
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        paddingBottom: "8vw",
      }}>
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          opacity: textVisible ? 1 : 0,
          transform: textVisible ? "translateY(0)" : "translateY(20px)",
          transition: "opacity 1.2s cubic-bezier(0.16,1,0.3,1), transform 1.2s cubic-bezier(0.16,1,0.3,1)",
        }}>
          <p style={{
            fontFamily: "'Plus Jakarta Sans', 'DM Sans', sans-serif",
            fontWeight: 700,
            fontSize: "clamp(52px, 13vw, 72px)",
            color: "rgba(40,30,50,0.88)",
            letterSpacing: "-0.04em",
            margin: 0,
            textAlign: "center",
            lineHeight: 1,
          }}>
            Touché
          </p>

          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 18 }}>
            <div style={{ width: 28, height: 1, background: "rgba(200,100,180,0.28)", borderRadius: 99 }} />
            <p style={{
              fontFamily: "'Plus Jakarta Sans', 'DM Sans', sans-serif",
              fontWeight: 300,
              fontSize: 10, letterSpacing: "0.30em", textTransform: "uppercase",
              color: "rgba(40,30,50,0.32)", margin: 0,
            }}>
              для двоих
            </p>
            <div style={{ width: 28, height: 1, background: "rgba(200,100,180,0.28)", borderRadius: 99 }} />
          </div>
        </div>
      </div>
    </div>
  );
}
