// api/payments/webhook.ts — Telegram bot webhook + Stars payments
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { ADMIN_TELEGRAM_ID } from "../../src/config.js";

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
      : update?.message?.text?.startsWith("/send")
        ? "admin_send_command"
      : update?.message?.text?.startsWith("/myid")
        ? "myid_command"
        : update?.message?.text?.startsWith("/start")
          ? "start_command"
          : update?.message
            ? "incoming_message"
            : "other";
  console.info("[telegram-webhook] update received", { update_id: updateId, kind: updateKind });

  // Admin-only private command: /send <Telegram ID> <message>
  const text = update?.message?.text;
  if (typeof text === "string" && /^\/send(?:@\w+)?(?:\s|$)/.test(text)) {
    const message = update.message;
    const senderId = Number(message.from?.id);
    const chatId = Number(message.chat?.id);
    if (
      senderId !== ADMIN_TELEGRAM_ID
      || chatId !== senderId
      || message.chat?.type !== "private"
    ) {
      console.warn("[telegram-webhook] unauthorized admin send attempt", { sender_id: Number.isSafeInteger(senderId) ? senderId : null });
      return res.status(200).json({ ok: true });
    }

    const match = text.match(/^\/send(?:@\w+)?\s+(\d+)\s+([\s\S]*\S)\s*$/);
    if (!match) {
      await sendMessage(chatId, "Формат команды: <code>/send Telegram_ID текст сообщения</code>");
      return res.status(200).json({ ok: true });
    }

    const recipientId = Number(match[1]);
    const messageText = match[2].trim();
    if (
      !Number.isSafeInteger(recipientId)
      || recipientId <= 0
      || recipientId === senderId
      || Array.from(messageText).length > 3000
    ) {
      await sendMessage(chatId, "Проверьте ID получателя и длину сообщения (до 3000 символов).");
      return res.status(200).json({ ok: true });
    }

    try {
      const telegramResponse = await sendMessage(recipientId, escapeHtml(messageText));
      const telegramResult = await telegramResponse.json().catch(() => null);
      if (!telegramResponse.ok || telegramResult?.ok !== true) {
        console.error("[telegram-webhook] admin message delivery failed", {
          recipient_id: recipientId,
          http_status: telegramResponse.status,
        });
        await sendMessage(chatId, "Telegram не доставил сообщение. Получатель должен сначала открыть чат с ботом.");
        return res.status(200).json({ ok: true });
      }
      console.info("[telegram-webhook] admin message sent", { recipient_id: recipientId });
      await sendMessage(chatId, "Сообщение отправлено.");
    } catch (error) {
      console.error("[telegram-webhook] admin message send threw", {
        recipient_id: recipientId,
        error: error instanceof Error ? error.message : "unknown_error",
      });
      await sendMessage(chatId, "Не удалось отправить сообщение из-за ошибки Telegram.");
    }
    return res.status(200).json({ ok: true });
  }

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
          `💝 Ты получил(а) приглашение от партнёра!\n\nОткрой <b>Touché</b> и принимай задания вместе.\n\nЕсли возникнет вопрос, напиши сюда — сообщение увидит администратор.`,
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
          `Привет! Открой <b>Touché</b> — задания для пар на вечер 💕\n\nЕсли возникнет вопрос, напиши сюда — сообщение увидит администратор.`,
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
        `Привет! Открой <b>Touché</b> — задания для пар на вечер 💕\n\nЕсли возникнет вопрос, напиши сюда — сообщение увидит администратор.`,
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
      && ["compliments", "tenderness", "desire", "passion", "hard"].includes(payload?.category)
      && payload?.count === 1
      && (
        (payload?.priceTier === "premium" && payload?.amount === 5)
        || (payload?.priceTier === "standard" && payload?.amount === 20)
        || (payload?.priceTier === undefined && payload?.amount === undefined)
      );
    const expectedAmount = isSubscription ? 199 : isPremiumTask ? (payload?.amount ?? 20) : 10;
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

    let payload: { version?: number; userId?: number; type?: string; category?: string; count?: number; date?: string; months?: number; amount?: number; priceTier?: string } = {};
    try { payload = JSON.parse(payment.invoice_payload); } catch {}

    const userId = payload.userId;
    const chargeId = String(payment.telegram_payment_charge_id ?? "");
    const isPremiumTask = payload.type === "premium_task"
      && ["compliments", "tenderness", "desire", "passion", "hard"].includes(payload.category ?? "")
      && payload.count === 1
      && (
        (payload.priceTier === "premium" && payload.amount === 5)
        || (payload.priceTier === "standard" && payload.amount === 20)
        || (payload.priceTier === undefined && payload.amount === undefined)
      );
    const expectedAmount = payload.type === "subscription" ? 199 : isPremiumTask ? (payload.amount ?? 20) : 10;
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
         `🔓 <b>Touché Premium активирован!</b>\n\nСтрасть и Хард — по 3 задания в день. ИИ-сценарии — 1 в день. Дополнительное задание стоит 5 ⭐.\n\nПодписка активна 30 дней 💕`,
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
      await sendMessage(chatId,
        `✨ <b>Дополнительное задание куплено!</b>\n\nДля выбранной категории добавлен один доступ. Вернись в Touché и получи задание 💕`
      );
    }

    return res.status(200).json({ ok: true });
  }

  // Forward private messages from users to the administrator. The existing
  // /send command lets the administrator reply using the numeric Telegram ID.
  const incomingMessage = update?.message;
  if (
    incomingMessage
    && incomingMessage.chat?.type === "private"
    && Number(incomingMessage.from?.id) !== ADMIN_TELEGRAM_ID
  ) {
    const senderId = Number(incomingMessage.from?.id);
    const chatId = Number(incomingMessage.chat?.id);
    const messageId = Number(incomingMessage.message_id);
    if (
      !Number.isSafeInteger(senderId) || senderId <= 0
      || chatId !== senderId
      || !Number.isSafeInteger(messageId) || messageId <= 0
    ) {
      return res.status(200).json({ ok: true });
    }

    const name = [
      incomingMessage.from?.first_name,
      incomingMessage.from?.last_name,
    ].filter((part): part is string => typeof part === "string" && part.trim().length > 0).join(" ") || "Без имени";
    const username = typeof incomingMessage.from?.username === "string"
      ? `@${incomingMessage.from.username}`
      : "не указан";

    try {
      const adminNotice = await sendMessage(
        ADMIN_TELEGRAM_ID,
        `📩 <b>Новое сообщение в Touché</b>\nИмя: ${escapeHtml(name)}\nUsername: ${escapeHtml(username)}\nTelegram ID: <code>${senderId}</code>`,
      );
      const adminNoticeResult = await adminNotice.json().catch(() => null);
      if (!adminNotice.ok || adminNoticeResult?.ok !== true) {
        console.error("[telegram-webhook] incoming message details failed", {
          update_id: updateId,
          sender_id: senderId,
          http_status: adminNotice.status,
        });
        await sendMessage(chatId, "Не удалось передать сообщение администратору. Попробуйте ещё раз позже.");
        return res.status(200).json({ ok: true });
      }

      const forwarded = await tgPost("forwardMessage", {
        chat_id: ADMIN_TELEGRAM_ID,
        from_chat_id: chatId,
        message_id: messageId,
      });
      const forwardedResult = await forwarded.json().catch(() => null);
      if (!forwarded.ok || forwardedResult?.ok !== true) {
        console.error("[telegram-webhook] incoming message forward failed", {
          update_id: updateId,
          sender_id: senderId,
          http_status: forwarded.status,
        });
        await sendMessage(chatId, "Не удалось передать сообщение администратору. Попробуйте ещё раз позже.");
        return res.status(200).json({ ok: true });
      }
      await sendMessage(chatId, "Спасибо! Сообщение передано администратору. Ответ придёт сюда.");
    } catch (error) {
      console.error("[telegram-webhook] incoming message forwarding threw", {
        update_id: updateId,
        sender_id: senderId,
        error: error instanceof Error ? error.message : "unknown_error",
      });
      await sendMessage(chatId, "Не удалось передать сообщение администратору. Попробуйте ещё раз позже.");
    }
    return res.status(200).json({ ok: true });
  }

  return res.status(200).json({ ok: true });
}
