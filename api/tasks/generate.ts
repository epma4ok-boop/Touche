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
const DEEPSEEK_URL    = "https://api.deepseek.com/v1/chat/completions";

type StaticPool = Record<string, string[]>;

const STATIC_POOLS: Record<string, StaticPool> = {
  ru: TASKS_RU,
  en: TASKS_EN,
  hi: TASKS_HI,
  pt: TASKS_PT,
  es: TASKS_ES,
};

// ── Fallback из статического пула ─────────────────────────────────────────────
function getFallback(cat: string, lang: string): string {
  const pool = STATIC_POOLS[lang] ?? STATIC_POOLS["en"];
  const list = (pool as StaticPool)[cat] ?? (pool as StaticPool)["compliments"];
  return list[Math.floor(Math.random() * list.length)];
}

// ── Системные промпты (ИИ НЕ говорит от себя, только задание) ──────────────
function buildSystemPrompt(category: string, lang: string, gender: string): string {
  const genderMap: Record<string, Record<string, string>> = {
    ru: {
      male:   "Пользователь — мужчина, партнёр — женщина. Используй 'ты' для пользователя, 'она/её/ей' для партнёрши. Глаголы мужского рода.",
      female: "Пользователь — женщина, партнёр — мужчина. Используй 'ты' для пользователя, 'он/его/ему' для партнёра. Глаголы женского рода.",
    },
    en: {
      male:   "User is male, partner is female. Use 'you' for user, 'she/her' for partner. Male verbs.",
      female: "User is female, partner is male. Use 'you' for user, 'he/him' for partner. Female verbs.",
    },
    hi: {
      male:   "उपयोगकर्ता पुरुष है, पार्टनर महिला है।",
      female: "उपयोगकर्ता महिला है, पार्टनर पुरुष है।",
    },
    pt: {
      male:   "Usuário é homem, parceira é mulher. Use 'você' e 'ela/dela'.",
      female: "Usuária é mulher, parceiro é homem. Use 'você' e 'ele/dele'.",
    },
    es: {
      male:   "El usuario es hombre, la pareja es mujer. Usa 'tú' y 'ella/su'.",
      female: "La usuaria es mujer, la pareja es hombre. Usa 'tú' y 'él/su'.",
    },
  };

  const genderLine = genderMap[lang]?.[gender] ?? genderMap["en"]["male"];

  const prompts: Record<string, Record<string, string>> = {
    compliments: {
      ru: `Сгенерируй ОДНО задание для категории "Комплименты".

Типы заданий (выбери один случайно):
- сказать или написать тёплое слово («Скучаю», «Ты красивая», «Я люблю тебя»)
- записать голосовое с тёплыми словами
- отправить селфи с улыбкой
- отправить селфи с воздушным поцелуем
- записать короткое видео с тёплым обращением
- сделать мини-сюрприз (шоколад, записка, чай)
- написать благодарность за конкретную мелочь сегодня

Правила: одно действие, без касаний, без намёков на секс, до 180 символов. Верни только текст задания, без кавычек, без пояснений.`,
      en: `Generate ONE task for "Compliments" category.

Types (pick one randomly):
- say or text a warm word ("Miss you", "You're beautiful", "I love you")
- send a voice message with warm words
- send a smiling selfie
- send a selfie with a kiss gesture
- record a short video with a warm message
- make a mini-surprise (chocolate, note, tea)
- write gratitude for a specific small thing today

Rules: one action, no touching, no sexual hints, max 180 chars. Return only the task text, no quotes, no explanations.`,
    },
    tenderness: {
      ru: `Сгенерируй ОДНО задание для категории "Нежность".

Типы заданий (выбери один случайно):
- обнять сзади и постоять так
- поцеловать в губы медленно
- поцеловать в шею или плечо
- сделать массаж (голова, шея, спина, руки, ноги)
- почесать спину или голову
- легко прикусить мочку уха или плечо
- взять за руку и смотреть друг на друга
- отправить селфи с воздушным поцелуем
- отправить старое совместное фото с вопросом «помнишь?»

Правила: одно действие, без раздевания, без эрогенных зон, без намёков на секс, до 180 символов. Верни только текст задания, без кавычек, без пояснений.`,
      en: `Generate ONE task for "Tenderness" category.

Types (pick one randomly):
- hug from behind and stand still
- kiss on the lips slowly
- kiss the neck or shoulder
- give a massage (head, neck, back, arms, legs)
- scratch the back or head
- gently bite the earlobe or shoulder
- hold hands and look at each other
- send a selfie with a kiss gesture
- send an old photo together with "remember?"

Rules: one action, no undressing, no erogenous zones, no sexual hints, max 180 chars. Return only the task text, no quotes, no explanations.`,
    },
    desire: {
      ru: `Сгенерируй ОДНО задание для категории "Желание" — прелюдия, без секса.

Типы заданий (выбери один случайно):
- медленно раздеться перед партнёром
- пройти мимо партнёра полностью голым
- надеть фартук на голое тело и готовить
- сделать фото в белье и отправить
- записать видео в белье
- положить руку на пах поверх одежды
- массировать вокруг эрогенных зон, не касаясь центра
- поцеловать и облизать вокруг сосков, не касаясь
- прошептать на ухо грязную фразу
- поцеловать глубоко, с языком
- лечь голой и дать партнёру смотреть

Правила: одно действие, без секса, без орального, без проникновения, до 200 символов. Верни только текст задания, без кавычек, без пояснений.`,
      en: `Generate ONE task for "Desire" category — foreplay, no sex.

Types (pick one randomly):
- undress slowly in front of partner
- walk past partner completely naked
- put on an apron on naked body and cook
- take a photo in lingerie and send
- record a video in lingerie
- put a hand on crotch over clothes
- massage around erogenous zones, not touching the center
- kiss and lick around nipples, not touching
- whisper a dirty phrase in the ear
- kiss deeply with tongue
- lie down naked and let partner look

Rules: one action, no sex, no oral, no penetration, max 200 chars. Return only the task text, no quotes, no explanations.`,
    },
    passion: {
      ru: `Сгенерируй ОДНО задание для категории "Страсть" — секс красиво, чувственно.

Типы заданий (выбери один случайно):
- войти медленно, застыть, начать по ритму дыхания
- сделать оральный секс, глядя в глаза
- встать перед зеркалом, войти сзади
- вставить наушники с музыкой, делать всё молча
- провести кубиком льда по телу, потом оральный секс
- нанести взбитые сливки, слизывать, потом оральный секс
- сделать массаж с маслом, потом секс
- снять фото голого тела красиво и отправить
- записать видео голого тела без лица
- снять секс на видео для коллекции, красиво
- надеть съедобные трусы и снять зубами

Правила: одно действие, без пошлости, без грубости, без подчинения, до 200 символов. Верни только текст задания, без кавычек, без пояснений.`,
      en: `Generate ONE task for "Passion" category — beautiful, sensual sex.

Types (pick one randomly):
- enter slowly, freeze, start with breathing rhythm
- perform oral sex, looking into eyes
- stand in front of mirror, enter from behind
- put on headphones with music, do everything silently
- run an ice cube over the body, then oral sex
- apply whipped cream, lick off, then oral sex
- give an oil massage, then sex
- take a beautiful nude photo and send
- record a nude video without face
- record sex for collection, beautifully
- put on edible underwear and remove with teeth

Rules: one action, no vulgarity, no roughness, no submission, max 200 chars. Return only the task text, no quotes, no explanations.`,
    },
    hard: {
      ru: `Сгенерируй ОДНО задание для категории "Хард" — секс с контролем и игрой власти.

Типы заданий (выбери один случайно):
- подчинение на 30 минут, стоп-слово обязательно
- приказы: «Ляг», «Закрой глаза», «Не двигайся»
- связать руки шарфом
- надеть маску на глаза и делать что хочешь
- надеть наручники
- использовать лёгкую плетку по спине или ягодицам
- сесть на лицо партнёру и командовать
- сделать минет до финиша в рот и проглотить
- сделать глубокий минет до горла
- держать за голову во время минета и задавать темп
- снять секс грязно, без света, для себя
- снять от первого лица (рука, член, влагалище)
- включить камеру и приказать смотреть в неё
- массировать и одновременно входить
- шлёпать по ягодицам в ритм движениям
- ролевая игра (начальник/подчинённый) на 10 минут
- довести до края, остановить, повторить три раза

Правила: стоп-слово всегда, без красивых ракурсов, без эстетики, до 200 символов. Верни только текст задания, без кавычек, без пояснений.`,
      en: `Generate ONE task for "Hard" category — sex with control and power play.

Types (pick one randomly):
- submission for 30 minutes, safe word required
- commands: "Lie down", "Close your eyes", "Don't move"
- tie hands with a scarf
- put on a blindfold and do whatever you want
- put on handcuffs
- use a light whip on back or butt
- sit on partner's face and command
- give oral to finish in mouth and swallow
- give deep throat
- hold head during oral and set pace
- record dirty sex without light for yourselves
- record first-person (hand, penis, vagina)
- turn on camera and command to look into it
- massage and penetrate at the same time
- spank butt in rhythm of movements
- roleplay (boss/subordinate) for 10 minutes
- bring to edge, stop, repeat three times

Rules: safe word always, no beautiful angles, no aesthetics, max 200 chars. Return only the task text, no quotes, no explanations.`,
    },
  };

  const base = prompts[category]?.[lang] ?? prompts["compliments"]["en"];
  return `${base}\n\n${genderLine}`;
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
    const systemPrompt = buildSystemPrompt(category, lang, gender);

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
          { role: "user", content: "Сгенерируй одно задание." },
        ],
        max_tokens: 160,
        temperature: 0.9,
      }),
    });

    if (!aiRes.ok) {
      return res.json({ task: getFallback(category, lang) });
    }

    const data = await aiRes.json();
    let task: string = data.choices?.[0]?.message?.content?.trim() ?? "";

    // Чистка
    task = task.replace(/^["']|["']$/g, "").trim();
    task = task.replace(/^\d+\.\s*/, "");

    // Запрещённые фразы
    const forbidden = [
      "я рекомендую", "тебе стоит", "можешь попробовать",
      "выдыхает", "дыши в", "посмотри в глаза", "отстранись",
    ];
    const hasForbidden = forbidden.some(f => task.toLowerCase().includes(f));

    if (!task || task.length < 15 || task.length > 300 || hasForbidden) {
      return res.json({ task: getFallback(category, lang) });
    }

    return res.json({ task });
  } catch {
    return res.json({ task: getFallback(category, lang) });
  }
}
