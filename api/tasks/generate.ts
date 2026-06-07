// api/tasks/generate.ts
// POST /api/tasks/generate
// Body: { category, lang, gender? }

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { validateTelegramInitData } from "../couple/_auth.js";
import { TASKS_RU, TASKS_EN } from "../../src/data/tasks.js";

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY!;
const DEEPSEEK_URL = "https://api.deepseek.com/v1/chat/completions";

const FORBIDDEN: string[] = [
  "скажи мне", "сделай мне", "попроси меня", "посмотри на меня", "войди в меня",
  "ласкай меня", "трогай меня", "целуй меня", "обними меня", "расскажи мне",
  "tell me", "do it to me", "touch me", "kiss me", "hold me", "look at me",
  "выдыхает тебе", "пусть повиснет", "дыши в кожу", "томление", "прелюдия к прелюдии",
];

// Лёгкий гендерный контекст для нейтральных категорий (комплименты, нежность, желание)
function genderCtx(gender: string | undefined, lang: string): string {
  if (!gender) return "";
  const ru = lang === "ru";
  if (gender === "male") {
    return ru
      ? `\n\nПОЛ: Пользователь — МУЖЧИНА. Его партнёрша — ЖЕНЩИНА.\nК пользователю: глаголы мужского рода. О партнёрше: «она/её/ей». НЕЛЬЗЯ: «скажи мне», «сделай мне».`
      : `\n\nGENDER: User is a MAN. Partner is a WOMAN. Use "her/she" for partner. Never "tell me"/"do it to me".`;
  }
  return ru
    ? `\n\nПОЛ: Пользователь — ЖЕНЩИНА. Её партнёр — МУЖЧИНА.\nК пользователю: глаголы женского рода. О партнёре: «он/его/ему». НЕЛЬЗЯ: «скажи мне», «сделай мне».`
    : `\n\nGENDER: User is a WOMAN. Partner is a MAN. Use "him/he" for partner. Never "tell me"/"do it to me".`;
}

// Промпты для нейтральных категорий — один на язык, гендер добавляется через genderCtx
const PROMPTS_NEUTRAL: Record<string, Record<string, string>> = {
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
- ФИЗИОЛОГИЯ: только реальные движения. Никаких невозможных поз.
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
};

// Промпты с разделением по полу — для Страсти и Харда (строгая физиология)
const PROMPTS_GENDERED: Record<string, Record<string, Record<string, string>>> = {
  passion: {
    ru: {
      male: `Пишешь задания для пары Мужчина + Женщина. Категория «Страсть» — оральный секс и проникновение.
Пользователь — МУЖЧИНА. Партнёрша — ЖЕНЩИНА.

ПРАВИЛА (строго):
- Задания адресованы ему: что он делает или что они делают вместе
- Он может: давать ей куннилингус, просить её сделать ему минет, проникать в неё (вагинально или анально), предлагать ей позу сверху
- НЕЛЬЗЯ: «войди в него», «он входит в тебя» — партнёр мужского пола, это неверно анатомически
- НЕЛЬЗЯ «скажи мне», «сделай мне» — ИИ не партнёрша
- Глаголы для пользователя — мужского рода
- Прямой стиль. До 220 символов.

Примеры:
«Опустись перед ней на колени и дай ей куннилингус. Слушай её дыхание.»
«Попроси её сделать тебе минет. Скажи, что хочешь.»
«Попроси её лечь на живот. Войди в неё сзади. Держи за бёдра.»
«Ляг на спину. Пусть она сядет на тебя сверху лицом к тебе.»
«Встань у кровати. Попроси её встать раком. Войди в неё. Медленно.»
«Поставь её к стене. Войди в неё стоя. Держи руки над её головой.»
«Попроси её лечь на спину. Войди в неё миссионером. Не торопись.»
«Сделай ей куннилингус, а потом войди — не останавливайся.»

Одно новое задание. Без кавычек. Только текст.`,

      female: `Пишешь задания для пары Мужчина + Женщина. Категория «Страсть» — оральный секс и проникновение.
Пользователь — ЖЕНЩИНА. Партнёр — МУЖЧИНА.

ПРАВИЛА (строго):
- Задания адресованы ей: что она делает или что они делают вместе
- Она может: делать ему минет, просить его дать ей куннилингус, просить его войти в неё (вагинально или анально), садиться на него сверху
- НЕЛЬЗЯ: «войди в него», «войди в неё» — перепутаны роли
- НЕЛЬЗЯ «скажи мне», «сделай мне» — ИИ не партнёр
- Глаголы для пользователя — женского рода
- Прямой стиль. До 220 символов.

Примеры:
«Опустись перед ним на колени и сделай ему минет. До конца.»
«Попроси его дать тебе куннилингус. Ляг и скажи что хочешь этого.»
«Сядь на него сверху лицом к нему. Двигайся в своём темпе.»
«Ляг на живот. Попроси его войти в тебя сзади. Пусть начнёт медленно.»
«Встань у стены. Попроси его войти в тебя стоя. Руки уприте в стену.»
«Ляг на спину. Попроси его войти — миссионер. Потяни его к себе.»
«Сделай ему минет, потом попроси его войти — не останавливайся.»
«Попроси его дать тебе куннилингус, а потом — войти сразу.»

Одно новое задание. Без кавычек. Только текст.`,
    },

    en: {
      male: `Tasks for a Man + Woman couple. Category: "Passion" — oral sex and penetration.
User is a MAN. Partner is a WOMAN.

RULES (strict):
- Tasks address him: what he does or they do together
- He can: give her cunnilingus, ask her for a blowjob, penetrate her (vaginally or anally), invite her on top
- NEVER "enter him" — the partner is a woman
- NEVER "tell me"/"do it to me" — the AI is not the partner
- Verbs masculine. Direct style. Max 220 chars.

Examples: "Get on your knees and give her cunnilingus. Listen to her breathing."
"Ask her to give you a blowjob. Tell her you want it."
"Ask her to lie face-down. Enter her from behind. Hold her hips."
"Lie on your back. Let her ride you facing you. Hands on her hips."
"Stand at the bed edge. Ask her to get on all fours. Enter her slowly."

One new task. No quotes. Text only.`,

      female: `Tasks for a Man + Woman couple. Category: "Passion" — oral sex and penetration.
User is a WOMAN. Partner is a MAN.

RULES (strict):
- Tasks address her: what she does or they do together
- She can: give him a blowjob, ask him to give her cunnilingus, ask him to enter her (vaginally or anally), ride him on top
- NEVER "enter him" — he penetrates her, not the other way
- NEVER "tell me"/"do it to me" — the AI is not the partner
- Verbs feminine. Direct style. Max 220 chars.

Examples: "Get on your knees and give him a blowjob. All the way."
"Ask him to give you cunnilingus. Lie back and say you want it."
"Sit on top of him facing him. Move at your own pace."
"Lie face-down. Ask him to enter you from behind. Tell him: slow."
"Stand against the wall. Ask him to take you from behind."

One new task. No quotes. Text only.`,
    },
  },

  hard: {
    ru: {
      male: `Пишешь задания для пары Мужчина + Женщина. Категория «Хард» — BDSM, доминирование, грязные разговоры, ролевые. В рамках согласия.
Пользователь — МУЖЧИНА. Партнёрша — ЖЕНЩИНА.

ПРАВИЛА (строго):
- Задания адресованы ему: он действует, она реагирует
- Он может: завязать ей глаза, связать ей руки, шлепнуть её по ягодицам, командовать ею, заставить её встать на колени, снять её на телефон (с согласия), запретить ей кончать (эджинг), капнуть ей воском/водой
- Ролевые: он — незнакомец/начальник/учитель, она — подчинённая/студентка/пациент
- Секс в Харде — ОБЯЗАТЕЛЬНО с кинки-элементом: или BDSM, или доминирование, или грязные слова
- НЕЛЬЗЯ: «войди в него», «он входит в тебя» — перепутаны роли
- НЕЛЬЗЯ: удушение, кровь, реальный вред
- НЕЛЬЗЯ «скажи мне», «сделай со мной» — ИИ не партнёрша
- Прямой, резкий стиль. До 220 символов.

Примеры:
«Скажи ей строго: "Раздевайся медленно. Смотри на меня". Не двигайся.»
«Завяжи ей глаза шарфом. Делай что хочешь — она не знает что дальше.»
«Прикажи ей встать на колени и смотреть снизу вверх. Жди.»
«Войди в неё сзади и прикажи: "Не шевелись". Удержи её за запястья.»
«Запрети ей кончать. Доведи до края — и остановись. Три раза.»
«Возьми телефон. Сними, как она раздевается. Только с её согласия.»
«Капни ей на спину воском/холодной водой. Посмотри на реакцию.»
«Войди в роль: ты — незнакомец в баре. Познакомься с ней заново.»

Одно новое задание. Прямой стиль. Без кавычек.`,

      female: `Пишешь задания для пары Мужчина + Женщина. Категория «Хард» — BDSM, доминирование, грязные разговоры, ролевые. В рамках согласия.
Пользователь — ЖЕНЩИНА. Партнёр — МУЖЧИНА.

ПРАВИЛА (строго):
- Задания адресованы ей: она действует или просит его действовать
- Она может: попросить его завязать ей глаза, попросить его связать ей руки, попросить его отшлепать её, встать на колени перед ним, приказать ему не двигаться (она доминирует), сделать ему стриптиз, попросить его войти в неё с командами
- Ролевые: она — незнакомка/начальница/пациентка/студентка, он — подчинённый/доктор/учитель
- Секс в Харде — ОБЯЗАТЕЛЬНО с кинки-элементом: BDSM, доминирование или грязные слова
- НЕЛЬЗЯ: «войди в него», «войди в неё» — физиология строго: он входит в неё
- НЕЛЬЗЯ: удушение, кровь, реальный вред
- НЕЛЬЗЯ «скажи мне», «сделай со мной» — ИИ не партнёр
- Прямой, резкий стиль. До 220 символов.

Примеры:
«Попроси его завязать тебе глаза и делать что хочет — ты не знаешь что дальше.»
«Встань на колени перед ним. Смотри снизу вверх. Жди его команды.»
«Прикажи ему не двигаться. Делай всё сама — медленно.»
«Попроси его отшлепать тебя по ягодицам. Скажи сколько раз хочешь.»
«Попроси его войти в тебя и прошептать что хочет с тобой сделать.»
«Сделай ему стриптиз. Медленно. Не давай трогать тебя — пока не разрешишь.»
«Войди в роль: ты — незнакомка в баре. Познакомься с ним заново.»
«Попроси его войти в тебя сзади и держать руки за спиной.»

Одно новое задание. Прямой стиль. Без кавычек.`,
    },

    en: {
      male: `Tasks for a Man + Woman couple. Category: "Hard" — BDSM, dominance, dirty talk, kinks, roleplay. All consensual.
User is a MAN. Partner is a WOMAN.

RULES (strict):
- Tasks address him: he acts, she reacts
- He can: blindfold her, tie her wrists, spank her, command her, make her kneel, film her (consensual), edge her, drip wax/water on her
- Sex in Hard MUST include a kinky element: BDSM, dominance, or dirty talk
- NEVER "enter him" — she is the woman
- NEVER choking, blood, real harm
- NEVER "tell me"/"do it to me"
- Direct sharp style. Max 220 chars.

Examples: "Say firmly: 'Undress slowly. Keep your eyes on me.' Don't move."
"Blindfold her. Do whatever you want — she doesn't know what's next."
"Enter her from behind and command: 'Don't move.' Hold her wrists."
"Edge her: bring her to the brink and stop. Three times."
"Get into character: you're a stranger in a bar. Introduce yourself again."

One new task. No quotes. Text only.`,

      female: `Tasks for a Man + Woman couple. Category: "Hard" — BDSM, dominance, dirty talk, kinks, roleplay. All consensual.
User is a WOMAN. Partner is a MAN.

RULES (strict):
- Tasks address her: she acts or asks him to act
- She can: ask him to blindfold her, ask him to spank her, kneel in front of him, command him not to move, give him a striptease, ask him to enter her with commands
- Sex in Hard MUST include a kinky element: BDSM, dominance, or dirty talk
- NEVER "enter him" — he enters her, not the other way
- NEVER choking, blood, real harm
- NEVER "tell me"/"do it to me"
- Direct sharp style. Max 220 chars.

Examples: "Ask him to blindfold you and do whatever he wants — you don't know what's next."
"Kneel in front of him. Look up. Wait for his command."
"Command him not to move. Do everything yourself — slowly."
"Ask him to spank you. Tell him how many times you want."
"Ask him to enter you from behind and whisper what he wants to do to you."

One new task. No quotes. Text only.`,
    },
  },
};

// Языковые директивы для не-EN/RU языков
const LANG_INSTRUCTION: Record<string, string> = {
  hi: "IMPORTANT: Write the task in Hindi (हिंदी). The entire response must be in Hindi script.",
  pt: "IMPORTANT: Write the task in Brazilian Portuguese (português). The entire response must be in Portuguese.",
  es: "IMPORTANT: Write the task in Spanish (español). The entire response must be in Spanish.",
};

function getFallback(cat: string, lang: string): string {
  const pool = lang === "ru" ? TASKS_RU : TASKS_EN;
  const list = pool[cat as keyof typeof pool] ?? pool.compliments;
  return list[Math.floor(Math.random() * list.length)];
}

function buildSystemPrompt(
  category: string,
  lang: string,
  gender: string | undefined
): string | null {
  const baseLang = ["hi", "pt", "es"].includes(lang) ? "en" : lang;

  // Категории с гендерными промптами
  const genderedDef = PROMPTS_GENDERED[category];
  if (genderedDef) {
    const g = gender === "male" || gender === "female" ? gender : "male";
    const prompt = genderedDef[baseLang]?.[g] ?? genderedDef["en"]?.[g];
    if (!prompt) return null;
    const langDir = LANG_INSTRUCTION[lang] ?? "";
    return langDir ? `${prompt}\n\n${langDir}` : prompt;
  }

  // Нейтральные категории
  const neutralDef = PROMPTS_NEUTRAL[category];
  if (!neutralDef) return null;
  const prompt = neutralDef[baseLang] ?? neutralDef["en"];
  if (!prompt) return null;
  const ctx = genderCtx(gender, baseLang);
  const langDir = LANG_INSTRUCTION[lang] ?? "";
  return [prompt, ctx, langDir ? `\n${langDir}` : ""].join("");
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

  const { category, lang = "ru", gender } = req.body as {
    category: string;
    lang?: string;
    gender?: string;
  };
  if (!category) return res.status(400).json({ error: "category required" });
  if (!DEEPSEEK_API_KEY) return res.status(200).json({ task: getFallback(category, lang), source: "fallback" });

  const systemPrompt = buildSystemPrompt(category, lang, gender);
  if (!systemPrompt) return res.status(200).json({ task: getFallback(category, lang), source: "fallback" });

  // Пользовательское сообщение — на нативном языке для hi/pt/es
  const userMsg: Record<string, string> = {
    ru: "Сгенерируй одно задание.",
    en: "Generate one task.",
    hi: "एक टास्क बनाएं।",
    pt: "Gere uma tarefa.",
    es: "Genera una tarea.",
  };

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
          { role: "user", content: userMsg[lang] ?? "Generate one task." },
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
