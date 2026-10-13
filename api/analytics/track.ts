import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { validateTelegramInitData } from "../couple/_auth.js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);
const BOT_TOKEN = process.env.BOT_TOKEN;
const EVENT_NAMES = new Set(["app_open", "screen_view", "task_generated"]);
const SCREENS = new Set(["home", "category", "scenario", "shared_task_error"]);
const ALLOWED_ORIGIN = "https://t.me";

function safeUtm(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return /^[a-zA-Z0-9_.-]{1,80}$/.test(trimmed) ? trimmed : null;
}

function classifySource(startParam: string | null): string {
  if (!startParam) return "direct";
  if (/^invite_[1-9][0-9]*$/.test(startParam)) return "telegram_invite";
  if (/^ref_[1-9][0-9]*$/.test(startParam)) return "telegram_referral";
  return "telegram_startapp";
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,x-telegram-init-data");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });
  if (!BOT_TOKEN || !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(503).json({ error: "service_unconfigured" });
  }

  const initData = req.headers["x-telegram-init-data"] as string | undefined;
  const user = validateTelegramInitData(initData, BOT_TOKEN);
  if (!user || !initData) return res.status(401).json({ error: "unauthorized" });

  const body = req.body && typeof req.body === "object" ? req.body as Record<string, unknown> : {};
  const eventName = typeof body.event_name === "string" ? body.event_name : "";
  const sessionId = typeof body.session_id === "string" ? body.session_id : "";
  if (!EVENT_NAMES.has(eventName)) return res.status(400).json({ error: "invalid_event" });
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sessionId)) {
    return res.status(400).json({ error: "invalid_session" });
  }
  const screen = body.screen;
  if (eventName === "screen_view" && (typeof screen !== "string" || !SCREENS.has(screen))) {
    return res.status(400).json({ error: "invalid_screen" });
  }

  const signedStartParam = new URLSearchParams(initData).get("start_param");
  const { error } = await supabase.from("analytics_events").insert({
    session_id: sessionId,
    user_id: user.id,
    username: user.username ?? null,
    event_name: eventName,
    screen: eventName === "screen_view" ? screen : null,
    source: classifySource(signedStartParam),
    utm_source: safeUtm(body.utm_source),
    utm_medium: safeUtm(body.utm_medium),
    utm_campaign: safeUtm(body.utm_campaign),
  });
  if (error) {
    console.error("Analytics event insert failed:", error.code);
    return res.status(500).json({ error: "analytics_write_failed" });
  }
  return res.status(204).end();
}
