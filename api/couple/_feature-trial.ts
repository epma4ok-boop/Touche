import type { SupabaseClient } from "@supabase/supabase-js";
import { OWNER_TELEGRAM_ID } from "../../src/config.js";
import { appDate } from "../limits.js";

const FEATURES = new Set(["tarot", "pose_ball", "dice", "strip"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

export async function handleFeatureTrial(
  supabase: SupabaseClient,
  userId: number,
  input: unknown,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const body = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const feature = String(body.feature ?? "");
  if (!FEATURES.has(feature)) return { status: 400, body: { error: "invalid_feature" } };
  const requestId = String(body.requestId ?? "");
  if (!UUID.test(requestId)) return { status: 400, body: { error: "invalid_request_id" } };

  try {
    let premium = userId === OWNER_TELEGRAM_ID;
    if (!premium) {
      const { data, error } = await supabase
        .from("user_subscriptions")
        .select("expires_at")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      premium = !!data?.expires_at && new Date(data.expires_at).getTime() > Date.now();
    }

    const { data, error } = await supabase.rpc("consume_feature_daily_trial", {
      p_user_id: userId,
      p_feature_key: feature,
      p_app_date: appDate(),
      p_request_id: requestId,
      p_is_premium: premium,
    });
    if (error) throw error;
    if (!data || typeof data.allowed !== "boolean") throw new Error("invalid_trial_response");
    return {
      status: 200,
      body: {
        ok: true,
        allowed: data.allowed,
        unlimited: data.unlimited === true,
        used: data.used === true,
        feature,
      },
    };
  } catch {
    return { status: 500, body: { error: "feature_usage_unavailable" } };
  }
}
