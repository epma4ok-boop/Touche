// api/limits/get.ts
// GET /api/limits/get?category=compliments
// Returns remaining tasks for the day.
// Subscription-aware: paid categories (passion, hard) require an active subscription.

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { validateTelegramInitData } from "../couple/_auth.js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const FREE_LIMIT       = 1;
const PAID_CATEGORIES  = ["passion", "hard"];

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
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-telegram-init-data");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const initData = req.headers["x-telegram-init-data"] as string;
  const caller = validateTelegramInitData(initData, process.env.BOT_TOKEN!);
  if (!caller) return res.status(401).json({ error: "Unauthorized" });

  const category = req.query.category as string;
  if (!category) return res.status(400).json({ error: "category required" });

  const isPaidCategory = PAID_CATEGORIES.includes(category);

  if (isPaidCategory) {
    const subscribed = await hasActiveSubscription(caller.id);
    if (!subscribed) {
      return res.status(200).json({ remaining: 0, used: 0, bonus: 0, total: 0, locked: true, date: getTodayStr() });
    }
  }

  const today = getTodayStr();
  const { data, error } = await supabase
    .from("user_daily_limits")
    .select("count, bonus")
    .eq("user_id", caller.id)
    .eq("category", category)
    .eq("date", today)
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });

  const used      = data?.count ?? 0;
  const bonus     = data?.bonus ?? 0;
  const total     = FREE_LIMIT + bonus;
  const remaining = Math.max(0, total - used);

  return res.status(200).json({ remaining, used, bonus, total, locked: false, date: today });
}
