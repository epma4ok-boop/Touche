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
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,x-telegram-init-data");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (!BOT_TOKEN) return res.status(503).json({ error: "service_unconfigured" });
  const caller = validateTelegramInitData(req.headers["x-telegram-init-data"] as string | undefined, BOT_TOKEN);
  if (!caller) return res.status(401).json({ error: "unauthorized" });

  const category = String(req.method === "GET" ? req.query.category ?? "" : req.body?.category ?? "");
  if (!CATEGORIES.has(category)) return res.status(400).json({ error: "invalid_category" });
  const date = appDate();
  const premium = await isPremium(caller.id);
  const locked = PAID.has(category) && !premium;
  if (locked) return res.status(403).json({ error: "subscription_required", remaining: 0, isPremium: false });
  if (premium) return res.status(200).json({ ok: true, remaining: null, unlimited: true, isPremium: true, date });

  if (req.method === "GET") {
    const { data, error } = await sb.from("user_daily_limits").select("count,bonus").eq("user_id", caller.id).eq("category", category).eq("date", date).maybeSingle();
    if (error) return res.status(500).json({ error: "limits_read_failed" });
    const used = Number(data?.count ?? 0), bonus = Number(data?.bonus ?? 0);
    return res.status(200).json({ remaining: Math.max(0, FREE_LIMIT + bonus - used), used, bonus, total: FREE_LIMIT + bonus, isPremium: false, date });
  }
  if (req.method === "POST") {
    const { data, error } = await sb.rpc("consume_daily_limit", {
      p_user_id: caller.id, p_category: category, p_date: date, p_limit: FREE_LIMIT,
    });
    if (error) return res.status(500).json({ error: "limit_consume_failed" });
    const result = typeof data === "number" ? { remaining: data } : data ?? {};
    if (result.allowed === false || result.ok === false) return res.status(403).json({ error: "limit_exceeded", remaining: 0, isPremium: false });
    return res.status(200).json({ ok: true, remaining: result.remaining ?? null, isPremium: false, date });
  }
  return res.status(405).json({ error: "method_not_allowed" });
}