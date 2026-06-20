// api/scenario/generate.ts
// POST /api/scenario/generate
// Body: { coupleId, lang, intensity, gender }
//   gender: "male" | "female" — пол того, кто тянет карту (они получат role_a)
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

// ─── Фолбэки разделены по полу инициатора (role_a) ────────────────────────

type FallbackEntry = { title: string; role_a: string; role_b: string };
type FallbackByGender = { male: FallbackEntry; female: FallbackEntry };
type FallbackPool = Record<string, Record<string, FallbackByGender>>;

const FALLBACKS: FallbackPool = {
  romantic: {
    ru: {
      male: {
        title: "Фотограф и модель",
        role_a: "Ты фотограф-мужчина. Проводишь домашнюю фотосессию. Жёсткое правило: НЕ КАСАТЬСЯ модели. Командуй позами, смотри в упор. Используй телефон как камеру.",
        role_b: "Ты модель-женщина. Твоя задача — соблазнить фотографа лёгкими прикосновениями и взглядами. Заставь его забыть о съёмке. Говори: «Снимаешь или смотришь?»",
      },
      female: {
        title: "Фотограф и модель",
        role_a: "Ты фотограф-женщина. Проводишь домашнюю фотосессию. Жёсткое правило: НЕ КАСАТЬСЯ модели. Командуй позами, смотри в упор. Используй телефон как камеру.",
        role_b: "Ты модель-мужчина. Твоя задача — соблазнить фотографа взглядами и движениями. Заставь её опустить телефон. Говори: «Снимаешь или смотришь?»",
      },
    },
    en: {
      male: {
        title: "Photographer & Model",
        role_a: "You're the male photographer. Home photoshoot with your phone. Strict rule: DO NOT TOUCH. Give pose commands, hold eye contact.",
        role_b: "You're the female model. Seduce the photographer with glances and light touches. Make him forget the camera. Say: 'Shooting or staring?'",
      },
      female: {
        title: "Photographer & Model",
        role_a: "You're the female photographer. Home photoshoot with your phone. Strict rule: DO NOT TOUCH. Give pose commands, hold eye contact.",
        role_b: "You're the male model. Seduce her with glances and movement. Make her put the phone down. Say: 'Shooting or staring?'",
      },
    },
    hi: {
      male: { title: "फोटोग्राफर और मॉडल", role_a: "आप पुरुष फोटोग्राफर हैं। नियम: स्पर्श न करें। पोज़ के निर्देश दें।", role_b: "आप महिला मॉडल हैं। हल्के स्पर्श से फोटोग्राफर को आकर्षित करें।" },
      female: { title: "फोटोग्राफर और मॉडल", role_a: "आप महिला फोटोग्राफर हैं। नियम: स्पर्श न करें। पोज़ के निर्देश दें।", role_b: "आप पुरुष मॉडल हैं। उसे आकर्षित करें।" },
    },
    pt: {
      male: { title: "Fotógrafo e Modelo", role_a: "Você é o fotógrafo. Regra: NÃO TOQUE a modelo. Dê comandos de pose.", role_b: "Você é a modelo. Seduza o fotógrafo com toques leves e olhares." },
      female: { title: "Fotógrafa e Modelo", role_a: "Você é a fotógrafa. Regra: NÃO TOQUE o modelo. Dê comandos de pose.", role_b: "Você é o modelo. Seduza a fotógrafa com olhares e movimentos." },
    },
    es: {
      male: { title: "Fotógrafo y Modelo", role_a: "Eres el fotógrafo. Regla: NO TOCAR a la modelo. Da comandos de pose.", role_b: "Eres la modelo. Seduce al fotógrafo con toques suaves y miradas." },
      female: { title: "Fotógrafa y Modelo", role_a: "Eres la fotógrafa. Regla: NO TOCAR al modelo. Da comandos de pose.", role_b: "Eres el modelo. Sedúcela con miradas y movimientos." },
    },
  },
  passion: {
    ru: {
      male: {
        title: "Массажист и клиент",
        role_a: "Ты мужчина-массажист. Начни со спины партнёрши. Используй масло из кухни или крем из ванной. Говори уверенно: «Расслабься. Я знаю, что делаю.»",
        role_b: "Ты женщина-клиент. Пришла за обычным массажем, но этот массажист слишком хорош. Говори только «здесь» и «ещё».",
      },
      female: {
        title: "Массажистка и клиент",
        role_a: "Ты женщина-массажистка. Начни со спины партнёра. Используй масло из кухни или крем из ванной. Говори уверенно: «Расслабься. Я знаю, что делаю.»",
        role_b: "Ты мужчина-клиент. Пришёл за обычным массажем, но эта массажистка слишком хороша. Говори только «здесь» и «ещё».",
      },
    },
    en: {
      male: {
        title: "Masseur & Client",
        role_a: "You're the male masseur. Start with her back. Use kitchen oil or body lotion. Say: 'Relax. I know what I'm doing.'",
        role_b: "You're the female client. You came for a simple massage, but this masseur is dangerously good. Only say 'here' and 'more'.",
      },
      female: {
        title: "Masseuse & Client",
        role_a: "You're the female masseuse. Start with his back. Use kitchen oil or body lotion. Say: 'Relax. I know what I'm doing.'",
        role_b: "You're the male client. You came for a simple massage, but this masseuse is dangerously good. Only say 'here' and 'more'.",
      },
    },
    hi: {
      male: { title: "मालिश और ग्राहक", role_a: "आप पुरुष मालिशिया हैं। पीठ से शुरू करें।", role_b: "आप महिला ग्राहक हैं। सिर्फ 'यहाँ' और 'और' कहें।" },
      female: { title: "मालिशिया और ग्राहक", role_a: "आप महिला मालिशिया हैं। पीठ से शुरू करें।", role_b: "आप पुरुष ग्राहक हैं। सिर्फ 'यहाँ' और 'और' कहें।" },
    },
    pt: {
      male: { title: "Massagista e Cliente", role_a: "Você é o massagista. Comece pelas costas dela. Use óleo de cozinha.", role_b: "Você é a cliente. Diga apenas 'aqui' e 'mais'." },
      female: { title: "Massagista e Cliente", role_a: "Você é a massagista. Comece pelas costas dele. Use óleo de cozinha.", role_b: "Você é o cliente. Diga apenas 'aqui' e 'mais'." },
    },
    es: {
      male: { title: "Masajista y Cliente", role_a: "Eres el masajista. Empieza por su espalda. Usa aceite de cocina.", role_b: "Eres la cliente. Solo di 'aquí' y 'más'." },
      female: { title: "Masajista y Cliente", role_a: "Eres la masajista. Empieza por su espalda. Usa aceite de cocina.", role_b: "Eres el cliente. Solo di 'aquí' y 'más'." },
    },
  },
  hard: {
    ru: {
      male: {
        title: "Хозяин и слуга",
        role_a: "Ты мужчина-хозяин. На 30 минут отдавай команды без объяснений. Начни с: «Встань перед зеркалом. Не отводи взгляд. Раздевайся медленно.»",
        role_b: "Ты женщина-слуга. Полностью подчиняешься. Можешь говорить только «да» и «как вам угодно».",
      },
      female: {
        title: "Хозяйка и слуга",
        role_a: "Ты женщина-хозяйка. На 30 минут отдавай команды без объяснений. Начни с: «Встань передо мной. Не отводи взгляд.»",
        role_b: "Ты мужчина-слуга. Полностью подчиняешься. Можешь говорить только «да» и «как вам угодно».",
      },
    },
    en: {
      male: {
        title: "Master & Servant",
        role_a: "You're the male master. Give commands for 30 minutes without explanation. Start: 'Stand in front of the mirror. Don't look away. Undress slowly.'",
        role_b: "You're the female servant. Obey completely. You may only say 'yes' and 'as you wish'.",
      },
      female: {
        title: "Mistress & Servant",
        role_a: "You're the female mistress. Give commands for 30 minutes without explanation. Start: 'Stand before me. Don't look away.'",
        role_b: "You're the male servant. Obey completely. You may only say 'yes' and 'as you wish'.",
      },
    },
    hi: {
      male: { title: "स्वामी और सेवक", role_a: "आप पुरुष स्वामी हैं। बिना स्पष्टीकरण के आदेश दें।", role_b: "आप महिला सेवक हैं। केवल 'जी' कह सकती हैं।" },
      female: { title: "स्वामिनी और सेवक", role_a: "आप महिला स्वामिनी हैं। बिना स्पष्टीकरण के आदेश दें।", role_b: "आप पुरुष सेवक हैं। केवल 'जी' कह सकते हैं।" },
    },
    pt: {
      male: { title: "Mestre e Serva", role_a: "Você é o mestre. Dê ordens sem explicação.", role_b: "Você é a serva. Só pode dizer 'sim'." },
      female: { title: "Mestra e Servo", role_a: "Você é a mestra. Dê ordens sem explicação.", role_b: "Você é o servo. Só pode dizer 'sim'." },
    },
    es: {
      male: { title: "Amo y Sirvienta", role_a: "Eres el amo. Da órdenes sin explicación.", role_b: "Eres la sirvienta. Solo puedes decir 'sí'." },
      female: { title: "Ama y Sirviente", role_a: "Eres el ama. Da órdenes sin explicación.", role_b: "Eres el sirviente. Solo puedes decir 'sí'." },
    },
  },
};

function getFallback(intensity: string, lang: string, gender: string): FallbackEntry {
  const pool = FALLBACKS[intensity] ?? FALLBACKS.passion;
  const byLang = pool[lang] ?? pool["en"];
  return byLang[gender === "female" ? "female" : "male"];
}

// ─── Персоны ─────────────────────────────────────────────────────────────────

const PERSONA_RU = `Ты — доктор Соня, сертифицированный сексолог-психолог с 15-летней практикой работы с парами. Ты создаёшь ролевые сценарии с психологической глубиной и эротическим напряжением. Каждый сценарий — неожиданный, богатый деталями, с точными репликами и конкретными действиями. Никогда не банальный, всегда психологически интересный.`;

const PERSONA_EN = `You are Dr. Sofia — a certified sex therapist and couples psychologist with 15 years of clinical practice. You design roleplay scenarios with psychological depth and erotic tension. Each scenario is unexpected, detail-rich, with exact lines to say and specific physical actions. Never generic. Always psychologically interesting.`;

// ─── Гендерный контекст ───────────────────────────────────────────────────────

function genderContextRu(gender: string): string {
  return gender === "female"
    ? `Роли: role_a — ЖЕНЩИНА (инициатор сценария), role_b — МУЖЧИНА (её партнёр). Пиши роли строго под правильный пол. Учитывай физиологию гетеросексуальной пары.`
    : `Роли: role_a — МУЖЧИНА (инициатор сценария), role_b — ЖЕНЩИНА (его партнёрша). Пиши роли строго под правильный пол. Учитывай физиологию гетеросексуальной пары.`;
}

function genderContextEn(gender: string): string {
  return gender === "female"
    ? `Roles: role_a = WOMAN (the one who draws the card), role_b = MAN (her partner). Write each role strictly for that gender. Heterosexual couple.`
    : `Roles: role_a = MAN (the one who draws the card), role_b = WOMAN (his partner). Write each role strictly for that gender. Heterosexual couple.`;
}

// ─── Системные промпты ────────────────────────────────────────────────────────

const ROLE_LIST_EN = `
Available roles (choose one or invent something better): Nurse/patient, Teacher/student, Boss/subordinate, Doctor/patient, Police officer/detained person, Coach/athlete, Master/servant, Photographer/model, Neighbors, Masseuse/client, Therapist/patient, Strangers on a night train, Vocal coach/student, Librarian/visitor, Taxi driver/passenger.

Scene elements to weave in: Slow command-driven undressing, charged silences, whispered commands, gaze prohibition, orgasm denial, bets with real stakes, light spanking, wrist binding (consensual), blindfolds, specific household props (belt / tie / scarf / ice cube from freezer / kitchen oil / mirror / headphones), exact phrases spoken out loud, temperature play, mid-scene power reversal.

Intensity levels:
- romantic: playful and psychologically tense — no explicit sexual content, only charged anticipation
- passion: sensual and bold, explicit erotic contact (18+), somatic vulnerability, direct desire expressed
- hard: dominant control, BDSM power dynamics, total submission (18+) — write specific commands directly into the role text

IMPORTANT — HOME CONSTRAINT: Every action must be doable at home right now without going to any store. Use only items already available at home: tie, scarf, belt, ice from freezer, cooking oil, lotion, mirror, phone camera, headphones.

Rules: Each role = 3–5 sentences. Include exact phrases in quotes. Describe exact physical actions. Make it psychologically surprising.
Return ONLY valid JSON: {"title":"...","role_a":"...","role_b":"..."}`;

const SYSTEM_PROMPTS: Record<string, (intensity: string, gender: string) => string> = {
  ru: (intensity, gender) => `${PERSONA_RU}

${genderContextRu(gender)}

Доступные роли (выбери или придумай лучше): Медсестра/пациент, Учитель/ученица, Начальник/подчинённая, Врач/пациентка, Полицейский/задержанная, Тренер/спортсменка, Хозяин/служанка, Фотограф/модель, Соседи, Массажист/клиент, Терапевт/клиент, Незнакомцы в ночном поезде, Тренер по вокалу/ученица.

Элементы сцены: Раздевание по команде медленно, заряженные паузы, шёпот команд, запрет на взгляд, запрет на оргазм, спор со ставками, шлепки, связывание запястий (с согласия), повязка на глаза, домашний реквизит (ремень/галстук/шарф/кубик льда из морозилки/масло или лосьон/зеркало), точные фразы вслух, игры с температурой, переворот ролей.

ВАЖНО — ДОМАШНИЙ ФОРМАТ: все действия должны быть выполнимы дома прямо сейчас, без похода в магазин. Только то, что обычно есть дома.

Текущий уровень: ${intensity}
- romantic: игривое психологическое напряжение — без явного контента
- passion: чувственно и смело (18+), соматическая уязвимость
- hard: БДСМ, полное подчинение (18+) — конкретные команды в тексте

Правила: Каждая роль 3–5 предложений. Точные фразы в кавычках. Конкретные физические действия. Психологически неожиданно.
Верни ТОЛЬКО JSON: {"title":"Название","role_a":"текст роли А","role_b":"текст роли Б"}`,

  en: (intensity, gender) => `${PERSONA_EN}

${genderContextEn(gender)}

Current intensity level: ${intensity}
${ROLE_LIST_EN}`,

  hi: (intensity, gender) => `${PERSONA_EN}
IMPORTANT: Write ALL output in Hindi (हिंदी) using Devanagari script.

${genderContextEn(gender)}

Current intensity level: ${intensity}
${ROLE_LIST_EN}`,

  pt: (intensity, gender) => `${PERSONA_EN}
IMPORTANT: Write ALL output in Brazilian Portuguese (Português Brasileiro).

${genderContextEn(gender)}

Current intensity level: ${intensity}
${ROLE_LIST_EN}`,

  es: (intensity, gender) => `${PERSONA_EN}
IMPORTANT: Write ALL output in Spanish (Español).

${genderContextEn(gender)}

Current intensity level: ${intensity}
${ROLE_LIST_EN}`,
};

function userPrompt(lang: string, intensity: string): string {
  if (lang === "ru") return `Создай неожиданный, психологически богатый сценарий уровня ${intensity}. Все действия — дома. Верни ТОЛЬКО JSON.`;
  if (lang === "hi") return `${intensity} स्तर का एक अप्रत्याशित घरेलू दृश्य बनाएं। केवल JSON।`;
  if (lang === "pt") return `Crie um cenário inesperado de nível ${intensity} realizável em casa. Apenas JSON.`;
  if (lang === "es") return `Crea un escenario inesperado de nivel ${intensity} que se pueda hacer en casa. Solo JSON.`;
  return `Create an unexpected, psychologically rich ${intensity}-level scenario doable at home. Return ONLY JSON.`;
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

  const {
    coupleId,
    lang = "ru",
    intensity = "passion",
    gender = "male",
  } = req.body as {
    coupleId: string;
    lang?: string;
    intensity?: string;
    gender?: string;
  };

  if (!coupleId) return res.status(400).json({ error: "coupleId required" });

  let generated: FallbackEntry;
  let source: "ai" | "fallback" = "ai";

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 14_000);
    const systemContent = (SYSTEM_PROMPTS[lang] ?? SYSTEM_PROMPTS.en)(intensity, gender);
    const aiRes = await fetch(DEEPSEEK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${DEEPSEEK_API_KEY}` },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: systemContent },
          { role: "user",   content: userPrompt(lang, intensity) },
        ],
        max_tokens: 700,
        temperature: 1.2,
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
      generated = {
        title: String(parsed.title),
        role_a: String(parsed.role_a),
        role_b: String(parsed.role_b),
      };
    } else {
      throw new Error("Unexpected AI response shape");
    }
  } catch {
    source = "fallback";
    generated = getFallback(intensity, lang, gender);
  }

  const { data: couple } = await supabase
    .from("couples")
    .select("user_a_id, user_b_id")
    .eq("id", coupleId)
    .single();

  const partnerTgId: number | null = couple
    ? (couple.user_a_id === caller.id ? couple.user_b_id : couple.user_a_id)
    : null;

  const { data: session } = await supabase
    .from("scenario_sessions")
    .insert({
      couple_id: coupleId,
      pulled_by: caller.id,
      lang,
      title: generated.title,
      role_a_text: generated.role_a,
      role_b_text: generated.role_b,
      ai_generated: true,
      pending_for_b: !!partnerTgId,
    })
    .select("id")
    .single();

  let notified = false;
  if (partnerTgId && session?.id) {
    notified = await notifyPartner(partnerTgId, generated.title, session.id, lang);
    if (notified) {
      await supabase
        .from("scenario_sessions")
        .update({ pending_for_b: false, notified_at: new Date().toISOString() })
        .eq("id", session.id);
    }
  }

  return res.status(200).json({
    ok: true,
    title: generated.title,
    roleA: generated.role_a,
    sessionId: session?.id ?? null,
    notified,
    source,
  });
}
