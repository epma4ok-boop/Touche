import { useState, useCallback, useEffect, useRef } from "react";
import { type Lang } from "@/data/i18n";
import { BOT_USERNAME } from "@/config";
import { SCENARIOS, type Scenario } from "@/data/scenarios";

const BG = "#0d0610";
const TEXT_P = "rgba(255,238,248,0.88)";
const TEXT_S = "rgba(255,238,248,0.44)";

const COUPLE_KEY   = "touche_couple_id";
const PENDING_KEY  = "touche_pending_scenario";

function getCoupleId() { try { return localStorage.getItem(COUPLE_KEY); } catch { return null; } }

interface ScenarioScreenProps { lang: Lang; onBack: () => void; }

type Phase = "idle" | "role_a" | "no_partner";

const T = {
  en: {
    title:        "Scenarios",
    sub:          "roleplay · for two",
    holdHint:     "HOLD · DRAW YOUR SCENARIO",
    holding:      "DRAWING...",
    back:         "← back",
    noPartner:    "No partner linked yet",
    noPartnerSub: "Invite your partner first so you both share the same scenario tonight.",
    invite:       "Invite partner",
    yourRole:     "YOUR ROLE",
    partnerSent:  "Your partner's card has been sent",
    partnerWait:  "They'll receive it when they next open the app",
    dismiss:      "Got it",
    intensity: { romantic: "romantic", passion: "passion", hard: "hard · 18+" } as Record<string, string>,
  },
  ru: {
    title:        "Сценарии",
    sub:          "ролевые · на двоих",
    holdHint:     "ДЕРЖИ · ВЫТЯНИ СЦЕНАРИЙ",
    holding:      "ТЯНЕМ...",
    back:         "← назад",
    noPartner:    "Партнёр ещё не подключён",
    noPartnerSub: "Сначала пригласи партнёра — чтобы сегодня у вас был один сценарий на двоих.",
    invite:       "Пригласить партнёра",
    yourRole:     "ТВОЯ РОЛЬ",
    partnerSent:  "Карточка партнёра отправлена",
    partnerWait:  "Он(а) получит её при следующем открытии приложения",
    dismiss:      "Понятно",
    intensity: { romantic: "романтика", passion: "страсть", hard: "хард · 18+" } as Record<string, string>,
  },
};

const INTENSITY_COLOR: Record<string, { r: number; g: number; b: number }> = {
  romantic: { r: 255, g: 155, b: 80 },
  passion:  { r: 200, g: 45,  b: 100 },
  hard:     { r: 130, g: 10,  b: 75 },
};

function NoPartner({ lang, onInvite, onBack }: { lang: Lang; onInvite: () => void; onBack: () => void }) {
  const t = T[lang];
  return (
    <div style={{ position: "fixed", inset: 0, background: BG, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 32px" }}>
      <button onClick={onBack} style={{ position: "absolute", top: 18, left: 20, background: "transparent", border: "none", cursor: "pointer", fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif", fontWeight: 400, fontSize: 14, color: TEXT_S }}>
        {t.back}
      </button>

      {/* Ambient */}
      <div style={{ position: "absolute", top: "20%", left: "50%", transform: "translateX(-50%)", width: "60vw", height: "30vw", borderRadius: "50%", background: "radial-gradient(ellipse,rgba(190,30,90,0.10) 0%,transparent 70%)", pointerEvents: "none" }} />

      <div style={{ textAlign: "center", position: "relative" }}>
        <div style={{ fontSize: 52, marginBottom: 20 }}>💑</div>
        <p style={{ fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif", fontWeight: 700, fontSize: 24, color: TEXT_P, letterSpacing: "-0.02em", margin: 0 }}>{t.noPartner}</p>
        <p style={{ fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif", fontWeight: 300, fontSize: 14, color: TEXT_S, lineHeight: 1.6, margin: "14px 0 36px" }}>{t.noPartnerSub}</p>
        <button onClick={onInvite} style={{ padding: "18px 36px", borderRadius: 18, background: "rgba(200,45,100,0.12)", border: "1px solid rgba(200,45,100,0.35)", cursor: "pointer", fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif", fontWeight: 600, fontSize: 17, color: "rgba(230,100,150,0.95)", letterSpacing: "-0.01em" }}>{t.invite}</button>
      </div>
    </div>
  );
}

function RoleCard({ scenario, lang, onDismiss }: { scenario: Scenario; lang: Lang; onDismiss: () => void }) {
  const t = T[lang];
  const [textVisible, setTextVisible] = useState(false);
  useEffect(() => { const tm = setTimeout(() => setTextVisible(true), 200); return () => clearTimeout(tm); }, []);
  const col = INTENSITY_COLOR[scenario.intensity];
  const { r, g, b } = col;
  const roleText   = lang === "en" ? scenario.role_a_en : scenario.role_a_ru;
  const titleText  = lang === "en" ? scenario.title_en  : scenario.title_ru;
  const intensityLabel = t.intensity[scenario.intensity];

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60, background: `rgba(${r},${g},${b},0.96)`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 28px max(32px,env(safe-area-inset-bottom))" }}>
      <div style={{ opacity: textVisible ? 1 : 0, transform: textVisible ? "translateY(0)" : "translateY(-12px)", transition: "opacity 0.5s ease 0.1s,transform 0.5s ease 0.1s", textAlign: "center", marginBottom: 28, width: "100%" }}>
        <p style={{ fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif", fontWeight: 400, fontSize: 10, letterSpacing: "0.24em", textTransform: "uppercase", color: "rgba(255,255,255,0.50)", margin: "0 0 10px" }}>{intensityLabel}</p>
        <p style={{ fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif", fontWeight: 700, fontSize: "clamp(22px,6vw,30px)", color: "rgba(255,255,255,0.96)", letterSpacing: "-0.02em", margin: 0, lineHeight: 1.15 }}>{titleText}</p>
      </div>

      <div style={{ opacity: textVisible ? 1 : 0, transition: "opacity 0.5s ease 0.2s", marginBottom: 18, width: "100%", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ flex: 1, height: "0.5px", background: "rgba(255,255,255,0.22)" }} />
        <span style={{ fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif", fontWeight: 400, fontSize: 9, letterSpacing: "0.28em", textTransform: "uppercase", color: "rgba(255,255,255,0.55)" }}>{t.yourRole}</span>
        <div style={{ flex: 1, height: "0.5px", background: "rgba(255,255,255,0.22)" }} />
      </div>

      <div style={{ opacity: textVisible ? 1 : 0, transform: textVisible ? "translateY(0)" : "translateY(22px)", transition: "opacity 0.6s ease 0.25s,transform 0.6s ease 0.25s", width: "100%", flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif", fontWeight: 400, fontSize: "clamp(15px,4.2vw,18px)", color: "rgba(255,255,255,0.92)", lineHeight: 1.65, letterSpacing: "-0.005em", margin: 0, textAlign: "center" }}>{roleText}</p>
      </div>

      <div style={{ opacity: textVisible ? 1 : 0, transition: "opacity 0.5s ease 0.5s", width: "100%", background: "rgba(255,255,255,0.10)", borderRadius: 14, padding: "12px 16px", marginBottom: 20, border: "1px solid rgba(255,255,255,0.15)" }}>
        <p style={{ fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif", fontWeight: 500, fontSize: 13, color: "rgba(255,255,255,0.80)", margin: 0 }}>{t.partnerSent}</p>
        <p style={{ fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif", fontWeight: 300, fontSize: 11, color: "rgba(255,255,255,0.50)", margin: "4px 0 0" }}>{t.partnerWait}</p>
      </div>

      <button onClick={onDismiss} style={{ width: "100%", padding: "18px 8px", borderRadius: 18, background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.30)", cursor: "pointer", fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif", fontWeight: 500, fontSize: 16, color: "#ffffff" }}>
        {t.dismiss}
      </button>

      <div style={{ position: "absolute", top: "-20%", right: "-25%", width: "60vw", height: "60vw", borderRadius: "50%", background: "rgba(255,255,255,0.05)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: "-15%", left: "-20%", width: "50vw", height: "50vw", borderRadius: "50%", background: "rgba(255,255,255,0.04)", pointerEvents: "none" }} />
    </div>
  );
}

function HoldButton({ lang, onComplete, color }: { lang: Lang; onComplete: () => void; color: { r: number; g: number; b: number } }) {
  const [progress, setProgress] = useState(0);
  const [holding, setHolding] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const t = T[lang];
  const { r, g, b } = color;
  const HOLD_MS = 2400;

  const startHold = () => {
    setHolding(true);
    const start = performance.now();
    intervalRef.current = setInterval(() => {
      const p = Math.min(1, (performance.now() - start) / HOLD_MS);
      setProgress(p);
      if (p >= 1) {
        clearInterval(intervalRef.current!);
        intervalRef.current = null;
        setHolding(false);
        onComplete();
      }
    }, 16);
  };
  const stopHold = () => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    setHolding(false);
    setProgress(0);
  };
  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  const size = 180;
  const radius = 78;
  const circ = 2 * Math.PI * radius;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>
      <div
        onMouseDown={startHold} onMouseUp={stopHold} onMouseLeave={stopHold}
        onTouchStart={e => { e.preventDefault(); startHold(); }} onTouchEnd={e => { e.preventDefault(); stopHold(); }}
        style={{ width: size, height: size, position: "relative", cursor: "pointer", userSelect: "none", WebkitUserSelect: "none" }}
      >
        <svg width={size} height={size} style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }}>
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={`rgba(${r},${g},${b},0.14)`} strokeWidth={3} />
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none"
            stroke={`rgba(${r},${g},${b},0.80)`} strokeWidth={3}
            strokeDasharray={circ} strokeDashoffset={circ * (1 - progress)}
            strokeLinecap="round"
            style={{ transition: holding ? "none" : "stroke-dashoffset 0.3s ease" }}
          />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%", background: holding ? `rgba(${r},${g},${b},0.16)` : `rgba(${r},${g},${b},0.08)`, transition: "background 0.2s" }}>
          <div style={{ width: 14, height: 14, borderRadius: "50%", background: `rgba(${r},${g},${b},${holding ? 0.90 : 0.50})`, transition: "all 0.2s", transform: holding ? "scale(1.4)" : "scale(1)", boxShadow: holding ? `0 0 28px rgba(${r},${g},${b},0.65)` : "none" }} />
        </div>
      </div>
      <p style={{ fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif", fontWeight: 400, fontSize: 11, letterSpacing: "0.20em", textTransform: "uppercase", color: `rgba(${r},${g},${b},0.65)`, margin: 0 }}>
        {holding ? t.holding : t.holdHint}
      </p>
    </div>
  );
}

export default function ScenarioScreen({ lang, onBack }: ScenarioScreenProps) {
  const [phase, setPhase] = useState<Phase>(() => getCoupleId() ? "idle" : "no_partner");
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { requestAnimationFrame(() => setMounted(true)); }, []);
  const t = T[lang];
  const primaryColor = { r: 155, g: 15, b: 90 };

  const handleInvite = useCallback(() => {
    const tg = (window as any).Telegram?.WebApp;
    const userId = tg?.initDataUnsafe?.user?.id;
    if (userId && tg?.openTelegramLink) {
      const inviteLink = `https://t.me/${BOT_USERNAME}/Touche?startapp=ref_${userId}`;
      const message = lang === "en"
        ? "Join me on Touché — evening scenarios for couples"
        : "Присоединяйся ко мне в Touché — сценарии для пар на вечер";
      tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent(message)}`);
    }
  }, [lang]);

  const handleHoldComplete = useCallback(async () => {
    const coupleId = getCoupleId();
    const picked = SCENARIOS[Math.floor(Math.random() * SCENARIOS.length)];
    setScenario(picked);

    const pendingCard = {
      scenarioId: picked.id,
      role: lang === "en" ? picked.role_b_en : picked.role_b_ru,
      title: lang === "en" ? picked.title_en : picked.title_ru,
    };
    try {
      localStorage.setItem(PENDING_KEY, JSON.stringify(pendingCard));
      await fetch("/api/scenario/pull", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-telegram-init-data": (window as any).Telegram?.WebApp?.initData ?? "" },
        body: JSON.stringify({ coupleId, scenarioId: picked.id, lang }),
      });
    } catch {}
    setPhase("role_a");
  }, [lang]);

  const handleDismiss = useCallback(() => {
    setPhase("idle");
    setScenario(null);
  }, []);

  if (phase === "no_partner") {
    return <NoPartner lang={lang} onInvite={handleInvite} onBack={onBack} />;
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: BG, display: "flex", flexDirection: "column", overflow: "hidden", opacity: mounted ? 1 : 0, transition: "opacity 0.32s ease" }}>

      {/* Ambient */}
      <div style={{ position: "absolute", top: "10%", left: "50%", transform: "translateX(-50%)", width: "70vw", height: "35vw", borderRadius: "50%", background: "radial-gradient(ellipse,rgba(155,15,90,0.10) 0%,transparent 70%)", pointerEvents: "none" }} />

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "max(60px,env(safe-area-inset-top)) 20px 6px", flexShrink: 0, position: "relative", zIndex: 10 }}>
        <button onClick={onBack} style={{ background: "transparent", border: "none", cursor: "pointer", fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif", fontWeight: 400, fontSize: 14, color: TEXT_S, padding: "4px 0" }}>{t.back}</button>
        <div style={{ textAlign: "center" }}>
          <p style={{ fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif", fontWeight: 700, fontSize: 20, color: TEXT_P, letterSpacing: "-0.02em", margin: 0 }}>{t.title}</p>
        </div>
        <div style={{ width: 60 }} />
      </div>

      <div style={{ textAlign: "center", padding: "0 24px 6px", position: "relative", zIndex: 10 }}>
        <p style={{ fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif", fontWeight: 300, fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: `rgba(${primaryColor.r},${primaryColor.g},${primaryColor.b},0.60)`, margin: 0 }}>{t.sub}</p>
      </div>

      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", zIndex: 10 }}>
        <HoldButton lang={lang} onComplete={handleHoldComplete} color={primaryColor} />
      </div>

      {scenario && phase === "role_a" && (
        <RoleCard scenario={scenario} lang={lang} onDismiss={handleDismiss} />
      )}
    </div>
  );
}
