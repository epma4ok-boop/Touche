import { useState, useCallback, useEffect } from "react";
import { type Lang } from "@/data/i18n";
import type { Gender } from "@/components/GenderSelect";
import { BOT_USERNAME, TELEGRAM_MINI_APP_SHORT_NAME } from "@/config";
import HeartbeatCanvas from "@/components/HeartbeatCanvas";
import type { SharedPairState } from "@/data/sharedPair";
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
  intensity: Intensity; notified: boolean; pairState?: SharedPairState;
}
function getActiveScenario(): ActiveScenario | null {
  try { const raw = localStorage.getItem(getActiveScenarioStorageKey()); return raw ? JSON.parse(raw) as ActiveScenario : null; } catch { return null; }
}
function saveActiveScenario(s: ActiveScenario) { try { localStorage.setItem(getActiveScenarioStorageKey(), JSON.stringify(s)); } catch { /* storage can be unavailable in Telegram */ } }
function clearActiveScenario() { try { localStorage.removeItem(getActiveScenarioStorageKey()); } catch { /* storage can be unavailable in Telegram */ } }
function getCoupleId() { try { return localStorage.getItem(COUPLE_KEY); } catch { return null; } }
function getInitData() { return (window as any).Telegram?.WebApp?.initData ?? ""; }

async function fetchScenarioState(sessionId: string): Promise<{
  state: SharedPairState;
  myCompleted: boolean;
  partnerCompleted: boolean;
} | null> {
  const initData = getInitData();
  if (!initData) return null;
  try {
    const response = await fetch(`/api/couple/intimacy?action=scenario&session_id=${encodeURIComponent(sessionId)}`, {
      headers: { "x-telegram-init-data": initData },
    });
    if (!response.ok) return null;
    const data = await response.json();
    if (!["ready", "waiting_for_partner", "your_turn", "completed"].includes(data.state)) return null;
    return { state: data.state as SharedPairState, myCompleted: data.myCompleted === true, partnerCompleted: data.partnerCompleted === true };
  } catch {
    return null;
  }
}

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

const SCENARIO_PAIR_COPY: Record<Lang, {
  markRole: string; confirmTogether: string; waiting: string; completed: string;
  statusReady: string; statusWaiting: string; statusYourTurn: string; statusCompleted: string;
  saving: string; completionError: string;
}> = {
  ru: { markRole: "Подтвердить свою роль", confirmTogether: "Подтвердить завершение вместе", waiting: "Ждём партнёра", completed: "Сценарий завершён вместе", statusReady: "После обеих подтверждений индекс близости обновится.", statusWaiting: "Партнёр получит уведомление, когда придёт его очередь.", statusYourTurn: "Партнёр уже подтвердил свою роль. Подтвердите завершение вместе.", statusCompleted: "Баллы добавлены в общий индекс близости.", saving: "Сохраняем…", completionError: "Не удалось сохранить подтверждение. Попробуйте ещё раз." },
  en: { markRole: "Confirm my role is complete", confirmTogether: "Confirm we finished together", waiting: "Waiting for your partner", completed: "Scenario completed together", statusReady: "Your Intimacy Index updates after both partners confirm.", statusWaiting: "Your partner will be notified when it is their turn.", statusYourTurn: "Your partner confirmed their role. Confirm to finish together.", statusCompleted: "Points have been added to your shared index.", saving: "Saving…", completionError: "Could not save your confirmation. Please try again." },
  hi: { markRole: "मेरी भूमिका पूरी होने की पुष्टि करें", confirmTogether: "साथ में पूरा होने की पुष्टि करें", waiting: "साथी की प्रतीक्षा", completed: "दृश्य साथ में पूरा हुआ", statusReady: "दोनों की पुष्टि के बाद निकटता सूचकांक अपडेट होगा।", statusWaiting: "साथी की बारी आने पर उन्हें सूचना मिलेगी।", statusYourTurn: "साथी ने पुष्टि की। साथ में पूरा करने की पुष्टि करें।", statusCompleted: "अंक साझा सूचकांक में जुड़ गए।", saving: "सहेज रहे हैं…", completionError: "पुष्टि सहेजी नहीं जा सकी। फिर प्रयास करें।" },
  pt: { markRole: "Confirmar que concluí meu papel", confirmTogether: "Confirmar que terminamos juntos", waiting: "Aguardando seu parceiro", completed: "Cenário concluído em conjunto", statusReady: "O índice atualiza depois que ambos confirmarem.", statusWaiting: "Seu parceiro será avisado quando chegar a vez dele.", statusYourTurn: "Seu parceiro confirmou. Confirmem juntos para concluir.", statusCompleted: "Os pontos foram adicionados ao índice compartilhado.", saving: "Salvando…", completionError: "Não foi possível salvar a confirmação. Tente novamente." },
  es: { markRole: "Confirmar que terminé mi papel", confirmTogether: "Confirmar que lo terminamos juntos", waiting: "Esperando a tu pareja", completed: "Escenario completado en pareja", statusReady: "El índice se actualiza cuando ambos confirman.", statusWaiting: "Avisaremos a tu pareja cuando sea su turno.", statusYourTurn: "Tu pareja confirmó. Confirmen juntos para terminar.", statusCompleted: "Los puntos se añadieron al índice compartido.", saving: "Guardando…", completionError: "No se pudo guardar la confirmación. Inténtalo de nuevo." },
};

function NoPartner({ lang, onInvite, onBack }: { lang: Lang; onInvite: () => void; onBack: () => void }) {
  const t = T[lang]; const top = useTelegramTopInset();
  return <main className="scenario-pop no-partner" style={{ paddingTop: top }}>
    <button className="pop-back" style={{ top }} onClick={onBack} data-testid="button-scenarios-back">{t.back}</button>
    <div className="no-partner-art" aria-hidden="true"><span>♥</span></div>
    <div className="no-partner-copy"><span className="pop-eyebrow">{t.title}</span><h1>{t.noPartner}</h1><p>{t.noPartnerSub}</p><button className="pop-primary" onClick={onInvite} data-testid="button-invite-partner">{t.invite}<b>→</b></button></div>
  </main>;
}

function RoleCard({ title, roleText, intensity, lang, notified, isMissed, pairState, isSaving, completionError, onComplete, onHideCard, topPadding }: { title: string; roleText: string; intensity: Intensity; lang: Lang; notified: boolean; isMissed?: boolean; pairState: SharedPairState; isSaving: boolean; completionError: string | null; onComplete: () => void; onHideCard: () => void; topPadding: string }) {
  const t = T[lang]; const meta = INTENSITY_META[intensity]; const labels = meta.labels[lang] ?? meta.labels.en;
  const pairCopy = SCENARIO_PAIR_COPY[lang];
  const actionLabel = isSaving
    ? pairCopy.saving
    : pairState === "waiting_for_partner"
      ? pairCopy.waiting
      : pairState === "completed"
        ? pairCopy.completed
        : pairState === "your_turn"
          ? pairCopy.confirmTogether
          : pairCopy.markRole;
  const statusLabel = pairState === "waiting_for_partner"
    ? pairCopy.statusWaiting
    : pairState === "completed"
      ? pairCopy.statusCompleted
      : pairState === "your_turn"
        ? pairCopy.statusYourTurn
        : pairCopy.statusReady;
  const [visible, setVisible] = useState(false);
  useEffect(() => { const timer = setTimeout(() => setVisible(true), 160); return () => clearTimeout(timer); }, []);
  return <section className={`scenario-pop role-overlay ${meta.tone}`} style={{ paddingTop: topPadding }}>
    <div className="role-top"><button className="pop-back" onClick={onHideCard} data-testid="button-role-back">{t.back}</button>{isMissed && <span className="pop-status">{t.missed}</span>}</div>
    <div className={`role-content ${visible ? "is-visible" : ""}`}><span className="pop-eyebrow">{labels.sub}</span><h1 data-testid="text-scenario-title">{title}</h1><div className="role-rule"><span>{t.yourRole}</span></div><div className="role-text" data-testid="text-role-content">{roleText}</div></div>
    <div className={`role-bottom ${visible ? "is-visible" : ""}`}><div className="partner-note"><strong>{notified ? t.partnerSent : t.partnerPending}</strong><span>{notified ? t.partnerWait : t.partnerPending}</span></div><p data-testid="status-scenario-pair" role="status" style={{ margin: "10px 0 0", fontSize: 11, lineHeight: 1.45, opacity: 0.78 }}>{statusLabel}</p>{completionError && <p data-testid="status-scenario-completion-error" role="alert" style={{ margin: "6px 0 0", fontSize: 11, lineHeight: 1.4 }}>{completionError}</p>}<span className="ai-label">{t.aiLabel}</span><button className="pop-primary role-complete" onClick={pairState === "waiting_for_partner" || pairState === "completed" ? onHideCard : onComplete} disabled={isSaving} data-testid="button-complete-scenario">{actionLabel}<b>→</b></button></div>
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
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [pairState, setPairState] = useState<SharedPairState>("ready");
  const [completionBusy, setCompletionBusy] = useState(false);
  const [completionError, setCompletionError] = useState<string | null>(null);
  const t = T[lang]; const topPadding = useTelegramTopInset();
  useEffect(() => {
    requestAnimationFrame(() => setMounted(true));
    const saved = getActiveScenario();
    if (saved) {
      setRevealTitle(saved.title); setRevealRoleText(saved.roleText); setRevealIntensity(saved.intensity ?? "passion");
      setNotified(saved.notified); setIntensity(saved.intensity ?? "passion"); setIsMissed(saved.role === "b");
      setPairState(saved.pairState ?? "ready"); setSessionId(saved.sessionId || null); setPhase("revealed");
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
            pairState: "ready",
          };
          saveActiveScenario(pending);
          setRevealTitle(pending.title);
          setRevealRoleText(pending.roleText);
          setRevealIntensity(pending.intensity);
          setIntensity(pending.intensity);
          setNotified(false);
          setIsMissed(true);
          setPairState("ready");
          setSessionId(pending.sessionId);
          setPhase("revealed");
          return pending;
        }).catch(() => {});
      }
    }
  }, []);
  useEffect(() => {
    if (!sessionId) return;
    let active = true;
    const refresh = async () => {
      const status = await fetchScenarioState(sessionId);
      if (!active || !status) return;
      setPairState(status.state);
      const saved = getActiveScenario();
      if (saved?.sessionId === sessionId) saveActiveScenario({ ...saved, pairState: status.state });
    };
    const refreshWhenVisible = () => { if (document.visibilityState === "visible") void refresh(); };
    void refresh();
    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    const timer = window.setInterval(refreshWhenVisible, 20_000);
    return () => {
      active = false;
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      window.clearInterval(timer);
    };
  }, [sessionId]);
  useEffect(() => setHintText(T[lang].holdHint), [lang]);
   const handleInvite = useCallback(() => { const tg = (window as any).Telegram?.WebApp; const userId = tg?.initDataUnsafe?.user?.id; if (userId && tg?.openTelegramLink) { const msg = lang === "ru" ? "Присоединяйся ко мне в Touché — сценарии для пар" : lang === "hi" ? "Touché में शामिल हों — जोड़ों के लिए दृश्य" : lang === "pt" ? "Junte-se a mim no Touché — cenários para casais" : lang === "es" ? "Únete a mí en Touché — escenarios para parejas" : "Join me on Touché — scenarios for couples"; const link = `https://t.me/${BOT_USERNAME}/${TELEGRAM_MINI_APP_SHORT_NAME}?startapp=ref_${userId}`; tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(msg)}`); } }, [lang]);
  const handleHoldComplete = useCallback(async () => {
    if (isCasting) return; const coupleId = getCoupleId(); if (!coupleId) { setPhase("no_partner"); return; }
    const tg = (window as any).Telegram?.WebApp; tg?.HapticFeedback?.impactOccurred("medium"); setIsCasting(true); setHintText(T[lang].casting);
    try { const res = await fetch("/api/scenario/generate", { method: "POST", headers: { "Content-Type": "application/json", "x-telegram-init-data": getInitData() }, body: JSON.stringify({ coupleId, lang, intensity, gender }) }); if (!res.ok) { const body = await res.json().catch(() => ({})); setErrorKind(res.status === 403 && body.error === "subscription_required" ? "subscription_required" : res.status === 429 ? "rate_limited" : "unknown"); return; } const data = await res.json(); const title = data.title ?? ""; const roleText = data.roleA ?? ""; const isNotified = data.notified ?? false; const newSessionId = String(data.sessionId ?? ""); setRevealTitle(title); setRevealRoleText(roleText); setRevealIntensity(intensity); setNotified(isNotified); setPairState("ready"); setCompletionError(null); setSessionId(newSessionId || null); tg?.HapticFeedback?.notificationOccurred("success"); saveActiveScenario({ sessionId: newSessionId, role: "a", roleText, title, intensity, notified: isNotified, pairState: "ready" }); setPhase("revealed"); } catch { setErrorKind("unknown"); } finally { setIsCasting(false); setHintText(T[lang].holdHint); }
  }, [isCasting, lang, intensity, gender]);
  const handleComplete = useCallback(async () => {
    if (!sessionId || completionBusy) return;
    setCompletionBusy(true);
    setCompletionError(null);
    try {
      const response = await fetch("/api/couple/intimacy?action=complete_scenario", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-telegram-init-data": getInitData() },
        body: JSON.stringify({ session_id: sessionId, lang }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !["waiting_for_partner", "completed"].includes(result.state)) throw new Error(result.error ?? "completion_failed");
      const nextState = result.state as SharedPairState;
      setPairState(nextState);
      const saved = getActiveScenario();
      if (saved?.sessionId === sessionId) saveActiveScenario({ ...saved, pairState: nextState });
      window.dispatchEvent(new CustomEvent("touche-intimacy-updated"));
    } catch {
      setCompletionError(SCENARIO_PAIR_COPY[lang].completionError);
    } finally {
      setCompletionBusy(false);
    }
  }, [completionBusy, lang, sessionId]);
  const handleHideCard = useCallback(() => {
    if (pairState === "completed") {
      clearActiveScenario();
      setSessionId(null);
      setRevealTitle("");
      setRevealRoleText("");
      setIsMissed(false);
    }
    setPhase("idle");
  }, [pairState]);
  if (phase === "no_partner") return <NoPartner lang={lang} onInvite={handleInvite} onBack={onBack} />;
  const tone = INTENSITY_META[intensity].tone;
  return <main className={`scenario-pop scenario-main ${tone}`} style={{ paddingTop: topPadding, opacity: mounted ? 1 : 0 }}>
    <header className="scenario-header"><button className="pop-back" onClick={onBack} data-testid="button-scenarios-back">{t.back}</button><div className="scenario-brand">Touch<em>é</em></div><span className="premium-tag">PREMIUM</span></header>
    <section className="scenario-intro"><span className="pop-stamp">{SCENARIO_STAMP[lang]}</span><h1>{t.title}</h1><p>{t.sub}</p><div className="scenario-orb" aria-hidden="true">♥</div></section>
    <IntensitySelector value={intensity} onChange={setIntensity} lang={lang} />
    {intensity !== "romantic" && <p className="adult-note" data-testid="text-adult-notice">{SCENARIO_COPY[lang].adult}</p>}
    <div className="heartbeat-stage"><HeartbeatCanvas onHoldComplete={handleHoldComplete} isCasting={isCasting} color={intensity === "romantic" ? { r: 255, g: 212, b: 93 } : intensity === "passion" ? { r: 255, g: 111, b: 97 } : { r: 62, g: 91, b: 255 }} hintText={hintText} holdDuration={2600} baseRScale={0.28} bgColor="#fffaf3" /></div>
    <footer className="scenario-footer"><span>TOUCHÉ / AI SCENARIO</span></footer>
    {errorKind && <div className="scenario-error" role="alert"><p>{errorKind === "subscription_required" ? SCENARIO_COPY[lang].subscription : errorKind === "rate_limited" ? SCENARIO_COPY[lang].rate : SCENARIO_COPY[lang].unknown}</p>{errorKind === "subscription_required" && onUpgrade && <button className="pop-primary" onClick={onUpgrade}>{SCENARIO_COPY[lang].upgrade}</button>}<button className="error-dismiss" onClick={() => setErrorKind(null)}>{SCENARIO_COPY[lang].dismiss}</button></div>}
     {phase === "revealed" && <RoleCard title={revealTitle} roleText={revealRoleText} intensity={revealIntensity} lang={lang} notified={notified} pairState={pairState} isSaving={completionBusy} completionError={completionError} onComplete={() => { void handleComplete(); }} onHideCard={handleHideCard} isMissed={isMissed} topPadding={topPadding} />}
  </main>;
}