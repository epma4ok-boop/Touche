// api/payments/webhook.ts — Telegram bot webhook + Stars payments
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const BOT_TOKEN      = process.env.BOT_TOKEN!;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET ?? "";
const APP_URL        = (process.env.APP_URL ?? "").replace(/\/$/, "");
const BOT_USERNAME   = process.env.BOT_USERNAME ?? "ToucheCoupleBot";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function getTodayStr() { return new Date().toISOString().slice(0, 10); }

async function tgPost(method: string, body: object) {
  return fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function sendMessage(chatId: number, text: string, extra?: object) {
  return tgPost("sendMessage", { chat_id: chatId, text, parse_mode: "HTML", ...extra });
}

// Upsert subscription — extends existing or creates new 30-day period
async function activateSubscription(userId: number) {
  const { data: existing } = await supabase
    .from("user_subscriptions")
    .select("expires_at")
    .eq("user_id", userId)
    .maybeSingle();

  const base = existing && new Date(existing.expires_at) > new Date()
    ? new Date(existing.expires_at)
    : new Date();

  const expiresAt = new Date(base);
  expiresAt.setDate(expiresAt.getDate() + 30);

  await supabase
    .from("user_subscriptions")
    .upsert(
      { user_id: userId, expires_at: expiresAt.toISOString(), stars_paid: 199 },
      { onConflict: "user_id" }
    );
}

// Add bonus tasks to daily limit
async function addBonusTasks(userId: number, category: string, date: string, count: number) {
  await supabase.rpc("add_task_bonus", {
    p_user_id:  userId,
    p_category: category,
    p_date:     date,
    p_bonus:    count,
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const secretHeader = req.headers["x-telegram-bot-api-secret-token"];
  if (WEBHOOK_SECRET && secretHeader !== WEBHOOK_SECRET) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const update = req.body;

  // ── /start command — partner joining via invite link ────────────────────────
  if (update?.message?.text?.startsWith("/start")) {
    const msg    = update.message;
    const chatId = msg.chat.id as number;
    const param  = (msg.text as string).replace("/start", "").trim();

    if (param.startsWith("ref_")) {
      const refUserId = parseInt(param.replace("ref_", ""), 10);
      const isValid   = !isNaN(refUserId) && refUserId !== chatId;

      if (isValid) {
        await sendMessage(chatId,
          `💝 Ты получил(а) приглашение от партнёра!\n\nОткрой <b>Touché</b> и принимай задания вместе:`,
          {
            reply_markup: {
              inline_keyboard: [[{
                text: "💝 Открыть Touché",
                url: `https://t.me/${BOT_USERNAME}/app?startapp=ref_${refUserId}`,
              }]],
            },
          }
        );
      } else {
        await sendMessage(chatId,
          `Привет! Открой <b>Touché</b> — задания для пар на вечер 💕`,
          {
            reply_markup: {
              inline_keyboard: [[{
                text: "💕 Открыть Touché",
                url: `https://t.me/${BOT_USERNAME}/app`,
              }]],
            },
          }
        );
      }
    } else {
      await sendMessage(chatId,
        `Привет! Открой <b>Touché</b> — задания для пар на вечер 💕`,
        {
          reply_markup: {
            inline_keyboard: [[{
              text: "💕 Открыть Touché",
              url: `${APP_URL || `https://t.me/${BOT_USERNAME}/app`}`,
            }]],
          },
        }
      );
    }

    return res.status(200).json({ ok: true });
  }

  // ── Pre-checkout query — must always answer OK ───────────────────────────────
  if (update?.pre_checkout_query) {
    await tgPost("answerPreCheckoutQuery", {
      pre_checkout_query_id: update.pre_checkout_query.id,
      ok: true,
    });
    return res.status(200).json({ ok: true });
  }

  // ── Successful payment ───────────────────────────────────────────────────────
  if (update?.message?.successful_payment) {
    const msg      = update.message;
    const chatId   = msg.chat.id as number;
    const payment  = msg.successful_payment;

    let payload: { userId?: number; type?: string; category?: string; count?: number; date?: string; months?: number } = {};
    try { payload = JSON.parse(payment.invoice_payload); } catch {}

    const userId = payload.userId ?? chatId;

    if (payload.type === "subscription") {
      await activateSubscription(userId);
      await sendMessage(chatId,
        `🔓 <b>Touché Premium активирован!</b>\n\nТеперь тебе доступны все категории — Страсть, Хард и ИИ-сценарии. По 1 заданию в день в каждой.\n\nПодписка активна 30 дней 💕`,
        {
          reply_markup: {
            inline_keyboard: [[{
              text: "💕 Открыть Touché",
              url: `${APP_URL || `https://t.me/${BOT_USERNAME}/app`}`,
            }]],
          },
        }
      );
    } else if (payload.type === "bonus_tasks") {
      const category = payload.category ?? "compliments";
      const count    = payload.count ?? 3;
      const date     = payload.date ?? getTodayStr();
      await addBonusTasks(userId, category, date, count);
      await sendMessage(chatId,
        `✨ <b>+${count} задания добавлено!</b>\n\nВозвращайся в приложение — они уже ждут тебя 💕`
      );
    }

    return res.status(200).json({ ok: true });
  }

  return res.status(200).json({ ok: true });
}
