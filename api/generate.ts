// api/tasks/generate.ts
// POST /api/tasks/generate
// Body: { category: string, lang: "ru"|"en"|"hi"|"pt"|"es", gender?: "male"|"female" }
// Headers: x-telegram-init-data
// Returns: { task: string, source: "ai"|"fallback" }

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { validateTelegramInitData } from "../couple/_auth.js";
import { TASKS_RU, TASKS_EN } from "../../src/data/tasks.js";

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY!;
const DEEPSEEK_URL = "https://api.deepseek.com/v1/chat/completions";

const FORBIDDEN_PHRASES = [
  "выдыхает тебе в шею",
  "отстранись и посмотри",
  "задержись и отстранись",
  "пусть повиснет в воздухе",
  "дыши в кожу",
  "кожу дыханием",
  "томление",
  "прелюдия к прелюдии",
  "красивая эрекция",
];

// Контекст пола — добавляется в конец системного промпта
function genderContext(gender: string | undefined, lang: string): string {
  if (!gender || gender === "other") return "";
  const isMale = gender === "male";
  if (lang === "ru") {
    return isMale
      ? "\n\nВАЖНО: Пользователь — мужчина. Задание выполняет он. Формулируй задания от мужского лица («подойди», «поцелуй», «скажи»). Используй мужской род в прилагательных/глаголах где нужно."
      : "\n\nВАЖНО: Пользователь — женщина. Задание выполняет она. Формулируй задания от женского лица («подойди», «поцелуй», «скажи»). Используй женский род в прилагательных/глаголах где нужно.";
  }
  return isMale
    ? "\n\nIMPORTANT: The user is a man. He performs the task. Write the task from a male perspective."
    : "\n\nIMPORTANT: The user is a woman. She performs the task. Write the task from a female perspective.";
}

const SYSTEM_PROMPTS: Record<string, Record<string, string>> = {
  compliments: {
    ru: `Ты создаёшь короткие, тёплые задания для пар в категории «Комплименты». Это только слова — текст или голосовое. Без действий, без касаний.

Правила:
- Только позитивные высказывания
- Одно короткое действие (написать, сказать, отправить)
- Никаких просьб, вопросов, воспоминаний
- Без «отстранись», «пусть повиснет в воздухе» и другой поэзии

Примеры:
1. «Открой чат и напиши «Скучаю». Одно слово. Без объяснений.»
2. «Напиши партнёру: «Ты мне нравишься». Прямо сейчас. Не жди ответа.»
3. «Скажи вслух: «Ты красивая/красивый». Просто так, без повода.»
4. «Отправь голосовое: «Ты классный/классная».»

Сгенерируй **одно новое задание** в таком же стиле. Не копируй примеры — придумай новый вариант. Верни только текст, без кавычек и пояснений.`,

    en: `You create short, warm tasks for couples in the "Compliments" category. Words only — text or voice. No actions, no touch.

Rules:
- Positive statements only
- One short action (write, say, send)
- No questions, no memories, no poetic nonsense

Examples:
1. "Open the chat and text 'Miss you'. One word."
2. "Text your partner: 'I like you'. Right now."
3. "Say out loud: 'You're beautiful'. Just because."
4. "Send a voice message: 'You're great'."

Generate **one new task** in the same style. Return only the task text, no quotes.`,
  },

  tenderness: {
    ru: `Ты создаёшь задания для категории «Нежность». Физическая близость без прелюдии. Объятия, поцелуи (нестрастные), массаж, лёгкие покусывания.

Правила:
- Никаких «отстранись», «посмотри в глаза», «дыши в шею»
- Поцелуи в губы — можно, но без углубления
- Массаж — конкретные зоны (шея, плечи, стопы)
- Без эрогенных зон (грудь, ягодицы, пах)

Примеры:
1. «Подойди сзади, обними и целуй шею. Медленно.»
2. «Поцелуй в губы. Медленно. Задержись на пару секунд.»
3. «Сделай массаж шеи и плеч. Найди напряжённое место — задержись там.»
4. «Легко прикуси мочку уха. Подержи пару секунд, поцелуй.»

Сгенерируй **одно новое задание**. Коротко, конкретно. Верни только текст.`,

    en: `Tasks for "Tenderness" — physical closeness without foreplay. Hugs, gentle kisses, massage, light biting.

Rules:
- No "pause and look", no "breathe into the skin"
- Kisses on lips — allowed, not passionate
- Massage — specific areas (neck, shoulders, feet)
- No erogenous zones

Examples:
1. "Come from behind, hug and kiss the neck. Slowly."
2. "Kiss on the lips. Slow. Pause for a moment."
3. "Massage neck and shoulders. Find tension — stay there."
4. "Gently bite the earlobe. Hold. Kiss the same spot."

Generate **one new task**. Short and specific. Return only text.`,
  },

  desire: {
    ru: `Задания для категории «Желание». Прелюдия: раздевание, страстные поцелуи, эрогенные зоны. Без орального секса и проникновения.

Правила:
- Можно: раздевание, поцелуи с языком, прикосновения к эрогенным зонам (грудь, ягодицы, внутренняя часть бедра, пах через ткань)
- Можно: короткие команды («Снимай», «Я хочу тебя»)
- Нельзя: оральный секс, проникновение, BDSM

Примеры:
1. «Поцелуй глубоко, с языком. Руками в волосы, на спину, на ягодицы.»
2. «Проведи рукой по внутренней стороне бедра. От колена вверх — остановись перед трусами.»
3. «Разденься полностью и пройди мимо партнёра. Пусть видит.»
4. «Ляг на спину. Пусть партнёр смотрит и трогает, изучает.»

Сгенерируй **одно новое задание**. Верни только текст.`,

    en: `Tasks for "Desire" — foreplay: undressing, passionate kisses, erogenous zones. No oral sex or penetration.

Rules:
- Allowed: undressing, tongue kisses, touching erogenous zones (chest, butt, inner thigh, crotch over fabric)
- Allowed: direct commands ("Take it off", "I want you")
- Not allowed: oral sex, penetration, BDSM

Examples:
1. "Kiss deeply with tongue. Hands in hair, on back, on butt."
2. "Trace hand up inner thigh. Stop just before underwear."
3. "Get completely naked and walk past your partner. Let them see."
4. "Lie on your back. Let partner watch and touch, explore."

Generate **one new task**. Return only text.`,
  },

  passion: {
    ru: `Задания для категории «Страсть». Оральный и вагинальный/анальный секс. Откровенно, без BDSM и ролевых игр.

Правила:
- Можно: минет, куннилингус, вагинальный и анальный секс, разные позы
- Можно: команды («Войди», «Ляг», «Не торопись»)
- Нельзя: BDSM, ролевые игры, связывание

Примеры:
1. «Опустись на колени. Сделай минет / кунни. Не торопись.»
2. «Ляг на спину. Попроси партнёра сесть сверху лицом к тебе. Двигайтесь медленно.»
3. «Войди медленно. Остановись внутри на пару секунд. Потом начни двигаться.»
4. «Сделай партнёру минет / кунни до финиша.»

Сгенерируй **одно новое задание**. Верни только текст.`,

    en: `Tasks for "Passion" — oral and vaginal/anal sex. Explicit, direct, no BDSM or roleplay.

Rules:
- Allowed: blowjob, cunnilingus, vaginal and anal sex, various positions
- Allowed: commands ("Enter", "Lie down", "Take your time")
- Not allowed: BDSM, roleplay, tying

Examples:
1. "Get on your knees. Give oral. Take your time."
2. "Lie on your back. Have partner sit on top facing you. Move slowly."
3. "Enter slowly. Pause inside for a few seconds. Then move."
4. "Give oral to finish. Don't stop."

Generate **one new task**. Return only text.`,
  },

  hard: {
    ru: `Задания для категории «Хард». Ролевые игры, элементы BDSM, приказы, всё в рамках consensual.

Правила:
- Можно: ролевые игры, связывание (ремень/галстук), повязка на глаза, шлепки, приказы, запрет на оргазм
- Можно: грубость в рамках согласия
- Нельзя: опасные действия (удушение, кровь, оружие)

Примеры:
1. «Свяжи партнёру руки. Сделай минет / кунни. Не останавливайся, пока не попросит.»
2. «Скажи: «Встань на колени». Подойди ближе. Пусть смотрит снизу вверх.»
3. «Завяжи партнёру глаза. Делай что хочешь — руками, губами.»
4. «Шлёпни партнёра пять раз. Спроси: «Ещё?». Если да — продолжай.»

Сгенерируй **одно новое задание**. Верни только текст.`,

    en: `Tasks for "Hard" — roleplay, BDSM elements, commands. All consensual.

Rules:
- Allowed: roleplay, tying (belt/tie), blindfold, spanking, commands, orgasm denial
- Allowed: roughness within consent
- Not allowed: dangerous actions (choking, blood, weapons)

Examples:
1. "Tie partner's hands. Give oral. Don't stop until asked."
2. "Say: 'Get on your knees'. Come closer. Let them look up."
3. "Blindfold your partner. Do whatever you want — hands, lips."
4. "Spank partner five times. Ask: 'More?'. Continue if yes."

Generate **one new task**. Return only text.`,
  },
};

function getFallback(category: string, lang: string): string {
  const pool = lang === "ru" ? TASKS_RU : TASKS_EN;
  const categoryTasks = pool[category as keyof typeof pool] ?? pool.compliments;
  return categoryTasks[Math.floor(Math.random() * categoryTasks.length)];
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

  const { category, lang = "ru", gender } = req.body as { category: string; lang?: string; gender?: string };
  if (!category) return res.status(400).json({ error: "category required" });

  if (!DEEPSEEK_API_KEY) {
    return res.status(200).json({ task: getFallback(category, lang), source: "fallback" });
  }

  const basePrompt = SYSTEM_PROMPTS[category]?.[lang] ?? SYSTEM_PROMPTS[category]?.["en"];
  if (!basePrompt) {
    return res.status(200).json({ task: getFallback(category, lang), source: "fallback" });
  }

  // Добавляем контекст пола к промпту
  const systemPrompt = basePrompt + genderContext(gender, lang);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(DEEPSEEK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${DEEPSEEK_API_KEY}` },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "Сгенерируй одно задание." },
        ],
        max_tokens: 180,
        temperature: 1.35,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return res.status(200).json({ task: getFallback(category, lang), source: "fallback" });
    }

    const data = await response.json();
    let task = data.choices?.[0]?.message?.content?.trim() ?? "";
    task = task.replace(/^["']|["']$/g, "").replace(/\\"/g, '"');

    const hasForbidden = FORBIDDEN_PHRASES.some(phrase => task.toLowerCase().includes(phrase.toLowerCase()));
    if (!task || task.length < 10 || hasForbidden) {
      return res.status(200).json({ task: getFallback(category, lang), source: "fallback" });
    }

    return res.status(200).json({ task, source: "ai" });
  } catch {
    return res.status(200).json({ task: getFallback(category, lang), source: "fallback" });
  }
}
