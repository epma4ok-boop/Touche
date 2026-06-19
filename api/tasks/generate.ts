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

// ─── ПРОМПТЫ (ИИ сам придумывает, а не выбирает из списка) ────────────────

const PROMPTS: Record<string, Record<string, string>> = {
  compliments: {
    ru: `Ты генератор заданий для категории "КОМПЛИМЕНТЫ".

Суть категории: тёплые слова, жесты внимания, маленькие сюрпризы без физического контакта.
Что можно: сказать или написать тёплое слово, записать голосовое сообщение, сделать селфи с улыбкой или воздушным поцелуем, записать короткое видео с обращением, сделать мини-сюрприз (шоколад, записка, чай и прочее ), написать благодарность за конкретную мелочь, отправить старое фото с тёплым воспоминанием.
Чего нельзя: касаться партнёра, раздеваться, намёков на секс.

Твоя задача: придумать ОДНО новое, оригинальное задание в рамках этой категории. Не копируй примеры дословно, а создавай свои варианты. Одно действие, до 180 символов. Только текст задания, без кавычек, без пояснений.`,
    en: `You are a task generator for the "COMPLIMENTS" category.

The essence: warm words, gestures of attention, small surprises without physical contact.
What you can do: say or write a warm word, record a voice message, take a selfie with a smile or a kiss gesture, record a short video with an appeal, make a mini-surprise (chocolate, note, tea), write gratitude for a specific little thing, send an old photo with a warm memory.
What you cannot do: touch your partner, undress, hints of sex.

Your task: come up with ONE new, original task within this category. Do not copy examples verbatim, create your own variations. One action, up to 180 characters. Only the task text, no quotes, no explanations.`,
  },
  tenderness: {
    ru: `Ты генератор заданий для категории "НЕЖНОСТЬ".

Суть категории: мягкий физический контакт, тепло, уют, безопасность. Без эротики.
Что можно: объятия (сзади, спереди, объятия ног, долгие, крепкие), поцелуи (в губы, в шею, в плечо, в лоб, спину), массаж (голова, шея, спина, руки, ноги), почесывания, лёгкие покусывания (мочка уха, плечо, ключица), прикосновения (взять за руку, нежно погладить), селфи с воздушным поцелуем, отправить старое совместное фото.
Чего нельзя: раздеваться, трогать эрогенные зоны, намёков на секс.

Твоя задача: придумать ОДНО новое, оригинальное задание в рамках этой категории. Не копируй примеры дословно, а создавай свои варианты. Одно действие, до 180 символов. Только текст задания, без кавычек, без пояснений.`,
    en: `You are a task generator for the "TENDERNESS" category.

The essence: soft physical contact, warmth, comfort, safety. Without eroticism.
What you can do: hugs (from behind, long), kisses (on the lips slowly, on the neck, on the shoulder), massage (head, neck, back, arms, legs), scratching, light bites (earlobe, shoulder, collarbone), touches (hold hands, look at each other), selfie with a kiss gesture, send an old photo together.
What you cannot do: undress, touch erogenous zones, hint at sex.

Your task: come up with ONE new, original task within this category. Do not copy examples verbatim, create your own variations. One action, up to 180 characters. Only the task text, no quotes, no explanations.`,
  },
  desire: {
    ru: `Ты генератор заданий для категории "ЖЕЛАНИЕ" — прелюдия, разогрев, без секса.

Суть: возбуждение, игра, демонстрация тела, напряжение. Секса нет. Только задания для гетеро пар (Мужчина + Женщина). Учитывай человеческую физиологию и логику происходящего.
Что можно: раздевание (своё или партнёра), обнажение в быту (фартук, проход мимо, падение полотенца, одеть только туфли, игривое обнажение), фото/видео в белье, касания через ткань, массаж вокруг эрогенных зон (не касаясь центра), поцелуи и облизывания вокруг эрогенных зон, грязные слова на ухо, страстные поцелуи с языком, демонстрация тела без стеснения, изучение обнаженного тела друг друга.
Чего нельзя: секс, оральный секс, проникновение.

Твоя задача: придумать ОДНО новое, оригинальное задание в рамках этой категории. Не копируй примеры дословно, а создавай свои варианты. Одно действие, до 200 символов. Только текст задания, без кавычек, без пояснений.`,
    en: `You are a task generator for the "DESIRE" category — foreplay, warm-up, without sex.

The essence: arousal, play, body display, tension. No sex.
What you can do: undressing (yourself or your partner), nudity in everyday life (apron, walking past, dropping a towel), photo/video in lingerie, touching through fabric, massage around erogenous zones (not touching the center), kisses and licking around erogenous zones, dirty words in the ear, passionate kisses with tongue, body demonstration without embarrassment.
What you cannot do: sex, oral sex, penetration.

Your task: come up with ONE new, original task within this category. Do not copy examples verbatim, create your own variations. One action, up to 200 characters. Only the task text, no quotes, no explanations.`,
  },
  passion: {
    ru: `Ты генератор заданий для категории "СТРАСТЬ" — секс красиво, чувственно, без пошлости.

Суть: яркий, чувственный секс, снятый красиво или прожитый глубоко.Только задания для гетеро пар (Мужчина + Женщина). Учитывай человеческую физиологию и логику происходящего.
Что можно: разные позы, оральный секс (девушка делает минет, мужчина делает кунилингус), смена темпа, зеркало, наушники с музыкой, массаж с хэппи-эндом, лёд + оральный, взбитые сливки + оральный, фото/видео голого тела (красиво), съёмка секса для коллекции, массажное масло, съедобные трусы, мастурбация партнеру, совместное принятие душа и тд. Должно идти вместе с сексом, либо заканчиватсья сексом (Классическим, Оральным, Мастурбацией).
Чего нельзя: пошлость, грубость, подчинение, съёмка в упор.

Твоя задача: придумать ОДНО новое, оригинальное задание в рамках этой категории. Не копируй примеры дословно, а создавай свои варианты. Одно действие, до 200 символов. Только текст задания, без кавычек, без пояснений.`,
    en: `You are a task generator for the "PASSION" category — sex beautifully, sensually, without vulgarity.

The essence: bright, sensual sex, filmed beautifully or lived deeply.
What you can do: different positions, oral sex, tempo changes, mirror, headphones with music, massage with a happy ending, ice + oral, whipped cream + oral, photo/video of a naked body (beautifully), filming sex for a collection, warm oil, edible underwear.
What you cannot do: vulgarity, rudeness, submission, close-up shooting.

Your task: come up with ONE new, original task within this category. Do not copy examples verbatim, create your own variations. One action, up to 200 characters. Only the task text, no quotes, no explanations.`,
  },
  hard: {
    ru: `Ты генератор заданий для категории "ХАРД" — секс для тех, кому надоело однообразие и хочется новых экспериментов.

Суть: яркий или грязный или необычный секс, секс с подчинением или ролевая игра.ТТолько задания для гетеро пар (Мужчина + Женщина). Учитывай человеческую физиологию и логику происходящего. 
Что можно: подчинение на время, команды, связывание (шарф, ремень), маска на глаза, наручники, лёгкая плетка, грязный оральный (девушка садится на лицо мужчине, командовать, дать в рот девушке), минет с окончанием в рот девушке, глубокий минет в исполнении девушки, контроль во время минета/кунилингуса, съёмка домашнего порно, съёмка порно от первого лица, съёмка + подчинение, массаж + секс одновременно, шлепки во время секса, ролевая игра, запрет на оргазм.
Чего нельзя: красивые ракурсы, эстетика, равноправный секс без роли.

Твоя задача: придумать ОДНО новое, оригинальное задание в рамках этой категории. Не копируй примеры дословно, а создавай свои варианты. Одно действие, до 200 символов. Только текст задания, без кавычек, без пояснений.`,
    en: `You are a task generator for the "HARD" category — sex with control and power play.

The essence: sex with submission, commands, play. Safe word always.
What you can do: submission for time, commands, binding (scarf, belt), blindfold, handcuffs, light whip, dirty oral (sit on face, command), oral with finish in mouth, deep throat, control during oral, dirty filming (no light), first-person filming, filming + submission, massage + sex simultaneously, spanking during sex, roleplay, orgasm denial.
What you cannot do: beautiful angles, aesthetics, equal sex without a role.

Your task: come up with ONE new, original task within this category. Do not copy examples verbatim, create your own variations. One action, up to 200 characters. Only the task text, no quotes, no explanations.`,
  },
};

function getPrompt(category: string, lang: string): string {
  return PROMPTS[category]?.[lang] ?? PROMPTS["compliments"]["en"];
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
      "я рекомендую", "тебе стоит", "можешь попробовать",
      "выдыхает", "дыши в", "посмотри в глаза", "отстранись",
      "я хочу", "давай я", "я буду", "попробуй",
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
