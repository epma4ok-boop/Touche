// api/tasks/generate.ts  — POST /api/tasks/generate
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

// ── Запрещённые паттерны ──────────────────────────────────────────────────────
const FORBIDDEN = [
  "скажи мне", "сделай мне", "попроси меня", "посмотри на меня",
  "ласкай меня", "трогай меня", "целуй меня", "обними меня", "расскажи мне",
  "tell me", "do it to me", "touch me", "kiss me", "hold me", "look at me",
  "растворись", "замри в тишине", "почувствуй вечность", "слейтесь",
  "пусть повиснет", "дыши в кожу", "прелюдия к прелюдии", "томление",
  // Запрет первого лица в заданиях (ИИ не должен говорить от себя)
  "давай я ", "я буду ", "я сделаю тебе", "я хочу тебя", "let me ", "i will do",
];

// ── Fallback из статического пула (gold standard) ─────────────────────────────
function getFallback(cat: string, lang: string): string {
  const pool = STATIC_POOLS[lang] ?? STATIC_POOLS["en"];
  const list = (pool as StaticPool)[cat] ?? (pool as StaticPool)["compliments"];
  return list[Math.floor(Math.random() * list.length)];
}

// ── Build 5 gold-standard examples from the static pool ──────────────────────
function getGoldExamples(cat: string, lang: string, count = 5): string {
  const pool = STATIC_POOLS[lang] ?? STATIC_POOLS["en"];
  const list = [...((pool as StaticPool)[cat] ?? (pool as StaticPool)["compliments"])];
  // shuffle and take first N
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list.slice(0, count).map((t, i) => `${i + 1}. ${t}`).join("\n");
}

// ── Hard category: 10 flavor types for variety ───────────────────────────────
const HARD_FLAVOR_KEYS = [
  "roleplay", "edging", "ice_wax", "blindfold", "commands",
  "striptease", "mirror", "binding", "voice_only", "spanking",
] as const;

type HardFlavorKey = typeof HARD_FLAVOR_KEYS[number];

function pickHardFlavor(): HardFlavorKey {
  return HARD_FLAVOR_KEYS[Math.floor(Math.random() * HARD_FLAVOR_KEYS.length)];
}

const HARD_FLAVORS: Record<string, Record<HardFlavorKey, string>> = {
  ru: {
    roleplay:   "ТИП ЗАДАНИЯ: РОЛЕВАЯ ИГРА — придумай конкретный нестандартный сценарий (персонажи, ситуация, роли). НЕ используй связывание.",
    edging:     "ТИП ЗАДАНИЯ: ЭДЖИНГ — доведи до самого края, остановись, повтори. Укажи конкретное число раз и действие. НЕ используй связывание.",
    ice_wax:    "ТИП ЗАДАНИЯ: ТЕМПЕРАТУРНАЯ ИГРА — кубик льда или массажная свеча, конкретный маршрут по телу. НЕ используй связывание.",
    blindfold:  "ТИП ЗАДАНИЯ: СЕНСОРНОЕ ЛИШЕНИЕ — маска на глаза или наушники с музыкой, ласкай там где не ожидает. НЕ используй связывание.",
    commands:   "ТИП ЗАДАНИЯ: ГОЛОСОВОЕ ДОМИНИРОВАНИЕ — приказы, запрет двигаться или говорить, команды без верёвок и шарфов.",
    striptease: "ТИП ЗАДАНИЯ: СТРИПТИЗ — прикажи партнёру исполнить медленно под музыку или сам(а) по его/её команде. НЕ используй связывание.",
    mirror:     "ТИП ЗАДАНИЯ: ЗЕРКАЛО — прикажи смотреть на себя или на вас обоих в зеркало, не отводить взгляд. НЕ используй связывание.",
    binding:    "ТИП ЗАДАНИЯ: СВЯЗЫВАНИЕ — шарф, платок или мягкая верёвка, опиши конкретную позу или сцену.",
    voice_only: "ТИП ЗАДАНИЯ: ТОЛЬКО ГОЛОС — доведи партнёра до оргазма словами, описывай детально что будешь делать, руки не используй. НЕ используй связывание.",
    spanking:   "ТИП ЗАДАНИЯ: ШЛЕПКИ — конкретно: место, нарастание силы, чередование с нежными поглаживаниями. НЕ используй связывание.",
  },
  en: {
    roleplay:   "TASK TYPE: ROLEPLAY — invent a specific, fresh scenario (characters, situation, roles). NO binding.",
    edging:     "TASK TYPE: EDGING — bring to the very edge, stop, repeat. Specify the exact count and action. NO binding.",
    ice_wax:    "TASK TYPE: TEMPERATURE PLAY — ice cube or massage candle, describe the exact body path. NO binding.",
    blindfold:  "TASK TYPE: SENSORY DEPRIVATION — blindfold or headphones with music, touch where least expected. NO binding.",
    commands:   "TASK TYPE: VOICE DOMINANCE — orders, forbid movement or speech, commands — no ropes or scarves.",
    striptease: "TASK TYPE: STRIPTEASE — command them to perform slowly to music, or perform yourself on their command. NO binding.",
    mirror:     "TASK TYPE: MIRROR — command them to watch themselves or both of you, don't close eyes or look away. NO binding.",
    binding:    "TASK TYPE: BINDING — scarf, cloth or soft rope, describe a specific pose or scene.",
    voice_only: "TASK TYPE: VOICE ONLY — bring partner to orgasm with words only, describe in detail what you will do, no touching. NO binding.",
    spanking:   "TASK TYPE: SPANKING — specific: location, escalation of intensity, alternating with tender strokes. NO binding.",
  },
  hi: {
    roleplay:   "टास्क प्रकार: रोलप्ले — नई परिस्थिति। बंधन नहीं।",
    edging:     "टास्क प्रकार: एजिंग — किनारे तक लाओ, रुको, दोहराओ। बंधन नहीं।",
    ice_wax:    "टास्क प्रकार: बर्फ या मोमबत्ती। बंधन नहीं।",
    blindfold:  "टास्क प्रकार: आंखों पर पट्टी या हेडफ़ोन। बंधन नहीं।",
    commands:   "टास्क प्रकार: आदेश और प्रभुत्व।",
    striptease: "टास्क प्रकार: स्ट्रिपटीज़। बंधन नहीं।",
    mirror:     "टास्क प्रकार: दर्पण। बंधन नहीं।",
    binding:    "टास्क प्रकार: बंधन।",
    voice_only: "टास्क प्रकार: केवल आवाज़। बंधन नहीं।",
    spanking:   "टास्क प्रकार: थप्पड़। बंधन नहीं।",
  },
  pt: {
    roleplay:   "TIPO: ROLEPLAY — crie um cenário específico e fresco. SEM amarrar.",
    edging:     "TIPO: EDGING — leve à beira, pare, repita. SEM amarrar.",
    ice_wax:    "TIPO: GELO OU VELA DE MASSAGEM — descreva o caminho pelo corpo. SEM amarrar.",
    blindfold:  "TIPO: VENDA OU FONES — toque onde menos espera. SEM amarrar.",
    commands:   "TIPO: DOMINAÇÃO VOCAL — ordens sem cordas.",
    striptease: "TIPO: STRIPTEASE — ordene devagar, com música. SEM amarrar.",
    mirror:     "TIPO: ESPELHO — olhar para si mesmo sem desviar. SEM amarrar.",
    binding:    "TIPO: AMARRAR — lenço ou corda macia, pose específica.",
    voice_only: "TIPO: SÓ VOZ — leve ao orgasmo apenas com palavras. SEM amarrar.",
    spanking:   "TIPO: PALMADAS — localização, escalada, alternando com carícias. SEM amarrar.",
  },
  es: {
    roleplay:   "TIPO: JUEGO DE ROL — escenario específico y fresco. SIN atar.",
    edging:     "TIPO: EDGING — lleva al límite, detén, repite. SIN atar.",
    ice_wax:    "TIPO: HIELO O VELA DE MASAJE — describe el camino por el cuerpo. SIN atar.",
    blindfold:  "TIPO: VENDA O AURICULARES — toca donde menos lo espera. SIN atar.",
    commands:   "TIPO: DOMINACIÓN VOCAL — órdenes sin cuerdas.",
    striptease: "TIPO: STRIPTEASE — ordena despacio, con música. SIN atar.",
    mirror:     "TIPO: ESPEJO — mirar sin apartar los ojos. SIN atar.",
    binding:    "TIPO: ATAR — pañuelo o cuerda suave, pose específica.",
    voice_only: "TIPO: SOLO VOZ — lleva al orgasmo solo con palabras. SIN atar.",
    spanking:   "TIPO: NALGADAS — localización, escalada, alternando con caricias. SIN atar.",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// ПРОМПТЫ — все категории
// ─────────────────────────────────────────────────────────────────────────────

const NEUTRAL: Record<string, Record<string, string>> = {
  compliments: {
    ru: `Ты генератор заданий для пар. Категория: КОМПЛИМЕНТЫ — слова, селфи, короткие видео, мини-сюрпризы. Без касаний, без намёков на секс.
Одно действие. Обращение "ты". Партнёр — третье лицо. До 180 символов. Без поэзии.`,
    en: `Generate couple tasks. Category: COMPLIMENTS — words, selfies, short videos, mini-surprises. No touching, no sexual hints.
One action. Address "you". Partner = third person. Max 180 chars. No poetry.`,
    hi: `जोड़ों के लिए टास्क। श्रेणी: तारीफ — शब्द, सेल्फी, वीडियो। स्पर्श नहीं। 180 अक्षर।`,
    pt: `Tarefas para casais. Categoria: ELOGIOS — palavras, selfies, vídeos. Sem toque. 180 caracteres.`,
    es: `Tareas para parejas. Categoría: PIROPOS — palabras, selfies, vídeos. Sin tocar. 180 caracteres.`,
  },
  tenderness: {
    ru: `Категория: НЕЖНОСТЬ — объятия, поцелуи (нестрастные), массаж, лёгкие покусывания, селфи с воздушным поцелуем.
Без раздевания, без эрогенных зон. Одно действие. До 180 символов.`,
    en: `Category: TENDERNESS — hugs, gentle kisses, massage, light bites, selfie with a kiss.
No undressing, no erogenous zones. One action. Max 180 chars.`,
    hi: `श्रेणी: कोमलता — गले लगाना, हल्का चुंबन, मालिश। कोई कपड़े नहीं। 180 अक्षर।`,
    pt: `Categoria: TERNURA — abraços, beijos suaves, massagem. Sem despir. 180 caracteres.`,
    es: `Categoría: TERNURA — abrazos, besos suaves, masaje. Sin desnudar. 180 caracteres.`,
  },
  desire: {
    ru: `Категория: ЖЕЛАНИЕ — прелюдия, раздевание, фото в белье, обнажение в быту, грязные слова на ухо, массаж вокруг эрогенных зон.
बез секса, без орального, без проникновения. Одно действие. До 200 символов.`,
    en: `Category: DESIRE — foreplay, undressing, lingerie photos, public nudity hints, dirty whispers, massage around erogenous zones.
No sex, no oral, no penetration. One action. Max 200 chars.`,
    hi: `श्रेणी: इच्छा — प्रीलुड, कपड़े उतारना, अंडरवियर फोटो। कोई सेक्स नहीं। 200 अक्षर।`,
    pt: `Categoria: DESEJO — preliminares, despir, fotos em lingerie. Sem sexo. 200 caracteres.`,
    es: `Categoría: DESEO — preludio, desvestirse, fotos en lencería. Sin sexo. 200 caracteres.`,
  },
  passion: {
    ru: `Категория: СТРАСТЬ — секс, снятый красиво. Позы, оральный, смена темпа, сенсорная депривация (повязка, наушники), массаж с хэппи-эндом.
Без пошлости, без грубости, без подчинения. Одно действие. До 200 символов.`,
    en: `Category: PASSION — beautiful, aesthetic sex. Positions, oral, pace changes, sensory deprivation (blindfold, headphones), massage with happy ending.
No vulgarity, no roughness, no submission. One action. Max 200 chars.`,
    hi: `श्रेणी: जुनून — सुंदर सेक्स। कोई अशिष्टता नहीं। 200 अक्षर।`,
    pt: `Categoria: PAIXÃO — sexo bonito. Sem vulgaridade. 200 caracteres.`,
    es: `Categoría: PASIÓN — sexo bonito. Sin vulgaridad. 200 caracteres.`,
  },
  hard: {
    ru: `Категория: ХАРД — подчинение на время, команды, запреты, стоп-слово. Связывание, ролевые игры, шлепки — иногда. Массаж + секс одновременно.
Без красивых ракурсов. Без эстетики. Одно задание. До 200 символов.`,
    en: `Category: HARD — submission, commands, restrictions, safe word. Tying, roleplay, spanking — sometimes. Massage + sex simultaneously.
No beautiful angles. No aesthetics. One task. Max 200 chars.`,
    hi: `श्रेणी: हार्ड — आज्ञाकारिता, आदेश, सुरक्षित शब्द। 200 अक्षर।`,
    pt: `Categoria: HARD — submissão, comandos, palavra de segurança. 200 caracteres.`,
    es: `Categoría: HARD — sumisión, órdenes, palabra de seguridad. 200 caracteres.`,
  },
};

const GENDER_SUFFIX: Record<string, Record<string, string>> = {
  ru: {
    male:   "Пользователь — МУЖЧИНА, партнёр — ЖЕНЩИНА. Используй она/её/ей для партнёра.",
    female: "Пользователь — ЖЕНЩИНА, партнёр — МУЖЧИНА. Используй он/его/ему для партнёра.",
  },
  en: {
    male:   "User is MALE, partner is FEMALE. Use she/her for the partner.",
    female: "User is FEMALE, partner is MALE. Use he/him for the partner.",
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
    ? `\n\nЭТАЛОНЫ (gold standard, пиши В ТОМ ЖЕ СТИЛЕ — второе лицо, конкретные команды):\n${getGoldExamples(cat, lang)}`
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
        max_tokens: 120,
        temperature: 0.9,
      }),
    });

    if (!aiRes.ok) {
      return res.json({ task: getFallback(category, lang) });
    }

    const data = await aiRes.json();
    let task: string = data.choices?.[0]?.message?.content?.trim() ?? "";

    // Strip surrounding quotes
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
