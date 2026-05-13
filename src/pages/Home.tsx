import { useEffect, useRef, useCallback, useState } from "react";
import { UI, CATEGORY_CONFIG, type Lang, type Category } from "@/data/i18n";
import { useSensualSound } from "@/hooks/useSensualSound";

const CATEGORIES: Category[] = ["compliments", "tenderness", "desire", "passion", "hard"];

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        ready: () => void;
        expand: () => void;
        HapticFeedback?: { impactOccurred: (style: string) => void };
        initDataUnsafe?: { user?: { username?: string; id?: number }; start_param?: string };
        initData?: string;
        openTelegramLink?: (url: string) => void;
      };
    };
  }
}

interface HomeProps {
  lang: Lang;
  onCategorySelect: (cat: Category) => void;
}

const BOT_USERNAME = "ToucheBot";
const UNLOCK_KEY = "touche_unlocked_18";

function getUnlocked18(): boolean {
  try { return localStorage.getItem(UNLOCK_KEY) === "1"; } catch { return false; }
}
function setUnlocked18() {
  try { localStorage.setItem(UNLOCK_KEY, "1"); } catch {}
}

interface OrbProps {
  category: Category;
  lang: Lang;
  onClick: () => void;
  time: number;
  index: number;
}

function CategoryOrb({ category, lang, onClick, time, index }: OrbProps) {
  const cfg = CATEGORY_CONFIG[category];
  const { r, g, b } = cfg;
  const t = UI[lang];
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const timeRef = useRef(time + index * 1.3);
  const hoveredRef = useRef(false);

  const labels: Record<Category, { main: string; sub: string }> = {
    compliments: { main: t.catCompliments, sub: t.catComplimentsSub },
    tenderness:  { main: t.catTenderness,  sub: t.catTendernessSub  },
    desire:      { main: t.catDesire,      sub: t.catDesireSub      },
    passion:     { main: t.catPassion,     sub: t.catPassionSub     },
    hard:        { main: t.catHard,        sub: t.catHardSub        },
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
    };
    resize();

    const draw = () => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h / 2;
      const baseR = Math.min(w, h) * 0.38;
      const hoverMult = hoveredRef.current ? 1.08 : 1.0;
      const pulse = baseR * hoverMult * (0.92 + 0.08 * Math.sin(timeRef.current * 1.4 + index * 0.9));

      // Outer halo
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const halo = ctx.createRadialGradient(cx, cy, pulse * 0.6, cx, cy, pulse * 2.4);
      halo.addColorStop(0, `rgba(${r},${g},${b},${(0.15 + 0.06 * Math.sin(timeRef.current * 1.1)) * hoverMult})`);
      halo.addColorStop(0.5, `rgba(${r},${g},${b},0.04)`);
      halo.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(cx, cy, pulse * 2.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Orb body
      ctx.save();
      const grad = ctx.createRadialGradient(cx - pulse * 0.2, cy - pulse * 0.2, 0, cx, cy, pulse);
      grad.addColorStop(0, `rgba(${Math.min(255, r + 100)},${Math.min(255, g + 80)},${Math.min(255, b + 80)},${0.85 * hoverMult})`);
      grad.addColorStop(0.45, `rgba(${r},${g},${b},${0.6 * hoverMult})`);
      grad.addColorStop(0.8, `rgba(${Math.round(r * 0.6)},${Math.round(g * 0.6)},${Math.round(b * 0.6)},0.35)`);
      grad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Ring
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.beginPath();
      ctx.arc(cx, cy, pulse, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${Math.min(255, r + 80)},${Math.min(255, g + 80)},${Math.min(255, b + 80)},${0.5 + 0.3 * Math.sin(timeRef.current * 1.8)})`;
      ctx.lineWidth = 0.8;
      ctx.stroke();
      ctx.restore();

      timeRef.current += 0.018;
      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [r, g, b, index]);

  const lbl = labels[category];

  return (
    <div
      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, cursor: "pointer" }}
      onClick={onClick}
      onMouseEnter={() => { hoveredRef.current = true; }}
      onMouseLeave={() => { hoveredRef.current = false; }}
      onTouchStart={() => { hoveredRef.current = true; }}
      onTouchEnd={() => { hoveredRef.current = false; }}
    >
      <canvas
        ref={canvasRef}
        style={{ width: "100%", aspectRatio: "1", borderRadius: "50%" }}
      />
      <p style={{
        fontFamily: "'Cormorant Garamond', Georgia, serif",
        fontStyle: "italic", fontWeight: 400,
        fontSize: "clamp(13px, 3.5vw, 17px)",
        color: "rgba(255,252,245,0.88)",
        letterSpacing: "0.03em",
        margin: 0, textAlign: "center",
        textShadow: `0 0 16px rgba(${r},${g},${b},0.5)`,
      }}>
        {lbl.main}
      </p>
      <p style={{
        fontFamily: "'Raleway', sans-serif",
        fontWeight: 200,
        fontSize: "clamp(8px, 2.2vw, 10px)",
        letterSpacing: "0.16em", textTransform: "uppercase",
        color: `rgba(${r},${g},${b},0.55)`,
        margin: 0, textAlign: "center",
      }}>
        {lbl.sub}
      </p>
    </div>
  );
}

interface InviteToastProps {
  visible: boolean;
  text: string;
  accentRgb: { r: number; g: number; b: number };
}

function InviteToast({ visible, text, accentRgb }: InviteToastProps) {
  const { r, g, b } = accentRgb;
  return (
    <div style={{
      position: "absolute", top: 72, left: "50%", transform: "translateX(-50%)",
      zIndex: 60, pointerEvents: "none",
      opacity: visible ? 1 : 0, transition: "opacity 0.5s",
      background: "rgba(4,5,14,0.96)",
      border: `0.5px solid rgba(${r},${g},${b},0.4)`,
      boxShadow: `0 0 32px rgba(${r},${g},${b},0.2)`,
      borderRadius: 16, padding: "12px 20px",
      textAlign: "center", whiteSpace: "nowrap",
      backdropFilter: "blur(20px)",
    }}>
      <div style={{
        fontFamily: "'Cormorant Garamond', Georgia, serif",
        fontStyle: "italic", fontWeight: 500, fontSize: 17,
        color: "rgba(255,252,245,0.92)",
        textShadow: `0 0 16px rgba(${r},${g},${b},0.55)`,
      }}>
        {text}
      </div>
    </div>
  );
}

interface UnlockModalProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  lang: Lang;
  accentRgb: { r: number; g: number; b: number };
}

function UnlockModal({ open, onConfirm, onCancel, lang, accentRgb }: UnlockModalProps) {
  const t = UI[lang];
  const { r, g, b } = accentRgb;
  return (
    <>
      <div onClick={onCancel} style={{
        position: "absolute", inset: 0, zIndex: 40,
        background: "rgba(0,0,0,0.75)",
        opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none",
        transition: "opacity 0.3s",
      }} />
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 50,
        borderRadius: "22px 22px 0 0",
        background: "rgba(4,5,14,0.98)",
        backdropFilter: "blur(32px)",
        borderTop: `0.5px solid rgba(${r},${g},${b},0.3)`,
        boxShadow: `0 -14px 50px rgba(0,0,0,0.85)`,
        transform: open ? "translateY(0)" : "translateY(110%)",
        transition: "transform 0.42s cubic-bezier(0.32,0.72,0,1)",
        paddingBottom: 28,
      }}>
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 12, paddingBottom: 4 }}>
          <div style={{ width: 34, height: 3, borderRadius: 99, background: `rgba(${r},${g},${b},0.28)` }} />
        </div>
        <div style={{ textAlign: "center", padding: "14px 28px 24px" }}>
          <p style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontStyle: "italic", fontWeight: 400, fontSize: 26,
            color: "rgba(255,252,245,0.92)", margin: 0, letterSpacing: "0.03em",
          }}>
            {t.lockTitle}
          </p>
          <p style={{
            fontFamily: "'Raleway', sans-serif", fontWeight: 300, fontSize: 11,
            color: `rgba(${r},${g},${b},0.55)`, margin: "8px 0 0",
            letterSpacing: "0.08em",
          }}>
            {t.lockSub}
          </p>
        </div>
        <div style={{ padding: "0 20px 12px" }}>
          <button onClick={onConfirm} style={{
            width: "100%", padding: "16px 8px", borderRadius: 16,
            background: `rgba(${r},${g},${b},0.12)`,
            border: `1px solid rgba(${r},${g},${b},0.45)`,
            cursor: "pointer",
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontStyle: "italic", fontWeight: 500, fontSize: 20,
            color: "rgba(255,252,245,0.90)", letterSpacing: "0.02em",
          }}>
            {t.lockConfirm}
          </button>
        </div>
        <div style={{ padding: "0 20px" }}>
          <button onClick={onCancel} style={{
            width: "100%", padding: "13px 8px", borderRadius: 14,
            background: "transparent",
            border: "0.5px solid rgba(255,255,255,0.1)",
            cursor: "pointer",
            fontFamily: "'Raleway', sans-serif", fontWeight: 300, fontSize: 12,
            letterSpacing: "0.14em", textTransform: "uppercase",
            color: "rgba(255,255,255,0.28)",
          }}>
            {t.lockCancel}
          </button>
        </div>
      </div>
    </>
  );
}

export default function Home({ lang, onCategorySelect }: HomeProps) {
  const t = UI[lang];
  const { playSwitch } = useSensualSound();
  const [time, setTime] = useState(0);
  const [inviteToast, setInviteToast] = useState(false);
  const [unlockModal, setUnlockModal] = useState<Category | null>(null);
  const [unlocked18, setUnlocked18State] = useState(getUnlocked18);

  // Animate time for orbs
  useEffect(() => {
    let raf: number;
    const tick = () => { setTime(t => t + 0.018); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Telegram init
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();
      // Referral bonus
      const startParam = tg.initDataUnsafe?.start_param;
      if (startParam?.startsWith("ref_")) {
        setInviteToast(true);
        setTimeout(() => setInviteToast(false), 3500);
      }
    }
  }, []);

  const handleCategoryClick = useCallback((cat: Category) => {
    const tg = window.Telegram?.WebApp;
    tg?.HapticFeedback?.impactOccurred("light");
    const cfg = CATEGORY_CONFIG[cat];
    playSwitch(cat === "compliments" ? 440 : cat === "tenderness" ? 520 : cat === "desire" ? 600 : cat === "passion" ? 380 : 300);

    if (cfg.paid && !unlocked18) {
      setUnlockModal(cat);
      return;
    }
    onCategorySelect(cat);
  }, [unlocked18, onCategorySelect, playSwitch]);

  const handleUnlockConfirm = useCallback(() => {
    setUnlocked18(true);
    setUnlocked18State(true);
    const cat = unlockModal!;
    setUnlockModal(null);
    setTimeout(() => onCategorySelect(cat), 300);
  }, [unlockModal, onCategorySelect]);

  const handleInvite = useCallback(() => {
    const tg = window.Telegram?.WebApp;
    const userId = tg?.initDataUnsafe?.user?.id;
    if (tg?.openTelegramLink && userId) {
      tg.openTelegramLink(`https://t.me/share/url?url=https://t.me/${BOT_USERNAME}?start=ref_${userId}&text=${encodeURIComponent(t.inviteText)}`);
    }
  }, [t.inviteText]);

  const accentRgb = CATEGORY_CONFIG.passion;

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "#030508",
      display: "flex", flexDirection: "column",
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "16px 22px 8px",
        flexShrink: 0,
      }}>
        <p style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontStyle: "italic", fontWeight: 400, fontSize: 22,
          color: "rgba(255,252,245,0.88)", letterSpacing: "0.06em", margin: 0,
          textShadow: "0 0 24px rgba(200,60,130,0.4)",
        }}>
          Touché
        </p>
        <button
          onClick={handleInvite}
          style={{
            background: "transparent", border: "0.5px solid rgba(255,255,255,0.12)",
            borderRadius: 99, padding: "7px 16px",
            cursor: "pointer",
            fontFamily: "'Raleway', sans-serif", fontWeight: 300, fontSize: 10,
            letterSpacing: "0.18em", textTransform: "uppercase",
            color: "rgba(255,255,255,0.30)",
          }}
        >
          {t.invite}
        </button>
      </div>

      {/* Subtitle */}
      <p style={{
        fontFamily: "'Raleway', sans-serif", fontWeight: 200, fontSize: 9,
        color: "rgba(255,252,245,0.18)", letterSpacing: "0.22em",
        textTransform: "uppercase", textAlign: "center",
        margin: "2px 0 14px",
      }}>
        {lang === "ru" ? "выбери категорию" : "choose a category"}
      </p>

      {/* Orbs grid */}
      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        justifyContent: "center", padding: "0 16px",
        minHeight: 0,
        gap: 8,
      }}>
        {/* Top row: 3 orbs */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 12,
          padding: "0 4px",
        }}>
          {CATEGORIES.slice(0, 3).map((cat, i) => (
            <CategoryOrb
              key={cat}
              category={cat}
              lang={lang}
              onClick={() => handleCategoryClick(cat)}
              time={time}
              index={i}
            />
          ))}
        </div>

        {/* Bottom row: 2 orbs */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 12,
          padding: "0 14%",
        }}>
          {CATEGORIES.slice(3).map((cat, i) => (
            <CategoryOrb
              key={cat}
              category={cat}
              lang={lang}
              onClick={() => handleCategoryClick(cat)}
              time={time}
              index={i + 3}
            />
          ))}
        </div>
      </div>

      {/* Bottom hint */}
      <p style={{
        fontFamily: "'Raleway', sans-serif", fontWeight: 200, fontSize: 8,
        color: "rgba(255,252,245,0.15)", letterSpacing: "0.20em",
        textTransform: "uppercase", textAlign: "center",
        padding: "10px 0 20px",
        flexShrink: 0,
      }}>
        {lang === "ru" ? "1 задание в день · больше за ★" : "1 task a day · more for ★"}
      </p>

      {/* Invite toast */}
      <InviteToast visible={inviteToast} text={t.inviteBonus} accentRgb={accentRgb} />

      {/* 18+ unlock modal */}
      <UnlockModal
        open={unlockModal !== null}
        onConfirm={handleUnlockConfirm}
        onCancel={() => setUnlockModal(null)}
        lang={lang}
        accentRgb={unlockModal ? CATEGORY_CONFIG[unlockModal] : accentRgb}
      />
    </div>
  );
}
