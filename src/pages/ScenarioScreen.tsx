import { useState, useCallback, useEffect } from "react";
import { type Lang } from "@/data/i18n";
import { BOT_USERNAME } from "@/config";
import HeartbeatCanvas from "@/components/HeartbeatCanvas";

const BG = "#0d0610";
const TEXT_P = "rgba(255,238,248,0.88)";
const TEXT_S = "rgba(255,238,248,0.55)";
const SCENE_COLOR = { r: 155, g: 15, b: 90 };
const COUPLE_KEY  = "touche_couple_id";

type Intensity = "romantic" | "passion" | "hard";
type Phase     = "idle" | "revealed" | "no_partner";

function getCoupleId() { try { return localStorage.getItem(COUPLE_KEY); } catch { return null; } }

function useTelegramTopInset(): string {
  const [topPx, setTopPx] = useState<number>(0);
  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    function compute() {
      const content = tg?.contentSafeAreaInset?.top ?? 0;
      const safe    = tg?.safeAreaInset?.top ?? 0;
      const total   = content + safe;
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
  return topPx > 0 ? `${topPx}px` : "max(56px, env(safe-area-inset-top))";
}

interface ScenarioScreenProps { lang: Lang; onBack: () => void; }

const INTENSITY_META: Record<Intensity, { r: number; g: number; b: number; ru: string; en: string; ruSub: string; enSub: string }> = {
  romantic: { r: 255, g: 155, b: 80,  ru: "Романтика", en: "Romantic", ruSub: "нежно · интрига",    enSub: "tender · intrigue"   },
  passion:  { r: 200, g: 45,  b: 100, ru: "Страсть",   en: "Passion",  ruSub: "чувственно · 18+",   enSub: "sensual · 18+"       },
  hard:     { r: 130, g: 10,  b: 75,  ru: "Жёстко",    en: "Hard",     ruSub: "откровенно · 18+",   enSub: "explicit · 18+"      },
};

const T = {
  en: {
    title: "Scenarios", sub: "roleplay · for two",
    holdHint: "HOLD · DRAW YOUR SCENARIO", casting: "GENERATING...",
    back: "← back",
    noPartner: "No partner linked yet",
    noPartnerSub: "Invite your partner first — so you both get complementary roles tonight.",
    invite: "Invite partner",
    yourRole: "YOUR ROLE",
    partnerSent: "Your partner received their role",
    partnerWait: "They got a Telegram notification with their card",
    partnerPending: "Partner will see their role when they open the app",
    dismiss: "Got it",
    pickIntensity: "Choose intensity",
    aiLabel: "✦ ai scenario",
    notifiedYes: "partner notified",
    notifiedNo: "partner will see on next open",
  },
  ru: {
    title: "Сценарии", sub: "ролевые · на двоих",
    holdHint: "ДЕРЖИ · ТЯНИ СЦЕНАРИЙ", casting: "ГЕНЕРИРУЕМ...",
    back: "← назад",
    noPartner: "Партнёр ещё не подключён",
    noPartnerSub: "Сначала пригласи партнёра — чтобы у вас были разные роли одного сценария.",
    invite: "Пригласить партнёра",
    yourRole: "ТВОЯ РОЛЬ",
    partnerSent: "Партнёр получил свою роль",
    partnerWait: "Ему пришло уведомление в Telegram с его карточкой",
    partnerPending: "Партнёр увидит роль при следующем открытии",
    dismiss: "Понятно",
    pickIntensity: "Выбери интенсивность",
    aiLabel: "✦ ai сценарий",
    notifiedYes: "партнёр уведомлён",
    notifiedNo: "партнёр увидит при открытии",
  },
};

/* ── No partner screen ──────────────────────────────────────────── */
function NoPartner({ lang, onInvite, onBack }: { lang: Lang; onInvite: () => void; onBack: () => void }) {
  const t = T[lang]; const { r, g, b } = SCENE_COLOR;
  const topPadding = useTelegramTopInset();
  return (
    <div style={{ position: "fixed", inset: 0, background: BG, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 32px" }}>
      <button onClick={onBack} style={{ position: "absolute", top: topPadding, left: 20, background: "transparent", border: "none", cursor: "pointer", fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif", fontWeight: 500, fontSize: 15, color: TEXT_S, padding: "4px 0" }}>
        {t.back}
      </button>
      <div style={{ position: "absolute", top: "20%", left: "50%", transform: "translateX(-50%)", width: "60vw", height: "30vw", borderRadius: "50%", background: `radial-gradient(ellipse,rgba(${r},${g},${b},0.10) 0%,transparent 70%)`, pointerEvents: "none" }} />
      <div style={{ textAlign: "center", position: "relative" }}>
        <div style={{ fontSize: 52, marginBottom: 20 }}>💑</div>
        <p style={{ fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif", fontWeight: 700, fontSize: 24, color: TEXT_P, letterSpacing: "-0.02em", margin: 0 }}>{t.noPartner}</p>
        <p style={{ fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif", fontWeight: 300, fontSize: 14, color: TEXT_S, lineHeight: 1.6, margin: "14px 0 36px" }}>{t.noPartnerSub}</p>
        <button onClick={onInvite} style={{ padding: "18px 36px", borderRadius: 18, background: `rgba(${r},${g},${b},0.12)`, border: `1px solid rgba(${r},${g},${b},0.35)`, cursor: "pointer", fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif", fontWeight: 600, fontSize: 17, color: "rgba(230,100,150,0.95)", letterSpacing: "-0.01em" }}>{t.invite}</button>
      </div>
    </div>
  );
}

/* ── Role reveal card ───────────────────────────────────────────── */
function RoleCard({
  title, roleText, intensity, lang, notified, onDismiss,
}: {
  title: string; roleText: string; intensity: Intensity;
  lang: Lang; notified: boolean; onDismiss: () => void;
}) {
  const t = T[lang];
  const meta = INTENSITY_META[intensity];
  const { r, g, b } = meta;
  const [textVisible, setTextVisible] = useState(false);
  useEffect(() => { const tm = setTimeout(() => setTextVisible(true), 200); return () => clearTimeout(tm); }, []);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60, background: `rgba(${r},${g},${b},0.97)`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 28px max(32px,env(safe-area-inset-bottom))" }}>

      {/* Title */}
      <div style={{ opacity: textVisible ? 1 : 0, transform: textVisible ? "translateY(0)" : "translateY(-12px)", transition: "opacity .5s ease .1s,transform .5s ease .1s", textAlign: "center", marginBottom: 20, width: "100%" }}>
        <p style={{ fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif", fontWeight: 400, fontSize: 10, letterSpacing: "0.28em", textTransform: "uppercase", color: "rgba(255,255,255,0.50)", margin: "0 0 8px" }}>
          {lang === "ru" ? meta.ruSub : meta.enSub}
        </p>
        <p style={{ fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif", fontWeight: 800, fontSize: "clamp(22px,6vw,32px)", color: "rgba(255,255,255,0.97)", letterSpacing: "-0.03em", margin: 0, lineHeight: 1.1 }}>{title}</p>
      </div>

      {/* Divider */}
      <div style={{ opacity: textVisible ? 1 : 0, transition: "opacity .5s ease .2s", marginBottom: 18, width: "100%", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ flex: 1, height: "0.5px", background: "rgba(255,255,255,0.22)" }} />
        <span style={{ fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif", fontWeight: 400, fontSize: 9, letterSpacing: "0.28em", textTransform: "uppercase", color: "rgba(255,255,255,0.55)" }}>{t.yourRole}</span>
        <div style={{ flex: 1, height: "0.5px", background: "rgba(255,255,255,0.22)" }} />
      </div>

      {/* Role text */}
      <div style={{ opacity: textVisible ? 1 : 0, transform: textVisible ? "translateY(0)" : "translateY(22px)", transition: "opacity .6s ease .25s,transform .6s ease .25s", width: "100%", flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif", fontWeight: 400, fontSize: "clamp(15px,4.2vw,18px)", color: "rgba(255,255,255,0.93)", lineHeight: 1.70, letterSpacing: "-0.005em", margin: 0, textAlign: "center" }}>{roleText}</p>
      </div>

      {/* Partner status */}
      <div style={{ opacity: textVisible ? 1 : 0, transition: "opacity .5s ease .45s", width: "100%", background: "rgba(255,255,255,0.10)", borderRadius: 14, padding: "12px 16px", marginBottom: 20, border: "1px solid rgba(255,255,255,0.15)" }}>
        <p style={{ fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif", fontWeight: 500, fontSize: 13, color: "rgba(255,255,255,0.85)", margin: 0 }}>
          {notified ? t.partnerSent : t.partnerPending}
        </p>
        <p style={{ fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif", fontWeight: 300, fontSize: 11, color: "rgba(255,255,255,0.50)", margin: "4px 0 0" }}>
          {notified ? t.partnerWait : t.partnerPending}
        </p>
      </div>

      {/* AI badge + dismiss */}
      <div style={{ opacity: textVisible ? 1 : 0, transition: "opacity .5s ease .55s", width: "100%", display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ textAlign: "center" }}>
          <span style={{ fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif", fontWeight: 300, fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)" }}>{t.aiLabel}</span>
        </div>
        <button onClick={onDismiss} style={{ width: "100%", padding: "18px 8px", borderRadius: 18, background: "rgba(255,255,255,0.16)", border: "1px solid rgba(255,255,255,0.30)", cursor: "pointer", fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif", fontWeight: 500, fontSize: 16, color: "#ffffff" }}>
          {t.dismiss}
        </button>
      </div>

      {/* Decorative orbs */}
      <div style={{ position: "absolute", top: "-20%", right: "-25%", width: "60vw", height: "60vw", borderRadius: "50%", background: "rgba(255,255,255,0.05)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: "-15%", left: "-20%", width: "50vw", height: "50vw", borderRadius: "50%", background: "rgba(255,255,255,0.04)", pointerEvents: "none" }} />
    </div>
  );
}

/* ── Intensity selector ─────────────────────────────────────────── */
function IntensitySelector({ value, onChange, lang }: { value: Intensity; onChange: (v: Intensity) => void; lang: Lang }) {
  return (
    <div style={{ flexShrink: 0, display: "flex", gap: 8, padding: "10px 18px 4px", position: "relative", zIndex: 10 }}>
      {(["romantic", "passion", "hard"] as Intensity[]).map((key) => {
        const meta = INTENSITY_META[key];
        const { r, g, b } = meta;
        const active = value === key;
        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            style={{
              flex: 1, padding: "9px 4px", borderRadius: 14, border: "none", cursor: "pointer",
              background: active
                ? `rgba(${r},${g},${b},0.18)`
                : "rgba(255,238,248,0.04)",
              outline: active ? `1px solid rgba(${r},${g},${b},0.45)` : "1px solid rgba(255,238,248,0.08)",
              transition: "all .2s",
              fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif",
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 12, letterSpacing: "-0.2px", color: active ? `rgb(${r},${g},${b})` : "rgba(255,238,248,0.40)", transition: "color .2s" }}>
              {lang === "ru" ? meta.ru : meta.en}
            </div>
            <div style={{ fontWeight: 300, fontSize: 9, letterSpacing: "0.06em", color: active ? `rgba(${r},${g},${b},0.70)` : "rgba(255,238,248,0.22)", marginTop: 2, transition: "color .2s" }}>
              {lang === "ru" ? meta.ruSub : meta.enSub}
            </div>
          </button>
        );
      })}
    </div>
  );
}

/* ── Theatrical orbit overlay ───────────────────────────────────── */
function TheatricalOrbit({ intensity }: { intensity: Intensity }) {
  const { r, g, b } = INTENSITY_META[intensity];
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none", zIndex: 5 }}>
      <svg width="280" height="280" style={{ opacity: 0.12 }}>
        <circle cx="140" cy="140" r="128" fill="none" stroke={`rgb(${r},${g},${b})`} strokeWidth="0.8" strokeDasharray="6 18">
          <animateTransform attributeName="transform" type="rotate" from="0 140 140" to="360 140 140" dur="22s" repeatCount="indefinite" />
        </circle>
        <circle cx="140" cy="140" r="108" fill="none" stroke={`rgb(${r},${g},${b})`} strokeWidth="0.5" strokeDasharray="3 22">
          <animateTransform attributeName="transform" type="rotate" from="360 140 140" to="0 140 140" dur="14s" repeatCount="indefinite" />
        </circle>
        <text x="140" y="8" textAnchor="middle" dominantBaseline="middle" fontFamily="'Plus Jakarta Sans',sans-serif" fontSize="8" letterSpacing="3" fill={`rgb(${r},${g},${b})`}>I</text>
        <text x="140" y="274" textAnchor="middle" dominantBaseline="middle" fontFamily="'Plus Jakarta Sans',sans-serif" fontSize="8" letterSpacing="3" fill={`rgb(${r},${g},${b})`}>II</text>
      </svg>
    </div>
  );
}

/* ── Main screen ────────────────────────────────────────────────── */
export default function ScenarioScreen({ lang, onBack }: ScenarioScreenProps) {
  const [phase, setPhase]         = useState<Phase>(() => getCoupleId() ? "idle" : "no_partner");
  const [intensity, setIntensity] = useState<Intensity>("passion");
  const [isCasting, setIsCasting] = useState(false);
  const [hintText, setHintText]   = useState(T[lang].holdHint);
  const [mounted, setMounted]     = useState(false);

  // Result state
  const [revealTitle,    setRevealTitle]    = useState("");
  const [revealRoleText, setRevealRoleText] = useState("");
  const [notified,       setNotified]       = useState(false);

  const t          = T[lang];
  const meta       = INTENSITY_META[intensity];
  const canvasColor = { r: meta.r, g: meta.g, b: meta.b };
  const topPadding = useTelegramTopInset();

  useEffect(() => { requestAnimationFrame(() => setMounted(true)); }, []);
  useEffect(() => { setHintText(T[lang].holdHint); }, [lang]);

  const handleInvite = useCallback(() => {
    const tg = (window as any).Telegram?.WebApp;
    const userId = tg?.initDataUnsafe?.user?.id;
    if (userId && tg?.openTelegramLink) {
      const link = `https://t.me/${BOT_USERNAME}/Touche?startapp=ref_${userId}`;
      const msg  = lang === "en"
        ? "Join me on Touché — scenarios for couples"
        : "Присоединяйся ко мне в Touché — сценарии для пар";
      tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(msg)}`);
    }
  }, [lang]);

  const handleHoldComplete = useCallback(async () => {
    if (isCasting) return;
    const coupleId = getCoupleId();
    if (!coupleId) { setPhase("no_partner"); return; }

    const tg = (window as any).Telegram?.WebApp;
    tg?.HapticFeedback?.impactOccurred("medium");
    setIsCasting(true);
    setHintText(T[lang].casting);

    try {
      const res = await fetch("/api/scenario/generate", {
        method:  "POST",
        headers: {
          "Content-Type":         "application/json",
          "x-telegram-init-data": tg?.initData ?? "",
        },
        body: JSON.stringify({ coupleId, lang, intensity }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      setRevealTitle(data.title   ?? "");
      setRevealRoleText(data.roleA ?? "");
      setNotified(data.notified   ?? false);
      tg?.HapticFeedback?.notificationOccurred("success");
      setPhase("revealed");
    } catch {
      // Fallback: show generic role from local fallback
      const fb = {
        romantic: { title: lang === "ru" ? "Детектив и свидетель" : "Detective & Witness",
                    role: lang === "ru" ? "Задавай партнёру личные вопросы. Не трогай его — только слова." : "Ask your partner personal questions. No touching — words only." },
        passion:  { title: lang === "ru" ? "Фотограф и модель" : "Photographer & Model",
                    role: lang === "ru" ? "Снимай партнёра, не касаясь. Ищи красоту в каждом движении." : "Photograph your partner without touching. Find beauty in every movement." },
        hard:     { title: lang === "ru" ? "Хозяин и слуга" : "Master & Servant",
                    role: lang === "ru" ? "Отдавай конкретные смелые приказы. Не объясняй причин." : "Give specific bold commands. Don't explain why." },
      }[intensity];
      setRevealTitle(fb.title);
      setRevealRoleText(fb.role);
      setNotified(false);
      setPhase("revealed");
    } finally {
      setIsCasting(false);
      setHintText(T[lang].holdHint);
    }
  }, [isCasting, lang, intensity]);

  const handleDismiss = useCallback(() => {
    setPhase("idle");
    setRevealTitle("");
    setRevealRoleText("");
  }, []);

  if (phase === "no_partner") {
    return <NoPartner lang={lang} onInvite={handleInvite} onBack={onBack} />;
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: BG, display: "flex", flexDirection: "column", overflow: "hidden", opacity: mounted ? 1 : 0, transition: "opacity .32s ease" }}>

      {/* Ambient glow — colour follows intensity */}
      <div style={{ position: "absolute", top: "-8%", left: "50%", transform: "translateX(-50%)", width: "70vw", height: "35vw", borderRadius: "50%", background: `radial-gradient(ellipse,rgba(${meta.r},${meta.g},${meta.b},0.10) 0%,transparent 70%)`, pointerEvents: "none", transition: "background .5s" }} />

      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", paddingTop: topPadding, paddingLeft: 20, paddingRight: 20, paddingBottom: 6, flexShrink: 0, position: "relative", zIndex: 10 }}>
        <button onClick={onBack} style={{ background: "transparent", border: "none", cursor: "pointer", fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif", fontWeight: 500, fontSize: 15, color: TEXT_S, padding: "4px 0", minWidth: 56 }}>
          {t.back}
        </button>
        <div style={{ flex: 1 }} />
        <div style={{ minWidth: 56 }} />
      </div>

      {/* Atmospheric header band */}
      <div style={{ flexShrink: 0, position: "relative", height: 64, overflow: "hidden", borderBottom: `0.5px solid rgba(${meta.r},${meta.g},${meta.b},0.18)`, transition: "border-color .5s" }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "url(/images/cat-scenarios.png)", backgroundSize: "cover", backgroundPosition: "center 30%", opacity: 0.22, filter: "saturate(1.5)" }} />
        <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at 80% 50%, rgba(${meta.r},${meta.g},${meta.b},0.28) 0%, transparent 65%)`, transition: "background .5s" }} />
        <div style={{ position: "absolute", inset: 0, background: `linear-gradient(90deg, ${BG}cc 0%, ${BG}88 40%, transparent 100%)` }} />
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, rgba(${meta.r},${meta.g},${meta.b},0.55), transparent)`, transition: "background .5s" }} />
        <div style={{ position: "relative", zIndex: 2, height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 24px" }}>
          <div style={{ fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif", fontWeight: 700, fontSize: 18, letterSpacing: "-0.02em", color: TEXT_P }}>{t.title}</div>
          <div style={{ fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif", fontWeight: 300, fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: `rgba(${meta.r},${meta.g},${meta.b},0.65)`, marginTop: 3, transition: "color .5s" }}>{t.sub}</div>
        </div>
      </div>

      {/* Intensity selector */}
      <IntensitySelector value={intensity} onChange={setIntensity} lang={lang} />

      {/* Canvas area */}
      <div style={{ flex: 1, position: "relative", minHeight: 0 }}>
        <HeartbeatCanvas
          onHoldComplete={handleHoldComplete}
          isCasting={isCasting}
          color={canvasColor}
          hintText={hintText}
          holdDuration={2600}
          baseRScale={0.28}
          bgColor={BG}
        />
        <TheatricalOrbit intensity={intensity} />
      </div>

      {/* Footer */}
      <div style={{ flexShrink: 0, padding: `8px 20px max(20px,env(safe-area-inset-bottom))`, textAlign: "center", position: "relative", zIndex: 10 }}>
        <span style={{ fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif", fontWeight: 300, fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,238,248,0.18)" }}>touché</span>
      </div>

      {/* Role reveal */}
      {phase === "revealed" && (
        <RoleCard
          title={revealTitle}
          roleText={revealRoleText}
          intensity={intensity}
          lang={lang}
          notified={notified}
          onDismiss={handleDismiss}
        />
      )}
    </div>
  );
}
