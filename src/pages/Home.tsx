import { useEffect, useCallback, useState } from "react";
import { UI, CATEGORIES_ORDER, LANG_CYCLE, type Lang, type Category } from "@/data/i18n";

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
  const [topPx, setTopPx] = useState(44);
  useEffect(() => {
    const tg = window.Telegram?.WebApp as any;
    function compute() {
      const c = tg?.contentSafeAreaInset?.top ?? 0;
      const s = tg?.safeAreaInset?.top ?? 0;
      const total = c + s;
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
  return topPx;
}

const BG = "#0d0610";
const PR = 220, PG = 36, PB = 118;
const PINK      = `rgb(${PR},${PG},${PB})`;
const PINK_GLOW = `drop-shadow(0 0 6px rgba(${PR},${PG},${PB},1)) drop-shadow(0 0 14px rgba(${PR},${PG},${PB},0.55))`;

const CAT_IMG: Record<Category | "scenarios" | "invite", string> = {
  compliments: "/images/cat-compliments.png",
  tenderness:  "/images/cat-tenderness.png",
  desire:      "/images/cat-desire.png",
  passion:     "/images/cat-passion.png",
  hard:        "/images/cat-hard.png",
  scenarios:   "/images/cat-scenarios.png",
  invite:      "/images/cat-invite.png",
};

function NeonIcon({ type }: { type: Category | "scenarios" | "invite" }) {
  const attrs = {
    width: 24, height: 24,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: PINK,
    strokeWidth: 1.55,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    style: { filter: PINK_GLOW, display: "block" as const },
  };
  switch (type) {
    case "compliments":
      return (
        <svg {...attrs}>
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
      );
    case "tenderness":
      return (
        <svg {...attrs}>
          <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"/>
          <line x1="16" y1="8" x2="2" y2="22"/>
          <line x1="17.5" y1="15" x2="9" y2="15"/>
        </svg>
      );
    case "desire":
      return (
        <svg {...attrs} viewBox="0 0 32 32">
          <path d="M4 13 C4 13 8 10 12 12 C14 13 15 14 16 14 C17 14 18 13 20 12 C24 10 28 13 28 13"/>
          <path d="M4 13 C4 13 6 22 10 22.5 C13 23 15 21 16 21 C17 21 19 23 22 22.5 C26 22 28 13 28 13"/>
          <path d="M11 13 C12.5 15.5 14 16 16 16 C18 16 19.5 15.5 21 13"/>
        </svg>
      );
    case "passion":
      return (
        <svg {...attrs} viewBox="0 0 24 24">
          {/* Upper lip */}
          <path d="M5 11 C5 11 8 8.5 10.5 10 C11.5 10.6 12 11 12 11 C12 11 12.5 10.6 13.5 10 C16 8.5 19 11 19 11"/>
          {/* Lower lip with gentle bite curve */}
          <path d="M5 11 C5 11 7 16 10 16.5 C11 16.7 11.5 16.5 12 16.2 C12.5 16.5 13 16.7 14 16.5 C17 16 19 11 19 11"/>
          {/* Inner mouth shadow / bite accent */}
          <path d="M9.5 11 C10.5 12.8 11.2 13.4 12 13.4 C12.8 13.4 13.5 12.8 14.5 11" strokeOpacity="0.65" strokeWidth="1.2"/>
          {/* Gloss highlight */}
          <path d="M8 10.5 C9 9.8 10.5 9.6 11.5 10.2" strokeOpacity="0.40" strokeWidth="1.0" fill="none"/>
        </svg>
      );
    case "hard":
      return (
        <svg {...attrs} viewBox="0 0 28 28">
          {/* Left cuff ring */}
          <circle cx="9" cy="14" r="4.2" strokeWidth="1.7"/>
          {/* Right cuff ring */}
          <circle cx="19" cy="14" r="4.2" strokeWidth="1.7"/>
          {/* Chain link */}
          <path d="M13.2 14 L14.8 14" strokeWidth="2.2" strokeLinecap="round"/>
          {/* Left arch (wrist bar) */}
          <path d="M5.2 10.5 C5.2 10.5 5 7 9 7 C13 7 13 10.5 13 10.5" strokeWidth="1.55"/>
          {/* Right arch (wrist bar) */}
          <path d="M15 10.5 C15 10.5 15 7 19 7 C23 7 22.8 10.5 22.8 10.5" strokeWidth="1.55"/>
        </svg>
      );
    case "scenarios":
      return (
        <svg {...attrs} viewBox="0 0 32 32">
          <path d="M2 14 C2 8 7 5 12 6 C13.5 6.4 15 7.5 16 7.5 C17 7.5 18.5 6.4 20 6 C25 5 30 8 30 14 C30 18 27 22 22 23.5 C19 24.5 17 24 16 24 C15 24 13 24.5 10 23.5 C5 22 2 18 2 14 Z"/>
          <path d="M5.5 11.5 Q8 9.5 10.5 11.5" strokeWidth={1.8}/>
          <path d="M21.5 11.5 Q24 9.5 26.5 11.5" strokeWidth={1.8}/>
          <circle cx="8"  cy="13" r="1.8" fill={PINK} stroke="none" style={{ filter: PINK_GLOW }}/>
          <circle cx="24" cy="13" r="1.8" fill={PINK} stroke="none" style={{ filter: PINK_GLOW }}/>
        </svg>
      );
    case "invite":
      return (
        <svg {...attrs} viewBox="0 0 28 28">
          {/* Left person silhouette */}
          <circle cx="8" cy="7" r="3" strokeWidth="1.5"/>
          <path d="M3 22 C3 17 5 15 8 15 C9 15 9.5 15.2 10 15.5" strokeWidth="1.5"/>
          {/* Right person silhouette */}
          <circle cx="20" cy="7" r="3" strokeWidth="1.5"/>
          <path d="M25 22 C25 17 23 15 20 15 C19 15 18.5 15.2 18 15.5" strokeWidth="1.5"/>
          {/* Joined hands in centre */}
          <path d="M10 15.5 C11 16.2 12 17 14 17 C16 17 17 16.2 18 15.5" strokeWidth="1.6"/>
          {/* Small heart above */}
          <path d="M12.5 10.5 C12.5 10.5 11 9 12 8 C12.8 7.2 14 8.2 14 8.2 C14 8.2 15.2 7.2 16 8 C17 9 15.5 10.5 15.5 10.5 L14 12 Z" strokeWidth="1.2" fill={PINK} stroke={PINK} style={{ filter: PINK_GLOW }} fillOpacity="0.7"/>
        </svg>
      );
    default:
      return null;
  }
}

function Card({
  type, title, sub, onClick, index,
}: {
  type: Category | "scenarios" | "invite";
  title: string;
  sub?: string;
  onClick: () => void;
  index: number;
}) {
  const [pressed, setPressed] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const tm = setTimeout(() => setVisible(true), index * 68 + 60);
    return () => clearTimeout(tm);
  }, [index]);

  return (
    <button
      onClick={onClick}
      onPointerDown={() => {
        setPressed(true);
        window.Telegram?.WebApp?.HapticFeedback?.impactOccurred("light");
      }}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      style={{
        display: "flex", alignItems: "center",
        width: "100%", minHeight: 82,
        padding: 0, borderRadius: 20,
        border: `1px solid rgba(${PR},${PG},${PB},${pressed ? 0.70 : 0.38})`,
        boxShadow: pressed
          ? `0 0 28px rgba(${PR},${PG},${PB},0.38), 0 0 60px rgba(${PR},${PG},${PB},0.12), inset 0 1px 0 rgba(${PR},${PG},${PB},0.14)`
          : `0 0 14px rgba(${PR},${PG},${PB},0.20), 0 0 36px rgba(${PR},${PG},${PB},0.06), inset 0 1px 0 rgba(${PR},${PG},${PB},0.08)`,
        background: pressed
          ? `rgba(${PR},${PG},${PB},0.09)`
          : "rgba(16,7,12,0.97)",
        cursor: "pointer", textAlign: "left",
        position: "relative", overflow: "hidden",
        flexShrink: 0,
        opacity: visible ? 1 : 0,
        transform: visible
          ? pressed ? "scale(0.982)" : "scale(1)"
          : "translateY(16px)",
        transition: visible
          ? "opacity .38s, transform .17s cubic-bezier(.32,.72,0,1), box-shadow .17s, border-color .17s, background .14s"
          : "opacity .42s, transform .44s cubic-bezier(.22,1,.36,1)",
      }}
    >
      {/* Photo — right portion */}
      <div style={{
        position: "absolute",
        top: 0, right: 0, bottom: 0,
        width: "52%",
        backgroundImage: `url(${CAT_IMG[type]})`,
        backgroundSize: "cover",
        backgroundPosition: "center right",
        opacity: pressed ? 0.62 : 0.48,
        transition: "opacity .17s",
      }} />

      {/* Left-to-right dark gradient */}
      <div style={{
        position: "absolute", inset: 0,
        background: `linear-gradient(90deg,
          rgba(16,7,12,1) 0%,
          rgba(16,7,12,0.97) 36%,
          rgba(16,7,12,0.82) 52%,
          rgba(16,7,12,0.32) 70%,
          rgba(16,7,12,0.08) 100%)`,
      }} />

      {/* Subtle pink tint */}
      <div style={{
        position: "absolute", inset: 0,
        background: `linear-gradient(130deg,rgba(${PR},${PG},${PB},0.06) 0%,transparent 50%)`,
      }} />

      {/* Top neon highlight line */}
      <div style={{
        position: "absolute",
        top: 0, left: "6%", right: "6%", height: 1,
        background: `linear-gradient(90deg,transparent,rgba(${PR},${PG},${PB},0.75),transparent)`,
      }} />

      {/* Left accent bar */}
      <div style={{
        position: "absolute",
        left: 0, top: 0, bottom: 0, width: 3,
        background: `linear-gradient(180deg,rgba(${PR},${PG},${PB},0.95),rgba(${PR},${PG},${PB},0.18))`,
        borderRadius: "20px 0 0 20px",
      }} />

      {/* Content row */}
      <div style={{
        position: "relative", zIndex: 2,
        display: "flex", alignItems: "center",
        width: "100%", padding: "0 15px 0 18px", gap: 13,
      }}>
        {/* Icon circle */}
        <div style={{
          width: 52, height: 52, borderRadius: "50%", flexShrink: 0,
          border: `1px solid rgba(${PR},${PG},${PB},0.42)`,
          background: `radial-gradient(circle at 36% 30%,
            rgba(${PR},${PG},${PB},0.26),
            rgba(${PR},${PG},${PB},0.08) 60%,
            transparent)`,
          boxShadow: `0 0 16px rgba(${PR},${PG},${PB},0.22),inset 0 1px 0 rgba(${PR},${PG},${PB},0.15)`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <NeonIcon type={type} />
        </div>

        {/* Text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif",
            fontWeight: 600, fontSize: 17, letterSpacing: "-0.2px",
            color: "rgba(255,238,248,0.97)",
            textShadow: "0 1px 12px rgba(0,0,0,0.8)",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>
            {title}
          </div>
          {sub && (
            <div style={{
              fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif",
              fontSize: 12, color: "rgba(255,238,248,0.36)", marginTop: 3,
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>
              {sub}
            </div>
          )}
        </div>

        {/* Chevron */}
        <svg width={14} height={14} viewBox="0 0 24 24" fill="none"
          stroke={PINK} strokeOpacity={0.65} strokeWidth={2.5}
          strokeLinecap="round" strokeLinejoin="round"
          style={{ filter: `drop-shadow(0 0 5px rgba(${PR},${PG},${PB},0.80))`, flexShrink: 0 }}>
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </div>
    </button>
  );
}

const LANG_ABBREV: Record<Lang, string> = { ru: "RU", en: "EN", hi: "HI", pt: "PT", es: "ES" };

const SCENARIO_LABELS: Record<Lang, { title: string; sub: string }> = {
  ru: { title: "Сценарии",   sub: "Ролевые игры и фантазии"   },
  en: { title: "Scenarios",  sub: "Roleplay · for two"         },
  hi: { title: "परिदृश्य",    sub: "रोलप्ले · दो के लिए"       },
  pt: { title: "Cenários",   sub: "Roleplay · para dois"       },
  es: { title: "Escenarios", sub: "Roleplay · para dos"        },
};

const INVITE_LABELS: Record<Lang, { title: string; sub: string }> = {
  ru: { title: "Пригласи друга",  sub: "Пригласи кого-то на этот вечер"  },
  en: { title: "Invite a friend", sub: "Share the app for an evening"     },
  hi: { title: "मित्र को आमंत्रित करें", sub: "इस शाम के लिए किसी को बुलाएं" },
  pt: { title: "Convidar amigo",  sub: "Compartilhe para uma noite a dois" },
  es: { title: "Invitar amigo",   sub: "Comparte la app para esta noche"   },
};

const INVITE_MSG: Record<Lang, string> = {
  ru: "Присоединяйся ко мне в Touché — вечер для двоих 💕",
  en: "Join me on Touché — an evening for two 💕",
  hi: "Touché पर मेरे साथ जुड़ें — दो के लिए एक शाम 💕",
  pt: "Junte-se a mim no Touché — uma noite para dois 💕",
  es: "Únete a mí en Touché — una noche para dos 💕",
};

function CoupleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 32 32" fill="none"
      style={{ filter: `drop-shadow(0 0 4px rgba(${PR},${PG},${PB},0.80))`, display: "block" }}>
      {/* Left heart */}
      <path
        d="M10 7 C10 7 7 4 4.5 5.5 C2 7 2 10.5 4 12.5 L10 18 L16 12.5 C18 10.5 18 7 15.5 5.5 C13 4 10 7 10 7 Z"
        fill={`rgba(${PR},${PG},${PB},0.85)`}
        strokeWidth="0"
      />
      {/* Right heart (overlapping) */}
      <path
        d="M22 7 C22 7 19 4 16.5 5.5 C14 7 14 10.5 16 12.5 L22 18 L28 12.5 C30 10.5 30 7 27.5 5.5 C25 4 22 7 22 7 Z"
        fill={`rgba(${PR},${PG},${PB},0.55)`}
        strokeWidth="0"
      />
      {/* Highlight */}
      <path
        d="M7 8 C7 8 5 7.5 4.5 9"
        stroke="rgba(255,200,230,0.50)"
        strokeWidth="1.2"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

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
        ? `https://t.me/ToucheGameBot/Touche?startapp=ref_${uid}`
        : `https://t.me/ToucheGameBot/Touche`;
      const msg = INVITE_MSG[lang];
      tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(msg)}`);
    }
  }, [lang]);

  const catTitle: Record<Category, string> = {
    compliments: t.catCompliments,
    tenderness:  t.catTenderness,
    desire:      t.catDesire,
    passion:     t.catPassion,
    hard:        t.catHard,
  };
  const catSub: Record<Category, string> = {
    compliments: t.catComplimentsSub,
    tenderness:  t.catTendernessSub,
    desire:      t.catDesireSub,
    passion:     t.catPassionSub,
    hard:        t.catHardSub,
  };

  const nextLang = LANG_CYCLE[(LANG_CYCLE.indexOf(lang) + 1) % LANG_CYCLE.length];

  return (
    <div style={{
      position: "fixed", inset: 0, background: BG,
      display: "flex", flexDirection: "column",
      overflow: "hidden",
      height: vh ? `${vh}px` : "100dvh",
      opacity: mounted ? 1 : 0, transition: "opacity .30s ease",
      fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif",
    }}>
      {/* Ambient top glow */}
      <div style={{
        position: "absolute", top: -140, left: "50%", transform: "translateX(-50%)",
        width: 560, height: 500, borderRadius: "50%",
        background: `radial-gradient(circle,rgba(${PR},${PG},${PB},0.08) 0%,transparent 68%)`,
        pointerEvents: "none", zIndex: 0,
      }} />

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div style={{
        paddingTop: topPx, paddingLeft: 20, paddingRight: 20, paddingBottom: 4,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        position: "relative", zIndex: 1, flexShrink: 0,
      }}>
        <div style={{
          fontFamily: "'Dancing Script','Pacifico',cursive",
          fontSize: 35, fontWeight: 600, color: PINK, lineHeight: 1.1,
          textShadow: `0 0 20px rgba(${PR},${PG},${PB},0.75),0 0 50px rgba(${PR},${PG},${PB},0.30)`,
          userSelect: "none",
        }}>
          Touché
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {coupled && (
            <div style={{
              background: "rgba(255,238,248,0.05)",
              border: `1px solid rgba(${PR},${PG},${PB},0.28)`,
              borderRadius: 20, padding: "5px 12px",
              fontSize: 12, color: `rgba(${PR},${PG},${PB},0.80)`,
              display: "flex", alignItems: "center", gap: 6,
              boxShadow: `0 0 10px rgba(${PR},${PG},${PB},0.12)`,
            }}>
              <CoupleIcon />
              {t.linked}
            </div>
          )}
          <button
            onClick={onLangSwitch}
            style={{
              background: "rgba(255,238,248,.06)",
              border: "1px solid rgba(255,238,248,.10)",
              borderRadius: 14, padding: "7px 10px",
              fontWeight: 500, fontSize: 10, letterSpacing: "0.10em",
              textTransform: "uppercase" as const,
              color: "rgba(255,238,248,0.44)",
              cursor: "pointer",
              fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif",
            }}
          >
            {LANG_ABBREV[nextLang]}
          </button>
        </div>
      </div>

      {/* ── Card list ───────────────────────────────────────────────────── */}
      <div style={{
        flex: 1, overflowY: "auto", overflowX: "hidden",
        padding: `10px 14px max(28px,env(safe-area-inset-bottom))`,
        display: "flex", flexDirection: "column", gap: 10,
        position: "relative", zIndex: 1,
        scrollbarWidth: "none" as const,
      }}>
        {CATEGORIES_ORDER.map((cat, i) => (
          <Card
            key={cat}
            type={cat}
            title={catTitle[cat]}
            sub={catSub[cat]}
            onClick={() => onCategorySelect(cat)}
            index={i}
          />
        ))}

        <Card
          type="scenarios"
          title={SCENARIO_LABELS[lang].title}
          sub={SCENARIO_LABELS[lang].sub}
          onClick={onScenarioOpen}
          index={CATEGORIES_ORDER.length}
        />

        <Card
          type="invite"
          title={INVITE_LABELS[lang].title}
          sub={INVITE_LABELS[lang].sub}
          onClick={handleInvite}
          index={CATEGORIES_ORDER.length + 1}
        />
      </div>
    </div>
  );
}
