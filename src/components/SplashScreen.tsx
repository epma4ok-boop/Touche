import { useEffect, useRef, useState } from "react";
import SilhouetteCanvas from "./SilhouetteCanvas";

interface SplashScreenProps {
  onDone: () => void;
}

export default function SplashScreen({ onDone }: SplashScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [textVisible, setTextVisible] = useState(false);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setTextVisible(true), 1200);
    const t2 = setTimeout(() => setFading(true), 3800);
    const t3 = setTimeout(onDone, 4700);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDone]);

  // Particle / ambient canvas
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

    const particles = Array.from({ length: 55 }, () => ({
      x: Math.random(),
      y: Math.random(),
      size: 0.5 + Math.random() * 1.4,
      alpha: 0.05 + Math.random() * 0.25,
      phase: Math.random() * Math.PI * 2,
      speed: 0.3 + Math.random() * 0.7,
      colorIdx: Math.floor(Math.random() * 5),
    }));

    const COLORS = [
      { r: 255, g: 165, b: 80 },
      { r: 240, g: 100, b: 150 },
      { r: 200, g: 60, b: 130 },
      { r: 190, g: 20, b: 70 },
      { r: 140, g: 10, b: 80 },
    ];

    const startTime = performance.now();
    let raf: number;

    const draw = (now: number) => {
      const t = (now - startTime) / 1000;
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = "#060409";
      ctx.fillRect(0, 0, w, h);

      // Vignette
      const vig = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.75);
      vig.addColorStop(0, "rgba(0,0,0,0)");
      vig.addColorStop(1, "rgba(0,0,0,0.85)");
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, w, h);

      // Ambient warm center glow
      const agr = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.min(w, h) * 0.65);
      agr.addColorStop(0, `rgba(190,30,90,${0.08 + 0.04 * Math.sin(t * 0.8)})`);
      agr.addColorStop(0.5, `rgba(150,10,60,0.03)`);
      agr.addColorStop(1, "rgba(0,0,0,0)");
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = agr;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();

      // Particles
      const starFade = Math.min(1, t / 1.0);
      for (const p of particles) {
        const c = COLORS[p.colorIdx];
        const pulse = 0.5 + 0.5 * Math.sin(t * p.speed + p.phase);
        ctx.save();
        ctx.globalAlpha = starFade * p.alpha * pulse;
        ctx.fillStyle = "#fff8f2";
        ctx.shadowBlur = p.size * 6;
        ctx.shadowColor = `rgb(${c.r},${c.g},${c.b})`;
        ctx.beginPath();
        ctx.arc(p.x * w, p.y * h, p.size * 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
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
      transition: fading ? "opacity 0.9s ease" : "opacity 0.3s ease",
      pointerEvents: fading ? "none" : "auto",
      background: "#060409",
    }}>
      {/* Ambient + particle canvas */}
      <canvas ref={canvasRef} style={{ position: "absolute", inset: 0 }} />

      {/* Silhouettes */}
      <SilhouetteCanvas r={190} g={30} b={90} opacity={0.9} />

      {/* Vertical gradient overlay — bottom fade */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(to bottom, rgba(6,4,9,0.3) 0%, rgba(6,4,9,0) 30%, rgba(6,4,9,0) 60%, rgba(6,4,9,0.95) 100%)",
        pointerEvents: "none",
      }} />

      {/* Centered text */}
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "flex-end",
        paddingBottom: "min(12vw, 72px)",
      }}>
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          opacity: textVisible ? 1 : 0,
          transform: textVisible ? "translateY(0)" : "translateY(24px)",
          transition: "opacity 1.4s cubic-bezier(0.16,1,0.3,1), transform 1.4s cubic-bezier(0.16,1,0.3,1)",
        }}>
          <p style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontStyle: "italic", fontWeight: 300,
            fontSize: "clamp(54px, 14vw, 76px)",
            color: "#fff8f2",
            letterSpacing: "0.08em",
            margin: 0,
            textAlign: "center",
            textShadow: "0 0 60px rgba(200,60,120,0.7), 0 0 120px rgba(190,20,70,0.35), 0 4px 24px rgba(0,0,0,0.95)",
            lineHeight: 1,
          }}>
            Touché
          </p>

          <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 20 }}>
            <div style={{ width: 32, height: 0.5, background: "rgba(200,60,120,0.45)" }} />
            <p style={{
              fontFamily: "'Raleway', sans-serif", fontWeight: 200,
              fontSize: 9, letterSpacing: "0.34em", textTransform: "uppercase",
              color: "rgba(255,248,242,0.38)", margin: 0,
            }}>
              для двоих
            </p>
            <div style={{ width: 32, height: 0.5, background: "rgba(200,60,120,0.45)" }} />
          </div>
        </div>
      </div>
    </div>
  );
}
