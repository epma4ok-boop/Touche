// api/scenario/generate.ts
// POST /api/scenario/generate
// Body: { coupleId: string, lang: "ru"|"en"|"hi"|"pt"|"es", intensity: "romantic"|"passion"|"hard" }
// Headers: x-telegram-init-data

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { validateTelegramInitData } from "../couple/_auth.js";

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY!;
const DEEPSEEK_URL = "https://api.deepseek.com/v1/chat/completions";
const BOT_TOKEN = process.env.BOT_TOKEN!;
const APP_URL = process.env.APP_URL!;

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const FALLBACKS: Record<string, Record<string, { title: string; role_a: string; role_b: string }>> = {
  romantic: {
    ru: {
      title: "Фотограф и модель",
      role_a: "Ты фотограф. Проводишь съёмку. Жёсткое правило: НЕ КАСАТЬСЯ модели. Командуй позами, смотри в упор. Ищи красоту в каждом движении.",
      role_b: "Ты модель. Твоя задача — соблазнить фотографа лёгкими прикосновениями и взглядами. Заставь его забыть о камере. Говори: «Снимаешь или смотришь?»",
    },
    en: {
      title: "Photographer & Model",
      role_a: "You're a photographer. Strict rule: DO NOT TOUCH the model. Give pose commands, hold eye contact. Find beauty in every move.",
      role_b: "You're the model. Seduce the photographer with light touches and glances. Make them forget the camera. Say: 'Shooting or staring?'",
    },
    hi: { title: "फोटोग्राफर और मॉडल", role_a: "आप फोटोग्राफर हैं। नियम: मॉडल को स्पर्श न करें। पोज़ के निर्देश दें, आंखों में देखें।", role_b: "आप मॉडल हैं। हल्के स्पर्श और नज़रों से फोटोग्राफर को आकर्षित करें।" },
    pt: { title: "Fotógrafo e Modelo", role_a: "Você é o fotógrafo. Regra: NÃO TOQUE a modelo. Dê comandos de pose, mantenha contato visual.", role_b: "Você é a modelo. Seduza o fotógrafo com toques leves e olhares." },
    es: { title: "Fotógrafo y Modelo", role_a: "Eres el fotógrafo. Regla: NO TOCAR a la modelo. Da comandos de pose, mantén contacto visual.", role_b: "Eres la modelo. Seduce al fotógrafo con toques suaves y miradas." },
  },
  passion: {
    ru: {
      title: "Массажист и клиент",
      role_a: "Ты массажист. Начни со спины. Каждый раз когда партнёр напрягается — чуть дольше задерживайся на этом месте. Говори уверенно: «Расслабься. Я знаю, что делаю.»",
      role_b: "Ты клиент. Пришёл за обычным массажем, но массажист слишком хорош. Говори только «здесь» и «ещё».",
    },
    en: {
      title: "Masseuse & Client",
      role_a: "You're a masseuse. Start with the back. Every time your partner tenses — linger a little longer there. Say: 'Relax. I know what I'm doing.'",
      role_b: "You came for a regular massage, but this masseuse is too good. Only say 'here' and 'more'.",
    },
    hi: { title: "मालिश और ग्राहक", role_a: "आप मालिश करने वाले हैं। पीठ से शुरू करें।", role_b: "आप ग्राहक हैं। सिर्फ 'यहाँ' और 'और' कहें।" },
    pt: { title: "Massagista e Cliente", role_a: "Você é o massagista. Comece pelas costas.", role_b: "Diga apenas 'aqui' e 'mais'." },
    es: { title: "Masajista y Cliente", role_a: "Eres el masajista. Empieza por la espalda.", role_b: "Solo di 'aquí' y 'más'." },
  },
  hard: {
    ru: {
      title: "Хозяин и слуга",
      role_a: "Ты хозяин. На 30 минут отдавай команды без объяснений. Начни с: «Встань перед зеркалом. Не отводи взгляд.»",
      role_b: "Ты слуга. Полностью подчиняешься. Можешь говорить только «да» и «как вам угодно».",
    },
    en: {
      title: "Master & Servant",
      role_a: "You're the master. Give commands without explanation. Start: 'Stand in front of the mirror. Don't look away.'",
      role_b: "You're the servant. Obey completely. You may only say 'yes' and 'as you wish'.",
    },
    hi: { title: "स्वामी और सेवक", role_a: "आप स्वामी हैं। बिना स्पष्टीकरण के आदेश दें।", role_b: "आप सेवक हैं। केवल 'जी' कह सकते हैं।" },
    pt: { title: "Mestre e Servo", role_a: "Você é o mestre. Dê ordens sem explicação.", role_b: "Você é o servo. Só pode dizer 'sim'." },
    es: { title: "Amo y Sirviente", role_a: "Eres el amo. Da órdenes sin explicación.", role_b: "Solo puedes decir 'sí'." },
  },
};

const PERSONA_RU = `Ты — доктор Соня, сертифицированный сексолог-психолог с 15-летней практикой работы с парами. Ты создаёшь ролевые сценарии с психологической глубиной и эротическим напряжением. Каждый сценарий — неожиданный, богатый деталями, с точными репликами и конкретными действиями. Никогда не банальный, всегда психологически интересный.`;

const PERSONA_EN = `You are Dr. Sofia — a certified sex therapist and couples psychologist with 15 years of clinical practice. You design roleplay scenarios with psychological depth and erotic tension. Each scenario is unexpected, detail-rich, with exact lines to say and specific physical actions. Never generic. Always psychologically interesting.`;

const ROLE_LIST_EN = `
Available roles (choose one or invent something better): Nurse/patient, Teacher/student, Boss/subordinate, Doctor/patient, Police officer/detained person, Coach/athlete, Master/servant, Photographer/model, Neighbors, Masseuse/client, Therapist/patient, Strangers on a night train, Vocal coach/student, Librarian/visitor, Taxi driver/passenger.

Scene elements to weave in: Slow command-driven undressing, charged silences, whispered commands, gaze prohibition, orgasm denial, bets with real stakes, light spanking, wrist binding (consensual), blindfolds, specific props (belt / tie / scarf / ice cube), exact phrases spoken out loud, temperature play, mirrors, mid-scene power reversal.

Intensity levels:
- romantic: playful and psychologically tense — no explicit sexual content, only charged anticipation
- passion: sensual and bold, explicit erotic contact (18+), somatic vulnerability, direct desire expressed
- hard: dominant control, BDSM power dynamics, total submission (18+) — write specific commands directly into the role text

Rules: Each role = 3–5 sentences. Include exact phrases in quotes. Describe exact physical actions. Make it psychologically surprising, not just physically explicit.
Return ONLY valid JSON: {"title":"...","role_a":"...","role_b":"..."}`;

const SYSTEM_PROMPTS: Record<string, (intensity: string) => string> = {
  ru: (intensity) => `${PERSONA_RU}

Доступные роли (выбери или придумай лучше): Медсестра/пациент, Учитель/ученица, Начальник/подчинённая, Врач/пациентка, Полицейский/задержанная, Тренер/спортсменка, Хозяин/служанка, Фотограф/модель, Соседи, Массажист/клиент, Терапевт/клиент, Незнакомцы в ночном поезде, Тренер по вокалу/ученица.

Элементы сцены: Раздевание по команде медленно, заряженные паузы, шёпот команд, запрет на взгляд, запрет на оргазм, спор со ставками, шлепки, связывание запястий (с согласия), повязка на глаза, предметы (ремень/галстук/кубик льда), точные фразы вслух, игры с температурой, зеркала, переворот ролей.

Текущий уровень: ${intensity}
- romantic: игривое психологическое напряжение — без явного контента
- passion: чувственно и смело (18+), соматическая уязвимость
- hard: БДСМ, полное подчинение (18+) — конкретные команды в тексте

Правила: Каждая роль 3–5 предложений. Точные фразы в кавычках. Конкретные физические действия. Психологически неожиданно.
Верни ТОЛЬКО JSON: {"title":"Название","role_a":"текст роли А","role_b":"текст роли Б"}`,

  en: (intensity) => `${PERSONA_EN}

Current intensity level: ${intensity}
${ROLE_LIST_EN}`,

  hi: (intensity) => `${PERSONA_EN}
IMPORTANT: Write ALL output in Hindi (हिंदी) using Devanagari script.

Current intensity level: ${intensity}
${ROLE_LIST_EN}`,

  pt: (intensity) => `${PERSONA_EN}
IMPORTANT: Write ALL output in Brazilian Portuguese (Português Brasileiro).

Current intensity level: ${intensity}
${ROLE_LIST_EN}`,

  es: (intensity) => `${PERSONA_EN}
IMPORTANT: Write ALL output in Spanish (Español).

Current intensity level: ${intensity}
${ROLE_LIST_EN}`,
};

function userPrompt(lang: string, intensity: string): string {
  if (lang === "ru") return `Создай неожиданный, психологически богатый сценарий уровня ${intensity}. Верни ТОЛЬКО JSON.`;
  if (lang === "hi") return `${intensity} स्तर का एक अप्रत्याशित दृश्य बनाएं। केवल JSON।`;
  if (lang === "pt") return `Crie um cenário inesperado de nível ${intensity} em português. Apenas JSON.`;
  if (lang === "es") return `Crea un escenario inesperado de nivel ${intensity} en español. Solo JSON.`;
  return `Create an unexpected, psychologically rich ${intensity}-level scenario. Return ONLY JSON.`;
}

async function notifyPartner(chatId: number, title: string, sessionId: string, lang: string): Promise<boolean> {
  const texts: Record<string, string> = {
    ru: `🎭 <b>${title}</b>\n\nПартнёр вытянул сценарий — твоя роль готова.\nОткрой карточку чтобы узнать её.`,
    hi: `🎭 <b>${title}</b>\n\nआपके साथी ने दृश्य खींचा — आपकी भूमिका तैयार है।`,
    pt: `🎭 <b>${title}</b>\n\nSeu parceiro escolheu um cenário — seu papel está pronto.`,
    es: `🎭 <b>${title}</b>\n\nTu pareja eligió un escenario — tu rol está listo.`,
  };
  const buttons: Record<string, string> = {
    ru: "🃏 Открыть мою роль", hi: "🃏 मेरी भूमिका खोलें",
    pt: "🃏 Abrir meu papel", es: "🃏 Abrir mi rol",
  };
  const text = texts[lang] ?? `🎭 <b>${title}</b>\n\nYour partner drew a scenario — your role is ready.`;
  const buttonText = buttons[lang] ?? "🃏 Open my role";
  try {
    const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId, text, parse_mode: "HTML",
        reply_markup: { inline_keyboard: [[{ text: buttonText, web_app: { url: `${APP_URL}?scenario=${sessionId}&role=b` } }]] },
      }),
    });
    return r.ok;
  } catch { return false; }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-telegram-init-data");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const initData = req.headers["x-telegram-init-data"] as string;
  const caller = validateTelegramInitData(initData, BOT_TOKEN);
  if (!caller) return res.status(401).json({ error: "Unauthorized" });

  const { coupleId, lang = "ru", intensity = "passion" } = req.body as {
    coupleId: string; lang?: string; intensity?: string;
  };
  if (!coupleId) return res.status(400).json({ error: "coupleId required" });

  let generated: { title: string; role_a: string; role_b: string };
  let source: "ai" | "fallback" = "ai";

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 14_000);
    const aiRes = await fetch(DEEPSEEK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${DEEPSEEK_API_KEY}` },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: (SYSTEM_PROMPTS[lang] ?? SYSTEM_PROMPTS.en)(intensity) },
          { role: "user",   content: userPrompt(lang, intensity) },
        ],
        max_tokens: 620,
        temperature: 1.3,
        response_format: { type: "json_object" },
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!aiRes.ok) throw new Error(`DeepSeek ${aiRes.status}`);
    const aiData = await aiRes.json();
    const raw = (aiData.choices?.[0]?.message?.content ?? "").trim();
    const parsed = JSON.parse(raw);
    if (parsed?.title && parsed?.role_a && parsed?.role_b) {
      generated = { title: String(parsed.title), role_a: String(parsed.role_a), role_b: String(parsed.role_b) };
    } else {
      throw new Error("Unexpected AI response shape");
    }
  } catch {
    source = "fallback";
    const fb = FALLBACKS[intensity as keyof typeof FALLBACKS] ?? FALLBACKS.passion;
    generated = fb[lang] ?? fb.en;
  }

  const { data: couple } = await supabase
    .from("couples").select("user_a_id, user_b_id").eq("id", coupleId).single();

  const partnerTgId: number | null = couple
    ? couple.user_a_id === caller.id ? couple.user_b_id : couple.user_a_id
    : null;

  const { data: session } = await supabase
    .from("scenario_sessions")
    .insert({
      couple_id: coupleId, pulled_by: caller.id, lang,
      title: generated.title, role_a_text: generated.role_a, role_b_text: generated.role_b,
      ai_generated: true, pending_for_b: !!partnerTgId,
    })
    .select("id").single();

  let notified = false;
  if (partnerTgId && session?.id) {
    notified = await notifyPartner(partnerTgId, generated.title, session.id, lang);
    if (notified) {
      await supabase.from("scenario_sessions")
        .update({ pending_for_b: false, notified_at: new Date().toISOString() })
        .eq("id", session.id);
    }
  }

  return res.status(200).json({ ok: true, title: generated.title, roleA: generated.role_a, sessionId: session?.id ?? null, notified, source });
}
