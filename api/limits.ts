// api/limits.ts  (replaces api/limits/get.ts + api/limits/use.ts)
// GET  /api/limits?category=X  → remaining tasks for today
// POST /api/limits              → use one task slot (body: { category })
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { validateTelegramInitData } from "./couple/_auth.js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const FREE_LIMIT_GET  = 3;
const FREE_LIMIT_USE  = 1;
const PAID_CATEGORIES = ["passion", "hard"];

async function hasActiveSub(userId: number): Promise<boolean> {
  const { data } = await supabase
    .from("user_subscriptions").select("expires_at")
    .eq("user_id", userId).maybeSingle();
  return data ? new Date(data.expires_at) > new Date() : false;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "https://t.me");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-telegram-init-data");
  if (req.method === "OPTIONS") return res.status(200).end();

  const caller = validateTelegramInitData(req.headers["x-telegram-init-data"] as string, process.env.BOT_TOKEN!);
  if (!caller) return res.status(401).json({ error: "Unauthorized" });

  const today = new Date().toISOString().slice(0, 10);

  // ── GET: return remaining ─────────────────────────────────────
  if (req.method === "GET") {
    const category = req.query.category as string;
    if (!category) return res.status(400).json({ error: "category required" });

    const { data, error } = await supabase
      .from("user_daily_limits").select("count, bonus")
      .eq("user_id", caller.id).eq("category", category).eq("date", today).maybeSingle();
    if (error) return res.status(500).json({ error: error.message });

    const used = data?.count ?? 0; const bonus = data?.bonus ?? 0;
    const total = FREE_LIMIT_GET + bonus;
    return res.status(200).json({ remaining: Math.max(0, total - used), used, bonus, total, locked: false, date: today });
  }

  // ── POST: use one slot ────────────────────────────────────────
  if (req.method === "POST") {
    const { category } = req.body as { category: string };
    if (!category) return res.status(400).json({ error: "category required" });

    if (PAID_CATEGORIES.includes(category) && !(await hasActiveSub(caller.id))) {
      return res.status(403).json({ error: "subscription_required", remaining: 0 });
    }

    const { data: existing } = await supabase
      .from("user_daily_limits").select("count, bonus")
      .eq("user_id", caller.id).eq("category", category).eq("date", today).maybeSingle();

    const used = existing?.count ?? 0; const bonus = existing?.bonus ?? 0;
    const total = FREE_LIMIT_USE + bonus;
    if (used >= total) return res.status(403).json({ error: "limit_exceeded", remaining: 0 });

    await supabase.from("user_daily_limits").upsert(
      { user_id: caller.id, category, date: today, count: used + 1, bonus },
      { onConflict: "user_id,category,date" }
    );
    return res.status(200).json({ ok: true, remaining: total - used - 1 });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
