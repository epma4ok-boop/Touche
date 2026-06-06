import { useEffect, useRef, useState } from "react";
import type { Lang } from "@/data/i18n";

export type Gender = "male" | "female";
export const GENDER_KEY = "touche_gender";

interface GenderSelectProps {
  lang: Lang;
  onSelect: (gender: Gender) => void;
}

const LABELS: Record<Lang, { male: string; maleSub: string; female: string; femaleSub: string; title: string }> = {
  ru: { title: "Кто ты?", male: "Мужчина", maleSub: "задания для него", female: "Женщина", femaleSub: "задания для неё" },
  en: { title: "Who are you?", male: "Man", maleSub: "tasks for him", female: "Woman", femaleSub: "tasks for her" },
  hi: { title: "आप कौन हैं?", male: "पुरुष", maleSub: "उसके लिए कार्य", female: "महिला", femaleSub: "उसके लिए कार्य" },
  pt: { title: "Quem é você?", male: "Homem", maleSub: "tarefas para ele", female: "Mulher", femaleSub: "tarefas para ela" },
  es: { title: "¿Quién eres?", male: "Hombre", maleSub: "tareas para él", female: "Mujer", femaleSub: "tareas para ella" },
};

const PR = 220, PG = 36, PB = 118;
const PINK = `rgb(${PR},${PG},${PB})`;

export default function GenderSelect({ lang, onSelect }: GenderSelectProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [chosen, setChosen] = useState<Gender | null>(null);
  const [mounted, setMounted] = useState(false);
  const labels = LABELS[lang] ?? LABELS.ru;

  useEffect(() => { requestAnimationFrame(() => setMounted(true)); }, []);

  const pick = (gender: Gender) => {
    setChosen(gender);
    setTimeout(() => onSelect(gender), 380);
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
      g.addColorStop(1, "transparent");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      for (const o of orbs) {
        const a = o.phase + t * o.speed;
        const cx = (o.x + Math.sin(a) * 0.08) * w;
        const cy = (o.y + Math.cos(a * 1.3) * 0.06) * h;
        const gr = ctx.createRadialGradient(cx, cy, 0, cx, cy, o.r);
        const c = o.pink ? `${PR},${PG},${PB}` : "200,80,130";
        gr.addColorStop(0, `rgba(${c},${o.alpha})`);
        gr.addColorStop(1, "transparent");
        ctx.fillStyle = gr;
        ctx.fillRect(cx - o.r, cy - o.r, o.r * 2, o.r * 2);
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    const ro = new ResizeObserver(resize);
    ro.observe(document.body);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);

  return (
    <div style={{ position: "fixed", inset: 0, overflow: "hidden", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 0 }} />

      <div style={{
        position: "relative", zIndex: 1,
        display: "flex", flexDirection: "column", alignItems: "center",
        gap: 28, padding: "0 28px", width: "100%", maxWidth: 340,
        opacity: mounted ? 1 : 0,
        transform: mounted ? "translateY(0)" : "translateY(18px)",
        transition: "opacity .45s ease, transform .45s ease",
      }}>
        {/* Title */}
        <div style={{ textAlign: "center", marginBottom: 4 }}>
          <p style={{
            fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif",
            fontWeight: 700, fontSize: 26, color: "rgba(255,238,248,0.97)",
            letterSpacing: "-0.03em", margin: 0,
          }}>{labels.title}</p>
          <p style={{
            fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif",
            fontWeight: 400, fontSize: 13, color: `rgba(${PR},${PG},${PB},0.75)`,
            marginTop: 6, letterSpacing: "0.06em",
          }}>♂ · ♀</p>
        </div>

        {/* Male button */}
        {(["male", "female"] as Gender[]).map((g) => {
          const isMale = g === "male";
          const label = isMale ? labels.male : labels.female;
          const sub = isMale ? labels.maleSub : labels.femaleSub;
          const symbol = isMale ? "♂" : "♀";
          const isChosen = chosen === g;
          return (
            <button
              key={g}
              onClick={() => pick(g)}
              style={{
                width: "100%", padding: "22px 24px",
                borderRadius: 20,
                border: `1px solid rgba(${PR},${PG},${PB},${isChosen ? 0.75 : 0.30})`,
                background: isChosen
                  ? `rgba(${PR},${PG},${PB},0.15)`
                  : "rgba(16,7,12,0.85)",
                cursor: "pointer", textAlign: "left",
                display: "flex", alignItems: "center", gap: 18,
                boxShadow: isChosen
                  ? `0 0 28px rgba(${PR},${PG},${PB},0.35), inset 0 1px 0 rgba(${PR},${PG},${PB},0.15)`
                  : `0 0 14px rgba(${PR},${PG},${PB},0.12), inset 0 1px 0 rgba(${PR},${PG},${PB},0.06)`,
                transform: isChosen ? "scale(1.02)" : "scale(1)",
                transition: "all .22s cubic-bezier(.32,.72,0,1)",
                backdropFilter: "blur(12px)",
              }}
            >
              {/* Symbol circle */}
              <div style={{
                width: 52, height: 52, borderRadius: "50%", flexShrink: 0,
                border: `1px solid rgba(${PR},${PG},${PB},0.40)`,
                background: `radial-gradient(circle at 38% 32%, rgba(${PR},${PG},${PB},0.22), rgba(${PR},${PG},${PB},0.06) 60%, transparent)`,
                boxShadow: `0 0 16px rgba(${PR},${PG},${PB},0.20)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 24,
                color: PINK,
                filter: `drop-shadow(0 0 6px rgba(${PR},${PG},${PB},0.90))`,
              }}>
                {symbol}
              </div>
              <div>
                <div style={{
                  fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif",
                  fontWeight: 700, fontSize: 19,
                  color: "rgba(255,238,248,0.97)",
                  letterSpacing: "-0.01em",
                }}>{label}</div>
                <div style={{
                  fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif",
                  fontWeight: 400, fontSize: 12,
                  color: `rgba(${PR},${PG},${PB},0.65)`,
                  marginTop: 3,
                }}>{sub}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
