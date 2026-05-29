// api/scenario/generate.ts
// POST /api/scenario/generate
// Body: { coupleId: string, lang: "ru"|"en"|"hi"|"pt"|"es", intensity: "romantic"|"passion"|"hard" }
// Headers: x-telegram-init-data
//
// 1. Calls DeepSeek to generate two complementary AI roles (Role A + Role B)
// 2. Saves session to Supabase (scenario_sessions table)
// 3. Sends Role B to partner via Telegram bot notification
// Returns: { ok, title, roleA, sessionId, notified, source }

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

/* ── Fallbacks if AI fails ─────────────────────────────────────── */
const FALLBACKS: Record<string, Record<string, { title: string; role_a: string; role_b: string }>> = {
  romantic: {
    ru: {
      title: "Фотограф и модель",
      role_a: "Ты фотограф. Проводишь съёмку. Жёсткое правило: НЕ КАСАТЬСЯ модели. Командуй позами, смотри в упор.",
      role_b: "Ты модель. Твоя задача — соблазнить фотографа лёгкими прикосновениями, взглядами. Заставь забыть о камере.",
    },
    en: {
      title: "Photographer & Model",
      role_a: "You're a photographer. Strict rule: DO NOT TOUCH the model. Give pose commands, hold eye contact.",
      role_b: "You're the model. Seduce the photographer with light touches and glances. Make them forget the camera.",
    },
    hi: {
      title: "फोटोग्राफर और मॉडल",
      role_a: "आप फोटोग्राफर हैं। नियम: मॉडल को स्पर्श न करें। पोज़ के निर्देश दें, आंखों में देखें।",
      role_b: "आप मॉडल हैं। हल्के स्पर्श और नज़रों से फोटोग्राफर को आकर्षित करें। उन्हें कैमरा भुला दें।",
    },
    pt: {
      title: "Fotógrafo e Modelo",
      role_a: "Você é o fotógrafo. Regra: NÃO TOQUE a modelo. Dê comandos de pose, mantenha contato visual.",
      role_b: "Você é a modelo. Seduza o fotógrafo com toques leves e olhares. Faça-o esquecer a câmera.",
    },
    es: {
      title: "Fotógrafo y Modelo",
      role_a: "Eres el fotógrafo. Regla: NO TOCAR a la modelo. Da comandos de pose, mantén contacto visual.",
      role_b: "Eres la modelo. Seduce al fotógrafo con toques suaves y miradas. Hazle olvidar la cámara.",
    },
  },
  passion: {
    ru: {
      title: "Медсестра и пациент",
      role_a: "Ты медсестра. Проводишь 'тщательный' осмотр. Когда пациент краснеет — делай пометку и улыбайся.",
      role_b: "Ты пациент. Медсестра слишком внимательна. Не сдерживай реакцию когда она касается бедра.",
    },
    en: {
      title: "Nurse & Patient",
      role_a: "You're a nurse conducting a 'thorough' examination. Smile when they blush.",
      role_b: "You're the patient. The nurse is too attentive. Don't hold back when they touch your thigh.",
    },
    hi: {
      title: "नर्स और मरीज़",
      role_a: "आप नर्स हैं। 'गहन' जांच कर रहे हैं। जब मरीज़ शर्माएं — मुस्कुराएं।",
      role_b: "आप मरीज़ हैं। नर्स बहुत ध्यान दे रहे हैं। अपनी प्रतिक्रिया न रोकें।",
    },
    pt: {
      title: "Enfermeira e Paciente",
      role_a: "Você é a enfermeira fazendo um exame 'completo'. Sorria quando ele corar.",
      role_b: "Você é o paciente. A enfermeira está muito atenciosa. Não contenha sua reação.",
    },
    es: {
      title: "Enfermera y Paciente",
      role_a: "Eres la enfermera haciendo un examen 'exhaustivo'. Sonríe cuando se ruborice.",
      role_b: "Eres el paciente. La enfermera está muy atenta. No contengas tu reacción.",
    },
  },
  hard: {
    ru: {
      title: "Хозяин и слуга",
      role_a: "Ты хозяин. На 30 минут отдавай команды. Не объясняй. Твоя воля — закон.",
      role_b: "Ты слуга. На 30 минут ты полностью подчиняешься. Выполняй каждую команду без возражений.",
    },
    en: {
      title: "Master & Servant",
      role_a: "You're the master. For 30 minutes, give commands. No explanations. Your word is law.",
      role_b: "You're the servant. For 30 minutes you obey completely. No objections.",
    },
    hi: {
      title: "स्वामी और सेवक",
      role_a: "आप स्वामी हैं। 30 मिनट के लिए आदेश दें। कोई स्पष्टीकरण नहीं। आपकी इच्छा कानून है।",
      role_b: "आप सेवक हैं। 30 मिनट के लिए पूरी तरह आज्ञाकारी रहें। बिना विरोध के हर आदेश मानें।",
    },
    pt: {
      title: "Mestre e Servo",
      role_a: "Você é o mestre. Por 30 minutos dê ordens. Sem explicações. Sua vontade é lei.",
      role_b: "Você é o servo. Por 30 minutos você obedece completamente. Sem objeções.",
    },
    es: {
      title: "Amo y Sirviente",
      role_a: "Eres el amo. Por 30 minutos da órdenes. Sin explicaciones. Tu voluntad es ley.",
      role_b: "Eres el sirviente. Por 30 minutos obedeces completamente. Sin objeciones.",
    },
  },
};

/* ── System prompts ────────────────────────────────────────────── */
const ROLE_LIST_EN = `
Allowed roles: Nurse/patient, Teacher/student, Boss/subordinate, Doctor/patient, Police/detained, Professor/student, Coach/athlete, Master/servant, Photographer/model, Neighbor, Plumber/housewife, Vocal coach/student, Librarian/visitor, Taxi driver/passenger.

Elements: Slow undressing, suggestive touches, kisses, orgasm denial, bets, spanking, hand tying/blindfolds, objects (belt/tie), roleplay costumes, phrases to say out loud, temperature play, mirrors.

Intensity levels:
- romantic: playful, tender, no explicit content
- passion: sensual, bold, explicit hints (18+)
- hard: direct, BDSM elements, humiliation, total submission (18+)

Each role: 2–4 sentences. Specify restrictions and rules. Dialogue in quotes.
Return ONLY JSON: {"title":"...","role_a":"...","role_b":"..."}`;

const SYSTEM_PROMPTS: Record<string, (intensity: string) => string> = {
  ru: (_intensity) => `Ты создаёшь откровенные ролевые сценарии для взрослых пар (18+).

Допустимые роли: Медсестра/пациент, Учитель/ученица, Начальник/подчинённая, Врач/пациентка, Полицейский/задержанная, Профессор/студентка, Тренер/спортсменка, Хозяин/служанка, Фотограф/модель, Соседи, Сантехник/домохозяйка, Вокальный тренер/ученица, Библиотекарь/посетительница, Таксист/пассажирка.

Элементы: Раздевание (медленно, командами), прикосновения с намёком, поцелуи, запрет на оргазм, спор/счёт, шлепки, связывание/повязка на глаза, предметы (ремень/галстук), ролевой костюм, фразы вслух, игры с температурой, зеркала.

Уровни:
- romantic: игриво, нежно, без явной откровенности
- passion: чувственно, смело, с откровенными намёками (18+)
- hard: прямо, БДСМ элементы, унижение, полное подчинение (18+)

Каждая роль: 2–4 предложения. Диалог в кавычках.
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

/* ── User prompt by lang ───────────────────────────────────────── */
function userPrompt(lang: string, intensity: string): string {
  if (lang === "ru") return `Создай сценарий уровня ${intensity}. Верни ТОЛЬКО JSON.`;
  if (lang === "hi") return `${intensity} स्तर का दृश्य बनाएं। केवल JSON वापस करें।`;
  if (lang === "pt") return `Crie um cenário de nível ${intensity} em português. Apenas JSON.`;
  if (lang === "es") return `Crea un escenario de nivel ${intensity} en español. Solo JSON.`;
  return `Create a ${intensity} level scenario. Return ONLY JSON.`;
}

/* ── Send Telegram notification ────────────────────────────────── */
async function notifyPartner(
  chatId: number,
  title: string,
  sessionId: string,
  lang: string
): Promise<boolean> {
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
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [[
            { text: buttonText, web_app: { url: `${APP_URL}?scenario=${sessionId}&role=b` } },
          ]],
        },
      }),
    });
    return r.ok;
  } catch {
    return false;
  }
}

/* ── Handler ───────────────────────────────────────────────────── */
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

  /* 1 ── Generate via DeepSeek ── */
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
        max_tokens: 400,
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

  /* 2 ── Find partner ── */
  const { data: couple } = await supabase
    .from("couples")
    .select("user_a_id, user_b_id")
    .eq("id", coupleId)
    .single();

  const partnerTgId: number | null = couple
    ? couple.user_a_id === caller.id ? couple.user_b_id : couple.user_a_id
    : null;

  /* 3 ── Save session ── */
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

  /* 4 ── Notify partner ── */
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

  return res.status(200).json({ ok: true, title: generated.title, roleA: generated.role_a, sessionId: session?.id ?? null, notified, source });
}
