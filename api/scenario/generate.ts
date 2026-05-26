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
      title: "Фотограф и модель",
      role_a: "Ты фотограф. Проводишь съёмку. Жёсткое правило: НЕ КАСАТЬСЯ модели. Твоя задача — сделать лучшие снимки, но тело партнёрши сводит с ума. Командуй позами, смотри в упор.",
      role_b: "Ты модель. Твоя задача — соблазнить фотографа лёгкими прикосновениями, взглядами, движением бёдер. Нарушь его правило — заставь забыть о камере.",
    },
    en: {
      title: "Photographer & Model",
      role_a: "You're a photographer. You have a strict rule: DO NOT TOUCH the model. Your task is to take great shots, but your partner's body drives you crazy.",
      role_b: "You're the model. Your task is to seduce the photographer with light touches, glances, hip movements. Break their rule.",
    },
  },
  passion: {
    ru: {
      title: "Медсестра и пациент",
      role_a: "Ты медсестра. Проводишь 'тщательный' осмотр: долго держишь за запястье, скользишь по ноге выше колена. Когда пациент краснеет — делай пометку и улыбайся.",
      role_b: "Ты пациент. Медсестра слишком внимательна. Ты понимаешь, что происходит. Когда она касается внутренней стороны бедра — не сдерживай стона.",
    },
    en: {
      title: "Nurse & Patient",
      role_a: "You're a nurse conducting a 'thorough' examination. Hold their wrist too long, slide your hand up their thigh. Smile when they blush.",
      role_b: "You're the patient. The nurse is too attentive. You know what's happening. Don't hold back a moan when they touch your inner thigh.",
    },
  },
  hard: {
    ru: {
      title: "Хозяин и слуга",
      role_a: "Ты хозяин. На 30 минут отдавай команды: позы, движения, действия. Не объясняй. Твоя воля — закон. Можешь использовать лёгкие шлепки как наказание.",
      role_b: "Ты слуга. На 30 минут ты полностью подчиняешься. Выполняй каждую команду без возражений. Твоё тело принадлежит хозяину.",
    },
    en: {
      title: "Master & Servant",
      role_a: "You're the master. For 30 minutes, give commands: positions, movements, actions. No explanations needed. Your word is law.",
      role_b: "You're the servant. For 30 minutes, you obey completely. Your body belongs to the master.",
    },
  },
};

/* ── Extended system prompts with roles, fetish elements, explicit content ── */
const SYSTEM_PROMPTS: Record<string, (intensity: string) => string> = {
  ru: (intensity) => `Ты создаёшь откровенные ролевые сценарии для взрослых пар (18+).

Допустимые роли:
- Медсестра и пациент
- Учитель и ученица
- Начальник и подчинённая
- Врач и пациентка (гинеколог, стоматолог, массажист)
- Полицейский и задержанная
- Профессор и студентка
- Тренер и спортсменка
- Хозяин и служанка
- Фотограф и модель
- Сосед и соседка (за стенкой)
- Сантехник и домохозяйка
- Преподаватель вокала и ученица
- Библиотекарь и посетительница
- Таксист и пассажирка

Элементы, которые можно использовать:
- Раздевание (медленно, командами, как наказание/поощрение)
- Прикосновения с намёком (скользящие, задерживающиеся)
- Поцелуи (куда именно, как долго, с каким подтекстом)
- Запрет на оргазм (роль А контролирует финиш)
- Счёт или спор ("если проиграешь — сделаешь минет")
- Шлепки как наказание
- Связывание рук / завязывание глаз
- Использование предметов (ремень, галстук, ложка)
- Ролевой костюм (надеть / снять / представить)
- Фразы, которые нужно произнести вслух
- Игры с температурой (лёд, горячее дыхание)
- Зеркала (смотреть на себя)

Уровни интенсивности:
- romantic: игриво, нежно, без явной откровенности
- passion: чувственно, смело, с флиртом и откровенными намёками (18+)
- hard: прямо, дерзко, с элементами БДСМ, унижения, полного подчинения (18+)

Каждая роль: 2–4 предложения. Указывай запреты и правила. Диалог можно вставлять в кавычках.

Верни ТОЛЬКО JSON без пояснений:
{"title":"Название","role_a":"текст роли А","role_b":"текст роли Б"}`,

  en: (intensity) => `You create explicit roleplay scenarios for adult couples (18+).

Allowed roles:
- Nurse and patient
- Teacher and student
- Boss and subordinate
- Doctor and patient (gynecologist, dentist, massage therapist)
- Police officer and detained person
- Professor and student
- Coach and athlete
- Master and servant
- Photographer and model
- Neighbor and neighbor (thin wall)
- Plumber and housewife
- Vocal coach and student
- Librarian and visitor
- Taxi driver and passenger

Elements you can use:
- Undressing (slowly, by command, as punishment/reward)
- Suggestive touches (sliding, lingering)
- Kisses (where, how long, with what implication)
- Orgasm denial (role A controls when the other can finish)
- Bet or counting ("if you lose, you'll give me a blowjob")
- Spanking as punishment
- Hand tying / blindfolding
- Using objects (belt, tie, spoon)
- Roleplay costume (put on / take off / imagine)
- Phrases to say out loud
- Temperature play (ice, hot breath)
- Mirrors (watching yourself)

Intensity levels:
- romantic: playful, tender, no explicit content
- passion: sensual, bold, flirtatious with explicit hints (18+)
- hard: direct, daring, with BDSM elements, humiliation, total submission (18+)

Each role: 2–4 sentences. Specify restrictions and rules. Dialogue can be in quotes.

Return ONLY JSON without explanations:
{"title":"...","role_a":"...","role_b":"..."}`,
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
    const timeout = setTimeout(() => controller.abort(), 12_000);

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
            content: (SYSTEM_PROMPTS[lang] ?? SYSTEM_PROMPTS.ru)(intensity),
          },
          {
            role: "user",
            content:
              lang === "ru"
                ? `Создай сценарий уровня ${intensity}. Верни ТОЛЬКО JSON.`
                : `Create a ${intensity} level scenario. Return ONLY JSON.`,
          },
        ],
        max_tokens: 400,
        temperature: 1.2,
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
        title: String(parsed.title),
        role_a: String(parsed.role_a),
        role_b: String(parsed.role_b),
      };
    } else {
      throw new Error("Unexpected AI response shape");
    }
  } catch (err) {
    console.error("AI generation failed:", err);
    source = "fallback";
    const fb = FALLBACKS[intensity as keyof typeof FALLBACKS] ?? FALLBACKS.passion;
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
      couple_id: coupleId,
      pulled_by: caller.id,
      lang,
      title: generated.title,
      role_a_text: generated.role_a,
      role_b_text: generated.role_b,
      ai_generated: true,
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
    ok: true,
    title: generated.title,
    roleA: generated.role_a,
    sessionId: session?.id ?? null,
    notified,
    source,
  });
}
