import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { validateTelegramInitData } from "./couple/_auth.js";

const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const BOT_TOKEN = process.env.BOT_TOKEN;
export const FREE_LIMIT = 3;
const APP_TIMEZONE = process.env.APP_TIMEZONE || "Europe/Moscow";
const CATEGORIES = new Set(["compliments", "tenderness", "desire", "passion", "hard"]);
const PAID = new Set(["passion", "hard"]);
const OWNER_ID = Number(process.env.OWNER_TELEGRAM_ID || 0);

export function appDate(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: APP_TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

async function hasSubscription(uid: number) {
  const { data } = await sb.from("user_subscriptions").select("expires_at").eq("user_id", uid).maybeSingle();
  return !!data?.expires_at && new Date(data.expires_at).getTime() > Date.now();
}

async function isPremium(uid: number) {
  return uid === OWNER_ID || await hasSubscription(uid);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "https://t.me");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,x-telegram-init-data");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ error: "method_not_allowed" });
  if (!BOT_TOKEN) return res.status(503).json({ error: "service_unconfigured" });
  const caller = validateTelegramInitData(req.headers["x-telegram-init-data"] as string | undefined, BOT_TOKEN);
  if (!caller) return res.status(401).json({ error: "unauthorized" });

  const category = String(req.query.category ?? "");
  if (!CATEGORIES.has(category)) return res.status(400).json({ error: "invalid_category" });
  const date = appDate();
  const premium = await isPremium(caller.id);
  if (premium) return res.status(200).json({ ok: true, remaining: null, unlimited: true, isPremium: true, date });

  const [{ data, error }, { data: credits, error: creditsError }] = await Promise.all([
    sb.from("user_daily_limits").select("count,bonus").eq("user_id", caller.id).eq("category", category).eq("date", date).maybeSingle(),
    sb.from("referral_task_credits").select("balance").eq("user_id", caller.id).eq("category", category).maybeSingle(),
  ]);
  if (error || creditsError) return res.status(500).json({ error: "limits_read_failed" });
  const used = Number(data?.count ?? 0), bonus = Number(data?.bonus ?? 0);
  const creditBalance = Number(credits?.balance ?? 0);
  const base = PAID.has(category) ? 0 : FREE_LIMIT + bonus;
  return res.status(200).json({
    ok: true, remaining: Math.max(0, base - used) + creditBalance,
    used, bonus, credits: creditBalance, total: base + creditBalance, isPremium: false, date,
  });
}