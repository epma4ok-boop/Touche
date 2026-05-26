// api/scenario/pending.ts
// GET /api/scenario/pending?coupleId=<id>
// Returns the latest undelivered scenario for the current user (role B).
// Called on app startup to surface "missed" cards when bot notifications fail.

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { validateTelegramInitData } from "../couple/_auth.js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const BOT_TOKEN = process.env.BOT_TOKEN!;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-telegram-init-data");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const initData = req.headers["x-telegram-init-data"] as string;
  if (!initData) return res.status(401).json({ error: "Missing initData" });

  const caller = validateTelegramInitData(initData, BOT_TOKEN);
  if (!caller) return res.status(401).json({ error: "Unauthorized" });

  const coupleId = req.query.coupleId as string;
  if (!coupleId) return res.status(400).json({ error: "Missing coupleId" });

  // Find the latest session where caller is the partner (role B)
  // and the notification was pending (never delivered via bot)
  const { data: session, error } = await supabase
    .from("scenario_sessions")
    .select("id, pulled_by, title, role_b_text, lang")
    .eq("couple_id", coupleId)
    .neq("pulled_by", caller.id)        // caller is the partner, not the one who pulled
    .eq("pending_for_b", true)          // was never delivered via bot
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !session) {
    return res.status(200).json({ pending: false });
  }

  // Mark as delivered now that the user opened the app
  await supabase
    .from("scenario_sessions")
    .update({ pending_for_b: false, notified_at: new Date().toISOString() })
    .eq("id", session.id);

  return res.status(200).json({
    pending: true,
    sessionId: session.id,
    title: session.title,
    roleText: session.role_b_text,
    role: "b",
    lang: session.lang,
  });
}
