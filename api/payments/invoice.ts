import type { VercelRequest, VercelResponse } from "@vercel/node";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? "";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { paid } = req.body as { paid?: boolean };
  const stars = paid ? 2 : 1;

  if (!BOT_TOKEN) {
    return res.status(500).json({ error: "TELEGRAM_BOT_TOKEN not configured" });
  }

  try {
    const resp = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/createInvoiceLink`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Touché — дополнительное задание",
        description: `+1 задание для пары (${stars} ★)`,
        payload: `task_unlock_${paid ? "paid" : "free"}_${Date.now()}`,
        currency: "XTR",
        prices: [{ label: "Задание", amount: stars }],
      }),
    });
    const data = await resp.json();
    if (!data.ok) return res.status(502).json({ error: data.description });
    return res.json({ invoiceLink: data.result });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
}
