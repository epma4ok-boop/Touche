// api/payments/webhook.ts — FIXED
// - Uses correct BOT_TOKEN variable name
// - Verifies secret_token from Telegram webhook header
// - Opens user limit in Supabase after successful Stars payment

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const BOT_TOKEN = process.env.BOT_TOKEN!;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET ?? "";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function getTodayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // ── Verify the request is from Telegram ──────────────────────────────────
  const secretHeader = req.headers["x-telegram-bot-api-secret-token"];
  if (WEBHOOK_SECRET && secretHeader !== WEBHOOK_SECRET) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const update = req.body;

  // ── Confirm pre_checkout_query immediately ────────────────────────────────
  if (update?.pre_checkout_query) {
    const pq = update.pre_checkout_query;
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerPreCheckoutQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pre_checkout_query_id: pq.id, ok: true }),
    });
    return res.json({ ok: true });
  }

  // ── Handle successful Stars payment ──────────────────────────────────────
  if (update?.message?.successful_payment) {
    const payment = update.message.successful_payment;
    const telegramUserId: number = update.message.from?.id;

    let payload: { userId?: number; type?: string; stars?: number } = {};
    try {
      payload = JSON.parse(payment.invoice_payload);
    } catch {
      console.error("Failed to parse invoice payload:", payment.invoice_payload);
    }

    const isPaid = payload.type === "paid";
    const category = isPaid ? null : "any"; // "any" means bonus applies to current active category
    const today = getTodayStr();

    // Grant +1 bonus task for the day for this user
    // We upsert into user_daily_limits with bonus increment
    const userId = payload.userId ?? telegramUserId;
    if (!userId) {
      console.error("No userId found in payment payload");
      return res.json({ ok: true });
    }

    // Determine which categories get the bonus
    const categoriesToBonus = isPaid
      ? ["passion", "hard"]
      : ["compliments", "tenderness", "desire"];

    for (const cat of categoriesToBonus) {
      const { error } = await supabase.rpc("grant_bonus_task", {
        p_user_id: userId,
        p_category: cat,
        p_date: today,
      });
      if (error) {
        console.error(`Failed to grant bonus for category ${cat}:`, error);
      }
    }

    console.log(`Stars payment processed: userId=${userId}, type=${payload.type}, stars=${payment.total_amount}`);
    return res.json({ ok: true });
  }

  return res.json({ ok: true });
}
