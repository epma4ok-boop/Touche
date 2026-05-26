import { useEffect, useCallback, useState } from "react";
import { UI, CATEGORY_CONFIG, CATEGORIES_ORDER, type Lang, type Category } from "@/data/i18n";
import { BOT_USERNAME } from "@/config";

const BG = "#0d0610";
const TEXT_P = "rgba(255,238,248,0.88)";
const TEXT_S = "rgba(255,238,248,0.44)";
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

const LEVEL_LABELS: Record<Category, { ru: string; en: string }> = {
  compliments: { ru: "Легко",  en: "Easy"  },
  tenderness:  { ru: "Нежно",  en: "Soft"  },
  desire:      { ru: "Средне", en: "Warm"  },
  passion:     { ru: "Горячо", en: "Hot"   },
  hard:        { ru: "18+",    en: "18+"   },
};

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}

function categoryHex(cat: Category): string {
  const { r, g, b } = CATEGORY_CONFIG[cat];
  return `rgb(${r},${g},${b})`;
}

/* ── Single category card matching the CardsAtmosphere mockup ── */
function CategoryCard({
  category, lang, onClick, index,
}: { category: Category; lang: Lang; onClick: () => void; index: number }) {
  const cfg = CATEGORY_CONFIG[category];
  const { r, g, b } = cfg;
  const color = `rgb(${r},${g},${b})`;
  const [pressed, setPressed] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const tm = setTimeout(() => setVisible(true), index * 60 + 30);
    return () => clearTimeout(tm);
  }, [index]);

  const t = UI[lang];
  const labels: Record<Category, { main: string; sub: string }> = {
    compliments: { main: t.catCompliments, sub: t.catComplimentsSub },
    tenderness:  { main: t.catTenderness,  sub: t.catTendernessSub },
    desire:      { main: t.catDesire,      sub: t.catDesireSub },
    passion:     { main: t.catPassion,     sub: t.catPassionSub },
    hard:        { main: t.catHard,        sub: t.catHardSub },
  };
  const lbl = labels[category];
  const level = LEVEL_LABELS[category][lang === "ru" ? "ru" : "en"];

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
        border: `1px solid rgba(${r},${g},${b},${pressed ? 0.30 : 0.15})`,
        borderRadius: 20,
        padding: 0,
        cursor: "pointer",
        textAlign: "left",
        width: "100%",
        position: "relative",
        overflow: "hidden",
        background: pressed ? `rgba(${r},${g},${b},0.08)` : "#110810",
        opacity: visible ? 1 : 0,
        transform: visible
          ? pressed ? "scale(0.985)" : "scale(1)"
          : "translateY(12px)",
        transition: visible
          ? "opacity .35s, transform .18s, border-color .18s, background .18s"
          : "opacity .35s, transform .35s",
        flexShrink: 0,
      }}
    >
      {/* AI art background image — place files at /images/cat-{id}.png in your public folder */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: `url(/images/cat-${category}.png)`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        opacity: pressed ? 0.34 : 0.26,
        filter: "saturate(1.4) brightness(0.9)",
        transition: "opacity .18s",
      }} />

      {/* Dark gradient — left readable, right fades into art */}
      <div style={{
        position: "absolute", inset: 0,
        background: `linear-gradient(90deg, #0d0610ee 0%, #0d061088 45%, transparent 100%)`,
      }} />

      {/* Color tint */}
      <div style={{
        position: "absolute", inset: 0,
        background: `linear-gradient(135deg, rgba(${r},${g},${b},0.10) 0%, transparent 60%)`,
      }} />

      {/* Top edge shine */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 1,
        background: `linear-gradient(90deg, transparent, rgba(${r},${g},${b},0.50), transparent)`,
      }} />

      {/* Left accent bar */}
      <div style={{
        position: "absolute", left: 0, top: 0, bottom: 0, width: 3,
        background: `linear-gradient(180deg, rgba(${r},${g},${b},0.90), rgba(${r},${g},${b},0.20))`,
        borderRadius: "20px 0 0 20px",
      }} />

      {/* Content row */}
      <div style={{
        padding: "17px 18px 17px 22px",
        display: "flex", alignItems: "center", gap: 14,
        position: "relative",
      }}>
        {/* Glow orb */}
        <div style={{
          width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
          background: `radial-gradient(circle at 35% 35%, rgba(${r},${g},${b},0.55), rgba(${r},${g},${b},0.15) 60%, transparent)`,
          border: `1px solid rgba(${r},${g},${b},0.32)`,
          boxShadow: `0 0 18px rgba(${r},${g},${b},0.18)`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{
            width: 14, height: 14, borderRadius: "50%",
            background: `radial-gradient(circle at 35% 35%, ${color}, rgba(${r},${g},${b},0.70))`,
            boxShadow: `0 0 10px rgba(${r},${g},${b},0.70)`,
          }} />
        </div>

        {/* Text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 17, fontWeight: 700, letterSpacing: "-0.3px",
            color: "rgba(255,238,248,0.96)",
            textShadow: "0 1px 8px rgba(0,0,0,0.6)",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>{lbl.main}</div>
          <div style={{
            fontSize: 12, color: "rgba(255,238,248,0.42)", marginTop: 3,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>{lbl.sub}</div>
        </div>

        {/* Level + chevron */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5, flexShrink: 0 }}>
          <div style={{
            fontSize: 10, fontWeight: 700, letterSpacing: "0.6px",
            textTransform: "uppercase", color,
            textShadow: `0 0 12px rgba(${r},${g},${b},0.80)`,
          }}>{level}</div>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
            stroke={color} strokeOpacity="0.45" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </div>
      </div>
    </button>
  );
}

/* ── Scenario card (same style, purple accent) ── */
function ScenarioCard({ lang, onClick, index }: { lang: Lang; onClick: () => void; index: number }) {
  const r = 123, g = 94, b = 167; // violet for scenarios
  const color = `rgb(${r},${g},${b})`;
  const [pressed, setPressed] = useState(false);
  const [visible, setVisible] = useState(false);
  useEffect(() => { const tm = setTimeout(() => setVisible(true), index * 60 + 30); return () => clearTimeout(tm); }, [index]);

  return (
    <button
      onClick={onClick}
      onPointerDown={() => { setPressed(true); window.Telegram?.WebApp?.HapticFeedback?.impactOccurred("light"); }}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      style={{
        border: `1px solid rgba(${r},${g},${b},${pressed ? 0.30 : 0.15})`,
        borderRadius: 20, padding: 0, cursor: "pointer", textAlign: "left",
        width: "100%", position: "relative", overflow: "hidden",
        background: pressed ? `rgba(${r},${g},${b},0.08)` : "#110810",
        opacity: visible ? 1 : 0,
        transform: visible ? (pressed ? "scale(0.985)" : "scale(1)") : "translateY(12px)",
        transition: visible
          ? "opacity .35s, transform .18s, border-color .18s, background .18s"
          : "opacity .35s, transform .35s",
        flexShrink: 0,
      }}
    >
      <div style={{ position: "absolute", inset: 0, backgroundImage: "url(/images/cat-scenarios.png)", backgroundSize: "cover", backgroundPosition: "center", opacity: pressed ? 0.34 : 0.26, filter: "saturate(1.4) brightness(0.9)", transition: "opacity .18s" }} />
      <div style={{ position: "absolute", inset: 0, background: `linear-gradient(90deg, #0d0610ee 0%, #0d061088 45%, transparent 100%)` }} />
      <div style={{ position: "absolute", inset: 0, background: `linear-gradient(135deg, rgba(${r},${g},${b},0.10) 0%, transparent 60%)` }} />
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, rgba(${r},${g},${b},0.50), transparent)` }} />
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: `linear-gradient(180deg, rgba(${r},${g},${b},0.90), rgba(${r},${g},${b},0.20))`, borderRadius: "20px 0 0 20px" }} />

      <div style={{ padding: "17px 18px 17px 22px", display: "flex", alignItems: "center", gap: 14, position: "relative" }}>
        <div style={{ width: 44, height: 44, borderRadius: "50%", flexShrink: 0, background: `radial-gradient(circle at 35% 35%, rgba(${r},${g},${b},0.55), rgba(${r},${g},${b},0.15) 60%, transparent)`, border: `1px solid rgba(${r},${g},${b},0.32)`, boxShadow: `0 0 18px rgba(${r},${g},${b},0.18)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 14, height: 14, borderRadius: "50%", background: `radial-gradient(circle at 35% 35%, ${color}, rgba(${r},${g},${b},0.70))`, boxShadow: `0 0 10px rgba(${r},${g},${b},0.70)` }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: "-0.3px", color: "rgba(255,238,248,0.96)", textShadow: "0 1px 8px rgba(0,0,0,0.6)" }}>{lang === "ru" ? "Сценарии" : "Scenarios"}</div>
          <div style={{ fontSize: 12, color: "rgba(255,238,248,0.42)", marginTop: 3 }}>{lang === "ru" ? "Ролевые игры и фантазии" : "Roleplay · for two"}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5, flexShrink: 0 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.6px", textTransform: "uppercase", color, textShadow: `0 0 12px rgba(${r},${g},${b},0.80)` }}>{lang === "ru" ? "Особое" : "Special"}</div>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeOpacity="0.45" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
        </div>
      </div>
    </button>
  );
}

/* ── Main screen ── */
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
    if (tg?.openTelegramLink && uid) {
      const botLink = `https://t.me/${BOT_USERNAME}?start=ref_${uid}`;
      tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(botLink)}&text=${encodeURIComponent(t.inviteText)}`);
    }
    tg?.HapticFeedback?.impactOccurred("light");
  }, [t.inviteText]);

  const height = vh ? `${vh}px` : "100dvh";

  return (
    <div style={{
      position: "fixed", inset: 0, background: BG,
      display: "flex", flexDirection: "column",
      overflow: "hidden", height,
      opacity: mounted ? 1 : 0, transition: "opacity .28s ease",
      fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif",
    }}>

      {/* Ambient top glow */}
      <div style={{
        position: "absolute", top: -120, left: "50%", transform: "translateX(-50%)",
        width: 480, height: 480, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(200,32,114,0.09) 0%, transparent 70%)",
        pointerEvents: "none", zIndex: 0,
      }} />

      {/* Header */}
      <div style={{
        paddingTop: topPx, paddingLeft: 20, paddingRight: 20, paddingBottom: 14,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        position: "relative", zIndex: 1, flexShrink: 0,
        borderBottom: "0.5px solid rgba(255,255,255,0.05)",
      }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.8px", color: "rgba(255,238,248,0.96)", lineHeight: 1 }}>
            {t.appName}
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,238,248,0.36)", marginTop: 2, letterSpacing: "0.4px" }}>
            {lang === "ru" ? "выбери момент" : "choose a moment"}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {coupled ? (
            <div style={{
              background: "rgba(255,238,248,0.05)", border: "1px solid rgba(255,238,248,0.08)",
              backdropFilter: "blur(8px)", borderRadius: 20, padding: "5px 12px",
              fontSize: 12, color: "rgba(255,238,248,0.50)",
              display: "flex", alignItems: "center", gap: 5,
            }}>
              <span style={{ fontSize: 14 }}>💑</span>
              {lang === "ru" ? "пара" : "linked"}
            </div>
          ) : (
            <button onClick={handleInvite} style={{
              background: "rgba(190,30,90,.10)", border: "1px solid rgba(190,30,90,.22)",
              borderRadius: 20, cursor: "pointer",
              fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif",
              fontWeight: 500, fontSize: 10, letterSpacing: "0.10em",
              textTransform: "uppercase", color: "rgba(220,90,150,.75)",
              padding: "7px 14px", flexShrink: 0,
            }}>
              {t.invite}
            </button>
          )}
          <button onClick={onLangSwitch} style={{
            background: "rgba(255,238,248,.06)", border: "1px solid rgba(255,238,248,.10)",
            borderRadius: 14, cursor: "pointer",
            fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif",
            fontWeight: 500, fontSize: 10, letterSpacing: "0.10em",
            textTransform: "uppercase", color: "rgba(255,238,248,0.44)",
            padding: "7px 10px", flexShrink: 0,
          }}>
            {lang === "ru" ? "EN" : "RU"}
          </button>
        </div>
      </div>

      {/* Scrollable card list */}
      <div style={{
        flex: 1, overflowY: "auto", overflowX: "hidden",
        padding: "12px 14px max(28px,env(safe-area-inset-bottom))",
        display: "flex", flexDirection: "column", gap: 9,
        position: "relative", zIndex: 1,
        /* hide scrollbar */
        scrollbarWidth: "none",
      }}>
        {CATEGORIES_ORDER.map((cat, i) => (
          <CategoryCard key={cat} category={cat} lang={lang}
            onClick={() => onCategorySelect(cat)} index={i} />
        ))}
        <ScenarioCard lang={lang} onClick={onScenarioOpen} index={CATEGORIES_ORDER.length} />

        {/* Footer hint */}
        <div style={{
          textAlign: "center", fontSize: 11, color: TEXT_T,
          paddingTop: 6, letterSpacing: "0.3px",
        }}>
          {t.footerHint}
        </div>
      </div>
    </div>
  );
}
