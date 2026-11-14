import type { SupabaseClient } from "@supabase/supabase-js";
import { OWNER_TELEGRAM_ID } from "../src/config.js";

export type EffectivePremiumSource = "owner" | "self" | "partner" | "both" | "none";

export type EffectivePremiumAccess = {
  active: boolean;
  expiresAt: string | null;
  source: EffectivePremiumSource;
  shared: boolean;
};

type ActiveExpiry = { value: string; timestamp: number } | null;

function getActiveExpiry(value: unknown, now: number): ActiveExpiry {
  const expiresAt = value instanceof Date
    ? value.toISOString()
    : typeof value === "string" ? value : null;
  if (!expiresAt) return null;

  const timestamp = Date.parse(expiresAt);
  return Number.isFinite(timestamp) && timestamp > now
    ? { value: expiresAt, timestamp }
    : null;
}

/**
 * Premium belongs to the account that purchased it and is shared with that
 * account's currently linked partner. The owner override is never inherited.
 */
export async function getEffectivePremiumAccess(
  supabase: SupabaseClient,
  userId: number,
  now = Date.now(),
): Promise<EffectivePremiumAccess> {
  if (userId === OWNER_TELEGRAM_ID) {
    return { active: true, expiresAt: null, source: "owner", shared: false };
  }

  const [ownSubscription, coupleLookup] = await Promise.all([
    supabase
      .from("user_subscriptions")
      .select("expires_at")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("couples")
      .select("user_a_id,user_b_id")
      .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`)
      .limit(2),
  ]);

  if (ownSubscription.error || coupleLookup.error) {
    throw new Error("premium_access_lookup_failed");
  }

  const couples = coupleLookup.data ?? [];
  if (couples.length > 1) {
    throw new Error("multiple_active_couples");
  }

  const ownExpiry = getActiveExpiry(ownSubscription.data?.expires_at, now);
  const couple = couples[0];
  const partnerId = couple
    ? couple.user_a_id === userId ? couple.user_b_id : couple.user_a_id
    : null;

  let partnerExpiry: ActiveExpiry = null;
  if (partnerId !== null && partnerId !== OWNER_TELEGRAM_ID) {
    const { data, error } = await supabase
      .from("user_subscriptions")
      .select("expires_at")
      .eq("user_id", partnerId)
      .maybeSingle();
    if (error) throw new Error("partner_premium_lookup_failed");
    partnerExpiry = getActiveExpiry(data?.expires_at, now);
  }

  const latestExpiry = [ownExpiry, partnerExpiry]
    .filter((expiry): expiry is NonNullable<ActiveExpiry> => expiry !== null)
    .sort((a, b) => b.timestamp - a.timestamp)[0] ?? null;

  const source: EffectivePremiumSource = ownExpiry && partnerExpiry
    ? "both"
    : ownExpiry ? "self"
      : partnerExpiry ? "partner" : "none";

  return {
    active: latestExpiry !== null,
    expiresAt: latestExpiry?.value ?? null,
    source,
    shared: partnerExpiry !== null,
  };
}
