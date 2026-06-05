// api/tasks/generate.ts
// POST /api/tasks/generate
// Body: { category: string, lang: "ru"|"en"|"hi"|"pt"|"es" }
// Headers: x-telegram-init-data
// Returns: { task: string }

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { validateTelegramInitData } from "../couple/_auth.js";

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY!;
const DEEPSEEK_URL = "https://api.deepseek.com/v1/chat/completions";

const FALLBACKS: Record<string, Record<string, string[]>> = {
  compliments: {
    ru: [
      "Посмотри партнёру в глаза и скажи конкретно: что именно в его характере восхищает тебя больше всего — не внешность, а поступок или черта.",
      "Напиши ему сообщение: опиши один момент за последнюю неделю, когда ты почувствовал(-а) гордость за него.",
      "Скажи вслух три комплимента — каждый должен начинаться с «Когда ты...» и заканчиваться тем, как это влияет на тебя.",
    ],
    en: [
      "Look your partner in the eyes and tell them one specific thing about their character that you truly admire — not appearance, but a quality or action.",
      "Send them a message describing one moment from this past week when you felt proud of them.",
      "Say three compliments out loud, each starting with 'When you...' and ending with how it makes you feel.",
    ],
    hi: ["अपने साथी की आंखों में देखें और उनके एक गुण के बारे में बताएं।", "उन्हें एक संदेश भेजें: पिछले सप्ताह का एक पल बताएं।", "तीन तारीफ जोर से बोलें — हर एक 'जब तुम...' से शुरू हो।"],
    pt: ["Olhe nos olhos do seu parceiro e diga uma coisa específica sobre o caráter dele.", "Envie uma mensagem descrevendo um momento desta semana em que você se sentiu orgulhoso.", "Diga três elogios em voz alta, cada um começando com 'Quando você...'"],
    es: ["Mira a los ojos de tu pareja y dile una cosa específica de su carácter.", "Envíale un mensaje describiendo un momento de esta semana.", "Di tres cumplidos en voz alta, cada uno comenzando con 'Cuando tú...'"],
  },
  tenderness: {
    ru: [
      "Попроси партнёра лечь и помассируй ему голову и виски — медленно, кончиками пальцев — ровно пять минут. Без слов.",
      "Обними его сзади и синхронизируйте дыхание: вдох вместе, выдох вместе — три минуты.",
      "Медленно поцелуй партнёра три раза: лоб, щека, губы — каждый поцелуй держи три секунды.",
    ],
    en: [
      "Ask your partner to lie down and massage their scalp and temples — slowly, with your fingertips — for exactly five minutes. No words.",
      "Hold them from behind and synchronize your breathing: inhale together, exhale together — three minutes.",
      "Slowly kiss your partner three times: forehead, cheek, lips — hold each kiss for three seconds.",
    ],
    hi: ["साथी को लेटने के लिए कहें और धीरे-धीरे सिर की मालिश करें।", "उन्हें पीछे से गले लगाएं और सांस मिलाएं।", "धीरे-धीरे तीन बार चूमें: माथा, गाल, होंठ।"],
    pt: ["Peça ao seu parceiro para deitar e massageie o couro cabeludo — devagar — por cinco minutos.", "Abrace-o por trás e sincronize a respiração.", "Beije seu parceiro lentamente três vezes: testa, bochecha, lábios."],
    es: ["Pídele a tu pareja que se recueste y masajea su cuero cabeludo — despacio.", "Abrázalo por detrás y sincronicen la respiración.", "Besa lentamente a tu pareja tres veces: frente, mejilla, labios."],
  },
  desire: {
    ru: [
      "Подойди к партнёру сзади, прошепчи на ухо одно предложение о том, что ты хочешь сделать с ним этим вечером — и уйди.",
      "Пошли ему одно сообщение без объяснений: опиши, что именно ты хочешь снять с него первым.",
      "Укуси партнёра за мочку уха — легко — и посмотри в глаза. Ни слова.",
    ],
    en: [
      "Walk up behind your partner, whisper one sentence about what you want to do with them tonight — then walk away.",
      "Send them one message, no explanation: describe what you want to take off them first.",
      "Gently bite your partner's earlobe — softly — then look them in the eyes. Not a word.",
    ],
    hi: ["साथी के पीछे जाएं, कान में एक वाक्य फुसफुसाएं — और चले जाएं।", "उन्हें एक संदेश भेजें: आप पहले क्या उतारना चाहते हैं।", "कान की लौ को हल्के से काटें — और आंखों में देखें।"],
    pt: ["Aproxime-se pelo lado de trás, sussurre uma frase sobre o que você quer fazer — depois se afaste.", "Envie uma mensagem sem explicação: descreva o que você quer tirar primeiro.", "Morda levemente o lóbulo da orelha — depois olhe nos olhos."],
    es: ["Acércate por detrás, susúrrale una frase sobre lo que quieres hacer — luego aléjate.", "Envíale un mensaje sin explicación.", "Muerde suavemente el lóbulo de la oreja — luego mírala a los ojos."],
  },
  passion: {
    ru: [
      "Поцелуй партнёра без предупреждения — медленно и глубоко — и скажи вслух, что именно в его теле заводит тебя прямо сейчас.",
      "Возьми его руку и положи туда, где ты хочешь чувствовать прикосновение. Смотри в глаза, не отрывайся.",
      "Ляг сверху и двигайся медленно — без спешки. Только глаза в глаза.",
    ],
    en: [
      "Kiss your partner without warning — slowly and deeply — then say out loud exactly what about their body turns you on right now.",
      "Take their hand and place it where you want to feel their touch. Hold eye contact.",
      "Lie on top and move slowly — no rush. Eyes only on each other.",
    ],
    hi: ["बिना चेतावनी के साथी को चूमें — धीरे और गहरे।", "उनका हाथ लें और वहां रखें जहां स्पर्श महसूस करना है।", "ऊपर लेटें और धीरे-धीरे हिलें।"],
    pt: ["Beije seu parceiro sem aviso — lentamente e profundamente.", "Pegue a mão dele e coloque onde você quer sentir o toque.", "Deite por cima e mova-se devagar."],
    es: ["Besa a tu pareja sin aviso — lenta y profundamente.", "Toma su mano y ponla donde quieres sentir su toque.", "Recuéstate encima y muévete lentamente."],
  },
  hard: {
    ru: [
      "Скажи партнёру, какую позу ты хочешь прямо сейчас — и объясни, почему именно она. Подробно.",
      "Возьми полный контроль: командуй позой, скоростью, расстоянием. Он выполняет. Ты решаешь.",
      "Прикажи партнёру раздеться медленно — пока ты смотришь — и не позволяй ему прикасаться к тебе, пока ты сам(-а) не разрешишь.",
    ],
    en: [
      "Tell your partner which position you want right now — and explain exactly why. In detail.",
      "Take full control: command the position, speed, distance. They obey. You decide.",
      "Order your partner to undress slowly — while you watch — and don't let them touch you until you give permission.",
    ],
    hi: ["साथी को बताएं कि आप अभी कौन सी स्थिति चाहते हैं — और कारण बताएं।", "पूरा नियंत्रण लें।", "साथी को धीरे-धीरे कपड़े उतारने का आदेश दें।"],
    pt: ["Diga ao seu parceiro qual posição você quer agora — e explique exatamente por quê.", "Assuma o controle total.", "Ordene ao seu parceiro que se dispa devagar."],
    es: ["Dile a tu pareja qué posición quieres ahora mismo — y explica por qué.", "Toma el control total.", "Ordena a tu pareja que se desvista lentamente."],
  },
};

// ── Sexologist-psychologist persona ──────────────────────────────
const PERSONA_RU = `Ты — доктор Соня, сертифицированный сексолог-психолог с 15-летней клинической практикой. Ты создаёшь задания для пар с психологической глубиной: они помогают преодолеть рутину, углубить близость и разжечь интерес. Твои задания всегда конкретные, неожиданные и психологически продуманные. Никогда банальные.`;

const PERSONA_EN = `You are Dr. Sofia — a certified sex therapist and couples psychologist with 15 years of clinical practice. You design intimacy tasks that are psychologically grounded, specific, and slightly unexpected — helping couples break routine and deepen connection. Your tasks draw from somatic therapy, sensate focus, and erotic psychology. Never generic.`;

const SYSTEM_PROMPTS: Record<string, Record<string, string>> = {
  compliments: {
    ru: `${PERSONA_RU}

Категория: Комплименты. Задание — конкретный, живой комплимент или признание: упомяни реальный поступок, черту характера или момент — не внешность. Формат: прямое указание партнёру. Максимум 2 предложения. Никаких банальностей типа «ты красивый».`,
    en: `${PERSONA_EN}

Category: Compliments. The task is a specific, vivid compliment or acknowledgment: mention a real action, character trait, or moment — not appearance. Format: direct instruction to the partner. Max 2 sentences. No clichés.`,
    hi: `${PERSONA_EN}\nCategory: Compliments. Write ONE specific task in Hindi (हिंदी). Max 2 sentences. Direct instruction.`,
    pt: `${PERSONA_EN}\nCategoria: Elogios. Tarefa específica e viva. Máx 2 frases. Instrução direta em Português.`,
    es: `${PERSONA_EN}\nCategoría: Cumplidos. Tarea específica y vívida. Máx 2 frases. Instrucción directa en Español.`,
  },
  tenderness: {
    ru: `${PERSONA_RU}

Категория: Нежность. Задание — конкретное тактильное действие: прикосновение, поцелуй, объятие. Укажи куда, как и сколько времени. Без эротики, но чувственно. Максимум 2 предложения. Прямое указание.`,
    en: `${PERSONA_EN}

Category: Tenderness. The task is a specific tactile action: touch, kiss, or embrace. State where, how, and for how long. Sensual but not explicit. Max 2 sentences. Direct instruction.`,
    hi: `${PERSONA_EN}\nCategory: Tenderness. ONE specific tactile task in Hindi. Max 2 sentences.`,
    pt: `${PERSONA_EN}\nCategoria: Ternura. Tarefa tátil específica. Máx 2 frases. Instrução direta em Português.`,
    es: `${PERSONA_EN}\nCategoría: Ternura. Tarea táctil específica. Máx 2 frases. Instrucción en Español.`,
  },
  desire: {
    ru: `${PERSONA_RU}

Категория: Желание (18+). Задание — эротическая прелюдия с психологическим напряжением: шёпот, взгляд, лёгкое прикосновение, намёк. НЕ секс — только предвкушение и желание. Максимум 2 предложения. Прямое указание. Неожиданно.`,
    en: `${PERSONA_EN}

Category: Desire (18+). The task is erotic foreplay with psychological tension: whisper, eye contact, light touch, teasing hint. NOT sex — just anticipation and desire. Unexpected. Max 2 sentences. Direct instruction.`,
    hi: `${PERSONA_EN}\nCategory: Desire (18+). Erotic prelude task in Hindi. Max 2 sentences.`,
    pt: `${PERSONA_EN}\nCategoria: Desejo (18+). Prelúdio erótico. Máx 2 frases. Instrução em Português.`,
    es: `${PERSONA_EN}\nCategoría: Deseo (18+). Preludio erótico. Máx 2 frases. Instrucción en Español.`,
  },
  passion: {
    ru: `${PERSONA_RU}

Категория: Страсть (18+). Задание — конкретное действие во время секса: поза, движение, взгляд, слова. Чувственно и прямо, без эвфемизмов. Психологически богато. Максимум 2 предложения.`,
    en: `${PERSONA_EN}

Category: Passion (18+). The task is a specific sexual action: position, movement, eye contact, or words spoken during sex. Sensual and direct — no euphemisms. Psychologically rich. Max 2 sentences.`,
    hi: `${PERSONA_EN}\nCategory: Passion (18+). Specific sexual action task in Hindi. Max 2 sentences.`,
    pt: `${PERSONA_EN}\nCategoria: Paixão (18+). Ação sexual específica. Máx 2 frases. Português.`,
    es: `${PERSONA_EN}\nCategoría: Pasión (18+). Acción sexual específica. Máx 2 frases. Español.`,
  },
  hard: {
    ru: `${PERSONA_RU}

Категория: Хард (18+). Задание — откровенное действие с элементами контроля: доминирование, команды, медленное раздевание, ограничения движений, психологическое подчинение. Конкретно, без цензуры, прямо. Максимум 2 предложения.`,
    en: `${PERSONA_EN}

Category: Hard (18+). The task involves control dynamics: dominance, commands, slow undressing, restraint, psychological submission. Specific, direct, no censorship. Max 2 sentences.`,
    hi: `${PERSONA_EN}\nCategory: Hard (18+). Dominant control task in Hindi. Max 2 sentences.`,
    pt: `${PERSONA_EN}\nCategoria: Intenso (18+). Tarefa de dominância e controle. Máx 2 frases. Português.`,
    es: `${PERSONA_EN}\nCategoría: Intenso (18+). Tarea de dominancia y control. Máx 2 frases. Español.`,
  },
};

function userMsg(lang: string): string {
  if (lang === "ru") return "Придумай одно оригинальное, неожиданное задание. Только само задание — без объяснений, заголовков и кавычек.";
  if (lang === "hi") return "एक मूल, अप्रत्याशित कार्य बनाएं। केवल कार्य।";
  if (lang === "pt") return "Crie uma tarefa original e inesperada. Apenas a tarefa, sem explicações.";
  if (lang === "es") return "Crea una tarea original e inesperada. Solo la tarea, sin explicaciones.";
  return "Create one original, unexpected task. Just the task itself — no explanations, no quotes, no headers.";
}

function pickFallback(category: string, lang: string): string {
  const pool = FALLBACKS[category]?.[lang] ?? FALLBACKS[category]?.["en"] ?? ["Hold your partner close for one full minute. No phones."];
  return pool[Math.floor(Math.random() * pool.length)];
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "https://t.me");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-telegram-init-data");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const initData = req.headers["x-telegram-init-data"] as string;
  const caller = validateTelegramInitData(initData, process.env.BOT_TOKEN!);
  if (!caller) return res.status(401).json({ error: "Unauthorized" });

  const { category, lang = "ru" } = req.body as { category: string; lang?: string };
  if (!category) return res.status(400).json({ error: "category required" });

  const systemPrompt = SYSTEM_PROMPTS[category]?.[lang] ?? SYSTEM_PROMPTS[category]?.["en"];
  if (!systemPrompt || !DEEPSEEK_API_KEY) {
    return res.status(200).json({ task: pickFallback(category, lang), source: "fallback" });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);

    const response = await fetch(DEEPSEEK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${DEEPSEEK_API_KEY}` },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user",   content: userMsg(lang) },
        ],
        max_tokens: 160,
        temperature: 1.25,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);
    if (!response.ok) return res.status(200).json({ task: pickFallback(category, lang), source: "fallback" });

    const data = await response.json();
    const task = (data.choices?.[0]?.message?.content ?? "").trim();
    if (!task) return res.status(200).json({ task: pickFallback(category, lang), source: "fallback" });

    return res.status(200).json({ task, source: "ai" });
  } catch {
    return res.status(200).json({ task: pickFallback(category, lang), source: "fallback" });
  }
}
