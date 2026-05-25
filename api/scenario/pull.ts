// api/scenario/pull.ts
// POST /api/scenario/pull
// Called when partner A pulls a scenario card.
// Saves the session and attempts to push Role B card to partner B via bot.
// If bot cannot message partner B yet → saves pending_for_b = true.
//
// Body: { coupleId: string, scenarioId: string, lang: "en"|"ru" }
// Headers: x-telegram-init-data

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { validateTelegramInitData } from "../couple/_auth.js";
import { SCENARIOS } from "../../src/data/scenarios";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const BOT_TOKEN = process.env.BOT_TOKEN!;
const APP_URL   = process.env.APP_URL!; // e.g. https://touche-your-app.vercel.app

async function sendTelegramMessage(chatId: number, text: string, miniAppUrl: string) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  const body = {
    chat_id:    chatId,
    text,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[{
        text: "🃏 Open my card",
        web_app: { url: miniAppUrl },
      }]],
    },
  };
  
  try {
    const r = await fetch(url, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(body),
    });
    const result = await r.json();
    if (!r.ok) {
      console.error("Telegram API error:", result);
      return false;
    }
    return true;
  } catch (error) {
    console.error("Failed to send Telegram message:", error);
    return false;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Allow CORS for development
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-telegram-init-data");
  
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Validate Telegram user
  const initData = req.headers["x-telegram-init-data"] as string;
  if (!initData) {
    console.error("No initData provided");
    return res.status(401).json({ error: "Missing initData" });
  }
  
  const caller = validateTelegramInitData(initData, BOT_TOKEN);
  if (!caller) {
    console.error("Invalid initData");
    return res.status(401).json({ error: "Unauthorized" });
  }
  
  console.log("Authenticated user:", caller.id, caller.first_name);

  const { coupleId, scenarioId, lang } = req.body as {
    coupleId: string; 
    scenarioId: string; 
    lang: "en" | "ru";
  };

  if (!coupleId || !scenarioId || !lang) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  // Find scenario
  const scenario = SCENARIOS.find(s => s.id === scenarioId);
  if (!scenario) {
    return res.status(400).json({ error: "Unknown scenario" });
  }

  // Get couple to find partner's Telegram ID
  const { data: couple, error: coupleErr } = await supabase
    .from("couples")
    .select("user_a_id, user_b_id")
    .eq("id", coupleId)
    .single();
    
  if (coupleErr || !couple) {
    console.error("Couple not found:", coupleErr);
    return res.status(404).json({ error: "Couple not found" });
  }

  const partnerTgId = couple.user_a_id === caller.id
    ? couple.user_b_id
    : couple.user_a_id;

  // Get text based on language
  const roleAText = lang === "en" ? scenario.role_a_en : scenario.role_a_ru;
  const roleBText = lang === "en" ? scenario.role_b_en : scenario.role_b_ru;
  const title     = lang === "en" ? scenario.title_en  : scenario.title_ru;

  // Save session
  const { data: session, error: sessionErr } = await supabase
    .from("scenario_sessions")
    .insert({
      couple_id:    coupleId,
      scenario_id:  scenarioId,
      pulled_by:    caller.id,
      lang,
      role_a_text:  roleAText,
      role_b_text:  roleBText,
      pending_for_b: true,
    })
    .select("id")
    .single();

  if (sessionErr) {
    console.error("Failed to create session:", sessionErr);
    return res.status(500).json({ error: "Failed to create session" });
  }

  // Try to push to partner via bot
  const notifText = lang === "ru"
    ? `💌 Твой партнёр вытянул сценарий <b>${title}</b>.\n\nОткрой карточку — твоя роль ждёт.`
    : `💌 Your partner drew the scenario <b>${title}</b>.\n\nOpen your card — your role is waiting.`;

  const appUrl = `${APP_URL}?scenario=${session.id}&role=b`;
  console.log("Sending to partner:", partnerTgId, "URL:", appUrl);
  
  const sent = await sendTelegramMessage(partnerTgId, notifText, appUrl);

  // Mark as delivered if sent
  if (sent && session) {
    await supabase
      .from("scenario_sessions")
      .update({ pending_for_b: false, notified_at: new Date().toISOString() })
      .eq("id", session.id);
  }

  return res.status(200).json({ 
    ok: true, 
    notified: sent, 
    sessionId: session.id,
    partnerId: partnerTgId
  });
}
