// api/scenario/session.ts
// GET /api/scenario/session?id=<sessionId>
// Returns the role text for the authenticated user only.
// Role A = the person who pulled the scenario (pulled_by).
// Role B = the partner.

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

  const sessionId = req.query.id as string;
  if (!sessionId) return res.status(400).json({ error: "Missing session id" });

  const { data: session, error } = await supabase
    .from("scenario_sessions")
    .select("id, pulled_by, title, role_a_text, role_b_text, lang, couple_id, ai_generated")
    .eq("id", sessionId)
    .single();

  if (error || !session) {
    return res.status(404).json({ error: "Session not found" });
  }

  // Determine which role this caller gets
  const isRoleA = session.pulled_by === caller.id;
  const roleText = isRoleA ? session.role_a_text : session.role_b_text;
  const role = isRoleA ? "a" : "b";

  return res.status(200).json({
    ok: true,
    sessionId: session.id,
    title: session.title,
    roleText,
    role,
    lang: session.lang,
  });
}
