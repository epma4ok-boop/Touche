// api/tasks/generate.ts
// POST /api/tasks/generate
// Body: { category, lang, gender? }

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { randomUUID } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { validateTelegramInitData } from "../couple/_auth.js";
import { appDate } from "../limits.js";
import { claimFriendInvite } from "../referrals/_claim.js";
import { getTaskQualityRules, hasConcreteSexualAct, isSharedTaskText, isTaskTextModeAppropriate, isTaskTextWellFormed } from "../../src/data/task-quality.js";
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
      "По очереди занимайтесь оральным сексом, не спеша целуя друг друга и сохраняя тёплый зрительный контакт.",
      "Вдвоём займитесь вагинальным сексом в медленном ритме: по очереди задавайте темп и оставайтесь близко друг к другу.",
      "По очереди мастурбируйте друг друга руками, меняя нежные прикосновения по реакции партнёра.",
    ],
    hard: [
      "По очереди занимайтесь оральным сексом и прямо, грязными словами называйте, что делаете друг с другом.",
      "Вместе займитесь энергичным вагинальным сексом: один задаёт жёсткий ритм, второй направляет движения руками; затем поменяйтесь ролями.",
      "Если оба хотите, снимите приватное порно, пока по очереди мастурбируете друг друга; оставьте видео только себе и никому не отправляйте.",
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
      "Take turns giving each other oral sex slowly, with unhurried kisses and warm eye contact.",
      "Have gentle vaginal sex together; trade control of the pace and stay close, looking into each other's eyes.",
      "Take turns masturbating each other by hand, keeping a tender rhythm and following each other's reactions.",
    ],
    hard: [
      "Take turns giving each other oral sex; say plainly, in dirty words, what you are doing and keep a firm pace.",
      "Have vigorous vaginal sex together: one partner sets the rhythm while the other guides the movement with their hands.",
      "If you both want to, film private porn while taking turns masturbating each other; keep the video private and never share it.",
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
      "बारी-बारी से एक-दूसरे को ओरल सेक्स दें, धीरे-धीरे चुंबन करें और प्यार भरी नज़रें मिलाएँ।",
      "आप दोनों धीरे-धीरे योनि सेक्स करें; बारी-बारी से लय तय करें और एक-दूसरे के करीब रहें।",
      "बारी-बारी से हाथों से एक-दूसरे का हस्तमैथुन करें और साथी की प्रतिक्रिया के अनुसार कोमल लय रखें।",
    ],
    hard: [
      "बारी-बारी से एक-दूसरे को ओरल सेक्स दें; सीधे और अश्लील शब्दों में बताएं कि क्या कर रहे हैं, और लय तेज़ रखें।",
      "आप दोनों तेज़ योनि सेक्स करें: एक व्यक्ति लय तय करे और दूसरा हाथों से गति को निर्देशित करे।",
      "अगर आप दोनों चाहें, तो एक-दूसरे का हस्तमैथुन करते हुए निजी पोर्न वीडियो बनाएं और किसी के साथ साझा न करें।",
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
      "Revezem-se no sexo oral, sem pressa, com beijos demorados e um olhar carinhoso.",
      "Revezem-se no sexo vaginal, mantendo um ritmo lento e o corpo perto um do outro.",
      "Revezem-se em masturbar um ao outro com as mãos, mantendo um ritmo suave e atento às reações do parceiro.",
    ],
    hard: [
      "Revezem-se no sexo oral e digam sem rodeios, com palavras mais sujas, o que estão fazendo.",
      "Juntos, façam sexo vaginal com ritmo intenso: uma pessoa conduz e a outra guia o movimento com as mãos.",
      "Se vocês dois quiserem, gravem um vídeo pornô privado enquanto se masturbam mutuamente; não compartilhem a gravação.",
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
      "Por turnos, practiquen sexo oral sin prisa, con besos largos y una mirada cariñosa.",
      "Hagan juntos sexo vaginal lentamente, alternando quién guía el ritmo y manteniéndose cerca.",
      "Por turnos, masturben al otro con las manos, con un ritmo suave y atentos a su reacción.",
    ],
    hard: [
      "Por turnos, practiquen sexo oral y díganse sin rodeos, con palabras obscenas, lo que están haciendo.",
      "Tengan juntos sexo vaginal con un ritmo intenso: una persona marca el movimiento y la otra lo guía con las manos.",
      "Si ambos quieren, graben un vídeo porno privado mientras se masturban mutuamente; guárdenlo en privado y no lo compartan.",
    ],
  },
};

const SOLO_SEXUAL_FALLBACKS: Record<string, Pick<StaticPool, "passion" | "hard">> = {
  ru: {
    passion: [
      "При встрече займись с партнёром оральным сексом медленно и нежно, следя за реакцией партнёра.",
      "Веди вагинальный секс с партнёром в мягком ритме, нежно меняя темп по его реакции.",
      "Мастурбируй партнёру руками, меняя нежные прикосновения по реакции партнёра.",
    ],
    hard: [
      "При встрече займись с партнёром оральным сексом и прямо, грязными словами называй, что делаешь.",
      "Веди энергичный вагинальный секс с партнёром, задавая жёсткий ритм и меняя его по реакции партнёра.",
      "Мастурбируй партнёру руками в быстром ритме и прямо говори, что именно делаешь.",
    ],
  },
  en: {
    passion: [
      "Give your partner gentle oral sex at an unhurried pace, adjusting to their reactions.",
      "Lead slow vaginal sex with your partner, keeping a tender rhythm and warm eye contact.",
      "Masturbate your partner by hand, keeping your touch gentle and following their response.",
    ],
    hard: [
      "Give your partner oral sex and say plainly, with a little dirty talk, what you are doing.",
      "Lead vigorous vaginal sex with your partner, setting a firm pace and adjusting to their response.",
      "Masturbate your partner by hand at a brisk pace and name the act directly in dirty words.",
    ],
  },
  hi: {
    passion: [
      "अपने साथी को प्यार से ओरल सेक्स दें, धीरे-धीरे और उनकी प्रतिक्रिया देखते हुए।",
      "अपने साथी के साथ धीरे योनि सेक्स शुरू करें और उनकी प्रतिक्रिया के अनुसार लय नरम रखें।",
      "अपने साथी का हाथों से हस्तमैथुन करें और उनकी प्रतिक्रिया के अनुसार कोमल गति रखें।",
    ],
    hard: [
      "अपने साथी को सीधे और थोड़े अश्लील शब्दों में ओरल सेक्स दें और बताएं कि आप क्या कर रहे हैं।",
      "अपने साथी के साथ तेज़ योनि सेक्स करें और गति को साफ़ तौर पर नियंत्रित करें।",
      "अपने साथी का हाथों से हस्तमैथुन करें और सीधे, गंदे शब्दों में क्रिया का नाम लें।",
    ],
  },
  pt: {
    passion: [
      "Faça sexo oral no seu par sem pressa, com delicadeza e atenção às reações.",
      "Conduza o sexo vaginal com seu par em um ritmo suave e carinhoso.",
      "Masturbe seu par com as mãos, mantendo um toque delicado e observando as reações.",
    ],
    hard: [
      "Faça sexo oral no seu par e diga sem rodeios, com palavras mais sujas, o que está fazendo.",
      "Conduza o sexo vaginal com seu par em um ritmo intenso e firme.",
      "Masturbe seu par com as mãos em ritmo acelerado e nomeie o ato com palavras diretas.",
    ],
  },
  es: {
    passion: [
      "Practica sexo oral con tu pareja sin prisa, con ternura y observa su reacción.",
      "Guía el sexo vaginal con tu pareja a un ritmo lento y cariñoso.",
      "Masturba a tu pareja con las manos, con caricias suaves y observa su respuesta.",
    ],
    hard: [
      "Practica sexo oral con tu pareja y di sin rodeos, con palabras algo obscenas, lo que estás haciendo.",
      "Guía el sexo vaginal con tu pareja a un ritmo intenso y firme.",
      "Masturba a tu pareja con las manos a buen ritmo y nombra el acto con palabras directas y sucias.",
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
  const pool = [
    ...(SOURCE_TASKS[lang]?.[category] ?? []),
    ...(mode === "solo"
      ? SOLO_SEXUAL_FALLBACKS[lang]?.[category as "passion" | "hard"] ?? []
      : DAILY_TASK_FALLBACKS[lang]?.[category] ?? []),
  ];
  const mediaMarkers = EXAMPLE_MEDIA_MARKERS[lang] ?? EXAMPLE_MEDIA_MARKERS.en;
  const unsafeMarkers = UNSAFE_TASK_MARKERS[lang] ?? UNSAFE_TASK_MARKERS.en;
  const eligible = pool.filter((example) =>
    isTaskTextWellFormed(example, lang, mode)
    && !unsafeMarkers.test(example)
    && (!["passion", "hard"].includes(category) || hasConcreteSexualAct(example, lang))
    && isTaskTextModeAppropriate(example, lang, mode)
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
    ru: "Ниже — разные примеры заданий этой категории. Используй их только как источник идей; не копируй формулировки.",
    en: "Below are varied examples for this category. Use them only as idea references; do not copy their wording.",
    hi: "नीचे इस श्रेणी के अलग-अलग उदाहरण हैं। इन्हें केवल विचारों के लिए लें; शब्दशः न दोहराएँ।",
    pt: "Abaixo estão exemplos variados desta categoria. Use-os apenas como inspiração; não copie a redação.",
    es: "A continuación hay ejemplos variados de esta categoría. Úsalos solo como inspiración; no copies su redacción.",
  };
  return `${intro[lang] ?? intro.en}\n${examples.map((example, index) => `${index + 1}. ${example}`).join("\n")}`;
}

function getFallback(cat: string, lang: string, mode: TaskMode, requestId: string): string {
  if (mode === "solo") {
    const pool = [
      ...(SOURCE_TASKS[lang]?.[cat] ?? []),
      ...(SOLO_SEXUAL_FALLBACKS[lang]?.[cat as "passion" | "hard"] ?? []),
    ];
    const mediaMarkers = EXAMPLE_MEDIA_MARKERS[lang] ?? EXAMPLE_MEDIA_MARKERS.en;
    const unsafeMarkers = UNSAFE_TASK_MARKERS[lang] ?? UNSAFE_TASK_MARKERS.en;
    const soloTasks = pool.filter((task) =>
      isTaskTextWellFormed(task, lang, "solo")
      && !mediaMarkers.test(task)
      && !unsafeMarkers.test(task)
      && (!["passion", "hard"].includes(cat) || hasConcreteSexualAct(task, lang))
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
    isTaskTextWellFormed(task, lang, mode)
    && isTaskTextModeAppropriate(task, lang, mode)
    && (!["passion", "hard"].includes(cat) || hasConcreteSexualAct(task, lang))
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
    ru: "Одиночный режим: задание получает только один совершеннолетний пользователь. Обращайся к нему как к одному человеку и опиши одно действие, которое он может сделать для партнёра. Партнёр может быть адресатом, но не должен выполнять отдельную часть или отвечать. В «Страсти» и «Харде» пользователь выполняет конкретный названный акт для партнёра; не пиши о взаимных действиях и очередности.",
    en: "Solo mode: only one adult user receives the task. Address that user individually and describe one action they can take for their partner. The partner may receive the gesture but must not be assigned a separate action or reply. In Passion and Hard, the user performs the named act for their partner; do not make the act mutual or alternate turns.",
    hi: "एकल मोड: काम केवल एक वयस्क उपयोगकर्ता को मिलता है। उसी व्यक्ति को संबोधित करें और ऐसा एक काम बताएँ जो वह अपने साथी के लिए कर सकता है। साथी काम का प्राप्तकर्ता हो सकता है, लेकिन उससे अलग काम या जवाब की अपेक्षा न करें। जुनून और हार्ड में उपयोगकर्ता साथी के लिए नामित यौन क्रिया करे; आपसी क्रिया या बारी-बारी के निर्देश न दें।",
    pt: "Modo solo: somente um adulto recebe a tarefa. Dirija-se a essa pessoa e descreva uma ação que ela pode fazer para o parceiro. O parceiro pode receber o gesto, mas não deve ter uma ação separada nem uma resposta como obrigação. Em Paixão e hard, o usuário executa o ato nomeado no parceiro; não use ações mútuas nem alternância.",
    es: "Modo individual: solo una persona adulta recibe la tarea. Dirígete a esa persona y describe una acción que pueda hacer por su pareja. La pareja puede recibir el gesto, pero no debe tener una acción separada ni una respuesta obligatoria. En Pasión y hard, quien inicia realiza el acto nombrado para su pareja; no uses acciones mutuas ni turnos.",
  },
  together: {
    ru: "Парный режим: одно и то же задание показывается обоим и при включённых уведомлениях отправляется партнёру в Telegram. Создай одно совместное действие для совершеннолетних мужчины и женщины, а не два отдельных задания и не ролевую сцену. Обращайся к обоим во множественном числе; явно укажи, что делают оба. В «Страсти» и «Харде» включи обоих в конкретный сексуальный акт.",
    en: "Together mode: both partners see the same task, and the identical text is sent to the partner in Telegram when notifications are enabled. Create one shared activity for an adult man and woman, not two separate tasks or roleplay. Address both, explicitly include both in the action, and make both part of the named sexual act in Passion and Hard.",
    hi: "साथी मोड: दोनों को एक ही काम दिखता है और सूचनाएँ चालू होने पर वही पाठ साथी को Telegram पर भेजा जाता है। वयस्क पुरुष और महिला के लिए एक साझा गतिविधि लिखें, दो अलग काम या भूमिका-अभिनय नहीं; दोनों को स्पष्ट रूप से शामिल करें। जुनून और हार्ड में दोनों को नामित यौन क्रिया में शामिल करें।",
    pt: "Modo a dois: ambos veem a mesma tarefa, que é enviada ao parceiro pelo Telegram quando as notificações estão ativadas. Crie uma atividade compartilhada para um homem e uma mulher adultos, não duas tarefas nem uma encenação; inclua claramente os dois na ação sexual nomeada.",
    es: "Modo en pareja: ambos ven la misma tarea y el mismo texto se envía a la pareja por Telegram si las notificaciones están activadas. Crea una actividad compartida para un hombre y una mujer adultos, no dos tareas ni una escena de rol; incluye claramente a ambos en el acto sexual nombrado.",
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
    ru: `Ты создаёшь одно задание для категории «СТРАСТЬ» — конкретный чувственный секс в гетеросексуальной паре мужчина–женщина.

Это секс, а не только прелюдия. В каждом задании назови конкретный акт: оральный секс, вагинальный секс или мастурбация партнёра в одиночном режиме / взаимная мастурбация в парном. Не заменяй его просьбой «скажи, чего хочешь», намёком, поцелуем, общей лаской или фразой «займитесь сексом». Выбери один акт и опиши его нежно, красиво и чувственно: прикосновения, медленный ритм, близость и взгляды.
Соблюдай анатомию и выполнимый порядок. Не обещай конкретную реакцию тела. Если упоминается оргазм, он обычно завершает задание; не добавляй после него следующий акт автоматически. Не добавляй реквизит, музыку или съёмку по умолчанию.

Создай оригинальное задание в духе примеров: 1–3 связанных шага, обычно 1–2 предложения, до ${MAX_TASK_CHARS} символов. Без шаблонных концовок и пояснений; верни только текст задания.`,
    en: `Create one task for the "PASSION" category: a concrete, sensual sexual act for a heterosexual man-woman couple.

This is sex, not just foreplay. Every task must name a specific act: oral sex, vaginal sex, or partner-directed masturbation in solo mode / mutual masturbation in together mode. Do not replace it with “say what you want,” a hint, a kiss, a general caress, or the vague phrase “have sex.” Choose one act and describe it tenderly and beautifully through touch, a slow rhythm, closeness, and eye contact.
Keep anatomy and order physically plausible. Do not guarantee a bodily response. If orgasm is mentioned, it usually ends the task; do not automatically add another act afterward. Do not add props, music, or filming by default.

Create an original task in the style of the examples: 1–3 connected steps, usually 1–2 sentences, up to ${MAX_TASK_CHARS} characters. Avoid formulaic endings and explanations; return only the task text.`,
  },
  hard: {
    ru: `Ты создаёшь одно задание для категории «ХАРД» — конкретный полноценный секс в более грязной и прямой подаче для гетеросексуальной пары мужчина–женщина.

В каждом задании обязательно назови конкретный телесный акт: оральный секс, вагинальный секс или мастурбацию партнёра в одиночном режиме / взаимную мастурбацию в парном. Приватная эротическая съёмка допустима только как дополнение к одному из этих действий и только если оба этого хотят; сама съёмка не заменяет сексуальный акт. Не выдавай задание только из разговоров о желании, просьбы «скажи, что хочешь», обещаний, поцелуев, общей ласки или фразы «делайте это». Опиши, что именно делают тела. Используй прямую лексику и немного грязных слов; хард не требует боли, принуждения или опасных действий.
Соблюдай анатомию и последовательность. Если предлагаешь эротическую съёмку, видео остаётся личным: не предлагай отправлять или публиковать его. Это короткая карточка, не ролевая сцена: без персонажей, сюжета и длинных реплик.

Создай оригинальное задание в духе примеров: одно действие или 1–3 тесно связанных шага, обычно 1–2 предложения, до ${MAX_TASK_CHARS} символов. Верни только текст задания.`,
    en: `Create one task for the "HARD" category: a concrete full sexual act for a heterosexual man-woman couple, in a dirtier and more direct style than "PASSION".

Every task must name a specific physical act: oral sex, vaginal sex, or partner-directed masturbation in solo mode / mutual masturbation in together mode. Private erotic filming may only be added to one of those acts if both want it; filming alone does not replace the sexual act. Do not make the task only about talking about desire, asking “what do you want,” promising, kissing, general caresses, or saying “do it.” State exactly what the bodies do. Use direct wording and a little dirty talk; hard does not mean pain, coercion, or danger.
Keep anatomy and sequence plausible. If erotic filming appears, keep the video private and never suggest sending or posting it. This is a short task, not a roleplay scene: no characters, plot, or long dialogue.

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
      "медленный оральный секс с долгими поцелуями и нежным зрительным контактом",
      "вагинальный секс в мягком ритме с одной красивой сменой положения",
      "взаимная мастурбация руками с ласковым чередованием прикосновений",
      "оральные ласки с нежными словами и вниманием к реакции партнёра",
      "вагинальный секс с медленным ритмом и близкими объятиями",
      "взаимная мастурбация с одним партнёром, который нежно задаёт темп",
    ],
    en: [
      "slow oral sex with lingering kisses and tender eye contact",
      "vaginal sex at a gentle pace with one graceful change of position",
      "mutual hand masturbation with affectionate, alternating touch",
      "oral caresses with tender words and attention to the partner's response",
      "vaginal sex at a slow pace, holding each other close",
      "mutual masturbation with one partner gently setting the rhythm",
    ],
  },
  hard: {
    ru: [
      "прямой оральный секс с грязными словами о том, что каждый делает",
      "энергичный вагинальный секс, где один задаёт темп, а второй направляет движения",
      "взаимная мастурбация с откровенными словами и быстрым чередованием ролей",
      "приватная эротическая съёмка взаимной мастурбации, только если оба этого хотят",
      "оральный секс с одним конкретным действием и прямой грязной репликой",
      "вагинальный секс с интенсивным ритмом и одной сменой положения",
    ],
    en: [
      "direct oral sex with dirty talk naming what each person is doing",
      "vigorous vaginal sex with one partner setting the pace and the other guiding the movement",
      "mutual masturbation with blunt dirty talk and a quick role reversal",
      "private erotic filming of mutual masturbation, only if both want it",
      "oral sex built around one specific act and one blunt, dirty line",
      "vaginal sex at an intense pace with one change of position",
    ],
  },
};

const SOLO_VARIATION_FOCI: Record<string, { ru: string[]; en: string[] }> = {
  passion: {
    ru: [
      "медленный оральный секс с партнёром, который получает нежные ласки",
      "веди мягкий вагинальный секс с партнёром, подстраивая ритм по его реакции",
      "мастурбируй партнёру руками в нежном темпе",
      "оральный секс с долгими поцелуями и вниманием к реакции партнёра",
      "вагинальный секс с медленной сменой позиции, которую ведёт пользователь",
      "ручная мастурбация партнёра с мягкой сменой прикосновений",
    ],
    en: [
      "slow oral sex given to the partner, with tender attention to their response",
      "lead gentle vaginal sex with your partner and adjust the rhythm to their response",
      "masturbate your partner by hand at a tender pace",
      "oral sex with lingering kisses and attention to the partner's reaction",
      "vaginal sex with the user leading one slow change of position",
      "hand masturbation of the partner with a gentle change of touch",
    ],
  },
  hard: {
    ru: [
      "прямой оральный секс с короткой грязной фразой о действии",
      "энергичный вагинальный секс с жёстким ритмом, который задаёт пользователь",
      "ручная мастурбация партнёра с прямым грязным разговором",
      "приватная съёмка порно, пока пользователь мастурбирует партнёра, только если партнёр тоже хочет",
      "грязный прямой оральный секс с партнёром",
      "мастурбируй партнёру руками в интенсивном ритме",
    ],
    en: [
      "direct oral sex with a short dirty line naming the act",
      "vigorous vaginal sex with the user setting a firm pace",
      "hand masturbation of the partner with blunt dirty talk",
      "private porn filming while you masturbate your partner, only if your partner also wants it",
      "direct, dirty oral sex with the partner",
      "masturbate your partner by hand at an intense pace",
    ],
  },
};

function getVariationInstruction(category: string, lang: string, requestId: string, mode: TaskMode): string {
  const focuses = mode === "solo"
    ? SOLO_VARIATION_FOCI[category] ?? VARIATION_FOCI[category]
    : VARIATION_FOCI[category];
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
        const systemPrompt = `${getPrompt(category, lang)}\n\n${MODE_INSTRUCTIONS[mode][lang]}\n\n${getVariationInstruction(category, lang, requestId, mode)}\n\n${roleInstruction}\n\n${getTaskQualityRules(lang, mode)}\n\n${LANGUAGE_INSTRUCTIONS[lang]}`;
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
          && (!["passion", "hard"].includes(category) || hasConcreteSexualAct(candidate, lang))
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
