// api/scenario/generate.ts
// POST /api/scenario/generate
// Body: { coupleId: string, lang: "ru"|"en", intensity: "romantic"|"passion"|"hard" }
// Headers: x-telegram-init-data
//
// 1. Calls DeepSeek to generate two complementary AI roles (Role A + Role B)
// 2. Saves session to Supabase (scenario_sessions table)
// 3. Sends Role B to partner via Telegram bot notification
// Returns: { ok, title, roleA, sessionId, notified, source }

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { validateTelegramInitData } from "../couple/_auth.js";

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY!;
const DEEPSEEK_URL = "https://api.deepseek.com/v1/chat/completions";
const BOT_TOKEN = process.env.BOT_TOKEN!;
const APP_URL = process.env.APP_URL!;

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/* ── Fallbacks if AI fails ─────────────────────────────────────── */
const FALLBACKS: Record<string, Record<string, { title: string; role_a: string; role_b: string }>> = {
  romantic: {
    ru: {
      title: "Детектив и свидетель",
      role_a: "Ты детектив. Веди мягкий допрос — задавай личные вопросы, пытайся узнать тайны партнёра. Правило: не трогать, только слова.",
      role_b: "Ты скрываешь кое-что интересное. Уходи от ответов, дразни детектива намёками — но не сдавайся легко.",
    },
    en: {
      title: "Detective & Witness",
      role_a: "You're a detective. Conduct a gentle interrogation — ask personal questions, try to uncover secrets. Rule: no touching, words only.",
      role_b: "You're hiding something interesting. Evade the questions, tease with hints — but don't give in easily.",
    },
  },
  passion: {
    ru: {
      title: "Фотограф и модель",
      role_a: "Ты фотограф. Снимай партнёра, ищи красоту в каждом движении. Жёсткое правило: не касаться, не приставать — только снимать.",
      role_b: "Ты модель. Притягивай взгляд фотографа: двигайся, меняй позы, соблазняй. Твоя цель — сломать его правило.",
    },
    en: {
      title: "Photographer & Model",
      role_a: "You're a photographer. Capture your partner, find beauty in every movement. Strict rule: no touching, no advances — just shoot.",
      role_b: "You're the model. Draw the photographer's gaze: move, pose, seduce. Your goal is to break their rule.",
    },
  },
  hard: {
    ru: {
      title: "Хозяин и слуга",
      role_a: "Ты хозяин. Отдавай конкретные смелые приказы, не объясняй причин. Требуй исполнения.",
      role_b: "Ты слуга, который хочет произвести впечатление. Исполняй каждый приказ — но всегда добавляй немного больше, чем просят.",
    },
    en: {
      title: "Master & Servant",
      role_a: "You're the master. Give specific bold commands without explanation. Demand compliance.",
      role_b: "You're the servant trying to impress. Carry out every order — but always give a little more than asked.",
    },
  },
};

/* ── System prompts ────────────────────────────────────────────── */
const SYSTEM_PROMPTS: Record<string, (intensity: string) => string> = {
  ru: (intensity) => `Ты сценарист для взрослых пар. Придумай ролевую игру с двумя ПРОТИВОПОЛОЖНЫМИ ролями.

Уровень интенсивности: ${
    intensity === "romantic"
      ? "романтика — нежно, без откровенности, создаём атмосферу и интригу"
      : intensity === "passion"
      ? "страсть — чувственно, смело, флирт и желание (18+)"
      : "жёстко — откровенно, прямо, без цензуры (18+)"
  }

Структура:
- Роль A имеет ОГРАНИЧЕНИЕ (что-то запрещено или недоступно)
- Роль B должна нарушить это ограничение или соблазнить носителя роли A

Примеры хорошей механики:
• Фотограф (не может трогать) ↔ Модель (должна соблазнить)
• Врач (холоден и профессионален) ↔ Пациент (притворяется больным)
• Скульптор (только смотрит и направляет) ↔ Модель (оживает)

Верни ТОЛЬКО JSON — никаких пояснений:
{"title":"...","role_a":"...","role_b":"..."}

Каждая роль: 2–3 предложения. Конкретные инструкции. Живой язык.`,

  en: (intensity) => `You are a scenario writer for adult couples. Create a roleplay with two OPPOSING roles.

Intensity level: ${
    intensity === "romantic"
      ? "romantic — tender, tasteful, build atmosphere and intrigue"
      : intensity === "passion"
      ? "passionate — sensual, bold, flirt and desire (18+)"
      : "hard — explicit, direct, uncensored (18+)"
  }

Structure:
- Role A has a CONSTRAINT (something forbidden or off-limits)
- Role B must break that constraint or seduce the Role A person

Good mechanic examples:
• Photographer (can't touch) ↔ Model (must seduce)
• Doctor (cold/professional) ↔ Patient (faking illness)
• Sculptor (only looks and directs) ↔ Model (comes alive)

Return ONLY JSON — no explanations:
{"title":"...","role_a":"...","role_b":"..."}

Each role: 2–3 sentences. Concrete instructions. Vivid language.`,
};

/* ── Send Telegram notification ────────────────────────────────── */
async function notifyPartner(
  chatId: number,
  title: string,
  sessionId: string,
  lang: string
): Promise<boolean> {
  const text =
    lang === "ru"
      ? `🎭 <b>${title}</b>\n\nПартнёр вытянул сценарий — твоя роль готова.\nОткрой карточку чтобы узнать её.`
      : `🎭 <b>${title}</b>\n\nYour partner drew a scenario — your role is ready.\nOpen your card to find out.`;

  const buttonText = lang === "ru" ? "🃏 Открыть мою роль" : "🃏 Open my role";

  try {
    const r = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [[
              {
                text: buttonText,
                web_app: { url: `${APP_URL}?scenario=${sessionId}&role=b` },
              },
            ]],
          },
        }),
      }
    );
    return r.ok;
  } catch {
    return false;
  }
}

/* ── Handler ───────────────────────────────────────────────────── */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-telegram-init-data");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // Auth
  const initData = req.headers["x-telegram-init-data"] as string;
  const caller = validateTelegramInitData(initData, BOT_TOKEN);
  if (!caller) return res.status(401).json({ error: "Unauthorized" });

  const {
    coupleId,
    lang = "ru",
    intensity = "passion",
  } = req.body as { coupleId: string; lang?: string; intensity?: string };

  if (!coupleId) return res.status(400).json({ error: "coupleId required" });

  /* 1 ── Generate two complementary roles via DeepSeek ── */
  let generated: { title: string; role_a: string; role_b: string };
  let source: "ai" | "fallback" = "ai";

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    const aiRes = await fetch(DEEPSEEK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content:
              (SYSTEM_PROMPTS[lang] ?? SYSTEM_PROMPTS.ru)(intensity),
          },
          {
            role: "user",
            content:
              lang === "ru"
                ? "Придумай новый сценарий. Верни только JSON."
                : "Create a new scenario. Return JSON only.",
          },
        ],
        max_tokens: 350,
        temperature: 1.15,
        response_format: { type: "json_object" },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!aiRes.ok) throw new Error(`DeepSeek ${aiRes.status}`);

    const aiData = await aiRes.json();
    const raw = (aiData.choices?.[0]?.message?.content ?? "").trim();
    const parsed = JSON.parse(raw);

    if (parsed?.title && parsed?.role_a && parsed?.role_b) {
      generated = {
        title:  String(parsed.title),
        role_a: String(parsed.role_a),
        role_b: String(parsed.role_b),
      };
    } else {
      throw new Error("Unexpected AI response shape");
    }
  } catch {
    source = "fallback";
    const fb =
      FALLBACKS[intensity as keyof typeof FALLBACKS] ?? FALLBACKS.passion;
    generated = (fb[lang as "ru" | "en"] ?? fb.ru);
  }

  /* 2 ── Find partner Telegram ID ── */
  const { data: couple } = await supabase
    .from("couples")
    .select("user_a_id, user_b_id")
    .eq("id", coupleId)
    .single();

  const partnerTgId: number | null = couple
    ? couple.user_a_id === caller.id
      ? couple.user_b_id
      : couple.user_a_id
    : null;

  /* 3 ── Save session ── */
  const { data: session } = await supabase
    .from("scenario_sessions")
    .insert({
      couple_id:     coupleId,
      pulled_by:     caller.id,
      lang,
      title:         generated.title,
      role_a_text:   generated.role_a,
      role_b_text:   generated.role_b,
      ai_generated:  true,
      pending_for_b: !!partnerTgId,
    })
    .select("id")
    .single();

  /* 4 ── Notify partner via Telegram bot ── */
  let notified = false;
  if (partnerTgId && session?.id) {
    notified = await notifyPartner(partnerTgId, generated.title, session.id, lang);

    if (notified) {
      await supabase
        .from("scenario_sessions")
        .update({ pending_for_b: false, notified_at: new Date().toISOString() })
        .eq("id", session.id);
    }
  }

  return res.status(200).json({
    ok:        true,
    title:     generated.title,
    roleA:     generated.role_a,
    sessionId: session?.id ?? null,
    notified,
    source,
  });
}
