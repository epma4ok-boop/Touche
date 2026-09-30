// api/tasks/generate.ts
// POST /api/tasks/generate
// Body: { category, lang, gender? }

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { randomUUID } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { validateTelegramInitData } from "../couple/_auth.js";
import { appDate } from "../limits.js";
import { claimFriendInvite } from "../referrals/_claim.js";
import { TASKS_RU } from "../../src/data/tasks-ru.js";
import { TASKS_EN } from "../../src/data/tasks-en.js";
import { TASKS_HI } from "../../src/data/tasks-hi.js";
import { TASKS_PT } from "../../src/data/tasks-pt.js";
import { TASKS_ES } from "../../src/data/tasks-es.js";
import { getTaskQualityRules, isTaskTextWellFormed } from "../../src/data/task-quality.js";

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY!;
const DEEPSEEK_URL = "https://api.deepseek.com/v1/chat/completions";
const BOT_TOKEN = process.env.BOT_TOKEN;
const OWNER_ID = Number(process.env.OWNER_TELEGRAM_ID || 0);
const CATEGORIES = new Set(["compliments", "tenderness", "desire", "passion", "hard"]);
const PAID_CATEGORIES = new Set(["passion", "hard"]);
const LANGS = new Set(["ru", "en", "hi", "pt", "es"]);
const GENDERS = new Set(["male", "female"]);
const MODES = new Set(["solo", "together"]);
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
  const wellFormed = list.filter(task => isTaskTextWellFormed(task, lang));
  const candidates = wellFormed.length > 0 ? wellFormed : list;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function getGenderLine(lang: string, gender: string): string {
  const map: Record<string, Record<string, string>> = {
    ru: {
      male: "Пользователь — мужчина, партнёрша — женщина. Обращайся к пользователю на «ты»; партнёршу называй однозначно. Сохраняй эти роли до конца задания.",
      female: "Пользователь — женщина, партнёр — мужчина. Обращайся к пользователю на «ты»; партнёра называй однозначно. Сохраняй эти роли до конца задания.",
    },
    en: {
      male: "User is male and partner is female. Address the user as 'you' and refer to the partner consistently as she/her. Do not switch roles.",
      female: "User is female and partner is male. Address the user as 'you' and refer to the partner consistently as he/him. Do not switch roles.",
    },
    hi: {
      male: "उपयोगकर्ता पुरुष है और साथी महिला है। भूमिकाएँ पूरे कार्य में स्थिर रखें।",
      female: "उपयोगकर्ता महिला है और साथी पुरुष है। भूमिकाएँ पूरे कार्य में स्थिर रखें।",
    },
    pt: {
      male: "O usuário é homem e a parceira é mulher. Trate o usuário por 'você', refira-se à parceira de forma consistente e não troque os papéis.",
      female: "A usuária é mulher e o parceiro é homem. Trate a usuária por 'você', refira-se ao parceiro de forma consistente e não troque os papéis.",
    },
    es: {
      male: "El usuario es hombre y su pareja es mujer. Háblale de tú, refiérete a ella de forma consistente y no cambies los papeles.",
      female: "La usuaria es mujer y su pareja es hombre. Háblale de tú, refiérete a él de forma consistente y no cambies los papeles.",
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
  const prompt = PROMPTS[category]?.[lang] ?? PROMPTS[category]?.["en"] ?? PROMPTS["compliments"]["en"];
  return prompt
    .replace(/Одно действие/gu, "Одно завершённое задание из 1–3 связанных шагов")
    .replace(/One action/gu, "One complete task with 1–3 connected steps");
}

const LANGUAGE_INSTRUCTIONS: Record<string, string> = {
  ru: "Ответь только по-русски. В тексте задания используй кириллицу.",
  en: "Write the entire task in English only. Do not use Russian or Cyrillic letters.",
  hi: "पूरा उत्तर केवल हिन्दी में, देवनागरी लिपि में लिखें।",
  pt: "Escreva a tarefa inteira apenas em português. Não use russo ou inglês.",
  es: "Escribe toda la tarea solo en español. No uses ruso ni inglés.",
};

function matchesRequestedLanguage(text: string, lang: string): boolean {
  const hasCyrillic = /[\u0400-\u052f]/u.test(text);
  const hasDevanagari = /[\u0900-\u097f]/u.test(text);
  if (lang === "ru") return hasCyrillic && !hasDevanagari;
  if (lang === "hi") return hasDevanagari && !hasCyrillic;
  return !hasCyrillic && !hasDevanagari;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });
  if (!BOT_TOKEN) return res.status(503).json({ error: "service_unconfigured" });
  const initData = req.headers["x-telegram-init-data"] as string | undefined;
  const caller = validateTelegramInitData(initData, BOT_TOKEN);
  if (!caller) return res.status(401).json({ error: "unauthorized" });

  const body = req.body ?? {};
  const category = String(body.category ?? "");
  const lang = String(body.lang ?? "en");
  const gender = String(body.gender ?? "male");
  const mode = String(body.mode ?? "solo");
  const coupleId = typeof body.coupleId === "string" ? body.coupleId : null;
  if (!CATEGORIES.has(category)) return res.status(400).json({ error: "invalid_category" });
  if (!LANGS.has(lang) || !GENDERS.has(gender) || !MODES.has(mode)) return res.status(400).json({ error: "invalid_generation_options" });
  if (body.requestId !== undefined && (typeof body.requestId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.requestId))) {
    return res.status(400).json({ error: "invalid_request_id" });
  }
  const requestId = body.requestId ?? randomUUID();
  try {
    await claimFriendInvite(supabase, initData!, caller.id);
  } catch {
    return res.status(500).json({ error: "referral_claim_failed" });
  }

  if (mode === "together") {
    if (!coupleId) return res.status(400).json({ error: "couple_id_required" });
    const { data } = await supabase.from("couples").select("user_a_id,user_b_id").eq("id", coupleId).maybeSingle();
    if (!data || (data.user_a_id !== caller.id && data.user_b_id !== caller.id)) return res.status(403).json({ error: "couple_access_denied" });
  }
  const premium = caller.id === OWNER_ID || !!(await supabase.from("user_subscriptions").select("expires_at").eq("user_id", caller.id).gt("expires_at", new Date().toISOString()).maybeSingle()).data;
  if (!premium && PAID_CATEGORIES.has(category)) {
    const [{ data: referralCredit, error: referralError }, { data: paidCredit, error: paidCreditError }] = await Promise.all([
      supabase.from("referral_task_credits").select("balance").eq("user_id", caller.id).eq("category", category).maybeSingle(),
      supabase.from("premium_task_credits").select("balance").eq("user_id", caller.id).eq("category", category).maybeSingle(),
    ]);
    if (referralError || paidCreditError) return res.status(500).json({ error: "premium_credits_read_failed" });
    const credits = Number(referralCredit?.balance ?? 0) + Number(paidCredit?.balance ?? 0);
    if (credits < 1) return res.status(403).json({ error: "subscription_required" });
  }

  let task = getFallback(category, lang);
  let source: "ai" | "fallback" = "fallback";
  if (DEEPSEEK_API_KEY) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12_000);
    try {
        const systemPrompt = `${getPrompt(category, lang)}\n\n${getGenderLine(lang, gender)}\n\n${getTaskQualityRules(lang)}\n\n${LANGUAGE_INSTRUCTIONS[lang]}`;
      const aiRes = await fetch(DEEPSEEK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${DEEPSEEK_API_KEY}` },
        signal: controller.signal,
        body: JSON.stringify({ model: "deepseek-chat", messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: LANGUAGE_INSTRUCTIONS[lang] },
        ], max_tokens: 160, temperature: 0.8 }),
      });
      if (aiRes.ok) {
        const data = await aiRes.json();
        const candidate = String(data.choices?.[0]?.message?.content ?? "").replace(/^["']|["']$/g, "").replace(/^\d+\.\s*/, "").trim();
        const forbidden = ["я рекомендую", "тебе стоит", "можешь попробовать", "выдыхает", "дыши в", "посмотри в глаза", "отстранись"];
        if (candidate.length >= 15 && candidate.length <= 350
          && matchesRequestedLanguage(candidate, lang)
          && isTaskTextWellFormed(candidate, lang)
          && !forbidden.some(f => candidate.toLowerCase().includes(f))) {
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

  const { data: saved, error: saveError } = await supabase.rpc("create_task_with_allowance", {
    p_user_id: caller.id, p_couple_id: mode === "together" ? coupleId : null,
    p_category: category, p_mode: mode, p_task_text: task,
    p_points: ({ compliments: 10, tenderness: 15, desire: 25, passion: 40, hard: 50 } as Record<string, number>)[category],
    p_source: source, p_request_id: requestId, p_date: appDate(), p_premium: premium,
  });
  if (saveError) return res.status(500).json({ error: "task_save_failed" });
  if (saved?.ok !== true) return res.status(403).json({ error: saved?.error ?? "limit_exceeded", remaining: 0, isPremium: false });
  return res.status(200).json({
    ok: true, task: saved.task, taskId: saved.taskId,
    source: saved.source, remaining: saved.remaining, isPremium: premium,
  });
}
