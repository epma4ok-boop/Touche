import { useEffect, useCallback, useState } from "react";
import { UI, CATEGORY_CONFIG, CATEGORIES_ORDER, LANG_CYCLE, type Lang, type Category } from "@/data/i18n";
import { BOT_USERNAME } from "@/config";

const BG = "#0d0610";
const TEXT_T = "rgba(255,238,248,0.18)";

declare global {
  interface Window {
    Telegram?: { WebApp: {
      ready: () => void; expand: () => void;
      viewportHeight?: number; viewportStableHeight?: number;
      HapticFeedback?: { impactOccurred: (s: string) => void };
      initDataUnsafe?: { user?: { username?: string; id?: number }; start_param?: string };
      initData?: string;
      openTelegramLink?: (url: string) => void;
      onEvent?: (e: string, cb: () => void) => void;
      offEvent?: (e: string, cb: () => void) => void;
      safeAreaInset?: { top: number; bottom: number; left: number; right: number };
      contentSafeAreaInset?: { top: number; bottom: number; left: number; right: number };
    } };
  }
}

function getCoupleId(): string | null {
  try { return localStorage.getItem("touche_couple_id"); } catch { return null; }
}

interface HomeProps {
  lang: Lang;
  onCategorySelect: (cat: Category) => void;
  onScenarioOpen: () => void;
  onLangSwitch: () => void;
}

function useTelegramTopInset(): number {
  const [topPx, setTopPx] = useState<number>(0);
  useEffect(() => {
    const tg = window.Telegram?.WebApp as any;
    function compute() {
      const content = tg?.contentSafeAreaInset?.top ?? 0;
      const safe = tg?.safeAreaInset?.top ?? 0;
      const total = content + safe;
      setTopPx(total > 10 ? total + 10 : 44);
    }
    compute();
    tg?.onEvent?.("safeAreaChanged", compute);
    tg?.onEvent?.("contentSafeAreaInsetChanged", compute);
    const tm = setTimeout(compute, 800);
    return () => {
      tg?.offEvent?.("safeAreaChanged", compute);
      tg?.offEvent?.("contentSafeAreaInsetChanged", compute);
      clearTimeout(tm);
    };
  }, []);
  return topPx || 44;
}

/* ─── Unified neon pink colour ─────────────────────────── */
const PR = 220, PG = 36, PB = 120;
const PINK = `rgb(${PR},${PG},${PB})`;
const PINK_GLOW = `drop-shadow(0 0 6px rgba(${PR},${PG},${PB},1)) drop-shadow(0 0 12px rgba(${PR},${PG},${PB},0.55))`;

/* ─── Icons exactly matching the reference image ────────── */
function CategoryIcon({ type }: { type: Category | "scenarios" | "invite" }) {
  const base = {
    width: "22", height: "22", viewBox: "0 0 24 24", fill: "none",
    stroke: PINK, strokeWidth: "1.6" as const,
    strokeLinecap: "round" as const, strokeLinejoin: "round" as const,
    style: { filter: PINK_GLOW, display: "block" as const, flexShrink: 0 },
  };

  switch (type) {
    /* Heart outline */
    case "compliments":
      return (
        <svg {...base}>
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      );
    /* Feather */
    case "tenderness":
      return (
        <svg {...base}>
          <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z" />
          <line x1="16" y1="8" x2="2" y2="22" />
          <line x1="17.5" y1="15" x2="9" y2="15" />
        </svg>
      );
    /* Lips */
    case "desire":
      return (
        <svg {...base} viewBox="0 0 24 24">
          <path d="M2 9c0 0 3.5-1.5 6-1s3 2 4 2 2.5-2.5 6-2 4 2.5 4 2.5" />
          <path d="M2 9c0 0 1 4 4 5.5s4.5 1 6 1 3 .5 6-1 4-5.5 4-5.5" />
          <path d="M8 9c0 0 1.5 2 4 2s4-2 4-2" />
        </svg>
      );
    /* Flame */
    case "passion":
      return (
        <svg {...base} viewBox="0 0 24 24">
          <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
        </svg>
      );
    /* Handcuffs */
    case "hard":
      return (
        <svg {...base} viewBox="0 0 24 24">
          <circle cx="7" cy="12" r="3" />
          <circle cx="17" cy="12" r="3" />
          <line x1="10" y1="12" x2="14" y2="12" />
          <path d="M4 9.5V7a3 3 0 0 1 6 0v2.5" />
          <path d="M14 9.5V7a3 3 0 0 1 6 0v2.5" />
        </svg>
      );
    /* Theatrical mask */
    case "scenarios":
      return (
        <svg {...base} viewBox="0 0 24 24">
          <path d="M2 12C2 6.48 6.48 2 12 2s10 4.48 10 10c0 2.5-2.5 6-5 7.5S13 21 12 21c-1 0-3-.5-5-1.5S2 14.5 2 12z" />
          <path d="M8.5 13.5c.5 1 1.5 1.5 2 1.5" />
          <path d="M13.5 13.5c.5 1 1.5 1.5 2 1.5" />
          <path d="M7 9.5c.5-1 1.5-1 2 0" />
          <path d="M15 9.5c.5-1 1.5-1 2 0" />
        </svg>
      );
    /* Two wine glasses clinking */
    case "invite":
      return (
        <svg {...base} viewBox="0 0 24 24">
          <path d="M8 22h8M12 11v11M5 2h14l-1.68 8.39a2 2 0 0 1-1.96 1.61H8.64a2 2 0 0 1-1.96-1.61L5 2z" />
          <path d="M19 2c0 6-4 9-4 9M5 2c0 6 4 9 4 9" />
        </svg>
      );
    default:
      return null;
  }
}

/* ─── Single card matching the reference ─────────────────── */
function Card({
  type, title, sub, imgSrc, onClick, index,
}: {
  type: Category | "scenarios" | "invite";
  title: string;
  sub?: string;
  imgSrc: string;
  onClick: () => void;
  index: number;
}) {
  const [pressed, setPressed] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const tm = setTimeout(() => setVisible(true), index * 65 + 40);
    return () => clearTimeout(tm);
  }, [index]);

  const borderAlpha = pressed ? 0.65 : 0.40;
  const glowSpread = pressed ? "0 0 22px" : "0 0 10px";

  return (
    <button
      onClick={onClick}
      onPointerDown={() => { setPressed(true); window.Telegram?.WebApp?.HapticFeedback?.impactOccurred("light"); }}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      style={{
        display: "flex",
        alignItems: "center",
        width: "100%",
        minHeight: 80,
        padding: 0,
        borderRadius: 18,
        border: `1px solid rgba(${PR},${PG},${PB},${borderAlpha})`,
        boxShadow: `${glowSpread} rgba(${PR},${PG},${PB},0.28), 0 0 40px rgba(${PR},${PG},${PB},0.08), inset 0 0 0 1px rgba(${PR},${PG},${PB},0.06)`,
        background: pressed ? `rgba(${PR},${PG},${PB},0.08)` : "rgba(18,8,14,0.95)",
        cursor: "pointer",
        textAlign: "left",
        position: "relative",
        overflow: "hidden",
        flexShrink: 0,
        opacity: visible ? 1 : 0,
        transform: visible ? (pressed ? "scale(0.983)" : "scale(1)") : "translateY(14px)",
        transition: visible
          ? "opacity .38s, transform .18s cubic-bezier(.32,.72,0,1), box-shadow .18s, border-color .18s, background .15s"
          : "opacity .40s, transform .42s cubic-bezier(.22,1,.36,1)",
      }}
    >
      {/* Background photo — right side only */}
      <div style={{
        position: "absolute",
        top: 0, right: 0, bottom: 0,
        width: "48%",
        backgroundImage: `url(${imgSrc})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        opacity: pressed ? 0.55 : 0.40,
        transition: "opacity .18s",
      }} />

      {/* Left dark gradient over photo */}
      <div style={{
        position: "absolute",
        inset: 0,
        background: `linear-gradient(90deg,
          rgba(18,8,14,1) 0%,
          rgba(18,8,14,0.97) 38%,
          rgba(18,8,14,0.80) 55%,
          rgba(18,8,14,0.30) 72%,
          rgba(18,8,14,0.10) 100%)`,
      }} />

      {/* Subtle pink tint overlay */}
      <div style={{
        position: "absolute",
        inset: 0,
        background: `linear-gradient(135deg, rgba(${PR},${PG},${PB},0.07) 0%, transparent 55%)`,
      }} />

      {/* Top neon line */}
      <div style={{
        position: "absolute",
        top: 0, left: "8%", right: "8%",
        height: 1,
        background: `linear-gradient(90deg, transparent, rgba(${PR},${PG},${PB},0.70), transparent)`,
      }} />

      {/* Left accent bar */}
      <div style={{
        position: "absolute",
        left: 0, top: 0, bottom: 0,
        width: 3,
        background: `linear-gradient(180deg, rgba(${PR},${PG},${PB},0.95), rgba(${PR},${PG},${PB},0.15))`,
        borderRadius: "18px 0 0 18px",
      }} />

      {/* Content row */}
      <div style={{
        position: "relative",
        zIndex: 2,
        display: "flex",
        alignItems: "center",
        width: "100%",
        padding: "0 16px 0 20px",
        gap: 14,
      }}>
        {/* Icon circle */}
        <div style={{
          width: 50,
          height: 50,
          borderRadius: "50%",
          flexShrink: 0,
          border: `1px solid rgba(${PR},${PG},${PB},0.45)`,
          background: `radial-gradient(circle at 38% 32%, rgba(${PR},${PG},${PB},0.22), rgba(${PR},${PG},${PB},0.06) 65%, transparent)`,
          boxShadow: `0 0 14px rgba(${PR},${PG},${PB},0.20)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}>
          <CategoryIcon type={type} />
        </div>

        {/* Label */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif",
            fontWeight: 600,
            fontSize: 17,
            letterSpacing: "-0.2px",
            color: "rgba(255,238,248,0.96)",
            textShadow: "0 1px 10px rgba(0,0,0,0.7)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}>
            {title}
          </div>
          {sub && (
            <div style={{
              fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif",
              fontSize: 12,
              color: "rgba(255,238,248,0.38)",
              marginTop: 3,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}>
              {sub}
            </div>
          )}
        </div>

        {/* Chevron */}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke={PINK} strokeOpacity="0.60" strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round"
          style={{
            filter: `drop-shadow(0 0 5px rgba(${PR},${PG},${PB},0.7))`,
            flexShrink: 0,
          }}>
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>
    </button>
  );
}

const LANG_ABBREV: Record<Lang, string> = { ru: "RU", en: "EN", hi: "हिं", pt: "PT", es: "ES" };

const SCENARIO_LABELS: Record<Lang, { title: string; sub: string }> = {
  ru: { title: "Scenarios",  sub: "Ролевые игры и фантазии" },
  en: { title: "Scenarios",  sub: "Roleplay · for two" },
  hi: { title: "Scenarios",  sub: "रोलप्ले · दो के लिए" },
  pt: { title: "Scenarios",  sub: "Roleplay · para dois" },
  es: { title: "Scenarios",  sub: "Roleplay · para dos" },
};

const INVITE_LABELS: Record<Lang, { title: string; sub: string }> = {
  ru: { title: "Invite a friend", sub: "Поделись ссылкой на приложение" },
  en: { title: "Invite a friend", sub: "Share the app with someone special" },
  hi: { title: "Invite a friend", sub: "किसी को ऐप लिंक भेजें" },
  pt: { title: "Invite a friend", sub: "Compartilhe o app com alguém" },
  es: { title: "Invite a friend", sub: "Comparte el app con alguien" },
};

const INVITE_MSG: Record<Lang, string> = {
  ru: "Присоединяйся ко мне в Touché — вечер для двоих 💕",
  en: "Join me on Touché — an evening for two 💕",
  hi: "Touché से जुड़ें — दो के लिए एक शाम 💕",
  pt: "Junte-se a mim no Touché — uma noite para dois 💕",
  es: "Únete a mí en Touché — una noche para dos 💕",
};

const CAT_IMG: Record<Category | "scenarios" | "invite", string> = {
  compliments: "/images/cat-compliments.png",
  tenderness:  "/images/cat-tenderness.png",
  desire:      "/images/cat-desire.png",
  passion:     "/images/cat-passion.png",
  hard:        "/images/cat-hard.png",
  scenarios:   "/images/cat-scenarios.png",
  invite:      "/images/cat-invite.png",
};

/* ─── Main screen ────────────────────────────────────────── */
export default function Home({ lang, onCategorySelect, onScenarioOpen, onLangSwitch }: HomeProps) {
  const t = UI[lang];
  const [mounted, setMounted] = useState(false);
  const [vh, setVh] = useState<number | null>(null);
  const [coupled, setCoupled] = useState(false);
  const topPx = useTelegramTopInset();

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    tg?.ready(); tg?.expand();
    function updateVh() {
      const h = tg?.viewportStableHeight ?? tg?.viewportHeight;
      if (h && h > 100) setVh(h);
    }
    updateVh();
    tg?.onEvent?.("viewportChanged", updateVh);
    const tm = setTimeout(updateVh, 500);
    setCoupled(!!getCoupleId());
    requestAnimationFrame(() => setMounted(true));
    return () => { tg?.offEvent?.("viewportChanged", updateVh); clearTimeout(tm); };
  }, []);

  const handleInvite = useCallback(() => {
    const tg = window.Telegram?.WebApp;
    const uid = tg?.initDataUnsafe?.user?.id;
    tg?.HapticFeedback?.impactOccurred("light");
    if (tg?.openTelegramLink) {
      const link = uid
        ? `https://t.me/${BOT_USERNAME}/Touche?startapp=ref_${uid}`
        : `https://t.me/${BOT_USERNAME}/Touche`;
      const msg = INVITE_MSG[lang];
      tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(msg)}`);
    }
  }, [lang]);

  /* Category sub-labels */
  const catSub: Record<Category, string> = {
    compliments: t.catComplimentsSub,
    tenderness:  t.catTendernessSub,
    desire:      t.catDesireSub,
    passion:     t.catPassionSub,
    hard:        t.catHardSub,
  };
  const catTitle: Record<Category, string> = {
    compliments: t.catCompliments,
    tenderness:  t.catTenderness,
    desire:      t.catDesire,
    passion:     t.catPassion,
    hard:        t.catHard,
  };

  const height = vh ? `${vh}px` : "100dvh";

  return (
    <div style={{
      position: "fixed", inset: 0, background: BG,
      display: "flex", flexDirection: "column",
      overflow: "hidden", height,
      opacity: mounted ? 1 : 0, transition: "opacity .28s ease",
      fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif",
    }}>
      {/* Ambient glow */}
      <div style={{
        position: "absolute", top: -100, left: "50%", transform: "translateX(-50%)",
        width: 500, height: 420, borderRadius: "50%",
        background: `radial-gradient(circle, rgba(${PR},${PG},${PB},0.09) 0%, transparent 68%)`,
        pointerEvents: "none", zIndex: 0,
      }} />

      {/* Header */}
      <div style={{
        paddingTop: topPx, paddingLeft: 20, paddingRight: 20, paddingBottom: 0,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        position: "relative", zIndex: 1, flexShrink: 0,
      }}>
        {/* Touché cursive logo */}
        <div>
          <div style={{
            fontFamily: "'Dancing Script', 'Pacifico', cursive",
            fontSize: 34, fontWeight: 600,
            color: PINK,
            textShadow: `0 0 18px rgba(${PR},${PG},${PB},0.70), 0 0 40px rgba(${PR},${PG},${PB},0.28)`,
            lineHeight: 1.1,
          }}>
            Touché
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {coupled && (
            <div style={{
              background: "rgba(255,238,248,0.05)", border: "1px solid rgba(255,238,248,0.08)",
              borderRadius: 20, padding: "5px 12px",
              fontSize: 12, color: "rgba(255,238,248,0.50)",
              display: "flex", alignItems: "center", gap: 5,
            }}>
              <span style={{ fontSize: 14 }}>💑</span>
              {t.linked}
            </div>
          )}
          <button onClick={onLangSwitch} style={{
            background: "rgba(255,238,248,.06)", border: "1px solid rgba(255,238,248,.10)",
            borderRadius: 14, cursor: "pointer",
            fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif",
            fontWeight: 500, fontSize: 10, letterSpacing: "0.10em", textTransform: "uppercase",
            color: "rgba(255,238,248,0.44)", padding: "7px 10px", flexShrink: 0,
          }}>
            {LANG_ABBREV[LANG_CYCLE[(LANG_CYCLE.indexOf(lang) + 1) % LANG_CYCLE.length]]}
          </button>
        </div>
      </div>

      {/* Big heading */}
      <div style={{
        paddingLeft: 20, paddingRight: 20, paddingTop: 8, paddingBottom: 14,
        flexShrink: 0, position: "relative", zIndex: 1,
      }}>
        <div style={{
          fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif",
          fontWeight: 700, fontSize: 30, lineHeight: 1.20,
          letterSpacing: "-0.5px",
          color: "rgba(255,238,248,0.96)",
        }}>
          {t.footerHint}
        </div>
      </div>

      {/* Card list */}
      <div style={{
        flex: 1, overflowY: "auto", overflowX: "hidden",
        padding: `0 14px max(28px, env(safe-area-inset-bottom))`,
        display: "flex", flexDirection: "column", gap: 9,
        position: "relative", zIndex: 1,
        scrollbarWidth: "none",
      }}>
        {CATEGORIES_ORDER.map((cat, i) => (
          <Card
            key={cat}
            type={cat}
            title={catTitle[cat]}
            sub={catSub[cat]}
            imgSrc={CAT_IMG[cat]}
            onClick={() => onCategorySelect(cat)}
            index={i}
          />
        ))}

        <Card
          type="scenarios"
          title={SCENARIO_LABELS[lang].title}
          sub={SCENARIO_LABELS[lang].sub}
          imgSrc={CAT_IMG.scenarios}
          onClick={onScenarioOpen}
          index={CATEGORIES_ORDER.length}
        />

        <Card
          type="invite"
          title={INVITE_LABELS[lang].title}
          sub={INVITE_LABELS[lang].sub}
          imgSrc={CAT_IMG.invite}
          onClick={handleInvite}
          index={CATEGORIES_ORDER.length + 1}
        />

        <div style={{
          textAlign: "center", fontSize: 11,
          color: TEXT_T, paddingTop: 6, letterSpacing: "0.3px",
        }}>
          {t.footerHint}
        </div>
      </div>
    </div>
  );
}
