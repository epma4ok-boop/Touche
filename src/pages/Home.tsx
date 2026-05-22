// src/pages/Home.tsx — redesigned elegant category icons
import { useEffect, useCallback, useState } from "react";
import { UI, CATEGORY_CONFIG, CATEGORIES_ORDER, type Lang, type Category } from "@/data/i18n";
import { BOT_USERNAME } from "@/config";

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        ready: () => void; expand: () => void;
        viewportHeight?: number;
        viewportStableHeight?: number;
        HapticFeedback?: { impactOccurred: (style: string) => void; notificationOccurred: (type: string) => void };
        initDataUnsafe?: { user?: { username?: string; id?: number }; start_param?: string };
        initData?: string;
        openTelegramLink?: (url: string) => void;
        colorScheme?: "light" | "dark";
      };
    };
  }
}

interface HomeProps {
  lang: Lang;
  onCategorySelect: (cat: Category) => void;
  onScenarioOpen: () => void;
}

// ── Elegant SVG Icons ────────────────────────────────────────────────────────

function IconCompliments({ r, g, b, active }: { r: number; g: number; b: number; active: boolean }) {
  const a = active ? 0.80 : 0.52;
  const fa = active ? 0.16 : 0.07;
  return (
    <svg viewBox="0 0 44 44" fill="none" style={{ width: 44, height: 44 }}>
      {/* Elegant speech-heart: two arcs forming a heart in a speech shape */}
      <path
        d="M22 36 L17 31 H13 C10.8 31 9 29.2 9 27 V15 C9 12.8 10.8 11 13 11 H31 C33.2 11 35 12.8 35 15 V27 C35 29.2 33.2 31 31 31 H27 L22 36 Z"
        fill={`rgba(${r},${g},${b},${fa})`}
        stroke={`rgba(${r},${g},${b},${a})`}
        strokeWidth="1.5" strokeLinejoin="round"
      />
      {/* Small heart inside */}
      <path
        d="M22 25 C22 25 16 20.5 16 17.5 C16 15.6 17.6 14 19.5 14 C20.7 14 21.7 14.6 22 15.5 C22.3 14.6 23.3 14 24.5 14 C26.4 14 28 15.6 28 17.5 C28 20.5 22 25 22 25 Z"
        fill={`rgba(${r},${g},${b},${active ? 0.60 : 0.30})`}
        stroke={`rgba(${r},${g},${b},${a * 0.7})`}
        strokeWidth="0.8"
      />
    </svg>
  );
}

function IconTenderness({ r, g, b, active }: { r: number; g: number; b: number; active: boolean }) {
  const a = active ? 0.80 : 0.52;
  return (
    <svg viewBox="0 0 44 44" fill="none" style={{ width: 44, height: 44 }}>
      {/* Two hands meeting at fingertips */}
      {/* Left hand */}
      <g>
        <path d="M10 32 C10 32 8 28 9 22 C9.5 18 11 15 13 14 L15 13 L16 14 C14 15 13 18 13 22 C13 26 14 29 15 31 Z"
          fill={`rgba(${r},${g},${b},${active ? 0.18 : 0.09})`} stroke={`rgba(${r},${g},${b},${a})`} strokeWidth="1.3" strokeLinejoin="round"/>
        {/* Fingers left */}
        <line x1="13" y1="14" x2="16" y2="10" stroke={`rgba(${r},${g},${b},${a})`} strokeWidth="1.3" strokeLinecap="round"/>
        <line x1="15" y1="13" x2="18" y2="9.5" stroke={`rgba(${r},${g},${b},${a})`} strokeWidth="1.3" strokeLinecap="round"/>
        <line x1="16.5" y1="13.5" x2="20" y2="10" stroke={`rgba(${r},${g},${b},${a * 0.7})`} strokeWidth="1.2" strokeLinecap="round"/>
      </g>
      {/* Right hand */}
      <g transform="scale(-1,1) translate(-44,0)">
        <path d="M10 32 C10 32 8 28 9 22 C9.5 18 11 15 13 14 L15 13 L16 14 C14 15 13 18 13 22 C13 26 14 29 15 31 Z"
          fill={`rgba(${r},${g},${b},${active ? 0.14 : 0.07})`} stroke={`rgba(${r},${g},${b},${a * 0.85})`} strokeWidth="1.3" strokeLinejoin="round"/>
        <line x1="13" y1="14" x2="16" y2="10" stroke={`rgba(${r},${g},${b},${a * 0.85})`} strokeWidth="1.3" strokeLinecap="round"/>
        <line x1="15" y1="13" x2="18" y2="9.5" stroke={`rgba(${r},${g},${b},${a * 0.85})`} strokeWidth="1.3" strokeLinecap="round"/>
        <line x1="16.5" y1="13.5" x2="20" y2="10" stroke={`rgba(${r},${g},${b},${a * 0.6})`} strokeWidth="1.2" strokeLinecap="round"/>
      </g>
      {/* Touch glow at center */}
      <circle cx="22" cy="21" r="3.5" fill={`rgba(${r},${g},${b},${active ? 0.30 : 0.13})`}/>
      <circle cx="22" cy="21" r="1.5" fill={`rgba(${r},${g},${b},${active ? 0.65 : 0.30})`}/>
    </svg>
  );
}

function IconDesire({ r, g, b, active }: { r: number; g: number; b: number; active: boolean }) {
  const a = active ? 0.80 : 0.52;
  return (
    <svg viewBox="0 0 44 44" fill="none" style={{ width: 44, height: 44 }}>
      {/* Elegant eye with a flame iris */}
      {/* Eye outline */}
      <path
        d="M7 22 C7 22 13 12 22 12 C31 12 37 22 37 22 C37 22 31 32 22 32 C13 32 7 22 7 22 Z"
        fill={`rgba(${r},${g},${b},${active ? 0.10 : 0.05})`}
        stroke={`rgba(${r},${g},${b},${a})`}
        strokeWidth="1.5" strokeLinejoin="round"
      />
      {/* Iris */}
      <circle cx="22" cy="22" r="6" fill={`rgba(${r},${g},${b},${active ? 0.22 : 0.11})`}
        stroke={`rgba(${r},${g},${b},${a})`} strokeWidth="1.2"/>
      {/* Pupil */}
      <circle cx="22" cy="22" r="2.8" fill={`rgba(${r},${g},${b},${active ? 0.65 : 0.38})`}/>
      {/* Flame inside iris */}
      <path d="M22 19.5 C22 19.5 20 21 20.5 23 C21 24.5 22 25 22 25 C22 25 24 24 23.5 22.5 C23 21 22 19.5 22 19.5 Z"
        fill={`rgba(${r},${g},${b},${active ? 0.90 : 0.55})`}/>
      {/* Lash top */}
      <line x1="16" y1="15" x2="15" y2="12.5" stroke={`rgba(${r},${g},${b},${a * 0.6})`} strokeWidth="1" strokeLinecap="round"/>
      <line x1="22" y1="12.5" x2="22" y2="10" stroke={`rgba(${r},${g},${b},${a * 0.6})`} strokeWidth="1" strokeLinecap="round"/>
      <line x1="28" y1="15" x2="29" y2="12.5" stroke={`rgba(${r},${g},${b},${a * 0.6})`} strokeWidth="1" strokeLinecap="round"/>
    </svg>
  );
}

function IconPassion({ r, g, b, active }: { r: number; g: number; b: number; active: boolean }) {
  const a = active ? 0.80 : 0.52;
  return (
    <svg viewBox="0 0 44 44" fill="none" style={{ width: 44, height: 44 }}>
      {/* Stylized lips */}
      {/* Upper lip */}
      <path
        d="M10 22 C10 22 14 16 18 17 C20 17.5 21 18.5 22 18.5 C23 18.5 24 17.5 26 17 C30 16 34 22 34 22"
        fill={`rgba(${r},${g},${b},${active ? 0.15 : 0.07})`}
        stroke={`rgba(${r},${g},${b},${a})`}
        strokeWidth="1.5" strokeLinecap="round"
      />
      {/* Cupid's bow detail */}
      <path d="M18.5 18.5 C20 20 22 19 22 18.5 C22 19 24 20 25.5 18.5"
        stroke={`rgba(${r},${g},${b},${a * 0.55})`} strokeWidth="1" strokeLinecap="round" fill="none"/>
      {/* Lower lip */}
      <path
        d="M10 22 C10 22 13 28.5 22 28.5 C31 28.5 34 22 34 22"
        fill={`rgba(${r},${g},${b},${active ? 0.22 : 0.10})`}
        stroke={`rgba(${r},${g},${b},${a})`}
        strokeWidth="1.5" strokeLinecap="round"
      />
      {/* Lower lip sheen */}
      <path d="M16 26 C18 27.5 26 27.5 28 26"
        stroke={`rgba(${r},${g},${b},${active ? 0.45 : 0.22})`} strokeWidth="1.8" strokeLinecap="round" fill="none"/>
      {/* Center line */}
      <path d="M10 22 Q22 23.5 34 22"
        stroke={`rgba(${r},${g},${b},${a * 0.7})`} strokeWidth="1" strokeLinecap="round" fill="none"/>
    </svg>
  );
}

function IconHard({ r, g, b, active }: { r: number; g: number; b: number; active: boolean }) {
  const a = active ? 0.80 : 0.52;
  return (
    <svg viewBox="0 0 44 44" fill="none" style={{ width: 44, height: 44 }}>
      {/* Elegant chain / infinity knot */}
      {/* Left link */}
      <ellipse cx="15" cy="22" rx="6" ry="9"
        fill={`rgba(${r},${g},${b},${active ? 0.13 : 0.06})`}
        stroke={`rgba(${r},${g},${b},${a})`} strokeWidth="2"/>
      {/* Right link */}
      <ellipse cx="29" cy="22" rx="6" ry="9"
        fill={`rgba(${r},${g},${b},${active ? 0.13 : 0.06})`}
        stroke={`rgba(${r},${g},${b},${a})`} strokeWidth="2"/>
      {/* Overlap mask — white fills to simulate interlock */}
      <rect x="21" y="14" width="8" height="6" fill="#fdf8f5"/>
      <ellipse cx="29" cy="22" rx="6" ry="9"
        fill="none" stroke={`rgba(${r},${g},${b},${a})`} strokeWidth="2"
        strokeDasharray="10 18" strokeDashoffset="5"/>
      {/* Center connecting bar */}
      <rect x="18" y="20" width="8" height="4" rx="2"
        fill={`rgba(${r},${g},${b},${active ? 0.50 : 0.28})`}/>
    </svg>
  );
}

const CATEGORY_ICONS: Record<Category, typeof IconCompliments> = {
  compliments: IconCompliments, tenderness: IconTenderness,
  desire: IconDesire, passion: IconPassion, hard: IconHard,
};

// ── Category band ────────────────────────────────────────────────────────────
function CategoryBand({ category, lang, onClick, index }: { category: Category; lang: Lang; onClick: () => void; index: number }) {
  const cfg = CATEGORY_CONFIG[category];
  const { r, g, b } = cfg;
  const t = UI[lang];
  const [pressed, setPressed] = useState(false);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const tm = setTimeout(() => setVisible(true), index * 65 + 60);
    return () => clearTimeout(tm);
  }, [index]);
  const Icon = CATEGORY_ICONS[category];
  const labels: Record<Category, { main: string; sub: string }> = {
    compliments: { main: t.catCompliments, sub: t.catComplimentsSub },
    tenderness:  { main: t.catTenderness,  sub: t.catTendernessSub },
    desire:      { main: t.catDesire,      sub: t.catDesireSub },
    passion:     { main: t.catPassion,     sub: t.catPassionSub },
    hard:        { main: t.catHard,        sub: t.catHardSub },
  };
  const lbl = labels[category];
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setPressed(true)} onMouseLeave={() => setPressed(false)}
      onTouchStart={() => setPressed(true)} onTouchEnd={() => setPressed(false)}
      style={{
        position: "relative", width: "100%",
        background: pressed ? `rgba(${r},${g},${b},0.07)` : "transparent",
        border: "none", borderBottom: "0.5px solid rgba(40,30,50,0.07)",
        cursor: "pointer", display: "flex", alignItems: "center",
        flex: 1, minHeight: 0, overflow: "hidden",
        transition: "background 0.18s, opacity 0.38s, transform 0.38s",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateX(0)" : "translateX(-16px)",
      }}
    >
      {/* Left accent bar */}
      <div style={{
        width: pressed ? 5 : 3, alignSelf: "stretch", flexShrink: 0,
        background: `linear-gradient(to bottom, rgba(${r},${g},${b},0), rgba(${r},${g},${b},${pressed ? 0.92 : 0.52}), rgba(${r},${g},${b},0))`,
        transition: "width 0.18s", borderRadius: "0 2px 2px 0",
      }} />
      {/* Icon */}
      <div style={{
        flexShrink: 0, width: 56, height: 56,
        display: "flex", alignItems: "center", justifyContent: "center",
        marginLeft: 14,
        background: `rgba(${r},${g},${b},${pressed ? 0.11 : 0.06})`,
        borderRadius: 18,
        transition: "background 0.18s, transform 0.18s",
        transform: pressed ? "scale(1.06)" : "scale(1)",
        border: `1px solid rgba(${r},${g},${b},${pressed ? 0.22 : 0.10})`,
      }}>
        <Icon r={r} g={g} b={b} active={pressed} />
      </div>
      {/* Text */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "flex-start", justifyContent: "center", padding: "0 12px 0 16px" }}>
        <p style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600,
          fontSize: "clamp(19px,5vw,27px)", color: pressed ? `rgb(${r},${g},${b})` : "rgba(40,30,50,0.85)",
          letterSpacing: "-0.022em", margin: 0, lineHeight: 1.15,
          transition: "color 0.18s",
        }}>
          {lbl.main}
          {cfg.paid && (
            <span style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 400, fontSize: 9,
              letterSpacing: "0.14em", textTransform: "uppercase",
              color: `rgba(${r},${g},${b},0.55)`, marginLeft: 9, verticalAlign: "middle",
            }}>18+</span>
          )}
        </p>
        <p style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 300,
          fontSize: "clamp(9px,2.1vw,11px)", letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: `rgba(${r},${g},${b},${pressed ? 0.68 : 0.42})`,
          margin: "4px 0 0", transition: "color 0.18s",
        }}>
          {lbl.sub}
        </p>
      </div>
      {/* Right badge / arrow */}
      <div style={{ flexShrink: 0, padding: "0 18px 0 0" }}>
        {cfg.paid ? (
          <div style={{
            padding: "4px 10px", borderRadius: 8,
            border: `1px solid rgba(${r},${g},${b},${pressed ? 0.45 : 0.18})`,
            background: `rgba(${r},${g},${b},0.06)`,
            fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 500, fontSize: 10,
            letterSpacing: "0.12em", textTransform: "uppercase",
            color: `rgba(${r},${g},${b},${pressed ? 0.82 : 0.55})`,
            transition: "all 0.18s",
          }}>
            ★
          </div>
        ) : (
          <svg viewBox="0 0 16 16" width="16" height="16" fill="none">
            <path d="M6 4 L10 8 L6 12" stroke={`rgba(${r},${g},${b},${pressed ? 0.60 : 0.30})`}
              strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </div>
    </button>
  );
}

// ── Scenario button ──────────────────────────────────────────────────────────
function ScenarioButton({ lang, onClick }: { lang: Lang; onClick: () => void }) {
  const [pressed, setPressed] = useState(false);
  const t = UI[lang];
  return (
    <button
      onClick={onClick}
      onTouchStart={() => setPressed(true)} onTouchEnd={() => setPressed(false)}
      onMouseEnter={() => setPressed(true)} onMouseLeave={() => setPressed(false)}
      style={{
        width: "calc(100% - 40px)", margin: "0 20px",
        background: pressed ? "rgba(155,15,90,0.10)" : "rgba(155,15,90,0.06)",
        border: "1px solid rgba(155,15,90,0.18)",
        borderRadius: 16, cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        gap: 10, padding: "13px 20px",
        transition: "background 0.18s, transform 0.18s",
        transform: pressed ? "scale(0.98)" : "scale(1)",
      }}
    >
      <svg viewBox="0 0 20 20" width="18" height="18" fill="none">
        <rect x="3" y="4" width="14" height="12" rx="2.5"
          fill="rgba(155,15,90,0.12)" stroke="rgba(155,15,90,0.60)" strokeWidth="1.4"/>
        <path d="M7 9 L13 9 M7 12 L11 12"
          stroke="rgba(155,15,90,0.60)" strokeWidth="1.3" strokeLinecap="round"/>
      </svg>
      <span style={{
        fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 500, fontSize: 12,
        letterSpacing: "0.10em", textTransform: "uppercase",
        color: "rgba(155,15,90,0.70)",
      }}>
        {lang === "ru" ? "Сценарии для пары" : "Couple scenarios"}
      </span>
    </button>
  );
}

// ── Home ─────────────────────────────────────────────────────────────────────
export default function Home({ lang, onCategorySelect, onScenarioOpen }: HomeProps) {
  const t = UI[lang];
  const [mounted, setMounted] = useState(false);
  const [vh, setVh] = useState<number | null>(null);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    tg?.ready();
    tg?.expand();
    requestAnimationFrame(() => setMounted(true));

    // Use Telegram viewport height for fullscreen correctness
    function updateVh() {
      const h = tg?.viewportStableHeight ?? tg?.viewportHeight;
      if (h) setVh(h);
    }
    updateVh();
    // @ts-ignore
    tg?.onEvent?.("viewportChanged", updateVh);
    return () => {
      // @ts-ignore
      tg?.offEvent?.("viewportChanged", updateVh);
    };
  }, []);

  const handleInvite = useCallback(() => {
    const tg = window.Telegram?.WebApp;
    const userId = tg?.initDataUnsafe?.user?.id;
    if (tg?.openTelegramLink && userId) {
      tg.openTelegramLink(`https://t.me/share/url?url=https://t.me/${BOT_USERNAME}?start=ref_${userId}&text=${encodeURIComponent(t.inviteText)}`);
    }
    tg?.HapticFeedback?.impactOccurred("light");
  }, [t.inviteText]);

  const height = vh ? `${vh}px` : "100dvh";

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "#fdf8f5",
      display: "flex", flexDirection: "column",
      overflow: "hidden",
      height,
      opacity: mounted ? 1 : 0,
      transition: "opacity 0.28s ease",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "flex-end",
        padding: "max(14px, env(safe-area-inset-top)) 20px 10px",
        flexShrink: 0,
      }}>
        <div>
          <p style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700,
            fontSize: 28, letterSpacing: "-0.03em", color: "rgba(40,30,50,0.90)",
            margin: 0, lineHeight: 1,
          }}>
            {t.appName}
          </p>
          <p style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 300,
            fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase",
            color: "rgba(40,30,50,0.35)", margin: "5px 0 0",
          }}>
            {t.appSub}
          </p>
        </div>
        <button
          onClick={handleInvite}
          style={{
            background: "transparent", border: "none", cursor: "pointer",
            fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 400,
            fontSize: 12, letterSpacing: "0.08em",
            color: "rgba(40,30,50,0.35)", padding: "4px 0",
          }}
        >
          {t.invite}
        </button>
      </div>

      {/* Category list */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
        {CATEGORIES_ORDER.map((cat, i) => (
          <CategoryBand
            key={cat}
            category={cat}
            lang={lang}
            onClick={() => {
              window.Telegram?.WebApp?.HapticFeedback?.impactOccurred("light");
              onCategorySelect(cat);
            }}
            index={i}
          />
        ))}
      </div>

      {/* Scenario button + footer */}
      <div style={{
        flexShrink: 0,
        paddingBottom: "max(16px, env(safe-area-inset-bottom))",
        display: "flex", flexDirection: "column", gap: 10,
        paddingTop: 12,
      }}>
        <ScenarioButton lang={lang} onClick={onScenarioOpen} />
        <p style={{
          textAlign: "center",
          fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 300,
          fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase",
          color: "rgba(40,30,50,0.22)", margin: 0,
        }}>
          {t.footerHint}
        </p>
      </div>
    </div>
  );
}
