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
    hi: {
      title: "फोटोग्राफर और मॉडल",
      role_a: "आप फोटोग्राफर हैं। नियम: मॉडल को स्पर्श न करें। पोज़ के निर्देश दें, आंखों में देखें।",
      role_b: "आप मॉडल हैं। हल्के स्पर्श और नज़रों से फोटोग्राफर को आकर्षित करें।",
    },
    pt: {
      title: "Fotógrafo e Modelo",
      role_a: "Você é o fotógrafo. Regra: NÃO TOQUE a modelo. Dê comandos de pose, mantenha contato visual.",
      role_b: "Você é a modelo. Seduza o fotógrafo com toques leves e olhares. Faça-o esquecer a câmera.",
    },
    es: {
      title: "Fotógrafo y Modelo",
      role_a: "Eres el fotógrafo. Regla: NO TOCAR a la modelo. Da comandos de pose, mantén contacto visual.",
      role_b: "Eres la modelo. Seduce al fotógrafo con toques suaves y miradas.",
    },
  },
  passion: {
    ru: {
      title: "Массажист и клиент",
      role_a: "Ты массажист. Проводишь сеанс. Начни со спины. Каждый раз когда партнёр напрягается — чуть дольше задерживайся на этом месте. Говори уверенно: «Расслабься. Я знаю, что делаю.»",
      role_b: "Ты клиент. Пришёл за обычным массажем, но массажист слишком хорош. Позволь рукам делать своё дело. Говори только «здесь» и «ещё».",
    },
    en: {
      title: "Masseuse & Client",
      role_a: "You're a masseuse. Start with the back. Every time your partner tenses — linger a little longer there. Say confidently: 'Relax. I know what I'm doing.'",
      role_b: "You came for a regular massage, but this masseuse is too good. Let the hands do their work. Only say 'here' and 'more'.",
    },
    hi: {
      title: "मालिश करने वाला और ग्राहक",
      role_a: "आप मालिश करने वाले हैं। पीठ से शुरू करें। जब भी साथी तनावग्रस्त हो — वहाँ थोड़ी देर रुकें।",
      role_b: "आप ग्राहक हैं। साधारण मालिश के लिए आए, लेकिन यह बहुत अच्छा है। सिर्फ 'यहाँ' और 'और' कहें।",
    },
    pt: {
      title: "Massagista e Cliente",
      role_a: "Você é o massagista. Comece pelas costas. Cada vez que o parceiro tensionar — demore um pouco mais naquele ponto. Diga: 'Relaxe. Eu sei o que estou fazendo.'",
      role_b: "Você veio para uma massagem comum, mas este massagista é bom demais. Deixe as mãos trabalharem. Diga apenas 'aqui' e 'mais'.",
    },
    es: {
      title: "Masajista y Cliente",
      role_a: "Eres el masajista. Empieza por la espalda. Cada vez que tu pareja se tense — demórate un poco más ahí. Di: 'Relájate. Sé lo que hago.'",
      role_b: "Viniste por un masaje normal, pero este masajista es demasiado bueno. Solo di 'aquí' y 'más'.",
    },
  },
  hard: {
    ru: {
      title: "Хозяин и слуга",
      role_a: "Ты хозяин. На 30 минут отдавай команды без объяснений. Твоя воля — закон. Начни с: «Встань перед зеркалом. Не отводи взгляд.»",
      role_b: "Ты слуга. На 30 минут ты полностью подчиняешься. Выполняй каждую команду без возражений. Можешь говорить только «да» и «как вам угодно».",
    },
    en: {
      title: "Master & Servant",
      role_a: "You're the master. For 30 minutes, give commands without explanation. Start with: 'Stand in front of the mirror. Don't look away.'",
      role_b: "You're the servant. For 30 minutes you obey completely. You may only say 'yes' and 'as you wish'.",
    },
    hi: {
      title: "स्वामी और सेवक",
      role_a: "आप स्वामी हैं। 30 मिनट के लिए बिना स्पष्टीकरण के आदेश दें। शुरुआत: 'दर्पण के सामने खड़े हो। नज़र मत हटाओ।'",
      role_b: "आप सेवक हैं। 30 मिनट पूरी तरह आज्ञाकारी। केवल 'जी' और 'जैसा आप चाहें' कह सकते हैं।",
    },
    pt: {
      title: "Mestre e Servo",
      role_a: "Você é o mestre. Por 30 minutos dê ordens sem explicação. Comece: 'Fique na frente do espelho. Não desvie o olhar.'",
      role_b: "Você é o servo. Por 30 minutos obedece completamente. Só pode dizer 'sim' e 'como desejar'.",
    },
    es: {
      title: "Amo y Sirviente",
      role_a: "Eres el amo. Por 30 minutos da órdenes sin explicación. Comienza: 'Párate frente al espejo. No apartes la mirada.'",
      role_b: "Eres el sirviente. Por 30 minutos obedeces completamente. Solo puedes decir 'sí' y 'como desee'.",
    },
  },
};

const ROLE_LIST_EN = `
Roles: Nurse/patient, Teacher/student, Boss/subordinate, Doctor/patient, Police/detained, Coach/athlete, Master/servant, Photographer/model, Neighbor, Masseur/client, Vocal coach/student, Librarian/visitor, Taxi driver/passenger.

Scene elements: Slow undressing, suggestive touches, kisses, whispered commands, orgasm denial, bets, light spanking, wrist binding (with consent), blindfolds, objects (belt/tie), specific phrases to say out loud, temperature play, mirrors.

Intensity:
- romantic: playful and tender, no explicit content — tension only
- passion: sensual and bold, explicit touches (18+), direct desire
- hard: dominant control, BDSM elements, total submission (18+) — specific commands in role text

Each role: 3–5 sentences. Give exact phrases to say in quotes. Describe exact actions.
Return ONLY JSON: {"title":"...","role_a":"...","role_b":"..."}`;

const SYSTEM_PROMPTS: Record<string, (intensity: string) => string> = {
  ru: (_intensity) => `Ты создаёшь откровенные ролевые сценарии для взрослых пар (18+).

Роли: Медсестра/пациент, Учитель/ученица, Начальник/подчинённая, Врач/пациентка, Полицейский/задержанная, Тренер/спортсменка, Хозяин/служанка, Фотограф/модель, Соседи, Массажист/клиент, Тренер по вокалу/ученица, Библиотекарь/посетительница, Таксист/пассажирка.

Элементы: Раздевание медленно и по команде, прикосновения с намёком, поцелуи, шёпот на ухо, запрет на оргазм, спор, шлепки, связывание запястий (с согласия), повязка на глаза, предметы (ремень/галстук), конкретные фразы вслух, игры с температурой, зеркала.

Уровни:
- romantic: игриво и нежно, только напряжение — без явного контента
- passion: чувственно и смело, прямое желание (18+)
- hard: доминирование, БДСМ элементы, полное подчинение (18+) — конкретные команды в тексте роли

Каждая роль: 3–5 предложений. Дай точные фразы в кавычках. Опиши конкретные действия.
Верни ТОЛЬКО JSON: {"title":"Название","role_a":"текст А","role_b":"текст Б"}`,

  en: (_intensity) => `You create explicit roleplay scenarios for adult couples (18+).
${ROLE_LIST_EN}`,

  hi: (_intensity) => `You create explicit roleplay scenarios for adult couples (18+).
IMPORTANT: Write ALL output in Hindi (हिंदी) using Devanagari script.
${ROLE_LIST_EN}`,

  pt: (_intensity) => `You create explicit roleplay scenarios for adult couples (18+).
IMPORTANT: Write ALL output in Brazilian Portuguese (Português Brasileiro).
${ROLE_LIST_EN}`,

  es: (_intensity) => `You create explicit roleplay scenarios for adult couples (18+).
IMPORTANT: Write ALL output in Spanish (Español).
${ROLE_LIST_EN}`,
};

function userPrompt(lang: string, intensity: string): string {
  if (lang === "ru") return `Создай сценарий уровня ${intensity}. Верни ТОЛЬКО JSON.`;
  if (lang === "hi") return `${intensity} स्तर का दृश्य बनाएं। केवल JSON वापस करें।`;
  if (lang === "pt") return `Crie um cenário de nível ${intensity} em português. Apenas JSON.`;
  if (lang === "es") return `Crea un escenario de nivel ${intensity} en español. Solo JSON.`;
  return `Create a ${intensity} level scenario. Return ONLY JSON.`;
}

async function notifyPartner(chatId: number, title: string, sessionId: string, lang: string): Promise<boolean> {
  const texts: Record<string, string> = {
    ru: `🎭 <b>${title}</b>\n\nПартнёр вытянул сценарий — твоя роль готова.\nОткрой карточку чтобы узнать её.`,
    hi: `🎭 <b>${title}</b>\n\nआपके साथी ने दृश्य खींचा — आपकी भूमिका तैयार है।\nजानने के लिए खोलें।`,
    pt: `🎭 <b>${title}</b>\n\nSeu parceiro escolheu um cenário — seu papel está pronto.\nAbra o cartão para descobrir.`,
    es: `🎭 <b>${title}</b>\n\nTu pareja eligió un escenario — tu rol está listo.\nAbre la tarjeta para descubrirlo.`,
  };
  const buttons: Record<string, string> = {
    ru: "🃏 Открыть мою роль",
    hi: "🃏 मेरी भूमिका खोलें",
    pt: "🃏 Abrir meu papel",
    es: "🃏 Abrir mi rol",
  };
  const text = texts[lang] ?? `🎭 <b>${title}</b>\n\nYour partner drew a scenario — your role is ready.\nOpen your card to find out.`;
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
    const timeout = setTimeout(() => controller.abort(), 12_000);
    const aiRes = await fetch(DEEPSEEK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${DEEPSEEK_API_KEY}` },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: (SYSTEM_PROMPTS[lang] ?? SYSTEM_PROMPTS.en)(intensity) },
          { role: "user",   content: userPrompt(lang, intensity) },
        ],
        max_tokens: 500,
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
