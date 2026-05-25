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

function useTelegramTopInset(): string {
  const [topPx, setTopPx] = useState<number>(0);
  useEffect(() => {
    const tg = window.Telegram?.WebApp as any;
    function compute() {
      const content = tg?.contentSafeAreaInset?.top ?? 0;
      const safe = tg?.safeAreaInset?.top ?? 0;
      const total = content + safe;
      if (total > 10) setTopPx(total + 10);
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
  return topPx > 0 ? `${topPx}px` : "0px";
}

/* ─── SVG icons ─── */
function IconCompliments({ r, g, b }: { r: number; g: number; b: number }) {
  return (
    <svg viewBox="0 0 44 44" fill="none" width="22" height="22">
      <path d="M22 16 C20 18 17 18 15 16 C13 14 14 11 16 10 C18 9 20 10 22 12 C24 10 26 9 28 10 C30 11 31 14 29 16 C27 18 24 18 22 16 Z" fill={`rgba(${r},${g},${b},0.55)`} stroke={`rgba(${r},${g},${b},0.90)`} strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M22 16 C22 20 16 26 10 30" stroke={`rgba(${r},${g},${b},0.40)`} strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M22 16 C22 20 28 26 34 30" stroke={`rgba(${r},${g},${b},0.40)`} strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
}
function IconTenderness({ r, g, b }: { r: number; g: number; b: number }) {
  return (
    <svg viewBox="0 0 44 44" fill="none" width="22" height="22">
      <path d="M34 9 C38 14, 36 22, 30 27 C24 32, 14 33, 10 35 C14 28, 20 20, 26 16 C30 13, 33 10, 34 9 Z" fill={`rgba(${r},${g},${b},0.22)`} stroke={`rgba(${r},${g},${b},0.88)`} strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M28 14 C24 18, 20 22, 15 28" stroke={`rgba(${r},${g},${b},0.45)`} strokeWidth="1" strokeLinecap="round"/>
    </svg>
  );
}
function IconDesire({ r, g, b }: { r: number; g: number; b: number }) {
  return (
    <svg viewBox="0 0 44 44" fill="none" width="22" height="22">
      <path d="M22 8 C22 8 29 15 28 21 C28 25 24 27 24 27 C24 27 31 23 30 17 C33 23 32 30 22 36 C12 30 11 23 14 17 C13 23 20 27 20 27 C20 27 16 25 16 21 C15 15 22 8 22 8 Z" fill={`rgba(${r},${g},${b},0.25)`} stroke={`rgba(${r},${g},${b},0.88)`} strokeWidth="1.5" strokeLinejoin="round"/>
    </svg>
  );
}
function IconPassion({ r, g, b }: { r: number; g: number; b: number }) {
  return (
    <svg viewBox="0 0 44 44" fill="none" width="22" height="22">
      <path d="M9 20 C9 20 13 13 18.5 15 C21 16 21 18 22 18 C23 18 23 16 25.5 15 C31 13 35 20 35 20 C35 20 31 30 22 30 C13 30 9 20 9 20 Z" fill={`rgba(${r},${g},${b},0.22)`} stroke={`rgba(${r},${g},${b},0.88)`} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M15 25 C18 28 26 28 29 25" stroke={`rgba(${r},${g},${b},0.60)`} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}
function IconHard({ r, g, b }: { r: number; g: number; b: number }) {
  return (
    <svg viewBox="0 0 44 44" fill="none" width="22" height="22">
      <polygon points="22,8 26,18 37,18 28,25 31,36 22,29 13,36 16,25 7,18 18,18" fill={`rgba(${r},${g},${b},0.22)`} stroke={`rgba(${r},${g},${b},0.88)`} strokeWidth="1.5" strokeLinejoin="round"/>
    </svg>
  );
}
function IconScenario({ r, g, b }: { r: number; g: number; b: number }) {
  return (
    <svg viewBox="0 0 44 44" fill="none" width="22" height="22">
      <rect x="10" y="13" width="18" height="22" rx="3" fill={`rgba(${r},${g},${b},0.22)`} stroke={`rgba(${r},${g},${b},0.88)`} strokeWidth="1.5"/>
      <rect x="16" y="9" width="18" height="22" rx="3" fill={`rgba(${r},${g},${b},0.12)`} stroke={`rgba(${r},${g},${b},0.70)`} strokeWidth="1.5"/>
      <path d="M20 17 L30 17 M20 21 L27 21" stroke={`rgba(${r},${g},${b},0.65)`} strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  );
}

const ICONS: Record<Category, (props: { r: number; g: number; b: number }) => JSX.Element> = {
  compliments: IconCompliments,
  tenderness: IconTenderness,
  desire: IconDesire,
  passion: IconPassion,
  hard: IconHard,
};

const LEVEL_LABELS: Record<Category, { ru: string; en: string }> = {
  compliments: { ru: "Легко",  en: "Easy"  },
  tenderness:  { ru: "Нежно",  en: "Soft"  },
  desire:      { ru: "Средне", en: "Warm"  },
  passion:     { ru: "Горячо", en: "Hot"   },
  hard:        { ru: "18+",    en: "18+"   },
};

const CATEGORY_NAMES: Record<Category, { ru: string; en: string }> = {
  compliments: { ru: "Комплименты", en: "Compliments" },
  tenderness:  { ru: "Нежность",   en: "Tenderness"  },
  desire:      { ru: "Желание",    en: "Desire"      },
  passion:     { ru: "Страсть",    en: "Passion"     },
  hard:        { ru: "Жёстко",     en: "Hard"        },
};

const CATEGORY_SUBS: Record<Category, { ru: string; en: string }> = {
  compliments: { ru: "Слова, которые греют",   en: "Words that warm"   },
  tenderness:  { ru: "Прикосновения и забота", en: "Touch and care"    },
  desire:      { ru: "Игривость и флирт",      en: "Playful & flirty"  },
  passion:     { ru: "Интенсивность и огонь",  en: "Intense & fiery"   },
  hard:        { ru: "Откровенно и смело",     en: "Bold and explicit" },
};

/* ─── Category card ─── */
function CategoryCard({
  category, lang, onClick, index,
}: {
  category: Category; lang: Lang; onClick: () => void; index: number;
}) {
  const { r, g, b } = CATEGORY_CONFIG[category];
  const [pressed, setPressed] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const tm = setTimeout(() => setVisible(true), index * 60 + 50);
    return () => clearTimeout(tm);
  }, [index]);

  const Icon = ICONS[category];
  const mainLabel = CATEGORY_NAMES[category][lang];
  const subLabel = CATEGORY_SUBS[category][lang];
  const levelLabel = LEVEL_LABELS[category][lang];

  return (
    <button
      onClick={onClick}
      onPointerDown={() => { setPressed(true); window.Telegram?.WebApp?.HapticFeedback?.impactOccurred("light"); }}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      style={{
        width: "100%",
        background: pressed
          ? `linear-gradient(135deg, rgba(${r},${g},${b},0.22) 0%, rgba(${r},${g},${b},0.10) 55%, rgba(${r},${g},${b},0.04) 100%)`
          : `linear-gradient(135deg, rgba(${r},${g},${b},0.13) 0%, rgba(${r},${g},${b},0.05) 55%, rgba(${r},${g},${b},0.01) 100%)`,
        border: `1px solid rgba(${r},${g},${b},${pressed ? 0.35 : 0.16})`,
        borderRadius: 18,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        padding: "14px 14px 14px 16px",
        textAlign: "left",
        opacity: visible ? 1 : 0,
        transform: visible ? `translateY(0) scale(${pressed ? 0.97 : 1})` : "translateY(12px)",
        transition: "opacity 0.38s ease, transform 0.38s ease, background 0.16s, border-color 0.16s",
        position: "relative",
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      <div style={{
        position: "absolute", inset: 0, borderRadius: 18, pointerEvents: "none",
        background: `radial-gradient(ellipse at 90% 50%, rgba(${r},${g},${b},${pressed ? 0.12 : 0.06}) 0%, transparent 60%)`,
      }}/>

      <div style={{
        flexShrink: 0, width: 48, height: 48, borderRadius: "50%", marginRight: 14,
        background: `radial-gradient(circle at 35% 30%, rgba(${r},${g},${b},0.55), rgba(${r},${g},${b},0.14) 65%, transparent)`,
        border: `1px solid rgba(${r},${g},${b},${pressed ? 0.55 : 0.28})`,
        boxShadow: pressed ? `0 0 20px rgba(${r},${g},${b},0.32)` : `0 0 10px rgba(${r},${g},${b},0.12)`,
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "box-shadow 0.16s, border-color 0.16s",
        position: "relative", zIndex: 1,
      }}>
        <Icon r={r} g={g} b={b}/>
      </div>

      <div style={{ flex: 1, minWidth: 0, position: "relative", zIndex: 1 }}>
        <div style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700,
          fontSize: "clamp(15px, 4.2vw, 19px)", letterSpacing: "-0.02em",
          color: pressed ? `rgb(${r},${g},${b})` : TEXT_P,
          transition: "color 0.16s", lineHeight: 1.2, marginBottom: 4,
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>{mainLabel}</div>
        <div style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 400,
          fontSize: "clamp(10px, 2.5vw, 12px)", color: TEXT_S,
          lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>{subLabel}</div>
      </div>

      <div style={{
        flexShrink: 0, marginLeft: 10, display: "flex", flexDirection: "column",
        alignItems: "flex-end", gap: 6, position: "relative", zIndex: 1,
      }}>
        <span style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 10,
          letterSpacing: "0.10em", textTransform: "uppercase",
          color: `rgba(${r},${g},${b},${pressed ? 1 : 0.70})`,
          transition: "color 0.16s",
        }}>{levelLabel}</span>
        <svg viewBox="0 0 16 16" width="13" height="13" fill="none">
          <path d="M6 4 L10 8 L6 12" stroke={`rgba(${r},${g},${b},${pressed ? 0.70 : 0.35})`} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    </button>
  );
}

/* ─── Scenario card ─── */
function ScenarioCard({ lang, onClick, index }: { lang: Lang; onClick: () => void; index: number }) {
  const [pressed, setPressed] = useState(false);
  const [visible, setVisible] = useState(false);
  const r = 155, g = 15, b = 90;

  useEffect(() => {
    const tm = setTimeout(() => setVisible(true), index * 60 + 50);
    return () => clearTimeout(tm);
  }, [index]);

  return (
    <button
      onClick={onClick}
      onPointerDown={() => { setPressed(true); window.Telegram?.WebApp?.HapticFeedback?.impactOccurred("light"); }}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      style={{
        width: "100%",
        background: pressed
          ? `linear-gradient(135deg, rgba(${r},${g},${b},0.22) 0%, rgba(${r},${g},${b},0.10) 55%, rgba(${r},${g},${b},0.04) 100%)`
          : `linear-gradient(135deg, rgba(${r},${g},${b},0.13) 0%, rgba(${r},${g},${b},0.05) 55%, rgba(${r},${g},${b},0.01) 100%)`,
        border: `1px solid rgba(${r},${g},${b},${pressed ? 0.35 : 0.16})`,
        borderRadius: 18, cursor: "pointer", display: "flex", alignItems: "center",
        padding: "14px 14px 14px 16px", textAlign: "left",
        opacity: visible ? 1 : 0,
        transform: visible ? `translateY(0) scale(${pressed ? 0.97 : 1})` : "translateY(12px)",
        transition: "opacity 0.38s ease, transform 0.38s ease, background 0.16s, border-color 0.16s",
        position: "relative", overflow: "hidden", flexShrink: 0,
      }}
    >
      <div style={{
        position: "absolute", inset: 0, borderRadius: 18, pointerEvents: "none",
        background: `radial-gradient(ellipse at 90% 50%, rgba(${r},${g},${b},${pressed ? 0.12 : 0.06}) 0%, transparent 60%)`,
      }}/>

      <div style={{
        flexShrink: 0, width: 48, height: 48, borderRadius: "50%", marginRight: 14,
        background: `radial-gradient(circle at 35% 30%, rgba(${r},${g},${b},0.55), rgba(${r},${g},${b},0.14) 65%, transparent)`,
        border: `1px solid rgba(${r},${g},${b},${pressed ? 0.55 : 0.28})`,
        boxShadow: pressed ? `0 0 20px rgba(${r},${g},${b},0.32)` : `0 0 10px rgba(${r},${g},${b},0.12)`,
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "box-shadow 0.16s, border-color 0.16s",
        position: "relative", zIndex: 1,
      }}>
        <IconScenario r={r} g={g} b={b}/>
      </div>

      <div style={{ flex: 1, minWidth: 0, position: "relative", zIndex: 1 }}>
        <div style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700,
          fontSize: "clamp(15px, 4.2vw, 19px)", letterSpacing: "-0.02em",
          color: pressed ? `rgb(${r},${g},${b})` : TEXT_P,
          transition: "color 0.16s", lineHeight: 1.2, marginBottom: 4,
        }}>{lang === "ru" ? "Сценарии" : "Scenarios"}</div>
        <div style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 400,
          fontSize: "clamp(10px, 2.5vw, 12px)", color: TEXT_S, lineHeight: 1.2,
        }}>{lang === "ru" ? "Ролевые игры и фантазии" : "Roleplay & fantasy"}</div>
      </div>

      <div style={{
        flexShrink: 0, marginLeft: 10, display: "flex", flexDirection: "column",
        alignItems: "flex-end", gap: 6, position: "relative", zIndex: 1,
      }}>
        <span style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 10,
          letterSpacing: "0.10em", textTransform: "uppercase",
          color: `rgba(${r},${g},${b},${pressed ? 1 : 0.70})`,
          transition: "color 0.16s",
        }}>{lang === "ru" ? "ОСОБОЕ" : "SPECIAL"}</span>
        <svg viewBox="0 0 16 16" width="13" height="13" fill="none">
          <path d="M6 4 L10 8 L6 12" stroke={`rgba(${r},${g},${b},${pressed ? 0.70 : 0.35})`} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    </button>
  );
}

/* ─── Main screen ─── */
export default function Home({ lang, onCategorySelect, onScenarioOpen, onLangSwitch }: HomeProps) {
  const [mounted, setMounted] = useState(false);
  const [vh, setVh] = useState<number | null>(null);
  const [coupled, setCoupled] = useState(false);
  const topPadding = useTelegramTopInset();

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
      tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(botLink)}&text=${encodeURIComponent(UI[lang].inviteText)}`);
    }
    tg?.HapticFeedback?.impactOccurred("light");
  }, [lang]);

  const height = vh ? `${vh}px` : "100dvh";

  return (
    <div style={{
      position: "fixed", inset: 0, background: BG,
      display: "flex", flexDirection: "column", overflow: "hidden", height,
      opacity: mounted ? 1 : 0, transition: "opacity 0.28s ease",
    }}>
      {/* Ambient glows */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "-15%", right: "-15%", width: "60vw", height: "55vw", borderRadius: "50%", background: "radial-gradient(circle, rgba(190,30,90,0.10) 0%, transparent 70%)" }}/>
        <div style={{ position: "absolute", bottom: "-10%", left: "-10%", width: "55vw", height: "45vw", borderRadius: "50%", background: "radial-gradient(circle, rgba(100,10,60,0.10) 0%, transparent 70%)" }}/>
      </div>

      {/* Header */}
      <div style={{
        flexShrink: 0, display: "flex", justifyContent: "space-between", alignItems: "center",
        paddingTop: `calc(${topPadding} + 16px)`,
        paddingLeft: 18, paddingRight: 18, paddingBottom: 8,
        position: "relative", zIndex: 10,
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none">
              <path d="M12 20 C12 20 3 13 3 7.5 A4.5 4.5 0 0 1 12 5.2 A4.5 4.5 0 0 1 21 7.5 C21 13 12 20 12 20 Z" fill="rgba(200,40,90,.22)" stroke="rgba(210,80,130,.75)" strokeWidth="1.5" strokeLinejoin="round"/>
            </svg>
            <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 24, letterSpacing: "-0.04em", color: TEXT_P, lineHeight: 1 }}>
              {UI[lang].appName}
            </span>
          </div>
          <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 300, fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: TEXT_S, marginTop: 4, marginLeft: 25 }}>
            {lang === "ru" ? "выбери момент" : "choose a moment"}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {coupled ? (
            <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 20, background: "rgba(200,60,100,.10)", border: "1px solid rgba(200,60,100,.22)" }}>
              <svg viewBox="0 0 16 16" width="12" height="12" fill="none">
                <path d="M8 13 C8 13 2 9 2 5.5 A3 3 0 0 1 8 3.8 A3 3 0 0 1 14 5.5 C14 9 8 13 8 13Z" fill="rgba(200,60,100,.45)" stroke="rgba(210,80,130,.80)" strokeWidth="1.2"/>
              </svg>
              <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 500, fontSize: 11, letterSpacing: "0.06em", color: "rgba(210,90,140,.80)" }}>
                {lang === "ru" ? "пара" : "linked"}
              </span>
            </div>
          ) : (
            <button onClick={handleInvite} style={{ background: "rgba(190,30,90,.10)", border: "1px solid rgba(190,30,90,.22)", borderRadius: 20, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600, fontSize: 11, letterSpacing: "0.08em", color: "rgba(220,90,150,.80)", padding: "7px 14px", display: "flex", alignItems: "center", gap: 5 }}>
              <svg viewBox="0 0 16 16" width="11" height="11" fill="none">
                <path d="M8 13 C8 13 2 9 2 5.5 A3 3 0 0 1 8 3.8 A3 3 0 0 1 14 5.5 C14 9 8 13 8 13Z" fill="rgba(200,60,100,.35)" stroke="rgba(210,80,130,.80)" strokeWidth="1.2"/>
              </svg>
              {UI[lang].invite}
            </button>
          )}
          <button onClick={onLangSwitch} style={{ background: "rgba(255,238,248,.06)", border: "1px solid rgba(255,238,248,.10)", borderRadius: 20, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 500, fontSize: 11, letterSpacing: "0.08em", color: TEXT_S, padding: "7px 12px" }}>
            {lang === "ru" ? "EN" : "RU"}
          </button>
        </div>
      </div>

      {/* Cards */}
      <div style={{
        flex: 1, overflowY: "auto", overflowX: "hidden",
        padding: "10px 14px 14px",
        display: "flex", flexDirection: "column", gap: 8,
        position: "relative", zIndex: 10,
      }}>
        {CATEGORIES_ORDER.map((cat, i) => (
          <CategoryCard key={cat} category={cat} lang={lang} onClick={() => onCategorySelect(cat)} index={i}/>
        ))}
        <ScenarioCard lang={lang} onClick={onScenarioOpen} index={CATEGORIES_ORDER.length}/>
      </div>

      {/* Footer */}
      <div style={{
        flexShrink: 0,
        padding: `8px 18px max(14px, env(safe-area-inset-bottom))`,
        textAlign: "center", position: "relative", zIndex: 10,
      }}>
        <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 300, fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: TEXT_T, margin: 0 }}>
          {UI[lang].footerHint}
        </p>
      </div>
    </div>
  );
}
