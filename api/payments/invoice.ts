// api/payments/invoice.ts
// POST /api/payments/invoice
// Creates a Telegram Stars invoice for +3 regular tasks or one premium task.
//
// Body: { category: string, lang?: string, product?: "bonus_tasks" | "premium_task" }
// Headers: x-telegram-init-data
//
// Response: { invoiceLink: string }

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { validateTelegramInitData } from "../couple/_auth.js";
import { appDate } from "../limits.js";

const BOT_TOKEN = process.env.BOT_TOKEN;
const CATEGORIES = new Set(["compliments", "tenderness", "desire", "passion", "hard"]);
const PREMIUM_CATEGORIES = new Set(["passion", "hard"]);
const LANGS = new Set(["ru", "en", "hi", "pt", "es"]);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "https://t.me");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-telegram-init-data");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const initData = req.headers["x-telegram-init-data"] as string;
  if (!BOT_TOKEN) return res.status(503).json({ error: "service_unconfigured" });
  const caller = validateTelegramInitData(initData, BOT_TOKEN);
  if (!caller) return res.status(401).json({ error: "Unauthorized" });

  const body = req.body ?? {};
  const category = String(body.category ?? "");
  const lang = String(body.lang ?? "ru");
  const product = String(body.product ?? "bonus_tasks");
  if (!["bonus_tasks", "premium_task"].includes(product)) {
    return res.status(400).json({ error: "invalid_product" });
  }
  const isPremiumTask = product === "premium_task";
  if (!CATEGORIES.has(category) || !LANGS.has(lang) || (isPremiumTask && !PREMIUM_CATEGORIES.has(category))) {
    return res.status(400).json({ error: "invalid_product" });
  }

  const isEn = lang === "en";
  const amount = isPremiumTask ? 20 : 10;
  const premiumCategoryLabel = category === "passion"
    ? (isEn ? "Passion" : "Страсть")
    : (isEn ? "Hard" : "Хард");

  try {
    const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/createInvoiceLink`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: isPremiumTask
          ? (isEn ? "One premium task" : "Одно премиум-задание")
          : (isEn ? "+3 extra tasks" : "+3 задания"),
        description: isPremiumTask
          ? (isEn
            ? `One AI-generated task in ${premiumCategoryLabel}`
            : `Одно ИИ-задание в категории «${premiumCategoryLabel}»`)
          : (isEn
            ? "Three more AI-generated tasks in this category today"
            : "Три дополнительных ИИ-задания в этой категории сегодня"),
        payload: JSON.stringify({
          version: 1, userId: caller.id,
          type: product,
          category,
          count: isPremiumTask ? 1 : 3,
          ...(!isPremiumTask ? { date: appDate() } : {}),
        }),
        provider_token: "",
        currency: "XTR",
        prices: [{
          label: isPremiumTask
            ? (isEn ? "One premium task" : "Одно премиум-задание")
            : (isEn ? "+3 tasks" : "+3 задания"),
          amount,
        }],
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
