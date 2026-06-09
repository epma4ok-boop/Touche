import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { validateTelegramInitData } from "../couple/_auth.js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const FREE_LIMIT = 1;
const PAID_CATEGORIES = ["passion", "hard"];

async function hasActiveSubscription(userId: number): Promise<boolean> {
  const { data } = await supabase
    .from("user_subscriptions")
    .select("expires_at")
    .eq("user_id", userId)
    .maybeSingle();
  return data ? new Date(data.expires_at) > new Date() : false;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const initData = req.headers["x-telegram-init-data"] as string;
  const caller = validateTelegramInitData(initData, process.env.BOT_TOKEN!);
  if (!caller) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { category } = req.body as { category: string };
  if (!category) {
    return res.status(400).json({ error: "category required" });
  }

  const today = new Date().toISOString().slice(0, 10);

  if (PAID_CATEGORIES.includes(category)) {
    const subscribed = await hasActiveSubscription(caller.id);
    if (!subscribed) {
      return res.status(403).json({ error: "subscription_required", remaining: 0 });
    }
  }

  const { data: existing } = await supabase
    .from("user_daily_limits")
    .select("count, bonus")
    .eq("user_id", caller.id)
    .eq("category", category)
    .eq("date", today)
    .maybeSingle();

  const used = existing?.count || 0;
  const bonus = existing?.bonus || 0;
  const total = FREE_LIMIT + bonus;

  if (used >= total) {
    return res.status(403).json({ error: "limit_exceeded", remaining: 0 });
  }

  await supabase
    .from("user_daily_limits")
    .upsert(
      { user_id: caller.id, category, date: today, count: used + 1, bonus },
      { onConflict: "user_id,category,date" }
    );

  return res.status(200).json({ ok: true, remaining: total - used - 1 });
}
