import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { validateTelegramInitData } from "./_auth.js";

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const BOT_TOKEN = process.env.BOT_TOKEN;
const APP_URL = process.env.APP_URL ?? "";
const LANGS = new Set(["ru", "en", "hi", "pt", "es"]);

async function notifyInviter(chatId: number, lang: string): Promise<void> {
  if (!BOT_TOKEN) return;
  const text: Record<string, string> = {
    ru: "💑 Партнёр принял твоё приглашение! Теперь вы пара.",
    en: "💑 Your partner accepted your invitation! You are now linked.",
    hi: "💑 आपके साथी ने आपका निमंत्रण स्वीकार किया! अब आप जोड़े हैं।",
    pt: "💑 Seu parceiro aceitou o convite! Vocês estão conectados.",
    es: "💑 ¡Tu pareja aceptó tu invitación! Ya están conectados.",
  };
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: text[lang] ?? text.en,
        reply_markup: APP_URL ? { inline_keyboard: [[{ text: "💑 Открыть приложение", web_app: { url: APP_URL } }]] } : undefined,
      }),
    });
  } catch {
    // Linking is already committed; notification failure must not undo it.
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "https://t.me");
  res.setHeader("Access-Control-Allow-Methods", "POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-telegram-init-data");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (!BOT_TOKEN) return res.status(503).json({ error: "service_unconfigured" });

  const caller = validateTelegramInitData(req.headers["x-telegram-init-data"] as string | undefined, BOT_TOKEN);
  if (!caller) return res.status(401).json({ error: "unauthorized" });

  if (req.method === "DELETE") {
    const { error } = await supabase.rpc("unlink_couple", { p_user_id: caller.id });
    if (error) return res.status(409).json({ error: "unlink_failed", detail: error.message });
    return res.status(200).json({ ok: true, coupleId: null });
  }
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });

  const refUserId = Number(req.body?.refUserId);
  const lang = String(req.body?.lang ?? "ru");
  if (!Number.isSafeInteger(refUserId) || refUserId <= 0 || refUserId === caller.id) {
    return res.status(400).json({ error: "invalid_ref_user_id" });
  }
  const safeLang = LANGS.has(lang) ? lang : "en";

  const { data, error } = await supabase.rpc("link_couple", {
    p_user_id: caller.id,
    p_partner_id: refUserId,
  });
  if (error) {
    const code = /already|linked|couple/i.test(error.message) ? "already_linked" : "link_failed";
    return res.status(code === "already_linked" ? 409 : 500).json({ error: code, detail: error.message });
  }
  const coupleId = typeof data === "string" ? data : data?.couple_id ?? data?.id;
  if (!coupleId) return res.status(500).json({ error: "link_failed" });

  await notifyInviter(refUserId, safeLang);
  return res.status(200).json({ ok: true, coupleId });
}