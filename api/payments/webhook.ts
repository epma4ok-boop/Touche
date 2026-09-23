// api/payments/webhook.ts — Telegram bot webhook + Stars payments
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const BOT_TOKEN      = process.env.BOT_TOKEN;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET ?? "";
const APP_URL        = (process.env.APP_URL ?? "").replace(/\/$/, "");
const BOT_USERNAME   = process.env.BOT_USERNAME ?? "ToucheCoupleBot";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char] ?? char));
}

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!BOT_TOKEN || !WEBHOOK_SECRET) return res.status(503).json({ error: "webhook_unconfigured" });

  const secretHeader = req.headers["x-telegram-bot-api-secret-token"];
  if (secretHeader !== WEBHOOK_SECRET) {
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
    let payload: any = null;
    try { payload = JSON.parse(update.pre_checkout_query.invoice_payload); } catch {}
    const isSubscription = payload?.type === "subscription";
    const isBonus = payload?.type === "bonus_tasks"
      && ["compliments", "tenderness", "desire", "passion", "hard"].includes(payload?.category)
      && payload?.count === 3;
    const valid = payload?.version === 1
      && Number.isSafeInteger(payload.userId)
      && payload.userId === Number(update.pre_checkout_query.from?.id)
      && update.pre_checkout_query.currency === "XTR"
      && Number(update.pre_checkout_query.total_amount) === (isSubscription ? 199 : 10)
      && (isSubscription || isBonus);
    await tgPost("answerPreCheckoutQuery", {
      pre_checkout_query_id: update.pre_checkout_query.id,
      ok: valid,
      ...(valid ? {} : { error_message: "Invalid invoice" }),
    });
    return res.status(200).json({ ok: true });
  }

  // ── Successful payment ───────────────────────────────────────────────────────
  if (update?.message?.successful_payment) {
    const msg      = update.message;
    const chatId   = msg.chat.id as number;
    const payment  = msg.successful_payment;

    let payload: { version?: number; userId?: number; type?: string; category?: string; count?: number; date?: string; months?: number } = {};
    try { payload = JSON.parse(payment.invoice_payload); } catch {}

    const userId = payload.userId;
    const chargeId = String(payment.telegram_payment_charge_id ?? "");
    const validPayload = payload.version === 1
      && Number.isSafeInteger(userId)
      && userId === chatId
      && (
        payload.type === "subscription"
        || (
          payload.type === "bonus_tasks"
          && ["compliments", "tenderness", "desire", "passion", "hard"].includes(payload.category ?? "")
          && payload.count === 3
          && /^\d{4}-\d{2}-\d{2}$/.test(payload.date ?? "")
        )
      )
      && payment.currency === "XTR"
      && Number(payment.total_amount) === (payload.type === "subscription" ? 199 : 10)
      && chargeId.length > 0;
    if (!validPayload) return res.status(400).json({ error: "invalid_payment" });
    const payerId = Number(userId);

    const { data: paymentResult, error: paymentError } = await supabase.rpc("process_telegram_payment", {
      p_charge_id: chargeId,
      p_user_id: payerId,
      p_product: payload.type!,
      p_amount: Number(payment.total_amount),
      p_currency: payment.currency,
      p_payload: payload,
      p_category: payload.category ?? null,
      p_bonus: payload.type === "bonus_tasks" ? 3 : 0,
      p_update_id: Number.isSafeInteger(update?.update_id) ? update.update_id : null,
    });
    if (paymentError) return res.status(500).json({ error: "payment_processing_failed" });
    if (paymentResult?.already_processed) return res.status(200).json({ ok: true, duplicate: true });

    if (payload.type === "subscription") {
      await sendMessage(chatId,
        `🔓 <b>Touché Premium активирован!</b>\n\nТеперь доступны Страсть, Хард, ИИ-сценарии и задания без дневного лимита.\n\nПодписка активна 30 дней 💕`,
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
      await sendMessage(chatId,
        `✨ <b>+${escapeHtml(String(count))} задания добавлено!</b>\n\nВозвращайся в приложение — они уже ждут тебя 💕`
      );
    }

    return res.status(200).json({ ok: true });
  }

  return res.status(200).json({ ok: true });
}
