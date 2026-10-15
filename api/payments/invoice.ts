// api/payments/invoice.ts
// POST /api/payments/invoice
// Creates a Telegram Stars invoice for one extra task after the applicable daily quota is exhausted.
//
// Body: { category: string, lang?: string, product: "premium_task" }
// Headers: x-telegram-init-data
//
// Response: { invoiceLink: string }

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { validateTelegramInitData } from "../couple/_auth.js";
import { appDate, FREE_LIMIT, PREMIUM_DAILY_LIMIT } from "../limits.js";
import { OWNER_TELEGRAM_ID } from "../../src/config.js";

const BOT_TOKEN = process.env.BOT_TOKEN;
const CATEGORIES = new Set(["compliments", "tenderness", "desire", "passion", "hard"]);
const PAID_CATEGORIES = new Set(["passion", "hard"]);
const LANGS = new Set(["ru", "en", "hi", "pt", "es"]);
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

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
  const product = String(body.product ?? "");
  if (product !== "premium_task") {
    return res.status(400).json({ error: "invalid_product" });
  }
  if (!CATEGORIES.has(category) || !LANGS.has(lang)) {
    return res.status(400).json({ error: "invalid_product" });
  }

  const [{ data: subscription, error: subscriptionError }, { data: daily, error: dailyError }, { data: referral, error: referralError }, { data: paidCredit, error: paidCreditError }] = await Promise.all([
    supabase.from("user_subscriptions").select("expires_at").eq("user_id", caller.id).maybeSingle(),
    supabase.from("user_daily_limits").select("count,bonus").eq("user_id", caller.id).eq("category", PAID_CATEGORIES.has(category) ? `premium_${category}` : category).eq("date", appDate()).maybeSingle(),
    supabase.from("referral_task_credits").select("balance").eq("user_id", caller.id).eq("category", category).maybeSingle(),
    supabase.from("premium_task_credits").select("balance").eq("user_id", caller.id).eq("category", category).maybeSingle(),
  ]);
  if (subscriptionError || dailyError || referralError || paidCreditError) return res.status(500).json({ error: "limits_read_failed" });
  const premium = caller.id === OWNER_TELEGRAM_ID || Boolean(subscription?.expires_at && new Date(subscription.expires_at).getTime() > Date.now());
  const base = PAID_CATEGORIES.has(category) && !premium
    ? 0
    : (PAID_CATEGORIES.has(category) ? PREMIUM_DAILY_LIMIT : FREE_LIMIT) + Number(daily?.bonus ?? 0);
  const remaining = Math.max(0, base - Number(daily?.count ?? 0)) + Number(referral?.balance ?? 0) + Number(paidCredit?.balance ?? 0);
  if (remaining > 0) return res.status(409).json({ error: "daily_limit_not_reached", remaining });

  const isEn = lang === "en";
  const amount = premium ? 5 : 20;
  const categoryLabel = ({
    compliments: { en: "Compliments", ru: "Комплименты" },
    tenderness: { en: "Tenderness", ru: "Нежность" },
    desire: { en: "Desire", ru: "Желание" },
    passion: { en: "Passion", ru: "Страсть" },
    hard: { en: "Hard", ru: "Хард" },
  } as Record<string, Record<string, string>>)[category][isEn ? "en" : "ru"];

  try {
    const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/createInvoiceLink`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: isEn ? "One extra task" : "Одно дополнительное задание",
        description: isEn
          ? `One task in ${categoryLabel}`
          : `Одно задание в категории «${categoryLabel}»`,
        payload: JSON.stringify({
          version: 1, userId: caller.id,
          type: product,
          category,
          count: 1,
          amount,
          priceTier: premium ? "premium" : "standard",
        }),
        provider_token: "",
        currency: "XTR",
        prices: [{
          label: isEn ? "One extra task" : "Одно дополнительное задание",
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
