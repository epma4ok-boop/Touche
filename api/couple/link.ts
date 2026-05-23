import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { validateTelegramInitData } from "./_auth.js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log("🔵 /api/couple/link called", { method: req.method });
  
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Validate caller
  const initData = req.headers["x-telegram-init-data"] as string;
  const caller = validateTelegramInitData(initData, process.env.BOT_TOKEN!);
  if (!caller) {
    console.error("❌ Invalid initData");
    return res.status(401).json({ error: "Invalid initData" });
  }

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

  if (existing) {
    return res.status(200).json({ coupleId: existing.id, already: true });
  }

  // Create couple
  const { data, error } = await supabase
    .from("couples")
    .insert({ user_a_id: refUserId, user_b_id: caller.id })
    .select("id")
    .single();

  if (error) {
    console.error("❌ Supabase error:", error);
    return res.status(500).json({ error: error.message });
  }

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
