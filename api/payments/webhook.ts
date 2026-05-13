import type { VercelRequest, VercelResponse } from "@vercel/node";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? "";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const update = req.body;

  // Подтверждаем pre_checkout_query
  if (update?.pre_checkout_query) {
    const pq = update.pre_checkout_query;
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerPreCheckoutQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pre_checkout_query_id: pq.id, ok: true }),
    });
    return res.json({ ok: true });
  }

  // successful_payment — здесь можно записать в БД
  if (update?.message?.successful_payment) {
    const payment = update.message.successful_payment;
    console.log("Payment received:", payment);
    // TODO: сохранить в БД, открыть лимит для пользователя
  }

  return res.json({ ok: true });
}
