// api/subscription/invoice.ts
// POST /api/subscription/invoice
// Body: { lang?: "ru" | "en" }
// Headers: x-telegram-init-data
// Creates a 199 Stars invoice for a 1-month Touché Premium subscription.
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

  const { lang = "ru" } = req.body as { lang?: string };
  const isEn = lang === "en";

  try {
    const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/createInvoiceLink`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: isEn ? "Touché Premium — 1 month" : "Touché Premium — 1 месяц",
        description: isEn
          ? "Passion, Hard & AI Scenarios unlocked. 1 AI-generated task per day in every category."
          : "Страсть, Хард и ИИ-сценарии. 1 уникальное задание в день во всех категориях.",
        payload: JSON.stringify({ userId: caller.id, type: "subscription", months: 1 }),
        provider_token: "",
        currency: "XTR",
        prices: [{ label: isEn ? "1 month" : "1 месяц", amount: 199 }],
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
