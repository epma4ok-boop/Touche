// api/tasks/generate.ts
// POST /api/tasks/generate
// Body: { category, lang, gender? }

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { randomUUID } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { validateTelegramInitData } from "../couple/_auth.js";
import { appDate } from "../limits.js";
import { claimFriendInvite } from "../referrals/_claim.js";
import { getTaskQualityRules, getTaskVariationTag, hasAnatomicallyClearOralAct, hasConcreteSexualAct, hasHardSexualAct, isSharedTaskText, isTaskTextModeAppropriate, isTaskTextWellFormed, isTaskVariationTag, type TaskVariationTag } from "../../src/data/task-quality.js";
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
      "По очереди водите вибратором прямо по гениталиям партнёра, повышая интенсивность и прямо называя свои действия.",
      "Доводите друг друга до края пальцами, останавливайтесь перед оргазмом, а затем возобновляйте стимуляцию в более быстром ритме.",
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
      "Take turns pressing a vibrator directly against each other's genitals, increasing the intensity as you name what you are doing.",
      "Take turns bringing each other close to orgasm with your fingers, stopping just before it and resuming with a firmer rhythm.",
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
      "बारी-बारी से वाइब्रेटर को एक-दूसरे के जननांगों पर चलाएँ, तीव्रता बढ़ाते हुए सीधे बताएं कि क्या कर रहे हैं।",
      "बारी-बारी से उंगलियों से साथी के जननांगों को उत्तेजित करें, लय तेज़ करें और चरमोत्कर्ष से ठीक पहले रुकें।",
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
      "Revezem-se usando um vibrador diretamente nos genitais um do outro, aumentando a intensidade enquanto dizem claramente o que fazem.",
      "Levem um ao outro até perto do orgasmo com os dedos, parem antes do clímax e retomem com um ritmo mais firme.",
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
      "Por turnos, pasen un vibrador directamente por los genitales del otro, aumentando la intensidad mientras nombran lo que hacen.",
      "Por turnos, cada uno estimula los genitales del otro con los dedos, aumenta el ritmo y se detiene justo antes del orgasmo.",
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
      "При встрече води вибратором прямо по гениталиям партнёра, постепенно усиливай стимуляцию и прямо называй, что делаешь.",
      "Доведи партнёра до края пальцами, остановись перед оргазмом, затем возобнови стимуляцию в более быстром ритме.",
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
      "Press a vibrator directly against your partner's genitals, increase the intensity, and say plainly what you are doing.",
      "Bring your partner close to orgasm with your fingers, stop just before it, then resume with a firmer rhythm.",
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
      "अपने साथी के जननांगों पर वाइब्रेटर चलाएँ, तीव्रता बढ़ाएँ और सीधे बताएं कि आप क्या कर रहे हैं।",
      "उंगलियों से अपने साथी के जननांगों को उत्तेजित करें, लय तेज़ करें और चरमोत्कर्ष से ठीक पहले रुकें।",
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
      "Pressione um vibrador diretamente contra os genitais do seu par, aumente a intensidade e diga sem rodeios o que está fazendo.",
      "Leve seu par ao limite com os dedos, pare antes do orgasmo e retome a estimulação em um ritmo mais firme.",
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
      "Presiona un vibrador directamente contra los genitales de tu pareja, aumenta la intensidad y di sin rodeos lo que haces.",
      "Lleva a tu pareja al límite con los dedos, detente antes del orgasmo y retoma la estimulación con un ritmo más firme.",
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
  ru: /(?:без\s+согласия|игнорир\w*\s+(?:отказ|боль)|не\s+может\s+(?:двигаться|отказаться)|не\s+двигается|не\s+(?:двигайся|шевелись|двигаться)|не\s+слышат\s+и\s+не\s+видят|делай\s+что\s+хочешь|без\s+вопросов|подчин\w*\s+без|застав\w*|принуд\w*|удуш\w*|души\s|не\s+спрашивай|насиль\w*)/iu,
  en: /(?:without consent|can't (?:move|refuse)|cannot (?:move|refuse)|at their mercy|do whatever you want|don't move|do not move|stay still|obey without question|can't hear (?:or|and) see|force(?:d)?|coerc|chok|strangl|ignore (?:their )?(?:no|stop|pain)|don't ask)/iu,
  hi: /(?:सहमति के बिना|हिल नहीं सकता|हिल नहीं सकती|हिलते नहीं|न\s+हिलें|न\s+हिलना|मत\s+हिलो|बिना\s+सवाल.*(?:मान|आज्ञा)|जो चाहो करो|जबरदस्ती|ज़बरदस्ती|मना करने पर भी|गला घोंट|दर्द की अनदेखी)/u,
  pt: /(?:sem consentimento|não pode se mover|não consegue se mexer|não\s+se\s+(?:mova|mex\w*)|ordene\w*.{0,40}não\s+se\s+mova|obedeç\w*\s+sem\s+question\w*|à mercê|faça o que quiser|forç\w*|coag\w*|estrang\w*|ignore.*(?:não|pare|dor))/iu,
  es: /(?:sin consentimiento|no puede moverse|no puede negarse|no\s+te\s+muevas|que\s+no\s+se\s+mueva|ordena\w*.{0,40}no\s+se\s+mueva|obedec\w*\s+sin\s+cuestionar|a su merced|haz lo que quieras|forz\w*|coaccion\w*|estrang\w*|ignora.*(?:no|para|dolor))/iu,
};

const SEXUAL_FILMING_MARKERS: Record<string, RegExp> = {
  ru: /(?:порно|видеосъ[её]м|видео|съ[её]мк\p{L}*|сним\p{L}*\s+(?:видео|сцену))/iu,
  en: /(?:porn|video|filming|film|recording|record)/iu,
  hi: /(?:पोर्न|वीडियो|रिकॉर्ड\p{L}*|फ़िल्म|फिल्म)/u,
  pt: /(?:porn[oô]|vídeo|filmagem|gravaç\p{L}*|grav\p{L}*\s+(?:vídeo|cena))/iu,
  es: /(?:porno|vídeo|video|filmación|grabaci\p{L}*|grab\p{L}*\s+(?:vídeo|video|escena))/iu,
};

const FILMING_CONSENT_MARKERS: Record<string, RegExp> = {
  ru: /(?:оба\s+(?:этого\s+)?хотят|если\s+оба|по\s+взаимному\s+согласию|согласовав|оба\s+согласны)/iu,
  en: /(?:both\s+(?:want|agree|consent)|if\s+you\s+both|with\s+(?:their|your\s+partner's)\s+consent|agreed\s+(?:together|boundaries))/iu,
  hi: /(?:अगर\s+आप\s+दोनों\s+चाहें|दोनों\s+सहमत|आपसी\s+सहमति|सहमति\s+से)/u,
  pt: /(?:se\s+vocês\s+dois\s+quiserem|se\s+ambos\s+quiserem|com\s+consentimento\s+mútuo|com\s+o\s+consentimento\s+do\s+par)/iu,
  es: /(?:si\s+ambos\s+quieren|si\s+los\s+dos\s+quieren|con\s+consentimiento\s+mutuo|con\s+el\s+consentimiento\s+de\s+la\s+pareja)/iu,
};

const PRIVATE_FILMING_MARKERS: Record<string, RegExp> = {
  ru: /(?:личн\p{L}*\s+коллекц\p{L}*|приватн\p{L}*|не\s+(?:отправля|публику|делись)|только\s+себе)/iu,
  en: /(?:private|personal\s+collection|keep\s+it\s+to\s+yourself|do\s+not\s+share|never\s+share|don't\s+share|do\s+not\s+post|never\s+post)/iu,
  hi: /(?:निजी|केवल\s+अपने\s+लिए|साझा\s+न\s+करें|किसी\s+से\s+साझा\s+नहीं)/u,
  pt: /(?:privad\p{L}*|coleção\s+pessoal|não\s+compartilh\p{L}*|não\s+publiqu\p{L}*|somente\s+para\s+vocês)/iu,
  es: /(?:privad\p{L}*|colección\s+personal|no\s+compart\p{L}*|no\s+publiqu\p{L}*|solo\s+para\s+ustedes)/iu,
};

function isTaskExampleMediaAllowed(task: string, category: string, lang: string): boolean {
  const mediaMarkers = EXAMPLE_MEDIA_MARKERS[lang] ?? EXAMPLE_MEDIA_MARKERS.en;
  if (!mediaMarkers.test(task) || category === "compliments") return true;
  if (category !== "hard" || !(SEXUAL_FILMING_MARKERS[lang] ?? SEXUAL_FILMING_MARKERS.en).test(task)) return false;
  return hasHardSexualAct(task, lang)
    && (FILMING_CONSENT_MARKERS[lang] ?? FILMING_CONSENT_MARKERS.en).test(task)
    && (PRIVATE_FILMING_MARKERS[lang] ?? PRIVATE_FILMING_MARKERS.en).test(task);
}

function hasCategorySexualAct(task: string, category: string, lang: string): boolean {
  if (category === "hard") return hasHardSexualAct(task, lang);
  if (category === "passion") return hasConcreteSexualAct(task, lang);
  return true;
}

function getTaskExamples(category: string, lang: string, requestId: string, mode: TaskMode, gender: string): string[] {
  const sourcePool = category === "hard"
    ? [...(SOURCE_TASKS[lang]?.hard ?? []), ...(SOURCE_TASKS[lang]?.passion ?? [])]
    : SOURCE_TASKS[lang]?.[category] ?? [];
  const fallbackPool = mode === "solo"
    ? SOLO_SEXUAL_FALLBACKS[lang]?.[category as "passion" | "hard"] ?? []
    : DAILY_TASK_FALLBACKS[lang]?.[category] ?? [];
  const unsafeMarkers = UNSAFE_TASK_MARKERS[lang] ?? UNSAFE_TASK_MARKERS.en;
  const eligibleSource = sourcePool.filter((example) =>
    isTaskTextWellFormed(example, lang)
    && !unsafeMarkers.test(example)
    && (category !== "hard" || hasHardSexualAct(example, lang))
    && isTaskExampleMediaAllowed(example, category, lang)
    && hasAnatomicallyClearOralAct(example, lang, mode, gender === "female" ? "female" : "male")
  );
  const modeMatched = eligibleSource.filter((example) => isTaskTextModeAppropriate(example, lang, mode));
  const modeAdapted = eligibleSource.filter((example) => !isTaskTextModeAppropriate(example, lang, mode));
  const eligibleFallbacks = fallbackPool.filter((example) =>
    isTaskTextWellFormed(example, lang, mode)
    && !unsafeMarkers.test(example)
    && hasCategorySexualAct(example, category, lang)
    && isTaskTextModeAppropriate(example, lang, mode)
    && isTaskExampleMediaAllowed(example, category, lang)
    && hasAnatomicallyClearOralAct(example, lang, mode, gender === "female" ? "female" : "male")
  );
  const seed = hashSeed(`${requestId}:${lang}:${category}:examples`);
  const matchedOrder = seededShuffle(modeMatched, seed);
  const ordered = [
    ...matchedOrder.slice(0, 8),
    ...seededShuffle(modeAdapted, seed ^ 0x5f3759df),
    ...matchedOrder.slice(8),
    ...seededShuffle(eligibleFallbacks, seed ^ 0x1b873593),
  ];
  const examples: string[] = [];
  const familyCounts = new Map<string, number>();
  for (const candidate of ordered) {
    const family = getTaskVariationTag(candidate, lang) ?? "unclassified";
    if ((familyCounts.get(family) ?? 0) >= (family === "unclassified" ? 3 : 2)) continue;
    const candidateWords = new Set(candidate.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) ?? []);
    const tooSimilar = examples.some((selected) => {
      const selectedWords = new Set(selected.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) ?? []);
      const intersection = [...candidateWords].filter((word) => selectedWords.has(word)).length;
      const union = new Set([...candidateWords, ...selectedWords]).size;
      return union > 0 && intersection / union > 0.55;
    });
    if (!tooSimilar) {
      examples.push(candidate);
      familyCounts.set(family, (familyCounts.get(family) ?? 0) + 1);
    }
    if (examples.length === 14) break;
  }
  return examples;
}

function getTaskExamplesPrompt(category: string, lang: string, requestId: string, mode: TaskMode, gender: string): string {
  const examples = getTaskExamples(category, lang, requestId, mode, gender);
  if (examples.length === 0) return "";
  const intro: Record<string, string> = {
    ru: "Ниже — разнообразные примеры из большого исходного списка этой категории. Используй сами идеи, не копируй формулировки. Часть примеров может быть написана для другого режима: перепиши роли строго по инструкции solo/together.",
    en: "Below are varied examples from the large original list for this category. Use the ideas, not the wording. Some examples may use a different mode; rewrite the roles to follow the solo/together instructions exactly.",
    hi: "नीचे इस श्रेणी की बड़ी मूल सूची से विविध उदाहरण हैं। विचार लें, शब्दशः न दोहराएँ। कुछ उदाहरण दूसरे मोड के हो सकते हैं; भूमिकाएँ चुने हुए मोड के अनुसार बदलें।",
    pt: "Abaixo estão exemplos variados da lista original extensa desta categoria. Use as ideias, não a redação. Alguns podem ter outro modo; adapte os papéis às instruções de solo/a dois.",
    es: "A continuación hay ejemplos variados de la lista original amplia de esta categoría. Usa las ideas, no copies el texto. Algunos pueden usar otro modo; adapta los papeles a las instrucciones individual/en pareja.",
  };
  const hardIntro: Record<string, string> = {
    ru: "Примеры ниже отобраны из больших списков «Страсть» и «Хард» по конкретным сексуальным действиям; некоторые формулировки могут быть мягче нужного тона. Используй их для разнообразия, но в каждом задании назови прямой сексуальный акт. Нагота, лежание, раздевание, поцелуи и общие ласки могут быть только дополнительными деталями.",
    en: "These examples are selected from the large Passion and Hard lists for their concrete sexual actions; some may use a softer tone. Use them for variety, but name a direct sexual act in every task. Nudity, lying together, undressing, kissing, and general caresses may only be supporting details.",
    hi: "ये उदाहरण बड़े जुनून और हार्ड संग्रह से ठोस यौन क्रियाओं के आधार पर चुने गए हैं; कुछ का स्वर अपेक्षाकृत नरम हो सकता है। विविधता लें, लेकिन हर काम में स्पष्ट यौन क्रिया बताएं। नग्नता, साथ लेटना, कपड़े उतारना, चूमना और सामान्य सहलाना केवल अतिरिक्त विवरण हो सकते हैं।",
    pt: "Estes exemplos foram selecionados das listas extensas de Paixão e hard por suas ações sexuais concretas; alguns podem ter um tom mais suave. Use-os para variar, mas nomeie um ato sexual direto em cada tarefa. Nudez, ficar deitado junto, tirar a roupa, beijar e carícias gerais só podem ser detalhes adicionais.",
    es: "Estos ejemplos se seleccionaron de las amplias listas de Pasión y hard por sus acciones sexuales concretas; algunos pueden tener un tono más suave. Úsalos para variar, pero nombra un acto sexual directo en cada tarea. La desnudez, tumbarse juntos, quitarse la ropa, besarse y las caricias generales solo pueden ser detalles secundarios.",
  };
  return `${category === "hard" ? hardIntro[lang] ?? hardIntro.en : intro[lang] ?? intro.en}\n${examples.map((example, index) => `${index + 1}. ${example}`).join("\n")}`;
}

function getFallback(
  cat: string,
  lang: string,
  mode: TaskMode,
  requestId: string,
  gender: string,
  recentVariationTags: TaskVariationTag[],
): string {
  const sourceTasks = SOURCE_TASKS[lang]?.[cat] ?? [];
  const fallbackTasks = mode === "solo"
    ? SOLO_SEXUAL_FALLBACKS[lang]?.[cat as "passion" | "hard"] ?? []
    : (DAILY_TASK_FALLBACKS[lang] ?? DAILY_TASK_FALLBACKS.en)[cat] ?? [];
  const unsafeMarkers = UNSAFE_TASK_MARKERS[lang] ?? UNSAFE_TASK_MARKERS.en;
  const wellFormed = [...sourceTasks, ...fallbackTasks].filter((task) =>
    isTaskTextWellFormed(task, lang, mode)
    && !unsafeMarkers.test(task)
    && isTaskTextModeAppropriate(task, lang, mode)
    && hasCategorySexualAct(task, cat, lang)
    && isTaskExampleMediaAllowed(task, cat, lang)
    && hasAnatomicallyClearOralAct(task, lang, mode, gender === "female" ? "female" : "male")
  );
  if (wellFormed.length === 0) {
    throw new Error(`No valid ${mode}-task fallback for ${lang}/${cat}`);
  }
  const fresh = wellFormed.filter((task) => {
    const tag = getTaskVariationTag(task, lang);
    return !tag || !recentVariationTags.includes(tag);
  });
  const candidates = fresh.length > 0 ? fresh : wellFormed;
  return seededShuffle(candidates, hashSeed(`${requestId}:${lang}:${cat}:${mode}:fallback`))[0];
}

function getGenderLine(lang: string, gender: string): string {
  const map: Record<string, Record<string, string>> = {
    ru: {
      male: "Пара совершеннолетняя и гетеросексуальная: пользователь — мужчина, партнёрша — женщина. Обращайся к пользователю на «ты», называй партнёршу в женском роде. Если в режиме solo выбрано оральное действие, мужчина выполняет куннилингус партнёрше — ласкает её вульву или клитор языком; не предлагай мужчине делать минет партнёру. В together точно называй получателя и анатомию. Не пиши неоднозначное «куни/минет».",
      female: "Пара совершеннолетняя и гетеросексуальная: пользователь — женщина, партнёр — мужчина. Обращайся к пользователю на «ты», называй партнёра в мужском роде. Если в режиме solo выбрано оральное действие, женщина делает минет партнёру — ласкает его пенис ртом; не предлагай женщине делать куннилингус мужчине. В together точно называй получателя и анатомию. Не пиши неоднозначное «куни/минет».",
    },
    en: {
      male: "This is an adult heterosexual couple: the user is a man and the partner is a woman. Address the user as 'you' and refer to the partner as she/her. For an oral act in solo mode, the man performs cunnilingus on her vulva or clitoris; do not assign fellatio to the male user. In together mode, name the recipient and anatomy precisely. Never write an ambiguous 'cunnilingus/blow job' choice.",
      female: "This is an adult heterosexual couple: the user is a woman and the partner is a man. Address the user as 'you' and refer to the partner as he/him. For an oral act in solo mode, the woman performs fellatio on his penis; do not assign cunnilingus to the female user. In together mode, name the recipient and anatomy precisely. Never write an ambiguous 'cunnilingus/blow job' choice.",
    },
    hi: {
      male: "यह वयस्क विषमलैंगिक जोड़ा है: उपयोगकर्ता पुरुष और साथी महिला है। अकेले वाले मोड में ओरल क्रिया हो तो पुरुष महिला की योनि या भगांकुर को जीभ से सहलाए; पुरुष उपयोगकर्ता को मुखमैथुन पाने वाला न लिखें। साथ वाले मोड में किसे क्रिया मिल रही है और शरीर का हिस्सा स्पष्ट लिखें। भूमिकाएँ और शरीर-संबंधी विवरण पूरे कार्य में स्थिर रखें।",
      female: "यह वयस्क विषमलैंगिक जोड़ा है: उपयोगकर्ता महिला और साथी पुरुष है। अकेले वाले मोड में ओरल क्रिया हो तो महिला पुरुष के लिंग पर मुखमैथुन करे; महिला उपयोगकर्ता को पुरुष पर योनि-संबंधी क्रिया करते न लिखें। साथ वाले मोड में किसे क्रिया मिल रही है और शरीर का हिस्सा स्पष्ट लिखें। भूमिकाएँ और शरीर-संबंधी विवरण पूरे कार्य में स्थिर रखें।",
    },
    pt: {
      male: "Este é um casal adulto e heterossexual: o usuário é homem e a parceira é mulher. Trate o usuário por 'você'. No modo solo, se houver sexo oral, o homem faz cunnilingus na vulva ou no clitóris dela; não atribua fellatio ao usuário homem. No modo a dois, nomeie claramente quem recebe a ação e a anatomia. Nunca use a opção ambígua 'cunnilingus/boquete'.",
      female: "Este é um casal adulto e heterossexual: a usuária é mulher e o parceiro é homem. Trate a usuária por 'você'. No modo solo, se houver sexo oral, a mulher faz fellatio no pênis dele; não atribua cunnilingus ao usuário mulher. No modo a dois, nomeie claramente quem recebe a ação e a anatomia. Nunca use a opção ambígua 'cunnilingus/boquete'.",
    },
    es: {
      male: "Es una pareja adulta y heterosexual: el usuario es hombre y su pareja es mujer. En modo individual, si hay sexo oral, el hombre hace cunnilingus en la vulva o el clítoris de ella; no asignes felación al usuario hombre. En modo en pareja, nombra con precisión quién recibe la acción y la anatomía. No uses la opción ambigua «cunnilingus/felación».",
      female: "Es una pareja adulta y heterosexual: la usuaria es mujer y su pareja es hombre. En modo individual, si hay sexo oral, la mujer hace felación en el pene de él; no asignes cunnilingus a la usuaria. En modo en pareja, nombra con precisión quién recibe la acción y la anatomía. No uses la opción ambigua «cunnilingus/felación».",
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
    ru: "Парный режим: одно и то же задание показывается обоим и при включённых уведомлениях отправляется партнёру в Telegram. Создай одно совместное действие для совершеннолетних мужчины и женщины, а не два отдельных задания и не ролевую сцену. Обращайся к обоим во множественном числе; явно укажи, что делают оба. В «Страсти» и «Харде» включи обоих в конкретный сексуальный акт. Взаимная мастурбация — допустимое общее задание: прямо назови её и укажи, что оба ласкают друг друга руками; не своди её к действию только одного.",
    en: "Together mode: both partners see the same task, and the identical text is sent to the partner in Telegram when notifications are enabled. Create one shared activity for an adult man and woman, not two separate tasks or roleplay. Address both, explicitly include both in the action, and make both part of the named sexual act in Passion and Hard. Mutual masturbation is a valid shared task: name it clearly and state that both use their hands on each other; do not reduce it to a one-person action.",
    hi: "साथी मोड: दोनों को एक ही काम दिखता है और सूचनाएँ चालू होने पर वही पाठ साथी को Telegram पर भेजा जाता है। वयस्क पुरुष और महिला के लिए एक साझा गतिविधि लिखें, दो अलग काम या भूमिका-अभिनय नहीं; दोनों को स्पष्ट रूप से शामिल करें। जुनून और हार्ड में दोनों को नामित यौन क्रिया में शामिल करें। आपसी हस्तमैथुन भी एक मान्य साझा काम है: इसे स्पष्ट रूप से नाम दें और लिखें कि दोनों एक-दूसरे को हाथों से सहलाते हैं।",
    pt: "Modo a dois: ambos veem a mesma tarefa, que é enviada ao parceiro pelo Telegram quando as notificações estão ativadas. Crie uma atividade compartilhada para um homem e uma mulher adultos, não duas tarefas nem uma encenação; inclua claramente os dois na ação sexual nomeada. Masturbação mútua é uma tarefa compartilhada válida: nomeie-a claramente e diga que ambos usam as mãos um no outro.",
    es: "Modo en pareja: ambos ven la misma tarea y el mismo texto se envía a la pareja por Telegram si las notificaciones están activadas. Crea una actividad compartida para un hombre y una mujer adultos, no dos tareas ni una escena de rol; incluye claramente a ambos en el acto sexual nombrado. La masturbación mutua es una tarea compartida válida: nómbrala claramente e indica que ambos se acarician con las manos.",
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

Большой список заданий этой категории — основной источник разнообразия. Не своди её только к оральному/вагинальному сексу и мастурбации: используй и другие конкретные сексуальные действия и варианты из примеров — стимуляцию, ласки чувствительных зон, позиции, контроль ритма, раздевание и игру с ощущениями. Сохраняй категорию именно сексуальной: один поцелуй, общий массаж или разговор о желании сами по себе недостаточны. Возьми одно центральное действие или несколько тесно связанных действий и опиши их нежно, красиво и чувственно.
Соблюдай анатомию и выполнимый порядок. Не обещай конкретную реакцию тела. Если упоминается оргазм, он обычно завершает задание; не добавляй после него следующий акт автоматически. Не добавляй реквизит, музыку или съёмку по умолчанию.

Создай оригинальное задание, опираясь на разные идеи в переданных примерах, но не копируя их. 1–3 связанных шага, обычно 1–2 предложения, до ${MAX_TASK_CHARS} символов. Без шаблонных концовок и пояснений; верни только текст задания.`,
    en: `Create one task for the "PASSION" category: a concrete, sensual sexual act for a heterosexual man-woman couple.

The large supplied task list is the main source of variety. Do not reduce the category to oral/vaginal sex and masturbation: use the other concrete sexual actions and variations in the examples too, such as stimulation, sensitive-body-area play, positions, pace control, undressing, and sensory play. Keep the task clearly sexual: a kiss, general massage, or talk about desire alone is not enough. Choose one central action or a few closely connected actions and describe them tenderly and beautifully.
Keep anatomy and order physically plausible. Do not guarantee a bodily response. If orgasm is mentioned, it usually ends the task; do not automatically add another act afterward. Do not add props, music, or filming by default.

Create an original task based on varied ideas from the supplied examples without copying them: 1–3 connected steps, usually 1–2 sentences, up to ${MAX_TASK_CHARS} characters. Avoid formulaic endings and explanations; return only the task text.`,
  },
  hard: {
    ru: `Ты создаёшь одно задание для категории «ХАРД» — конкретное полноценное сексуальное действие в более грязной и прямой подаче для гетеросексуальной пары мужчина–женщина.

Используй весь диапазон больших исходных списков, а не только оральный/вагинальный секс и мастурбацию: называй конкретный сексуальный акт, прямую стимуляцию гениталий или проникновение, добавляя другие действия и детали из примеров. Не считай заданием наготу, совместное лежание, раздевание, поцелуи, общий массаж, разговоры или съёмку без конкретного сексуального действия. Более мягкие идеи допустимы только как детали к прямому сексуальному акту. Съёмка порно допустима только вместе с конкретным сексуальным телесным действием и только если оба этого хотят; одна съёмка не заменяет действие. Используй прямую лексику и немного грязных слов; хард не требует боли, принуждения или опасных действий.
Соблюдай анатомию и последовательность. Если предлагаешь эротическую съёмку, видео остаётся личным: не предлагай отправлять или публиковать его. Это короткая карточка, не ролевая сцена: без персонажей, сюжета и длинных реплик.

Создай оригинальное задание, используя разные идеи из переданных примеров, но не копируя их: одно действие или 1–3 тесно связанных шага, обычно 1–2 предложения, до ${MAX_TASK_CHARS} символов. Верни только текст задания.`,
    en: `Create one task for the "HARD" category: a concrete full sexual act for a heterosexual man-woman couple, in a dirtier and more direct style than "PASSION".

Use the full range of the large supplied task lists, not only oral/vaginal sex and masturbation: name a concrete sexual act, direct genital stimulation, or penetration, and draw on other actions and details from the examples. Nudity, lying together, undressing, kissing, general massage, talk, or filming without a concrete sexual act do not qualify. Lighter ideas may only support a direct sexual act, never replace it. Porn filming is allowed only alongside a concrete physical sexual act and only if both want it; filming alone does not replace the act. Keep it private. Do not make a task only about talking about desire, asking “what do you want,” promising, one kiss, general caresses, or saying “do it.” State the physical action. Use direct wording and a little dirty talk; hard does not mean pain, coercion, or danger.
Keep anatomy and sequence plausible. If erotic filming appears, keep the video private and never suggest sending or posting it. This is a short task, not a roleplay scene: no characters, plot, or long dialogue.

Create an original task from varied ideas in the supplied examples without copying them: one action or 1–3 closely connected steps, usually 1–2 sentences, up to ${MAX_TASK_CHARS} characters. Return only the task text.`,
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
};

function getVariationInstruction(
  category: string,
  lang: string,
  requestId: string,
  mode: TaskMode,
  gender: string,
  recentVariationTags: TaskVariationTag[],
): string {
  const examples = getTaskExamples(category, lang, requestId, mode, gender);
  const firstExampleByFamily = new Map<TaskVariationTag, number>();
  examples.forEach((example, index) => {
    const tag = getTaskVariationTag(example, lang);
    if (tag && !firstExampleByFamily.has(tag)) firstExampleByFamily.set(tag, index + 1);
  });
  const allFamilies = [...firstExampleByFamily.entries()].map(([tag, exampleNumber]) => ({ tag, exampleNumber }));
  const freshFamilies = allFamilies.filter(({ tag }) => !recentVariationTags.includes(tag));
  const choices = freshFamilies.length > 0 ? freshFamilies : allFamilies;
  if (choices.length > 0) {
    const focus = seededShuffle(choices, hashSeed(`${requestId}:${lang}:${category}:${mode}:focus`))[0];
    const directions: Record<string, string> = {
      ru: `Для разнообразия возьми центральную идею из примера №${focus.exampleNumber} в списке ниже, но не копируй его слова. Выбери только эту тему и добавь свежую конкретную деталь.`,
      en: `For variety, use the central idea from example #${focus.exampleNumber} in the list below, but do not copy its wording. Choose only that theme and add one fresh concrete detail.`,
      hi: `विविधता के लिए नीचे दी गई सूची के उदाहरण ${focus.exampleNumber} का मुख्य विचार लें, लेकिन उसके शब्द न दोहराएँ। उसी विषय को चुनें और एक नया ठोस विवरण जोड़ें।`,
      pt: `Para variar, use a ideia central do exemplo ${focus.exampleNumber} da lista abaixo, sem copiar as palavras. Escolha apenas esse tema e acrescente um detalhe concreto novo.`,
      es: `Para variar, usa la idea central del ejemplo ${focus.exampleNumber} de la lista, sin copiar sus palabras. Elige solo ese tema y añade un detalle concreto nuevo.`,
    };
    return directions[lang] ?? directions.en;
  }

  const focuses = VARIATION_FOCI[category];
  if (!focuses) return "";
  const options = lang === "ru" ? focuses.ru : focuses.en;
  const focus = seededShuffle(options, hashSeed(`${requestId}:${lang}:${category}:fallback-focus`))[0];
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
  const gender = String(body.gender ?? "");
  const mode = String(body.mode ?? "solo");
  const coupleId = typeof body.coupleId === "string" ? body.coupleId : null;
  if (!CATEGORIES.has(category)) return res.status(400).json({ error: "invalid_category" });
  if (!LANGS.has(lang) || !GENDERS.has(gender) || !isTaskMode(mode)) return res.status(400).json({ error: "invalid_generation_options" });
  if (body.requestId !== undefined && (typeof body.requestId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.requestId))) {
    return res.status(400).json({ error: "invalid_request_id" });
  }
  const requestId: string = body.requestId ?? randomUUID();
  const rawVariationTags: unknown[] = Array.isArray(body.recentVariationTags) ? body.recentVariationTags : [];
  const recentVariationTags: TaskVariationTag[] = [...new Set(
    rawVariationTags.filter((tag): tag is TaskVariationTag => isTaskVariationTag(tag)),
  )].slice(0, 12);
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

  let task = getFallback(category, lang, mode, requestId, gender, recentVariationTags);
  let source: "ai" | "fallback" = "fallback";
  if (DEEPSEEK_API_KEY) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12_000);
    try {
        const roleInstruction = getGenderLine(lang, gender);
        const systemPrompt = `${getPrompt(category, lang)}\n\n${MODE_INSTRUCTIONS[mode][lang]}\n\n${getVariationInstruction(category, lang, requestId, mode, gender, recentVariationTags)}\n\n${roleInstruction}\n\n${getTaskQualityRules(lang, mode)}\n\n${LANGUAGE_INSTRUCTIONS[lang]}`;
      const aiRes = await fetch(DEEPSEEK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${DEEPSEEK_API_KEY}` },
        signal: controller.signal,
        body: JSON.stringify({ model: "deepseek-chat", messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: [
            LANGUAGE_INSTRUCTIONS[lang],
            getTaskExamplesPrompt(category, lang, requestId, mode, gender),
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
          && hasAnatomicallyClearOralAct(candidate, lang, mode, gender === "female" ? "female" : "male")
          && hasCategorySexualAct(candidate, category, lang)
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
