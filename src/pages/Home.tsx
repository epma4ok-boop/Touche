import { useEffect, useCallback, useState } from "react";
import { UI, CATEGORY_CONFIG, CATEGORIES_ORDER, LANG_CYCLE, type Lang, type Category } from "@/data/i18n";
import { BOT_USERNAME } from "@/config";

const BG = "#0d0610";
const TEXT_P = "rgba(255,238,248,0.92)";
const TEXT_S = "rgba(255,238,248,0.44)";

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

/* ── Neon SVG icons per category ────────────────────────────────────────────── */
function CategoryIcon({ category, color }: { category: Category; color: string }) {
  const s = { stroke: color, fill: "none", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (category) {
    case "compliments":
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" {...s}>
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
      );
    case "tenderness":
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" {...s}>
          <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"/>
          <line x1="16" y1="8" x2="2" y2="22"/>
          <line x1="17.5" y1="15" x2="9" y2="15"/>
        </svg>
      );
    case "desire":
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" {...s}>
          <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
        </svg>
      );
    case "passion":
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" {...s}>
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          <polyline points="8,13 10,10 12,14 14,10.5 16,13" strokeWidth={1.3}/>
        </svg>
      );
    case "hard":
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" {...s}>
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
        </svg>
      );
  }
}

function ScenariosIcon({ color }: { color: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2"/>
      <path d="M3 7h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/>
      <path d="M9 11h.01M15 11h.01"/>
      <path d="M8 15s1.5 2 4 2 4-2 4-2"/>
    </svg>
  );
}

function InviteIcon({ color }: { color: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <line x1="19" y1="8" x2="19" y2="14"/>
      <line x1="22" y1="11" x2="16" y2="11"/>
    </svg>
  );
}

/* ── Category row ────────────────────────────────────────────────────────────── */
function CategoryRow({
  category, lang, onClick, index,
}: { category: Category; lang: Lang; onClick: () => void; index: number }) {
  const cfg = CATEGORY_CONFIG[category];
  const { r, g, b } = cfg;
  const color = `rgb(${r},${g},${b})`;
  const [pressed, setPressed] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const tm = setTimeout(() => setVisible(true), index * 55 + 20);
    return () => clearTimeout(tm);
  }, [index]);

  const t = UI[lang];
  const nameMap: Record<Category, string> = {
    compliments: t.catCompliments,
    tenderness:  t.catTenderness,
    desire:      t.catDesire,
    passion:     t.catPassion,
    hard:        t.catHard,
  };
  const subMap: Record<Category, string> = {
    compliments: t.catComplimentsSub,
    tenderness:  t.catTendernessSub,
    desire:      t.catDesireSub,
    passion:     t.catPassionSub,
    hard:        t.catHardSub,
  };

  return (
    <button
      onClick={onClick}
      onPointerDown={() => { setPressed(true); window.Telegram?.WebApp?.HapticFeedback?.impactOccurred("light"); }}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      style={{
        width: "100%",
        background: pressed ? `rgba(${r},${g},${b},0.10)` : "rgba(255,255,255,0.03)",
        border: `1px solid rgba(${r},${g},${b},${pressed ? 0.35 : 0.18})`,
        borderRadius: 18,
        padding: "14px 16px 14px 14px",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 14,
        opacity: visible ? 1 : 0,
        transform: visible ? (pressed ? "scale(0.982)" : "scale(1)") : "translateY(14px)",
        transition: visible
          ? "opacity .3s ease, transform .18s ease, background .16s, border-color .16s"
          : "opacity .3s ease, transform .32s ease",
        flexShrink: 0,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Left accent bar */}
      <div style={{ position: "absolute", left: 0, top: 6, bottom: 6, width: 2.5, borderRadius: 99, background: `linear-gradient(180deg, rgba(${r},${g},${b},0.85), rgba(${r},${g},${b},0.20))` }} />

      {/* Icon circle */}
      <div style={{
        width: 44,
        height: 44,
        borderRadius: "50%",
        flexShrink: 0,
        background: `radial-gradient(circle at 35% 30%, rgba(${r},${g},${b},0.40) 0%, rgba(${r},${g},${b},0.10) 70%)`,
        border: `1px solid rgba(${r},${g},${b},0.30)`,
        boxShadow: `0 0 16px rgba(${r},${g},${b},0.20)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        filter: `drop-shadow(0 0 6px rgba(${r},${g},${b},0.50))`,
      }}>
        <CategoryIcon category={category} color={color} />
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
        <div style={{
          fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif",
          fontWeight: 700,
          fontSize: 17,
          letterSpacing: "-0.3px",
          color: TEXT_P,
          lineHeight: 1.2,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}>{nameMap[category]}</div>
        <div style={{
          fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif",
          fontWeight: 300,
          fontSize: 11,
          color: `rgba(${r},${g},${b},0.65)`,
          marginTop: 3,
          letterSpacing: "0.06em",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}>{subMap[category]}</div>
      </div>

      {/* Chevron */}
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={`rgba(${r},${g},${b},0.50)`} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <polyline points="9 18 15 12 9 6"/>
      </svg>
    </button>
  );
}

/* ── Scenarios row ───────────────────────────────────────────────────────────── */
function ScenariosRow({ lang, onClick, index }: { lang: Lang; onClick: () => void; index: number }) {
  const r = 123, g = 94, b = 180;
  const color = `rgb(${r},${g},${b})`;
  const [pressed, setPressed] = useState(false);
  const [visible, setVisible] = useState(false);
  useEffect(() => { const tm = setTimeout(() => setVisible(true), index * 55 + 20); return () => clearTimeout(tm); }, [index]);

  const labels: Record<Lang, { name: string; sub: string }> = {
    ru: { name: "Сценарии", sub: "ролевые игры · для двоих" },
    en: { name: "Scenarios", sub: "roleplay · for two" },
    hi: { name: "दृश्य", sub: "रोलप्ले · दो के लिए" },
    pt: { name: "Cenários", sub: "roleplay · para dois" },
    es: { name: "Escenarios", sub: "roleplay · para dos" },
  };
  const lbl = labels[lang];

  return (
    <button
      onClick={onClick}
      onPointerDown={() => { setPressed(true); window.Telegram?.WebApp?.HapticFeedback?.impactOccurred("light"); }}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      style={{
        width: "100%",
        background: pressed ? `rgba(${r},${g},${b},0.10)` : "rgba(255,255,255,0.03)",
        border: `1px solid rgba(${r},${g},${b},${pressed ? 0.35 : 0.18})`,
        borderRadius: 18,
        padding: "14px 16px 14px 14px",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 14,
        opacity: visible ? 1 : 0,
        transform: visible ? (pressed ? "scale(0.982)" : "scale(1)") : "translateY(14px)",
        transition: visible ? "opacity .3s ease, transform .18s ease, background .16s, border-color .16s" : "opacity .3s ease, transform .32s ease",
        flexShrink: 0,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div style={{ position: "absolute", left: 0, top: 6, bottom: 6, width: 2.5, borderRadius: 99, background: `linear-gradient(180deg, rgba(${r},${g},${b},0.85), rgba(${r},${g},${b},0.20))` }} />
      <div style={{ width: 44, height: 44, borderRadius: "50%", flexShrink: 0, background: `radial-gradient(circle at 35% 30%, rgba(${r},${g},${b},0.40) 0%, rgba(${r},${g},${b},0.10) 70%)`, border: `1px solid rgba(${r},${g},${b},0.30)`, boxShadow: `0 0 16px rgba(${r},${g},${b},0.20)`, display: "flex", alignItems: "center", justifyContent: "center", filter: `drop-shadow(0 0 6px rgba(${r},${g},${b},0.50))` }}>
        <ScenariosIcon color={color} />
      </div>
      <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
        <div style={{ fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif", fontWeight: 700, fontSize: 17, letterSpacing: "-0.3px", color: TEXT_P, lineHeight: 1.2 }}>{lbl.name}</div>
        <div style={{ fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif", fontWeight: 300, fontSize: 11, color: `rgba(${r},${g},${b},0.65)`, marginTop: 3, letterSpacing: "0.06em" }}>{lbl.sub}</div>
      </div>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={`rgba(${r},${g},${b},0.50)`} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <polyline points="9 18 15 12 9 6"/>
      </svg>
    </button>
  );
}

/* ── Invite row ──────────────────────────────────────────────────────────────── */
function InviteRow({ lang, onClick, coupled, index }: { lang: Lang; onClick: () => void; coupled: boolean; index: number }) {
  const r = 200, g = 50, b = 100;
  const color = `rgb(${r},${g},${b})`;
  const [pressed, setPressed] = useState(false);
  const [visible, setVisible] = useState(false);
  useEffect(() => { const tm = setTimeout(() => setVisible(true), index * 55 + 20); return () => clearTimeout(tm); }, [index]);

  const labels: Record<Lang, { partner: string; friend: string; sub: string }> = {
    ru: { partner: "Пригласить партнёра", friend: "Пригласить друга", sub: "Поделиться ссылкой на Touché" },
    en: { partner: "Invite your partner", friend: "Invite a friend", sub: "Share the Touché link" },
    hi: { partner: "साथी को आमंत्रित करें", friend: "मित्र को आमंत्रित करें", sub: "Touché लिंक साझा करें" },
    pt: { partner: "Convidar seu parceiro", friend: "Convidar um amigo", sub: "Compartilhar o link do Touché" },
    es: { partner: "Invitar a tu pareja", friend: "Invitar a un amigo", sub: "Compartir el enlace de Touché" },
  };
  const lbl = labels[lang];

  return (
    <button
      onClick={onClick}
      onPointerDown={() => { setPressed(true); window.Telegram?.WebApp?.HapticFeedback?.impactOccurred("light"); }}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      style={{
        width: "100%",
        background: pressed ? `rgba(${r},${g},${b},0.10)` : "rgba(255,255,255,0.02)",
        border: `1px solid rgba(${r},${g},${b},${pressed ? 0.40 : 0.22})`,
        borderRadius: 18,
        padding: "14px 16px 14px 14px",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 14,
        opacity: visible ? 1 : 0,
        transform: visible ? (pressed ? "scale(0.982)" : "scale(1)") : "translateY(14px)",
        transition: visible ? "opacity .3s ease, transform .18s ease, background .16s, border-color .16s" : "opacity .3s ease, transform .32s ease",
        flexShrink: 0,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div style={{ position: "absolute", left: 0, top: 6, bottom: 6, width: 2.5, borderRadius: 99, background: `linear-gradient(180deg, rgba(${r},${g},${b},0.85), rgba(${r},${g},${b},0.20))` }} />
      <div style={{ width: 44, height: 44, borderRadius: "50%", flexShrink: 0, background: `radial-gradient(circle at 35% 30%, rgba(${r},${g},${b},0.35) 0%, rgba(${r},${g},${b},0.08) 70%)`, border: `1px solid rgba(${r},${g},${b},0.28)`, display: "flex", alignItems: "center", justifyContent: "center", filter: `drop-shadow(0 0 5px rgba(${r},${g},${b},0.40))` }}>
        <InviteIcon color={color} />
      </div>
      <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
        <div style={{ fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif", fontWeight: 700, fontSize: 17, letterSpacing: "-0.3px", color: TEXT_P, lineHeight: 1.2 }}>{coupled ? lbl.friend : lbl.partner}</div>
        <div style={{ fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif", fontWeight: 300, fontSize: 11, color: `rgba(${r},${g},${b},0.65)`, marginTop: 3, letterSpacing: "0.06em" }}>{lbl.sub}</div>
      </div>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={`rgba(${r},${g},${b},0.50)`} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <polyline points="9 18 15 12 9 6"/>
      </svg>
    </button>
  );
}

const LANG_ABBREV: Record<Lang, string> = { ru: "RU", en: "EN", hi: "हिं", pt: "PT", es: "ES" };

const INVITE_MSG: Record<Lang, string> = {
  ru: "Присоединяйся ко мне в Touché — вечер для двоих 💕",
  en: "Join me on Touché — an evening for two 💕",
  hi: "Touché से जुड़ें — दो के लिए एक शाम 💕",
  pt: "Junte-se a mim no Touché — uma noite para dois 💕",
  es: "Únete a mí en Touché — una noche para dos 💕",
};

/* ── Main screen ─────────────────────────────────────────────────────────────── */
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
      if (coupled) {
        // Already has a partner — share plain app link (no ref, no couple creation)
        const link = `https://t.me/${BOT_USERNAME}/Touche`;
        const msg = INVITE_MSG[lang];
        tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(msg)}`);
      } else if (uid) {
        // No partner yet — share ref link to link up as a couple
        const link = `https://t.me/${BOT_USERNAME}/Touche?startapp=ref_${uid}`;
        const msg = INVITE_MSG[lang];
        tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(msg)}`);
      }
    }
  }, [lang, coupled]);

  const height = vh ? `${vh}px` : "100dvh";

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: BG,
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      height,
      opacity: mounted ? 1 : 0,
      transition: "opacity .28s ease",
      fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif",
    }}>
      {/* Ambient top glow */}
      <div style={{ position: "absolute", top: -100, left: "50%", transform: "translateX(-50%)", width: 500, height: 400, borderRadius: "50%", background: "radial-gradient(circle,rgba(180,20,100,0.12) 0%,transparent 70%)", pointerEvents: "none", zIndex: 0 }} />

      {/* Header */}
      <div style={{
        paddingTop: topPx,
        paddingLeft: 20,
        paddingRight: 20,
        paddingBottom: 16,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "relative",
        zIndex: 1,
        flexShrink: 0,
      }}>
        {/* Left: couple badge or empty */}
        <div style={{ width: 60, display: "flex", justifyContent: "flex-start" }}>
          {coupled && (
            <div style={{
              background: "rgba(255,238,248,0.05)",
              border: "1px solid rgba(255,238,248,0.08)",
              borderRadius: 20,
              padding: "5px 10px",
              fontSize: 11,
              color: "rgba(255,238,248,0.45)",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}>
              <span style={{ fontSize: 13 }}>💑</span>
              <span style={{ fontWeight: 400, letterSpacing: "0.02em" }}>{t.linked}</span>
            </div>
          )}
        </div>

        {/* Center: App name */}
        <div style={{ textAlign: "center" }}>
          <div style={{
            fontSize: 26,
            fontWeight: 800,
            letterSpacing: "-0.8px",
            color: "rgba(255,238,248,0.97)",
            lineHeight: 1,
            textShadow: "0 0 30px rgba(200,40,110,0.35)",
          }}>Touché</div>
        </div>

        {/* Right: language switch */}
        <div style={{ width: 60, display: "flex", justifyContent: "flex-end" }}>
          <button onClick={onLangSwitch} style={{
            background: "rgba(255,238,248,.06)",
            border: "1px solid rgba(255,238,248,.10)",
            borderRadius: 14,
            cursor: "pointer",
            fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif",
            fontWeight: 500,
            fontSize: 10,
            letterSpacing: "0.10em",
            textTransform: "uppercase",
            color: "rgba(255,238,248,0.44)",
            padding: "7px 10px",
            flexShrink: 0,
          }}>
            {LANG_ABBREV[LANG_CYCLE[(LANG_CYCLE.indexOf(lang) + 1) % LANG_CYCLE.length]]}
          </button>
        </div>
      </div>

      {/* Scrollable row list */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        overflowX: "hidden",
        padding: `4px 14px max(32px,env(safe-area-inset-bottom))`,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        position: "relative",
        zIndex: 1,
        scrollbarWidth: "none",
      }}>
        {CATEGORIES_ORDER.map((cat, i) => (
          <CategoryRow
            key={cat}
            category={cat}
            lang={lang}
            onClick={() => onCategorySelect(cat)}
            index={i}
          />
        ))}

        <ScenariosRow lang={lang} onClick={onScenarioOpen} index={CATEGORIES_ORDER.length} />
        <InviteRow lang={lang} onClick={handleInvite} coupled={coupled} index={CATEGORIES_ORDER.length + 1} />

        <div style={{ textAlign: "center", fontSize: 10, color: "rgba(255,238,248,0.15)", paddingTop: 8, letterSpacing: "0.3px" }}>
          {t.footerHint}
        </div>
      </div>
    </div>
  );
}
