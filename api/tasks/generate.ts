// api/tasks/generate.ts
// POST /api/tasks/generate
// Body: { category, lang, gender? } — gender всегда male или female

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

// ── Запрещённые паттерны ──────────────────────────────────────────────────────
const FORBIDDEN = [
  "скажи мне", "сделай мне", "попроси меня", "посмотри на меня",
  "ласкай меня", "трогай меня", "целуй меня", "обними меня", "расскажи мне",
  "tell me", "do it to me", "touch me", "kiss me", "hold me", "look at me",
  "растворись", "замри в тишине", "почувствуй вечность", "слейтесь",
  "пусть повиснет", "дыши в кожу", "прелюдия к прелюдии", "томление",
  "давай я ", "я буду ", "я сделаю тебе", "я хочу тебя", "let me ", "i will do",
  "выдыхает", "вдох", "выдох",
];

// ── Fallback из статического пула ─────────────────────────────────────────────
function getFallback(cat: string, lang: string): string {
  const pool = STATIC_POOLS[lang] ?? STATIC_POOLS["en"];
  const list = (pool as StaticPool)[cat] ?? (pool as StaticPool)["compliments"];
  return list[Math.floor(Math.random() * list.length)];
}

// ── Build 5 gold-standard examples from the static pool ──────────────────────
function getGoldExamples(cat: string, lang: string, count = 5): string {
  const pool = STATIC_POOLS[lang] ?? STATIC_POOLS["en"];
  const list = [...((pool as StaticPool)[cat] ?? (pool as StaticPool)["compliments"])];
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list.slice(0, count).map((t, i) => `${i + 1}. ${t}`).join("\n");
}

// ── Hard category: 10 flavor types ────────────────────────────────────────────
const HARD_FLAVOR_KEYS = [
  "roleplay", "edging", "ice_wax", "blindfold", "commands",
  "striptease", "mirror", "binding", "voice_control", "spanking",
] as const;

type HardFlavorKey = typeof HARD_FLAVOR_KEYS[number];

function pickHardFlavor(): HardFlavorKey {
  return HARD_FLAVOR_KEYS[Math.floor(Math.random() * HARD_FLAVOR_KEYS.length)];
}

const HARD_FLAVORS: Record<string, Record<HardFlavorKey, string>> = {
  ru: {
    roleplay:   "ТИП ЗАДАНИЯ: РОЛЕВАЯ ИГРА. Опиши конкретную ситуацию с ролями. Без связывания.",
    edging:     "ТИП ЗАДАНИЯ: ЭДЖИНГ. Доведи до самого края, остановись, повтори. Укажи число раз. Без связывания.",
    ice_wax:    "ТИП ЗАДАНИЯ: ТЕМПЕРАТУРА. Лёд или воск, конкретный маршрут по телу. Без связывания.",
    blindfold:  "ТИП ЗАДАНИЯ: ПОВЯЗКА НА ГЛАЗА. Касайся неожиданно. Без связывания.",
    commands:   "ТИП ЗАДАНИЯ: ГОЛОСОВОЕ ДОМИНИРОВАНИЕ. Приказы, запрет двигаться, команды. Без связывания.",
    striptease: "ТИП ЗАДАНИЯ: СТРИПТИЗ. Медленно, под музыку, по команде. Без связывания.",
    mirror:     "ТИП ЗАДАНИЯ: ЗЕРКАЛО. Смотреть на отражение, не отводить взгляд. Без связывания.",
    binding:    "ТИП ЗАДАНИЯ: СВЯЗЫВАНИЕ. Шарф, платок, конкретная поза.",
    voice_control: "ТИП ЗАДАНИЯ: ГОЛОСОВОЕ УПРАВЛЕНИЕ. Командуй партнёру, что делать, куда двигаться, когда ускориться. Ты ведёшь голосом и касаешься одновременно. Без связывания.",
    spanking:   "ТИП ЗАДАНИЯ: ШЛЕПКИ. Место, сила, чередование с поглаживаниями. Без связывания.",
  },
  en: {
    roleplay:   "TYPE: ROLEPLAY. Specific scenario with roles. No binding.",
    edging:     "TYPE: EDGING. Edge, stop, repeat. No binding.",
    ice_wax:    "TYPE: TEMPERATURE. Ice or wax, body path. No binding.",
    blindfold:  "TYPE: BLINDFOLD. Unexpected touch. No binding.",
    commands:   "TYPE: VOICE DOMINANCE. Orders, freeze, commands. No binding.",
    striptease: "TYPE: STRIPTEASE. Slow, to music, on command. No binding.",
    mirror:     "TYPE: MIRROR. Watch reflection, don't look away. No binding.",
    binding:    "TYPE: BINDING. Scarf, cloth, specific pose.",
    voice_control: "TYPE: VOICE CONTROL. Guide your partner with your voice — speed, depth, rhythm. Use touch at the same time. No binding.",
    spanking:   "TYPE: SPANKING. Location, intensity, alternating with strokes. No binding.",
  },
  hi: {
    roleplay:   "प्रकार: भूमिका। कोई बंधन नहीं।",
    edging:     "प्रकार: एजिंग। कोई बंधन नहीं।",
    ice_wax:    "प्रकार: बर्फ या मोम। कोई बंधन नहीं।",
    blindfold:  "प्रकार: आंखों पर पट्टी। कोई बंधन नहीं।",
    commands:   "प्रकार: आदेश। कोई बंधन नहीं।",
    striptease: "प्रकार: स्ट्रिपटीज़। कोई बंधन नहीं।",
    mirror:     "प्रकार: दर्पण। कोई बंधन नहीं।",
    binding:    "प्रकार: बंधन।",
    voice_control: "प्रकार: आवाज नियंत्रण। आवाज और हाथ दोनों का प्रयोग करें।",
    spanking:   "प्रकार: थप्पड़। कोई बंधन नहीं।",
  },
  pt: {
    roleplay:   "TIPO: ROLEPLAY. Sem amarrar.",
    edging:     "TIPO: EDGING. Sem amarrar.",
    ice_wax:    "TIPO: GELO OU VELA. Sem amarrar.",
    blindfold:  "TIPO: VENDA. Sem amarrar.",
    commands:   "TIPO: ORDENS. Sem amarrar.",
    striptease: "TIPO: STRIPTEASE. Sem amarrar.",
    mirror:     "TIPO: ESPELHO. Sem amarrar.",
    binding:    "TIPO: AMARRAR.",
    voice_control: "TIPO: CONTROLE POR VOZ. Use voz e mãos ao mesmo tempo.",
    spanking:   "TIPO: PALMADAS. Sem amarrar.",
  },
  es: {
    roleplay:   "TIPO: JUEGO DE ROL. Sin atar.",
    edging:     "TIPO: EDGING. Sin atar.",
    ice_wax:    "TIPO: HIELO O VELA. Sin atar.",
    blindfold:  "TIPO: VENDA. Sin atar.",
    commands:   "TIPO: ÓRDENES. Sin atar.",
    striptease: "TIPO: STRIPTEASE. Sin atar.",
    mirror:     "TIPO: ESPEJO. Sin atar.",
    binding:    "TIPO: ATAR.",
    voice_control: "TIPO: CONTROL POR VOZ. Usa voz y manos al mismo tiempo.",
    spanking:   "TIPO: NALGADAS. Sin atar.",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// ПРОМПТЫ — все категории (с конкретными типами)
// ─────────────────────────────────────────────────────────────────────────────

const NEUTRAL: Record<string, Record<string, string>> = {
  compliments: {
    ru: `Ты генератор заданий для пар. Категория: КОМПЛИМЕНТЫ.

Типы заданий:
- слова: сказать или написать тёплое слово
- голосовое: записать и отправить
- текст: написать с теплом
- селфи с улыбкой
- селфи с поцелуем
- короткое видео с обращением
- мини-сюрприз (шоколад, записка, чай)
- благодарность за конкретную мелочь

Правила:
- Одно действие
- Обращение "ты"
- Партнёр — третье лицо (она/он)
- Без касаний, без намёков на секс
- До 180 символов
- Без поэзии, без "я рекомендую"

Выбери ОДИН тип и сгенерируй задание в этом стиле.`,
    en: `You generate couple tasks. Category: COMPLIMENTS.

Types:
- words: say or text a warm word
- voice: record and send
- text: warm message
- selfie with smile
- selfie with a kiss gesture
- short video message
- mini-surprise (chocolate, note, tea)
- gratitude for a specific small thing

Rules:
- One action
- Address "you"
- Partner = third person (she/he)
- No touching, no sexual hints
- Max 180 chars
- No poetry, no "I recommend"

Pick ONE type and generate a task in that style.`,
    hi: `जोड़ों के लिए टास्क। श्रेणी: तारीफ। एक काम। स्पर्श नहीं। 180 अक्षर।`,
    pt: `Tarefas para casais. Categoria: ELOGIOS. Uma ação. Sem toque. 180 caracteres.`,
    es: `Tareas para parejas. Categoría: PIROPOS. Una acción. Sin tocar. 180 caracteres.`,
  },
  tenderness: {
    ru: `Ты генератор заданий для пар. Категория: НЕЖНОСТЬ.

Типы заданий:
- объятия (сзади, молча, долгие)
- поцелуи (в губы, медленно, без страсти)
- поцелуи в шею / плечо
- массаж (голова, шея, спина, руки, ноги)
- почесывания (спина, голова)
- лёгкие покусывания (мочка уха, плечо, ключица)
- прикосновения (рука в руке, смотреть друг на друга с нежностью)
- селфи с воздушным поцелуем
- старое совместное фото с вопросом «помнишь?»

Правила:
- Одно действие
- Без раздевания
- Без эрогенных зон
- Без намёков на секс
- До 180 символов
- Без «посидим молча»

Выбери ОДИН тип и сгенерируй задание в этом стиле.`,
    en: `You generate couple tasks. Category: TENDERNESS.

Types:
- hugs (from behind, silent, long)
- kisses (on lips, slow, not passionate)
- neck/shoulder kisses
- massage (head, neck, back, arms, legs)
- scratching (back, head)
- light bites (earlobe, shoulder, collarbone)
- touch (hold hands, look at each other gently)
- selfie with a kiss gesture
- old photo with "remember?"

Rules:
- One action
- No undressing
- No erogenous zones
- No sexual hints
- Max 180 chars

Pick ONE type and generate a task in that style.`,
    hi: `श्रेणी: कोमलता। एक काम। कोई कपड़े नहीं। 180 अक्षर।`,
    pt: `Categoria: TERNURA. Uma ação. Sem despir. 180 caracteres.`,
    es: `Categoría: TERNURA. Una acción. Sin desnudar. 180 caracteres.`,
  },
  desire: {
    ru: `Ты генератор заданий для пар. Категория: ЖЕЛАНИЕ — прелюдия, разогрев, без секса.

Типы заданий:
- раздевание (своё или партнёра)
- обнажение в быту (фартук, проход мимо, падение полотенца)
- фото / видео в белье
- касания через ткань
- массаж вокруг эрогенных зон (не касаясь центра)
- поцелуи и облизывания вокруг эрогенных зон (не касаясь центра)
- грязные слова на ухо (коротко, прямо, шёпотом)
- страстные поцелуи с языком
- демонстрация тела без стеснения (лечь, дать смотреть)
- ролевой намёк (рубашка на голое тело)

Правила:
- Одно действие
- Без секса, без орального, без проникновения
- До 200 символов
- Без поэзии

Выбери ОДИН тип и сгенерируй задание в этом стиле.`,
    en: `You generate couple tasks. Category: DESIRE — foreplay, arousal, no sex.

Types:
- undressing (self or partner)
- public nudity hints (apron, walking by, towel drop)
- photo/video in lingerie
- touching through fabric
- massage around erogenous zones
- kissing/licking around erogenous zones
- dirty whispers in ear (short, direct)
- passionate tongue kisses
- body showing without shame
- role hint (shirt on naked body)

Rules:
- One action
- No sex, no oral, no penetration
- Max 200 chars

Pick ONE type and generate a task in that style.`,
    hi: `श्रेणी: इच्छा। एक काम। कोई सेक्स नहीं। 200 अक्षर।`,
    pt: `Categoria: DESEJO. Uma ação. Sem sexo. 200 caracteres.`,
    es: `Categoría: DESEO. Una acción. Sin sexo. 200 caracteres.`,
  },
  passion: {
    ru: `Ты генератор заданий для пар. Категория: СТРАСТЬ — секс, снятый красиво.

Типы заданий:
- позы (конкретные, с атмосферой)
- оральный секс (минет / кунни, нежно, смотреть в глаза)
- смена темпа (медленно войти, застыть, начать по ритму дыхания)
- зеркало (войти сзади, смотреть в отражение)
- наушники (музыка, молча, касаться)
- массаж с хэппи-эндом (реальный массаж, потом секс)
- лёд + оральный (провести льдом, потом горячий рот)
- взбитые сливки + оральный (нанести, слизывать, потом оральный)
- фото голого тела (красиво, с тенью, отправить)
- видео голого тела (без лица, только тело и движение)
- съёмка секса для коллекции (красиво, с атмосферой)
- тёплое масло (нанести, скользить, войти)
- съедобные трусы (снимать зубами, потом оральный)

Правила:
- Одно действие
- Без пошлости, без грубости, без подчинения
- До 200 символов

Выбери ОДИН тип и сгенерируй задание в этом стиле.`,
    en: `You generate couple tasks. Category: PASSION — beautiful, aesthetic sex.

Types:
- positions (specific, with atmosphere)
- oral sex (gentle, eye contact)
- pace changes (slow entry, pause, rhythm)
- mirror (enter from behind, watch reflection)
- headphones (music, silence, touch)
- massage with happy ending
- ice + oral (ice over skin, then hot mouth)
- whipped cream + oral (apply, lick, then oral)
- nude photo (beautiful, with shadow, send)
- nude video (no face, only body)
- sex video for collection (beautiful, atmospheric)
- warm oil (apply, glide, enter)
- edible underwear (remove with teeth, then oral)

Rules:
- One action
- No vulgarity, no roughness, no submission
- Max 200 chars

Pick ONE type and generate a task in that style.`,
    hi: `श्रेणी: जुनून। एक काम। कोई अशिष्टता नहीं। 200 अक्षर।`,
    pt: `Categoria: PAIXÃO. Uma ação. Sem vulgaridade. 200 caracteres.`,
    es: `Categoría: PASIÓN. Una acción. Sin vulgaridad. 200 caracteres.`,
  },
  hard: {
    ru: `Ты генератор заданий для пар. Категория: ХАРД — секс с контролем и игрой власти.

Типы заданий:
- подчинение на время (30 мин, стоп-слово обязательно)
- команды (приказы, запрет двигаться)
- связывание (шарф, ремень, руки за спиной)
- маска на глаза (не видит, ждёт команды)
- наручники (руки за спиной или над головой)
- плетка (лёгкая, по спине/ягодицам, чередовать с поглаживаниями)
- грязный минет / кунни (сесть на лицо, командовать)
- минет с окончанием в рот (финиш в рот, проглотить)
- глубокий минет (до горла, три раза)
- контроль во время минета (держать за голову, задавать темп)
- съёмка грязного секса (для себя, без света)
- съёмка от первого лица (рука, член, влагалище, стоны)
- съёмка + подчинение (смотреть в камеру, выполнять команды)
- массаж + секс одновременно (массировать и входить)
- шлепки во время секса (в ритм движениям)
- ролевая игра (начальник/подчинённый, 10 мин, поменяться)
- запрет на оргазм (довести, остановить, повторить три раза)

Правила:
- Одно действие
- Без красивых ракурсов, без эстетики
- Стоп-слово всегда присутствует
- До 200 символов

Выбери ОДИН тип и сгенерируй задание в этом стиле.`,
    en: `You generate couple tasks. Category: HARD — sex with control and power play.

Types:
- submission (30 min, safe word required)
- commands (orders, freeze)
- binding (scarf, belt, hands behind back)
- blindfold (can't see, waits for commands)
- handcuffs (hands behind or above head)
- light whip (back/butt, alternate with strokes)
- dirty oral (sit on face, command)
- oral with finish in mouth (swallow)
- deep throat (three times)
- control during oral (hold head, set pace)
- dirty sex video (for yourselves, no light)
- first-person video (hand, penis, vagina, moans)
- video + submission (look at camera, obey)
- massage + sex simultaneously (massage and penetrate)
- spanking during sex (in rhythm)
- roleplay (boss/subordinate, 10 min, switch)
- orgasm denial (edge, stop, repeat three times)

Rules:
- One action
- No beautiful angles, no aesthetics
- Safe word always present
- Max 200 chars

Pick ONE type and generate a task in that style.`,
    hi: `श्रेणी: हार्ड। एक काम। 200 अक्षर।`,
    pt: `Categoria: HARD. Uma ação. 200 caracteres.`,
    es: `Categoría: HARD. Una acción. 200 caracteres.`,
  },
};

const GENDER_SUFFIX: Record<string, Record<string, string>> = {
  ru: {
    male:   "Пользователь — МУЖЧИНА, партнёр — ЖЕНЩИНА. Используй она/её/ей для партнёра. Глаголы — мужского рода.",
    female: "Пользователь — ЖЕНЩИНА, партнёр — МУЖЧИНА. Используй он/его/ему для партнёра. Глаголы — женского рода.",
  },
  en: {
    male:   "User is MALE, partner is FEMALE. Use she/her for partner. Verbs — male.",
    female: "User is FEMALE, partner is MALE. Use he/him for partner. Verbs — female.",
  },
  hi: {
    male:   "उपयोगकर्ता पुरुष है, पार्टनर महिला है।",
    female: "उपयोगकर्ता महिला है, पार्टनर पुरुष है।",
  },
  pt: {
    male:   "Usuário é HOMEM, parceira é MULHER. Use ela/dela.",
    female: "Usuária é MULHER, parceiro é HOMEM. Use ele/dele.",
  },
  es: {
    male:   "El usuario es HOMBRE, la pareja es MUJER. Usa ella/su.",
    female: "La usuaria es MUJER, la pareja es HOMBRE. Usa él/su.",
  },
};

function buildPrompt(cat: string, lang: string, gender: string): string {
  const base = NEUTRAL[cat]?.[lang] ?? NEUTRAL["compliments"]["en"];

  const resolvedGender = (gender === "male" || gender === "female") ? gender : "male";
  const genderLine = GENDER_SUFFIX[lang]?.[resolvedGender] ?? GENDER_SUFFIX["en"]["male"];

  let flavorLine = "";
  if (cat === "hard") {
    const flavorKey = pickHardFlavor();
    const flavorPool = HARD_FLAVORS[lang] ?? HARD_FLAVORS["en"];
    flavorLine = `\n\n${flavorPool[flavorKey]}`;
  }

  const goldLine = lang !== "hi"
    ? `\n\nЭТАЛОНЫ (пиши В ТОМ ЖЕ СТИЛЕ):\n${getGoldExamples(cat, lang)}`
    : "";

  return `${base}\n\n${genderLine}${flavorLine}${goldLine}\n\nОДНО новое задание. Только текст, без кавычек, без пояснений.`;
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
    const prompt = buildPrompt(category, lang, gender);
    const aiRes = await fetch(DEEPSEEK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 150,
        temperature: 0.9,
      }),
    });

    if (!aiRes.ok) {
      return res.json({ task: getFallback(category, lang) });
    }

    const data = await aiRes.json();
    let task: string = data.choices?.[0]?.message?.content?.trim() ?? "";

    if (task.startsWith('"') && task.endsWith('"')) task = task.slice(1, -1).trim();
    if (task.startsWith("'") && task.endsWith("'")) task = task.slice(1, -1).trim();

    const lower = task.toLowerCase();
    const hasForbidden = FORBIDDEN.some((f) => lower.includes(f));

    if (!task || task.length < 20 || task.length > 400 || hasForbidden) {
      return res.json({ task: getFallback(category, lang) });
    }

    return res.json({ task });
  } catch {
    return res.json({ task: getFallback(category, lang) });
  }
}
