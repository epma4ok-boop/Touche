import { useState, useCallback, useEffect } from "react";
import { type Lang, UI } from "@/data/i18n";
import { BOT_USERNAME, OWNER_TELEGRAM_ID } from "@/config";
import HeartbeatCanvas from "@/components/HeartbeatCanvas";

const BG = "#0d0610";
const TEXT_P = "rgba(255,238,248,0.88)";
const TEXT_S = "rgba(255,238,248,0.55)";
const TEXT_T = "rgba(255,238,248,0.22)";
const SCENE_COLOR = { r: 155, g: 15, b: 90 };
const COUPLE_KEY  = "touche_couple_id";

// ── Active scenario persistence ────────────────────────────────────────────────
export const ACTIVE_SCENARIO_KEY = "touche_active_scenario";

export interface ActiveScenario {
  sessionId: string;
  role: "a" | "b";
  roleText: string;
  title: string;
  intensity: Intensity;
  notified: boolean;
}

function getActiveScenario(): ActiveScenario | null {
  try { const raw = localStorage.getItem(ACTIVE_SCENARIO_KEY); if (!raw) return null; return JSON.parse(raw) as ActiveScenario; } catch { return null; }
}
function saveActiveScenario(s: ActiveScenario) { try { localStorage.setItem(ACTIVE_SCENARIO_KEY, JSON.stringify(s)); } catch {} }
function clearActiveScenario() { try { localStorage.removeItem(ACTIVE_SCENARIO_KEY); } catch {} }

// ─────────────────────────────────────────────────────────────────────────────

type Intensity = "romantic" | "passion" | "hard";
type Phase     = "idle" | "revealed" | "no_partner";

function getCoupleId() { try { return localStorage.getItem(COUPLE_KEY); } catch { return null; } }
function getInitData(): string { return (window as any).Telegram?.WebApp?.initData ?? ""; }
function getCurrentUserId(): number | null { try { return (window as any).Telegram?.WebApp?.initDataUnsafe?.user?.id ?? null; } catch { return null; } }

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
    return () => { tg?.offEvent?.("safeAreaChanged", compute); tg?.offEvent?.("contentSafeAreaInsetChanged", compute); clearTimeout(tm); };
  }, []);
  return topPx > 0 ? `${topPx}px` : "max(56px, env(safe-area-inset-top))";
}

// ── Server helpers ─────────────────────────────────────────────────────────────

async function fetchSubscriptionStatus(): Promise<{ active: boolean; expiresAt: string | null }> {
  try {
    const res = await fetch("/api/subscription/status", { headers: { "x-telegram-init-data": getInitData() } });
    if (!res.ok) return { active: false, expiresAt: null };
    return res.json();
  } catch { return { active: false, expiresAt: null }; }
}

async function createSubscriptionInvoice(lang: Lang): Promise<string | null> {
  try {
    const res = await fetch("/api/subscription/invoice", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-telegram-init-data": getInitData() },
      body: JSON.stringify({ lang }),
    });
    if (!res.ok) return null;
    const d = await res.json();
    return d.invoiceLink ?? null;
  } catch { return null; }
}

// ── Intensity metadata ─────────────────────────────────────────────────────────

type IntensityLabel = { label: string; sub: string };

const INTENSITY_META: Record<Intensity, { r: number; g: number; b: number; labels: Record<string, IntensityLabel> }> = {
  romantic: {
    r: 255, g: 155, b: 80,
    labels: {
      ru: { label: "Романтика", sub: "нежно · интрига" },
      en: { label: "Romantic",  sub: "tender · intrigue" },
      hi: { label: "रोमांटिक",  sub: "कोमल · रहस्य" },
      pt: { label: "Romântico", sub: "suave · intriga" },
      es: { label: "Romántico", sub: "suave · intriga" },
    },
  },
  passion: {
    r: 200, g: 45, b: 100,
    labels: {
      ru: { label: "Страсть",  sub: "чувственно · 18+" },
      en: { label: "Passion",  sub: "sensual · 18+" },
      hi: { label: "जुनून",    sub: "भावुक · 18+" },
      pt: { label: "Paixão",   sub: "sensual · 18+" },
      es: { label: "Pasión",   sub: "sensual · 18+" },
    },
  },
  hard: {
    r: 130, g: 10, b: 75,
    labels: {
      ru: { label: "Жёстко",  sub: "откровенно · 18+" },
      en: { label: "Hard",    sub: "explicit · 18+" },
      hi: { label: "साहसिक",  sub: "खुलकर · 18+" },
      pt: { label: "Intenso", sub: "explícito · 18+" },
      es: { label: "Intenso", sub: "explícito · 18+" },
    },
  },
};

// ── UI strings for this screen ─────────────────────────────────────────────────

const T: Record<Lang, {
  title: string; sub: string; holdHint: string; casting: string; back: string;
  noPartner: string; noPartnerSub: string; invite: string; yourRole: string;
  partnerSent: string; partnerWait: string; partnerPending: string; complete: string;
  aiLabel: string; missed: string;
}> = {
  en: {
    title: "Scenarios", sub: "roleplay · for two",
    holdHint: "HOLD · DRAW YOUR SCENARIO", casting: "GENERATING...",
    back: "← back", noPartner: "No partner linked yet",
    noPartnerSub: "Invite your partner first — so you both get complementary roles tonight.",
    invite: "Invite partner", yourRole: "YOUR ROLE",
    partnerSent: "Your partner received their role",
    partnerWait: "They got a Telegram notification with their card",
    partnerPending: "Partner will see their role when they open the app",
    complete: "Task completed", aiLabel: "✦ ai scenario", missed: "missed",
  },
  ru: {
    title: "Сценарии", sub: "ролевые · на двоих",
    holdHint: "ДЕРЖИ · ТЯНИ СЦЕНАРИЙ", casting: "ГЕНЕРИРУЕМ...",
    back: "← назад", noPartner: "Партнёр ещё не подключён",
    noPartnerSub: "Сначала пригласи партнёра — чтобы у вас были разные роли одного сценария.",
    invite: "Пригласить партнёра", yourRole: "ТВОЯ РОЛЬ",
    partnerSent: "Партнёр получил свою роль",
    partnerWait: "Ему пришло уведомление в Telegram с его карточкой",
    partnerPending: "Партнёр увидит роль при следующем открытии",
    complete: "Задание выполнено", aiLabel: "✦ ai сценарий", missed: "пропущено",
  },
  hi: {
    title: "दृश्य", sub: "रोलप्ले · दो के लिए",
    holdHint: "दबाएं · दृश्य खींचें", casting: "तैयार हो रहा है...",
    back: "← वापस", noPartner: "साथी अभी नहीं जुड़ा",
    noPartnerSub: "पहले साथी को आमंत्रित करें — ताकि आप दोनों को पूरक भूमिकाएं मिलें।",
    invite: "साथी को आमंत्रित करें", yourRole: "आपकी भूमिका",
    partnerSent: "साथी को उनकी भूमिका मिल गई",
    partnerWait: "उन्हें Telegram पर उनका कार्ड मिला",
    partnerPending: "साथी अगली बार ऐप खोलने पर भूमिका देखेंगे",
    complete: "कार्य पूरा हुआ", aiLabel: "✦ ai दृश्य", missed: "चूका",
  },
  pt: {
    title: "Cenários", sub: "roleplay · para dois",
    holdHint: "SEGURE · SORTEAR CENÁRIO", casting: "GERANDO...",
    back: "← voltar", noPartner: "Parceiro ainda não conectado",
    noPartnerSub: "Convide seu parceiro primeiro — para que vocês dois recebam papéis complementares.",
    invite: "Convidar parceiro", yourRole: "SEU PAPEL",
    partnerSent: "Seu parceiro recebeu o papel dele",
    partnerWait: "Ele recebeu uma notificação no Telegram com o cartão",
    partnerPending: "O parceiro verá o papel quando abrir o app",
    complete: "Tarefa concluída", aiLabel: "✦ cenário ia", missed: "perdida",
  },
  es: {
    title: "Escenarios", sub: "roleplay · para dos",
    holdHint: "MANTÉN · SORTEAR ESCENARIO", casting: "GENERANDO...",
    back: "← atrás", noPartner: "Pareja aún no conectada",
    noPartnerSub: "Invita a tu pareja primero — para que ambos reciban roles complementarios.",
    invite: "Invitar pareja", yourRole: "TU ROL",
    partnerSent: "Tu pareja recibió su rol",
    partnerWait: "Recibió una notificación de Telegram con su tarjeta",
    partnerPending: "La pareja verá su rol cuando abra la app",
    complete: "Tarea completada", aiLabel: "✦ escenario ia", missed: "perdida",
  },
};

/* ── Subscription paywall ─────────────────────────────────────────────────────*/
function ScenarioPaywall({ lang, onSubscribed, onBack }: { lang: Lang; onSubscribed: () => void; onBack: () => void }) {
  const { r, g, b } = SCENE_COLOR;
  const t = UI[lang];
  const tt = T[lang];
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);
  const topPadding = useTelegramTopInset();

  useEffect(() => { const tm = setTimeout(() => setVisible(true), 60); return () => clearTimeout(tm); }, []);

  const handleSubscribe = useCallback(async () => {
    setLoading(true);
    try {
      const invoiceLink = await createSubscriptionInvoice(lang);
      if (invoiceLink) {
        (window as any).Telegram?.WebApp?.openInvoice?.(invoiceLink, (status: string) => {
          if (status === "paid") onSubscribed();
          setLoading(false);
        });
      } else { setLoading(false); }
    } catch { setLoading(false); }
  }, [lang, onSubscribed]);

  const features = [t.subFeature1, t.subFeature2, t.subFeature3];

  return (
    <div style={{ position: "fixed", inset: 0, background: BG, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at 50% 40%, rgba(${r},${g},${b},0.18) 0%, transparent 65%)`, pointerEvents: "none" }} />
      <button onClick={onBack} style={{ position: "absolute", top: topPadding, left: 20, background: "transparent", border: "none", cursor: "pointer", fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif", fontWeight: 500, fontSize: 15, color: TEXT_S, padding: "4px 0", zIndex: 10 }}>
        {tt.back}
      </button>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 28px max(40px,env(safe-area-inset-bottom))", position: "relative", zIndex: 1 }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: `rgba(${r},${g},${b},0.12)`, border: `1px solid rgba(${r},${g},${b},0.30)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, marginBottom: 20, opacity: visible ? 1 : 0, transform: visible ? "scale(1)" : "scale(0.8)", transition: "opacity .5s ease .1s, transform .5s cubic-bezier(.16,1,.3,1) .1s" }}>🔒</div>
        <p style={{ fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif", fontWeight: 700, fontSize: 24, color: TEXT_P, margin: "0 0 4px", letterSpacing: "-0.02em", textAlign: "center", opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(10px)", transition: "opacity .5s ease .15s, transform .5s ease .15s" }}>{t.subTitle}</p>
        <p style={{ fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif", fontWeight: 300, fontSize: 13, letterSpacing: "0.14em", textTransform: "uppercase", color: `rgba(${r},${g},${b},0.65)`, margin: "0 0 28px", textAlign: "center", opacity: visible ? 1 : 0, transition: "opacity .5s ease .2s" }}>{t.subTagline}</p>
        <div style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 18, padding: "4px 0", marginBottom: 24, opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(8px)", transition: "opacity .5s ease .25s, transform .5s ease .25s" }}>
          {features.map((f, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 18px", borderBottom: i < features.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
              <div style={{ width: 20, height: 20, borderRadius: "50%", background: `rgba(${r},${g},${b},0.18)`, border: `1px solid rgba(${r},${g},${b},0.35)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: `rgba(${r},${g},${b},0.9)` }} />
              </div>
              <span style={{ fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif", fontWeight: 400, fontSize: 14, color: TEXT_P, lineHeight: 1.4 }}>{f}</span>
            </div>
          ))}
        </div>
        <button onClick={handleSubscribe} disabled={loading} style={{ width: "100%", padding: "19px 8px", borderRadius: 18, background: `rgba(${r},${g},${b},0.20)`, border: `1px solid rgba(${r},${g},${b},0.50)`, cursor: loading ? "default" : "pointer", fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif", fontWeight: 600, fontSize: 17, color: "rgba(255,220,235,0.95)", letterSpacing: "-0.01em", opacity: loading ? 0.6 : (visible ? 1 : 0), transform: visible ? "translateY(0)" : "translateY(10px)", transition: "opacity .5s ease .35s, transform .5s ease .35s", marginBottom: 10 }}>
          {loading ? "..." : t.subBtn}
        </button>
        <p style={{ fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif", fontWeight: 300, fontSize: 11, letterSpacing: "0.08em", color: TEXT_S, margin: 0, textAlign: "center" }}>{t.subPriceNote}</p>
      </div>
    </div>
  );
}

/* ── No partner screen ───────────────────────────────────────────────────────*/
function NoPartner({ lang, onInvite, onBack }: { lang: Lang; onInvite: () => void; onBack: () => void }) {
  const t = T[lang]; const { r, g, b } = SCENE_COLOR;
  const topPadding = useTelegramTopInset();
  return (
    <div style={{ position: "fixed", inset: 0, background: BG, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 32px" }}>
      <button onClick={onBack} style={{ position: "absolute", top: topPadding, left: 20, background: "transparent", border: "none", cursor: "pointer", fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif", fontWeight: 500, fontSize: 15, color: TEXT_S, padding: "4px 0" }}>{t.back}</button>
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

/* ── Role reveal card ────────────────────────────────────────────────────────*/
function RoleCard({ title, roleText, intensity, lang, notified, isMissed, onComplete, onHideCard, topPadding }: {
  title: string; roleText: string; intensity: Intensity; lang: Lang; notified: boolean; isMissed?: boolean;
  onComplete: () => void; onHideCard: () => void; topPadding: string;
}) {
  const t = T[lang];
  const meta = INTENSITY_META[intensity];
  const { r, g, b } = meta;
  const { label: intensityLabel, sub: intensitySub } = meta.labels[lang] ?? meta.labels.en;
  const [textVisible, setTextVisible] = useState(false);
  useEffect(() => { const tm = setTimeout(() => setTextVisible(true), 200); return () => clearTimeout(tm); }, []);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60, background: `rgba(${r},${g},${b},0.97)`, display: "flex", flexDirection: "column", paddingTop: topPadding, paddingLeft: 28, paddingRight: 28, paddingBottom: "max(32px, env(safe-area-inset-bottom))", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: "-20%", right: "-25%", width: "60vw", height: "60vw", borderRadius: "50%", background: "rgba(255,255,255,0.05)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: "-15%", left: "-20%", width: "50vw", height: "50vw", borderRadius: "50%", background: "rgba(255,255,255,0.04)", pointerEvents: "none" }} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexShrink: 0 }}>
        <button onClick={onHideCard} style={{ background: "transparent", border: "none", cursor: "pointer", fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif", fontWeight: 500, fontSize: 14, color: "rgba(255,255,255,0.60)", padding: "4px 0" }}>{t.back}</button>
        {isMissed && (
          <span style={{ fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif", fontWeight: 600, fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.55)", background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.20)", borderRadius: 20, padding: "3px 9px" }}>{t.missed}</span>
        )}
      </div>
      <div style={{ opacity: textVisible ? 1 : 0, transform: textVisible ? "translateY(0)" : "translateY(-12px)", transition: "opacity .5s ease .1s,transform .5s ease .1s", textAlign: "center", marginBottom: 16, flexShrink: 0 }}>
        <p style={{ fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif", fontWeight: 400, fontSize: 10, letterSpacing: "0.28em", textTransform: "uppercase", color: "rgba(255,255,255,0.50)", margin: "0 0 8px" }}>{intensitySub}</p>
        <p style={{ fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif", fontWeight: 800, fontSize: "clamp(20px,5.5vw,30px)", color: "rgba(255,255,255,0.97)", letterSpacing: "-0.03em", margin: 0, lineHeight: 1.1 }}>{title}</p>
      </div>
      <div style={{ opacity: textVisible ? 1 : 0, transition: "opacity .5s ease .2s", marginBottom: 14, flexShrink: 0, display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ flex: 1, height: "0.5px", background: "rgba(255,255,255,0.22)" }} />
        <span style={{ fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif", fontWeight: 400, fontSize: 9, letterSpacing: "0.28em", textTransform: "uppercase", color: "rgba(255,255,255,0.55)" }}>{t.yourRole}</span>
        <div style={{ flex: 1, height: "0.5px", background: "rgba(255,255,255,0.22)" }} />
      </div>
      <div style={{ opacity: textVisible ? 1 : 0, transform: textVisible ? "translateY(0)" : "translateY(22px)", transition: "opacity .6s ease .25s,transform .6s ease .25s", flex: 1, overflowY: "auto", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 0 }}>
        <p style={{ fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif", fontWeight: 400, fontSize: "clamp(14px,4vw,17px)", color: "rgba(255,255,255,0.93)", lineHeight: 1.72, letterSpacing: "-0.005em", margin: 0, textAlign: "center" }}>{roleText}</p>
      </div>
      <div style={{ opacity: textVisible ? 1 : 0, transition: "opacity .5s ease .45s", flexShrink: 0, background: "rgba(255,255,255,0.10)", borderRadius: 14, padding: "11px 16px", marginTop: 14, marginBottom: 14, border: "1px solid rgba(255,255,255,0.15)" }}>
        <p style={{ fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif", fontWeight: 500, fontSize: 13, color: "rgba(255,255,255,0.85)", margin: 0 }}>{notified ? t.partnerSent : t.partnerPending}</p>
        <p style={{ fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif", fontWeight: 300, fontSize: 11, color: "rgba(255,255,255,0.50)", margin: "4px 0 0" }}>{notified ? t.partnerWait : t.partnerPending}</p>
      </div>
      <div style={{ opacity: textVisible ? 1 : 0, transition: "opacity .5s ease .55s", flexShrink: 0, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ textAlign: "center" }}>
          <span style={{ fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif", fontWeight: 300, fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)" }}>{t.aiLabel}</span>
        </div>
        <button onClick={onComplete} style={{ width: "100%", padding: "18px 8px", borderRadius: 18, background: "rgba(255,255,255,0.16)", border: "1px solid rgba(255,255,255,0.30)", cursor: "pointer", fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif", fontWeight: 600, fontSize: 16, color: "#ffffff" }}>{t.complete}</button>
      </div>
    </div>
  );
}

/* ── Intensity selector ──────────────────────────────────────────────────────*/
function IntensitySelector({ value, onChange, lang }: { value: Intensity; onChange: (v: Intensity) => void; lang: Lang }) {
  return (
    <div style={{ flexShrink: 0, display: "flex", gap: 8, padding: "10px 18px 4px", position: "relative", zIndex: 10 }}>
      {(["romantic", "passion", "hard"] as Intensity[]).map((key) => {
        const meta = INTENSITY_META[key];
        const { r, g, b } = meta;
        const active = value === key;
        const { label, sub } = meta.labels[lang] ?? meta.labels.en;
        return (
          <button key={key} onClick={() => onChange(key)} style={{ flex: 1, padding: "9px 4px", borderRadius: 14, border: "none", cursor: "pointer", background: active ? `rgba(${r},${g},${b},0.18)` : "rgba(255,238,248,0.04)", outline: active ? `1px solid rgba(${r},${g},${b},0.45)` : "1px solid rgba(255,238,248,0.08)", transition: "all .2s", fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif" }}>
            <div style={{ fontWeight: 700, fontSize: 12, letterSpacing: "-0.2px", color: active ? `rgb(${r},${g},${b})` : "rgba(255,238,248,0.40)", transition: "color .2s" }}>{label}</div>
            <div style={{ fontWeight: 300, fontSize: 9, letterSpacing: "0.06em", color: active ? `rgba(${r},${g},${b},0.70)` : "rgba(255,238,248,0.22)", marginTop: 2, transition: "color .2s" }}>{sub}</div>
          </button>
        );
      })}
    </div>
  );
}

/* ── Theatrical orbit ────────────────────────────────────────────────────────*/
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
      </svg>
    </div>
  );
}

/* ── Main screen ─────────────────────────────────────────────────────────────*/
interface ScenarioScreenProps { lang: Lang; onBack: () => void; }

export default function ScenarioScreen({ lang, onBack }: ScenarioScreenProps) {
  const [phase, setPhase]         = useState<Phase>(() => getCoupleId() ? "idle" : "no_partner");
  const [intensity, setIntensity] = useState<Intensity>("passion");
  const [isCasting, setIsCasting] = useState(false);
  const [hintText, setHintText]   = useState(T[lang].holdHint);
  const [mounted, setMounted]     = useState(false);

  const [revealTitle,     setRevealTitle]     = useState("");
  const [revealRoleText,  setRevealRoleText]  = useState("");
  const [revealIntensity, setRevealIntensity] = useState<Intensity>("passion");
  const [notified,        setNotified]        = useState(false);
  const [isMissed,        setIsMissed]        = useState(false);

  const [isLocked,   setIsLocked]   = useState(false);
  const [subChecked, setSubChecked] = useState(false);

  const t          = T[lang];
  const meta       = INTENSITY_META[intensity];
  const canvasColor = { r: meta.r, g: meta.g, b: meta.b };
  const topPadding = useTelegramTopInset();

  useEffect(() => {
    requestAnimationFrame(() => setMounted(true));
    setHintText(T[lang].holdHint);

    const saved = getActiveScenario();
    if (saved) {
      setRevealTitle(saved.title);
      setRevealRoleText(saved.roleText);
      setRevealIntensity(saved.intensity ?? "passion");
      setNotified(saved.notified);
      setIntensity(saved.intensity ?? "passion");
      setIsMissed(saved.role === "b");
      setPhase("revealed");
    }

    const uid = getCurrentUserId();
    if (OWNER_TELEGRAM_ID !== 0 && uid === OWNER_TELEGRAM_ID) {
      setIsLocked(false); setSubChecked(true); return;
    }
    fetchSubscriptionStatus().then((sub) => { setIsLocked(!sub.active); setSubChecked(true); });
  }, []);

  useEffect(() => { setHintText(T[lang].holdHint); }, [lang]);

  const handleSubscribed = useCallback(async () => {
    const sub = await fetchSubscriptionStatus();
    if (sub.active) setIsLocked(false);
  }, []);

  const handleInvite = useCallback(() => {
    const tg = (window as any).Telegram?.WebApp;
    const userId = tg?.initDataUnsafe?.user?.id;
    if (userId && tg?.openTelegramLink) {
      const link = `https://t.me/${BOT_USERNAME}/Touche?startapp=ref_${userId}`;
      const msg  = lang === "ru"
        ? "Присоединяйся ко мне в Touché — сценарии для пар"
        : lang === "hi" ? "Touché में शामिल हों — जोड़ों के लिए दृश्य"
        : lang === "pt" ? "Junte-se a mim no Touché — cenários para casais"
        : lang === "es" ? "Únete a mí en Touché — escenarios para parejas"
        : "Join me on Touché — scenarios for couples";
      tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(msg)}`);
    }
  }, [lang]);

  const handleHoldComplete = useCallback(async () => {
    if (isCasting || isLocked) return;
    const coupleId = getCoupleId();
    if (!coupleId) { setPhase("no_partner"); return; }
    const tg = (window as any).Telegram?.WebApp;
    tg?.HapticFeedback?.impactOccurred("medium");
    setIsCasting(true);
    setHintText(T[lang].casting);

    try {
      const res = await fetch("/api/scenario/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-telegram-init-data": getInitData() },
        body: JSON.stringify({ coupleId, lang, intensity }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const title    = data.title  ?? "";
      const roleText = data.roleA  ?? "";
      const isNotified = data.notified ?? false;
      setRevealTitle(title); setRevealRoleText(roleText); setRevealIntensity(intensity); setNotified(isNotified);
      tg?.HapticFeedback?.notificationOccurred("success");
      saveActiveScenario({ sessionId: data.sessionId ?? "", role: "a", roleText, title, intensity, notified: isNotified });
      setPhase("revealed");
    } catch {
      const fb: Record<Intensity, { title: string; role: string }> = {
        romantic: { title: t.title, role: t.holdHint },
        passion:  { title: t.title, role: t.holdHint },
        hard:     { title: t.title, role: t.holdHint },
      };
      const fallbacks: Record<Lang, Record<Intensity, { title: string; role: string }>> = {
        ru: { romantic: { title: "Детектив и свидетель", role: "Задавай партнёру личные вопросы. Только слова." }, passion: { title: "Фотограф и модель", role: "Снимай партнёра, не касаясь. Ищи красоту." }, hard: { title: "Хозяин и слуга", role: "Отдавай конкретные смелые приказы. Без объяснений." } },
        en: { romantic: { title: "Detective & Witness", role: "Ask personal questions. No touching — words only." }, passion: { title: "Photographer & Model", role: "Photograph without touching. Find beauty." }, hard: { title: "Master & Servant", role: "Give bold commands. No explanations." } },
        hi: { romantic: { title: "जासूस और गवाह", role: "व्यक्तिगत सवाल पूछें। केवल शब्द।" }, passion: { title: "फोटोग्राफर और मॉडल", role: "बिना छुए फोटो खींचें। सुंदरता खोजें।" }, hard: { title: "स्वामी और सेवक", role: "साहसी आदेश दें। कोई स्पष्टीकरण नहीं।" } },
        pt: { romantic: { title: "Detetive e Testemunha", role: "Faça perguntas pessoais. Apenas palavras." }, passion: { title: "Fotógrafo e Modelo", role: "Fotografe sem tocar. Encontre beleza." }, hard: { title: "Mestre e Servo", role: "Dê ordens ousadas. Sem explicações." } },
        es: { romantic: { title: "Detective y Testigo", role: "Haz preguntas personales. Solo palabras." }, passion: { title: "Fotógrafo y Modelo", role: "Fotografía sin tocar. Encuentra belleza." }, hard: { title: "Amo y Sirviente", role: "Da órdenes atrevidas. Sin explicaciones." } },
      };
      const chosen = fallbacks[lang]?.[intensity] ?? fb[intensity];
      setRevealTitle(chosen.title); setRevealRoleText(chosen.role); setRevealIntensity(intensity); setNotified(false);
      saveActiveScenario({ sessionId: "", role: "a", roleText: chosen.role, title: chosen.title, intensity, notified: false });
      setPhase("revealed");
    } finally {
      setIsCasting(false); setHintText(T[lang].holdHint);
    }
  }, [isCasting, isLocked, lang, intensity, t]);

  const handleCardBack = useCallback(() => { setPhase("idle"); }, []);
  const handleComplete = useCallback(() => {
    clearActiveScenario(); setPhase("idle"); setRevealTitle(""); setRevealRoleText(""); setIsMissed(false); onBack();
  }, [onBack]);

  if (phase === "no_partner") return <NoPartner lang={lang} onInvite={handleInvite} onBack={onBack} />;
  if (subChecked && isLocked) return <ScenarioPaywall lang={lang} onSubscribed={handleSubscribed} onBack={onBack} />;

  return (
    <div style={{ position: "fixed", inset: 0, background: BG, display: "flex", flexDirection: "column", overflow: "hidden", opacity: mounted ? 1 : 0, transition: "opacity .32s ease" }}>
      <div style={{ position: "absolute", top: "-8%", left: "50%", transform: "translateX(-50%)", width: "70vw", height: "35vw", borderRadius: "50%", background: `radial-gradient(ellipse,rgba(${meta.r},${meta.g},${meta.b},0.10) 0%,transparent 70%)`, pointerEvents: "none", transition: "background .5s" }} />
      <div style={{ display: "flex", alignItems: "center", paddingTop: topPadding, paddingLeft: 20, paddingRight: 20, paddingBottom: 6, flexShrink: 0, position: "relative", zIndex: 10 }}>
        <button onClick={onBack} style={{ background: "transparent", border: "none", cursor: "pointer", fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif", fontWeight: 500, fontSize: 15, color: TEXT_S, padding: "4px 0", minWidth: 56 }}>{t.back}</button>
        <div style={{ flex: 1 }} />
        {subChecked && !isLocked && (
          <span style={{ fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif", fontWeight: 500, fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: `rgba(${meta.r},${meta.g},${meta.b},0.70)`, background: `rgba(${meta.r},${meta.g},${meta.b},0.10)`, border: `1px solid rgba(${meta.r},${meta.g},${meta.b},0.22)`, borderRadius: 20, padding: "3px 9px" }}>premium ✦</span>
        )}
        <div style={{ minWidth: 56 }} />
      </div>
      <div style={{ flexShrink: 0, position: "relative", height: 64, overflow: "hidden", borderBottom: `0.5px solid rgba(${meta.r},${meta.g},${meta.b},0.18)`, transition: "border-color .5s" }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "url(/images/cat-scenarios.png)", backgroundSize: "cover", backgroundPosition: "center 30%", opacity: 0.22, filter: "saturate(1.5)" }} />
        <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at 80% 50%, rgba(${meta.r},${meta.g},${meta.b},0.28) 0%, transparent 65%)`, transition: "background .5s" }} />
        <div style={{ position: "absolute", inset: 0, background: `linear-gradient(90deg, ${BG}cc 0%, ${BG}88 40%, transparent 100%)` }} />
        <div style={{ position: "relative", zIndex: 2, height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 24px" }}>
          <div style={{ fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif", fontWeight: 700, fontSize: 18, letterSpacing: "-0.02em", color: TEXT_P }}>{t.title}</div>
          <div style={{ fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif", fontWeight: 300, fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: `rgba(${meta.r},${meta.g},${meta.b},0.65)`, marginTop: 3 }}>{t.sub}</div>
        </div>
      </div>
      <IntensitySelector value={intensity} onChange={setIntensity} lang={lang} />
      <div style={{ flex: 1, position: "relative", minHeight: 0 }}>
        <HeartbeatCanvas onHoldComplete={handleHoldComplete} isCasting={isCasting} color={canvasColor} hintText={hintText} holdDuration={2600} baseRScale={0.28} bgColor={BG} />
        <TheatricalOrbit intensity={intensity} />
      </div>
      <div style={{ flexShrink: 0, padding: `8px 20px max(20px,env(safe-area-inset-bottom))`, textAlign: "center", position: "relative", zIndex: 10 }}>
        <span style={{ fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif", fontWeight: 300, fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: TEXT_T }}>touché</span>
      </div>
      {phase === "revealed" && (
        <RoleCard title={revealTitle} roleText={revealRoleText} intensity={revealIntensity} lang={lang} notified={notified} onComplete={handleComplete} onHideCard={handleCardBack} isMissed={isMissed} topPadding={topPadding} />
      )}
    </div>
  );
}
