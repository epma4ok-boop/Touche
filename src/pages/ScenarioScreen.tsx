import { useState, useCallback, useEffect } from "react";
import { type Lang } from "@/data/i18n";
import type { Gender } from "@/components/GenderSelect";
import { BOT_USERNAME, TELEGRAM_MINI_APP_SHORT_NAME } from "@/config";
import HeartbeatCanvas from "@/components/HeartbeatCanvas";
import "./ScenarioPop.css";

const COUPLE_KEY = "touche_couple_id";
export const ACTIVE_SCENARIO_KEY = "touche_active_scenario";
export function getActiveScenarioStorageKey(userId?: string | number): string {
  const telegramUserId = (window as any).Telegram?.WebApp?.initDataUnsafe?.user?.id;
  return `${ACTIVE_SCENARIO_KEY}:${String(userId ?? telegramUserId ?? "unknown")}`;
}
type Intensity = "romantic" | "passion" | "hard";
type Phase = "idle" | "revealed" | "no_partner";
type ErrorKind = "subscription_required" | "rate_limited" | "unknown";

export interface ActiveScenario {
  sessionId: string; role: "a" | "b"; roleText: string; title: string;
  intensity: Intensity; notified: boolean;
}
function getActiveScenario(): ActiveScenario | null {
  try { const raw = localStorage.getItem(getActiveScenarioStorageKey()); return raw ? JSON.parse(raw) as ActiveScenario : null; } catch { return null; }
}
function saveActiveScenario(s: ActiveScenario) { try { localStorage.setItem(getActiveScenarioStorageKey(), JSON.stringify(s)); } catch { /* storage can be unavailable in Telegram */ } }
function clearActiveScenario() { try { localStorage.removeItem(getActiveScenarioStorageKey()); } catch { /* storage can be unavailable in Telegram */ } }
function getCoupleId() { try { return localStorage.getItem(COUPLE_KEY); } catch { return null; } }
function getInitData() { return (window as any).Telegram?.WebApp?.initData ?? ""; }

function useTelegramTopInset() {
  const [topPx, setTopPx] = useState(() => (window as any).Telegram?.WebApp ? 96 : 0);
  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    const compute = () => {
      const c = tg?.contentSafeAreaInset?.top ?? 0;
      const s = tg?.safeAreaInset?.top ?? 0;
      setTopPx(tg ? Math.max(96, s + 72, c + s + 16) : 0);
    };
    compute(); tg?.onEvent?.("safeAreaChanged", compute); tg?.onEvent?.("contentSafeAreaInsetChanged", compute);
    const timer = setTimeout(compute, 800);
    return () => { tg?.offEvent?.("safeAreaChanged", compute); tg?.offEvent?.("contentSafeAreaInsetChanged", compute); clearTimeout(timer); };
  }, []);
  return topPx > 0 ? `${topPx}px` : "max(56px, env(safe-area-inset-top))";
}

type IntensityMeta = { labels: Record<string, { label: string; sub: string }>; color: string; tone: string };
const INTENSITY_META: Record<Intensity, IntensityMeta> = {
  romantic: { color: "var(--pop-yellow)", tone: "yellow", labels: { ru: { label: "Романтика", sub: "нежно · интрига" }, en: { label: "Romantic", sub: "tender · intrigue" }, hi: { label: "रोमांटिक", sub: "कोमल · रहस्य" }, pt: { label: "Romântico", sub: "suave · intriga" }, es: { label: "Romántico", sub: "suave · intriga" } } },
  passion: { color: "var(--pop-coral)", tone: "coral", labels: { ru: { label: "Страсть", sub: "чувственно · 18+" }, en: { label: "Passion", sub: "sensual · 18+" }, hi: { label: "जुनून", sub: "भावुक · 18+" }, pt: { label: "Paixão", sub: "sensual · 18+" }, es: { label: "Pasión", sub: "sensual · 18+" } } },
  hard: { color: "var(--pop-blue)", tone: "blue", labels: { ru: { label: "Жёстко", sub: "откровенно · 18+" }, en: { label: "Hard", sub: "explicit · 18+" }, hi: { label: "साहसिक", sub: "खुलकर · 18+" }, pt: { label: "Intenso", sub: "explícito · 18+" }, es: { label: "Intenso", sub: "explícito · 18+" } } },
};

const T: Record<Lang, { title: string; sub: string; holdHint: string; casting: string; back: string; noPartner: string; noPartnerSub: string; invite: string; yourRole: string; partnerSent: string; partnerWait: string; partnerPending: string; complete: string; aiLabel: string; missed: string }> = {
  en: { title: "Scenarios", sub: "roleplay · for two", holdHint: "HOLD · DRAW YOUR SCENARIO", casting: "GENERATING...", back: "← back", noPartner: "No partner linked yet", noPartnerSub: "Invite your partner first — so you both get complementary roles tonight.", invite: "Invite partner", yourRole: "YOUR ROLE", partnerSent: "Your partner received their role", partnerWait: "They got a Telegram notification with their card", partnerPending: "Partner will see their role when they open the app", complete: "Task completed", aiLabel: "AI SCENARIO", missed: "missed" },
  ru: { title: "Сценарии", sub: "ролевые · на двоих", holdHint: "ДЕРЖИ · ТЯНИ СЦЕНАРИЙ", casting: "ГЕНЕРИРУЕМ...", back: "← назад", noPartner: "Партнёр ещё не подключён", noPartnerSub: "Сначала пригласи партнёра — чтобы у вас были разные роли одного сценария.", invite: "Пригласить партнёра", yourRole: "ТВОЯ РОЛЬ", partnerSent: "Партнёр получил свою роль", partnerWait: "Ему пришло уведомление в Telegram с его карточкой", partnerPending: "Партнёр увидит роль при следующем открытии", complete: "Задание выполнено", aiLabel: "AI СЦЕНАРИЙ", missed: "пропущено" },
  hi: { title: "दृश्य", sub: "रोलप्ले · दो के लिए", holdHint: "दबाएं · दृश्य खींचें", casting: "तैयार हो रहा है...", back: "← वापस", noPartner: "साथी अभी नहीं जुड़ा", noPartnerSub: "पहले साथी को आमंत्रित करें — ताकि आप दोनों को पूरक भूमिकाएं मिलें।", invite: "साथी को आमंत्रित करें", yourRole: "आपकी भूमिका", partnerSent: "साथी को उनकी भूमिका मिल गई", partnerWait: "उन्हें Telegram पर उनका कार्ड मिला", partnerPending: "साथी अगली बार ऐप खोलने पर भूमिका देखेंगे", complete: "कार्य पूरा हुआ", aiLabel: "AI दृश्य", missed: "चूका" },
  pt: { title: "Cenários", sub: "roleplay · para dois", holdHint: "SEGURE · SORTEAR CENÁRIO", casting: "GERANDO...", back: "← voltar", noPartner: "Parceiro ainda não conectado", noPartnerSub: "Convide seu parceiro primeiro — para que vocês dois recebam papéis complementares.", invite: "Convidar parceiro", yourRole: "SEU PAPEL", partnerSent: "Seu parceiro recebeu o papel dele", partnerWait: "Ele recebeu uma notificação no Telegram com o cartão", partnerPending: "O parceiro verá o papel quando abrir o app", complete: "Tarefa concluída", aiLabel: "CENÁRIO IA", missed: "perdida" },
  es: { title: "Escenarios", sub: "roleplay · para dos", holdHint: "MANTÉN · SORTEAR ESCENARIO", casting: "GENERANDO...", back: "← atrás", noPartner: "Pareja aún no conectada", noPartnerSub: "Invita a tu pareja primero — para que ambos reciban roles complementarios.", invite: "Invitar pareja", yourRole: "TU ROL", partnerSent: "Tu pareja recibió su rol", partnerWait: "Recibió una notificación de Telegram con su tarjeta", partnerPending: "La pareja verá su rol cuando abra la app", complete: "Tarea completada", aiLabel: "ESCENARIO IA", missed: "perdida" },
};
const ROLE_PRIVATE_COPY: Record<Lang, string> = {
  en: "Your partner has a separate private role card.",
  ru: "У партнёра есть своя отдельная закрытая карточка.",
  hi: "आपके साथी के पास उनकी अलग निजी भूमिका वाली कार्ड है।",
  pt: "Seu parceiro tem um cartão de papel privado e separado.",
  es: "Tu pareja tiene una tarjeta de rol privada e independiente.",
};
const SCENARIO_COPY: Record<Lang, { adult: string; subscription: string; rate: string; unknown: string; upgrade: string; dismiss: string }> = {
  ru: { adult: "18+. Все персонажи взрослые. Игровое сопротивление — только роль; настоящий стоп сразу останавливает сцену.", subscription: "Сценарии доступны в Premium.", rate: "Слишком много запросов. Попробуйте позже.", unknown: "Не удалось создать сценарий. Попробуйте ещё раз.", upgrade: "Открыть Premium", dismiss: "Понятно" },
  en: { adult: "18+. All characters are adults. Resistance is acted; a real stop ends the scene immediately.", subscription: "Scenarios are available in Premium.", rate: "Too many requests. Try again later.", unknown: "Could not create a scenario. Try again.", upgrade: "Open Premium", dismiss: "Dismiss" },
  hi: { adult: "18+. सभी पात्र वयस्क हैं। विरोध केवल अभिनय है; असली रोकने का संकेत मिलते ही दृश्य रुकता है।", subscription: "दृश्य Premium में उपलब्ध हैं।", rate: "बहुत अधिक अनुरोध। बाद में प्रयास करें।", unknown: "दृश्य नहीं बन सका। फिर प्रयास करें।", upgrade: "Premium खोलें", dismiss: "समझ गया" },
  pt: { adult: "18+. Todas as personagens são adultas. A resistência é encenada; um pedido real para parar encerra a cena imediatamente.", subscription: "Cenários estão disponíveis no Premium.", rate: "Muitas solicitações. Tente mais tarde.", unknown: "Não foi possível criar o cenário. Tente novamente.", upgrade: "Abrir Premium", dismiss: "Entendi" },
  es: { adult: "18+. Todos los personajes son adultos. La resistencia es actuada; una petición real para parar termina la escena de inmediato.", subscription: "Los escenarios están disponibles en Premium.", rate: "Demasiadas solicitudes. Inténtalo más tarde.", unknown: "No se pudo crear el escenario. Inténtalo de nuevo.", upgrade: "Abrir Premium", dismiss: "Entendido" },
};
const SCENARIO_STAMP: Record<Lang, string> = {
  ru: "ДЛЯ ДВОИХ · 18+", en: "FOR TWO · 18+", hi: "दो के लिए · 18+",
  pt: "PARA DOIS · 18+", es: "PARA DOS · 18+",
};
type RoleSectionKey = "task" | "role" | "firstMove";
type RoleSections = Record<RoleSectionKey, string>;
const ROLE_SECTION_COPY: Record<Lang, { task: string; role: string; firstMove: string; legacy: string }> = {
  ru: { task: "ТВОЁ ЗАДАНИЕ", role: "ТВОЯ РОЛЬ", firstMove: "С ЧЕГО НАЧАТЬ", legacy: "ТВОЯ РОЛЬ" },
  en: { task: "YOUR TASK", role: "YOUR ROLE", firstMove: "FIRST MOVE", legacy: "YOUR ROLE" },
  hi: { task: "आपका काम", role: "आपकी भूमिका", firstMove: "पहला कदम", legacy: "आपकी भूमिका" },
  pt: { task: "SUA TAREFA", role: "SEU PAPEL", firstMove: "PRIMEIRO PASSO", legacy: "SEU PAPEL" },
  es: { task: "TU TAREA", role: "TU ROL", firstMove: "PRIMER PASO", legacy: "TU ROL" },
};
const ROLE_SECTION_MARKERS: Record<RoleSectionKey, string[]> = {
  task: ["ТВОЁ ЗАДАНИЕ", "ТВОЕ ЗАДАНИЕ", "YOUR TASK", "आपका काम", "SUA TAREFA", "TU TAREA"],
  role: ["ТВОЯ РОЛЬ", "YOUR ROLE", "आपकी भूमिका", "SEU PAPEL", "TU ROL"],
  firstMove: ["ПЕРВЫЙ ШАГ", "FIRST MOVE", "पहला कदम", "PRIMEIRO PASSO", "PRIMER PASO"],
};
function parseRoleSections(text: string): RoleSections | null {
  const normalized = text.replace(/\r\n?/g, "\n").trim();
  const markers = Object.entries(ROLE_SECTION_MARKERS).flatMap(([key, labels]) =>
    labels.map((label) => ({ key: key as RoleSectionKey, label })),
  );
  const markerKeys = new Map(markers.map(({ key, label }) => [label.toLocaleUpperCase(), key]));
  const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const markerPattern = new RegExp(
    `(^|\\n)\\s*(?:[-•]\\s*)?(?:\\*\\*)?(${markers.map(({ label }) => escapeRegExp(label)).join("|")})(?:\\*\\*)?\\s*[:：—–-]\\s*(?:\\*\\*)?`,
    "giu",
  );
  const matches = Array.from(normalized.matchAll(markerPattern));
  if (matches.length !== 3) return null;

  const sections: Partial<RoleSections> = {};
  matches.forEach((match, index) => {
    const key = markerKeys.get(match[2].toLocaleUpperCase());
    if (!key) return;
    const start = (match.index ?? 0) + match[0].length;
    const end = matches[index + 1]?.index ?? normalized.length;
    sections[key] = normalized.slice(start, end).trim();
  });
  if (!sections.task || !sections.role || !sections.firstMove) return null;
  return sections as RoleSections;
}

function NoPartner({ lang, onInvite, onBack }: { lang: Lang; onInvite: () => void; onBack: () => void }) {
  const t = T[lang]; const top = useTelegramTopInset();
  return <main className="scenario-pop no-partner" style={{ paddingTop: top }}>
    <button className="pop-back" style={{ top }} onClick={onBack} data-testid="button-scenarios-back">{t.back}</button>
    <div className="no-partner-art" aria-hidden="true"><span>♥</span></div>
    <div className="no-partner-copy"><span className="pop-eyebrow">{t.title}</span><h1>{t.noPartner}</h1><p>{t.noPartnerSub}</p><button className="pop-primary" onClick={onInvite} data-testid="button-invite-partner">{t.invite}<b>→</b></button></div>
  </main>;
}

function RoleCard({ title, roleText, intensity, lang, notified, isMissed, onHideCard, topPadding }: {
  title: string; roleText: string; intensity: Intensity; lang: Lang; notified: boolean; isMissed?: boolean;
  onHideCard: () => void; topPadding: string;
}) {
  const t = T[lang]; const meta = INTENSITY_META[intensity]; const labels = meta.labels[lang] ?? meta.labels.en;
  const roleSections = parseRoleSections(roleText);
  const sectionCopy = ROLE_SECTION_COPY[lang];
  const [visible, setVisible] = useState(false);
  useEffect(() => { const timer = setTimeout(() => setVisible(true), 160); return () => clearTimeout(timer); }, []);
  return <section className={`scenario-pop role-overlay ${meta.tone} ${visible ? "is-revealed" : ""}`} style={{ paddingTop: topPadding }}>
    <div className="role-top"><button className="pop-back" onClick={onHideCard} data-testid="button-role-back">{t.back}</button>{isMissed && <span className="pop-status">{t.missed}</span>}</div>
    <div className={`role-content ${visible ? "is-visible" : ""}`}>
      <div className="role-heading"><span className="pop-eyebrow">{labels.sub}</span><h1 data-testid="text-scenario-title">{title}</h1></div>
      {roleSections ? <div className="role-sections" data-testid="text-role-content">
        <section className="role-task-card" aria-label={sectionCopy.task} data-testid="scenario-task">
          <div className="role-task-label"><span className="role-task-index">01</span>{sectionCopy.task}</div>
          <p className="role-task-copy">{roleSections.task}</p>
        </section>
        <div className="role-support-grid">
          <section className="role-detail-card" aria-label={sectionCopy.role}>
            <span className="role-detail-label">{sectionCopy.role}</span>
            <p>{roleSections.role}</p>
          </section>
          <section className="role-detail-card role-first-card" aria-label={sectionCopy.firstMove}>
            <span className="role-detail-label">{sectionCopy.firstMove}</span>
            <p>{roleSections.firstMove}</p>
          </section>
        </div>
      </div> : <section className="role-task-card role-task-card--legacy" data-testid="text-role-content">
        <div className="role-task-label"><span className="role-task-index">01</span>{sectionCopy.legacy}</div>
        <p className="role-task-copy">{roleText}</p>
      </section>}
    </div>
    <div className={`role-bottom ${visible ? "is-visible" : ""}`}>
      <div className="partner-note">
        {isMissed
          ? <strong>{ROLE_PRIVATE_COPY[lang]}</strong>
          : <>
              <strong>{notified ? t.partnerSent : t.partnerPending}</strong>
              {notified && <span>{t.partnerWait}</span>}
            </>}
      </div>
      <span className="ai-label">{t.aiLabel}</span>
    </div>
  </section>;
}

function IntensitySelector({ value, onChange, lang }: { value: Intensity; onChange: (v: Intensity) => void; lang: Lang }) {
  return <div className="intensity-select">{(["romantic", "passion", "hard"] as Intensity[]).map((key) => { const item = INTENSITY_META[key]; const label = item.labels[lang] ?? item.labels.en; return <button key={key} className={`intensity-item ${item.tone} ${value === key ? "active" : ""}`} onClick={() => onChange(key)} data-testid={`button-intensity-${key}`}><strong>{label.label}</strong><small>{label.sub}</small></button>; })}</div>;
}

interface ScenarioScreenProps { lang: Lang; gender?: Gender; onBack: () => void; onUpgrade?: () => Promise<boolean>; }
export default function ScenarioScreen({ lang, gender, onBack, onUpgrade }: ScenarioScreenProps) {
  const [phase, setPhase] = useState<Phase>(() => getCoupleId() ? "idle" : "no_partner");
  const [intensity, setIntensity] = useState<Intensity>("passion"); const [isCasting, setIsCasting] = useState(false); const [hintText, setHintText] = useState(T[lang].holdHint); const [mounted, setMounted] = useState(false);
  const [revealTitle, setRevealTitle] = useState(""); const [revealRoleText, setRevealRoleText] = useState(""); const [revealIntensity, setRevealIntensity] = useState<Intensity>("passion"); const [notified, setNotified] = useState(false); const [isMissed, setIsMissed] = useState(false); const [errorKind, setErrorKind] = useState<ErrorKind | null>(null);
  const t = T[lang]; const topPadding = useTelegramTopInset();
  useEffect(() => {
    requestAnimationFrame(() => setMounted(true));
    const saved = getActiveScenario();
    if (saved) {
      setRevealTitle(saved.title); setRevealRoleText(saved.roleText); setRevealIntensity(saved.intensity ?? "passion");
      setNotified(saved.notified); setIntensity(saved.intensity ?? "passion"); setIsMissed(saved.role === "b");
      setPhase("revealed");
    } else {
      const coupleId = getCoupleId();
      const initData = getInitData();
      if (coupleId && initData) {
        fetch(`/api/scenario/fetch?type=pending&coupleId=${encodeURIComponent(coupleId)}`, {
          headers: { "x-telegram-init-data": initData },
        }).then(async (response) => {
          if (!response.ok) return null;
          const data = await response.json();
          if (!data.pending || !data.sessionId || !data.roleText) return null;
          const pending: ActiveScenario = {
            sessionId: data.sessionId,
            role: "b",
            roleText: data.roleText,
            title: data.title ?? "",
            intensity: data.intensity ?? "passion",
            notified: false,
          };
          saveActiveScenario(pending);
          setRevealTitle(pending.title);
          setRevealRoleText(pending.roleText);
          setRevealIntensity(pending.intensity);
          setIntensity(pending.intensity);
          setNotified(false);
          setIsMissed(true);
          setPhase("revealed");
          return pending;
        }).catch(() => {});
      }
    }
  }, []);
  useEffect(() => setHintText(T[lang].holdHint), [lang]);
   const handleInvite = useCallback(() => { const tg = (window as any).Telegram?.WebApp; const userId = tg?.initDataUnsafe?.user?.id; if (userId && tg?.openTelegramLink) { const msg = lang === "ru" ? "Присоединяйся ко мне в Touché — сценарии для пар" : lang === "hi" ? "Touché में शामिल हों — जोड़ों के लिए दृश्य" : lang === "pt" ? "Junte-se a mim no Touché — cenários para casais" : lang === "es" ? "Únete a mí en Touché — escenarios para parejas" : "Join me on Touché — scenarios for couples"; const link = `https://t.me/${BOT_USERNAME}/${TELEGRAM_MINI_APP_SHORT_NAME}?startapp=ref_${userId}`; tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(msg)}`); } }, [lang]);
  const handleHoldComplete = useCallback(async () => {
    if (isCasting) return; const coupleId = getCoupleId(); if (!coupleId) { setPhase("no_partner"); return; }
    const tg = (window as any).Telegram?.WebApp; tg?.HapticFeedback?.impactOccurred("medium"); setIsCasting(true); setHintText(T[lang].casting);
     try { const res = await fetch("/api/scenario/generate", { method: "POST", headers: { "Content-Type": "application/json", "x-telegram-init-data": getInitData() }, body: JSON.stringify({ coupleId, lang, intensity, gender }) }); if (!res.ok) { const body = await res.json().catch(() => ({})); setErrorKind(res.status === 403 && body.error === "subscription_required" ? "subscription_required" : res.status === 429 ? "rate_limited" : "unknown"); return; } const data = await res.json(); const title = data.title ?? ""; const roleText = data.roleA ?? ""; const isNotified = data.notified ?? false; const newSessionId = String(data.sessionId ?? ""); setRevealTitle(title); setRevealRoleText(roleText); setRevealIntensity(intensity); setNotified(isNotified); tg?.HapticFeedback?.notificationOccurred("success"); saveActiveScenario({ sessionId: newSessionId, role: "a", roleText, title, intensity, notified: isNotified }); setPhase("revealed"); } catch { setErrorKind("unknown"); } finally { setIsCasting(false); setHintText(T[lang].holdHint); }
  }, [isCasting, lang, intensity, gender]);
  const handleHideCard = useCallback(() => {
    clearActiveScenario();
    setRevealTitle("");
    setRevealRoleText("");
    setIsMissed(false);
    setPhase("idle");
  }, []);
  if (phase === "no_partner") return <NoPartner lang={lang} onInvite={handleInvite} onBack={onBack} />;
  const tone = INTENSITY_META[intensity].tone;
  return <>
    <main className={`scenario-pop scenario-main ${tone}`} style={{ paddingTop: topPadding, opacity: mounted ? 1 : 0 }}>
    <header className="scenario-header"><button className="pop-back" onClick={onBack} data-testid="button-scenarios-back">{t.back}</button><div className="scenario-brand">Touch<em>é</em></div><span className="premium-tag">PREMIUM</span></header>
    <section className="scenario-intro"><span className="pop-stamp">{SCENARIO_STAMP[lang]}</span><h1>{t.title}</h1><p>{t.sub}</p><div className="scenario-orb" aria-hidden="true">♥</div></section>
    <IntensitySelector value={intensity} onChange={setIntensity} lang={lang} />
    {intensity !== "romantic" && <p className="adult-note" data-testid="text-adult-notice">{SCENARIO_COPY[lang].adult}</p>}
    <div className="heartbeat-stage"><HeartbeatCanvas onHoldComplete={handleHoldComplete} isCasting={isCasting} color={intensity === "romantic" ? { r: 255, g: 212, b: 93 } : intensity === "passion" ? { r: 255, g: 111, b: 97 } : { r: 62, g: 91, b: 255 }} hintText={hintText} holdDuration={2600} baseRScale={0.28} bgColor="#fffaf3" /></div>
    <footer className="scenario-footer"><span>TOUCHÉ / AI SCENARIO</span></footer>
    {errorKind && <div className="scenario-error" role="alert"><p>{errorKind === "subscription_required" ? SCENARIO_COPY[lang].subscription : errorKind === "rate_limited" ? SCENARIO_COPY[lang].rate : SCENARIO_COPY[lang].unknown}</p>{errorKind === "subscription_required" && onUpgrade && <button className="pop-primary" onClick={onUpgrade}>{SCENARIO_COPY[lang].upgrade}</button>}<button className="error-dismiss" onClick={() => setErrorKind(null)}>{SCENARIO_COPY[lang].dismiss}</button></div>}
    </main>
    {phase === "revealed" && <RoleCard title={revealTitle} roleText={revealRoleText} intensity={revealIntensity} lang={lang} notified={notified} onHideCard={handleHideCard} isMissed={isMissed} topPadding={topPadding} />}
  </>;
}