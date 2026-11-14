// api/subscription/status.ts
// GET /api/subscription/status
// Headers: x-telegram-init-data
// Returns: { active: boolean, expiresAt: string | null }

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { validateTelegramInitData } from "../couple/_auth.js";
import { getEffectivePremiumAccess, type EffectivePremiumAccess } from "../_premium.js";

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

  let access: EffectivePremiumAccess;
  try {
    access = await getEffectivePremiumAccess(supabase, caller.id);
  } catch {
    return res.status(500).json({ error: "premium_status_failed" });
  }

  return res.status(200).json({
    active: access.active,
    expiresAt: access.expiresAt,
    shared: access.shared,
    source: access.source,
  });
}
