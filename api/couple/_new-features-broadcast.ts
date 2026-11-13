import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const db = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const BOT = process.env.BOT_TOKEN ?? "";
const APP_URL = (process.env.APP_URL ?? "").replace(/\/$/, "");
const SECRET = process.env.CRON_SECRET ?? "";
const CAMPAIGN = "touche-new-features-once";
const CONFIRM = "SEND_TOUCHE_NEW_FEATURES_ONCE";
const PAGE_SIZE = 1000;
const BATCH_SIZE = 20;
const LANGS = ["ru", "en", "pt", "es", "hi"] as const;
type Lang = typeof LANGS[number];
type Recipient = { user_id: number; lang: string };
type Delivery = { user_id: number; status: "sending" | "sent" | "failed" };

const COPY: Record<Lang, { text: string; button: string }> = {
  ru: {
    text: "✨ В Touché — новый дизайн и новые возможности для двоих: шар желаний, кубики действий, «Стрип или действие» и Таро для двоих, чтобы поговорить по душам. Загляните и попробуйте вместе! А потом напишите нам в боте: что понравилось, что не понравилось и чего вам хотелось бы.",
    button: "Открыть Touché",
  },
  en: {
    text: "✨ Touché has a new look and new ways to connect as a couple: Pose Ball, Action Dice, Strip or Dare, and Tarot for Two for a heart-to-heart. Open Touché and try them together! Then message us in the bot with what you liked, what you didn’t, and what you’d like to see next.",
    button: "Open Touché",
  },
  hi: {
    text: "✨ Touché का नया रूप और साथ में समय बिताने के नए तरीके: Pose Ball, Action Dice, Strip or Dare और Tarot for Two। Touché खोलें और साथ में आज़माएँ! फिर बॉट में हमें बताएं कि आपको क्या पसंद आया, क्या नहीं, और आप आगे क्या देखना चाहेंगे।",
    button: "Touché खोलें",
  },
  pt: {
    text: "✨ O Touché está de cara nova, com novas formas de se conectar a dois: Bola das poses, Dados de ação, Tire ou ouse e Tarô para dois. Abram o Touché e experimentem juntos! Depois, contem pelo bot o que gostaram, o que não gostaram e o que gostariam de ver a seguir.",
    button: "Abrir Touché",
  },
  es: {
    text: "✨ ¡Touché estrena diseño y nuevas formas de conectar en pareja: Bola de poses, Dados de acción, Quítate o atrévete y Tarot para dos! Entren en Touché y pruébenlos juntos. Después, cuéntennos en el bot qué les gustó, qué no y qué les gustaría ver.",
    button: "Abrir Touché",
  },
};

function langOrEnglish(value: unknown): Lang {
  return typeof value === "string" && (LANGS as readonly string[]).includes(value)
    ? value as Lang
    : "en";
}

async function allRows<T>(table: string, select: string, campaignOnly = false): Promise<T[]> {
  const rows: T[] = [];
  for (let start = 0; ; start += PAGE_SIZE) {
    let query = db.from(table).select(select).order("user_id", { ascending: true });
    if (campaignOnly) query = query.eq("campaign_id", CAMPAIGN);
    const { data, error } = await query.range(start, start + PAGE_SIZE - 1);
    if (error) throw error;
    const page = (data ?? []) as T[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
}

async function state() {
  const [recipients, deliveries] = await Promise.all([
    allRows<Recipient>("touche_user_languages", "user_id,lang"),
    allRows<Delivery>("touche_broadcast_deliveries", "user_id,status", true),
  ]);
  const attempted = new Set(deliveries.map((row) => String(row.user_id)));
  const byLang = Object.fromEntries(LANGS.map((lang) => [lang, 0])) as Record<Lang, number>;
  const remainingByLang = Object.fromEntries(LANGS.map((lang) => [lang, 0])) as Record<Lang, number>;
  for (const recipient of recipients) {
    const lang = langOrEnglish(recipient.lang);
    byLang[lang] += 1;
    if (!attempted.has(String(recipient.user_id))) remainingByLang[lang] += 1;
  }
  return {
    recipients,
    deliveries,
    summary: {
      total: recipients.length,
      remaining: Object.values(remainingByLang).reduce((sum, count) => sum + count, 0),
      totalByLanguage: byLang,
      remainingByLanguage: remainingByLang,
      sent: deliveries.filter((row) => row.status === "sent").length,
      failed: deliveries.filter((row) => row.status === "failed").length,
      uncertain: deliveries.filter((row) => row.status === "sending").length,
    },
  };
}

export async function handleNewFeaturesBroadcast(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });
  if (!SECRET || req.headers.authorization !== `Bearer ${SECRET}`) {
    return res.status(401).json({ error: "unauthorized" });
  }
  if (!BOT || !APP_URL) return res.status(503).json({ error: "service_unconfigured" });

  const body = req.body && typeof req.body === "object"
    ? req.body as Record<string, unknown>
    : {};
  try {
    if (body.action === "preview") {
      const { summary } = await state();
      return res.status(200).json({
        ok: true,
        campaignId: CAMPAIGN,
        confirmationRequired: CONFIRM,
        batchSize: BATCH_SIZE,
        messages: COPY,
        ...summary,
      });
    }

    if (body.action !== "send") return res.status(400).json({ error: "invalid_action" });
    if (body.confirmation !== CONFIRM) {
      return res.status(400).json({ error: "confirmation_required", confirmation: CONFIRM });
    }

    const current = await state();
    if (current.summary.uncertain > 0) {
      return res.status(409).json({ error: "uncertain_prior_delivery", ...current.summary });
    }
    const attempted = new Set(current.deliveries.map((row) => String(row.user_id)));
    const batch = current.recipients
      .filter((row) => !attempted.has(String(row.user_id)))
      .slice(0, BATCH_SIZE);
    let sentNow = 0;
    let failedNow = 0;

    for (const recipient of batch) {
      const lang = langOrEnglish(recipient.lang);
      const { data: claimed, error: claimError } = await db
        .from("touche_broadcast_deliveries")
        .upsert({
          campaign_id: CAMPAIGN,
          user_id: recipient.user_id,
          lang,
          status: "sending",
          attempted_at: new Date().toISOString(),
        }, { onConflict: "campaign_id,user_id", ignoreDuplicates: true })
        .select("user_id");
      if (claimError) throw claimError;
      if (!claimed?.length) continue;

      let status: "sent" | "failed" = "failed";
      let errorCode: string | null = "network_error";
      try {
        const response = await fetch(`https://api.telegram.org/bot${BOT}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: recipient.user_id,
            text: COPY[lang].text,
            reply_markup: {
              inline_keyboard: [[{
                text: COPY[lang].button,
                web_app: { url: APP_URL },
              }]],
            },
          }),
        });
        const telegram = await response.json() as { ok?: boolean; error_code?: number };
        if (telegram.ok === true) {
          status = "sent";
          errorCode = null;
        } else {
          errorCode = `telegram_${telegram.error_code ?? response.status}`;
        }
      } catch {}

      const { error: updateError } = await db
        .from("touche_broadcast_deliveries")
        .update({ status, telegram_error_code: errorCode })
        .eq("campaign_id", CAMPAIGN)
        .eq("user_id", recipient.user_id);
      if (updateError) throw updateError;
      if (status === "sent") sentNow += 1;
      else failedNow += 1;
      await new Promise((resolve) => setTimeout(resolve, 120));
    }

    const { summary } = await state();
    return res.status(200).json({
      ok: true,
      campaignId: CAMPAIGN,
      sentNow,
      failedNow,
      batchSize: BATCH_SIZE,
      done: summary.remaining === 0,
      ...summary,
    });
  } catch (error) {
    console.error("Touché broadcast failed:", error instanceof Error ? error.message : "unknown");
    return res.status(500).json({ error: "broadcast_failed" });
  }
}
