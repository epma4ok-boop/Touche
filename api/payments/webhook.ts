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
  if (!BOT_TOKEN || !WEBHOOK_SECRET) {
    console.error("[telegram-webhook] configuration missing", {
      hasBotToken: Boolean(BOT_TOKEN),
      hasWebhookSecret: Boolean(WEBHOOK_SECRET),
    });
    return res.status(503).json({ error: "webhook_unconfigured" });
  }

  const secretHeader = req.headers["x-telegram-bot-api-secret-token"];
  if (secretHeader !== WEBHOOK_SECRET) {
    console.warn("[telegram-webhook] secret validation failed");
    return res.status(403).json({ error: "Forbidden" });
  }

  const update = req.body;
  const updateId = Number.isSafeInteger(update?.update_id) ? Number(update.update_id) : null;
  const updateKind = update?.message?.successful_payment
    ? "successful_payment"
    : update?.pre_checkout_query
      ? "pre_checkout_query"
      : update?.message?.text?.startsWith("/myid")
        ? "myid_command"
        : update?.message?.text?.startsWith("/start")
          ? "start_command"
          : "other";
  console.info("[telegram-webhook] update received", { update_id: updateId, kind: updateKind });

  // Let a user retrieve their own Telegram ID for support and purchase recovery.
  if (update?.message?.text?.match(/^\/myid(?:@\w+)?(?:\s|$)/)) {
    const chatId = Number(update.message.chat?.id);
    if (!Number.isSafeInteger(chatId)) return res.status(400).json({ error: "invalid_chat" });
    await sendMessage(chatId, `Ваш Telegram ID: <code>${chatId}</code>`);
    return res.status(200).json({ ok: true });
  }

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
    const isPremiumTask = payload?.type === "premium_task"
      && ["passion", "hard"].includes(payload?.category)
      && payload?.count === 1;
    const expectedAmount = isSubscription ? 199 : isPremiumTask ? 20 : 10;
    const valid = payload?.version === 1
      && Number.isSafeInteger(payload.userId)
      && payload.userId === Number(update.pre_checkout_query.from?.id)
      && update.pre_checkout_query.currency === "XTR"
      && Number(update.pre_checkout_query.total_amount) === expectedAmount
      && (isSubscription || isBonus || isPremiumTask);
    if (!valid) {
      console.warn("[telegram-webhook] pre-checkout rejected", {
        update_id: updateId,
        product: payload?.type ?? null,
        user_id: Number.isSafeInteger(payload?.userId) ? payload.userId : null,
        payer_id: Number(update.pre_checkout_query.from?.id) || null,
        amount: Number(update.pre_checkout_query.total_amount) || null,
        currency: update.pre_checkout_query.currency ?? null,
      });
    }
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
    const isPremiumTask = payload.type === "premium_task"
      && ["passion", "hard"].includes(payload.category ?? "")
      && payload.count === 1;
    const expectedAmount = payload.type === "subscription" ? 199 : isPremiumTask ? 20 : 10;
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
        || isPremiumTask
      )
      && payment.currency === "XTR"
      && Number(payment.total_amount) === expectedAmount
      && chargeId.length > 0;
    if (!validPayload) {
      console.error("[telegram-webhook] successful payment rejected", {
        update_id: updateId,
        user_id: Number.isSafeInteger(userId) ? userId : null,
        payer_id: chatId,
        product: payload.type ?? null,
        amount: Number(payment.total_amount) || null,
        currency: payment.currency ?? null,
        expected_amount: expectedAmount,
        has_charge_id: chargeId.length > 0,
      });
      return res.status(400).json({ error: "invalid_payment" });
    }
    const payerId = Number(userId);

    let paymentResult: { already_processed?: boolean } | null = null;
    try {
      const result = await supabase.rpc("process_telegram_payment", {
        p_charge_id: chargeId,
        p_user_id: payerId,
        p_product: payload.type!,
        p_amount: Number(payment.total_amount),
        p_currency: payment.currency,
        p_payload: payload,
        p_category: payload.category ?? null,
        p_bonus: payload.type === "bonus_tasks" ? 3 : 0,
        p_update_id: updateId,
      });
      paymentResult = result.data;
      if (result.error) {
        console.error("[telegram-webhook] payment RPC failed", {
          update_id: updateId,
          user_id: payerId,
          product: payload.type,
          amount: Number(payment.total_amount),
          error_code: result.error.code ?? null,
          error_message: result.error.message ?? null,
        });
        return res.status(500).json({ error: "payment_processing_failed" });
      }
    } catch (error) {
      console.error("[telegram-webhook] payment RPC threw", {
        update_id: updateId,
        user_id: payerId,
        product: payload.type,
        amount: Number(payment.total_amount),
        error: error instanceof Error ? error.message : "unknown_error",
      });
      return res.status(500).json({ error: "payment_processing_failed" });
    }

    console.info("[telegram-webhook] payment recorded", {
      update_id: updateId,
      user_id: payerId,
      product: payload.type,
      amount: Number(payment.total_amount),
      currency: payment.currency,
      duplicate: Boolean(paymentResult?.already_processed),
    });
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
      const count    = payload.count ?? 3;
      await sendMessage(chatId,
        `✨ <b>+${escapeHtml(String(count))} задания добавлено!</b>\n\nВозвращайся в приложение — они уже ждут тебя 💕`
      );
    } else if (payload.type === "premium_task") {
      const category = payload.category === "passion" ? "Страсть" : "Хард";
      await sendMessage(chatId,
        `✨ <b>Премиум-задание куплено!</b>\n\nДля категории «${escapeHtml(category)}» добавлен один доступ. Вернись в Touché и получи задание 💕`
      );
    }

    return res.status(200).json({ ok: true });
  }

  return res.status(200).json({ ok: true });
}
