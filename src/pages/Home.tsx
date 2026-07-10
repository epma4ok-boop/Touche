import { useEffect, useCallback, useState } from "react";
import type { Gender } from "@/components/GenderSelect";
import { GENDER_KEY } from "@/components/GenderSelect";
import { UI, CATEGORIES_ORDER, LANG_CYCLE, type Lang, type Category } from "@/data/i18n";
import IntimacyIndex from "@/components/IntimacyIndex";
import SmokeBackground from "@/components/SmokeBackground";
import { BRAND } from "@/theme/palette";

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

interface HomeProps {
  lang: Lang;
  gender?: Gender;
  coupleId: string | null;
  pendingRefUserId: number | null;
  onCategorySelect: (cat: Category) => void;
  onScenarioOpen: () => void;
  onLangSwitch: () => void;
  onGenderSwitch?: (g: Gender) => void;
  onLinkCouple: (refUserId: number) => Promise<boolean>;
  onUnlinkCouple: () => void;
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
const PR = BRAND.r, PG = BRAND.g, PB = BRAND.b;
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

/* ─── NeonIcon ─────────────────────────────────────────────────── */
function NeonIcon({ type }: { type: Category | "scenarios" | "invite" }) {
  const attrs = {
    width: 26, height: 26, viewBox: "0 0 24 24", fill: "none",
    stroke: PINK, strokeWidth: 1.7,
    strokeLinecap: "round" as const, strokeLinejoin: "round" as const,
    style: { filter: PINK_GLOW, display: "block" as const },
  };
  switch (type) {
    // Комплименты — классическое сердце
    case "compliments":
      return (
        <svg {...attrs} viewBox="0 0 24 24">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
            fill={`rgba(${PR},${PG},${PB},0.25)`} stroke={PINK} strokeWidth="1.6" />
        </svg>
      );
    // Нежность — перо / лёгкое касание
    case "tenderness":
      return (
        <svg {...attrs} viewBox="0 0 24 24">
          <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z" />
          <line x1="16" y1="8" x2="2" y2="22" />
          <line x1="17" y1="15" x2="9" y2="15" />
        </svg>
      );
    // Желание — пламя
    case "desire":
      return (
        <svg {...attrs} viewBox="0 0 24 24">
          <path d="M12 2c0 0-1.5 3-1.5 5.5C10.5 9.5 11 11 12 12c1-1 1.5-2.5 1.5-4.5 0 0 2 2.5 2 5 0 2-1 4-3.5 5.5C9.5 16.5 8 14.5 8 12.5c0-1.5.5-2.5.5-2.5S6 12.5 6 15.5C6 19 8.5 22 12 22s6-3 6-6.5C18 10 12 2 12 2z"
            fill={`rgba(${PR},${PG},${PB},0.20)`} stroke={PINK} strokeWidth="1.6" />
        </svg>
      );
    // Страсть — две сердца / пламя больше
    case "passion":
      return (
        <svg {...attrs} viewBox="0 0 24 24">
          <path d="M12 22s-8-4.5-8-11.8A5.6 5.6 0 0 1 8.8 4.8C10.4 4.1 12 5 12 5s1.6-.9 3.2-.2A5.6 5.6 0 0 1 20 10.2C20 17.5 12 22 12 22z"
            fill={`rgba(${PR},${PG},${PB},0.20)`} stroke={PINK} strokeWidth="1.6" />
          <path d="M12 8.5c0 0 .8 1.2.8 2.2 0 .9-.8 1.8-.8 1.8s-.8-.9-.8-1.8c0-1 .8-2.2.8-2.2z"
            fill={PINK} stroke="none" style={{ filter: PINK_GLOW }} />
        </svg>
      );
    // Хард — молния
    case "hard":
      return (
        <svg {...attrs} viewBox="0 0 24 24">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"
            fill={`rgba(${PR},${PG},${PB},0.20)`} stroke={PINK} strokeWidth="1.6"
            strokeLinejoin="round" />
        </svg>
      );
    // Сценарии — театральные маски
    case "scenarios":
      return (
        <svg {...attrs} viewBox="0 0 24 24">
          <circle cx="9" cy="10" r="5" />
          <circle cx="15" cy="14" r="5" />
          <path d="M7 10.5 Q9 12 11 10.5" strokeWidth="1.4" />
          <path d="M13 14.5 Q15 16.5 17 14.5" strokeWidth="1.4" />
        </svg>
      );
    // Пригласить — люди с сердцем
    case "invite":
      return (
        <svg {...attrs} viewBox="0 0 24 24">
          <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3z" />
          <path d="M8 11c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3z" />
          <path d="M8 13c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5z" />
          <path d="M16 13c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
        </svg>
      );
    default: return null;
  }
}

/* ─── Card ─────────────────────────────────────────────────────── */
function Card({
  type, title, sub, onClick, index,
}: {
  type: Category | "scenarios" | "invite";
  title: string; sub?: string; onClick: () => void; index: number;
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
      onPointerDown={() => { setPressed(true); window.Telegram?.WebApp?.HapticFeedback?.impactOccurred("light"); }}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      style={{
        display: "flex", alignItems: "center",
        width: "100%", minHeight: 82,
        padding: 0, borderRadius: 20,
        border: `1px solid rgba(${PR},${PG},${PB},${pressed ? 0.70 : 0.38})`,
        boxShadow: pressed
          ? `0 0 28px rgba(${PR},${PG},${PB},0.38),0 0 60px rgba(${PR},${PG},${PB},0.12),inset 0 1px 0 rgba(${PR},${PG},${PB},0.14)`
          : `0 0 14px rgba(${PR},${PG},${PB},0.20),0 0 36px rgba(${PR},${PG},${PB},0.06),inset 0 1px 0 rgba(${PR},${PG},${PB},0.08)`,
        background: pressed ? `rgba(${PR},${PG},${PB},0.09)` : "rgba(16,7,12,0.97)",
        cursor: "pointer", textAlign: "left",
        position: "relative", overflow: "hidden", flexShrink: 0,
        opacity: visible ? 1 : 0,
        transform: visible ? (pressed ? "scale(0.982)" : "scale(1)") : "translateY(16px)",
        transition: visible
          ? "opacity .38s,transform .17s cubic-bezier(.32,.72,0,1),box-shadow .17s,border-color .17s,background .14s"
          : "opacity .42s,transform .44s cubic-bezier(.22,1,.36,1)",
      }}
    >
      <div style={{
        position: "absolute", top: 0, right: 0, bottom: 0, width: "52%",
        backgroundImage: `url(${CAT_IMG[type]})`,
        backgroundSize: "cover", backgroundPosition: "center right",
        opacity: pressed ? 0.62 : 0.48, transition: "opacity .17s",
      }} />
      <div style={{ position: "absolute", inset: 0, background: `linear-gradient(90deg,rgba(16,7,12,1) 0%,rgba(16,7,12,0.97) 36%,rgba(16,7,12,0.82) 52%,rgba(16,7,12,0.32) 70%,rgba(16,7,12,0.08) 100%)` }} />
      <div style={{ position: "absolute", inset: 0, background: `linear-gradient(130deg,rgba(${PR},${PG},${PB},0.06) 0%,transparent 50%)` }} />
      <div style={{ position: "absolute", top: 0, left: "6%", right: "6%", height: 1, background: `linear-gradient(90deg,transparent,rgba(${PR},${PG},${PB},0.75),transparent)` }} />
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: `linear-gradient(180deg,rgba(${PR},${PG},${PB},0.95),rgba(${PR},${PG},${PB},0.18))`, borderRadius: "20px 0 0 20px" }} />

      <div style={{ position: "relative", zIndex: 2, display: "flex", alignItems: "center", width: "100%", padding: "0 15px 0 18px", gap: 13 }}>
        <div className="icon-ring" style={{
          width: 52, height: 52, borderRadius: "50%", flexShrink: 0,
          border: `1px solid rgba(${PR},${PG},${PB},0.42)`,
          background: `radial-gradient(circle at 36% 30%,rgba(${PR},${PG},${PB},0.26),rgba(${PR},${PG},${PB},0.08) 60%,transparent)`,
          boxShadow: `0 0 16px rgba(${PR},${PG},${PB},0.22),inset 0 1px 0 rgba(${PR},${PG},${PB},0.15)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          animation: visible ? `iconEntrance .55s cubic-bezier(.34,1.56,.64,1) ${index * 68 + 60}ms both, neonPulse 3.2s ease-in-out ${index * 0.4 + 1.2}s infinite` : "none",
        }}>
          <NeonIcon type={type} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif", fontWeight: 600, fontSize: 17, letterSpacing: "-0.2px", color: "rgba(255,238,248,0.97)", textShadow: "0 1px 12px rgba(0,0,0,0.8)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {title}
          </div>
          {sub && (
            <div style={{ fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif", fontSize: 12, color: "rgba(255,238,248,0.36)", marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {sub}
            </div>
          )}
        </div>

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

/* ─── CoupleIcon ───────────────────────────────────────────────── */
function CoupleIcon({ opacity = 0.85 }: { opacity?: number }) {
  return (
    <svg width="16" height="16" viewBox="0 0 32 32" fill="none" style={{ filter: `drop-shadow(0 0 4px rgba(${PR},${PG},${PB},0.80))`, display: "block" }}>
      <path d="M10 7 C10 7 7 4 4.5 5.5 C2 7 2 10.5 4 12.5 L10 18 L16 12.5 C18 10.5 18 7 15.5 5.5 C13 4 10 7 10 7 Z" fill={`rgba(${PR},${PG},${PB},${opacity})`}/>
      <path d="M22 7 C22 7 19 4 16.5 5.5 C14 7 14 10.5 16 12.5 L22 18 L28 12.5 C30 10.5 30 7 27.5 5.5 C25 4 22 7 22 7 Z" fill={`rgba(${PR},${PG},${PB},0.50)`}/>
    </svg>
  );
}

/* ─── Backdrop ─────────────────────────────────────────────────── */
function Backdrop({ visible, onClick }: { visible: boolean; onClick: () => void }) {
  return (
    <div onClick={onClick} style={{
      position: "fixed", inset: 0, zIndex: 50,
      background: "rgba(0,0,0,0.72)", backdropFilter: "blur(4px)",
      opacity: visible ? 1 : 0,
      pointerEvents: visible ? "auto" : "none",
      transition: "opacity .28s ease",
    }} />
  );
}

/* ─── Labels ───────────────────────────────────────────────────── */
const LANG_ABBREV: Record<Lang, string> = { ru: "RU", en: "EN", hi: "HI", pt: "PT", es: "ES" };

const SCENARIO_LABELS: Record<Lang, { title: string; sub: string }> = {
  ru: { title: "Сценарии",   sub: "Ролевые игры и фантазии"    },
  en: { title: "Scenarios",  sub: "Roleplay · for two"          },
  hi: { title: "परिदृश्य",    sub: "रोलप्ले · दो के लिए"        },
  pt: { title: "Cenários",   sub: "Roleplay · para dois"        },
  es: { title: "Escenarios", sub: "Roleplay · para dos"         },
};

const INVITE_LABELS: Record<Lang, { title: string; sub: string }> = {
  ru: { title: "Пригласи друга",       sub: "Поделись приложением с кем-то"    },
  en: { title: "Invite a friend",      sub: "Share this app with someone"       },
  hi: { title: "मित्र को आमंत्रित करें", sub: "किसी के साथ ऐप साझा करें"        },
  pt: { title: "Convidar amigo",       sub: "Compartilhe o app com alguém"     },
  es: { title: "Invitar amigo",        sub: "Comparte la app con alguien"       },
};

const INVITE_MSG: Record<Lang, string> = {
  ru: "Попробуй Touché — нежный вечер для двоих 💕",
  en: "Try Touché — a tender evening for two 💕",
  hi: "Touché आज़माएं — दो के लिए एक कोमल शाम 💕",
  pt: "Experimente Touché — uma noite especial para dois 💕",
  es: "Prueba Touché — una noche especial para dos 💕",
};

/* ─── Couple modal labels ──────────────────────────────────────── */
const COUPLE_LABELS: Record<Lang, {
  titleLinked: string; titleConnect: string; titlePending: string;
  subLinked: string; subConnect: string; subPending: string;
  id: string; unlink: string; unlinkConfirm: string; cancel: string; irreversible: string;
  shareLink: string; connectNow: string; connectInfo: string;
}> = {
  ru: {
    titleLinked:   "Ваша пара",
    titleConnect:  "Подключить пару",
    titlePending:  "Партнёр приглашает",
    subLinked:     "Вы связаны с партнёром",
    subConnect:    "Поделитесь ссылкой — партнёр перейдёт и свяжет пару здесь",
    subPending:    "Кто-то открыл приложение по вашей ссылке",
    id:            "ID пары",
    unlink:        "Отвязать пару",
    unlinkConfirm: "Да, отвязать",
    cancel:        "Отмена",
    irreversible:  "Это действие нельзя отменить",
    shareLink:     "Поделиться моей ссылкой",
    connectNow:    "Связать пару",
    connectInfo:   "После нажатия пара будет создана в базе",
  },
  en: {
    titleLinked:   "Your pair",
    titleConnect:  "Connect a pair",
    titlePending:  "Partner invites you",
    subLinked:     "You are linked with a partner",
    subConnect:    "Share your link — your partner opens it and connects here",
    subPending:    "Someone opened the app via your link",
    id:            "Pair ID",
    unlink:        "Unlink pair",
    unlinkConfirm: "Yes, unlink",
    cancel:        "Cancel",
    irreversible:  "This action cannot be undone",
    shareLink:     "Share my link",
    connectNow:    "Connect pair",
    connectInfo:   "The pair will be created after tapping",
  },
  hi: {
    titleLinked:   "आपकी जोड़ी",
    titleConnect:  "जोड़ी जोड़ें",
    titlePending:  "साथी आमंत्रित करता है",
    subLinked:     "आप साथी से जुड़े हैं",
    subConnect:    "अपना लिंक साझा करें — साथी खोलेगा और यहाँ जुड़ेगा",
    subPending:    "किसी ने आपके लिंक से ऐप खोला",
    id:            "जोड़ी ID",
    unlink:        "जोड़ी हटाएं",
    unlinkConfirm: "हां, हटाएं",
    cancel:        "रद्द करें",
    irreversible:  "यह क्रिया पूर्ववत नहीं की जा सकती",
    shareLink:     "मेरा लिंक साझा करें",
    connectNow:    "जोड़ी जोड़ें",
    connectInfo:   "टैप के बाद जोड़ी बन जाएगी",
  },
  pt: {
    titleLinked:   "Seu casal",
    titleConnect:  "Conectar casal",
    titlePending:  "Parceiro convida",
    subLinked:     "Você está conectado com um parceiro",
    subConnect:    "Compartilhe seu link — o parceiro abre e conecta aqui",
    subPending:    "Alguém abriu o app pelo seu link",
    id:            "ID do casal",
    unlink:        "Desvincular casal",
    unlinkConfirm: "Sim, desvincular",
    cancel:        "Cancelar",
    irreversible:  "Esta ação não pode ser desfeita",
    shareLink:     "Compartilhar meu link",
    connectNow:    "Conectar casal",
    connectInfo:   "O casal será criado após tocar",
  },
  es: {
    titleLinked:   "Tu pareja",
    titleConnect:  "Conectar pareja",
    titlePending:  "Tu pareja te invita",
    subLinked:     "Estás vinculado con tu pareja",
    subConnect:    "Comparte tu enlace — tu pareja lo abre y se conecta aquí",
    subPending:    "Alguien abrió la app con tu enlace",
    id:            "ID de la pareja",
    unlink:        "Desvincular pareja",
    unlinkConfirm: "Sí, desvincular",
    cancel:        "Cancelar",
    irreversible:  "Esta acción no se puede deshacer",
    shareLink:     "Compartir mi enlace",
    connectNow:    "Conectar pareja",
    connectInfo:   "La pareja se creará al tocar",
  },
};

/* ─── Menu labels ──────────────────────────────────────────────── */
const MENU_LABELS: Record<Lang, { menu: string; instructions: string; subscription: string; language: string; about: string; gender: string; genderM: string; genderF: string }> = {
  ru: { menu: "Меню", instructions: "Инструкция", subscription: "Premium", language: "Язык", about: "О приложении", gender: "Пол", genderM: "Мужчина", genderF: "Женщина" },
  en: { menu: "Menu", instructions: "How to play", subscription: "Premium", language: "Language", about: "About", gender: "Gender", genderM: "Male", genderF: "Female" },
  hi: { menu: "मेनू", instructions: "कैसे खेलें", subscription: "Premium", language: "भाषा", about: "ऐप के बारे में", gender: "लिंग", genderM: "पुरुष", genderF: "महिला" },
  pt: { menu: "Menu", instructions: "Como jogar", subscription: "Premium", language: "Idioma", about: "Sobre o app", gender: "Gênero", genderM: "Homem", genderF: "Mulher" },
  es: { menu: "Menú", instructions: "Cómo jugar", subscription: "Premium", language: "Idioma", about: "Sobre la app", gender: "Género", genderM: "Hombre", genderF: "Mujer" },
};

/* ─── Instructions content ─────────────────────────────────────── */
const INSTRUCTIONS: Record<Lang, { title: string; steps: { icon: string; head: string; body: string }[] }> = {
  ru: {
    title: "Как играть",
    steps: [
      { icon: "🔗", head: "Создайте пару",         body: "Нажмите на иконку пары в правом углу — поделитесь ссылкой с партнёром. Когда он перейдёт, нажмите «Связать пару»." },
      { icon: "💬", head: "Выберите категорию",    body: "От нежных комплиментов до откровенных игр — выбирайте по настроению." },
      { icon: "✋", head: "Удерживайте кнопку",    body: "Сексолог-психолог внутри создаст уникальное задание специально для вас." },
      { icon: "💕", head: "Выполните вместе",      body: "Следуйте заданию — и ваш вечер станет незабываемым." },
      { icon: "🎭", head: "Попробуйте сценарии",   body: "ИИ придумает ролевую историю для двоих — у каждого своя роль." },
    ],
  },
  en: {
    title: "How to play",
    steps: [
      { icon: "🔗", head: "Create a pair",          body: "Tap the couple icon in the top right — share your link with your partner. When they open it, tap 'Connect pair'." },
      { icon: "💬", head: "Choose a category",      body: "From gentle compliments to bold games — pick what suits your mood." },
      { icon: "✋", head: "Hold the button",         body: "An AI sex therapist inside crafts a unique task just for you two." },
      { icon: "💕", head: "Do it together",         body: "Follow the task — and your evening becomes unforgettable." },
      { icon: "🎭", head: "Try scenarios",          body: "AI creates a roleplay story for two — each of you gets your own role." },
    ],
  },
  hi: {
    title: "कैसे खेलें",
    steps: [
      { icon: "🔗", head: "जोड़ी बनाएं",             body: "ऊपर जोड़ी आइकन दबाएं — साथी को लिंक भेजें। खोलने पर 'जोड़ी जोड़ें' दबाएं।" },
      { icon: "💬", head: "श्रेणी चुनें",            body: "कोमल तारीफ से साहसिक खेल तक — मूड के अनुसार चुनें।" },
      { icon: "✋", head: "बटन दबाए रखें",           body: "AI सेक्सोलॉजिस्ट आपके लिए अनोखा कार्य बनाएगा।" },
      { icon: "💕", head: "साथ पूरा करें",           body: "कार्य का पालन करें — शाम यादगार बन जाएगी।" },
      { icon: "🎭", head: "परिदृश्य आज़माएं",        body: "AI दोनों के लिए रोलप्ले कहानी बनाएगा।" },
    ],
  },
  pt: {
    title: "Como jogar",
    steps: [
      { icon: "🔗", head: "Crie um casal",           body: "Toque no ícone do casal — compartilhe o link com seu parceiro. Quando ele abrir, toque em 'Conectar casal'." },
      { icon: "💬", head: "Escolha uma categoria",   body: "De elogios gentis a jogos ousados — escolha conforme o humor." },
      { icon: "✋", head: "Segure o botão",          body: "Um sexólogo de IA cria uma tarefa única para vocês dois." },
      { icon: "💕", head: "Façam juntos",            body: "Sigam a tarefa — e a noite será inesquecível." },
      { icon: "🎭", head: "Tente cenários",          body: "A IA cria uma história de roleplay — cada um com seu papel." },
    ],
  },
  es: {
    title: "Cómo jugar",
    steps: [
      { icon: "🔗", head: "Crea una pareja",         body: "Toca el ícono de pareja — comparte el enlace. Al abrirlo, toca 'Conectar pareja'." },
      { icon: "💬", head: "Elige una categoría",     body: "Desde piropos tiernos a juegos atrevidos — según tu humor." },
      { icon: "✋", head: "Mantén el botón",         body: "Un sexólogo de IA crea una tarea única para los dos." },
      { icon: "💕", head: "Hazlo juntos",            body: "Sigue la tarea — y la noche será inolvidable." },
      { icon: "🎭", head: "Prueba escenarios",       body: "La IA crea una historia de roleplay — cada uno con su rol." },
    ],
  },
};

/* ─── Subscription content ─────────────────────────────────────── */
const SUBSCRIPTION: Record<Lang, { title: string; features: string[]; price: string; note: string; cta: string }> = {
  ru: {
    title: "Touché Premium",
    features: [
      "🔥 «Страсть» и «Хард» — откровенные задания 18+",
      "🎭 ИИ-сценарии — уникальные ролевые истории",
      "♾️ Безлимитные задания каждый день",
      "⚡ Приоритетная генерация",
      "💫 Новые категории первыми",
    ],
    price: "199 Stars / месяц",
    note: "≈ 260 ₽ · отмена в любой момент",
    cta: "Подписаться — 199 ★",
  },
  en: {
    title: "Touché Premium",
    features: [
      "🔥 Passion & Hard — explicit 18+ tasks",
      "🎭 AI scenarios — unique roleplay stories",
      "♾️ Unlimited tasks every day",
      "⚡ Priority generation",
      "💫 Exclusive new categories first",
    ],
    price: "199 Stars / month",
    note: "≈ $2.60 · cancel anytime",
    cta: "Subscribe — 199 ★",
  },
  hi: {
    title: "Touché Premium",
    features: [
      "🔥 जुनून और साहसिक श्रेणियां — 18+ कार्य",
      "🎭 AI रोलप्ले — अनोखी कहानियां",
      "♾️ हर दिन असीमित कार्य",
      "⚡ प्राथमिकता जनरेशन",
      "💫 नई श्रेणियां पहले",
    ],
    price: "199 Stars / माह",
    note: "≈ ₹220 · कभी भी रद्द करें",
    cta: "सदस्यता लें — 199 ★",
  },
  pt: {
    title: "Touché Premium",
    features: [
      "🔥 Paixão e Intenso — tarefas 18+",
      "🎭 Cenários de IA — histórias únicas",
      "♾️ Tarefas ilimitadas todo dia",
      "⚡ Geração prioritária",
      "💫 Novas categorias primeiro",
    ],
    price: "199 Stars / mês",
    note: "≈ R$15 · cancele quando quiser",
    cta: "Assinar — 199 ★",
  },
  es: {
    title: "Touché Premium",
    features: [
      "🔥 Pasión e Intenso — tareas 18+",
      "🎭 Escenarios de IA — historias únicas",
      "♾️ Tareas ilimitadas cada día",
      "⚡ Generación prioritaria",
      "💫 Nuevas categorías primero",
    ],
    price: "199 Stars / mes",
    note: "≈ $2.60 · cancela cuando quieras",
    cta: "Suscribirse — 199 ★",
  },
};

/* ─── Global CSS ───────────────────────────────────────────────── */
const GLOBAL_STYLES = `
  @keyframes neonPulse {
    0%,100% { box-shadow: 0 0 16px rgba(${PR},${PG},${PB},0.22),inset 0 1px 0 rgba(${PR},${PG},${PB},0.15); }
    50%      { box-shadow: 0 0 28px rgba(${PR},${PG},${PB},0.58),0 0 48px rgba(${PR},${PG},${PB},0.20),inset 0 1px 0 rgba(${PR},${PG},${PB},0.22); }
  }
  @keyframes iconEntrance {
    from { opacity:0; transform:scale(0.55) translateY(8px); }
    to   { opacity:1; transform:scale(1)    translateY(0); }
  }
  @keyframes slideUp {
    from { transform:translateY(100%); opacity:0.4; }
    to   { transform:translateY(0);    opacity:1; }
  }
  @keyframes menuBtnPulse {
    0%,100% { box-shadow:0 0 0px rgba(${PR},${PG},${PB},0); }
    60%      { box-shadow:0 0 12px rgba(${PR},${PG},${PB},0.35); }
  }
  @keyframes fadeIn {
    from { opacity:0; transform:translateY(6px); }
    to   { opacity:1; transform:translateY(0); }
  }
`;

/* ─── BottomSheet wrapper ──────────────────────────────────────── */
function BottomSheet({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 60,
      display: "flex", alignItems: "flex-end", justifyContent: "center",
      pointerEvents: "none",
    }}>
      <div style={{
        pointerEvents: "auto",
        width: "100%", maxWidth: 480,
        background: "linear-gradient(160deg,#1a0814 0%,#110710 100%)",
        borderRadius: "24px 24px 0 0",
        border: `1px solid rgba(${PR},${PG},${PB},0.28)`, borderBottom: "none",
        boxShadow: `0 -8px 60px rgba(${PR},${PG},${PB},0.18),0 -2px 20px rgba(0,0,0,0.6)`,
        padding: "28px 24px 44px",
        maxHeight: "82vh", overflowY: "auto", scrollbarWidth: "none",
        animation: "slideUp .32s cubic-bezier(.22,1,.36,1)",
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 99, background: `rgba(${PR},${PG},${PB},0.30)`, margin: "0 auto 24px" }} />
        {children}
      </div>
    </div>
  );
}

/* ─── PrimaryBtn / SecondaryBtn ────────────────────────────────── */
function PrimaryBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      width: "100%", padding: "15px", borderRadius: 16, border: "none",
      background: `linear-gradient(135deg,rgba(${PR},${PG},${PB},0.95),rgba(150,20,80,0.90))`,
      color: "rgba(255,238,248,0.97)",
      fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700, fontSize: 15,
      cursor: "pointer", boxShadow: `0 4px 24px rgba(${PR},${PG},${PB},0.40)`,
    }}>{children}</button>
  );
}
function GhostBtn({ onClick, children, danger }: { onClick: () => void; children: React.ReactNode; danger?: boolean }) {
  return (
    <button onClick={onClick} style={{
      width: "100%", padding: "15px", borderRadius: 16,
      border: `1px solid ${danger ? `rgba(${PR},${PG},${PB},0.40)` : "rgba(255,238,248,0.08)"}`,
      background: danger ? `rgba(${PR},${PG},${PB},0.08)` : "rgba(255,238,248,0.04)",
      color: danger ? `rgba(${PR},${PG},${PB},0.85)` : "rgba(255,238,248,0.38)",
      fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 600, fontSize: 15,
      cursor: "pointer",
    }}>{children}</button>
  );
}

/* ─── CoupleModal ──────────────────────────────────────────────── */
function CoupleModal({ lang, coupleId, pendingRefUserId, onLink, onUnlink, onClose }: {
  lang: Lang;
  coupleId: string | null;
  pendingRefUserId: number | null;
  onLink: (refUserId: number) => Promise<boolean>;
  onUnlink: () => void;
  onClose: () => void;
}) {
  const lb = COUPLE_LABELS[lang];
  const [confirm, setConfirm] = useState(false);
  const [linking, setLinking] = useState(false);

  const myId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
  const BOT = "ToucheCoupleBot";

  function handleShareMyLink() {
    const tg = window.Telegram?.WebApp;
    if (!myId) return;
    const link = `https://t.me/${BOT}/Touche?startapp=ref_${myId}`;
    const msg = lang === "ru"
      ? "Открой по ссылке и свяжи нашу пару в Touché 💕"
      : "Open this link and connect our pair in Touché 💕";
    tg?.openTelegramLink?.(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(msg)}`);
    onClose();
  }

  async function handleConnect() {
    if (!pendingRefUserId) return;
    setLinking(true);
    const ok = await onLink(pendingRefUserId);
    setLinking(false);
    if (ok) onClose();
  }

  /* ── No pair ── */
  if (!coupleId) {
    const hasPending = !!pendingRefUserId;
    return (
      <BottomSheet>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 42, marginBottom: 10 }}>💑</div>
          <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700, fontSize: 20, color: "rgba(255,238,248,0.95)", marginBottom: 6 }}>
            {hasPending ? lb.titlePending : lb.titleConnect}
          </div>
          <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, color: "rgba(255,238,248,0.40)", lineHeight: 1.5 }}>
            {hasPending ? lb.subPending : lb.subConnect}
          </div>
        </div>

        {hasPending ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, color: "rgba(255,238,248,0.35)", textAlign: "center", marginBottom: 4 }}>
              {lb.connectInfo}
            </div>
            <PrimaryBtn onClick={handleConnect}>
              {linking ? "..." : lb.connectNow}
            </PrimaryBtn>
            <GhostBtn onClick={onClose}>{lb.cancel}</GhostBtn>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <PrimaryBtn onClick={handleShareMyLink}>{lb.shareLink}</PrimaryBtn>
            <GhostBtn onClick={onClose}>{lb.cancel}</GhostBtn>
          </div>
        )}
      </BottomSheet>
    );
  }

  /* ── Has pair ── */
  const maskedId = coupleId.slice(0, 4) + "···" + coupleId.slice(-4);
  return (
    <BottomSheet>
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
          <CoupleIcon opacity={0.9} />
        </div>
        <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700, fontSize: 20, color: "rgba(255,238,248,0.95)", marginBottom: 6 }}>
          {lb.titleLinked}
        </div>
        <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, color: "rgba(255,238,248,0.40)" }}>
          {lb.subLinked}
        </div>
      </div>

      <div style={{
        background: `rgba(${PR},${PG},${PB},0.07)`, border: `1px solid rgba(${PR},${PG},${PB},0.22)`,
        borderRadius: 16, padding: "12px 18px", marginBottom: 20,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: "rgba(255,238,248,0.35)" }}>{lb.id}</div>
        <div style={{ fontFamily: "monospace", fontSize: 14, color: `rgba(${PR},${PG},${PB},0.90)`, letterSpacing: "0.05em" }}>{maskedId}</div>
      </div>

      {!confirm ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <GhostBtn danger onClick={() => setConfirm(true)}>{lb.unlink}</GhostBtn>
          <GhostBtn onClick={onClose}>{lb.cancel}</GhostBtn>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", textAlign: "center", fontSize: 12, color: "rgba(255,238,248,0.40)", marginBottom: 4 }}>{lb.irreversible}</div>
          <PrimaryBtn onClick={() => { onUnlink(); onClose(); }}>{lb.unlinkConfirm}</PrimaryBtn>
          <GhostBtn onClick={() => setConfirm(false)}>{lb.cancel}</GhostBtn>
        </div>
      )}
    </BottomSheet>
  );
}

/* ─── ScenarioGate ─────────────────────────────────────────────── */
const SCENARIO_GATE: Record<Lang, { title: string; body: string; link: string; skip: string }> = {
  ru: { title: "Нужна пара",         body: "Для сценариев нужен партнёр. Свяжите пару сейчас или пропустите.",         link: "Связать пару", skip: "Позже" },
  en: { title: "Pair required",      body: "Scenarios need a partner. Connect a pair now or skip.",                      link: "Connect pair", skip: "Later" },
  hi: { title: "जोड़ी चाहिए",          body: "परिदृश्य के लिए साथी चाहिए। अभी जोड़ें या बाद में।",                    link: "जोड़ी जोड़ें",  skip: "बाद में" },
  pt: { title: "Casal necessário",   body: "Os cenários precisam de um parceiro. Conecte um casal agora ou pule.",      link: "Conectar casal", skip: "Depois" },
  es: { title: "Se necesita pareja", body: "Los escenarios necesitan una pareja. Conéctala ahora o salta.",             link: "Conectar pareja", skip: "Después" },
};

function ScenarioGate({ lang, onConnect, onSkip }: { lang: Lang; onConnect: () => void; onSkip: () => void }) {
  const t = SCENARIO_GATE[lang];
  return (
    <BottomSheet>
      <div style={{ textAlign: "center", marginBottom: 22 }}>
        <div style={{ fontSize: 38, marginBottom: 10 }}>🎭</div>
        <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700, fontSize: 20, color: "rgba(255,238,248,0.95)", marginBottom: 8 }}>{t.title}</div>
        <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, color: "rgba(255,238,248,0.42)", lineHeight: 1.55 }}>{t.body}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <PrimaryBtn onClick={onConnect}>{t.link}</PrimaryBtn>
        <GhostBtn onClick={onSkip}>{t.skip}</GhostBtn>
      </div>
    </BottomSheet>
  );
}

/* ─── MenuPanel ────────────────────────────────────────────────── */
type MenuSection = "main" | "instructions" | "subscription";

function MenuPanel({ lang, gender, onGenderSwitch, onClose, onLangSwitch }: { lang: Lang; gender?: Gender; onGenderSwitch?: (g: Gender) => void; onClose: () => void; onLangSwitch: () => void }) {
  const [section, setSection] = useState<MenuSection>("main");
  const ml = MENU_LABELS[lang];
  const instr = INSTRUCTIONS[lang];
  const sub = SUBSCRIPTION[lang];

  const rowStyle: React.CSSProperties = {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "14px 16px", borderRadius: 16,
    border: `1px solid rgba(${PR},${PG},${PB},0.18)`,
    background: `rgba(${PR},${PG},${PB},0.05)`,
    cursor: "pointer", marginBottom: 10,
  };
  const chevron = (
    <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={PINK} strokeOpacity={0.55} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  );
  const backBtn = (
    <button onClick={() => setSection("main")} style={{ background: "none", border: "none", color: `rgba(${PR},${PG},${PB},0.75)`, fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, cursor: "pointer", padding: "0 0 18px", display: "flex", alignItems: "center", gap: 6 }}>
      <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
      {lang === "ru" ? "Назад" : "Back"}
    </button>
  );

  const iconBox = (emoji: string, accent?: boolean) => (
    <div style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0, background: `rgba(${PR},${PG},${PB},${accent ? 0.22 : 0.14})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19 }}>{emoji}</div>
  );

  if (section === "instructions") return (
    <BottomSheet>
      {backBtn}
      <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700, fontSize: 22, color: "rgba(255,238,248,0.95)", marginBottom: 22, textAlign: "center" }}>{instr.title}</div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {instr.steps.map((step, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "flex-start", gap: 14,
            padding: "0 0 0 4px",
            animation: `fadeIn .40s ease ${i * 55}ms both`,
          }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0, flexShrink: 0, paddingTop: 2 }}>
              <div style={{
                width: 36, height: 36, borderRadius: "50%",
                background: `rgba(${PR},${PG},${PB},0.12)`,
                border: `1.5px solid rgba(${PR},${PG},${PB},0.32)`,
                boxShadow: `0 0 12px rgba(${PR},${PG},${PB},0.18)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 17, flexShrink: 0,
              }}>{step.icon}</div>
              {i < instr.steps.length - 1 && (
                <div style={{ width: 1.5, height: 20, background: `linear-gradient(to bottom,rgba(${PR},${PG},${PB},0.28),transparent)`, marginTop: 4 }} />
              )}
            </div>
            <div style={{ flex: 1, paddingBottom: 10 }}>
              <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700, fontSize: 14, color: "rgba(255,238,248,0.92)", marginBottom: 4 }}>
                {step.head}
              </div>
              <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, color: "rgba(255,238,248,0.48)", lineHeight: 1.55 }}>
                {step.body}
              </div>
            </div>
          </div>
        ))}
      </div>
    </BottomSheet>
  );

  if (section === "subscription") return (
    <BottomSheet>
      {backBtn}
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill={`rgba(${PR},${PG},${PB},0.25)`} stroke={PINK} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ filter: PINK_GLOW }}>
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
        </div>
        <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700, fontSize: 22, color: "rgba(255,238,248,0.95)", marginBottom: 8 }}>{sub.title}</div>
        <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700, fontSize: 20, color: PINK, marginBottom: 4 }}>{sub.price}</div>
        <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, color: "rgba(255,238,248,0.32)" }}>{sub.note}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 9, marginBottom: 20 }}>
        {sub.features.map((f, i) => (
          <div key={i} style={{
            padding: "12px 15px", borderRadius: 14,
            background: `rgba(${PR},${PG},${PB},0.06)`, border: `1px solid rgba(${PR},${PG},${PB},0.16)`,
            fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, color: "rgba(255,238,248,0.80)", lineHeight: 1.4,
            animation: `fadeIn .40s ease ${i * 55}ms both`,
          }}>{f}</div>
        ))}
      </div>
      <button style={{
        width: "100%", padding: "17px", borderRadius: 18, border: "none",
        background: `linear-gradient(135deg,rgba(${PR},${PG},${PB},0.95),rgba(150,20,80,0.90))`,
        color: "rgba(255,238,248,0.97)",
        fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700, fontSize: 16,
        cursor: "pointer", boxShadow: `0 4px 24px rgba(${PR},${PG},${PB},0.45)`,
      }}>{sub.cta}</button>
    </BottomSheet>
  );

  return (
    <BottomSheet>
      {/* ── Hero banner ── */}
      <div style={{
        width: "calc(100% + 48px)", margin: "-4px -24px 18px",
        height: 140, position: "relative", overflow: "hidden",
        borderRadius: "20px 20px 0 0",
        backgroundImage: "url('/images/menu-hero.png')",
        backgroundSize: "cover", backgroundPosition: "center top",
      }}>
        <div style={{ position: "absolute", inset: 0, background: `linear-gradient(to bottom, rgba(13,6,16,0.05) 0%, rgba(13,6,16,0.55) 55%, rgba(17,7,16,0.97) 100%)` }} />
        <div style={{ position: "absolute", bottom: 14, left: 20 }}>
          <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 24, color: "rgba(255,238,248,0.97)", letterSpacing: "-0.03em", textShadow: `0 0 24px rgba(${PR},${PG},${PB},0.55)` }}>Touché</div>
          <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 300, fontSize: 10, color: `rgba(${PR},${PG},${PB},0.65)`, letterSpacing: "0.22em", textTransform: "uppercase", marginTop: 2 }}>18+</div>
        </div>
      </div>

      {/* ── Two big visual cards: Instructions + Premium ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
        <button onClick={() => setSection("instructions")} style={{
          position: "relative", height: 130, borderRadius: 20, overflow: "hidden",
          border: `1px solid rgba(${PR},${PG},${PB},0.22)`, cursor: "pointer", padding: 0, background: "none",
          backgroundImage: "url('/images/menu-about.png')", backgroundSize: "cover", backgroundPosition: "center",
        }}>
          <div style={{ position: "absolute", inset: 0, background: `linear-gradient(145deg, rgba(13,6,16,0.15) 0%, rgba(13,6,16,0.72) 100%)` }} />
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "12px 14px", textAlign: "left" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={PINK} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" style={{ filter: PINK_GLOW, display: "block", marginBottom: 6 }}>
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
            </svg>
            <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700, fontSize: 13, color: "rgba(255,238,248,0.95)", lineHeight: 1.2 }}>{ml.instructions}</div>
          </div>
        </button>

        <button onClick={() => setSection("subscription")} style={{
          position: "relative", height: 130, borderRadius: 20, overflow: "hidden",
          border: `1.5px solid rgba(${PR},${PG},${PB},0.42)`, cursor: "pointer", padding: 0, background: "none",
          backgroundImage: "url('/images/menu-premium.png')", backgroundSize: "cover", backgroundPosition: "center",
          boxShadow: `0 0 22px rgba(${PR},${PG},${PB},0.18)`,
        }}>
          <div style={{ position: "absolute", inset: 0, background: `linear-gradient(145deg, rgba(${PR},${PG},${PB},0.12) 0%, rgba(13,6,16,0.68) 100%)` }} />
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "12px 14px", textAlign: "left" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill={`rgba(${PR},${PG},${PB},0.30)`} stroke={PINK} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ filter: PINK_GLOW, display: "block", marginBottom: 6 }}>
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
            <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700, fontSize: 13, color: "rgba(255,238,248,0.95)", lineHeight: 1.2 }}>{ml.subscription}</div>
            <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 600, fontSize: 10, color: `rgba(${PR},${PG},${PB},0.80)`, marginTop: 3, letterSpacing: "0.04em" }}>
              {lang === "ru" ? "199 Stars / мес" : "199 Stars / mo"}
            </div>
          </div>
        </button>
      </div>

      {/* ── Gender selector ── */}
      <div style={{
        padding: "12px 16px", borderRadius: 16, marginBottom: 8,
        background: `rgba(${PR},${PG},${PB},0.06)`, border: `1px solid rgba(${PR},${PG},${PB},0.16)`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 600, fontSize: 14, color: "rgba(255,238,248,0.65)" }}>{ml.gender}</span>
        <div style={{ display: "flex", gap: 7 }}>
          {(["male", "female"] as Gender[]).map((g) => {
            const active = gender === g;
            return (
              <button key={g} onClick={() => onGenderSwitch?.(g)} style={{
                padding: "6px 16px", borderRadius: 20,
                border: `1.5px solid rgba(${PR},${PG},${PB},${active ? 0.75 : 0.22})`,
                background: active ? `rgba(${PR},${PG},${PB},0.22)` : "transparent",
                color: active ? "rgba(255,238,248,0.97)" : "rgba(255,238,248,0.35)",
                fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: active ? 700 : 400, fontSize: 13,
                cursor: "pointer", transition: "all .2s",
                boxShadow: active ? `0 0 12px rgba(${PR},${PG},${PB},0.32)` : "none",
              }}>
                {g === "male" ? ml.genderM : ml.genderF}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Bottom mini-grid: Language + About ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
        <button onClick={() => { onLangSwitch(); onClose(); }} style={{
          padding: "14px 10px", borderRadius: 16,
          border: `1px solid rgba(${PR},${PG},${PB},0.16)`,
          background: `rgba(${PR},${PG},${PB},0.06)`, cursor: "pointer",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={PINK} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" style={{ filter: PINK_GLOW }}>
            <circle cx="12" cy="12" r="10"/>
            <line x1="2" y1="12" x2="22" y2="12"/>
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
          </svg>
          <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 600, fontSize: 12, color: "rgba(255,238,248,0.75)" }}>{ml.language}</span>
          <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700, fontSize: 11, color: `rgba(${PR},${PG},${PB},0.80)`, letterSpacing: "0.10em" }}>{LANG_ABBREV[lang]}</span>
        </button>

        <button onClick={onClose} style={{
          padding: "14px 10px", borderRadius: 16,
          border: `1px solid rgba(${PR},${PG},${PB},0.16)`,
          background: `rgba(${PR},${PG},${PB},0.06)`, cursor: "pointer",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={PINK} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" style={{ filter: PINK_GLOW }}>
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 600, fontSize: 12, color: "rgba(255,238,248,0.75)" }}>{ml.about}</span>
          <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 10, color: "rgba(255,238,248,0.28)", letterSpacing: "0.06em" }}>v1.0</span>
        </button>
      </div>

      <button onClick={onClose} style={{
        width: "100%", padding: "13px", borderRadius: 16,
        border: "1px solid rgba(255,238,248,0.07)", background: "rgba(255,238,248,0.03)",
        color: "rgba(255,238,248,0.28)", fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 500, fontSize: 14, cursor: "pointer",
      }}>
        {lang === "ru" ? "Закрыть" : "Close"}
      </button>
    </BottomSheet>
  );
}

/* ─── Home ─────────────────────────────────────────────────────── */
export default function Home({
  lang, gender, coupleId, pendingRefUserId,
  onCategorySelect, onScenarioOpen, onLangSwitch, onGenderSwitch,
  onLinkCouple, onUnlinkCouple,
}: HomeProps) {
  const t = UI[lang];
  const [mounted, setMounted] = useState(false);
  const [vh, setVh] = useState<number | null>(null);
  const [showCoupleModal, setShowCoupleModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [intimacyKey, setIntimacyKey] = useState(0);
  const [showScenarioGate, setShowScenarioGate] = useState(false);
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
    requestAnimationFrame(() => setMounted(true));
    function onIntimacyUpdate() { setIntimacyKey(k => k+1); }
    window.addEventListener("touche-intimacy-updated", onIntimacyUpdate);
    return () => {
      tg?.offEvent?.("viewportChanged", updateVh);
      clearTimeout(tm);
      window.removeEventListener("touche-intimacy-updated", onIntimacyUpdate);
    };
  }, []);

  useEffect(() => {
    if (pendingRefUserId && !coupleId) setShowCoupleModal(true);
  }, [pendingRefUserId, coupleId]);

  const handleInvite = useCallback(() => {
    const tg = window.Telegram?.WebApp;
    tg?.HapticFeedback?.impactOccurred("light");
    const link = "https://t.me/ToucheCoupleBot/Touche";
    const msg = INVITE_MSG[lang];
    tg?.openTelegramLink?.(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(msg)}`);
  }, [lang]);

  const handleScenarioClick = useCallback(() => {
    if (!coupleId) { setShowScenarioGate(true); return; }
    onScenarioOpen();
  }, [coupleId, onScenarioOpen]);

  const anyModal = showCoupleModal || showMenu || showScenarioGate;

  const catTitle: Record<Category, string> = {
    compliments: t.catCompliments, tenderness: t.catTenderness,
    desire: t.catDesire, passion: t.catPassion, hard: t.catHard,
  };
  const catSub: Record<Category, string> = {
    compliments: t.catComplimentsSub, tenderness: t.catTendernessSub,
    desire: t.catDesireSub, passion: t.catPassionSub, hard: t.catHardSub,
  };

  const nextLang = LANG_CYCLE[(LANG_CYCLE.indexOf(lang) + 1) % LANG_CYCLE.length];

  return (
    <>
      <style>{GLOBAL_STYLES}</style>

      <div style={{
        position: "fixed", inset: 0, background: BG,
        display: "flex", flexDirection: "column",
        overflow: "hidden",
        height: vh ? `${vh}px` : "100dvh",
        opacity: mounted ? 1 : 0, transition: "opacity .30s ease",
        fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif",
      }}>
        <SmokeBackground />
        <div style={{ position: "absolute", top: -140, left: "50%", transform: "translateX(-50%)", width: 560, height: 500, borderRadius: "50%", background: `radial-gradient(circle,rgba(${PR},${PG},${PB},0.08) 0%,transparent 68%)`, pointerEvents: "none", zIndex: 0 }} />

        {/* ── Header ── */}
        <div style={{ paddingTop: topPx, paddingLeft: 20, paddingRight: 20, paddingBottom: 4, display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative", zIndex: 1, flexShrink: 0 }}>
          {/* Hamburger */}
          <button onClick={() => { setShowMenu(true); window.Telegram?.WebApp?.HapticFeedback?.impactOccurred("light"); }} style={{ width: 38, height: 38, borderRadius: 12, background: "rgba(255,238,248,0.05)", border: `1px solid rgba(${PR},${PG},${PB},0.22)`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4.5, cursor: "pointer", flexShrink: 0, padding: 0, animation: "menuBtnPulse 4s ease-in-out 2s infinite" }}>
            {[0,1,2].map(i => <div key={i} style={{ width: i===1?12:16, height: 1.5, borderRadius: 99, background: `rgba(${PR},${PG},${PB},0.80)` }} />)}
          </button>

          {/* Logo */}
          <div style={{ fontFamily: "'Dancing Script','Pacifico',cursive", fontSize: 33, fontWeight: 600, color: PINK, lineHeight: 1.1, textShadow: `0 0 20px rgba(${PR},${PG},${PB},0.75),0 0 50px rgba(${PR},${PG},${PB},0.30)`, userSelect: "none", position: "absolute", left: "50%", transform: "translateX(-50%)" }}>
            Touché
          </div>

          {/* Right controls */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {/* Couple badge */}
            <button onClick={() => { setShowCoupleModal(true); window.Telegram?.WebApp?.HapticFeedback?.impactOccurred("light"); }} style={{
              background: coupleId ? "rgba(255,238,248,0.05)" : "rgba(255,238,248,0.03)",
              border: `1px solid rgba(${PR},${PG},${PB},${coupleId ? 0.38 : 0.22})`,
              borderRadius: 20, padding: "5px 10px",
              display: "flex", alignItems: "center", gap: 5,
              boxShadow: coupleId ? `0 0 10px rgba(${PR},${PG},${PB},0.15)` : "none",
              cursor: "pointer",
            }}>
              <CoupleIcon opacity={coupleId ? 0.85 : 0.38} />
              {coupleId && (
                <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 500, fontSize: 11, color: `rgba(${PR},${PG},${PB},0.75)` }}>
                  {t.linked}
                </span>
              )}
            </button>

            {/* Lang switcher */}
            <button onClick={onLangSwitch} style={{ background: "rgba(255,238,248,.06)", border: "1px solid rgba(255,238,248,.10)", borderRadius: 14, padding: "7px 10px", fontWeight: 500, fontSize: 10, letterSpacing: "0.10em", textTransform: "uppercase" as const, color: "rgba(255,238,248,0.44)", cursor: "pointer", fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif" }}>
              {LANG_ABBREV[nextLang]}
            </button>
          </div>
        </div>

        {/* ── List ── */}
        <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: `10px 14px max(28px,env(safe-area-inset-bottom))`, display: "flex", flexDirection: "column", gap: 10, position: "relative", zIndex: 1, scrollbarWidth: "none" as const }}>
          <IntimacyIndex lang={lang} refreshKey={intimacyKey} index={0}>
            <Card
              type="tenderness"
              title={lang === "ru" ? "Нежность" : lang === "hi" ? "कोमलता" : lang === "pt" ? "Ternura" : lang === "es" ? "Ternura" : "Tenderness"}
              sub={lang === "ru" ? "тёплые слова · прикосновения" : "warm words · gentle touch"}
              onClick={() => onCategorySelect(Math.random() > 0.5 ? "compliments" : "tenderness")}
              index={0}
            />
            <Card
              type="desire"
              title={t.catDesire}
              sub={t.catDesireSub}
              onClick={() => onCategorySelect("desire")}
              index={1}
            />
            <Card
              type="passion"
              title={lang === "ru" ? "Страсть" : lang === "hi" ? "जुनून" : lang === "pt" ? "Paixão" : lang === "es" ? "Pasión" : "Passion"}
              sub={lang === "ru" ? "пикантно · откровенно · 18+" : "spicy · explicit · 18+"}
              onClick={() => onCategorySelect(Math.random() > 0.5 ? "passion" : "hard")}
              index={2}
            />
            <Card type="scenarios" title={SCENARIO_LABELS[lang].title} sub={SCENARIO_LABELS[lang].sub} onClick={handleScenarioClick} index={3} />
          </IntimacyIndex>
          <Card type="invite" title={INVITE_LABELS[lang].title} sub={INVITE_LABELS[lang].sub} onClick={handleInvite} index={5} />
        </div>
      </div>

      {/* ── Modals ── */}
      <Backdrop visible={anyModal} onClick={() => { setShowCoupleModal(false); setShowMenu(false); setShowScenarioGate(false); }} />

      {showCoupleModal && (
        <CoupleModal
          lang={lang}
          coupleId={coupleId}
          pendingRefUserId={pendingRefUserId}
          onLink={onLinkCouple}
          onUnlink={onUnlinkCouple}
          onClose={() => setShowCoupleModal(false)}
        />
      )}

      {showScenarioGate && (
        <ScenarioGate
          lang={lang}
          onConnect={() => { setShowScenarioGate(false); setShowCoupleModal(true); }}
          onSkip={() => { setShowScenarioGate(false); onScenarioOpen(); }}
        />
      )}

      {showMenu && (
        <MenuPanel lang={lang} gender={gender} onGenderSwitch={onGenderSwitch} onClose={() => setShowMenu(false)} onLangSwitch={() => { onLangSwitch(); setShowMenu(false); }} />
      )}
    </>
  );
}
