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

/* ── Fallbacks ─────────────────────────────────────────────────── */
const FALLBACKS: Record<string, Record<string, { title: string; role_a: string; role_b: string }>> = {
  romantic: {
    ru: {
      title: "Незнакомцы в баре",
      role_a: "Ты сидишь за барной стойкой. Ты видел(а) этого человека раньше, но делаешь вид, что нет. Твоя задача — познакомиться заново, как будто это первый раз. Будь немного загадочным(ой).",
      role_b: "Ты входишь в бар и замечаешь кого-то знакомого. Но они смотрят на тебя как на незнакомца. Войди в игру: ты тоже «не знаком(а)». Дай себя покорить — не сразу.",
    },
    en: {
      title: "Strangers at a Bar",
      role_a: "You're sitting at the bar. You've seen this person before, but you pretend you haven't. Your goal: meet them again as if for the first time. Be a little mysterious.",
      role_b: "You walk into a bar and notice someone familiar. But they're looking at you like a stranger. Play along: you're 'strangers' too. Let yourself be won over — not too quickly.",
    },
    hi: {
      title: "बार में अजनबी",
      role_a: "आप बार में बैठे हैं। आपने इस व्यक्ति को पहले देखा है, लेकिन नहीं देखा का नाटक करें। पहली बार की तरह मिलें।",
      role_b: "आप बार में आते हैं और किसी परिचित को देखते हैं। लेकिन वे आपको अजनबी की तरह देख रहे हैं। खेल में शामिल हों।",
    },
    pt: {
      title: "Estranhos num Bar",
      role_a: "Você está sentado no bar. Já viu essa pessoa antes, mas finge que não. Sua missão: conhecê-la de novo, como se fosse a primeira vez. Seja um pouco misterioso.",
      role_b: "Você entra no bar e nota alguém familiar. Mas eles olham para você como se fosse um estranho. Entre no jogo: vocês são 'desconhecidos'. Deixe-se conquistar — não tão rápido.",
    },
    es: {
      title: "Desconocidos en un Bar",
      role_a: "Estás sentado en el bar. Has visto a esta persona antes, pero finges que no. Tu misión: conocerla de nuevo, como si fuera la primera vez. Sé un poco misterioso.",
      role_b: "Entras al bar y notas a alguien familiar. Pero te miran como a un desconocido. Entra en el juego: también eres 'desconocido'. Déjate conquistar — no demasiado rápido.",
    },
  },
  passion: {
    ru: {
      title: "Поздний звонок",
      role_a: "Ты — тот, кто позвонил(а) в 23:00 без предупреждения. Скажи только: «Мне нужно тебя видеть». Войди. Не объясняй зачем.",
      role_b: "В 23:00 в дверь звонят. Это твой партнёр. Он(а) ничего не объясняет. Открой дверь — и реагируй так, как будто ждал(а) этого весь день.",
    },
    en: {
      title: "Late Night Call",
      role_a: "You're the one who showed up at 11pm without warning. Say only: 'I needed to see you.' Walk in. Don't explain why.",
      role_b: "Someone rings at 11pm. It's your partner. They explain nothing. Open the door — and react as if you'd been waiting for this all day.",
    },
    hi: {
      title: "देर रात की दस्तक",
      role_a: "आप रात 11 बजे बिना चेतावनी के आए। बस कहें: 'मुझे तुम्हें देखना था।' अंदर आएं। कोई स्पष्टीकरण नहीं।",
      role_b: "रात 11 बजे दरवाजे पर दस्तक। यह आपका साथी है। वे कुछ नहीं बताते। दरवाजा खोलें — और ऐसे react करें जैसे सारा दिन इंतजार था।",
    },
    pt: {
      title: "Ligação Tarde da Noite",
      role_a: "Você é quem apareceu às 23h sem aviso. Diga apenas: 'Eu precisava te ver.' Entre. Não explique por quê.",
      role_b: "Alguém toca a campainha às 23h. É seu parceiro. Eles não explicam nada. Abra a porta — e reaja como se tivesse esperado por isso o dia todo.",
    },
    es: {
      title: "Llamada de Madrugada",
      role_a: "Eres quien apareció a las 23h sin previo aviso. Di solo: 'Necesitaba verte.' Entra. No expliques por qué.",
      role_b: "Alguien llama a las 23h. Es tu pareja. No explica nada. Abre la puerta — y reacciona como si hubieras esperado esto todo el día.",
    },
  },
  hard: {
    ru: {
      title: "Допрос",
      role_a: "Ты — следователь. У тебя есть 15 минут, чтобы 'сломить' этого человека. Методы: взгляд, голос, приближение вплотную, команды. Слова — твоё оружие.",
      role_b: "Тебя 'допрашивают'. Твоя задача — держаться как можно дольше. Но правила игры ты устанавливаешь сам(а): что можно, что нельзя — скажи до начала.",
    },
    en: {
      title: "The Interrogation",
      role_a: "You're the interrogator. You have 15 minutes to 'break' this person. Tools: eye contact, voice, getting close, giving commands. Words are your weapon.",
      role_b: "You're being 'interrogated'. Your job: hold out as long as possible. But you set the rules: what's allowed and what isn't — say so before you begin.",
    },
    hi: {
      title: "पूछताछ",
      role_a: "आप जांचकर्ता हैं। 15 मिनट में इस व्यक्ति को 'तोड़ना' है। औजार: नज़र, आवाज़, करीब आना, आदेश देना।",
      role_b: "आपसे 'पूछताछ' हो रही है। जितना हो सके टिके रहें। लेकिन नियम आप तय करें: क्या ठीक है, क्या नहीं — शुरू से पहले बताएं।",
    },
    pt: {
      title: "O Interrogatório",
      role_a: "Você é o interrogador. Tem 15 minutos para 'quebrar' essa pessoa. Ferramentas: contato visual, voz, aproximação, dar ordens. Palavras são sua arma.",
      role_b: "Você está sendo 'interrogado'. Sua missão: aguentar o máximo possível. Mas você define as regras: o que é permitido e o que não é — diga antes de começar.",
    },
    es: {
      title: "El Interrogatorio",
      role_a: "Eres el interrogador. Tienes 15 minutos para 'quebrar' a esta persona. Herramientas: mirada, voz, acercarte, dar órdenes. Las palabras son tu arma.",
      role_b: "Te están 'interrogando'. Tu misión: aguantar el máximo posible. Pero tú estableces las reglas: qué está permitido y qué no — dilo antes de empezar.",
    },
  },
};

/* ── System prompts ────────────────────────────────────────────── */
const SYSTEM_PROMPTS: Record<string, (intensity: string) => string> = {
  ru: (_intensity) => `Ты создаёшь захватывающие ролевые сценарии для пар (18+).

Принципы хорошего сценария:
- Конкретная ситуация с понятным контекстом (не абстракция, а место/время/обстоятельства)
- Две роли, которые создают естественное напряжение между собой
- Каждая роль содержит: кто ты, твоя задача, одно конкретное правило или ограничение
- Напряжение строится через ситуацию, а не через инструкции "будь сексуальным"
- Роли должны быть интересны сами по себе — как актёрская задача

Уровни интенсивности:
- romantic: игривое, чувственное, намёки без откровенности — флирт, соблазнение, интрига
- passion: чувственно-эротично, физический контакт, откровенные намёки (18+)
- hard: доминирование, подчинение, БДСМ-элементы, прямые команды (18+)

Каждая роль: 3–5 предложений. Пиши живо, как режиссёр актёру.
Верни ТОЛЬКО JSON: {"title":"Название сценария","role_a":"текст роли А","role_b":"текст роли Б"}`,

  en: (_intensity) => `You create compelling roleplay scenarios for adult couples (18+).

Principles of a great scenario:
- A specific situation with clear context (not abstract — a place, time, or circumstance)
- Two roles that create natural tension between them
- Each role contains: who you are, your objective, one specific rule or restriction
- Tension comes from the situation itself, not from instructions to "be sexy"
- Roles should be interesting on their own — like an acting challenge

Intensity levels:
- romantic: playful, sensual, hints without explicitness — flirt, seduction, intrigue
- passion: sensual-erotic, physical contact, explicit hints (18+)
- hard: dominance, submission, BDSM elements, direct commands (18+)

Each role: 3–5 sentences. Write vividly, like a director briefing an actor.
Return ONLY JSON: {"title":"Scenario title","role_a":"role A text","role_b":"role B text"}`,

  hi: (_intensity) => `You create compelling roleplay scenarios for adult couples (18+).
IMPORTANT: Write ALL output in Hindi (हिंदी) using Devanagari script.

Principles: specific situation, two roles with natural tension, each role has: who you are, your objective, one rule.
Intensity:
- romantic: playful flirtation, seduction
- passion: sensual, physical, explicit hints (18+)  
- hard: dominance, submission, direct commands (18+)

Each role: 3–5 sentences. Return ONLY JSON: {"title":"...","role_a":"...","role_b":"..."}`,

  pt: (_intensity) => `Você cria cenários de roleplay envolventes para casais adultos (18+).
IMPORTANTE: Escreva TODA a saída em Português Brasileiro.

Princípios: situação específica com contexto claro, dois papéis com tensão natural, cada papel tem: quem você é, seu objetivo, uma regra específica.
Intensidade:
- romantic: flerte, sedução, intriga sem explícito
- passion: sensual-erótico, contato físico, insinuações explícitas (18+)
- hard: dominância, submissão, BDSM, comandos diretos (18+)

Cada papel: 3–5 frases. Retorne APENAS JSON: {"title":"...","role_a":"...","role_b":"..."}`,

  es: (_intensity) => `Creas escenarios de roleplay cautivadores para parejas adultas (18+).
IMPORTANTE: Escribe TODA la salida en Español.

Principios: situación específica con contexto claro, dos roles con tensión natural, cada rol tiene: quién eres, tu objetivo, una regla específica.
Intensidad:
- romantic: coqueteo, seducción, intriga sin explícito
- passion: sensual-erótico, contacto físico, insinuaciones explícitas (18+)
- hard: dominancia, sumisión, BDSM, comandos directos (18+)

Cada rol: 3–5 frases. Devuelve SOLO JSON: {"title":"...","role_a":"...","role_b":"..."}`,
};

/* ── User prompt ───────────────────────────────────────────────── */
function userPrompt(lang: string, intensity: string): string {
  const intensityMap: Record<string, Record<string, string>> = {
    ru: { romantic: "романтика", passion: "страсть", hard: "жёстко" },
    hi: { romantic: "रोमांटिक", passion: "जुनून", hard: "साहसिक" },
    pt: { romantic: "romântico", passion: "paixão", hard: "intenso" },
    es: { romantic: "romántico", passion: "pasión", hard: "intenso" },
  };
  const label = intensityMap[lang]?.[intensity] ?? intensity;

  if (lang === "ru") return `Придумай оригинальный сценарий уровня «${label}». Ситуация должна быть нестандартной и неожиданной. Верни ТОЛЬКО JSON.`;
  if (lang === "hi") return `"${label}" स्तर का एक मूल दृश्य बनाएं। स्थिति अप्रत्याशित हो। केवल JSON।`;
  if (lang === "pt") return `Crie um cenário original de nível "${label}". A situação deve ser inesperada. Apenas JSON.`;
  if (lang === "es") return `Crea un escenario original de nivel "${label}". La situación debe ser inesperada. Solo JSON.`;
  return `Create an original "${intensity}" level scenario. Make the situation unexpected and specific. Return ONLY JSON.`;
}

/* ── Notify partner ────────────────────────────────────────────── */
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
        max_tokens: 500,
        temperature: 1.1,
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
