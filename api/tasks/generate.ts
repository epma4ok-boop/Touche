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

const PROMPTS: Record<string, Record<string, string>> = {
  compliments: {
    ru: `Сгенерируй ОДНО задание для категории "КОМПЛИМЕНТЫ".

Выбери ОДИН из этих типов:
1. Скажи партнёру тёплое слово ("Скучаю", "Ты красивая/красивый", "Я тебя люблю")
2. Напиши партнёру тёплое слово
3. Отправь голосовое с тёплыми словами
4. Сделай селфи с улыбкой и отправь
5. Сделай селфи с воздушным поцелуем и отправь
6. Запиши короткое видео с тёплым обращением
7. Купи шоколадку без повода
8. Напиши записку с комплиментом и положи под подушку
9. Напиши благодарность за конкретную мелочь сегодня
10. Напиши партнёру, что ценишь его/её характер
11. Отправь фото места, где вам было хорошо вместе
12. Напиши длинное тёплое сообщение перед сном
13. Сделай коллаж из ваших совместных фото
14. Отправь песню, которая ассоциируется с партнёром
15. Скажи комплимент действию партнёра
16. Напиши список из трёх вещей, за которые благодарен(на) сегодня
17. Сделай селфи в его/её вещи и отправь
18. Напиши партнёру, что он/она делает тебя счастливее

Правила: ОДНО действие, без касаний, без намёков на секс, до 180 символов.
Верни ТОЛЬКО текст задания. Без кавычек, без пояснений.`,
    en: `Generate ONE task for "COMPLIMENTS" category.

Pick ONE type:
1. Say a warm word to your partner ("Miss you", "You're beautiful", "I love you")
2. Text a warm word
3. Send a voice message with warm words
4. Take a smiling selfie and send
5. Take a selfie with a kiss gesture and send
6. Record a short video with a warm message
7. Buy a chocolate bar for no reason
8. Write a note with a compliment and put it under the pillow
9. Write gratitude for a specific small thing today
10. Text your partner what you value about their character
11. Send a photo of a place where you were good together
12. Write a long warm message before sleep
13. Make a collage of your photos together
14. Send a song that reminds you of your partner
15. Compliment your partner's action
16. Write a list of three things you're grateful for today
17. Take a selfie in their clothes and send
18. Text your partner that they make you happier

Rules: ONE action, no touching, no sexual hints, max 180 chars.
Return ONLY the task text. No quotes, no explanations.`,
  },
  tenderness: {
    ru: `Сгенерируй ОДНО задание для категории "НЕЖНОСТЬ".

Выбери ОДИН из этих типов:
1. Подойди сзади, обними и постой так минуту
2. Поцелуй в губы медленно, задержись
3. Поцелуй в шею или плечо
4. Сделай массаж (голова, шея, спина, руки, ноги)
5. Почеши спину или голову
6. Легко прикуси мочку уха
7. Легко прикуси плечо или ключицу
8. Возьми за руку и смотри друг на друга
9. Сделай селфи с воздушным поцелуем и отправь
10. Отправь старое совместное фото с вопросом "помнишь?"
11. Укрой партнёра пледом
12. Положи голову партнёру на колени
13. Погладь по спине медленно
14. Приготовь чай или кофе
15. Прижмись щекой к его/её щеке
16. Сделай массаж стоп
17. Обними и закрой глаза
18. Поправь волосы партнёру
19. Поцелуй в лоб
20. Легко прикуси нижнюю губу

Правила: ОДНО действие, без раздевания, без эрогенных зон, без намёков на секс, до 180 символов.
Верни ТОЛЬКО текст задания. Без кавычек, без пояснений.`,
    en: `Generate ONE task for "TENDERNESS" category.

Pick ONE type:
1. Hug from behind and stand for a minute
2. Kiss on the lips slowly, hold
3. Kiss the neck or shoulder
4. Give a massage (head, neck, back, arms, legs)
5. Scratch the back or head
6. Gently bite the earlobe
7. Gently bite the shoulder or collarbone
8. Hold hands and look at each other
9. Take a selfie with a kiss gesture and send
10. Send an old photo together with "remember?"
11. Cover your partner with a blanket
12. Put your head on your partner's lap
13. Stroke the back slowly
14. Make tea or coffee
15. Press your cheek to theirs
16. Give a foot massage
17. Hug and close your eyes
18. Fix your partner's hair
19. Kiss the forehead
20. Gently bite the lower lip

Rules: ONE action, no undressing, no erogenous zones, no sexual hints, max 180 chars.
Return ONLY the task text. No quotes, no explanations.`,
  },
  desire: {
    ru: `Сгенерируй ОДНО задание для категории "ЖЕЛАНИЕ" — прелюдия, без секса.

Выбери ОДИН из этих типов:
1. Медленно разденься перед партнёром
2. Пройди мимо партнёра полностью голым
3. Надень фартук на голое тело и начни готовить
4. Сделай фото в белье и отправь
5. Запиши видео в белье и отправь
6. Положи руку на пах поверх одежды и смотри в глаза
7. Массируй вокруг эрогенных зон, не касаясь центра
8. Поцелуй вокруг сосков, не касаясь их
9. Оближи внутреннюю сторону бедра, не касаясь центра
10. Прошепчи на ухо грязную фразу
11. Поцелуй глубоко, с языком
12. Ляг голой и дай партнёру смотреть и трогать
13. Надень его/её рубашку на голое тело и сядь рядом
14. Сделай фото в сексуальной позе и отправь
15. Раздень партнёра медленно
16. Проведи рукой от колена вверх по бедру, остановись у трусов
17. Сядь на колени перед партнёром
18. Прикажи партнёру снять штаны
19. Поцелуй через ткань
20. Сделай фото своих голых ног, раздвинутых

Правила: ОДНО действие, без секса, без орального, без проникновения, до 200 символов.
Верни ТОЛЬКО текст задания. Без кавычек, без пояснений.`,
    en: `Generate ONE task for "DESIRE" category — foreplay, no sex.

Pick ONE type:
1. Slowly undress in front of your partner
2. Walk past your partner completely naked
3. Put on an apron on your naked body and start cooking
4. Take a photo in lingerie and send
5. Record a video in lingerie and send
6. Put your hand on the crotch over clothes and look into eyes
7. Massage around erogenous zones, not touching the center
8. Kiss around the nipples, not touching them
9. Lick the inner thigh, not touching the center
10. Whisper a dirty phrase in the ear
11. Kiss deeply with tongue
12. Lie down naked and let your partner look and touch
13. Put on their shirt on your naked body and sit next to them
14. Take a photo in a sexy pose and send
15. Slowly undress your partner
16. Run your hand from the knee up the thigh, stop at the underwear
17. Kneel in front of your partner
18. Command your partner to take off their pants
19. Kiss through fabric
20. Take a photo of your naked legs spread

Rules: ONE action, no sex, no oral, no penetration, max 200 chars.
Return ONLY the task text. No quotes, no explanations.`,
  },
  passion: {
    ru: `Сгенерируй ОДНО задание для категории "СТРАСТЬ" — секс красиво, чувственно.

Выбери ОДИН из этих типов:
1. Войди медленно, застынь, начни в ритме дыхания
2. Сделай оральный секс, глядя в глаза
3. Встаньте перед зеркалом, войди сзади
4. Вставь наушники с музыкой, делай всё молча
5. Проведи кубиком льда по телу, потом оральный секс
6. Нанеси взбитые сливки, слизывай, потом оральный секс
7. Сделай массаж с тёплым маслом, потом войди
8. Сделай фото голого тела красиво и отправь
9. Запиши видео голого тела без лица
10. Снимите секс на видео для коллекции, красиво
11. Надень съедобные трусы и сними зубами
12. Начни медленно, постепенно ускоряйся
13. Ляг на бок, пусть войдёт медленно, смотри в глаза
14. Войди, потом поцелуй в шею, потом продолжай
15. Сделай глубокий оральный секс
16. Используй подушки для позы
17. Войди стоя, держи партнёра за бёдра
18. Сделай фото частей тела во время секса
19. Запиши голос во время секса
20. Доведи партнёра до оргазма и продолжай

Правила: ОДНО действие, без пошлости, без грубости, без подчинения, до 200 символов.
Верни ТОЛЬКО текст задания. Без кавычек, без пояснений.`,
    en: `Generate ONE task for "PASSION" category — beautiful, sensual sex.

Pick ONE type:
1. Enter slowly, freeze, start with breathing rhythm
2. Perform oral sex looking into eyes
3. Stand in front of mirror, enter from behind
4. Put on headphones with music, do everything silently
5. Run an ice cube over the body, then oral sex
6. Apply whipped cream, lick off, then oral sex
7. Give a massage with warm oil, then enter
8. Take a beautiful nude photo and send
9. Record a nude video without face
10. Record sex for collection, beautifully
11. Put on edible underwear and remove with teeth
12. Start slowly, gradually speed up
13. Lie on your side, let them enter slowly, look into eyes
14. Enter, then kiss the neck, then continue
15. Perform deep oral sex
16. Use pillows for position
17. Enter standing, hold your partner's hips
18. Take a photo of body parts during sex
19. Record voice during sex
20. Bring your partner to orgasm and continue

Rules: ONE action, no vulgarity, no roughness, no submission, max 200 chars.
Return ONLY the task text. No quotes, no explanations.`,
  },
  hard: {
    ru: `Сгенерируй ОДНО задание для категории "ХАРД" — секс с контролем и игрой власти.

Выбери ОДИН из этих типов:
1. Подчинение на 30 минут, стоп-слово обязательно
2. Прикажи: "Ляг", "Закрой глаза", "Не двигайся"
3. Свяжи руки шарфом
4. Надень маску на глаза и делай что хочешь
5. Надень наручники
6. Используй лёгкую плетку по спине или ягодицам
7. Сядь на лицо партнёру и командуй
8. Сделай минет до финиша в рот и проглоти
9. Сделай глубокий минет до горла
10. Держи за голову во время минета и задавай темп
11. Снимите секс грязно, без света, для себя
12. Сними от первого лица (рука, член, влагалище)
13. Включи камеру и прикажи смотреть в неё
14. Массируй и одновременно входи
15. Шлёпай по ягодицам в ритм движениям
16. Ролевая игра (начальник/подчинённый) на 10 минут
17. Доведи до края, останови, повтори три раза
18. Прикажи партнёру встать на колени
19. Держи партнёра за волосы во время секса
20. Используй стоп-слово, если что-то не так

Правила: стоп-слово всегда, без красивых ракурсов, без эстетики, до 200 символов.
Верни ТОЛЬКО текст задания. Без кавычек, без пояснений.`,
    en: `Generate ONE task for "HARD" category — sex with control and power play.

Pick ONE type:
1. Submission for 30 minutes, safe word required
2. Command: "Lie down", "Close your eyes", "Don't move"
3. Tie hands with a scarf
4. Put on a blindfold and do whatever you want
5. Put on handcuffs
6. Use a light whip on back or buttocks
7. Sit on partner's face and command
8. Give oral to finish in mouth and swallow
9. Perform deep throat
10. Hold head during oral and set the pace
11. Record dirty sex without light for yourselves
12. Record first-person (hand, penis, vagina)
13. Turn on camera and command to look into it
14. Massage and penetrate at the same time
15. Spank buttocks in rhythm of movements
16. Roleplay (boss/subordinate) for 10 minutes
17. Bring to edge, stop, repeat three times
18. Command your partner to kneel
19. Hold partner's hair during sex
20. Use a safe word if something is wrong

Rules: safe word always, no beautiful angles, no aesthetics, max 200 chars.
Return ONLY the task text. No quotes, no explanations.`,
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
        temperature: 0.9,
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
      "я хочу", "давай я", "я буду",
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
