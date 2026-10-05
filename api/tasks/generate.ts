// api/tasks/generate.ts
// POST /api/tasks/generate
// Body: { category, lang, gender? }

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { randomUUID } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { validateTelegramInitData } from "../couple/_auth.js";
import { appDate } from "../limits.js";
import { claimFriendInvite } from "../referrals/_claim.js";
import { getTaskQualityRules, isSharedTaskText, isTaskTextModeAppropriate, isTaskTextWellFormed } from "../../src/data/task-quality.js";
import { OWNER_TELEGRAM_ID } from "../../src/config.js";
import { TASKS_RU } from "../../src/data/tasks-ru.js";
import { TASKS_EN } from "../../src/data/tasks-en.js";
import { TASKS_HI } from "../../src/data/tasks-hi.js";
import { TASKS_PT } from "../../src/data/tasks-pt.js";
import { TASKS_ES } from "../../src/data/tasks-es.js";

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY!;
const DEEPSEEK_URL = "https://api.deepseek.com/v1/chat/completions";
const BOT_TOKEN = process.env.BOT_TOKEN;
const APP_URL = (process.env.APP_URL ?? "").replace(/\/$/, "");
const OWNER_ID = OWNER_TELEGRAM_ID;
const CATEGORIES = new Set(["compliments", "tenderness", "desire", "passion", "hard"]);
const PAID_CATEGORIES = new Set(["passion", "hard"]);
const LANGS = new Set(["ru", "en", "hi", "pt", "es"]);
const GENDERS = new Set(["male", "female"]);
const MODES = new Set(["solo", "together"] as const);
type TaskMode = "solo" | "together";
const MAX_TASK_CHARS = 280;
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

type StaticPool = Record<string, string[]>;
const SOURCE_TASKS: Record<string, StaticPool> = {
  ru: TASKS_RU,
  en: TASKS_EN,
  hi: TASKS_HI,
  pt: TASKS_PT,
  es: TASKS_ES,
};

async function notifyPartner(
  partnerUserId: number,
  coupleId: string,
  taskId: string,
  category: string,
  taskText: string,
  lang: string,
): Promise<boolean> {
  if (!BOT_TOKEN || !APP_URL) return false;
  const { data: preference, error: preferenceError } = await supabase
    .from("couple_member_preferences")
    .select("telegram_notifications_enabled")
    .eq("couple_id", coupleId)
    .eq("user_id", partnerUserId)
    .maybeSingle();
  if (preferenceError || preference?.telegram_notifications_enabled !== true) return false;
  const categoryLabels: Record<string, Record<string, string>> = {
    ru: { compliments: "Комплименты", tenderness: "Нежность", desire: "Желание", passion: "Страсть", hard: "Хард" },
    en: { compliments: "Compliments", tenderness: "Tenderness", desire: "Desire", passion: "Passion", hard: "Hard" },
    hi: { compliments: "तारीफ़", tenderness: "कोमलता", desire: "इच्छा", passion: "जुनून", hard: "हार्ड" },
    pt: { compliments: "Elogios", tenderness: "Carinho", desire: "Desejo", passion: "Paixão", hard: "Hard" },
    es: { compliments: "Cumplidos", tenderness: "Ternura", desire: "Deseo", passion: "Pasión", hard: "Hard" },
  };
  const messages: Record<string, { heading: string; footer: string; button: string }> = {
    ru: { heading: "Задание для вас двоих", footer: "Это же задание уже доступно вам обоим в Touché.", button: "Открыть задание" },
    en: { heading: "A task for both of you", footer: "The same task is waiting for both of you in Touché.", button: "Open shared task" },
    hi: { heading: "आप दोनों के लिए एक काम", footer: "यही काम Touché में आप दोनों के लिए उपलब्ध है।", button: "साझा काम खोलें" },
    pt: { heading: "Uma tarefa para vocês dois", footer: "A mesma tarefa já está disponível para ambos no Touché.", button: "Abrir tarefa compartilhada" },
    es: { heading: "Una tarea para los dos", footer: "La misma tarea ya está disponible para ambos en Touché.", button: "Abrir tarea compartida" },
  };
  const message = messages[lang] ?? messages.en;
  const categoryLabel = categoryLabels[lang]?.[category] ?? categoryLabels.en[category] ?? category;
  const escapeHtml = (value: string) => value
    .replace(/&/gu, "&amp;")
    .replace(/</gu, "&lt;")
    .replace(/>/gu, "&gt;")
    .replace(/"/gu, "&quot;");
  const formattedTask = [
    `✨ <b>TOUCHÉ</b>`,
    `<i>${escapeHtml(message.heading)} · ${escapeHtml(categoryLabel)}</i>`,
    "",
    `<blockquote>${escapeHtml(taskText)}</blockquote>`,
    `<i>${escapeHtml(message.footer)}</i>`,
  ].join("\n");
  let url: string;
  try {
    const target = new URL(APP_URL);
    target.searchParams.set("shared_task", taskId);
    url = target.toString();
  } catch {
    return false;
  }
  try {
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: partnerUserId,
        text: formattedTask,
        parse_mode: "HTML",
        reply_markup: { inline_keyboard: [[{ text: message.button, web_app: { url } }]] },
      }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

const DAILY_TASK_FALLBACKS: Record<string, StaticPool> = {
  ru: {
    compliments: [
      "В ближайшие сутки в свободные минуты отправляйте друг другу обычные селфи с короткими личными комплиментами; фотографии остаются только между вами.",
      "Вечером по очереди назовите друг другу одну черту, которой вы особенно дорожите, и вспомните конкретный момент, когда она проявилась.",
      "Каждый из вас напишите партнёру одну короткую благодарность за недавнюю мелочь, которую обычно не замечают.",
    ],
    tenderness: [
      "В ближайшие сутки обнимайтесь при встрече, а если будете врозь — отправьте друг другу по одному короткому тёплому голосовому сообщению.",
      "Когда окажетесь рядом, по очереди сделайте друг другу короткий массаж плеч, подстраивая прикосновения под реакцию партнёра.",
      "По очереди погладьте ладони друг друга и задержите руки вместе на несколько спокойных вдохов.",
    ],
    desire: [
      "В течение ближайших суток обменивайтесь короткими флиртующими сообщениями, а при встрече вместе остановитесь на одном долгом поцелуе.",
      "Когда останетесь вдвоём, по очереди прошепчите друг другу одну фразу о желании и ответьте на неё поцелуем поверх одежды.",
      "Обменяйтесь в течение дня парой игривых намёков, а вечером по очереди выберите, где оставить друг другу один нежный поцелуй.",
    ],
    passion: [
      "В течение дня обменяйтесь по одному чувственному намёку, а когда останетесь вдвоём, займитесь медленным сексом, меняя темп по реакции друг друга.",
      "Когда будете вместе, по очереди задавайте ритм поцелуям и ласкам; замечайте реакцию партнёра и сделайте одну выразительную паузу.",
      "Обменяйтесь коротким сообщением о желании, а затем вместе уделите время медленному сексу, меняя темп один раз по реакции друг друга.",
    ],
    hard: [
      "В течение дня обменяйтесь откровенными сообщениями о желании; при встрече по очереди задайте уверенный темп близости и меняйте его по реакции друг друга.",
      "Когда останетесь вдвоём, по очереди произнесите одну короткую властную просьбу и ответьте на неё откровенной лаской.",
      "Обменяйтесь одной прямой фразой о том, чего хотите, а затем вместе выберите интенсивный темп близости и держите его столько, сколько нравится обоим.",
    ],
  },
  en: {
    compliments: [
      "Over the next day, take turns sending each other ordinary private selfies with specific compliment captions; keep every photo between the two of you.",
      "Tonight, each of you name one small detail you appreciate about the other and share a real moment when it stood out.",
      "Both of you send the other a short thank-you for a recent everyday gesture that might otherwise go unnoticed.",
    ],
    tenderness: [
      "Whenever you meet over the next day, both of you share a brief hug; if apart, trade one warm voice note each.",
      "When you are together, take turns giving each other a short shoulder massage and follow the other's response.",
      "Take turns gently tracing a line across each other's palm, then hold hands for a few quiet breaths.",
    ],
    desire: [
      "Both of you trade a few flirty messages during the day, then pause at one lingering kiss when you meet.",
      "When alone together, take turns whispering one thing you want and answer each with a kiss over clothing.",
      "Exchange a couple of playful hints during the day, then both of you choose one place to leave each other a gentle kiss.",
    ],
    passion: [
      "Trade one sensual hint during the day, then enjoy slow sex together, changing pace in response to each other.",
      "When you are together, take turns setting the rhythm for kisses and caresses; notice each other's response and add one deliberate pause.",
      "Both of you share one brief message about desire, then enjoy slow sex together and change the rhythm once in response to each other.",
    ],
    hard: [
      "Trade direct messages about what you want during the day; when together, take turns setting a confident pace and adjusting to each other's response.",
      "When alone together, take turns making one brief, commanding request and answering it with an intimate caress.",
      "Both of you name one direct desire, then choose an intense pace together and keep it for as long as you both enjoy.",
    ],
  },
  hi: {
    compliments: [
      "अगले दिन खाली समय में आप दोनों एक-दूसरे को साधारण निजी सेल्फ़ी के साथ खास तारीफ़ भेजें; तस्वीरें केवल आप दोनों के बीच रहें।",
      "आज शाम बारी-बारी से एक-दूसरे की वह छोटी बात बताएं जिसकी आप सबसे ज़्यादा कद्र करते हैं, और उससे जुड़ा एक सच्चा पल याद करें।",
      "आप दोनों हाल की किसी छोटी मदद के लिए एक-दूसरे को छोटा-सा धन्यवाद संदेश भेजें।",
    ],
    tenderness: [
      "अगले दिन जब भी मिलें, आप दोनों एक-दूसरे को थोड़ी देर गले लगाएं; दूर हों तो एक-एक स्नेह भरा वॉइस नोट भेजें।",
      "साथ होने पर बारी-बारी से एक-दूसरे के कंधों की हल्की मालिश करें और साथी की प्रतिक्रिया के अनुसार स्पर्श बदलें।",
      "बारी-बारी से एक-दूसरे की हथेली पर हल्की उंगली फेरें, फिर कुछ शांत सांसों तक हाथ थामे रहें।",
    ],
    desire: [
      "दिन में आप दोनों कुछ छोटे फ़्लर्टिंग संदेश एक-दूसरे को भेजें, फिर मिलने पर एक लंबा चुंबन साझा करें।",
      "जब आप दोनों अकेले हों, बारी-बारी से अपनी एक इच्छा फुसफुसाएं और कपड़ों के ऊपर से चुंबन देकर जवाब दें।",
      "दिन में आपस में दो चंचल इशारे साझा करें, फिर शाम को बारी-बारी से एक जगह चुनें जहां साथी को चूमें।",
    ],
    passion: [
      "दिन में आप दोनों एक-एक कामुक संकेत साझा करें, फिर साथ होने पर धीरे-धीरे सेक्स करें और एक-दूसरे की प्रतिक्रिया के अनुसार गति बदलें।",
      "साथ होने पर आप दोनों बारी-बारी से चुंबन और स्पर्श की गति तय करें; साथी की प्रतिक्रिया देखकर एक ठहराव जोड़ें।",
      "आप दोनों इच्छा के बारे में एक छोटा संदेश साझा करें, फिर साथ में धीमा सेक्स करें और प्रतिक्रिया के अनुसार एक बार लय बदलें।",
    ],
    hard: [
      "दिन में आप दोनों अपनी इच्छा के बारे में सीधे संदेश भेजें; साथ होने पर बारी-बारी से अंतरंगता की दृढ़ गति तय करें और साथी की प्रतिक्रिया देखें।",
      "जब आप दोनों अकेले हों, बारी-बारी से एक छोटी स्पष्ट मांग कहें और उसका जवाब अंतरंग स्पर्श से दें।",
      "आप दोनों अपनी एक स्पष्ट इच्छा बताएं, फिर साथ में तीव्र गति चुनें और जब तक दोनों चाहें उसे बनाए रखें।",
    ],
  },
  pt: {
    compliments: [
      "Nas próximas 24 horas, vocês dois enviem selfies comuns e privadas com elogios específicos; mantenham as fotos só entre vocês.",
      "Hoje à noite, vocês dois digam um ao outro uma qualidade que admiram e lembrem um momento real em que ela apareceu.",
      "Vocês dois enviem ao parceiro um agradecimento curto por um gesto cotidiano recente.",
    ],
    tenderness: [
      "Quando se encontrarem amanhã, vocês dois compartilhem um abraço breve; se estiverem longe, troquem uma mensagem de voz carinhosa.",
      "Quando estiverem juntos, revezem-se numa massagem curta nos ombros e acompanhem a reação um do outro.",
      "Revezem-se em desenhar um círculo leve na palma um do outro e depois permaneçam de mãos dadas por algumas respirações.",
    ],
    desire: [
      "Vocês dois troquem algumas mensagens de flerte durante o dia e parem num beijo demorado quando se encontrarem.",
      "Quando estiverem a sós, revezem-se em sussurrar um desejo e respondam cada vez com um beijo por cima da roupa.",
      "Troquem duas provocações leves durante o dia e, à noite, escolham um lugar para beijar um ao outro.",
    ],
    passion: [
      "Troquem uma insinuação sensual durante o dia e, quando estiverem juntos, façam sexo devagar, ajustando o ritmo às reações um do outro.",
      "Quando estiverem juntos, revezem-se em definir o ritmo dos beijos e das carícias; observem a reação um do outro e façam uma pausa marcada.",
      "Vocês dois compartilhem uma mensagem breve sobre desejo e depois façam sexo devagar, mudando o ritmo uma vez em resposta um ao outro.",
    ],
    hard: [
      "Troquem mensagens diretas sobre o que desejam; quando estiverem juntos, revezem-se em conduzir a intimidade com um ritmo firme.",
      "Quando estiverem a sós, revezem-se em fazer um pedido curto e ousado e respondam com uma carícia íntima.",
      "Digam um ao outro um desejo direto e escolham juntos um ritmo intenso, mantendo-o enquanto ambos gostarem.",
    ],
  },
  es: {
    compliments: [
      "Durante el próximo día, los dos envíense selfies normales y privados con un cumplido concreto; mantengan las fotos solo entre ustedes.",
      "Esta noche, ambos díganse qué detalle del otro admiran y recuerden un momento real en que lo notaron.",
      "Ambos envíense un agradecimiento breve por un gesto cotidiano reciente del otro.",
    ],
    tenderness: [
      "Cuando se vean, los dos compartan un abrazo breve; si están lejos, intercambien una nota de voz cariñosa.",
      "Cuando estén juntos, túrnense para dar un masaje corto en los hombros y sigan la reacción del otro.",
      "Por turnos, recorran suavemente la palma del otro con un dedo y luego quédense de la mano durante unas respiraciones.",
    ],
    desire: [
      "Intercambien algunos mensajes coquetos durante el día y, al verse, quédense en un beso largo.",
      "Cuando estén a solas, por turnos susurren un deseo y respondan con un beso por encima de la ropa.",
      "Compartan un par de insinuaciones juguetonas durante el día y, por turnos, elijan dónde dejar un beso al otro.",
    ],
    passion: [
      "Envíense una insinuación sensual durante el día y, cuando estén juntos, disfruten de sexo lento, ajustando el ritmo a las reacciones del otro.",
      "Cuando estén juntos, túrnense para marcar el ritmo de los besos y las caricias; observen la reacción del otro e incluyan una pausa deliberada.",
      "Ambos compartan un mensaje breve sobre el deseo y luego disfruten de sexo lento, cambiando el ritmo una vez según la respuesta del otro.",
    ],
    hard: [
      "Intercambien mensajes directos sobre lo que desean; cuando estén juntos, túrnense para llevar la intimidad con un ritmo firme.",
      "Cuando estén a solas, por turnos hagan una petición breve y atrevida y respondan con una caricia íntima.",
      "Díganse un deseo directo y elijan juntos un ritmo intenso, manteniéndolo mientras ambos lo disfruten.",
    ],
  },
};

function isTaskMode(mode: string): mode is TaskMode {
  return MODES.has(mode as TaskMode);
}

function hashSeed(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash = Math.imul(hash ^ value.charCodeAt(i), 16777619) >>> 0;
  }
  return hash || 1;
}

function seededShuffle<T>(items: T[], seed: number): T[] {
  const shuffled = [...items];
  let state = seed || 1;
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const target = state % (index + 1);
    [shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]];
  }
  return shuffled;
}

const EXAMPLE_MEDIA_MARKERS: Record<string, RegExp> = {
  ru: /(?:фото|фотограф|селфи|съ[её]мк|сним(?:и|ите|ать|айте)|видеозапис|камер\w*|записыва)/iu,
  en: /(?:photo|picture|selfie|image|filming|film|recording|record|camera|video)/iu,
  hi: /(?:फोटो|तस्वीर|सेल्फ़ी|सेल्फी|वीडियो|रिकॉर्ड|कैमरा)/u,
  pt: /(?:foto|selfie|imagem|filmagem|gravação|gravar|vídeo|câmera|registrar)/iu,
  es: /(?:foto|selfi|selfie|imagen|grabación|grabar|filmación|vídeo|video|cámara|registrar)/iu,
};

const UNSAFE_TASK_MARKERS: Record<string, RegExp> = {
  ru: /(?:без\s+согласия|игнорир\w*\s+(?:отказ|боль)|не\s+может\s+(?:двигаться|отказаться)|не\s+двигается|делай\s+что\s+хочешь|застав\w*|принуд\w*|удуш\w*|души\s|не\s+спрашивай|насиль\w*)/iu,
  en: /(?:without consent|can't (?:move|refuse)|cannot (?:move|refuse)|at their mercy|do whatever you want|force(?:d)?|coerc|chok|strangl|ignore (?:their )?(?:no|stop|pain)|don't ask)/iu,
  hi: /(?:सहमति के बिना|हिल नहीं सकता|हिल नहीं सकती|हिलते नहीं|जो चाहो करो|जबरदस्ती|ज़बरदस्ती|मना करने पर भी|गला घोंट|दर्द की अनदेखी)/u,
  pt: /(?:sem consentimento|não pode se mover|não consegue se mexer|à mercê|faça o que quiser|forç\w*|coag\w*|estrang\w*|ignore.*(?:não|pare|dor))/iu,
  es: /(?:sin consentimiento|no puede moverse|no puede negarse|a su merced|haz lo que quieras|forz\w*|coaccion\w*|estrang\w*|ignora.*(?:no|para|dolor))/iu,
};

function getTaskExamples(category: string, lang: string, requestId: string, mode: TaskMode): string[] {
  const pool = SOURCE_TASKS[lang]?.[category] ?? [];
  const mediaMarkers = EXAMPLE_MEDIA_MARKERS[lang] ?? EXAMPLE_MEDIA_MARKERS.en;
  const unsafeMarkers = UNSAFE_TASK_MARKERS[lang] ?? UNSAFE_TASK_MARKERS.en;
  const eligible = pool.filter((example) =>
    isTaskTextWellFormed(example, lang, "together")
    && !unsafeMarkers.test(example)
    && (mode !== "solo" || !isSharedTaskText(example, lang))
    && (category === "compliments" || !mediaMarkers.test(example))
  );
  const shuffled = seededShuffle(eligible, hashSeed(`${requestId}:${lang}:${category}:examples`));
  const examples: string[] = [];
  for (const candidate of shuffled) {
    const candidateWords = new Set(candidate.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) ?? []);
    const tooSimilar = examples.some((selected) => {
      const selectedWords = new Set(selected.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) ?? []);
      const intersection = [...candidateWords].filter((word) => selectedWords.has(word)).length;
      const union = new Set([...candidateWords, ...selectedWords]).size;
      return union > 0 && intersection / union > 0.55;
    });
    if (!tooSimilar) examples.push(candidate);
    if (examples.length === 5) break;
  }
  return examples;
}

function getTaskExamplesPrompt(category: string, lang: string, requestId: string, mode: TaskMode): string {
  const examples = getTaskExamples(category, lang, requestId, mode);
  if (examples.length === 0) return "";
  const intro: Record<string, string> = {
    ru: "Ниже — разные примеры из списка заданий пользователя. Используй их только как источник идей; не копируй формулировки.",
    en: "Below are varied examples from the user's task lists. Use them only as idea references; do not copy their wording.",
    hi: "नीचे उपयोगकर्ता की कार्य-सूची से अलग-अलग उदाहरण हैं। इन्हें केवल विचारों के लिए लें; शब्दशः न दोहराएँ।",
    pt: "Abaixo estão exemplos variados das listas do usuário. Use-os apenas como inspiração; não copie a redação.",
    es: "A continuación hay ejemplos variados de las listas del usuario. Úsalos solo como inspiración; no copies su redacción.",
  };
  return `${intro[lang] ?? intro.en}\n${examples.map((example, index) => `${index + 1}. ${example}`).join("\n")}`;
}

function getFallback(cat: string, lang: string, mode: TaskMode, requestId: string): string {
  if (mode === "solo") {
    const pool = SOURCE_TASKS[lang]?.[cat] ?? [];
    const mediaMarkers = EXAMPLE_MEDIA_MARKERS[lang] ?? EXAMPLE_MEDIA_MARKERS.en;
    const unsafeMarkers = UNSAFE_TASK_MARKERS[lang] ?? UNSAFE_TASK_MARKERS.en;
    const soloTasks = pool.filter((task) =>
      isTaskTextWellFormed(task, lang, "solo")
      && !mediaMarkers.test(task)
      && !unsafeMarkers.test(task)
      && !isSharedTaskText(task, lang)
    );
    if (soloTasks.length === 0) {
      throw new Error(`No valid solo-task fallback for ${lang}/${cat}`);
    }
    return seededShuffle(soloTasks, hashSeed(`${requestId}:${lang}:${cat}:solo-fallback`))[0];
  }

  const pool = DAILY_TASK_FALLBACKS[lang] ?? DAILY_TASK_FALLBACKS.en;
  const list = pool[cat] ?? pool.compliments;
  const wellFormed = list.filter(task =>
    isTaskTextWellFormed(task, lang, mode) && isTaskTextModeAppropriate(task, lang, mode)
  );
  if (wellFormed.length === 0) {
    throw new Error(`No valid shared-task fallback for ${lang}/${cat}/${mode}`);
  }
  return wellFormed[hashSeed(`${requestId}:${lang}:${cat}:${mode}:fallback`) % wellFormed.length];
}

function getGenderLine(lang: string, gender: string): string {
  const map: Record<string, Record<string, string>> = {
    ru: {
      male: "Пара совершеннолетняя и гетеросексуальная: пользователь — мужчина, партнёрша — женщина. Обращайся к пользователю на «ты», называй партнёршу в женском роде. Сохраняй роли и анатомию до конца задания.",
      female: "Пара совершеннолетняя и гетеросексуальная: пользователь — женщина, партнёр — мужчина. Обращайся к пользователю на «ты», называй партнёра в мужском роде. Сохраняй роли и анатомию до конца задания.",
    },
    en: {
      male: "This is an adult heterosexual couple: the user is a man and the partner is a woman. Address the user as 'you' and refer to the partner as she/her. Keep roles and anatomy consistent.",
      female: "This is an adult heterosexual couple: the user is a woman and the partner is a man. Address the user as 'you' and refer to the partner as he/him. Keep roles and anatomy consistent.",
    },
    hi: {
      male: "यह वयस्क विषमलैंगिक जोड़ा है: उपयोगकर्ता पुरुष और साथी महिला है। भूमिकाएँ और शरीर-संबंधी विवरण पूरे कार्य में स्थिर रखें।",
      female: "यह वयस्क विषमलैंगिक जोड़ा है: उपयोगकर्ता महिला और साथी पुरुष है। भूमिकाएँ और शरीर-संबंधी विवरण पूरे कार्य में स्थिर रखें।",
    },
    pt: {
      male: "Este é um casal adulto e heterossexual: o usuário é homem e a parceira é mulher. Trate o usuário por 'você' e mantenha os papéis e a anatomia coerentes.",
      female: "Este é um casal adulto e heterossexual: a usuária é mulher e o parceiro é homem. Trate a usuária por 'você' e mantenha os papéis e a anatomia coerentes.",
    },
    es: {
      male: "Es una pareja adulta y heterosexual: el usuario es hombre y su pareja es mujer. Háblale de tú y mantén coherentes los papeles y la anatomía.",
      female: "Es una pareja adulta y heterosexual: la usuaria es mujer y su pareja es hombre. Háblale de tú y mantén coherentes los papeles y la anatomía.",
    },
  };
  return map[lang]?.[gender] ?? map["en"]["male"];
}

const MODE_INSTRUCTIONS: Record<string, Record<string, string>> = {
  solo: {
    ru: "Одиночный режим: задание получает только один совершеннолетний пользователь. Обращайся к нему как к одному человеку и опиши одно действие, которое он может сделать для партнёра. Партнёр может быть адресатом, но не должен выполнять отдельную часть или отвечать.",
    en: "Solo mode: only one adult user receives the task. Address that user individually and describe one action they can take for their partner. The partner may receive the gesture but must not be assigned a separate action or reply.",
    hi: "एकल मोड: काम केवल एक वयस्क उपयोगकर्ता को मिलता है। उसी व्यक्ति को संबोधित करें और ऐसा एक काम बताएँ जो वह अपने साथी के लिए कर सकता है। साथी काम का प्राप्तकर्ता हो सकता है, लेकिन उससे अलग काम या जवाब की अपेक्षा न करें।",
    pt: "Modo solo: somente um adulto recebe a tarefa. Dirija-se a essa pessoa e descreva uma ação que ela pode fazer para o parceiro. O parceiro pode receber o gesto, mas não deve ter uma ação separada nem uma resposta como obrigação.",
    es: "Modo individual: solo una persona adulta recibe la tarea. Dirígete a esa persona y describe una acción que pueda hacer por su pareja. La pareja puede recibir el gesto, pero no debe tener una acción separada ni una respuesta obligatoria.",
  },
  together: {
    ru: "Парный режим: одно и то же задание показывается обоим и при включённых уведомлениях отправляется партнёру в Telegram. Создай одно совместное действие для совершеннолетних мужчины и женщины, а не два отдельных задания и не ролевую сцену. Обращайся к обоим во множественном числе; явно укажи, что делают оба.",
    en: "Together mode: both partners see the same task, and the identical text is sent to the partner in Telegram when notifications are enabled. Create one shared activity for an adult man and woman, not two separate tasks or roleplay. Address both and explicitly include both in the action.",
    hi: "साथी मोड: दोनों को एक ही काम दिखता है और सूचनाएँ चालू होने पर वही पाठ साथी को Telegram पर भेजा जाता है। वयस्क पुरुष और महिला के लिए एक साझा गतिविधि लिखें, दो अलग काम या भूमिका-अभिनय नहीं; दोनों को स्पष्ट रूप से शामिल करें।",
    pt: "Modo a dois: ambos veem a mesma tarefa, que é enviada ao parceiro pelo Telegram quando as notificações estão ativadas. Crie uma atividade compartilhada para um homem e uma mulher adultos, não duas tarefas nem uma encenação; inclua claramente os dois.",
    es: "Modo en pareja: ambos ven la misma tarea y el mismo texto se envía a la pareja por Telegram si las notificaciones están activadas. Crea una actividad compartida para un hombre y una mujer adultos, no dos tareas ni una escena de rol; incluye claramente a ambos.",
  },
};

// ─── ПРОМПТЫ (ИИ сам придумывает, а не выбирает из списка) ────────────────

const PROMPTS: Record<string, Record<string, string>> = {
  compliments: {
    ru: `Ты создаёшь одно задание для категории «КОМПЛИМЕНТЫ» в гетеросексуальной паре мужчина–женщина.

Стиль: используй конкретный поступок или наблюдение и одну выразительную деталь. Задание должно звучать лично, а не как общий комплимент из открытки.
Категория только про слова и знаки внимания: сказать или написать комплимент, поблагодарить за конкретную мелочь, напомнить об общем тёплом воспоминании. Можно предложить в течение дня обмениваться обычными личными селфи с короткими подписями-комплиментами; никаких интимных фото или публикаций.

Придумай новое задание в духе приложенных примеров, не копируя их. Одно ясное действие; максимум 1–3 связанных шага, обычно 1–2 предложения. Не добавляй шаблонный финал «пусть почувствует». До ${MAX_TASK_CHARS} символов. Верни только текст задания.`,
    en: `Create one task for the "COMPLIMENTS" category for a heterosexual man-woman couple.

Style: use one specific observation or gesture and one vivid detail. Make it personal rather than a generic greeting-card compliment.
This category is about words and thoughtful gestures only: give a specific compliment, thank the partner for a small real thing, or recall a warm shared memory. One option is to exchange ordinary private selfies with short compliment captions during free moments through the day; never request intimate photos or public posts.

Create a new task in the style of the supplied examples without copying them. One clear action with at most 1–3 connected steps, usually 1–2 sentences. Avoid a formulaic "let them feel" ending. Up to ${MAX_TASK_CHARS} characters. Return only the task text.`,
  },
  tenderness: {
    ru: `Ты создаёшь одно задание для категории «НЕЖНОСТЬ» в гетеросексуальной паре мужчина–женщина.

Категория — простая ласковая близость: объятие, поцелуй, прикосновение к руке, мягкий массаж плеч или спины. Задание остаётся нежным и не превращается в прелюдию или секс.
Стиль — конкретный жест и одна чувственная деталь, без длинной сцены, реквизита и обязательной съёмки.

Создай новое задание в духе приложенных примеров, не копируя их. Одно ясное действие или 1–3 естественно связанных шага, обычно 1–2 предложения. Не повторяй один и тот же шаблонный финал. До ${MAX_TASK_CHARS} символов. Верни только текст задания.`,
    en: `Create one task for the "TENDERNESS" category for a heterosexual man-woman couple.

Keep it to gentle affection: a hug, a kiss, a hand touch, or a soft shoulder/back massage. Stay tender; do not turn the task into foreplay or sex.
Use one concrete gesture and one sensory detail. Avoid a long scene, props, and required recording.

Create a new task in the style of the supplied examples without copying them. One clear action or 1–3 naturally connected steps, usually 1–2 sentences. Avoid repetitive formulaic endings. Up to ${MAX_TASK_CHARS} characters. Return only the task text.`,
  },
  desire: {
    ru: `Ты создаёшь одно задание для категории «ЖЕЛАНИЕ» — предвкушение и прелюдия до секса — в гетеросексуальной паре мужчина–женщина.

Создавай напряжение через флирт, поцелуй, шёпот, прикосновение поверх одежды, игривое раздевание или чувственный массаж. Это граница перед сексом: не описывай оральный секс, проникновение или сам половой акт. Не требуй интимных фото, видео или съёмки.
Соблюдай анатомию и естественную последовательность. Одно центральное действие, не длинная сцена.

Придумай новое задание в духе примеров, не копируя их. 1–3 связанных шага, обычно 1–2 предложения; конкретно и чувственно, без повторяющегося «пусть почувствует». До ${MAX_TASK_CHARS} символов. Верни только текст задания.`,
    en: `Create one task for the "DESIRE" category—anticipation and foreplay before sex—for a heterosexual man-woman couple.

Build tension through flirting, a kiss, a whisper, a touch over clothing, playful undressing, or sensual massage. Stay at the edge before sex: do not describe oral sex, penetration, or intercourse. Do not require intimate photos, video, or filming.
Keep the anatomy and order of actions physically plausible. Use one central action, not a long scene.

Create a new task in the style of the examples without copying them. Use 1–3 connected steps, usually 1–2 sentences; be concrete and sensual, and avoid repetitive "let them feel" endings. Up to ${MAX_TASK_CHARS} characters. Return only the task text.`,
  },
  passion: {
    ru: `Ты создаёшь одно задание для категории «СТРАСТЬ» — чувственный секс в гетеросексуальной паре мужчина–женщина.

Тон интимный и чувственный, но не грязный: внимание к телесным ощущениям, ритму и реакции партнёра. Выбери одну центральную идею — подходящую позу, темп, ласку или сексуальное действие. Не превращай карточку в длинную последовательность.
Соблюдай анатомию и выполнимый порядок. Не обещай конкретную реакцию тела. Если упоминается оргазм, он обычно завершает задание; не добавляй после него следующий акт автоматически. Не добавляй реквизит, музыку или съёмку по умолчанию.

Создай оригинальное задание в духе примеров: 1–3 связанных шага, обычно 1–2 предложения, до ${MAX_TASK_CHARS} символов. Без шаблонных концовок и пояснений; верни только текст задания.`,
    en: `Create one task for the "PASSION" category: sensual sex for a heterosexual man-woman couple.

Keep the tone intimate and sensual, not dirty: focus on bodily sensation, pace, and the partner's response. Choose one central idea—a suitable position, pace, caress, or sexual act. Do not turn the card into a long sequence.
Keep anatomy and order physically plausible. Do not guarantee a bodily response. If orgasm is mentioned, it usually ends the task; do not automatically add another act afterward. Do not add props, music, or filming by default.

Create an original task in the style of the examples: 1–3 connected steps, usually 1–2 sentences, up to ${MAX_TASK_CHARS} characters. Avoid formulaic endings and explanations; return only the task text.`,
  },
  hard: {
    ru: `Ты создаёшь одно задание для категории «ХАРД» — более грязный и прямой стиль, чем в «Страсти», для гетеросексуальной пары мужчина–женщина.

Используй откровенную, уверенную лексику и одну центральную идею: более властный тон, томление, контроль темпа или интенсивные ласки. «Хард» отличается прежде всего прямотой и накалом, а не обязательной грубостью. Не описывай принуждение, игнорирование боли или физически опасные действия.
Соблюдай анатомию и последовательность. Не добавляй пояснения о согласии, стоп-словах или безопасности в текст задания. Это короткая карточка, не ролевая сцена: без персонажей, сюжета и длинных реплик. Не добавляй съёмку и реквизит по умолчанию.

Создай оригинальное задание в духе примеров: одно действие или 1–3 тесно связанных шага, обычно 1–2 предложения, до ${MAX_TASK_CHARS} символов. Верни только текст задания.`,
    en: `Create one task for the "HARD" category for a heterosexual man-woman couple. Make it dirtier and more direct than "PASSION".

Use bold, explicit wording and one central idea: a more commanding tone, anticipation, control of pace, or intense caresses. "Hard" should feel more direct and heated, not automatically rough. Do not describe coercion, ignoring pain, or physically dangerous actions.
Keep anatomy and sequence plausible. Do not put consent, safeword, or safety explanations in the task text. This is a short task, not a roleplay scene: no characters, plot, or long dialogue. Do not add filming or props by default.

Create an original task in the style of the examples: one action or 1–3 closely connected steps, usually 1–2 sentences, up to ${MAX_TASK_CHARS} characters. Return only the task text.`,
  },
};

const VARIATION_FOCI: Record<string, { ru: string[]; en: string[] }> = {
  compliments: {
    ru: [
      "обмен обычными личными селфи с короткими комплиментами в свободные моменты дня",
      "два конкретных тёплых сообщения, отправленных в разные моменты дня",
      "короткие голосовые комплименты, которыми пара обменивается в течение дня",
      "вспомнить в сообщении о маленьком общем воспоминании и вернуться к нему позже",
    ],
    en: [
      "exchange ordinary private selfies with short compliment captions in free moments through the day",
      "send two specific warm messages at separate moments during the day",
      "trade short voice-note compliments throughout the day",
      "recall a small shared memory in a message and return to it later",
    ],
  },
  tenderness: {
    ru: [
      "короткое объятие при встрече и тёплое сообщение, если будете врозь",
      "по одному короткому успокаивающему прикосновению при двух встречах",
      "небольшая забота о руках, когда найдёте свободную минуту вместе",
      "нежный короткий голосовой контакт в начале и конце дня",
    ],
    en: [
      "a short hug when you meet and a warm message if you are apart",
      "one brief comforting touch at two separate moments together",
      "a small act of hand care when you find a free moment together",
      "a gentle short voice note at the start and end of the day",
    ],
  },
  desire: {
    ru: [
      "флиртующие сообщения в течение дня и поцелуй при встрече, остающийся на границе прелюдии",
      "короткие намёки о желании в разные моменты и один поцелуй позже",
      "игривое предвкушение через одежду после обмена сообщениями в течение дня",
      "один долгий поцелуй при встрече после коротких флиртующих сообщений",
    ],
    en: [
      "flirty messages through the day and a kiss when you meet, staying at the edge of foreplay",
      "short hints about desire at separate moments and one kiss later",
      "playful anticipation through clothing after trading messages during the day",
      "one lingering kiss when you meet after brief flirty messages",
    ],
  },
  passion: {
    ru: [
      "один чувственный намёк в течение дня, затем взаимные поцелуи и медленный секс при встрече",
      "обмен короткими сообщениями о желании и одна смена темпа во время секса",
      "внимание к одному желанию партнёра, высказанному раньше в течение дня",
      "одна выразительная пауза или смена ритма во время секса после флирта в сообщениях",
      "завершить задание оргазмом, без автоматического продолжения после него",
      "короткое сообщение о желании днём и чувственная близость позже, без съёмки",
    ],
    en: [
      "one sensual hint during the day, then mutual kisses and slow sex when you meet",
      "trade brief messages about desire and make one change of pace during sex",
      "focus on one partner's desire, shared earlier in the day",
      "one expressive pause or rhythm change during sex after flirting by message",
      "end the task with orgasm, with no automatic continuation afterward",
      "a short message about desire during the day and sensual closeness later, without recording",
    ],
  },
  hard: {
    ru: [
      "короткое откровенное сообщение днём и прямое физическое действие при встрече",
      "одна властная короткая фраза в переписке и уверенный темп позже",
      "нарастающее напряжение через сообщения и одну выразительную деталь физического действия",
      "прямое сообщение о желании днём и интенсивная близость позже",
      "короткая провокационная реплика в свободную минуту и продолжение при встрече",
      "прямое описание желания без длинной переписки или вымышленной роли",
    ],
    en: [
      "a brief explicit message during the day and a direct physical act when you meet",
      "one short commanding line by message and a confident pace later",
      "build intensity through messages and one vivid detail of physical action",
      "a direct message about desire during the day and intense closeness later",
      "a short provocative line in a free moment and continuation when you meet",
      "direct wording of desire without long exchanges or invented roles",
    ],
  },
};

function getVariationInstruction(category: string, lang: string, requestId: string): string {
  const focuses = VARIATION_FOCI[category];
  if (!focuses) return "";

  const options = lang === "ru" ? focuses.ru : focuses.en;
  let hash = 0;
  for (let i = 0; i < requestId.length; i += 1) {
    hash = (Math.imul(hash, 31) + requestId.charCodeAt(i)) >>> 0;
  }
  const focus = options[hash % options.length];
  return lang === "ru"
    ? `Акцент разнообразия для этого задания: ${focus}. Сделай его центральным, не складывай в задание остальные варианты.`
    : `Variation focus for this task: ${focus}. Make it central; do not stack in the other options.`;
}

function getPrompt(category: string, lang: string): string {
  return PROMPTS[category]?.[lang] ?? PROMPTS[category]?.["en"] ?? PROMPTS["compliments"]["en"];
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
  if (hasCyrillic || hasDevanagari) return false;
  const latinLanguageMarkers: Record<string, RegExp> = {
    en: /\b(?:you|your|the|with|her|him|partner|kiss|touch|say|tell|look|hold|write|send|slowly|together)\b/iu,
    pt: /\b(?:você|seu|sua|dele|dela|parceir[oa]|com|para|uma?|do|da|no|na|beij|abrac|toqu|dig[ae]|olh|sussurr|escrev|envie|devagar|lentamente|juntos)\b/iu,
    es: /\b(?:tú|tu|su|pareja|con|para|él|ella|el|la|los|las|un[oa]?|del|bes|abraz|toc|d[ií]le?|mira|susurr|escrib|env[ií]a|despacio|juntos)\b/iu,
  };
  return latinLanguageMarkers[lang]?.test(text) ?? false;
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
  if (!LANGS.has(lang) || !GENDERS.has(gender) || !isTaskMode(mode)) return res.status(400).json({ error: "invalid_generation_options" });
  if (body.requestId !== undefined && (typeof body.requestId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.requestId))) {
    return res.status(400).json({ error: "invalid_request_id" });
  }
  const requestId: string = body.requestId ?? randomUUID();
  try {
    await claimFriendInvite(supabase, initData!, caller.id);
  } catch {
    return res.status(500).json({ error: "referral_claim_failed" });
  }

  let partnerUserId: number | null = null;
  if (mode === "together") {
    if (!coupleId) return res.status(400).json({ error: "couple_id_required" });
    const { data } = await supabase.from("couples").select("user_a_id,user_b_id").eq("id", coupleId).maybeSingle();
    if (!data || (data.user_a_id !== caller.id && data.user_b_id !== caller.id)) return res.status(403).json({ error: "couple_access_denied" });
    partnerUserId = data.user_a_id === caller.id ? data.user_b_id : data.user_a_id;
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

  let task = getFallback(category, lang, mode, requestId);
  let source: "ai" | "fallback" = "fallback";
  if (DEEPSEEK_API_KEY) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12_000);
    try {
        const roleInstruction = getGenderLine(lang, gender);
        const systemPrompt = `${getPrompt(category, lang)}\n\n${MODE_INSTRUCTIONS[mode][lang]}\n\n${getVariationInstruction(category, lang, requestId)}\n\n${roleInstruction}\n\n${getTaskQualityRules(lang, mode)}\n\n${LANGUAGE_INSTRUCTIONS[lang]}`;
      const aiRes = await fetch(DEEPSEEK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${DEEPSEEK_API_KEY}` },
        signal: controller.signal,
        body: JSON.stringify({ model: "deepseek-chat", messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: [
            LANGUAGE_INSTRUCTIONS[lang],
            getTaskExamplesPrompt(category, lang, requestId, mode),
          ].filter(Boolean).join("\n\n") },
        ], max_tokens: 180, temperature: 0.98 }),
      });
      if (aiRes.ok) {
        const data = await aiRes.json();
        const candidate = String(data.choices?.[0]?.message?.content ?? "").replace(/^["']|["']$/g, "").replace(/^\d+\.\s*/, "").trim();
        const forbidden = ["я рекомендую", "тебе стоит", "можешь попробовать"];
        if (candidate.length >= 15 && candidate.length <= MAX_TASK_CHARS
          && matchesRequestedLanguage(candidate, lang)
          && isTaskTextWellFormed(candidate, lang, mode)
          && isTaskTextModeAppropriate(candidate, lang, mode)
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
  const savedTaskText = String(saved.task ?? task);
  const partnerNotified = mode === "together" && partnerUserId && saved.taskId
    ? await notifyPartner(partnerUserId, coupleId!, String(saved.taskId), category, savedTaskText, lang)
    : false;
  return res.status(200).json({
    ok: true, task: savedTaskText, taskId: saved.taskId,
    source: saved.source, remaining: saved.remaining, isPremium: premium, partnerNotified,
  });
}
