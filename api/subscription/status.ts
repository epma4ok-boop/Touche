// api/subscription/status.ts
// GET /api/subscription/status
// Headers: x-telegram-init-data
// Returns: { active: boolean, expiresAt: string | null }

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { validateTelegramInitData } from "../couple/_auth.js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "https://t.me");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-telegram-init-data");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const initData = req.headers["x-telegram-init-data"] as string;
  const caller = validateTelegramInitData(initData, process.env.BOT_TOKEN!);
  if (!caller) return res.status(401).json({ error: "Unauthorized" });

  const { data, error } = await supabase
    .from("user_subscriptions")
    .select("expires_at")
    .eq("user_id", caller.id)
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });

  const active = data ? new Date(data.expires_at) > new Date() : false;

  return res.status(200).json({
    active,
    expiresAt: data?.expires_at ?? null,
  });
}
