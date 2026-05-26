// api/payments/invoice.ts
// POST /api/payments/invoice
// Creates a Telegram Stars invoice for buying +3 extra tasks (10 Stars).
//
// Body: { category: string }
// Headers: x-telegram-init-data
//
// Response: { invoiceLink: string }

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { validateTelegramInitData } from "../couple/_auth.js";

const BOT_TOKEN = process.env.BOT_TOKEN!;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "https://t.me");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-telegram-init-data");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const initData = req.headers["x-telegram-init-data"] as string;
  const caller = validateTelegramInitData(initData, BOT_TOKEN);
  if (!caller) return res.status(401).json({ error: "Unauthorized" });

  const { category, lang = "ru" } = req.body as { category: string; lang?: string };
  if (!category) return res.status(400).json({ error: "category required" });

  const isEn = lang === "en";

  try {
    const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/createInvoiceLink`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title:       isEn ? "+3 extra tasks"     : "+3 задания",
        description: isEn
          ? "Three more AI-generated tasks in this category today"
          : "Три дополнительных ИИ-задания в этой категории сегодня",
        payload: JSON.stringify({
          userId: caller.id,
          type: "bonus_tasks",
          category,
          count: 3,
          date: new Date().toISOString().slice(0, 10),
        }),
        provider_token: "",
        currency: "XTR",
        prices: [{ label: isEn ? "+3 tasks" : "+3 задания", amount: 10 }],
      }),
    });

    const data = await r.json();
    if (!data.ok) throw new Error(data.description ?? "createInvoiceLink failed");
    return res.status(200).json({ invoiceLink: data.result });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return res.status(500).json({ error: msg });
  }
}
