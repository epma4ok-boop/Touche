import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { validateTelegramInitData } from "./_auth.js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BOT_TOKEN = process.env.BOT_TOKEN!;
const APP_URL = process.env.APP_URL!;

async function notifyInviter(chatId: number, lang: string): Promise<void> {
  const texts: Record<string, string> = {
    ru: "💑 Партнёр принял твоё приглашение! Теперь вы пара.",
    en: "💑 Your partner accepted your invitation! You are now linked.",
    hi: "💑 आपके साथी ने आपका निमंत्रण स्वीकार किया! अब आप जोड़े हैं।",
    pt: "💑 Seu parceiro aceitou o convite! Vocês estão conectados.",
    es: "💑 ¡Tu pareja aceptó la invitación! Ya están conectados.",
  };
  const text = texts[lang] ?? texts["en"];
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [[
            { text: "💑 Открыть приложение", web_app: { url: APP_URL } },
          ]],
        },
      }),
    });
  } catch {}
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-telegram-init-data");

  if (req.method === "OPTIONS") return res.status(200).end();

  console.log("🔵 /api/couple/link called", { method: req.method });

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const initData = req.headers["x-telegram-init-data"] as string;
  const caller = validateTelegramInitData(initData, BOT_TOKEN);
  if (!caller) {
    console.error("❌ Invalid initData");
    return res.status(401).json({ error: "Invalid initData" });
  }

  const { refUserId, lang = "ru" } = req.body as { refUserId: number; lang?: string };
  if (!refUserId || Number(refUserId) === caller.id) {
    return res.status(400).json({ error: "Invalid refUserId" });
  }

  // Check if couple already exists for this user
  const { data: existing } = await supabase
    .from("couples")
    .select("id")
    .or(`user_a_id.eq.${caller.id},user_b_id.eq.${caller.id}`)
    .maybeSingle();

  if (existing) {
    return res.status(200).json({ coupleId: existing.id, already: true });
  }

  // Create couple
  const { data, error } = await supabase
    .from("couples")
    .insert({ user_a_id: Number(refUserId), user_b_id: caller.id })
    .select("id")
    .single();

  if (error) {
    console.error("❌ Supabase error:", error);
    return res.status(500).json({ error: error.message });
  }

  // Notify the inviter that someone linked with them
  await notifyInviter(Number(refUserId), lang);

  // Deliver any pending scenario card to this user (role_b)
  const { data: pending } = await supabase
    .from("scenario_sessions")
    .select("*")
    .eq("couple_id", data.id)
    .eq("pending_for_b", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return res.status(200).json({
    coupleId: data.id,
    pendingCard: pending ?? null,
  });
}
