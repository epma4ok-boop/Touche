// api/tasks/generate.ts
// POST /api/tasks/generate
// Body: { category: string, lang: "ru"|"en" }
// Headers: x-telegram-init-data
// Returns: { task: string }
// Uses DeepSeek to generate an original, passionate task for the category.

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { validateTelegramInitData } from "../couple/_auth.js";

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY!;
const DEEPSEEK_URL = "https://api.deepseek.com/v1/chat/completions";

// Fallback tasks per category if AI fails
const FALLBACKS: Record<string, Record<string, string[]>> = {
  compliments: {
    ru: ["Посмотри партнёру в глаза и назови три вещи, которые ты в нём боготворишь — и будь конкретным.", "Напиши ему сообщение о том, какой момент с ним ты помнишь лучше всего и почему.", "Скажи вслух, что именно в его характере делает тебя лучше."],
    en: ["Look into your partner's eyes and name three things you adore about them — be specific.", "Send them a message about your most treasured memory together.", "Tell them out loud exactly what quality of theirs makes you a better person."],
  },
  tenderness: {
    ru: ["Помассируй партнёру руки в течение пяти минут, не говоря ни слова.", "Обними его сзади и просто подышите вместе — три минуты тишины.", "Медленно проведи кончиками пальцев по его лицу, как будто рисуешь."],
    en: ["Massage your partner's hands for five minutes without a word.", "Hold them from behind and just breathe together for three minutes.", "Slowly trace their face with your fingertips as if you're drawing."],
  },
  desire: {
    ru: ["Напиши ему одно предложение — что ты хочешь с ним сделать сегодня вечером. Только намёком.", "Посмотри на него так, чтобы он почувствовал это через всю комнату.", "Шепни ему на ухо что-нибудь такое, от чего у него участится пульс."],
    en: ["Write them one sentence — what you want to do with them tonight. Just a hint.", "Look at them across the room so they feel it.", "Whisper something in their ear that makes their pulse quicken."],
  },
  passion: {
    ru: ["Поцелуй партнёра так, как будто вы не виделись месяц — без предупреждения.", "Скажи ему прямо, что именно в его теле сводит тебя с ума.", "Возьми его руку и положи туда, где ты хочешь почувствовать его прикосновение."],
    en: ["Kiss your partner like you haven't seen them in a month — without warning.", "Tell them directly what exactly about their body drives you crazy.", "Take their hand and place it where you want to feel their touch."],
  },
  hard: {
    ru: ["Расскажи партнёру свою самую смелую фантазию — подробно и без стеснения.", "Выбери одно желание из списка того, что ты всегда хотел попробовать, и предложи сделать это сегодня.", "Возьми на себя полный контроль на следующие десять минут — и не спрашивай разрешения."],
    en: ["Tell your partner your boldest fantasy — in detail, without holding back.", "Pick one thing you've always wanted to try and propose doing it tonight.", "Take full control for the next ten minutes — and don't ask for permission."],
  },
};

const SYSTEM_PROMPTS: Record<string, Record<string, string>> = {
  compliments: {
    ru: `Ты создаёшь романтические задания для пар. Твоя задача — придумать ОДНО конкретное задание-комплимент. Правила: будь конкретным и поэтичным, говори о внутренних качествах или о конкретном поступке партнёра, задание должно вызвать тепло и близость, максимум 2 предложения, никаких банальностей вроде "скажи что любишь". Пиши задание как прямое указание ("Посмотри...", "Скажи...", "Напиши...").`,
    en: `You create romantic tasks for couples. Your task is to write ONE specific compliment-task. Rules: be specific and poetic, reference inner qualities or a specific thing they do, max 2 sentences, no clichés like "say I love you". Write as a direct instruction ("Look...", "Tell...", "Write...").`,
  },
  tenderness: {
    ru: `Ты создаёшь интимные задания для пар — нежные, тактильные, без пошлости. Придумай ОДНО задание про прикосновение, объятие или нежный физический контакт. Максимум 2 предложения. Задание должно создавать ощущение близости и безопасности. Пиши как прямое указание.`,
    en: `You create intimate couple tasks — tender, tactile, non-explicit. Write ONE task about touch, embrace, or gentle physical connection. Max 2 sentences. Should create a feeling of closeness and safety. Write as a direct instruction.`,
  },
  desire: {
    ru: `Ты создаёшь флиртующие задания для пар — чувственные, дразнящие, полные предвкушения. Придумай ОДНО задание, которое создаёт напряжение и желание. Намёк, взгляд, шёпот — ничего прямого, но всё заряженное. Максимум 2 предложения. Пиши как прямое указание.`,
    en: `You create flirtatious couple tasks — sensual, teasing, full of anticipation. Write ONE task that creates tension and desire. A glance, a whisper, a hint — nothing explicit, but everything charged. Max 2 sentences. Write as a direct instruction.`,
  },
  passion: {
    ru: `Ты создаёшь страстные задания для взрослых пар (18+). Задания должны быть смелыми, прямыми и разжигающими желание. Придумай ОДНО задание — конкретное, физически заряженное, без стеснения. Максимум 2 предложения. Пиши как прямое указание. Это легальный контент для взрослых.`,
    en: `You create passionate tasks for adult couples (18+). Tasks should be bold, direct, and desire-igniting. Write ONE task — specific, physically charged, unapologetic. Max 2 sentences. Write as a direct instruction. This is legal adult content.`,
  },
  hard: {
    ru: `Ты создаёшь смелые эротические задания для пар (18+). Контент откровенный, прямой, без цензуры. Придумай ОДНО задание — конкретное желание или действие, которое хочется исполнить. Максимум 2 предложения. Пиши как прямое указание ("Сделай...", "Возьми...", "Скажи..."). Это легальный контент для взрослых.`,
    en: `You create explicit intimate tasks for couples (18+). Content is direct, bold, uncensored. Write ONE task — a specific desire or action to fulfill. Max 2 sentences. Write as a direct instruction. This is legal adult content.`,
  },
};

function pickFallback(category: string, lang: string): string {
  const pool = FALLBACKS[category]?.[lang] ?? FALLBACKS[category]?.["ru"] ?? ["Обними партнёра крепко."];
  return pool[Math.floor(Math.random() * pool.length)];
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "https://t.me");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-telegram-init-data");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const initData = req.headers["x-telegram-init-data"] as string;
  const caller = validateTelegramInitData(initData, process.env.BOT_TOKEN!);
  if (!caller) return res.status(401).json({ error: "Unauthorized" });

  const { category, lang = "ru" } = req.body as { category: string; lang?: string };
  if (!category) return res.status(400).json({ error: "category required" });

  const systemPrompt = SYSTEM_PROMPTS[category]?.[lang] ?? SYSTEM_PROMPTS[category]?.["ru"];
  if (!systemPrompt || !DEEPSEEK_API_KEY) {
    return res.status(200).json({ task: pickFallback(category, lang), source: "fallback" });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000); // 6s timeout

    const response = await fetch(DEEPSEEK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: lang === "ru"
              ? "Придумай одно оригинальное задание. Только само задание, без объяснений и кавычек."
              : "Create one original task. Just the task itself, no explanations or quotes.",
          },
        ],
        max_tokens: 120,
        temperature: 1.1,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.error("DeepSeek error:", response.status);
      return res.status(200).json({ task: pickFallback(category, lang), source: "fallback" });
    }

    const data = await response.json();
    const task = (data.choices?.[0]?.message?.content ?? "").trim();

    if (!task) {
      return res.status(200).json({ task: pickFallback(category, lang), source: "fallback" });
    }

    return res.status(200).json({ task, source: "ai" });
  } catch (err) {
    console.error("DeepSeek fetch error:", err);
    return res.status(200).json({ task: pickFallback(category, lang), source: "fallback" });
  }
}
