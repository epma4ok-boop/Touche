// api/tasks/generate.ts
// POST /api/tasks/generate
// Body: { category, lang, gender? }

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { validateTelegramInitData } from "../couple/_auth.js";
import { TASKS_RU } from "../../src/data/tasks-ru.js";
import { TASKS_EN } from "../../src/data/tasks-en.js";
import { TASKS_HI } from "../../src/data/tasks-hi.js";
import { TASKS_PT } from "../../src/data/tasks-pt.js";
import { TASKS_ES } from "../../src/data/tasks-es.js";

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY!;
const DEEPSEEK_URL = "https://api.deepseek.com/v1/chat/completions";

type StaticPool = Record<string, string[]>;

const STATIC_POOLS: Record<string, StaticPool> = {
  ru: TASKS_RU,
  en: TASKS_EN,
  hi: TASKS_HI,
  pt: TASKS_PT,
  es: TASKS_ES,
};

function getFallback(cat: string, lang: string): string {
  const pool = STATIC_POOLS[lang] ?? STATIC_POOLS["en"];
  const list = (pool as StaticPool)[cat] ?? (pool as StaticPool)["compliments"];
  return list[Math.floor(Math.random() * list.length)];
}

function getGenderLine(lang: string, gender: string): string {
  const map: Record<string, Record<string, string>> = {
    ru: {
      male: "Пользователь — мужчина, партнёр — женщина. Используй 'ты' для пользователя, 'она/её/ей' для партнёрши. Глаголы мужского рода.",
      female: "Пользователь — женщина, партнёр — мужчина. Используй 'ты' для пользователя, 'он/его/ему' для партнёра. Глаголы женского рода.",
    },
    en: {
      male: "User is male, partner is female. Use 'you' for user, 'she/her' for partner. Male verbs.",
      female: "User is female, partner is male. Use 'you' for user, 'he/him' for partner. Female verbs.",
    },
    hi: {
      male: "उपयोगकर्ता पुरुष है, पार्टनर महिला है।",
      female: "उपयोगकर्ता महिला है, पार्टनर पुरुष है।",
    },
    pt: {
      male: "Usuário é homem, parceira é mulher. Use 'você' e 'ela/dela'.",
      female: "Usuária é mulher, parceiro é homem. Use 'você' e 'ele/dele'.",
    },
    es: {
      male: "El usuario es hombre, la pareja es mujer. Usa 'tú' y 'ella/su'.",
      female: "La usuaria es mujer, la pareja es hombre. Usa 'tú' y 'él/su'.",
    },
  };
  return map[lang]?.[gender] ?? map["en"]["male"];
}

// ─── ПРОМПТЫ ────────────────

const PROMPTS: Record<string, Record<string, string>> = {
  compliments: {
    ru: `Ты генератор коротких заданий для пар. Категория: "КОМПЛИМЕНТЫ" — тёплые слова, жесты внимания, маленькие сюрпризы без физического контакта.

ПРАВИЛА:
- Задание должно быть реалистичным и выполнимым в реальной жизни.
- Одно действие, до 180 символов.
- Используй обращение на "ты".
- НЕ используй "я", "мы", "мне", "нам" — ты даёшь задание, а не участвуешь.
- НЕ используй поэзию, метафоры, общие фразы.

Примеры правильных заданий (не копируй их, придумай своё):
- Напиши партнёру: «Скучаю».
- Сделай селфи с улыбкой и отправь.
- Купи шоколадку без повода.

Твоя задача: придумать ОДНО новое задание для категории "КОМПЛИМЕНТЫ". Только текст задания, без кавычек, без пояснений.`,
    en: `You generate short tasks for couples. Category: "COMPLIMENTS" — warm words, gestures of attention, small surprises without physical contact.

RULES:
- The task must be realistic and doable in real life.
- One action, up to 180 characters.
- Use "you" as the address.
- DO NOT use "I", "we", "me" — you are giving the task, not participating.
- DO NOT use poetry, metaphors, vague phrases.

Examples of correct tasks (don't copy them, create your own):
- Text your partner: "Miss you".
- Take a smiling selfie and send it.
- Buy a chocolate bar for no reason.

Your task: come up with ONE new task for the "COMPLIMENTS" category. Only task text, no quotes, no explanations.`,
  },
  tenderness: {
    ru: `Ты генератор коротких заданий для пар. Категория: "НЕЖНОСТЬ" — мягкий физический контакт, тепло, уют. Без эротики.

ПРАВИЛА:
- Задание должно быть реалистичным и выполнимым в реальной жизни.
- Одно действие, до 180 символов.
- Используй обращение на "ты".
- НЕ используй "я", "мы", "мне", "нам" — ты даёшь задание, а не участвуешь.
- НЕ используй поэзию, метафоры, общие фразы.

Примеры правильных заданий (не копируй их, придумай своё):
- Подойди сзади, обними и постой так минуту.
- Поцелуй в губы медленно, задержись на пару секунд.
- Сделай массаж шеи и плеч.

Твоя задача: придумать ОДНО новое задание для категории "НЕЖНОСТЬ". Только текст задания, без кавычек, без пояснений.`,
    en: `You generate short tasks for couples. Category: "TENDERNESS" — soft physical contact, warmth, comfort. Without eroticism.

RULES:
- The task must be realistic and doable in real life.
- One action, up to 180 characters.
- Use "you" as the address.
- DO NOT use "I", "we", "me" — you are giving the task, not participating.
- DO NOT use poetry, metaphors, vague phrases.

Examples of correct tasks (don't copy them, create your own):
- Come from behind, hug and stand for a minute.
- Kiss on the lips slowly, hold for a few seconds.
- Give a neck and shoulder massage.

Your task: come up with ONE new task for the "TENDERNESS" category. Only task text, no quotes, no explanations.`,
  },
  desire: {
    ru: `Ты генератор коротких заданий для пар. Категория: "ЖЕЛАНИЕ" — прелюдия, разогрев, возбуждение. Без секса.

ПРАВИЛА:
- Задание должно быть реалистичным и выполнимым в реальной жизни.
- Одно действие, до 200 символов.
- Используй обращение на "ты".
- НЕ используй "я", "мы", "мне", "нам" — ты даёшь задание, а не участвуешь.
- НЕ используй поэзию, метафоры, общие фразы.

Примеры правильных заданий (не копируй их, придумай своё):
- Разденься медленно перед партнёром.
- Сделай фото в белье и отправь.
- Прошепчи на ухо грязную фразу.

Твоя задача: придумать ОДНО новое задание для категории "ЖЕЛАНИЕ". Только текст задания, без кавычек, без пояснений.`,
    en: `You generate short tasks for couples. Category: "DESIRE" — foreplay, warm-up, arousal. Without sex.

RULES:
- The task must be realistic and doable in real life.
- One action, up to 200 characters.
- Use "you" as the address.
- DO NOT use "I", "we", "me" — you are giving the task, not participating.
- DO NOT use poetry, metaphors, vague phrases.

Examples of correct tasks (don't copy them, create your own):
- Undress slowly in front of your partner.
- Take a photo in lingerie and send it.
- Whisper a dirty phrase in the ear.

Your task: come up with ONE new task for the "DESIRE" category. Only task text, no quotes, no explanations.`,
  },
  passion: {
    ru: `Ты генератор коротких заданий для пар. Категория: "СТРАСТЬ" — чувственный секс, красиво и без пошлости.

ПРАВИЛА:
- Задание должно быть реалистичным и выполнимым в реальной жизни.
- Одно действие, до 200 символов.
- Используй обращение на "ты".
- НЕ используй "я", "мы", "мне", "нам" — ты даёшь задание, а не участвуешь.
- НЕ используй поэзию, метафоры, общие фразы.

Примеры правильных заданий (не копируй их, придумай своё):
- Войди медленно, застынь на пару секунд, начни двигаться в ритме дыхания.
- Сделай минет, глядя в глаза партнёру.
- Снимите секс на видео для своей коллекции.

Твоя задача: придумать ОДНО новое задание для категории "СТРАСТЬ". Только текст задания, без кавычек, без пояснений.`,
    en: `You generate short tasks for couples. Category: "PASSION" — sensual sex, beautiful and without vulgarity.

RULES:
- The task must be realistic and doable in real life.
- One action, up to 200 characters.
- Use "you" as the address.
- DO NOT use "I", "we", "me" — you are giving the task, not participating.
- DO NOT use poetry, metaphors, vague phrases.

Examples of correct tasks (don't copy them, create your own):
- Enter slowly, pause for a few seconds, start moving with breathing rhythm.
- Perform oral sex, looking into your partner's eyes.
- Record your sex on video for your personal collection.

Your task: come up with ONE new task for the "PASSION" category. Only task text, no quotes, no explanations.`,
  },
  hard: {
    ru: `Ты генератор коротких заданий для пар. Категория: "ХАРД" — секс с элементами игры, подчинения или контроля. Только для гетеро пар (Мужчина + Женщина).

ПРАВИЛА:
- Задание должно быть реалистичным и выполнимым в реальной жизни.
- Одно действие, до 200 символов.
- Используй обращение на "ты".
- НЕ используй "я", "мы", "мне", "нам" — ты даёшь задание, а не участвуешь.
- НЕ используй поэзию, метафоры, общие фразы.
- Учитывай физиологию: действия должны быть логичными для гетеро пары.

Примеры правильных заданий (не копируй их, придумай своё):
- Прикажи партнёру встать на колени.
- Свяжи руки шарфом и делай что хочешь.
- Сделай минет до финиша в рот и проглоти.

Твоя задача: придумать ОДНО новое задание для категории "ХАРД". Только текст задания, без кавычек, без пояснений.`,
    en: `You generate short tasks for couples. Category: "HARD" — sex with elements of play, submission, or control. Only for heterosexual couples (Man + Woman).

RULES:
- The task must be realistic and doable in real life.
- One action, up to 200 characters.
- Use "you" as the address.
- DO NOT use "I", "we", "me" — you are giving the task, not participating.
- DO NOT use poetry, metaphors, vague phrases.
- Consider physiology: actions must be logical for a heterosexual couple.

Examples of correct tasks (don't copy them, create your own):
- Command your partner to kneel.
- Tie their hands with a scarf and do whatever you want.
- Perform oral sex to finish in the mouth and swallow.

Your task: come up with ONE new task for the "HARD" category. Only task text, no quotes, no explanations.`,
  },
};

function getPrompt(category: string, lang: string): string {
  return PROMPTS[category]?.[lang] ?? PROMPTS[category]?.["en"] ?? PROMPTS["compliments"]["en"];
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const initData = req.headers["x-telegram-init-data"] as string | undefined;
  if (!initData) return res.status(401).json({ error: "Missing init data" });

  const ok = validateTelegramInitData(initData, process.env.BOT_TOKEN!);
  if (!ok) return res.status(403).json({ error: "Invalid init data" });

  const { category = "compliments", lang = "en", gender = "male" } = req.body ?? {};

  if (!DEEPSEEK_API_KEY) {
    return res.json({ task: getFallback(category, lang) });
  }

  try {
    const systemPrompt = `${getPrompt(category, lang)}\n\n${getGenderLine(lang, gender)}`;
    const userMessage = lang === "ru" ? "Сгенерируй одно задание." : "Generate one task.";

    const aiRes = await fetch(DEEPSEEK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        max_tokens: 160,
        temperature: 1.1,
      }),
    });

    if (!aiRes.ok) {
      return res.json({ task: getFallback(category, lang) });
    }

    const data = await aiRes.json();
    let task: string = data.choices?.[0]?.message?.content?.trim() ?? "";

    task = task.replace(/^["']|["']$/g, "").trim();
    task = task.replace(/^\d+\.\s*/, "");

    const forbidden = [
      "я рекомендую", "тебе стоит", "можешь попробовать", "попробуйте",
      "выдыхает", "дыши в", "посмотри в глаза", "отстранись",
      "я хочу", "давай я", "я буду", "мы с тобой", "мы будем",
      "я предлагаю", "я думаю", "мне кажется", "по моему мнению",
      "ты можешь", "ты сможешь", "было бы неплохо",
      "i recommend", "you can try", "you could", "i think", "i suggest",
      "let's", "we will", "we should", "i want",
    ];
    const hasForbidden = forbidden.some(f => task.toLowerCase().includes(f));

    if (!task || task.length < 15 || task.length > 350 || hasForbidden) {
      return res.json({ task: getFallback(category, lang) });
    }

    return res.json({ task });
  } catch {
    return res.json({ task: getFallback(category, lang) });
  }
}
