// api/tasks/generate.ts
// POST /api/tasks/generate
// Body: { category, lang, gender? }

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { validateTelegramInitData } from "../couple/_auth.js";
import { TASKS_RU, TASKS_EN } from "../../src/data/tasks.js";

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY!;
const DEEPSEEK_URL = "https://api.deepseek.com/v1/chat/completions";

// Слова-триггеры, указывающие что ИИ говорит от своего лица, а не пишет задание
const FORBIDDEN: string[] = [
  "скажи мне", "сделай мне", "попроси меня", "посмотри на меня", "войди в меня",
  "ласкай меня", "трогай меня", "целуй меня", "обними меня", "расскажи мне",
  "tell me", "do it to me", "touch me", "kiss me", "hold me", "look at me",
  "выдыхает тебе", "пусть повиснет", "дыши в кожу", "томление", "прелюдия к прелюдии",
];

// Пол: кто пользователь, кто партнёр, как обращаться
function genderCtx(gender: string | undefined, lang: string): string {
  if (!gender) return "";
  const ru = lang === "ru";
  if (gender === "male") {
    return ru
      ? `\n\nПОЛ: Пользователь — МУЖЧИНА. Его партнёрша — ЖЕНЩИНА.\n- К пользователю: «подойди», «поцелуй», «скажи» (глаголы мужского рода)\n- О партнёрше: «её», «ей», «она»\n- Пример: «Подойди к ней сзади и поцелуй её в шею»\n- НЕЛЬЗЯ: «скажи мне», «сделай мне» — ИИ не партнёрша`
      : `\n\nGENDER: User is a MAN, partner is a WOMAN. Use "her/she" for partner. Never "tell me"/"do it to me".`;
  }
  return ru
    ? `\n\nПОЛ: Пользователь — ЖЕНЩИНА. Её партнёр — МУЖЧИНА.\n- К пользователю: «подойди», «поцелуй», «скажи» (глаголы женского рода)\n- О партнёре: «его», «ему», «он»\n- Пример: «Подойди к нему и поцелуй его в шею»\n- НЕЛЬЗЯ: «скажи мне», «сделай мне» — ИИ не партнёр`
    : `\n\nGENDER: User is a WOMAN, partner is a MAN. Use "him/he" for partner. Never "tell me"/"do it to me".`;
}

const PROMPTS: Record<string, Record<string, string>> = {
  compliments: {
    ru: `Пишешь короткие задания для пар: «Комплименты» — только слова (написать, сказать, отправить голосовое).

ПРАВИЛА:
- Обращение к пользователю: «ты» («напиши», «скажи», «отправь»)
- О партнёре — 3-е лицо (пол уточнён ниже)
- Никаких «скажи мне» / «напиши мне» — ИИ не партнёр
- Одно действие, без поэзии и метафор
- До 200 символов

Примеры:
«Напиши ей в чат: "Скучаю". Одно слово, без объяснений.»
«Скажи ему прямо сейчас: "Ты мне нравишься". Без повода.»
«Отправь голосовое: три секунды, только "Ты классный". Отправь.»
«Напиши в чат что-то одно — за что ценишь. Прямо сейчас.»

Одно новое задание. Только текст, без кавычек.`,

    en: `Short couple tasks — "Compliments" (words only: text, say, voice note).
Rules: Address user directly ("write", "say"). Partner = third person (gender below). NEVER "tell me". One action, no poetry. Max 200 chars.
Examples: "Text her: 'Miss you'. One word." / "Say out loud: 'You're beautiful'. No reason needed."
One new task. Text only, no quotes.`,
  },

  tenderness: {
    ru: `Пишешь задания: «Нежность» — мягкий физический контакт без прелюдии.

ПРАВИЛА:
- Допустимо: объятия, поцелуи в губы (не страстные), массаж шеи/плеч/стоп, лёгкие покусывания мочки уха
- Не допустимо: эрогенные зоны, страстные поцелуи с языком
- К пользователю: «ты» / 3-е лицо для партнёра (пол ниже)
- Нельзя «дыши мне», «смотри на меня»
- Физиологически реалистично. До 200 символов.

Примеры:
«Подойди к ней сзади, обними за плечи и поцелуй в шею. Медленно.»
«Возьми его руку и помассируй ладонь. Каждый палец. Не торопись.»
«Поцелуй её в губы — тихо, без спешки. Задержись.»
«Легко прикуси ему мочку уха, подержи секунду.»

Одно новое задание. Только текст, без кавычек.`,

    en: `Tasks — "Tenderness" (gentle contact, no foreplay).
Allowed: hugs, gentle lip kisses, neck/shoulder/foot massage, light earlobe bite. No erogenous zones. Realistic. Max 200 chars.
Examples: "Go behind her, hug her shoulders and kiss her neck. Slowly." / "Take his hand, massage the palm. Each finger. No rush."
One new task. Text only.`,
  },

  desire: {
    ru: `Пишешь задания: «Желание» — прелюдия, возбуждение.

ПРАВИЛА:
- Допустимо: страстные поцелуи с языком, раздевание, касания груди, ягодиц, внутренней части бедра, паха через ткань
- Не допустимо: оральный секс, проникновение
- К пользователю: «ты» / 3-е лицо для партнёра (пол ниже)
- Нельзя «сделай мне», «смотри на меня»
- ФИЗИОЛОГИЯ: только реальные движения обычного человека. Никаких невозможных поз.
- До 200 символов.

Примеры:
«Поцелуй её глубоко, с языком. Руки — в волосы, потом на спину.»
«Проведи рукой по внутренней стороне его бедра — снизу вверх, остановись у края трусов.»
«Медленно расстегни её рубашку. Поцелуй ключицы.»
«Прижми его к стене. Поцелуй в шею, спустись к ключицам.»

Одно новое задание. Только текст, без кавычек.`,

    en: `Tasks — "Desire" (foreplay, arousal).
Allowed: deep kisses, undressing, touching chest/butt/inner thigh/groin over fabric. No oral/penetration. Realistic moves only. Max 200 chars.
Examples: "Kiss her deeply with tongue. Hands in her hair, then down her back." / "Run your hand up his inner thigh — stop at the edge of his underwear."
One new task. Text only.`,
  },

  passion: {
    ru: `Пишешь задания: «Страсть» — оральный секс и секс с проникновением.

ПРАВИЛА:
- Допустимо: куннилингус, минет, вагинальный и анальный секс, разные позы
- Задания должны равномерно охватывать оба типа орального секса и позы
- К пользователю: «ты» / 3-е лицо для партнёра (пол уточнён ниже)
- НЕЛЬЗЯ: «сделай мне», «войди в меня» — ИИ не партнёр
- ФИЗИОЛОГИЯ — строго: только реальные позы и движения. Запрещено:
  · Анатомически невозможные позиции
  · Нереалистичная выносливость
  · Физически бессмысленные задания
- До 220 символов.

Примеры (чередуй разные варианты):
«Опустись перед ней на колени. Сделай ей куннилингус. Слушай дыхание.»
«Встань на четвереньки. Попроси его войти сзади. Пусть начнёт медленно.»
«Ляг на спину. Попроси её сесть сверху лицом к тебе. Руки на её бёдра.»
«Сделай ему минет до конца. Смотри на него.»
«Войди в неё сзади, стоя. Держи за бёдра. Медленно в начале.»
«Попроси её лечь на живот. Войди сзади.»

Одно новое задание. Только текст, без кавычек.`,

    en: `Tasks — "Passion" (oral sex and penetration).
Must include varied tasks: cunnilingus, blowjob, PIV/anal sex, positions. Address user directly, partner = third person (gender below). NEVER "do it to me". PHYSIOLOGY: only realistic acts. Max 220 chars.
Examples: "Get on your knees in front of her. Give cunnilingus. Listen to her breath." / "Ask him to enter from behind. Start slow." / "Give him a blowjob to finish."
One new task. Text only.`,
  },

  hard: {
    ru: `Пишешь задания: «Хард» — BDSM, доминирование, грязные разговоры, лёгкие извращения, ролевые. Всё в рамках согласия.

ПРАВИЛА:
- Допустимо:
  · BDSM: связывание (мягко), повязка на глаза, шлепки ладонью по ягодицам, кляп (шарф), капание воды
  · Доминирование: команды, унижение в рамках согласия («встань на колени», «попроси разрешения»)
  · Грязные разговоры: пошлые слова, вульгарные команды, описания вслух
  · Ролевые: незнакомец/незнакомка, начальник/подчинённая, учитель/ученица, доктор/пациент
  · Кинки: воск/лёд, съёмка на телефон (в рамках согласия), эджинг/запрет оргазма, стриптиз
- Не допустимо: удушение, боль с травмами, оружие, кровь
- К пользователю: «ты» / 3-е лицо для партнёра (пол ниже)
- НЕЛЬЗЯ «скажи мне», «сделай со мной»
- Используй прямой, резкий стиль — без романтики. До 220 символов.

Примеры:
«Скажи ей строго: "Раздевайся медленно. Смотри на меня". Не двигайся.»
«Войди в роль: ты — незнакомец в баре. Познакомься с ней заново. Прямо сейчас.»
«Завяжи ему глаза шарфом. Теперь делай всё что хочешь — медленно.»
«Запрети ему заканчивать. Доведи до края и остановись. Три раза.»
«Прикажи ей встать на колени и смотреть снизу вверх.»
«Возьми телефон и сними, как она медленно раздевается. Только с её согласия.»
«Капни ей на спину холодной водой. Посмотри на реакцию.»

Одно новое задание. Прямой стиль, без кавычек.`,

    en: `Tasks — "Hard" (BDSM, dominance, dirty talk, kinks, roleplay — all consensual).
Allowed: light bondage, blindfold, spanking, commands, humiliation (consensual), dirty talk, roleplay (stranger/boss/teacher), wax/ice, orgasm denial, filming (consensual).
Forbidden: choking, injury, weapons, blood.
Direct sharp style, no romance. Max 220 chars.
Examples: "Say firmly: 'Undress slowly. Keep your eyes on me.'" / "Play a stranger in a bar — introduce yourself to her again, right now." / "Blindfold him. Do whatever you want — slowly."
One new task. Text only.`,
  },
};

function getFallback(cat: string, lang: string): string {
  const pool = lang === "ru" ? TASKS_RU : TASKS_EN;
  const list = pool[cat as keyof typeof pool] ?? pool.compliments;
  return list[Math.floor(Math.random() * list.length)];
}

const MAX_CHARS = 260;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "https://t.me");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-telegram-init-data");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const initData = req.headers["x-telegram-init-data"] as string;
  if (!validateTelegramInitData(initData, process.env.BOT_TOKEN!))
    return res.status(401).json({ error: "Unauthorized" });

  const { category, lang = "ru", gender } = req.body as { category: string; lang?: string; gender?: string };
  if (!category) return res.status(400).json({ error: "category required" });
  if (!DEEPSEEK_API_KEY) return res.status(200).json({ task: getFallback(category, lang), source: "fallback" });

  const base = PROMPTS[category]?.[lang] ?? PROMPTS[category]?.["en"];
  if (!base) return res.status(200).json({ task: getFallback(category, lang), source: "fallback" });

  const systemPrompt = base + genderCtx(gender, lang);

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);

    const resp = await fetch(DEEPSEEK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${DEEPSEEK_API_KEY}` },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: lang === "ru" ? "Сгенерируй одно задание." : "Generate one task." },
        ],
        max_tokens: 160,
        temperature: 1.25,
      }),
      signal: ctrl.signal,
    });

    clearTimeout(timer);
    if (!resp.ok) return res.status(200).json({ task: getFallback(category, lang), source: "fallback" });

    const data = await resp.json();
    let task: string = data.choices?.[0]?.message?.content?.trim() ?? "";
    task = task.replace(/^[«"']|[»"']$/g, "").replace(/\\"/g, '"').trim();

    const bad = FORBIDDEN.some(p => task.toLowerCase().includes(p));
    if (!task || task.length < 10 || task.length > MAX_CHARS || bad)
      return res.status(200).json({ task: getFallback(category, lang), source: "fallback" });

    return res.status(200).json({ task, source: "ai" });
  } catch {
    return res.status(200).json({ task: getFallback(category, lang), source: "fallback" });
  }
}
