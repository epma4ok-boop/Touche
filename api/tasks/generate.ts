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

// Инструкция языка — добавляется к en-промпту для hi/pt/es
const LANG_INSTRUCTION: Record<string, string> = {
  hi: "\n\nCRITICAL: Write the task in HINDI only (हिंदी, Devanagari script). Natural conversational Hindi. Do NOT write in English.",
  pt: "\n\nCRITICAL: Write the task in BRAZILIAN PORTUGUESE only (Português). Natural, colloquial Brazilian Portuguese. Do NOT write in English.",
  es: "\n\nCRITICAL: Write the task in SPANISH only (Español). Natural Spanish. Do NOT write in English.",
};

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
    ru: `Пишешь задания: «Страсть» — оральный секс, секс с проникновением, мастурбация партнёра, ласка гениталий руками.

ПРАВИЛА:
- Допустимо:
  · Куннилингус, минет — подробно и чувственно
  · Вагинальный и анальный секс, разные позы
  · Мастурбация партнёра рукой (до финала или как прелюдия)
  · Нежный массаж гениталий ладонями и пальцами
  · Позы 69 (взаимный оральный секс)
- Задания должны равномерно чередовать: оральный секс / секс с проникновением / ласка руками
- К пользователю: «ты» / 3-е лицо для партнёра (пол уточнён ниже)
- НЕЛЬЗЯ: «сделай мне», «войди в меня» — ИИ не партнёр
- ФИЗИОЛОГИЯ — строго: только реальные позы и движения. Запрещено:
  · Анатомически невозможные позиции
  · Нереалистичная выносливость
- Чувственный, красивый язык — без грубости, но без стеснения
- До 230 символов.

Примеры:
«Возьми его рукой. Медленно, с нажимом — следи за дыханием. Только руки. До самого конца.»
«Опустись перед ней на колени. Сделай кунни — не торопись, читай её реакции. Доведи.»
«Начни с массажа внутренней стороны её бёдер. Медленно поднимайся к центру. Ласкай пальцами — пусть просит большего.»
«Встань на четвереньки. Попроси его войти сзади. Пусть начнёт медленно.»
«Ляг на спину. Попроси её сесть сверху лицом к тебе. Руки на её бёдра.»
«Сделай ему минет до конца. Смотри на него. Не останавливайся.»
«Лягте лицом друг к другу. Ласкайте друг друга ртом одновременно. Чувствуйте дыхание.»

Одно новое задание. Только текст, без кавычек.`,

    en: `Tasks — "Passion" (oral sex, penetration, hand stimulation, genital massage).
Must vary between: oral sex (cunnilingus/blowjob) / penetrative sex (positions) / manual stimulation (handjob, fingering, genital massage) / 69.
Address user directly, partner = third person (gender below). NEVER "do it to me". Sensual, beautiful language. PHYSIOLOGY: only realistic acts. Max 230 chars.
Examples: "Take him in your hand. Slow, deliberate — follow his breath. Just your hands. All the way." / "Get on your knees in front of her. Give oral — read her reactions. Bring her all the way." / "Start with a gentle massage of his inner thighs. Move slowly inward. Use your fingers — let him ask for more." / "Ask him to enter from behind. Start slow." / "Give him a blowjob to finish. Keep your eyes on him."
One new task. Text only.`,
  },

  hard: {
    ru: `Пишешь задания: «Хард» — секс с перчинкой. Обязательно должен быть секс (оральный, вагинальный или мастурбация) + элемент доминирования, BDSM, грязного разговора, ролевой игры или кинка. Не просто «свяжи и жди» — всегда есть реальное сексуальное действие.

ПРАВИЛА:
- В каждом задании: секс или ласка + перчинка. Примеры сочетаний:
  · Оральный секс + руки в волосы / команды / завязанные глаза
  · Секс + шлепки / команды / грубые слова
  · Фэйс-ситтинг + управление бёдрами
  · Секс + вибратор одновременно
  · Ролевая игра + реальный секс внутри сцены
  · Мастурбация партнёра + запрет двигаться / завязанные глаза
  · Секс + зеркало (смотреть на себя)
  · Доведение до края (эджинг) + запрет кончать
- Допустимо: связывание (мягко), шлепки ладонью, завязанные глаза, команды, унижение (согласовано), грязные слова, ролевые сцены, вибратор/игрушки, лёд/воск
- Не допустимо: удушение, физическая боль с травмами, оружие, кровь
- К пользователю: «ты» / 3-е лицо для партнёра (пол ниже)
- НЕЛЬЗЯ «скажи мне», «сделай со мной» — ИИ не партнёр
- Стиль: прямой, чувственный, немного дерзкий. Без лирики, без лишних слов.
- До 240 символов.

Примеры (чередуй разные сочетания!):
«Уложи его на спину. Встань над его лицом — медленно опускайся. Управляй бёдрами. Пусть работает.»
«Завяжи ей глаза. Возьми вибратор — води медленно по телу, добирайся до самого нежного последним. Пусть просит.»
«Войди в неё сзади. Возьми за волосы — не больно, в ритм движений. Скажи: "Смотри вперёд".»
«Свяжи ему руки над головой. Сядь сверху. Контролируй темп сама — он не двигается.»
«Сделай ей кунни — и одновременно шепчи, что именно делаешь. Каждое слово вслух.»
«Доведи его рукой почти до конца. Остановись. Подожди. Снова. Три раза. Потом скажи: "Теперь можно".»
«Ролевая игра: она — строгая начальница, ты — провинившийся. Прими "наказание" — и выполни её приказ в постели.»
«Поставь её перед зеркалом. Войди сзади. Прикажи: "Смотри на нас. Не отводи взгляд".»
«Включи вибратор на минимум. Используй его на ней, пока занимаешься оральным — одновременно.»

Одно новое задание. Текст без кавычек.`,

    en: `Tasks — "Hard" (sex with a kick). Every task must combine an actual sex act (oral, penetrative, or manual) WITH a kinky element: dominance, BDSM, dirty talk, roleplay, or a toy. Never just "tie and wait" — there's always real physical action.

Allowed combinations:
· Oral sex + hair-pulling / commands / blindfold
· Sex + spanking / commands / dirty talk
· Face-sitting + hip control
· Sex + vibrator at the same time
· Roleplay scene that includes real sex
· Handjob/fingering + can't move / blindfolded
· Sex in front of mirror
· Edging + orgasm denial

Allowed: light bondage, spanking (hand), blindfold, commands, consensual humiliation, dirty talk, roleplay, vibrator/toys, ice/wax.
Forbidden: choking, injury, weapons, blood.
Direct, sensual, slightly edgy style — no flowery language. Max 240 chars.

Examples:
"Lay him on his back. Rise above his face — lower yourself slowly. Control the rhythm with your hips. Let him work."
"Blindfold her. Take the vibrator — trace it slowly over her body, saving the most sensitive spot for last. Let her beg."
"Enter her from behind. Take her hair in your hand — not rough, just in rhythm. Say: 'Keep your eyes forward'."
"Tie his hands above his head. Sit on top. Control the pace yourself — he doesn't move."
"Give her oral — and whisper out loud exactly what you're doing. Every word."
"Bring him close with your hand. Stop. Wait. Again. Three times. Then say: 'Now you can'."
"Play: strict boss and guilty subordinate. She gives orders — you carry them out in bed."

One new task. Text only, no quotes.`,
  },
};

function getFallback(cat: string, lang: string): string {
  const pool = lang === "ru" ? TASKS_RU : TASKS_EN;
  const list = pool[cat as keyof typeof pool] ?? pool.compliments;
  return list[Math.floor(Math.random() * list.length)];
}

const MAX_CHARS = 280;

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

  // Use ru/en prompt as base; for hi/pt/es use en prompt + language instruction
  const baseKey = lang === "ru" ? "ru" : "en";
  const base = PROMPTS[category]?.[baseKey];
  if (!base) return res.status(200).json({ task: getFallback(category, lang), source: "fallback" });

  const langInstr = LANG_INSTRUCTION[lang] ?? "";
  const systemPrompt = base + langInstr + genderCtx(gender, lang);

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
          {
            role: "user",
            content: lang === "ru"
              ? "Сгенерируй одно задание."
              : lang === "hi"
              ? "एक कार्य बनाएं।"
              : lang === "pt"
              ? "Gere uma tarefa."
              : lang === "es"
              ? "Genera una tarea."
              : "Generate one task.",
          },
        ],
        max_tokens: 180,
        temperature: 1.3,
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
