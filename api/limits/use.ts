// api/limits/use.ts
// POST /api/limits/use
// Body: { category: string }
// Atomically decrements the user's remaining task count for today.
// Returns { ok: true, remaining: number } or 403 if limit exceeded.

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { validateTelegramInitData } from "../couple/_auth";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const FREE_LIMIT = 1;

function getTodayStr(): string {
  return new Date().toISOString().slice(0, 10);
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

  const today = getTodayStr();

  // Upsert today's record then check limit atomically via RPC
  const { data, error } = await supabase.rpc("use_task_limit", {
    p_user_id: caller.id,
    p_category: category,
    p_date: today,
    p_free_limit: FREE_LIMIT,
  });

  if (error) return res.status(500).json({ error: error.message });

  // RPC returns { allowed: boolean, remaining: number }
  if (!data?.allowed) {
    return res.status(403).json({ error: "limit_exceeded", remaining: 0 });
  }

  return res.status(200).json({ ok: true, remaining: data.remaining });
}
