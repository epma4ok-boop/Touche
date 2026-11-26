import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PAYMENT_ATTEMPT = /^(?:[0-9a-f]{24}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

type PaymentAnalyticsEvent =
  | "payment_started"
  | "invoice_created"
  | "payment_succeeded"
  | "payment_failed"
  | "entitlement_granted";
type PaymentAnalyticsProduct = "premium_subscription" | "extra_task";
type PaymentAnalyticsError =
  | "invoice_generation_failed"
  | "payment_processing_failed"
  | "payment_validation_failed";

export async function recordPaymentAnalytics(input: {
  userId: number;
  sessionId?: unknown;
  attemptId?: unknown;
  eventName: PaymentAnalyticsEvent;
  productKey: PaymentAnalyticsProduct;
  errorCode?: PaymentAnalyticsError;
}): Promise<void> {
  if (
    !Number.isSafeInteger(input.userId)
    || input.userId <= 0
    || typeof input.attemptId !== "string"
    || !PAYMENT_ATTEMPT.test(input.attemptId)
  ) return;

  try {
    let sessionId = typeof input.sessionId === "string" && UUID.test(input.sessionId)
      ? input.sessionId
      : null;
    if (!sessionId) {
      const { data, error } = await supabase
        .from("analytics_events")
        .select("session_id")
        .eq("attempt_id", input.attemptId)
        .eq("user_id", input.userId)
        .in("event_name", ["payment_started", "invoice_created"])
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) {
        console.error("Payment analytics session lookup failed:", error.code);
        return;
      }
      sessionId = typeof data?.session_id === "string" && UUID.test(data.session_id)
        ? data.session_id
        : null;
    }
    if (!sessionId) return;

    const { error } = await supabase.from("analytics_events").insert({
      session_id: sessionId,
      user_id: input.userId,
      event_name: input.eventName,
      screen: null,
      action_key: null,
      product_key: input.productKey,
      attempt_id: input.attemptId,
      error_code: input.errorCode ?? null,
      source: "direct",
    });
    if (error) {
      console.error("Payment analytics insert failed:", error.code);
    }
  } catch (error) {
    console.error(
      "Payment analytics write threw:",
      error instanceof Error ? error.name : "unknown_error",
    );
  }
}
