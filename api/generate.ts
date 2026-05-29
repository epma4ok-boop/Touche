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
    ru: ["Посмотри партнёру в глаза и назови три вещи, которые ты в нём боготворишь — и будь конкретным.", "Напиши ему сообщение о том, какой момент с ним ты помнишь лучше всего.", "Скажи вслух, что именно в его характере делает тебя лучше."],
    en: ["Look into your partner's eyes and name three things you adore about them — be specific.", "Send them a message about your most treasured memory together.", "Tell them out loud exactly what quality of theirs makes you a better person."],
    hi: ["अपने साथी की आंखों में देखें और तीन चीजें बताएं जो आप उनमें पूजते हैं — विशिष्ट रहें।", "उन्हें एक संदेश भेजें अपनी सबसे प्रिय यादों के बारे में।", "ज़ोर से बताएं कि उनकी कौन सी विशेषता आपको बेहतर इंसान बनाती है।"],
    pt: ["Olhe nos olhos do seu parceiro e nomeie três coisas que você adora nele — seja específico.", "Envie uma mensagem sobre sua memória mais preciosa juntos.", "Diga em voz alta exatamente qual qualidade dele faz de você uma pessoa melhor."],
    es: ["Mira a los ojos de tu pareja y nombra tres cosas que adoras de ella — sé específico.", "Envíale un mensaje sobre tu recuerdo más preciado juntos.", "Di en voz alta exactamente qué cualidad suya te hace mejor persona."],
  },
  tenderness: {
    ru: ["Помассируй партнёру руки в течение пяти минут, не говоря ни слова.", "Обними его сзади и просто подышите вместе — три минуты тишины.", "Медленно проведи кончиками пальцев по его лицу, как будто рисуешь."],
    en: ["Massage your partner's hands for five minutes without a word.", "Hold them from behind and just breathe together for three minutes.", "Slowly trace their face with your fingertips as if you're drawing."],
    hi: ["पांच मिनट तक बिना कुछ बोले अपने साथी के हाथों की मालिश करें।", "उन्हें पीछे से गले लगाएं और तीन मिनट साथ सांस लें।", "धीरे-धीरे उंगलियों से उनके चेहरे को ऐसे छुएं जैसे चित्र बना रहे हों।"],
    pt: ["Massageie as mãos do seu parceiro por cinco minutos sem dizer uma palavra.", "Abrace-o por trás e apenas respirem juntos por três minutos.", "Trace lentamente o rosto dele com as pontas dos dedos como se estivesse desenhando."],
    es: ["Masajea las manos de tu pareja durante cinco minutos sin decir una palabra.", "Abrázala por detrás y simplemente respiren juntos durante tres minutos.", "Traza lentamente su rostro con las yemas de los dedos como si estuvieras dibujando."],
  },
  desire: {
    ru: ["Напиши ему одно предложение — что ты хочешь с ним сделать сегодня вечером. Только намёком.", "Посмотри на него так, чтобы он почувствовал это через всю комнату.", "Шепни ему на ухо что-нибудь такое, от чего у него участится пульс."],
    en: ["Write them one sentence — what you want to do with them tonight. Just a hint.", "Look at them across the room so they feel it.", "Whisper something in their ear that makes their pulse quicken."],
    hi: ["उन्हें एक वाक्य लिखें — आप आज रात उनके साथ क्या करना चाहते हैं। बस एक संकेत।", "उन्हें कमरे के पार ऐसे देखें कि वे महसूस करें।", "उनके कान में कुछ ऐसा फुसफुसाएं जिससे उनकी धड़कन तेज़ हो जाए।"],
    pt: ["Escreva uma frase para ele — o que você quer fazer com ele esta noite. Apenas uma dica.", "Olhe para ele do outro lado da sala de um jeito que ele sinta.", "Sussurre algo no ouvido dele que acelere o seu pulso."],
    es: ["Escríbele una frase — lo que quieres hacer con él esta noche. Solo una insinuación.", "Míralo desde el otro lado de la habitación de manera que lo sienta.", "Susúrrale algo al oído que le acelere el pulso."],
  },
  passion: {
    ru: ["Поцелуй партнёра так, как будто вы не виделись месяц — без предупреждения.", "Скажи ему прямо, что именно в его теле сводит тебя с ума.", "Возьми его руку и положи туда, где ты хочешь почувствовать его прикосновение."],
    en: ["Kiss your partner like you haven't seen them in a month — without warning.", "Tell them directly what exactly about their body drives you crazy.", "Take their hand and place it where you want to feel their touch."],
    hi: ["अपने साथी को ऐसे चूमें जैसे आप एक महीने से नहीं मिले — बिना चेतावनी के।", "उन्हें सीधे बताएं कि उनके शरीर की कौन सी बात आपको पागल करती है।", "उनका हाथ लें और वहां रखें जहां आप उनका स्पर्श महसूस करना चाहते हैं।"],
    pt: ["Beije seu parceiro como se não o visse há um mês — sem aviso.", "Diga diretamente o que exatamente no corpo dele te enlouquece.", "Pegue a mão dele e coloque onde você quer sentir o toque dele."],
    es: ["Besa a tu pareja como si no la hubieras visto en un mes — sin previo aviso.", "Dile directamente qué exactamente de su cuerpo te vuelve loco.", "Toma su mano y ponla donde quieres sentir su toque."],
  },
  hard: {
    ru: ["Расскажи партнёру свою самую смелую фантазию — подробно и без стеснения.", "Выбери одно желание из списка того, что ты всегда хотел попробовать, и предложи сделать это сегодня.", "Возьми на себя полный контроль на следующие десять минут — и не спрашивай разрешения."],
    en: ["Tell your partner your boldest fantasy — in detail, without holding back.", "Pick one thing you've always wanted to try and propose doing it tonight.", "Take full control for the next ten minutes — and don't ask for permission."],
    hi: ["अपने साथी को अपनी सबसे साहसी कल्पना बताएं — विस्तार से, बिना झिझके।", "एक चीज़ चुनें जो आप हमेशा आज़माना चाहते थे और आज रात करने का प्रस्ताव दें।", "अगले दस मिनट के लिए पूर्ण नियंत्रण लें — और अनुमति न मांगें।"],
    pt: ["Conte ao seu parceiro sua fantasia mais ousada — em detalhes, sem hesitar.", "Escolha uma coisa que sempre quis experimentar e proponha fazer esta noite.", "Assuma o controle total pelos próximos dez minutos — e não peça permissão."],
    es: ["Cuéntale a tu pareja tu fantasía más atrevida — en detalle, sin reservas.", "Elige algo que siempre hayas querido probar y propón hacerlo esta noche.", "Toma el control total durante los próximos diez minutos — y no pidas permiso."],
  },
};

const SYSTEM_PROMPTS: Record<string, Record<string, string>> = {
  compliments: {
    ru: `Ты создаёшь романтические задания для пар. Придумай ОДНО конкретное задание-комплимент. Правила: будь конкретным и поэтичным, говори о внутренних качествах или конкретном поступке, максимум 2 предложения, никаких банальностей. Пиши как прямое указание.`,
    en: `You create romantic tasks for couples. Write ONE specific compliment-task. Rules: be specific and poetic, reference inner qualities or a specific thing they do, max 2 sentences, no clichés. Write as a direct instruction.`,
    hi: `You create romantic tasks for couples. Write ONE specific compliment-task in Hindi (हिंदी). Max 2 sentences. Be specific and poetic. Write as a direct instruction in Hindi.`,
    pt: `Você cria tarefas românticas para casais. Escreva UMA tarefa-elogio específica em Português Brasileiro. Máx 2 frases. Seja específico e poético. Escreva como instrução direta.`,
    es: `Creas tareas románticas para parejas. Escribe UNA tarea-piropo específica en Español. Máx 2 frases. Sé específico y poético. Escribe como instrucción directa.`,
  },
  tenderness: {
    ru: `Ты создаёшь интимные задания для пар — нежные, тактильные, без пошлости. Придумай ОДНО задание про прикосновение или объятие. Максимум 2 предложения. Пиши как прямое указание.`,
    en: `You create intimate couple tasks — tender, tactile, non-explicit. Write ONE task about touch or embrace. Max 2 sentences. Write as a direct instruction.`,
    hi: `You create tender intimate tasks for couples. Write ONE task about touch or embrace in Hindi (हिंदी). Max 2 sentences. Write as a direct instruction in Hindi.`,
    pt: `Você cria tarefas íntimas para casais — ternura, táteis. Escreva UMA tarefa sobre toque ou abraço em Português Brasileiro. Máx 2 frases. Instrução direta.`,
    es: `Creas tareas íntimas para parejas — ternura, táctiles. Escribe UNA tarea sobre toque o abrazo en Español. Máx 2 frases. Instrucción directa.`,
  },
  desire: {
    ru: `Ты создаёшь флиртующие задания для пар — чувственные, дразнящие. Придумай ОДНО задание, которое создаёт напряжение и желание. Намёк, взгляд, шёпот. Максимум 2 предложения.`,
    en: `You create flirtatious couple tasks — sensual, teasing. Write ONE task that creates tension and desire. A glance, whisper, hint. Max 2 sentences. Write as direct instruction.`,
    hi: `You create flirtatious tasks for couples. Write ONE teasing task in Hindi (हिंदी) — a glance, whisper, or hint that creates desire. Max 2 sentences. Direct instruction.`,
    pt: `Você cria tarefas sedutoras para casais. Escreva UMA tarefa em Português Brasileiro que crie tensão e desejo — um olhar, sussurro ou insinuação. Máx 2 frases.`,
    es: `Creas tareas seductoras para parejas. Escribe UNA tarea en Español que cree tensión y deseo — una mirada, susurro o insinuación. Máx 2 frases.`,
  },
  passion: {
    ru: `Ты создаёшь страстные задания для взрослых пар (18+). Задания смелые, прямые, физически заряженные. ОДНО задание, максимум 2 предложения. Пиши как прямое указание.`,
    en: `You create passionate tasks for adult couples (18+). Bold, direct, physically charged. ONE task, max 2 sentences. Direct instruction. Legal adult content.`,
    hi: `You create passionate tasks for adult couples (18+). Write ONE bold, direct task in Hindi (हिंदी). Max 2 sentences. Direct instruction. Legal adult content.`,
    pt: `Você cria tarefas apaixonadas para casais adultos (18+). Escreva UMA tarefa ousada em Português Brasileiro. Máx 2 frases. Instrução direta. Conteúdo adulto legal.`,
    es: `Creas tareas apasionadas para parejas adultas (18+). Escribe UNA tarea atrevida en Español. Máx 2 frases. Instrucción directa. Contenido adulto legal.`,
  },
  hard: {
    ru: `Ты создаёшь смелые эротические задания для пар (18+). Контент откровенный, без цензуры. ОДНО задание, максимум 2 предложения. Пиши как прямое указание.`,
    en: `You create explicit intimate tasks for couples (18+). Direct, bold, uncensored. ONE task, max 2 sentences. Direct instruction. Legal adult content.`,
    hi: `You create explicit intimate tasks for couples (18+). Write ONE bold uncensored task in Hindi (हिंदी). Max 2 sentences. Direct instruction. Legal adult content.`,
    pt: `Você cria tarefas íntimas explícitas para casais (18+). Escreva UMA tarefa ousada em Português Brasileiro. Máx 2 frases. Instrução direta. Conteúdo adulto legal.`,
    es: `Creas tareas íntimas explícitas para parejas (18+). Escribe UNA tarea atrevida en Español. Máx 2 frases. Instrucción directa. Contenido adulto legal.`,
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
        max_tokens: 120,
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
