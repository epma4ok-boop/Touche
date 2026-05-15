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

  // Ambient canvas — floating soft rings
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
      alpha: 0.025 + Math.random() * 0.055,
      phase: Math.random() * Math.PI * 2,
      speed: 0.12 + Math.random() * 0.20,
      blue: Math.random() > 0.5,
    }));

    const start = performance.now();
    let raf: number;
    const draw = (now: number) => {
      const t = (now - start) / 1000;
      const w = canvas.width / dpr, h = canvas.height / dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = "#fdf8f5";
      ctx.fillRect(0, 0, w, h);

      // Centre soft glow
      const g = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, Math.min(w,h)*0.6);
      g.addColorStop(0, `rgba(220,130,190,${0.06+0.025*Math.sin(t*0.4)})`);
      g.addColorStop(0.5, "rgba(110,175,235,0.03)");
      g.addColorStop(1, "rgba(253,248,245,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      for (const o of orbs) {
        const pulse = 0.5 + 0.5 * Math.sin(t * o.speed + o.phase);
        ctx.save();
        ctx.globalAlpha = o.alpha * pulse;
        const rg = ctx.createRadialGradient(
          o.x*w, o.y*h, 0,
          o.x*w, o.y*h, o.r*(1+pulse*0.15)
        );
        const col = o.blue ? "110,175,235" : "220,120,170";
        rg.addColorStop(0, `rgba(${col},0.7)`);
        rg.addColorStop(1, `rgba(${col},0)`);
        ctx.fillStyle = rg;
        ctx.beginPath();
        ctx.arc(o.x*w, o.y*h, o.r*(1+pulse*0.15), 0, Math.PI*2);
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
      position: "fixed", inset: 0, zIndex: 90,
      background: "#fdf8f5",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      opacity: chosen ? 0 : (mounted ? 1 : 0),
      transform: mounted ? "scale(1)" : "scale(0.97)",
      transition: chosen
        ? "opacity 0.44s ease"
        : "opacity 0.5s ease, transform 0.5s cubic-bezier(0.22,1,0.36,1)",
      overflow: "hidden",
    }}>
      <canvas ref={canvasRef} style={{ position: "absolute", inset: 0 }} />

      <div style={{
        position: "relative", zIndex: 2,
        display: "flex", flexDirection: "column",
        alignItems: "center",
        width: "100%", padding: "0 28px",
      }}>
        {/* Logo */}
        <p style={{
          fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif",
          fontWeight: 700, fontSize: "clamp(44px,11vw,62px)",
          color: "rgba(40,30,50,0.88)",
          letterSpacing: "-0.04em", margin: 0,
          textAlign: "center", lineHeight: 1,
        }}>
          Touché
        </p>

        {/* Lips emoji accent */}
        <div style={{ fontSize: 28, margin: "10px 0", lineHeight: 1 }}>💋</div>

        {/* Divider with label */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "4px 0 36px" }}>
          <div style={{ width: 28, height: 1, background: "rgba(200,100,160,0.25)", borderRadius: 99 }} />
          <p style={{
            fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif",
            fontWeight: 300, fontSize: 10,
            letterSpacing: "0.28em", textTransform: "uppercase",
            color: "rgba(40,30,50,0.30)", margin: 0,
          }}>
            выберите язык
          </p>
          <div style={{ width: 28, height: 1, background: "rgba(200,100,160,0.25)", borderRadius: 99 }} />
        </div>

        {/* Language cards */}
        <div style={{ display: "flex", gap: 14, width: "100%", maxWidth: 320 }}>
          {([
            { lang: "ru" as Lang, primary: "Русский", sub: "Russian", flag: "🇷🇺" },
            { lang: "en" as Lang, primary: "English",  sub: "Английский", flag: "🇬🇧" },
          ]).map(({ lang, primary, sub, flag }) => (
            <button
              key={lang}
              onClick={() => pick(lang)}
              style={{
                flex: 1, padding: "22px 10px",
                borderRadius: 20,
                background: "rgba(255,252,248,0.80)",
                border: "1px solid rgba(200,100,160,0.16)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                cursor: "pointer",
                display: "flex", flexDirection: "column",
                alignItems: "center", gap: 8,
                transition: "all 0.22s ease",
                boxShadow: "0 2px 24px rgba(200,100,160,0.08)",
              }}
              onMouseEnter={e => {
                const el = e.currentTarget;
                el.style.background = "rgba(255,240,248,0.95)";
                el.style.borderColor = "rgba(220,100,160,0.35)";
                el.style.boxShadow = "0 4px 36px rgba(200,80,140,0.14)";
                el.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={e => {
                const el = e.currentTarget;
                el.style.background = "rgba(255,252,248,0.80)";
                el.style.borderColor = "rgba(200,100,160,0.16)";
                el.style.boxShadow = "0 2px 24px rgba(200,100,160,0.08)";
                el.style.transform = "translateY(0)";
              }}
            >
              <span style={{ fontSize: 28, lineHeight: 1 }}>{flag}</span>
              <span style={{
                fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif",
                fontWeight: 600, fontSize: 18,
                color: "rgba(40,30,50,0.88)",
                letterSpacing: "-0.01em",
              }}>
                {primary}
              </span>
              <span style={{
                fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif",
                fontWeight: 300, fontSize: 10,
                letterSpacing: "0.16em", textTransform: "uppercase",
                color: "rgba(200,100,160,0.55)",
              }}>
                {sub}
              </span>
            </button>
          ))}
        </div>

        {/* Tagline */}
        <p style={{
          fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif",
          fontWeight: 300, fontSize: 11,
          letterSpacing: "0.06em",
          color: "rgba(40,30,50,0.22)",
          marginTop: 32, textAlign: "center",
        }}>
          задания для пар на вечер
        </p>
      </div>
    </div>
  );
}
