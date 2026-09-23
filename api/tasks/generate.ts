// api/tasks/generate.ts
// POST /api/tasks/generate
// Body: { category, lang, gender? }

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { validateTelegramInitData } from "../couple/_auth.js";
import { appDate, FREE_LIMIT } from "../limits.js";
import { TASKS_RU } from "../../src/data/tasks-ru.js";
import { TASKS_EN } from "../../src/data/tasks-en.js";
import { TASKS_HI } from "../../src/data/tasks-hi.js";
import { TASKS_PT } from "../../src/data/tasks-pt.js";
import { TASKS_ES } from "../../src/data/tasks-es.js";

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY!;
const DEEPSEEK_URL = "https://api.deepseek.com/v1/chat/completions";
const BOT_TOKEN = process.env.BOT_TOKEN;
const OWNER_ID = Number(process.env.OWNER_TELEGRAM_ID || 0);
const CATEGORIES = new Set(["compliments", "tenderness", "desire", "passion", "hard"]);
const LANGS = new Set(["ru", "en", "hi", "pt", "es"]);
const GENDERS = new Set(["male", "female"]);
const MODES = new Set(["solo", "together"]);
const PAID = new Set(["passion", "hard"]);
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

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

// ─── ПРОМПТЫ (ИИ сам придумывает, а не выбирает из списка) ────────────────

const PROMPTS: Record<string, Record<string, string>> = {
  compliments: {
    ru: `Ты генератор заданий для категории "КОМПЛИМЕНТЫ".

Суть категории: тёплые слова, жесты внимания, маленькие сюрпризы без физического контакта.
Что можно: сказать или написать тёплое слово, записать голосовое сообщение, сделать селфи с улыбкой или воздушным поцелуем, записать короткое видео с обращением, сделать мини-сюрприз (шоколад, записка, чай и прочее), написать благодарность за конкретную мелочь, отправить старое фото с тёплым воспоминанием.
Чего нельзя: касаться партнёра, раздеваться, намёков на секс.

Твоя задача: придумать ОДНО новое, оригинальное задание в рамках этой категории. Не копируй примеры дословно, а создавай свои варианты. Одно действие, до 180 символов. Только текст задания, без кавычек, без пояснений.`,
    en: `You are a task generator for the "COMPLIMENTS" category.

The essence: warm words, gestures of attention, small surprises without physical contact.
What you can do: say or write a warm word, record a voice message, take a selfie with a smile or a blown kiss, record a short video message, make a mini-surprise (chocolate, a note, tea, etc.), write gratitude for a specific small thing, send an old photo with a warm memory.
What you cannot do: touch your partner, undress, hint at sex.

Your task: come up with ONE new, original task within this category. Do not copy examples verbatim, create your own variations. One action, up to 180 characters. Only the task text, no quotes, no explanations.`,
  },
  tenderness: {
    ru: `Ты генератор заданий для категории "НЕЖНОСТЬ".

Суть категории: мягкий физический контакт, тепло, уют, безопасность. Без эротики.
Что можно: объятия (сзади, спереди, объятия ног, долгие, крепкие), поцелуи (в губы, в шею, в плечо, в лоб, спину), массаж (голова, шея, спина, руки, ноги), почесывания, лёгкие покусывания (мочка уха, плечо, ключица), прикосновения (взять за руку, нежно погладить), селфи с воздушным поцелуем, отправить старое совместное фото.
Чего нельзя: раздеваться, трогать эрогенные зоны, намёков на секс.

Твоя задача: придумать ОДНО новое, оригинальное задание в рамках этой категории. Не копируй примеры дословно, а создавай свои варианты. Одно действие, до 180 символов. Только текст задания, без кавычек, без пояснений.`,
    en: `You are a task generator for the "TENDERNESS" category.

The essence: soft physical contact, warmth, comfort, safety. Without eroticism.
What you can do: hugs (from behind, from the front, leg hugs, long, tight), kisses (on the lips, on the neck, on the shoulder, on the forehead, on the back), massage (head, neck, back, arms, legs), scratching, light bites (earlobe, shoulder, collarbone), touches (hold hands, gently stroke), selfie with a blown kiss, send an old photo together.
What you cannot do: undress, touch erogenous zones, hint at sex.

Your task: come up with ONE new, original task within this category. Do not copy examples verbatim, create your own variations. One action, up to 180 characters. Only the task text, no quotes, no explanations.`,
  },
  desire: {
    ru: `Ты генератор заданий для категории "ЖЕЛАНИЕ" — прелюдия, разогрев, без секса.

Суть: возбуждение, игра, демонстрация тела, напряжение. Секса нет. Только задания для гетеро пар (Мужчина + Женщина). Учитывай человеческую физиологию и логику происходящего.
Что можно: раздевание (своё или партнёра), обнажение в быту (фартук, проход мимо, падение полотенца, одеть только туфли, игривое обнажение), фото/видео в белье, касания через ткань, массаж вокруг эрогенных зон (не касаясь центра), поцелуи и облизывания вокруг эрогенных зон, грязные слова на ухо, страстные поцелуи с языком, демонстрация тела без стеснения, изучение обнаженного тела друг друга.
Чего нельзя: секс, оральный секс, проникновение.

Твоя задача: придумать ОДНО новое, оригинальное задание в рамках этой категории. Не копируй примеры дословно, а создавай свои варианты. Одно действие, до 200 символов. Только текст задания, без кавычек, без пояснений.`,
    en: `You are a task generator for the "DESIRE" category — foreplay, warm-up, without sex.

The essence: arousal, play, body display, tension. No sex. Only for heterosexual couples (Man + Woman). Consider human physiology and the logic of what is happening.
What you can do: undressing (yourself or your partner), nudity in everyday life (wearing only an apron, walking past naked, dropping a towel, wearing only heels, playful nudity), photo/video in lingerie, touching through fabric, massage around erogenous zones (not touching the center), kisses and licking around erogenous zones, dirty words in the ear, passionate kisses with tongue, body display without embarrassment, exploring each other's naked body.
What you cannot do: sex, oral sex, penetration.

Your task: come up with ONE new, original task within this category. Do not copy examples verbatim, create your own variations. One action, up to 200 characters. Only the task text, no quotes, no explanations.`,
  },
  passion: {
    ru: `Ты генератор заданий для категории "СТРАСТЬ" — секс красиво, чувственно, без пошлости.

Суть: яркий, чувственный секс, снятый красиво или прожитый глубоко. Только задания для гетеро пар (Мужчина + Женщина). Учитывай человеческую физиологию и логику происходящего.
Что можно: разные позы, оральный секс (девушка делает минет, мужчина делает кунилингус), смена темпа, зеркало, наушники с музыкой, массаж с хэппи-эндом, лёд + оральный, взбитые сливки + оральный, фото/видео голого тела (красиво), съёмка секса для коллекции, массажное масло, съедобные трусы, мастурбация партнеру, совместное принятие душа и тд. Должно идти вместе с сексом, либо заканчиваться сексом (Классическим, Оральным, Мастурбацией).
Чего нельзя: пошлость, грубость, подчинение, съёмка в упор.

Твоя задача: придумать ОДНО новое, оригинальное задание в рамках этой категории. Не копируй примеры дословно, а создавай свои варианты. Одно действие, до 200 символов. Только текст задания, без кавычек, без пояснений.`,
    en: `You are a task generator for the "PASSION" category — sex beautifully, sensually, without vulgarity.

The essence: bright, sensual sex, filmed beautifully or lived deeply. Only for heterosexual couples (Man + Woman). Consider human physiology and the logic of what is happening.
What you can do: different positions, oral sex (girl gives a blowjob, man performs cunnilingus), tempo changes, mirror, headphones with music, massage with a happy ending, ice + oral, whipped cream + oral, photo/video of naked body (beautifully), filming sex for a personal collection, massage oil, edible underwear, mutual masturbation, showering together, etc. Must accompany sex or end with sex (classic, oral, or mutual masturbation).
What you cannot do: vulgarity, rudeness, submission, close-up shooting.

Your task: come up with ONE new, original task within this category. Do not copy examples verbatim, create your own variations. One action, up to 200 characters. Only the task text, no quotes, no explanations.`,
  },
  hard: {
    ru: `Ты генератор заданий для категории "ХАРД" — секс для тех, кому надоело однообразие и хочется новых экспериментов в сексе.

Суть: яркий или грязный или необычный секс, секс с подчинением или ролевая игра. Только задания для гетеро пар (Мужчина + Женщина). Учитывай человеческую физиологию и логику происходящего.
Что можно: подчинение на время, команды, связывание (шарф, ремень), маска на глаза, наручники, лёгкая плетка, грязный оральный (девушка садится на лицо мужчине, командовать, дать в рот девушке), минет с окончанием в рот девушке, глубокий минет в исполнении девушки, контроль во время минета/кунилингуса, съёмка домашнего порно, съёмка порно от первого лица, съёмка + подчинение, массаж + секс одновременно, шлепки во время секса, ролевая игра, томление перед оргазмом.
Чего нельзя: Мужчина садится на лицо девушки, кончить в рот мужчины.
Условия: Действия должны быть логичными, соответствовать физиологии в сексе для гетеросексуальных пар.
Твоя задача: придумать ОДНО новое, оригинальное задание в рамках этой категории. Не копируй примеры дословно, а создавай свои варианты. Одно действие, до 200 символов. Только текст задания, без кавычек, без пояснений.`,
    en: `You are a task generator for the "HARD" category — sex for those tired of routine who want new experiments.

The essence: intense, kinky, or unusual sex, sex with submission or roleplay. Only for heterosexual couples (Man + Woman). Consider human physiology and the logic of what is happening.
What you can do: submission for a set time, commands, binding (scarf, belt), blindfold, handcuffs, light whip, dirty oral (girl sits on man's face, giving commands, putting it in the girl's mouth), blowjob with finish in the girl's mouth, deep throat performed by the girl, control during blowjob/cunnilingus, filming homemade porn, first-person POV filming, filming + submission, massage + sex simultaneously, spanking during sex, roleplay, orgasm denial.
What you cannot do: man sits on the girl's face, finish in the man's mouth.
Conditions: Actions must be logical and match the physiology of sex for heterosexual couples.
Your task: come up with ONE new, original task within this category. Do not copy examples verbatim, create your own variations. One action, up to 200 characters. Only the task text, no quotes, no explanations.`,
  },
};

function getPrompt(category: string, lang: string): string {
  return PROMPTS[category]?.[lang] ?? PROMPTS[category]?.["en"] ?? PROMPTS["compliments"]["en"];
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });
  if (!BOT_TOKEN) return res.status(503).json({ error: "service_unconfigured" });
  const caller = validateTelegramInitData(req.headers["x-telegram-init-data"] as string | undefined, BOT_TOKEN);
  if (!caller) return res.status(401).json({ error: "unauthorized" });

  const body = req.body ?? {};
  const category = String(body.category ?? "");
  const lang = String(body.lang ?? "en");
  const gender = String(body.gender ?? "male");
  const mode = String(body.mode ?? "solo");
  const coupleId = typeof body.coupleId === "string" ? body.coupleId : null;
  if (!CATEGORIES.has(category)) return res.status(400).json({ error: "invalid_category" });
  if (!LANGS.has(lang) || !GENDERS.has(gender) || !MODES.has(mode)) return res.status(400).json({ error: "invalid_generation_options" });

  let couple: { user_a_id: number; user_b_id: number } | null = null;
  if (mode === "together") {
    if (!coupleId) return res.status(400).json({ error: "couple_id_required" });
    const { data } = await supabase.from("couples").select("user_a_id,user_b_id").eq("id", coupleId).maybeSingle();
    if (!data || (data.user_a_id !== caller.id && data.user_b_id !== caller.id)) return res.status(403).json({ error: "couple_access_denied" });
    couple = data;
  }
  const premium = caller.id === OWNER_ID || !!(await supabase.from("user_subscriptions").select("expires_at").eq("user_id", caller.id).gt("expires_at", new Date().toISOString()).maybeSingle()).data;
  if (PAID.has(category) && !premium) return res.status(403).json({ error: "subscription_required", remaining: 0, isPremium: false });

  let remaining: number | null = null;
  if (!premium) {
    const { data: consumed, error } = await supabase.rpc("consume_daily_limit", {
      p_user_id: caller.id, p_category: category, p_date: appDate(), p_limit: FREE_LIMIT,
    });
    if (error) return res.status(500).json({ error: "limit_consume_failed" });
    const result = typeof consumed === "number" ? { remaining: consumed } : consumed ?? {};
    if (result.allowed === false || result.ok === false) return res.status(403).json({ error: "limit_exceeded", remaining: 0, isPremium: false });
    remaining = Number.isFinite(Number(result.remaining)) ? Number(result.remaining) : null;
  }

  let task = getFallback(category, lang);
  let source: "ai" | "fallback" = "fallback";
  if (DEEPSEEK_API_KEY) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12_000);
    try {
      const systemPrompt = `${getPrompt(category, lang)}\n\n${getGenderLine(lang, gender)}`;
      const aiRes = await fetch(DEEPSEEK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${DEEPSEEK_API_KEY}` },
        signal: controller.signal,
        body: JSON.stringify({ model: "deepseek-chat", messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: lang === "ru" ? "Сгенерируй одно задание." : "Generate one task." },
        ], max_tokens: 160, temperature: 1.1 }),
      });
      if (aiRes.ok) {
        const data = await aiRes.json();
        const candidate = String(data.choices?.[0]?.message?.content ?? "").replace(/^["']|["']$/g, "").replace(/^\d+\.\s*/, "").trim();
        const forbidden = ["я рекомендую", "тебе стоит", "можешь попробовать", "выдыхает", "дыши в", "посмотри в глаза", "отстранись"];
        if (candidate.length >= 15 && candidate.length <= 350 && !forbidden.some(f => candidate.toLowerCase().includes(f))) {
          task = candidate;
          source = "ai";
        }
      }
    } catch {
      // The validated server fallback is used when AI is unavailable.
    } finally {
      clearTimeout(timeout);
    }
  }

  const { data: saved, error: saveError } = await supabase.from("generated_tasks").insert({
    user_id: caller.id,
    couple_id: coupleId,
    category,
    mode,
    task_text: task,
    points: ({ compliments: 10, tenderness: 15, desire: 25, passion: 40, hard: 50 } as Record<string, number>)[category],
  }).select("id").single();
  if (saveError) return res.status(500).json({ error: "task_save_failed" });
  return res.status(200).json({ ok: true, task, taskId: saved.id, source, remaining, isPremium: premium });
}
