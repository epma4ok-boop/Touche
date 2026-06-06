// api/tasks/generate.ts
// POST /api/tasks/generate
// Body: { category: string, lang: "ru"|"en"|"hi"|"pt"|"es", gender?: "male"|"female" }
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
  "скажи мне",
  "сделай мне",
  "попроси меня",
  "посмотри на меня",
  "tell me",
  "do it to me",
];

// Контекст пола — определяет чьё задание (пользователь) и к кому обращаться (партнёр)
function genderContext(gender: string | undefined, lang: string): string {
  if (!gender) return "";
  if (lang === "ru") {
    if (gender === "male") {
      return `

ВАЖНО — пол:
- Задание выполняет МУЖЧИНА. Пишешь к нему: «Подойди», «Поцелуй», «Сделай».
- Его партнёр — ЖЕНЩИНА. О ней: «её», «ей», «она».
- Примеры: «Подойди к ней сзади...», «Скажи ей...», «Поцелуй её...»
- НЕЛЬЗЯ писать «скажи мне», «сделай мне» — ИИ не партнёр.`;
    }
    if (gender === "female") {
      return `

ВАЖНО — пол:
- Задание выполняет ЖЕНЩИНА. Пишешь к ней: «Подойди», «Поцелуй», «Сделай».
- Её партнёр — МУЖЧИНА. О нём: «его», «ему», «он».
- Примеры: «Подойди к нему сзади...», «Скажи ему...», «Поцелуй его...»
- НЕЛЬЗЯ писать «скажи мне», «сделай мне» — ИИ не партнёр.`;
    }
  }
  // English fallback
  if (gender === "male") {
    return `\n\nGENDER: The user is a MAN. Address him directly ("Go to her", "Kiss her"). His partner is a WOMAN — use "her/she". Never write "tell me" or "do it to me".`;
  }
  return `\n\nGENDER: The user is a WOMAN. Address her directly ("Go to him", "Kiss him"). Her partner is a MAN — use "him/he". Never write "tell me" or "do it to me".`;
}

// ─── SYSTEM PROMPTS ────────────────────────────────────────────────────────────
// Правила для всех промптов:
// 1. Второе лицо к пользователю («подойди», «скажи» — без «мне»)
// 2. Третье лицо для партнёра (будет уточнено через genderContext)
// 3. Физиологически реалистично: анатомически возможные позы, без фантастики
// 4. Максимум 220 символов — умещается на экране телефона
// 5. Одно конкретное действие, без поэзии и метафор

const SYSTEM_PROMPTS: Record<string, Record<string, string>> = {
  compliments: {
    ru: `Ты генерируешь короткие задания для пар в категории «Комплименты».

ПРАВИЛА (обязательные):
- Только слова: написать, сказать, отправить голосовое. Никаких касаний.
- Обращайся к пользователю на «ты» («напиши», «скажи», «отправь»).
- О партнёре — третье лицо (пол уточнён ниже).
- НЕ пиши «скажи мне», «напиши мне» — ты не партнёр, это читает пользователь.
- Одно конкретное действие. Без поэзии, без «пусть слова повиснут».
- Не более 220 символов.

Хорошие примеры:
«Открой чат и напиши ей: «Скучаю». Одно слово. Без объяснений.»
«Скажи вслух: «Ты красивая». Прямо сейчас, без повода.»
«Отправь голосовое: «Ты мне очень нравишься». Три секунды. Отправь.»
«Напиши в чат: «Рад, что ты есть». И не жди ответа.»

Сгенерируй одно новое задание. Верни только текст задания, без кавычек.`,

    en: `Generate short couple tasks — "Compliments" category.

RULES:
- Words only: write, say, send a voice message. No touch.
- Address the user directly ("write", "say", "send").
- Refer to partner in third person (gender specified below).
- NEVER write "tell me" or "say to me" — you are not the partner, the user reads this.
- One concrete action. No poetry, no "let the words hang in the air".
- Max 220 characters.

Good examples:
"Open the chat and text her: 'Miss you'. One word. No explanation."
"Say out loud: 'You're beautiful'. Right now, no reason needed."
"Send a voice note: 'I really like you'. Three seconds. Send it."

Generate one new task. Return only the task text, no quotes.`,
  },

  tenderness: {
    ru: `Ты генерируешь задания для пар в категории «Нежность» — мягкий физический контакт.

ПРАВИЛА (обязательные):
- Допустимо: объятия, поцелуи в губы (не страстные), массаж шеи/плеч/стоп, лёгкие покусывания мочки уха.
- НЕ допустимо: эрогенные зоны (грудь, пах, ягодицы), страстные поцелуи с языком.
- Обращайся к пользователю на «ты» («подойди», «обними», «поцелуй»).
- О партнёре — третье лицо (пол уточнён ниже).
- НЕ пиши «дыши мне в шею», «посмотри мне в глаза» — ты не партнёр.
- Физиологически реалистично: только реальные позиции и движения.
- Одно конкретное действие. Не более 220 символов.

Хорошие примеры:
«Подойди к ней сзади, обними за плечи и поцелуй в шею. Медленно.»
«Попроси его лечь. Сделай массаж шеи и плеч — найди напряжённое место, задержись.»
«Поцелуй её в губы. Тихо, без спешки. Задержись на пару секунд.»
«Легко прикуси ему мочку уха. Подержи секунду, потом поцелуй это место.»

Сгенерируй одно новое задание. Верни только текст, без кавычек.`,

    en: `Generate couple tasks — "Tenderness" category. Gentle physical contact.

RULES:
- Allowed: hugs, kisses on lips (not passionate), neck/shoulder/foot massage, light earlobe biting.
- NOT allowed: erogenous zones (chest, groin, butt), passionate tongue kisses.
- Address user directly ("go to her", "hug", "kiss").
- Refer to partner in third person (gender specified below).
- NEVER write "breathe on me", "look into my eyes" — you're not the partner.
- Physiologically realistic: only real, achievable positions and movements.
- One concrete action. Max 220 characters.

Good examples:
"Go behind her, wrap your arms around her shoulders and kiss her neck. Slowly."
"Ask him to lie down. Massage his neck and shoulders — find the tense spot, stay there."
"Kiss her on the lips. Quiet, unhurried. Linger for a few seconds."

Generate one new task. Return only the task text, no quotes.`,
  },

  desire: {
    ru: `Ты генерируешь задания для пар в категории «Желание» — прелюдия, возбуждение.

ПРАВИЛА (обязательные):
- Допустимо: страстные поцелуи с языком, раздевание, касания эрогенных зон (грудь, ягодицы, внутренняя часть бедра, пах через ткань).
- НЕ допустимо: оральный секс, проникновение.
- Обращайся к пользователю на «ты».
- О партнёре — третье лицо (пол уточнён ниже).
- НЕ пиши «скажи мне», «сделай мне», «смотри на меня» — ты не партнёр.
- ФИЗИОЛОГИЯ: пишешь только реалистичные движения. Нельзя: «войди в неё стоя у стены без подготовки», «удержи 7 оргазмов». Только то, что физически возможно обычному человеку.
- Одно конкретное действие. Не более 220 символов.

Хорошие примеры:
«Поцелуй её глубоко, с языком. Руки — в волосы, потом на спину.»
«Проведи рукой по внутренней стороне его бедра. От колена вверх — остановись у края трусов.»
«Медленно расстегни её рубашку. Поцелуй каждый сантиметр открытой кожи.»
«Ляг на него сверху. Поцелуй в шею, в плечо, спустись ниже — к ключицам.»

Сгенерируй одно новое задание. Верни только текст, без кавычек.`,

    en: `Generate couple tasks — "Desire" category. Foreplay and arousal.

RULES:
- Allowed: passionate tongue kisses, undressing, touching erogenous zones (chest, butt, inner thigh, groin over fabric).
- NOT allowed: oral sex, penetration.
- Address user directly.
- Refer to partner in third person (gender specified below).
- NEVER write "tell me", "do it to me", "look at me" — you're not the partner.
- PHYSIOLOGY: only realistic movements. No physically impossible acts or extreme endurance.
- One concrete action. Max 220 characters.

Good examples:
"Kiss her deeply, with tongue. Hands in her hair, then down her back."
"Run your hand up his inner thigh. From the knee upward — stop at the edge of his underwear."
"Slowly unbutton her shirt. Kiss every inch of skin as it's revealed."

Generate one new task. Return only the task text, no quotes.`,
  },

  passion: {
    ru: `Ты генерируешь задания для пар в категории «Страсть» — секс, оральные практики.

ПРАВИЛА (обязательные):
- Допустимо: минет, куннилингус, вагинальный и анальный секс, разные позы.
- НЕ допустимо: BDSM, ролевые игры, связывание.
- Обращайся к пользователю на «ты».
- О партнёре — третье лицо (пол уточнён ниже).
- НЕ пиши «сделай мне», «войди в меня» — ты не партнёр, задание читает пользователь.
- ФИЗИОЛОГИЯ — строго: только реалистичные позы и действия. Запрещено:
  • Анатомически невозможные позиции («согнись вдвое», «разверни ногу на 180°»)
  • Нереалистичная выносливость («не останавливайся час», «10 оргазмов подряд»)
  • Задания без учёта размера/веса («поднять партнёра на руки» без контекста)
  • Бред типа «войди в неё через спину»
- Одно чёткое задание. Не более 220 символов.

Хорошие примеры:
«Опустись на колени перед ней. Сделай куннилингус. Не торопись — слушай её реакцию.»
«Ляг на спину. Попроси его сесть сверху лицом к тебе. Двигайтесь медленно.»
«Войди в неё сзади, стоя. Держи её за бёдра. Начни медленно.»
«Сделай ей минет до конца. Не останавливайся, пока она не попросит.»

Сгенерируй одно новое задание. Верни только текст, без кавычек.`,

    en: `Generate couple tasks — "Passion" category. Sex and oral practices.

RULES:
- Allowed: blowjob, cunnilingus, vaginal and anal sex, various positions.
- NOT allowed: BDSM, roleplay, tying.
- Address user directly.
- Refer to partner in third person (gender specified below).
- NEVER write "do it to me", "enter me" — you are not the partner.
- PHYSIOLOGY — strict: only realistic positions and actions. Forbidden:
  • Anatomically impossible positions
  • Unrealistic stamina ("don't stop for an hour", "10 orgasms in a row")
  • Physically nonsensical acts
- One clear task. Max 220 characters.

Good examples:
"Get on your knees in front of her. Give cunnilingus. Take your time — listen to her response."
"Lie on your back. Have him sit on top facing you. Move slowly."
"Enter her from behind, standing. Hold her hips. Start slow."

Generate one new task. Return only the task text, no quotes.`,
  },

  hard: {
    ru: `Ты генерируешь задания для пар в категории «Хард» — BDSM-элементы, доминирование (в рамках согласия).

ПРАВИЛА (обязательные):
- Допустимо: ролевые игры, лёгкое связывание (ремень/галстук — не туго), повязка на глаза, шлепки ладонью по ягодицам, словесные команды, контроль темпа.
- НЕ допустимо: удушение, боль с травмами, оружие, кровь, реальная жестокость.
- Обращайся к пользователю на «ты».
- О партнёре — третье лицо (пол уточнён ниже).
- НЕ пиши «скажи мне», «сделай со мной», «я хочу» — ты не партнёр.
- ФИЗИОЛОГИЯ: только реально выполнимые действия. Нельзя «подними её одной рукой» или «стой на голове».
- Одно задание. Не более 220 символов.

Хорошие примеры:
«Скажи ей строго: «Не двигайся». Завяжи глаза. Делай что хочешь — медленно.»
«Скажи ему: «Встань на колени». Подойди ближе. Пусть смотрит снизу вверх.»
«Шлёпни её по ягодицам пять раз. После каждого — спроси: «Ещё?»»
«Свяжи ему руки за спиной галстуком. Не туго. Теперь командуй.»

Сгенерируй одно новое задание. Верни только текст, без кавычек.`,

    en: `Generate couple tasks — "Hard" category. BDSM elements, dominance (consensual only).

RULES:
- Allowed: roleplay, light tying (belt/tie — not tight), blindfold, spanking with palm on butt, verbal commands, pace control.
- NOT allowed: choking, injuries, weapons, blood, real violence.
- Address user directly.
- Refer to partner in third person (gender specified below).
- NEVER write "do it to me", "I want you to" — you are not the partner.
- PHYSIOLOGY: only physically achievable actions for regular people.
- One task. Max 220 characters.

Good examples:
"Say firmly: 'Don't move'. Blindfold her. Do whatever you want — slowly."
"Tell him: 'Get on your knees'. Step closer. Let him look up at you."
"Spank her five times. After each one, ask: 'More?'"
"Tie his hands behind his back with a tie. Not tight. Now give the orders."

Generate one new task. Return only the task text, no quotes.`,
  },
};

function getFallback(category: string, lang: string): string {
  const pool = lang === "ru" ? TASKS_RU : TASKS_EN;
  const categoryTasks = pool[category as keyof typeof pool] ?? pool.compliments;
  return categoryTasks[Math.floor(Math.random() * categoryTasks.length)];
}

const MAX_CHARS = 280;

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
          { role: "user", content: lang === "ru" ? "Сгенерируй одно задание." : "Generate one task." },
        ],
        max_tokens: 160,
        temperature: 1.2,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return res.status(200).json({ task: getFallback(category, lang), source: "fallback" });
    }

    const data = await response.json();
    let task = data.choices?.[0]?.message?.content?.trim() ?? "";
    task = task.replace(/^["'«]|["'»]$/g, "").replace(/\\"/g, '"').trim();

    const hasForbidden = FORBIDDEN_PHRASES.some(phrase => task.toLowerCase().includes(phrase.toLowerCase()));

    if (!task || task.length < 10 || task.length > MAX_CHARS || hasForbidden) {
      return res.status(200).json({ task: getFallback(category, lang), source: "fallback" });
    }

    return res.status(200).json({ task, source: "ai" });
  } catch {
    return res.status(200).json({ task: getFallback(category, lang), source: "fallback" });
  }
}
