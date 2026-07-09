// api/cron/nudge.ts
// Called by Vercel Cron every day at 15:00 UTC (18:00 Moscow).
// 1. Nudges couples who haven't played a scenario in 3–4 days.
// 2. Reminds users whose subscription expires in ~2 days.
// 3. Applies intimacy decay: -5% (max 50 pts) for couples with no activity yesterday.

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const BOT_TOKEN   = process.env.BOT_TOKEN!;
const CRON_SECRET = process.env.CRON_SECRET ?? "";

async function sendMessage(
  chatId: number, text: string, buttonText: string,
  buttonUrl: string, isWebApp = true,
) {
  const button = isWebApp
    ? { text: buttonText, web_app: { url: buttonUrl } }
    : { text: buttonText, url: buttonUrl };
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId, text, parse_mode: "HTML",
      reply_markup: { inline_keyboard: [[button]] },
    }),
  });
}

// ── 1. Scenario nudge ────────────────────────────────────────────────────────
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

async function runNudge(appUrl: string): Promise<number> {
  const now = new Date();
  const { data: couples, error } = await supabase
    .from("couples").select("id, user_a_id, user_b_id").not("user_b_id", "is", null);
  if (error || !couples?.length) return 0;

  const coupleIds = couples.map(c => c.id);
  const { data: lastSessions } = await supabase
    .from("scenario_sessions").select("couple_id, created_at")
    .in("couple_id", coupleIds).order("created_at", { ascending: false });

  const lastByCouple = new Map<string, Date>();
  for (const s of lastSessions ?? []) {
    if (!lastByCouple.has(s.couple_id)) lastByCouple.set(s.couple_id, new Date(s.created_at));
  }

  const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
  const FOUR_DAYS_MS  = 4 * 24 * 60 * 60 * 1000;
  let nudged = 0;

  for (const couple of couples) {
    const last = lastByCouple.get(couple.id);
    if (!last) continue;
    const age = now.getTime() - last.getTime();
    if (age < THREE_DAYS_MS || age > FOUR_DAYS_MS) continue;
    const ruText = NUDGE_RU[Math.floor(Math.random() * NUDGE_RU.length)];
    try { await sendMessage(couple.user_a_id, ruText, "🃏 Тянуть сценарий", appUrl); } catch {}
    try { await sendMessage(couple.user_b_id, ruText, "🃏 Тянуть сценарий", appUrl); } catch {}
    nudged++;
  }
  return nudged;
}

// ── 2. Subscription expiry reminder ─────────────────────────────────────────
async function runExpiryReminders(appUrl: string): Promise<number> {
  const now = new Date();
  const from = new Date(now.getTime() + 1.5 * 24 * 60 * 60 * 1000);
  const to   = new Date(now.getTime() + 2.5 * 24 * 60 * 60 * 1000);
  const { data: subs, error } = await supabase
    .from("user_subscriptions").select("user_id, expires_at")
    .gte("expires_at", from.toISOString()).lte("expires_at", to.toISOString());
  if (error || !subs?.length) return 0;

  let reminded = 0;
  for (const sub of subs) {
    const expiresAt = new Date(sub.expires_at);
    const daysLeft = Math.round((expiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
    const text = `⏳ <b>Touché Premium</b> заканчивается через ${daysLeft} дня.\n\nПродли — и продолжайте вечера вместе 💕`;
    try { await sendMessage(sub.user_id, text, "💳 Продлить подписку", appUrl, true); reminded++; } catch {}
  }
  return reminded;
}

// ── 3. Intimacy decay ─────────────────────────────────────────────────────────
// For every couple with no activity yesterday: score -= min(50, score*5%)
async function runIntimacyDecay(): Promise<number> {
  const today     = new Date().toISOString().slice(0, 10);
  const yesterday = (() => { const d = new Date(); d.setDate(d.getDate()-1); return d.toISOString().slice(0, 10); })();

  // Couples that were NOT active yesterday
  const { data: inactive } = await supabase
    .from("couples")
    .select("id, intimacy_score")
    .not("user_b_id", "is", null)
    .lt("last_active_date", yesterday);  // last_active_date < yesterday means missed at least 1 day

  if (!inactive?.length) return 0;

  let decayed = 0;
  for (const c of inactive) {
    const score   = c.intimacy_score ?? 0;
    if (score === 0) continue;
    const penalty = Math.min(50, Math.floor(score * 0.05));
    const newScore = Math.max(0, score - penalty);

    await supabase.from("couples")
      .update({ intimacy_score: newScore })
      .eq("id", c.id);

    // Log to history
    await supabase.from("intimacy_history").upsert({
      couple_id:      c.id,
      date:           today,
      points_gained:  0,
      points_lost:    penalty,
      total_score:    newScore,
      tasks_completed: 0,
    }, { onConflict: "couple_id,date", ignoreDuplicates: false });

    decayed++;
  }
  return decayed;
}

// ── Handler ──────────────────────────────────────────────────────────────────
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = req.headers.authorization ?? "";
  if (CRON_SECRET && auth !== `Bearer ${CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const appUrl = process.env.APP_URL!;

  const [nudged, reminded, decayed] = await Promise.all([
    runNudge(appUrl),
    runExpiryReminders(appUrl),
    runIntimacyDecay(),
  ]);

  return res.status(200).json({ ok: true, nudged, reminded, decayed });
}
