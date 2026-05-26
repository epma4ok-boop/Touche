// api/scenario/fetch.ts
// Unified endpoint replacing session.ts + pending.ts (to stay under Vercel free function limit).
//
// GET /api/scenario/fetch?type=session&id=<sessionId>
//   → Returns role text for the authenticated user from a specific session.
//     Role A if caller is pulled_by, Role B otherwise.
//
// GET /api/scenario/fetch?type=pending&coupleId=<coupleId>
//   → Returns the latest undelivered scenario for the caller (role B).
//     Marks it as delivered on read.

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

  const { type } = req.query;

  // ── type=session — fetch a specific session by ID ──────────────────────────
  if (type === "session") {
    const sessionId = req.query.id as string;
    if (!sessionId) return res.status(400).json({ error: "Missing id" });

    const { data: session, error } = await supabase
      .from("scenario_sessions")
      .select("id, pulled_by, title, role_a_text, role_b_text, lang")
      .eq("id", sessionId)
      .single();

    if (error || !session) return res.status(404).json({ error: "Session not found" });

    const isRoleA = session.pulled_by === caller.id;
    return res.status(200).json({
      ok: true,
      sessionId: session.id,
      title: session.title,
      roleText: isRoleA ? session.role_a_text : session.role_b_text,
      role: isRoleA ? "a" : "b",
      lang: session.lang,
    });
  }

  // ── type=pending — find undelivered card for the caller ────────────────────
  if (type === "pending") {
    const coupleId = req.query.coupleId as string;
    if (!coupleId) return res.status(400).json({ error: "Missing coupleId" });

    const { data: session, error } = await supabase
      .from("scenario_sessions")
      .select("id, pulled_by, title, role_b_text, lang")
      .eq("couple_id", coupleId)
      .neq("pulled_by", caller.id)
      .eq("pending_for_b", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error || !session) return res.status(200).json({ pending: false });

    // Mark as delivered
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

  return res.status(400).json({ error: "Invalid type. Use type=session or type=pending" });
}
