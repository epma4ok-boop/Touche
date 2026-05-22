// api/payments/webhook.ts — handles both payments AND bot /start commands
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const BOT_TOKEN = process.env.BOT_TOKEN!;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET ?? "";
const APP_URL = process.env.APP_URL!;

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function getTodayStr(): string {
  return new Date().toISOString().slice(0, 10);
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

  const secretHeader = req.headers["x-telegram-bot-api-secret-token"];
  if (WEBHOOK_SECRET && secretHeader !== WEBHOOK_SECRET) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const update = req.body;

  // /start command — partner joining via invite link
  if (update?.message?.text?.startsWith("/start")) {
    const msg = update.message;
    const chatId: number = msg.chat.id;
    const param: string = (msg.text as string).replace("/start", "").trim();

    if (param.startsWith("ref_")) {
      const refUserId = parseInt(param.replace("ref_", ""), 10);
      const isValid = !isNaN(refUserId) && refUserId !== chatId;

      if (isValid) {
        await sendMessage(chatId,
          "💌 <b>Тебя приглашают в Touché</b>\n\nЗадания для пар — нежные, страстные и немного дерзкие. Открой приложение, чтобы соединиться с партнёром и начать:",
          {
            reply_markup: {
              inline_keyboard: [[{
                text: "💫 Открыть Touché",
                web_app: { url: `${APP_URL}?startapp=${param}` },
              }]],
            },
          }
        );
      } else {
        await sendMessage(chatId,
          "🌹 <b>Touché</b> — задания для пар\n\nОткрой приложение и пригласи партнёра:",
          {
            reply_markup: {
              inline_keyboard: [[{
                text: "Открыть Touché",
                web_app: { url: APP_URL },
              }]],
            },
          }
        );
      }
    } else {
      await sendMessage(chatId,
        "🌹 <b>Touché</b> — задания для пар\n\nКаждый день новое задание: от нежных слов до смелых желаний.",
        {
          reply_markup: {
            inline_keyboard: [[{
              text: "Открыть Touché",
              web_app: { url: APP_URL },
            }]],
          },
        }
      );
    }
    return res.json({ ok: true });
  }

  // Confirm pre_checkout_query
  if (update?.pre_checkout_query) {
    const pq = update.pre_checkout_query;
    await tgPost("answerPreCheckoutQuery", { pre_checkout_query_id: pq.id, ok: true });
    return res.json({ ok: true });
  }

  // Successful Stars payment
  if (update?.message?.successful_payment) {
    const payment = update.message.successful_payment;
    const telegramUserId: number = update.message.from?.id;
    let payload: { userId?: number; type?: string } = {};
    try { payload = JSON.parse(payment.invoice_payload); } catch {}
    const isPaid = payload.type === "paid";
    const userId = payload.userId ?? telegramUserId;
    const today = getTodayStr();
    if (userId) {
      const categories = isPaid ? ["passion", "hard"] : ["compliments", "tenderness", "desire"];
      for (const cat of categories) {
        await supabase.rpc("grant_bonus_task", { p_user_id: userId, p_category: cat, p_date: today });
      }
    }
    return res.json({ ok: true });
  }

  return res.json({ ok: true });
}
