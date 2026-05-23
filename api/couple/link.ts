// api/couple/link.ts
// POST /api/couple/link
// Links two Telegram users into a couple.
// Called when user B opens the app via user A's referral link.
//
// Body: { refUserId: number }   — user A's Telegram ID (from start_param ref_<id>)
// Headers: x-telegram-init-data — raw initData string for auth
//
// Response: { coupleId: string }

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { validateTelegramInitData } from "./_auth.js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // Validate caller
  const initData = req.headers["x-telegram-init-data"] as string;
  const caller = validateTelegramInitData(initData, process.env.BOT_TOKEN!);
  if (!caller) return res.status(401).json({ error: "Invalid initData" });

  const { refUserId } = req.body as { refUserId: number };
  if (!refUserId || refUserId === caller.id) {
    return res.status(400).json({ error: "Invalid refUserId" });
  }

  // Check if couple already exists for this user
  const { data: existing } = await supabase
    .from("couples")
    .select("id")
    .or(`user_a_id.eq.${caller.id},user_b_id.eq.${caller.id}`)
    .maybeSingle();

  if (existing) return res.status(200).json({ coupleId: existing.id, already: true });

  // Create couple
  const { data, error } = await supabase
    .from("couples")
    .insert({ user_a_id: refUserId, user_b_id: caller.id })
    .select("id")
    .single();

  if (error) return res.status(500).json({ error: error.message });

  // Deliver any pending scenario card to this user (role_b)
  const { data: pending } = await supabase
    .from("scenario_sessions")
    .select("*")
    .eq("couple_id", data.id)
    .eq("pending_for_b", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return res.status(200).json({
    coupleId: data.id,
    pendingCard: pending ?? null,
  });
}
