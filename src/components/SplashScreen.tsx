import { useEffect, useRef, useState } from "react";

const COLORS = [
  { r: 255, g: 165, b: 80  }, // compliments — amber
  { r: 240, g: 100, b: 150 }, // tenderness — rose
  { r: 200, g: 60,  b: 130 }, // desire — magenta
  { r: 190, g: 20,  b: 70  }, // passion — crimson
  { r: 140, g: 10,  b: 80  }, // hard — burgundy
];

interface SplashScreenProps {
  onDone: () => void;
}

export default function SplashScreen({ onDone }: SplashScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [textVisible, setTextVisible] = useState(false);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setTextVisible(true), 1400);
    const t2 = setTimeout(() => setFading(true), 3800);
    const t3 = setTimeout(onDone, 4700);
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

    const stars = Array.from({ length: 90 }, () => ({
      x: Math.random(),
      y: Math.random(),
      size: 0.3 + Math.random() * 1.0,
      alpha: 0.08 + Math.random() * 0.35,
      phase: Math.random() * Math.PI * 2,
      speed: 0.4 + Math.random() * 0.9,
      colorIdx: Math.floor(Math.random() * COLORS.length),
    }));

    // Floating orbs that slowly drift
    const orbs = COLORS.map((c, i) => ({
      color: c,
      angle: (i / COLORS.length) * Math.PI * 2,
      radius: 0,
      orbitR: 0,
      phase: (i / COLORS.length) * Math.PI * 2,
      speed: 0.003 + Math.random() * 0.004,
    }));

    const startTime = performance.now();
    let raf: number;

    const draw = (now: number) => {
      const t = (now - startTime) / 1000;
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      const cx = w / 2;
      const cy = h * 0.40;
      const maxOrbitR = Math.min(w, h) * 0.22;
      const orbRadius = Math.min(w, h) * 0.07;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = "#030508";
      ctx.fillRect(0, 0, w, h);

      const formP = Math.max(0, Math.min(1, (t - 0.3) / 1.4));
      const eased = 1 - Math.pow(1 - formP, 3);

      // Starfield
      const starAlpha = Math.min(1, t / 1.2);
      for (const s of stars) {
        const c = COLORS[s.colorIdx];
        const pulse = 0.5 + 0.5 * Math.sin(t * s.speed + s.phase);
        ctx.save();
        ctx.globalAlpha = starAlpha * s.alpha * pulse;
        ctx.fillStyle = "#fffaf5";
        ctx.shadowBlur = s.size * 4;
        ctx.shadowColor = `rgb(${c.r},${c.g},${c.b})`;
        ctx.beginPath();
        ctx.arc(s.x * w, s.y * h, s.size * 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // 5 pulsing orbs in a circle
      orbs.forEach((orb, i) => {
        orb.angle += orb.speed;
        const ox = cx + Math.cos(orb.angle + orb.phase) * maxOrbitR * eased;
        const oy = cy + Math.sin(orb.angle + orb.phase) * maxOrbitR * eased * 0.6;
        const currentR = orbRadius * eased;
        const { r, g, b } = orb.color;

        const pulse = 0.8 + 0.2 * Math.sin(t * 1.5 + i * 1.2);

        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        const glow = ctx.createRadialGradient(ox, oy, 0, ox, oy, currentR * 2.8);
        glow.addColorStop(0, `rgba(${r},${g},${b},${0.18 * pulse * eased})`);
        glow.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(ox, oy, currentR * 2.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.save();
        const orbGrad = ctx.createRadialGradient(ox, oy, 0, ox, oy, currentR);
        orbGrad.addColorStop(0, `rgba(${Math.min(255,r+80)},${Math.min(255,g+80)},${Math.min(255,b+80)},${0.9 * pulse * eased})`);
        orbGrad.addColorStop(0.5, `rgba(${r},${g},${b},${0.6 * pulse * eased})`);
        orbGrad.addColorStop(1, `rgba(${r},${g},${b},0)`);
        ctx.fillStyle = orbGrad;
        ctx.beginPath();
        ctx.arc(ox, oy, currentR, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Central glow convergence
      if (eased > 0.3) {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        const centerGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxOrbitR * 1.4);
        centerGlow.addColorStop(0, `rgba(200,60,120,${0.08 * eased})`);
        centerGlow.addColorStop(0.5, `rgba(190,20,70,${0.04 * eased})`);
        centerGlow.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = centerGlow;
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
      }

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        opacity: fading ? 0 : 1,
        transition: fading ? "opacity 0.9s ease" : "opacity 0.4s ease",
        pointerEvents: fading ? "none" : "auto",
      }}
    >
      <canvas ref={canvasRef} style={{ position: "absolute", inset: 0 }} />

      <div
        style={{
          position: "absolute",
          left: 0, right: 0,
          top: `calc(40% + min(24vw, 24vh) + 32px)`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          opacity: textVisible ? 1 : 0,
          transform: textVisible ? "translateY(0)" : "translateY(16px)",
          transition: "opacity 1.1s ease, transform 1.1s ease",
        }}
      >
        <p
          style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontStyle: "italic",
            fontWeight: 400,
            fontSize: 38,
            color: "rgba(255,252,245,0.94)",
            letterSpacing: "0.08em",
            margin: 0,
            textAlign: "center",
            textShadow: "0 0 40px rgba(200,60,130,0.5), 0 0 80px rgba(190,20,70,0.2), 0 2px 8px rgba(0,0,0,0.9)",
          }}
        >
          Touché
        </p>
        <p
          style={{
            fontFamily: "'Raleway', sans-serif",
            fontWeight: 200,
            fontSize: 11,
            color: "rgba(255,252,245,0.3)",
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            margin: "10px 0 0",
            textAlign: "center",
          }}
        >
          для двоих · for two
        </p>

        <div style={{ display: "flex", gap: 5, marginTop: 24 }}>
          {COLORS.map((c, i) => (
            <div
              key={i}
              style={{
                width: 14,
                height: 0.5,
                background: `rgba(${c.r},${c.g},${c.b},0.55)`,
              }}
            />
          ))}
        </div>

        <p
          style={{
            fontFamily: "'Raleway', sans-serif",
            fontWeight: 200,
            fontSize: 8,
            letterSpacing: "0.30em",
            textTransform: "uppercase",
            color: "rgba(255,252,245,0.18)",
            margin: "16px 0 0",
            textAlign: "center",
          }}
        >
          задания для пар на вечер
        </p>
      </div>
    </div>
  );
}
