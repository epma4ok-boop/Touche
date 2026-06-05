// api/tasks/generate.ts
// POST /api/tasks/generate
// Body: { category: string, lang: "ru"|"en"|"hi"|"pt"|"es" }
// Headers: x-telegram-init-data
// Returns: { task: string, source: "ai"|"fallback" }

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { validateTelegramInitData } from "../couple/_auth.js";
import { TASKS_RU, TASKS_EN } from "../../src/data/tasks.js";

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY!;
const DEEPSEEK_URL = "https://api.deepseek.com/v1/chat/completions";

// ─────────────────────────────────────────────────────────────────────────────
// ЗАПРЕЩЁННЫЕ ФРАЗЫ (физиологический бред, глупости, которые не должны появляться)
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// СИСТЕМНЫЕ ПРОМПТЫ ДЛЯ КАЖДОЙ КАТЕГОРИИ (с эталонами)
// ─────────────────────────────────────────────────────────────────────────────
const SYSTEM_PROMPTS: Record<string, Record<string, string>> = {
  compliments: {
    ru: `Ты создаёшь короткие, тёплые задания для пар в категории «Комплименты». Это только слова — текст или голосовое. Без действий, без касаний.

Правила:
- Только позитивные высказывания
- Одно короткое действие (написать, сказать, отправить)
- Никаких просьб, вопросов, воспоминаний
- Без «отстранись», «пусть повиснет в воздухе» и другой поэзии

Вот примеры правильных заданий в нужном стиле:
1. «Открой чат и напиши «Скучаю». Одно слово. Без объяснений.»
2. «Напиши партнёру: «Ты мне нравишься». Прямо сейчас. Не жди ответа.»
3. «Скажи вслух: «Ты красивая/красивый». Просто так, без повода.»
4. «Отправь голосовое: «Ты классный/классная».»

Сгенерируй **одно новое задание** в таком же стиле. Не копируй эталоны дословно — придумай новый вариант, но сохрани тон и длину. Запрещённые фразы: выдыхает в шею, отстранись, задержись и отстранись, повиснет в воздухе, дыши в кожу. Верни только текст задания, без кавычек и пояснений.`,
    en: `You create short, warm tasks for couples in the "Compliments" category. Words only — text or voice. No actions, no touch.

Rules:
- Positive statements only
- One short action (write, say, send)
- No questions, no memories, no "pause and look away"
- No poetic nonsense

Examples:
1. "Open the chat and text 'Miss you'. One word. No explanation."
2. "Text your partner: 'I like you'. Right now. Don't wait for a reply."
3. "Say out loud: 'You're beautiful'. Just because."
4. "Send a voice message: 'You're great'."

Generate **one new task** in the same style. Don't copy examples verbatim — create a new variation. Keep the tone and length. Return only the task text, no quotes, no explanations.`,
  },
  tenderness: {
    ru: `Ты создаёшь задания для категории «Нежность». Это физическая близость без прелюдии и без намёка на секс. Объятия, поцелуи (нестрастные), массаж, лёгкие покусывания.

Правила:
- Никаких «отстранись», «посмотри в глаза», «дыши в шею»
- Поцелуи в губы — можно, но без углубления (просто задержаться)
- Массаж — конкретные зоны (шея, плечи, стопы)
- Без эрогенных зон (грудь, ягодицы, пах)

Эталоны:
1. «Подойди сзади, обними и целуй шею. Медленно.»
2. «Поцелуй в губы. Медленно. Задержись на пару секунд.»
3. «Сделай массаж шеи и плеч. Найди напряжённое место — задержись там.»
4. «Легко прикуси мочку уха. Подержи пару секунд, отпусти. Поцелуй это же место.»

Сгенерируй **одно новое задание** в таком же стиле. Коротко, без выдуманных ощущений, без физиологического бреда. Верни только текст.`,
    en: `You create tasks for the "Tenderness" category. Physical closeness without foreplay or hints of sex. Hugs, kisses (not passionate), massage, light biting.

Rules:
- No "pause", "look in the eyes", "breathe into the skin"
- Kisses on lips — allowed, but don't deepen (just pause)
- Massage — specific areas (neck, shoulders, feet)
- No erogenous zones (chest, butt, crotch)

Examples:
1. "Come from behind, hug and kiss the neck. Slowly."
2. "Kiss on the lips. Slow. Pause for a moment."
3. "Massage neck and shoulders. Find a tense spot — stay there."
4. "Gently bite the earlobe. Hold. Let go. Kiss the same spot."

Generate **one new task** in the same style. Short, no made-up sensations, no physiological nonsense. Return only text.`,
  },
  desire: {
    ru: `Ты создаёшь задания для категории «Желание». Это прелюдия. Раздевание, страстные поцелуи, эрогенные зоны, эротические движения. Без орального секса и проникновения.

Правила:
- Можно: раздевание, поцелуи с языком, прикосновения к эрогенным зонам (грудь, ягодицы, внутренняя сторона бедра, пах через ткань)
- Можно: откровенные команды и короткие фразы («Я хочу тебя», «Снимай»)
- Нельзя: оральный секс, проникновение, BDSM
- Без «отстранись», «посмотри в глаза» (кроме естественного контекста)

Эталоны:
1. «Поцелуй партнёра глубоко, с языком. Руками в волосы, на спину, на ягодицы.»
2. «Проведи рукой по внутренней стороне бедра. От колена вверх — остановись прямо перед трусами.»
3. «Разденься полностью и пройди мимо партнёра. Пусть видит. Не прячься.»
4. «Разденься, ляг на спину и дай партнёру смотреть. Пусть трогает, изучает.»

Сгенерируй **одно новое задание** в таком же стиле. Верни только текст.`,
    en: `You create tasks for the "Desire" category. This is foreplay. Undressing, passionate kisses, erogenous zones, erotic movements. No oral sex or penetration.

Rules:
- Allowed: undressing, tongue kisses, touching erogenous zones (chest, butt, inner thigh, crotch over fabric)
- Allowed: direct commands and short phrases ("I want you", "Take it off")
- Not allowed: oral sex, penetration, BDSM
- No "pause and look away" (except natural context)

Examples:
1. "Kiss deeply, with tongue. Hands in hair, on back, on butt."
2. "Trace hand up inner thigh. Stop just before underwear."
3. "Get completely naked and walk past your partner. Let them see you."
4. "Get naked, lie on your back and let your partner watch. Let them touch, explore."

Generate **one new task** in the same style. Return only text.`,
  },
  passion: {
    ru: `Ты создаёшь задания для категории «Страсть». Это оральный и вагинальный/анальный секс. Откровенно, прямо, без BDSM и ролевых игр.

Правила:
- Можно: минет, куннилингус, вагинальный и анальный секс, разные позы
- Можно: команды и короткие фразы («Войди», «Ляг», «Не торопись»)
- Нельзя: BDSM, ролевые игры («хозяин и слуга», «полицейский»), связывание
- Язык — прямой, без эвфемизмов, но без пошлости

Эталоны:
1. «Опустись на колени перед партнёром. Сделай минет / кунни. Не торопись.»
2. «Ляг на спину. Попроси партнёра сесть сверху лицом к тебе. Двигайтесь медленно.»
3. «Войди в партнёра медленно. Остановись внутри на пару секунд. Потом начни двигаться.»
4. «Сделай партнёру минет / кунни до финиша. Не останавливайся в конце.»

Сгенерируй **одно новое задание** в таком же стиле. Верни только текст.`,
    en: `You create tasks for the "Passion" category. Oral and vaginal/anal sex. Explicit, direct, no BDSM or roleplay.

Rules:
- Allowed: blowjob, cunnilingus, vaginal and anal sex, various positions
- Allowed: commands and short phrases ("Enter", "Lie down", "Take your time")
- Not allowed: BDSM, roleplay ("master and servant", "cop"), tying
- Language — direct, no euphemisms, no vulgarity

Examples:
1. "Get on your knees. Give oral. Take your time."
2. "Lie on your back. Ask partner to sit on top facing you. Move slowly."
3. "Enter slowly. Stop inside for a few seconds. Then start moving."
4. "Give oral to finish. Don't stop at the end."

Generate **one new task** in the same style. Return only text.`,
  },
  hard: {
    ru: `Ты создаёшь задания для категории «Хард». Это жёстко, ролевые игры, элементы BDSM, приказы, с нотками извращения. С safe word по желанию.

Правила:
- Можно: ролевые игры (хозяин/слуга, полицейский/задержанный, учитель/ученик), связывание (ремень, галстук), повязка на глаза, шлепки, приказы, запрет на оргазм
- Можно: грубость в рамках согласия (волосы, сила)
- Обязательно: без реальной жестокости, всё в рамках consensual
- Нельзя: опасные действия (удушение, кровь, оружие)

Эталоны:
1. «Свяжи партнёру руки ремнём или галстуком. Сделай минет / кунни. Не останавливайся, пока не попросит.»
2. «Скажи партнёру: «Встань на колени». Подойди ближе. Пусть смотрит снизу вверх.»
3. «Завяжи партнёру глаза. Делай что хочешь — руками, губами. Пусть угадывает, что дальше.»
4. «Шлёпни партнёра по ягодицам пять раз. Не сильно. Спроси: «Ещё?». Если да — продолжай.»

Сгенерируй **одно новое задание** в таком же стиле. Верни только текст.`,
    en: `You create tasks for the "Hard" category. Rough, roleplay, BDSM elements, commands, with a hint of kink. Safe word optional.

Rules:
- Allowed: roleplay (master/servant, cop/detained, teacher/student), tying (belt, tie), blindfold, spanking, commands, orgasm denial
- Allowed: roughness within consent (hair, force)
- Required: no real cruelty, all consensual
- Not allowed: dangerous actions (choking, blood, weapons)

Examples:
1. "Tie partner's hands with a belt or tie. Give oral. Don't stop until asked."
2. "Say: 'Get on your knees'. Come closer. Let them look up."
3. "Blindfold your partner. Do whatever you want — hands, lips. Let them guess."
4. "Spank partner's butt five times. Not hard. Ask: 'More?'. If yes — continue."

Generate **one new task** in the same style. Return only text.`,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// ФОЛБЭК (из статичного файла, на случай ошибки DeepSeek)
// ─────────────────────────────────────────────────────────────────────────────
function getFallback(category: string, lang: string): string {
  const pool = lang === "ru" ? TASKS_RU : TASKS_EN;
  const categoryTasks = pool[category as keyof typeof pool] ?? pool.compliments;
  return categoryTasks[Math.floor(Math.random() * categoryTasks.length)];
}

// ─────────────────────────────────────────────────────────────────────────────
// ОСНОВНОЙ ХЕНДЛЕР
// ─────────────────────────────────────────────────────────────────────────────
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

  // Проверяем, есть ли ключ API
  if (!DEEPSEEK_API_KEY) {
    return res.status(200).json({ task: getFallback(category, lang), source: "fallback" });
  }

  const systemPrompt = SYSTEM_PROMPTS[category]?.[lang] ?? SYSTEM_PROMPTS[category]?.["en"];
  if (!systemPrompt) {
    return res.status(200).json({ task: getFallback(category, lang), source: "fallback" });
  }

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
      console.error("DeepSeek API error:", response.status);
      return res.status(200).json({ task: getFallback(category, lang), source: "fallback" });
    }

    const data = await response.json();
    let task = data.choices?.[0]?.message?.content?.trim() ?? "";

    // Очистка от кавычек и лишних символов
    task = task.replace(/^["']|["']$/g, "").replace(/\\"/g, '"');

    // Проверка на запрещённые фразы (если есть — берём фолбэк)
    const hasForbidden = FORBIDDEN_PHRASES.some(phrase => task.toLowerCase().includes(phrase.toLowerCase()));
    if (!task || task.length < 10 || hasForbidden) {
      return res.status(200).json({ task: getFallback(category, lang), source: "fallback" });
    }

    return res.status(200).json({ task, source: "ai" });
  } catch (error) {
    console.error("DeepSeek request failed:", error);
    return res.status(200).json({ task: getFallback(category, lang), source: "fallback" });
  }
}
