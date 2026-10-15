type AnalyticsEventName = "app_open" | "screen_view" | "task_generated";
type AnalyticsScreen = "home" | "category" | "scenario" | "shared_task_error";

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
