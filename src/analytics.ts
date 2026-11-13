type AnalyticsEventName =
  | "app_open"
  | "screen_view"
  | "task_generated"
  | "language_selected"
  | "onboarding_completed"
  | "gender_selected";
type AnalyticsScreen =
  | "language"
  | "onboarding"
  | "gender"
  | "home"
  | "category"
  | "scenario"
  | "shared_task_error";
type Lang = "ru" | "en" | "hi" | "pt" | "es";

let sessionId: string | null = null;

function getSessionId(): string {
  if (sessionId) return sessionId;
  try {
    const saved = sessionStorage.getItem("touche_analytics_session");
    if (saved && /^[0-9a-f-]{36}$/i.test(saved)) {
      sessionId = saved;
      return saved;
    }
  } catch {}
  sessionId = crypto.randomUUID();
  try {
    sessionStorage.setItem("touche_analytics_session", sessionId);
  } catch {}
  return sessionId;
}

export function trackAnalyticsEvent(
  eventName: AnalyticsEventName,
  screen?: AnalyticsScreen,
): void {
  const initData = window.Telegram?.WebApp?.initData;
  if (!initData) return;

  const params = new URLSearchParams(window.location.search);
  const utm = {
    utm_source: params.get("utm_source") ?? "",
    utm_medium: params.get("utm_medium") ?? "",
    utm_campaign: params.get("utm_campaign") ?? "",
  };

  void fetch("/api/couple/intimacy?action=analytics", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-telegram-init-data": initData,
    },
    body: JSON.stringify({
      event_name: eventName,
      session_id: getSessionId(),
      screen,
      ...utm,
    }),
    keepalive: true,
  }).catch(() => {});
}

export function saveLanguagePreference(lang: Lang): void {
  const telegram = window.Telegram?.WebApp;
  if (!telegram?.initData) return;

  void fetch("/api/couple/intimacy?action=language", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-telegram-init-data": telegram.initData,
    },
    body: JSON.stringify({ lang }),
    keepalive: true,
  }).catch(() => {});
}
