import { useEffect, useRef, useState } from "react";
import type { Lang } from "@/data/i18n";

interface LanguageSelectProps {
  onSelect: (lang: Lang) => void;
}

export default function LanguageSelect({ onSelect }: LanguageSelectProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [chosen, setChosen] = useState<Lang | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { requestAnimationFrame(() => setMounted(true)); }, []);

  const pick = (lang: Lang) => {
    setChosen(lang);
    setTimeout(() => onSelect(lang), 440);
  };

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

    const orbs = Array.from({ length: 10 }, () => ({
      x: Math.random(), y: Math.random(),
      r: 40 + Math.random() * 80,
      alpha: 0.030 + Math.random() * 0.055,
      phase: Math.random() * Math.PI * 2,
      speed: 0.12 + Math.random() * 0.20,
      pink: Math.random() > 0.4,
    }));

    const start = performance.now();
    let raf: number;
    const draw = (now: number) => {
      const t = (now - start) / 1000;
      const w = canvas.width / dpr, h = canvas.height / dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = "#0d0610";
      ctx.fillRect(0, 0, w, h);
      const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.min(w, h) * 0.7);
      g.addColorStop(0, `rgba(190,35,80,${0.10 + 0.04 * Math.sin(t * 0.4)})`);
      g.addColorStop(0.6, "rgba(80,10,50,0.06)");
      g.addColorStop(1, "rgba(13,6,16,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      for (const o of orbs) {
        const pulse = 0.5 + 0.5 * Math.sin(t * o.speed + o.phase);
        ctx.save();
        ctx.globalAlpha = o.alpha * pulse;
        const rg = ctx.createRadialGradient(o.x * w, o.y * h, 0, o.x * w, o.y * h, o.r * (1 + pulse * 0.15));
        const col = o.pink ? "210,50,100" : "155,20,80";
        rg.addColorStop(0, `rgba(${col},0.8)`);
        rg.addColorStop(1, `rgba(${col},0)`);
        ctx.fillStyle = rg;
        ctx.beginPath();
        ctx.arc(o.x * w, o.y * h, o.r * (1 + pulse * 0.15), 0, Math.PI * 2);
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
      position: "fixed", inset: 0, zIndex: 90, background: "#0d0610",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      opacity: chosen ? 0 : (mounted ? 1 : 0),
      transform: mounted ? "scale(1)" : "scale(0.97)",
      transition: chosen ? "opacity 0.44s ease" : "opacity 0.5s ease, transform 0.5s cubic-bezier(0.22,1,0.36,1)",
      overflow: "hidden",
    }}>
      <canvas ref={canvasRef} style={{ position: "absolute", inset: 0 }} />

      <div style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", alignItems: "center", width: "100%", padding: "0 28px" }}>
        <p style={{
          fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif", fontWeight: 700,
          fontSize: "clamp(44px,11vw,62px)", color: "rgba(255,238,248,0.95)",
          letterSpacing: "-0.04em", margin: 0, textAlign: "center", lineHeight: 1,
          textShadow: "0 0 48px rgba(210,60,110,0.45), 0 2px 12px rgba(0,0,0,0.60)",
        }}>
          Touché
        </p>

        <svg viewBox="0 0 32 18" fill="none" style={{ width: 36, height: 20, margin: "12px 0 6px" }}>
          <path d="M16 16C16 16 5 10.5 5 5a5 5 0 0 1 11-1.5A5 5 0 0 1 27 5c0 5.5-11 11-11 11z"
            fill="rgba(210,40,90,0.25)" stroke="rgba(220,80,120,0.65)" strokeWidth="1.4" strokeLinejoin="round" />
        </svg>

        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "4px 0 36px" }}>
          <div style={{ width: 28, height: 1, background: "rgba(210,60,100,0.28)", borderRadius: 99 }} />
          <p style={{
            fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif", fontWeight: 300, fontSize: 10,
            letterSpacing: "0.28em", textTransform: "uppercase", color: "rgba(255,238,248,0.32)", margin: 0,
          }}>
            choose language
          </p>
          <div style={{ width: 28, height: 1, background: "rgba(210,60,100,0.28)", borderRadius: 99 }} />
        </div>

        <div style={{ display: "flex", gap: 14, width: "100%", maxWidth: 320 }}>
          {([
            { lang: "en" as Lang, primary: "English", sub: "Английский", flag: "🇬🇧" },
            { lang: "ru" as Lang, primary: "Русский", sub: "Russian", flag: "🇷🇺" },
          ]).map(({ lang, primary, sub, flag }) => (
            <button
              key={lang}
              onClick={() => pick(lang)}
              style={{
                flex: 1, padding: "22px 10px", borderRadius: 20,
                background: "rgba(255,238,248,0.06)",
                border: "1px solid rgba(210,60,100,0.22)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                cursor: "pointer",
                display: "flex", flexDirection: "column",
                alignItems: "center", gap: 8,
                transition: "all 0.22s ease",
                boxShadow: "0 2px 24px rgba(0,0,0,0.30)",
              }}
              onMouseEnter={e => {
                const el = e.currentTarget;
                el.style.background = "rgba(210,60,100,0.14)";
                el.style.borderColor = "rgba(210,60,100,0.45)";
                el.style.boxShadow = "0 4px 36px rgba(210,60,100,0.18)";
                el.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={e => {
                const el = e.currentTarget;
                el.style.background = "rgba(255,238,248,0.06)";
                el.style.borderColor = "rgba(210,60,100,0.22)";
                el.style.boxShadow = "0 2px 24px rgba(0,0,0,0.30)";
                el.style.transform = "translateY(0)";
              }}
            >
              <span style={{ fontSize: 28, lineHeight: 1 }}>{flag}</span>
              <span style={{ fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif", fontWeight: 600, fontSize: 18, color: "rgba(255,238,248,0.92)", letterSpacing: "-0.01em" }}>{primary}</span>
              <span style={{ fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif", fontWeight: 300, fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(210,80,120,0.60)" }}>{sub}</span>
            </button>
          ))}
        </div>

        <p style={{ fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif", fontWeight: 300, fontSize: 11, letterSpacing: "0.06em", color: "rgba(255,238,248,0.20)", marginTop: 32, textAlign: "center" }}>
          evening tasks for couples
        </p>
      </div>
    </div>
  );
}
