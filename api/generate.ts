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
      "Look your partner in the eyes and tell them one specific thing about their character — not their appearance, but a quality or action — that you truly admire.",
      "Send them a message describing one moment from this past week when you felt proud of them.",
      "Say three compliments out loud, each starting with 'When you...' and ending with how it makes you feel.",
    ],
    hi: ["अपने साथी की आंखों में देखें और उनके एक विशेष गुण के बारे में बताएं — दिखावट नहीं, बल्कि एक कार्य या विशेषता जो आपको सच में प्रभावित करती है।", "उन्हें एक संदेश भेजें: पिछले सप्ताह का एक पल बताएं जब आपको उन पर गर्व महसूस हुआ।", "तीन तारीफ जोर से बोलें — हर एक 'जब तुम...' से शुरू हो और यह बताएं कि यह आप पर क्या असर डालता है।"],
    pt: ["Olhe nos olhos do seu parceiro e diga uma coisa específica sobre o caráter dele — não a aparência, mas uma qualidade ou ação — que você genuinamente admira.", "Envie uma mensagem descrevendo um momento desta semana em que você se sentiu orgulhoso dele.", "Diga três elogios em voz alta, cada um começando com 'Quando você...' e terminando com como isso te faz sentir."],
    es: ["Mira a los ojos de tu pareja y dile una cosa específica de su carácter — no su apariencia, sino una cualidad o acción — que genuinamente admiras.", "Envíale un mensaje describiendo un momento de esta semana en que te sentiste orgulloso de él.", "Di tres cumplidos en voz alta, cada uno comenzando con 'Cuando tú...' y terminando con cómo te hace sentir."],
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
    hi: ["साथी को लेटने के लिए कहें और धीरे-धीरे उनके सिर और कनपटी की मालिश करें — उंगलियों से — पूरे पांच मिनट। बिना कुछ बोले।", "उन्हें पीछे से गले लगाएं और सांस मिलाएं: साथ में लें, साथ में छोड़ें — तीन मिनट।", "धीरे-धीरे तीन बार चूमें: माथा, गाल, होंठ — हर चुंबन तीन सेकंड रोकें।"],
    pt: ["Peça ao seu parceiro para deitar e massageie o couro cabeludo e as têmporas — devagar, com as pontas dos dedos — por exatamente cinco minutos. Sem palavras.", "Abrace-o por trás e sincronize a respiração: inspire juntos, expire juntos — três minutos.", "Beije seu parceiro lentamente três vezes: testa, bochecha, lábios — segure cada beijo por três segundos."],
    es: ["Pídele a tu pareja que se recueste y masajea su cuero cabelludo y sienes — despacio, con las yemas de los dedos — exactamente cinco minutos. Sin palabras.", "Abrázalo por detrás y sincronicen la respiración: inhalen juntos, exhalen juntos — tres minutos.", "Besa lentamente a tu pareja tres veces: frente, mejilla, labios — sostén cada beso tres segundos."],
  },
  desire: {
    ru: [
      "Подойди к партнёру сзади, прошепчи на ухо одно предложение о том, что ты хочешь сделать с ним этим вечером — и уйди.",
      "Пошли ему одно сообщение без объяснений: опиши, что именно ты хочешь снять с него первым.",
      "Укуси партнёра за мочку уха — легко — и посмотри в глаза. Ни слова.",
    ],
    en: [
      "Walk up behind your partner, whisper one sentence about what you want to do with them tonight — then walk away.",
      "Send them one message, no explanation: describe exactly what you want to take off them first.",
      "Gently bite your partner's earlobe — softly — then look them in the eyes. Not a word.",
    ],
    hi: ["साथी के पीछे जाएं, कान में एक वाक्य फुसफुसाएं — आज रात आप उनके साथ क्या करना चाहते हैं — और चले जाएं।", "उन्हें एक संदेश भेजें, बिना स्पष्टीकरण: बताएं कि आप पहले क्या उतारना चाहते हैं।", "साथी के कान की लौ को हल्के से काटें — नरमी से — और आंखों में देखें। एक शब्द भी नहीं।"],
    pt: ["Aproxime-se pelo lado de trás do seu parceiro, sussurre uma frase sobre o que você quer fazer com ele esta noite — depois se afaste.", "Envie uma mensagem sem explicação: descreva exatamente o que você quer tirar dele primeiro.", "Morda levemente o lóbulo da orelha do seu parceiro — suavemente — depois olhe nos olhos dele. Nem uma palavra."],
    es: ["Acércate por detrás a tu pareja, susúrrale una frase sobre lo que quieres hacer con ella esta noche — luego aléjate.", "Envíale un mensaje sin explicación: describe exactamente qué quieres quitarle primero.", "Muerde suavemente el lóbulo de la oreja de tu pareja — con suavidad — luego mírala a los ojos. Ni una palabra."],
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
    hi: ["बिना चेतावनी के साथी को चूमें — धीरे और गहरे — फिर जोर से बताएं कि अभी उनके शरीर में क्या आपको उत्तेजित करता है।", "उनका हाथ लें और वहां रखें जहां आप स्पर्श महसूस करना चाहते हैं। आंखों में देखते रहें।", "ऊपर लेटें और धीरे-धीरे हिलें — कोई जल्दी नहीं। बस एक-दूसरे की आंखों में।"],
    pt: ["Beije seu parceiro sem aviso — lentamente e profundamente — depois diga em voz alta exatamente o que no corpo dele te excita agora.", "Pegue a mão dele e coloque onde você quer sentir o toque. Mantenha contato visual.", "Deite por cima e mova-se devagar — sem pressa. Olhos apenas um no outro."],
    es: ["Besa a tu pareja sin aviso — lenta y profundamente — luego di en voz alta exactamente qué de su cuerpo te excita ahora mismo.", "Toma su mano y ponla donde quieres sentir su toque. Mantén contacto visual.", "Recuéstate encima y muévete lentamente — sin prisa. Solo ojos en ojos."],
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
    hi: ["साथी को बताएं कि आप अभी कौन सी स्थिति चाहते हैं — और सटीक कारण बताएं। विस्तार से।", "पूरा नियंत्रण लें: स्थिति, गति, दूरी — आदेश दें। वे मानते हैं। आप तय करते हैं।", "साथी को धीरे-धीरे कपड़े उतारने का आदेश दें — जबकि आप देख रहे हों — और अनुमति दिए बिना छूने न दें।"],
    pt: ["Diga ao seu parceiro qual posição você quer agora — e explique exatamente por quê. Em detalhes.", "Assuma o controle total: comande a posição, velocidade, distância. Eles obedecem. Você decide.", "Ordene ao seu parceiro que se despi devagar — enquanto você assiste — e não deixe-o tocar em você até dar permissão."],
    es: ["Dile a tu pareja qué posición quieres ahora mismo — y explica exactamente por qué. En detalle.", "Toma el control total: ordena la posición, velocidad, distancia. Ellos obedecen. Tú decides.", "Ordena a tu pareja que se desvista lentamente — mientras miras — y no la dejes tocarte hasta que des permiso."],
  },
};

const SYSTEM_PROMPTS: Record<string, Record<string, string>> = {
  compliments: {
    ru: `Ты создаёшь романтические задания-комплименты для пар. Задание должно быть конкретным: упомяни реальную черту характера или поступок, не внешность. Максимум 2 предложения. Никаких банальностей типа «ты красивый». Пиши как прямое указание партнёру.`,
    en: `You create romantic compliment tasks for couples. The task must be specific: mention a real character trait or action, not appearance. Max 2 sentences. No clichés like "you're beautiful". Write as a direct instruction to the partner.`,
    hi: `You create romantic compliment tasks for couples. Write ONE specific task in Hindi (हिंदी) — mention a real character trait or action, not appearance. Max 2 sentences. No clichés. Direct instruction.`,
    pt: `Você cria tarefas-elogio românticas para casais. A tarefa deve ser específica: mencione uma característica de caráter real ou ação, não aparência. Máx 2 frases. Sem clichês. Instrução direta em Português.`,
    es: `Creas tareas-piropo románticas para parejas. La tarea debe ser específica: menciona un rasgo de carácter real o acción, no la apariencia. Máx 2 frases. Sin clichés. Instrucción directa en Español.`,
  },
  tenderness: {
    ru: `Ты создаёшь нежные тактильные задания для пар. Задание — конкретное прикосновение, поцелуй или объятие: укажи куда, как и сколько времени. Без эротики. Максимум 2 предложения. Прямое указание.`,
    en: `You create tender tactile tasks for couples. The task is a specific touch, kiss or embrace: state where, how, and for how long. No explicit content. Max 2 sentences. Direct instruction.`,
    hi: `You create tender tactile tasks for couples. Write ONE specific task in Hindi (हिंदी): a touch, kiss or embrace — state where, how, how long. No explicit content. Max 2 sentences. Direct instruction.`,
    pt: `Você cria tarefas táteis ternuras para casais. A tarefa é um toque, beijo ou abraço específico: diga onde, como e por quanto tempo. Sem conteúdo explícito. Máx 2 frases. Instrução direta em Português.`,
    es: `Creas tareas táctiles tiernas para parejas. La tarea es un toque, beso o abrazo específico: di dónde, cómo y por cuánto tiempo. Sin contenido explícito. Máx 2 frases. Instrucción directa en Español.`,
  },
  desire: {
    ru: `Ты создаёшь задания-прелюдию для пар (18+). Это эротическая прелюдия: раздевание, лёгкие укусы, шёпот на ухо, намёки. НЕ секс — только напряжение и желание. Максимум 2 предложения. Прямое указание.`,
    en: `You create erotic prelude tasks for couples (18+). This is foreplay tension: undressing, light biting, whispering, teasing hints. NOT sex — just tension and desire. Max 2 sentences. Direct instruction.`,
    hi: `You create erotic prelude tasks for couples (18+). This is foreplay tension in Hindi (हिंदी): undressing, light biting, whispering, teasing. NOT sex — just tension. Max 2 sentences. Direct instruction.`,
    pt: `Você cria tarefas de prelúdio erótico para casais (18+). É tensão de preliminares: despir, mordidas leves, sussurros, insinuações. NÃO sexo — só tensão e desejo. Máx 2 frases. Instrução direta em Português.`,
    es: `Creas tareas de preludio erótico para parejas (18+). Es tensión de juegos previos: desvestirse, mordidas suaves, susurros, insinuaciones. NO sexo — solo tensión y deseo. Máx 2 frases. Instrucción directa en Español.`,
  },
  passion: {
    ru: `Ты создаёшь задания о нежном сексе для взрослых пар (18+). Задание — конкретное действие во время секса: поза, движение, взгляд, слова. Чувственно и прямо, без эвфемизмов. Максимум 2 предложения.`,
    en: `You create tender sex tasks for adult couples (18+). The task is a specific sexual action: position, movement, eye contact, words spoken during sex. Sensual and direct, no euphemisms. Max 2 sentences.`,
    hi: `You create tender sex tasks for adult couples (18+). Write ONE specific task in Hindi (हिंदी): a sexual action, position, movement. Sensual and direct. Max 2 sentences. Legal adult content.`,
    pt: `Você cria tarefas de sexo terno para casais adultos (18+). A tarefa é uma ação sexual específica: posição, movimento, contato visual, palavras. Sensual e direto, sem eufemismos. Máx 2 frases em Português.`,
    es: `Creas tareas de sexo tierno para parejas adultas (18+). La tarea es una acción sexual específica: posición, movimiento, contacto visual, palabras. Sensual y directo, sin eufemismos. Máx 2 frases en Español.`,
  },
  hard: {
    ru: `Ты создаёшь откровенные эротические задания для пар (18+). Задание — конкретная поза или действие с элементами контроля: доминирование, команды, медленное раздевание, ограничения. Без цензуры, прямо. Максимум 2 предложения.`,
    en: `You create explicit erotic tasks for couples (18+). The task is a specific position or action with control elements: dominance, commands, slow undressing, restraint. No censorship, direct. Max 2 sentences. Legal adult content.`,
    hi: `You create explicit erotic tasks for couples (18+). Write ONE specific task in Hindi (हिंदी): a position or dominant action, commands, restraint. No censorship. Max 2 sentences. Legal adult content.`,
    pt: `Você cria tarefas eróticas explícitas para casais (18+). A tarefa é uma posição ou ação específica com elementos de controle: dominância, comandos, striptease lento, restrições. Sem censura. Máx 2 frases em Português.`,
    es: `Creas tarefas eróticas explícitas para parejas (18+). La tarea es una posición o acción específica con elementos de control: dominancia, órdenes, striptease lento, restricciones. Sin censura. Máx 2 frases en Español.`,
  },
};

function userMsg(lang: string): string {
  if (lang === "ru") return "Придумай одно оригинальное задание. Только само задание, без объяснений и кавычек.";
  if (lang === "hi") return "एक मूल कार्य बनाएं। केवल कार्य, कोई स्पष्टीकरण नहीं।";
  if (lang === "pt") return "Crie uma tarefa original. Apenas a tarefa, sem explicações.";
  if (lang === "es") return "Crea una tarea original. Solo la tarea, sin explicaciones.";
  return "Create one original task. Just the task itself, no explanations or quotes.";
}

function pickFallback(category: string, lang: string): string {
  const pool = FALLBACKS[category]?.[lang] ?? FALLBACKS[category]?.["en"] ?? ["Hug your partner tight."];
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
    const timeout = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(DEEPSEEK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${DEEPSEEK_API_KEY}` },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user",   content: userMsg(lang) },
        ],
        max_tokens: 140,
        temperature: 1.1,
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
