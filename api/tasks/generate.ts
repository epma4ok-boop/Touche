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

  // ─────────────────────────────────────────────────────────────────────────────
  // ПРОМПТЫ — нейтральные категории (пол добавляется снизу)
  // ─────────────────────────────────────────────────────────────────────────────

  const NEUTRAL: Record<string, Record<string, string>> = {
    compliments: {
      ru: `Ты генератор заданий для влюблённых пар. Категория: КОМПЛИМЕНТЫ.

  ДОПУСТИМО: написать/сказать тёплое слово, отправить селфи с поцелуем, мини-сюрприз (цветок, шоколад, любимый напиток), голосовое с тёплыми словами.
  ЗАПРЕЩЕНО: объятия, поцелуи, массаж, раздевание, намёки на секс.
  ТРЕБОВАНИЯ: одно конкретное действие, обращение «ты», партнёр — третье лицо (пол ниже), без поэзии, до 180 символов.`,
      en: `You generate couple tasks. Category: COMPLIMENTS.
  ALLOWED: warm words, selfie, mini-surprise, voice note.
  FORBIDDEN: hugs, kisses, massage, undressing, sexual hints.
  RULES: one action, address "you", partner = 3rd person (gender below), no poetry, max 180 chars.`,
      hi: `जोड़ों के लिए टास्क बनाएं। श्रेणी: तारीफ। गर्म शब्द, सेल्फी, सरप्राइज। 180 अक्षरों तक। एक टास्क।`,
      pt: `Gere tarefas para casais. Categoria: ELOGIOS. Palavras calorosas, selfie, mini-surpresa. Até 180 chars. UMA tarefa.`,
      es: `Genera tareas para parejas. Categoría: PIROPOS. Palabras cálidas, selfie, mini-sorpresa. Hasta 180 chars. UNA tarea.`,
    },
    tenderness: {
      ru: `Категория: НЕЖНОСТЬ — мягкий физический контакт, без эротики.
  ДОПУСТИМО: объятия, нежные поцелуи, массаж шеи/плеч/спины/стоп, держать за руку.
  ЗАПРЕЩЕНО: эрогенные зоны, страстные поцелуи с языком, раздевание, секс.
  Одно конкретное физическое действие, до 180 символов.`,
      en: `Category: TENDERNESS — gentle physical contact, no eroticism.
  ALLOWED: hugs, gentle kisses, neck/shoulder/back/foot massage, holding hands.
  FORBIDDEN: erogenous zones, tongue kisses, undressing, sex.
  One concrete action, max 180 chars.`,
      hi: `श्रेणी: कोमलता। गले लगाना, हल्का स्पर्श। 180 अक्षरों तक। एक टास्क।`,
      pt: `Categoria: TERNURA — contato físico suave. Uma ação. Até 180 chars.`,
      es: `Categoría: TERNURA — contacto físico suave. Una acción. Hasta 180 chars.`,
    },
    desire: {
      ru: `Категория: ЖЕЛАНИЕ — возбуждение, прелюдия, эротика без явного секса.
  ДОПУСТИМО: страстные поцелуи, раздевание, прикосновения к груди/ягодицам, смелые слова, фривольное фото.
  ЗАПРЕЩЕНО: явный секс, оральный секс, проникновение в тексте.
  Одно конкретное действие, до 200 символов.`,
      en: `Category: DESIRE — arousal, foreplay, erotics without explicit sex.
  ALLOWED: passionate kisses, undressing, touching chest/butt, bold words, flirty photo.
  FORBIDDEN: explicit sex, oral sex, penetration in text.
  One action, max 200 chars.`,
      hi: `श्रेणी: इच्छा। कामुक संकेत, जोशीला चुंबन। 200 अक्षरों तक। एक टास्क।`,
      pt: `Categoria: DESEJO — excitação, preliminares. Uma ação. Até 200 chars.`,
      es: `Categoría: DESEO — excitación, preludio. Una acción. Hasta 200 chars.`,
    },
    passion: {
      ru: `Категория: СТРАСТЬ — откровенные сексуальные задания для взрослых пар (18+).
  ДОПУСТИМО: секс (позиции, темп, декорации), оральный секс, ролевые игры, секс-игрушки.
  ЗАПРЕЩЕНО: шаблонные фразы, расплывчатость, поэзия.
  Одно конкретное действие, до 200 символов.`,
      en: `Category: PASSION — explicit sexual tasks for adult couples (18+).
  ALLOWED: sex (positions, pace, setting), oral sex, roleplay, toys.
  FORBIDDEN: clichés, vagueness, poetry.
  One concrete action, max 200 chars.`,
      hi: `श्रेणी: जुनून (18+)। स्पष्ट यौन टास्क। 200 अक्षरों तक। एक टास्क।`,
      pt: `Categoria: PAIXÃO (18+) — tarefas sexuais explícitas. Uma ação. Até 200 chars.`,
      es: `Categoría: PASIÓN (18+) — tareas sexuales explícitas. Una acción. Hasta 200 chars.`,
    },
    hard: {
      ru: `Категория: ХАРД — BDSM-лайт, доминирование/подчинение, ролевые игры (18+).
  ДОПУСТИМО: связывание, шлепки, ролевые игры, слово-стоп, контроль, игрушки.
  ЗАПРЕЩЕНО: насилие без согласия, жёсткие травмы, унижение без контекста.
  Одно конкретное задание, до 200 символов.`,
      en: `Category: HARD — BDSM-lite, D/s, roleplay (18+).
  ALLOWED: tying, spanking, roleplay, safe word, control, toys.
  FORBIDDEN: non-consensual violence, severe injury, humiliation without context.
  One task, max 200 chars.`,
      hi: `श्रेणी: साहसिक (18+)। BDSM-लाइट। 200 अक्षरों तक। एक टास्क।`,
      pt: `Categoria: INTENSO (18+) — BDSM-lite. Uma tarefa. Até 200 chars.`,
      es: `Categoría: INTENSO (18+) — BDSM-lite. Una tarea. Hasta 200 chars.`,
    },
  };

  const GENDER_SUFFIX: Record<string, Record<string, string>> = {
    ru: {
      male:   "Пользователь — МУЖЧИНА, партнёр — ЖЕНЩИНА. Используй он/него/ему для партнёра.",
      female: "Пользователь — ЖЕНЩИНА, партнёр — МУЖЧИНА. Используй он/него/ему для партнёра.",
      other:  "Используй нейтральные формулировки.",
    },
    en: {
      male:   "User is MALE, partner is FEMALE. Use she/her for the partner.",
      female: "User is FEMALE, partner is MALE. Use he/him for the partner.",
      other:  "Use gender-neutral language.",
    },
    hi: {
      male:   "उपयोगकर्ता पुरुष है, पार्टनर महिला है। पार्टनर के लिए वह/उसे का प्रयोग करें।",
      female: "उपयोगकर्ता महिला है, पार्टनर पुरुष है। पार्टनर के लिए वह/उसे का प्रयोग करें।",
      other:  "लिंग-तटस्थ भाषा का प्रयोग करें।",
    },
    pt: {
      male:   "Usuário é HOMEM, parceiro(a) é MULHER. Use ela/dela para o parceiro.",
      female: "Usuário é MULHER, parceiro é HOMEM. Use ele/dele para o parceiro.",
      other:  "Use linguagem de gênero neutro.",
    },
    es: {
      male:   "El usuario es HOMBRE, la pareja es MUJER. Usa ella/su para la pareja.",
      female: "La usuaria es MUJER, la pareja es HOMBRE. Usa él/su para la pareja.",
      other:  "Usa lenguaje de género neutro.",
    },
  };

  function buildPrompt(cat: string, lang: string, gender: string): string {
    const base = NEUTRAL[cat]?.[lang] ?? NEUTRAL["compliments"]["en"];
    const genderLine = GENDER_SUFFIX[lang]?.[gender] ?? GENDER_SUFFIX["en"]["other"];
    const goldLine = lang !== "hi" ? `\n\nЭТАЛОНЫ (gold standard, пиши В ТОМ ЖЕ СТИЛЕ):\n${getGoldExamples(cat, lang)}` : "";
    return `${base}\n\n${genderLine}${goldLine}\n\nОДНО новое задание. Только текст, без кавычек, без пояснений.`;
  }

  export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    const initData = req.headers["x-telegram-init-data"] as string | undefined;
    if (!initData) return res.status(401).json({ error: "Missing init data" });

    const ok = validateTelegramInitData(initData);
    if (!ok) return res.status(403).json({ error: "Invalid init data" });

    const { category = "compliments", lang = "en", gender = "other" } = req.body ?? {};

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
  
