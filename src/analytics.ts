export type AnalyticsEventName =
  | "app_open"
  | "screen_view"
  | "task_generated"
  | "language_selected"
  | "onboarding_completed"
  | "gender_selected"
  | "button_tap"
  | "paywall_viewed"
  | "payment_cancelled"
  | "payment_failed";
export type AnalyticsScreen =
  | "language"
  | "onboarding"
  | "gender"
  | "home"
  | "category"
  | "scenario"
  | "shared_task_error"
  | "games"
  | "tarot"
  | "love_path"
  | "subscription";
type Lang = "ru" | "en" | "hi" | "pt" | "es";

export type AnalyticsAction =
  | "open_menu"
  | "open_tasks"
  | "open_tarot"
  | "open_games"
  | "invite_partner"
  | "mode_solo"
  | "mode_together"
  | "open_love_path"
  | "open_premium"
  | "subscribe_premium"
  | "buy_extra_task";
export type AnalyticsProduct = "premium_subscription" | "extra_task";
export type AnalyticsErrorCode =
  | "invoice_generation_failed"
  | "invoice_request_failed"
  | "telegram_payment_failed"
  | "payment_processing_failed"
  | "payment_validation_failed";

export interface AnalyticsDetails {
  actionKey?: AnalyticsAction;
  productKey?: AnalyticsProduct;
  attemptId?: string;
  errorCode?: AnalyticsErrorCode;
}

let sessionId: string | null = null;
let clickTrackingInstalled = false;

export function getAnalyticsSessionId(): string {
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

export function createAnalyticsAttemptId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

const CLICK_ACTIONS: Record<string, AnalyticsAction> = {
  "button-open-menu": "open_menu",
  "button-open-tasks": "open_tasks",
  "button-open-tarot": "open_tarot",
  "button-open-games": "open_games",
  "button-home-invite": "invite_partner",
  "button-mode-solo": "mode_solo",
  "button-mode-together": "mode_together",
  "button-open-love-path": "open_love_path",
  "button-open-premium": "open_premium",
  "button-subscribe-premium": "subscribe_premium",
};

export function installAnalyticsClickTracking(): void {
  if (clickTrackingInstalled || typeof document === "undefined") return;
  clickTrackingInstalled = true;
  document.addEventListener("click", (event) => {
    const target = event.target instanceof Element
      ? event.target.closest<HTMLElement>("[data-testid]")
      : null;
    const testId = target?.dataset.testid;
    const actionKey = testId ? CLICK_ACTIONS[testId] : undefined;
    if (actionKey) {
      trackAnalyticsEvent("button_tap", undefined, { actionKey });
    }
  }, true);
}

export function trackAnalyticsEvent(
  eventName: AnalyticsEventName,
  screen?: AnalyticsScreen,
  details: AnalyticsDetails = {},
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
      session_id: getAnalyticsSessionId(),
      screen,
      action_key: details.actionKey,
      product_key: details.productKey,
      attempt_id: details.attemptId,
      error_code: details.errorCode,
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
