// api/limits/use.ts
// POST /api/limits/use
// Body: { category: string }
// Subscription-aware: paid categories require an active subscription.
// Returns { ok: true, remaining: number } or 403 if limit exceeded / not subscribed.

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { validateTelegramInitData } from "../couple/_auth.js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const FREE_LIMIT      = 1;
const PAID_CATEGORIES = ["passion", "hard"];

function getTodayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

async function hasActiveSubscription(userId: number): Promise<boolean> {
  const { data } = await supabase
    .from("user_subscriptions")
    .select("expires_at")
    .eq("user_id", userId)
    .maybeSingle();
  return data ? new Date(data.expires_at) > new Date() : false;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "https://t.me");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-telegram-init-data");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const initData = req.headers["x-telegram-init-data"] as string;
  const caller = validateTelegramInitData(initData, process.env.BOT_TOKEN!);
  if (!caller) return res.status(401).json({ error: "Unauthorized" });

  const { category } = req.body as { category: string };
  if (!category) return res.status(400).json({ error: "category required" });

  const isPaidCategory = PAID_CATEGORIES.includes(category);
  if (isPaidCategory) {
    const subscribed = await hasActiveSubscription(caller.id);
    if (!subscribed) {
      return res.status(403).json({ error: "subscription_required", remaining: 0 });
    }
  }

  const today = getTodayStr();
  const { data, error } = await supabase.rpc("use_task_limit", {
    p_user_id:   caller.id,
    p_category:  category,
    p_date:      today,
    p_free_limit: FREE_LIMIT,
  });

  if (error) return res.status(500).json({ error: error.message });

  if (!data?.allowed) {
    return res.status(403).json({ error: "limit_exceeded", remaining: 0 });
  }

  return res.status(200).json({ ok: true, remaining: data.remaining });
}
