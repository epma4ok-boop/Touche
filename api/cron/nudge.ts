// api/cron/nudge.ts
// Called by Vercel Cron every day at 15:00 UTC (18:00 Moscow).
// Sends a nudge to couples who haven't played a scenario in 3 days.
//
// Protect with CRON_SECRET env var — Vercel sends it automatically via
// the Authorization header when crons are configured in vercel.json.

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const BOT_TOKEN = process.env.BOT_TOKEN!;
const CRON_SECRET = process.env.CRON_SECRET ?? "";

const NUDGE_RU = [
  "🌙 Уже 3 дня без сценария. Самое время вытянуть карту сегодня вечером.",
  "💌 Три дня прошло — ваш следующий сценарий ждёт. Откройте приложение.",
  "✨ Напоминаем о себе. Хороший вечер начинается с одного нажатия.",
];

const NUDGE_EN = [
  "🌙 3 days without a scenario. Tonight is a good time to draw a card.",
  "💌 Three days gone — your next scenario is waiting. Open the app.",
  "✨ Just a reminder. A good evening starts with one tap.",
];

async function sendMessage(chatId: number, text: string, appUrl: string) {
  const buttonText = text.startsWith("🌙") || text.startsWith("💌") || text.startsWith("✨")
    ? (text.includes("scenario") ? "🃏 Draw a scenario" : "🃏 Тянуть сценарий")
    : "🃏 Открыть";

  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [[
          { text: buttonText, web_app: { url: appUrl } },
        ]],
      },
    }),
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Verify cron secret
  const auth = req.headers.authorization ?? "";
  if (CRON_SECRET && auth !== `Bearer ${CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const appUrl = process.env.APP_URL!;
  const now = new Date();

  // Find all linked couples (both users set)
  const { data: couples, error } = await supabase
    .from("couples")
    .select("id, user_a_id, user_b_id")
    .not("user_b_id", "is", null);

  if (error || !couples?.length) {
    return res.status(200).json({ ok: true, nudged: 0 });
  }

  const coupleIds = couples.map(c => c.id);

  // Get last scenario date per couple
  const { data: lastSessions } = await supabase
    .from("scenario_sessions")
    .select("couple_id, created_at")
    .in("couple_id", coupleIds)
    .order("created_at", { ascending: false });

  // Build map: coupleId → last scenario date
  const lastByCouple = new Map<string, Date>();
  for (const s of lastSessions ?? []) {
    if (!lastByCouple.has(s.couple_id)) {
      lastByCouple.set(s.couple_id, new Date(s.created_at));
    }
  }

  const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
  const FOUR_DAYS_MS  = 4 * 24 * 60 * 60 * 1000;

  let nudged = 0;

  for (const couple of couples) {
    const last = lastByCouple.get(couple.id);

    // Only nudge couples that played before but not in the last 3-4 days
    // (the 4-day upper bound avoids re-nudging if cron was delayed)
    if (!last) continue;

    const age = now.getTime() - last.getTime();
    if (age < THREE_DAYS_MS || age > FOUR_DAYS_MS) continue;

    // Pick random nudge text
    const ruText = NUDGE_RU[Math.floor(Math.random() * NUDGE_RU.length)];
    const enText = NUDGE_EN[Math.floor(Math.random() * NUDGE_EN.length)];

    // Send to both partners (best effort, ignore failures)
    try { await sendMessage(couple.user_a_id, ruText, appUrl); } catch {}
    try { await sendMessage(couple.user_b_id, ruText, appUrl); } catch {}

    nudged++;
  }

  return res.status(200).json({ ok: true, nudged });
}
