import { useEffect, useCallback, useState, useRef } from "react";
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
function removeCoupleId() {
  try { localStorage.removeItem("touche_couple_id"); } catch {}
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

/* ─── NeonIcon ─────────────────────────────────────────────────── */
function NeonIcon({ type }: { type: Category | "scenarios" | "invite" }) {
  const attrs = {
    width: 24, height: 24, viewBox: "0 0 24 24", fill: "none",
    stroke: PINK, strokeWidth: 1.55,
    strokeLinecap: "round" as const, strokeLinejoin: "round" as const,
    style: { filter: PINK_GLOW, display: "block" as const },
  };
  switch (type) {
    case "compliments":
      return <svg {...attrs}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>;
    case "tenderness":
      return <svg {...attrs}><path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"/><line x1="16" y1="8" x2="2" y2="22"/><line x1="17.5" y1="15" x2="9" y2="15"/></svg>;
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
          <path d="M5 11 C5 11 8 8.5 10.5 10 C11.5 10.6 12 11 12 11 C12 11 12.5 10.6 13.5 10 C16 8.5 19 11 19 11"/>
          <path d="M5 11 C5 11 7 16 10 16.5 C11 16.7 11.5 16.5 12 16.2 C12.5 16.5 13 16.7 14 16.5 C17 16 19 11 19 11"/>
          <path d="M9.5 11 C10.5 12.8 11.2 13.4 12 13.4 C12.8 13.4 13.5 12.8 14.5 11" strokeOpacity="0.65" strokeWidth="1.2"/>
          <path d="M8 10.5 C9 9.8 10.5 9.6 11.5 10.2" strokeOpacity="0.40" strokeWidth="1.0" fill="none"/>
        </svg>
      );
    case "hard":
      return (
        <svg {...attrs} viewBox="0 0 28 28">
          <circle cx="9" cy="14" r="4.2" strokeWidth="1.7"/>
          <circle cx="19" cy="14" r="4.2" strokeWidth="1.7"/>
          <path d="M13.2 14 L14.8 14" strokeWidth="2.2" strokeLinecap="round"/>
          <path d="M5.2 10.5 C5.2 10.5 5 7 9 7 C13 7 13 10.5 13 10.5" strokeWidth="1.55"/>
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
          <circle cx="8" cy="7" r="3" strokeWidth="1.5"/>
          <path d="M3 22 C3 17 5 15 8 15 C9 15 9.5 15.2 10 15.5" strokeWidth="1.5"/>
          <circle cx="20" cy="7" r="3" strokeWidth="1.5"/>
          <path d="M25 22 C25 17 23 15 20 15 C19 15 18.5 15.2 18 15.5" strokeWidth="1.5"/>
          <path d="M10 15.5 C11 16.2 12 17 14 17 C16 17 17 16.2 18 15.5" strokeWidth="1.6"/>
          <path d="M12.5 10.5 C12.5 10.5 11 9 12 8 C12.8 7.2 14 8.2 14 8.2 C14 8.2 15.2 7.2 16 8 C17 9 15.5 10.5 15.5 10.5 L14 12 Z"
            strokeWidth="1.2" fill={PINK} stroke={PINK} style={{ filter: PINK_GLOW }} fillOpacity="0.7"/>
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
          ? `0 0 28px rgba(${PR},${PG},${PB},0.38), 0 0 60px rgba(${PR},${PG},${PB},0.12), inset 0 1px 0 rgba(${PR},${PG},${PB},0.14)`
          : `0 0 14px rgba(${PR},${PG},${PB},0.20), 0 0 36px rgba(${PR},${PG},${PB},0.06), inset 0 1px 0 rgba(${PR},${PG},${PB},0.08)`,
        background: pressed ? `rgba(${PR},${PG},${PB},0.09)` : "rgba(16,7,12,0.97)",
        cursor: "pointer", textAlign: "left",
        position: "relative", overflow: "hidden", flexShrink: 0,
        opacity: visible ? 1 : 0,
        transform: visible ? (pressed ? "scale(0.982)" : "scale(1)") : "translateY(16px)",
        transition: visible
          ? "opacity .38s, transform .17s cubic-bezier(.32,.72,0,1), box-shadow .17s, border-color .17s, background .14s"
          : "opacity .42s, transform .44s cubic-bezier(.22,1,.36,1)",
      }}
    >
      <div style={{
        position: "absolute", top: 0, right: 0, bottom: 0, width: "52%",
        backgroundImage: `url(${CAT_IMG[type]})`,
        backgroundSize: "cover", backgroundPosition: "center right",
        opacity: pressed ? 0.62 : 0.48, transition: "opacity .17s",
      }} />
      <div style={{
        position: "absolute", inset: 0,
        background: `linear-gradient(90deg,rgba(16,7,12,1) 0%,rgba(16,7,12,0.97) 36%,rgba(16,7,12,0.82) 52%,rgba(16,7,12,0.32) 70%,rgba(16,7,12,0.08) 100%)`,
      }} />
      <div style={{ position: "absolute", inset: 0, background: `linear-gradient(130deg,rgba(${PR},${PG},${PB},0.06) 0%,transparent 50%)` }} />
      <div style={{ position: "absolute", top: 0, left: "6%", right: "6%", height: 1, background: `linear-gradient(90deg,transparent,rgba(${PR},${PG},${PB},0.75),transparent)` }} />
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: `linear-gradient(180deg,rgba(${PR},${PG},${PB},0.95),rgba(${PR},${PG},${PB},0.18))`, borderRadius: "20px 0 0 20px" }} />

      <div style={{ position: "relative", zIndex: 2, display: "flex", alignItems: "center", width: "100%", padding: "0 15px 0 18px", gap: 13 }}>
        {/* Animated icon circle */}
        <div className="icon-ring" style={{
          width: 52, height: 52, borderRadius: "50%", flexShrink: 0,
          border: `1px solid rgba(${PR},${PG},${PB},0.42)`,
          background: `radial-gradient(circle at 36% 30%, rgba(${PR},${PG},${PB},0.26), rgba(${PR},${PG},${PB},0.08) 60%, transparent)`,
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
function CoupleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 32 32" fill="none" style={{ filter: `drop-shadow(0 0 4px rgba(${PR},${PG},${PB},0.80))`, display: "block" }}>
      <path d="M10 7 C10 7 7 4 4.5 5.5 C2 7 2 10.5 4 12.5 L10 18 L16 12.5 C18 10.5 18 7 15.5 5.5 C13 4 10 7 10 7 Z" fill={`rgba(${PR},${PG},${PB},0.85)`}/>
      <path d="M22 7 C22 7 19 4 16.5 5.5 C14 7 14 10.5 16 12.5 L22 18 L28 12.5 C30 10.5 30 7 27.5 5.5 C25 4 22 7 22 7 Z" fill={`rgba(${PR},${PG},${PB},0.50)`}/>
      <path d="M7 8 C7 8 5 7.5 4.5 9" stroke="rgba(255,200,230,0.50)" strokeWidth="1.2" strokeLinecap="round" fill="none"/>
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

/* ─── Labels & translations ────────────────────────────────────── */
const LANG_ABBREV: Record<Lang, string> = { ru: "RU", en: "EN", hi: "HI", pt: "PT", es: "ES" };

const SCENARIO_LABELS: Record<Lang, { title: string; sub: string }> = {
  ru: { title: "Сценарии",   sub: "Ролевые игры и фантазии"    },
  en: { title: "Scenarios",  sub: "Roleplay · for two"          },
  hi: { title: "परिदृश्य",    sub: "रोलप्ले · दो के लिए"        },
  pt: { title: "Cenários",   sub: "Roleplay · para dois"        },
  es: { title: "Escenarios", sub: "Roleplay · para dos"         },
};

const INVITE_LABELS: Record<Lang, { title: string; sub: string }> = {
  ru: { title: "Пригласи друга",       sub: "Пригласи кого-то на этот вечер"   },
  en: { title: "Invite a friend",      sub: "Share the app for an evening"      },
  hi: { title: "मित्र को आमंत्रित करें", sub: "इस शाम के लिए किसी को बुलाएं"   },
  pt: { title: "Convidar amigo",       sub: "Compartilhe para uma noite a dois" },
  es: { title: "Invitar amigo",        sub: "Comparte la app para esta noche"   },
};

const INVITE_MSG: Record<Lang, string> = {
  ru: "Присоединяйся ко мне в Touché — вечер для двоих 💕",
  en: "Join me on Touché — an evening for two 💕",
  hi: "Touché पर मेरे साथ जुड़ें — दो के लिए एक शाम 💕",
  pt: "Junte-se a mim no Touché — uma noite para dois 💕",
  es: "Únete a mí en Touché — una noche para dos 💕",
};

/* ─── Menu content ─────────────────────────────────────────────── */
const INSTRUCTIONS: Record<Lang, { title: string; steps: string[] }> = {
  ru: {
    title: "Как играть",
    steps: [
      "🔗 Создайте пару — поделитесь ссылкой с партнёром через кнопку «Пригласи друга»",
      "💬 Выберите категорию — от нежных комплиментов до смелых игр на двоих",
      "✋ Удерживайте кнопку — ИИ сгенерирует уникальное задание специально для вас",
      "💕 Выполните задание вместе — и ваш вечер станет незабываемым",
      "🌙 Каждый день — новое задание. Premium открывает все категории и сценарии",
    ],
  },
  en: {
    title: "How to play",
    steps: [
      "🔗 Create a pair — share a link with your partner via 'Invite a friend'",
      "💬 Choose a category — from gentle compliments to bold games for two",
      "✋ Hold the button — AI generates a unique task just for you",
      "💕 Complete the task together — and your evening becomes unforgettable",
      "🌙 A new task every day. Premium unlocks all categories and scenarios",
    ],
  },
  hi: {
    title: "कैसे खेलें",
    steps: [
      "🔗 जोड़ी बनाएं — 'मित्र को आमंत्रित करें' से लिंक शेयर करें",
      "💬 श्रेणी चुनें — कोमल तारीफ से लेकर साहसी खेल तक",
      "✋ बटन दबाए रखें — AI आपके लिए अनोखा कार्य बनाएगा",
      "💕 साथ मिलकर पूरा करें — शाम यादगार बन जाएगी",
      "🌙 हर दिन नया कार्य। Premium सभी श्रेणियां खोलता है",
    ],
  },
  pt: {
    title: "Como jogar",
    steps: [
      "🔗 Crie um casal — compartilhe o link pelo 'Convidar amigo'",
      "💬 Escolha uma categoria — de elogios gentis a jogos ousados",
      "✋ Segure o botão — a IA gera uma tarefa única para vocês",
      "💕 Cumpram juntos — e a noite será inesquecível",
      "🌙 Nova tarefa todo dia. Premium desbloqueia tudo",
    ],
  },
  es: {
    title: "Cómo jugar",
    steps: [
      "🔗 Crea una pareja — comparte el enlace con 'Invitar amigo'",
      "💬 Elige una categoría — desde piropos tiernos hasta juegos atrevidos",
      "✋ Mantén el botón — la IA genera una tarea única para ustedes",
      "💕 Complétala juntos — y la noche será inolvidable",
      "🌙 Tarea nueva cada día. Premium desbloquea todo",
    ],
  },
};

const SUBSCRIPTION: Record<Lang, { title: string; features: string[]; price: string; note: string; cta: string }> = {
  ru: {
    title: "Touché Premium",
    features: [
      "🔥 Категории «Страсть» и «Хард» — откровенные задания 18+",
      "🎭 ИИ-ролевые сценарии — уникальные истории для двоих",
      "♾️ Безлимитные задания каждый день во всех категориях",
      "⚡ Приоритетная генерация — задания быстрее",
      "💫 Эксклюзивные новые категории первыми",
    ],
    price: "199 Stars / месяц",
    note: "≈ 260 ₽ · отмена в любой момент",
    cta: "Подписаться — 199 ★",
  },
  en: {
    title: "Touché Premium",
    features: [
      "🔥 Passion & Hard categories — explicit 18+ tasks",
      "🎭 AI roleplay scenarios — unique stories for two",
      "♾️ Unlimited tasks every day in all categories",
      "⚡ Priority generation — tasks arrive faster",
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
      "🎭 AI रोलप्ले — दो के लिए अनोखी कहानियां",
      "♾️ हर दिन असीमित कार्य",
      "⚡ प्राथमिकता जनरेशन",
      "💫 नई एक्सक्लूसिव श्रेणियां पहले",
    ],
    price: "199 Stars / माह",
    note: "≈ ₹220 · कभी भी रद्द करें",
    cta: "सदस्यता लें — 199 ★",
  },
  pt: {
    title: "Touché Premium",
    features: [
      "🔥 Categorias Paixão e Intenso — tarefas 18+",
      "🎭 Cenários de roleplay com IA — histórias únicas",
      "♾️ Tarefas ilimitadas todo dia",
      "⚡ Geração prioritária",
      "💫 Novas categorias exclusivas primeiro",
    ],
    price: "199 Stars / mês",
    note: "≈ R$15 · cancele quando quiser",
    cta: "Assinar — 199 ★",
  },
  es: {
    title: "Touché Premium",
    features: [
      "🔥 Categorías Pasión e Intenso — tareas 18+",
      "🎭 Escenarios de roleplay con IA — historias únicas",
      "♾️ Tareas ilimitadas cada día",
      "⚡ Generación prioritaria",
      "💫 Nuevas categorías exclusivas primero",
    ],
    price: "199 Stars / mes",
    note: "≈ $2.60 · cancela cuando quieras",
    cta: "Suscribirse — 199 ★",
  },
};

const COUPLE_MODAL_LABELS: Record<Lang, { title: string; sub: string; unlink: string; unlinkConfirm: string; unlinkCancel: string; id: string }> = {
  ru: { title: "Ваша пара", sub: "Вы связаны с партнёром", unlink: "Отвязать пару", unlinkConfirm: "Да, отвязать", unlinkCancel: "Отмена", id: "ID пары" },
  en: { title: "Your pair", sub: "You are linked with a partner", unlink: "Unlink pair", unlinkConfirm: "Yes, unlink", unlinkCancel: "Cancel", id: "Pair ID" },
  hi: { title: "आपकी जोड़ी", sub: "आप साथी से जुड़े हैं", unlink: "जोड़ी हटाएं", unlinkConfirm: "हां, हटाएं", unlinkCancel: "रद्द करें", id: "जोड़ी ID" },
  pt: { title: "Seu casal", sub: "Você está conectado com um parceiro", unlink: "Desvincular casal", unlinkConfirm: "Sim, desvincular", unlinkCancel: "Cancelar", id: "ID do casal" },
  es: { title: "Tu pareja", sub: "Estás vinculado con tu pareja", unlink: "Desvincular pareja", unlinkConfirm: "Sí, desvincular", unlinkCancel: "Cancelar", id: "ID de la pareja" },
};

const MENU_LABELS: Record<Lang, { menu: string; instructions: string; subscription: string; language: string; share: string; about: string }> = {
  ru: { menu: "Меню", instructions: "Инструкция", subscription: "Premium", language: "Язык", share: "Поделиться", about: "О приложении" },
  en: { menu: "Menu", instructions: "How to play", subscription: "Premium", language: "Language", share: "Share", about: "About" },
  hi: { menu: "मेनू", instructions: "कैसे खेलें", subscription: "Premium", language: "भाषा", share: "साझा करें", about: "ऐप के बारे में" },
  pt: { menu: "Menu", instructions: "Como jogar", subscription: "Premium", language: "Idioma", share: "Compartilhar", about: "Sobre o app" },
  es: { menu: "Menú", instructions: "Cómo jugar", subscription: "Premium", language: "Idioma", share: "Compartir", about: "Sobre la app" },
};

/* ─── CoupleModal ──────────────────────────────────────────────── */
function CoupleModal({ lang, coupleId, onUnlink, onClose }: {
  lang: Lang; coupleId: string; onUnlink: () => void; onClose: () => void;
}) {
  const labels = COUPLE_MODAL_LABELS[lang];
  const [confirm, setConfirm] = useState(false);
  const maskedId = coupleId.slice(0, 4) + "···" + coupleId.slice(-4);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 60,
      display: "flex", alignItems: "flex-end", justifyContent: "center",
      pointerEvents: "none",
    }}>
      <div style={{
        pointerEvents: "auto",
        width: "100%", maxWidth: 480,
        background: "linear-gradient(160deg, #1a0814 0%, #110710 100%)",
        borderRadius: "24px 24px 0 0",
        border: `1px solid rgba(${PR},${PG},${PB},0.28)`,
        borderBottom: "none",
        boxShadow: `0 -8px 60px rgba(${PR},${PG},${PB},0.18), 0 -2px 20px rgba(0,0,0,0.6)`,
        padding: "28px 24px 40px",
        animation: "slideUp .32s cubic-bezier(.22,1,.36,1)",
      }}>
        {/* Handle */}
        <div style={{ width: 36, height: 4, borderRadius: 99, background: `rgba(${PR},${PG},${PB},0.30)`, margin: "0 auto 24px" }} />

        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>
            <CoupleIcon />
          </div>
          <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700, fontSize: 20, color: "rgba(255,238,248,0.95)", marginBottom: 6 }}>
            {labels.title}
          </div>
          <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, color: "rgba(255,238,248,0.40)" }}>
            {labels.sub}
          </div>
        </div>

        {/* Pair ID card */}
        <div style={{
          background: `rgba(${PR},${PG},${PB},0.07)`,
          border: `1px solid rgba(${PR},${PG},${PB},0.22)`,
          borderRadius: 16, padding: "14px 18px", marginBottom: 24,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, color: "rgba(255,238,248,0.38)", marginBottom: 4 }}>
            {labels.id}
          </div>
          <div style={{ fontFamily: "monospace", fontSize: 15, color: `rgba(${PR},${PG},${PB},0.90)`, letterSpacing: "0.05em" }}>
            {maskedId}
          </div>
        </div>

        {!confirm ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button onClick={() => setConfirm(true)} style={{
              width: "100%", padding: "15px", borderRadius: 16,
              border: `1px solid rgba(${PR},${PG},${PB},0.40)`,
              background: "rgba(220,36,118,0.08)",
              color: `rgba(${PR},${PG},${PB},0.85)`,
              fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 600, fontSize: 15,
              cursor: "pointer",
            }}>
              {labels.unlink}
            </button>
            <button onClick={onClose} style={{
              width: "100%", padding: "15px", borderRadius: 16,
              border: "1px solid rgba(255,238,248,0.08)",
              background: "rgba(255,238,248,0.04)",
              color: "rgba(255,238,248,0.40)",
              fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 500, fontSize: 15,
              cursor: "pointer",
            }}>
              {labels.unlinkCancel}
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", textAlign: "center", fontSize: 13, color: "rgba(255,238,248,0.50)", marginBottom: 4 }}>
              {lang === "ru" ? "Это действие нельзя отменить" : "This action cannot be undone"}
            </div>
            <button onClick={onUnlink} style={{
              width: "100%", padding: "15px", borderRadius: 16,
              border: `1px solid rgba(${PR},${PG},${PB},0.55)`,
              background: `rgba(${PR},${PG},${PB},0.18)`,
              color: `rgb(${PR},${PG},${PB})`,
              fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700, fontSize: 15,
              cursor: "pointer",
            }}>
              {labels.unlinkConfirm}
            </button>
            <button onClick={() => setConfirm(false)} style={{
              width: "100%", padding: "15px", borderRadius: 16,
              border: "1px solid rgba(255,238,248,0.08)",
              background: "rgba(255,238,248,0.04)",
              color: "rgba(255,238,248,0.40)",
              fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 500, fontSize: 15,
              cursor: "pointer",
            }}>
              {labels.unlinkCancel}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── MenuPanel ────────────────────────────────────────────────── */
type MenuSection = "main" | "instructions" | "subscription";

function MenuPanel({ lang, onClose, onLangSwitch }: { lang: Lang; onClose: () => void; onLangSwitch: () => void }) {
  const [section, setSection] = useState<MenuSection>("main");
  const ml = MENU_LABELS[lang];
  const instr = INSTRUCTIONS[lang];
  const sub = SUBSCRIPTION[lang];

  const panelStyle: React.CSSProperties = {
    pointerEvents: "auto",
    width: "100%", maxWidth: 480,
    background: "linear-gradient(160deg, #1a0814 0%, #110710 100%)",
    borderRadius: "24px 24px 0 0",
    border: `1px solid rgba(${PR},${PG},${PB},0.28)`,
    borderBottom: "none",
    boxShadow: `0 -8px 60px rgba(${PR},${PG},${PB},0.18), 0 -2px 20px rgba(0,0,0,0.6)`,
    padding: "28px 24px 44px",
    maxHeight: "80vh", overflowY: "auto",
    scrollbarWidth: "none",
    animation: "slideUp .32s cubic-bezier(.22,1,.36,1)",
  };

  const sectionRowStyle: React.CSSProperties = {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "16px 18px", borderRadius: 16,
    border: `1px solid rgba(${PR},${PG},${PB},0.18)`,
    background: `rgba(${PR},${PG},${PB},0.05)`,
    cursor: "pointer", marginBottom: 10,
    transition: "background .15s, border-color .15s",
  };

  const sectionLabelStyle: React.CSSProperties = {
    fontFamily: "'Plus Jakarta Sans',sans-serif",
    fontWeight: 600, fontSize: 16,
    color: "rgba(255,238,248,0.90)",
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "flex-end", justifyContent: "center", pointerEvents: "none" }}>
      <div style={panelStyle}>
        {/* Handle */}
        <div style={{ width: 36, height: 4, borderRadius: 99, background: `rgba(${PR},${PG},${PB},0.30)`, margin: "0 auto 22px" }} />

        {section === "main" && (
          <>
            <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700, fontSize: 20, color: "rgba(255,238,248,0.95)", marginBottom: 22, textAlign: "center" }}>
              {ml.menu}
            </div>

            {/* Instructions */}
            <button style={sectionRowStyle} onClick={() => setSection("instructions")}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 12,
                  background: `rgba(${PR},${PG},${PB},0.14)`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 18,
                }}>📖</div>
                <span style={sectionLabelStyle}>{ml.instructions}</span>
              </div>
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={PINK} strokeOpacity={0.55} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>

            {/* Subscription */}
            <button style={{ ...sectionRowStyle, background: `rgba(${PR},${PG},${PB},0.10)`, borderColor: `rgba(${PR},${PG},${PB},0.32)` }} onClick={() => setSection("subscription")}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: `rgba(${PR},${PG},${PB},0.20)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>⭐</div>
                <div>
                  <div style={sectionLabelStyle}>{ml.subscription}</div>
                  <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: `rgba(${PR},${PG},${PB},0.70)`, marginTop: 2 }}>
                    {lang === "ru" ? "199 Stars / месяц" : "199 Stars / month"}
                  </div>
                </div>
              </div>
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={PINK} strokeOpacity={0.55} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>

            {/* Language switch */}
            <button style={sectionRowStyle} onClick={() => { onLangSwitch(); onClose(); }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: `rgba(${PR},${PG},${PB},0.14)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🌐</div>
                <span style={sectionLabelStyle}>{ml.language}</span>
              </div>
              <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, fontWeight: 600, color: `rgba(${PR},${PG},${PB},0.70)`, letterSpacing: "0.08em" }}>
                {LANG_ABBREV[lang]}
              </div>
            </button>

            {/* About */}
            <button style={sectionRowStyle} onClick={onClose}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: `rgba(${PR},${PG},${PB},0.14)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>💜</div>
                <div>
                  <div style={sectionLabelStyle}>{ml.about}</div>
                  <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 11, color: "rgba(255,238,248,0.32)", marginTop: 2 }}>Touché v1.0 · 18+</div>
                </div>
              </div>
            </button>

            <button onClick={onClose} style={{ width: "100%", padding: "14px", borderRadius: 16, border: "1px solid rgba(255,238,248,0.08)", background: "rgba(255,238,248,0.03)", color: "rgba(255,238,248,0.35)", fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 500, fontSize: 14, cursor: "pointer", marginTop: 4 }}>
              {lang === "ru" ? "Закрыть" : "Close"}
            </button>
          </>
        )}

        {section === "instructions" && (
          <>
            <button onClick={() => setSection("main")} style={{ background: "none", border: "none", color: `rgba(${PR},${PG},${PB},0.75)`, fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, cursor: "pointer", padding: "0 0 16px", display: "flex", alignItems: "center", gap: 6 }}>
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              {lang === "ru" ? "Назад" : "Back"}
            </button>
            <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700, fontSize: 22, color: "rgba(255,238,248,0.95)", marginBottom: 22, textAlign: "center" }}>
              {instr.title}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {instr.steps.map((step, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "flex-start", gap: 14,
                  padding: "14px 16px", borderRadius: 16,
                  background: `rgba(${PR},${PG},${PB},0.05)`,
                  border: `1px solid rgba(${PR},${PG},${PB},0.14)`,
                  animation: `iconEntrance .45s cubic-bezier(.34,1.56,.64,1) ${i * 60}ms both`,
                }}>
                  <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, color: "rgba(255,238,248,0.80)", lineHeight: 1.5 }}>
                    {step}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {section === "subscription" && (
          <>
            <button onClick={() => setSection("main")} style={{ background: "none", border: "none", color: `rgba(${PR},${PG},${PB},0.75)`, fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14, cursor: "pointer", padding: "0 0 16px", display: "flex", alignItems: "center", gap: 6 }}>
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              {lang === "ru" ? "Назад" : "Back"}
            </button>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>⭐</div>
              <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700, fontSize: 22, color: "rgba(255,238,248,0.95)", marginBottom: 8 }}>
                {sub.title}
              </div>
              <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700, fontSize: 20, color: `rgb(${PR},${PG},${PB})`, marginBottom: 4 }}>
                {sub.price}
              </div>
              <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12, color: "rgba(255,238,248,0.35)" }}>
                {sub.note}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
              {sub.features.map((f, i) => (
                <div key={i} style={{
                  padding: "12px 16px", borderRadius: 14,
                  background: `rgba(${PR},${PG},${PB},0.06)`,
                  border: `1px solid rgba(${PR},${PG},${PB},0.16)`,
                  fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 14,
                  color: "rgba(255,238,248,0.80)", lineHeight: 1.4,
                  animation: `iconEntrance .45s cubic-bezier(.34,1.56,.64,1) ${i * 60}ms both`,
                }}>
                  {f}
                </div>
              ))}
            </div>
            <button style={{
              width: "100%", padding: "17px", borderRadius: 18,
              border: "none",
              background: `linear-gradient(135deg, rgba(${PR},${PG},${PB},0.95), rgba(150,20,80,0.90))`,
              color: "rgba(255,238,248,0.97)",
              fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 700, fontSize: 16,
              cursor: "pointer",
              boxShadow: `0 4px 24px rgba(${PR},${PG},${PB},0.45)`,
              letterSpacing: "-0.2px",
            }}>
              {sub.cta}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Global styles ────────────────────────────────────────────── */
const GLOBAL_STYLES = `
  @keyframes neonPulse {
    0%, 100% {
      box-shadow: 0 0 16px rgba(${PR},${PG},${PB},0.22), inset 0 1px 0 rgba(${PR},${PG},${PB},0.15);
    }
    50% {
      box-shadow: 0 0 26px rgba(${PR},${PG},${PB},0.55), 0 0 44px rgba(${PR},${PG},${PB},0.18), inset 0 1px 0 rgba(${PR},${PG},${PB},0.22);
    }
  }
  @keyframes iconEntrance {
    from { opacity: 0; transform: scale(0.55) translateY(8px); }
    to   { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes slideUp {
    from { transform: translateY(100%); opacity: 0.4; }
    to   { transform: translateY(0);    opacity: 1; }
  }
  @keyframes menuBtnPulse {
    0%, 100% { box-shadow: 0 0 0px rgba(${PR},${PG},${PB},0); }
    60%       { box-shadow: 0 0 12px rgba(${PR},${PG},${PB},0.35); }
  }
`;

/* ─── Home ─────────────────────────────────────────────────────── */
export default function Home({ lang, onCategorySelect, onScenarioOpen, onLangSwitch }: HomeProps) {
  const t = UI[lang];
  const [mounted, setMounted] = useState(false);
  const [vh, setVh] = useState<number | null>(null);
  const [coupleId, setCoupleId] = useState<string | null>(null);
  const [showCoupleModal, setShowCoupleModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
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
    setCoupleId(getCoupleId());
    requestAnimationFrame(() => setMounted(true));
    return () => { tg?.offEvent?.("viewportChanged", updateVh); clearTimeout(tm); };
  }, []);

  const handleInvite = useCallback(() => {
    const tg = window.Telegram?.WebApp;
    const uid = tg?.initDataUnsafe?.user?.id;
    tg?.HapticFeedback?.impactOccurred("light");
    if (tg?.openTelegramLink) {
      const link = uid ? `https://t.me/ToucheGameBot/Touche?startapp=ref_${uid}` : `https://t.me/ToucheGameBot/Touche`;
      const msg = INVITE_MSG[lang];
      tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(msg)}`);
    }
  }, [lang]);

  const handleUnlink = useCallback(() => {
    removeCoupleId();
    setCoupleId(null);
    setShowCoupleModal(false);
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred("medium");
  }, []);

  const anyModalOpen = showCoupleModal || showMenu;

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
        {/* Ambient top glow */}
        <div style={{
          position: "absolute", top: -140, left: "50%", transform: "translateX(-50%)",
          width: 560, height: 500, borderRadius: "50%",
          background: `radial-gradient(circle,rgba(${PR},${PG},${PB},0.08) 0%,transparent 68%)`,
          pointerEvents: "none", zIndex: 0,
        }} />

        {/* ── Header ───────────────────────────────────────────────── */}
        <div style={{
          paddingTop: topPx, paddingLeft: 20, paddingRight: 20, paddingBottom: 4,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          position: "relative", zIndex: 1, flexShrink: 0,
        }}>
          {/* Menu button */}
          <button
            onClick={() => { setShowMenu(true); window.Telegram?.WebApp?.HapticFeedback?.impactOccurred("light"); }}
            style={{
              width: 38, height: 38, borderRadius: 12,
              background: "rgba(255,238,248,0.05)",
              border: `1px solid rgba(${PR},${PG},${PB},0.22)`,
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              gap: 4.5, cursor: "pointer", flexShrink: 0, padding: 0,
              animation: "menuBtnPulse 4s ease-in-out 2s infinite",
            }}
          >
            {[0,1,2].map(i => (
              <div key={i} style={{
                width: i === 1 ? 12 : 16, height: 1.5, borderRadius: 99,
                background: `rgba(${PR},${PG},${PB},0.80)`,
                transition: "width .2s",
              }} />
            ))}
          </button>

          {/* Logo */}
          <div style={{
            fontFamily: "'Dancing Script','Pacifico',cursive",
            fontSize: 33, fontWeight: 600, color: PINK, lineHeight: 1.1,
            textShadow: `0 0 20px rgba(${PR},${PG},${PB},0.75),0 0 50px rgba(${PR},${PG},${PB},0.30)`,
            userSelect: "none",
            position: "absolute", left: "50%", transform: "translateX(-50%)",
          }}>
            Touché
          </div>

          {/* Right controls */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {coupleId && (
              <button
                onClick={() => { setShowCoupleModal(true); window.Telegram?.WebApp?.HapticFeedback?.impactOccurred("light"); }}
                style={{
                  background: "rgba(255,238,248,0.05)",
                  border: `1px solid rgba(${PR},${PG},${PB},0.28)`,
                  borderRadius: 20, padding: "5px 12px",
                  fontSize: 12, color: `rgba(${PR},${PG},${PB},0.80)`,
                  display: "flex", alignItems: "center", gap: 6,
                  boxShadow: `0 0 10px rgba(${PR},${PG},${PB},0.12)`,
                  cursor: "pointer",
                  fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 500,
                }}
              >
                <CoupleIcon />
                {t.linked}
              </button>
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

        {/* ── Card list ─────────────────────────────────────────────── */}
        <div style={{
          flex: 1, overflowY: "auto", overflowX: "hidden",
          padding: `10px 14px max(28px,env(safe-area-inset-bottom))`,
          display: "flex", flexDirection: "column", gap: 10,
          position: "relative", zIndex: 1,
          scrollbarWidth: "none" as const,
        }}>
          {CATEGORIES_ORDER.map((cat, i) => (
            <Card key={cat} type={cat} title={catTitle[cat]} sub={catSub[cat]}
              onClick={() => onCategorySelect(cat)} index={i} />
          ))}
          <Card type="scenarios" title={SCENARIO_LABELS[lang].title} sub={SCENARIO_LABELS[lang].sub}
            onClick={onScenarioOpen} index={CATEGORIES_ORDER.length} />
          <Card type="invite" title={INVITE_LABELS[lang].title} sub={INVITE_LABELS[lang].sub}
            onClick={handleInvite} index={CATEGORIES_ORDER.length + 1} />
        </div>
      </div>

      {/* ── Modals ───────────────────────────────────────────────────── */}
      <Backdrop visible={anyModalOpen} onClick={() => { setShowCoupleModal(false); setShowMenu(false); }} />

      {showCoupleModal && coupleId && (
        <CoupleModal lang={lang} coupleId={coupleId} onUnlink={handleUnlink} onClose={() => setShowCoupleModal(false)} />
      )}

      {showMenu && (
        <MenuPanel lang={lang} onClose={() => setShowMenu(false)} onLangSwitch={() => { onLangSwitch(); setShowMenu(false); }} />
      )}
    </>
  );
}
