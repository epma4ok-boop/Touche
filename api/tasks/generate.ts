// api/tasks/generate.ts
// POST /api/tasks/generate
// Body: { category, lang, gender? }

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { randomUUID } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { validateTelegramInitData } from "../couple/_auth.js";
import { appDate, FREE_LIMIT } from "../limits.js";
import { claimFriendInvite } from "../referrals/_claim.js";
import { getTaskQualityRules, getTaskVariationTag, hasAnatomicallyClearOralAct, hasConcreteSexualAct, hasHardSexualAct, isManualStimulationTask, isTaskTextCategoryAppropriate, isSharedTaskText, isTaskTextModeAppropriate, isTaskTextWellFormed, isTaskVariationTag, type TaskVariationTag } from "../../src/data/task-quality.js";
import { TASK_REFERENCE_LIBRARY, type TaskReferenceExample } from "../../src/data/task-reference-library.js";
import { OWNER_TELEGRAM_ID } from "../../src/config.js";

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
type Lang = "ru" | "en" | "hi" | "pt" | "es";
type StaticPool = Record<string, string[]>;
const MAX_TASK_CHARS = 280;
const MANUAL_STIMULATION_WINDOW = 20;
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

function isManualStimulationAllowed(recentVariationTags: TaskVariationTag[]): boolean {
  const recent = recentVariationTags.slice(-(MANUAL_STIMULATION_WINDOW - 1));
  return recent.length === MANUAL_STIMULATION_WINDOW - 1
    && !recent.includes("manual_stimulation");
}

function getVariationTagAcrossLanguages(text: string, preferredLang: string): TaskVariationTag | null {
  const languages = [preferredLang, ...[...LANGS].filter((lang) => lang !== preferredLang)];
  for (const lang of languages) {
    const tag = getTaskVariationTag(text, lang);
    if (tag) return tag;
  }
  return null;
}

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
      "Вечером по очереди назовите одну черту партнёра, которую действительно цените. Добавьте реальный пример, только если он сам вспоминается; ничего не придумывайте.",
      "Каждый из вас отправьте партнёру короткое сообщение о том, что действительно цените в нём или ней сейчас.",
    ],
    tenderness: [
      "По очереди сделайте друг другу пятиминутный массаж плеч под любимую музыку.",
      "По очереди сделайте друг другу массаж рук с кремом, уделив внимание ладоням и каждому пальцу.",
      "Вместе выберите песню и станцуйте медленный танец без телефонов.",
    ],
    desire: [
      "В течение ближайших суток обменивайтесь короткими флиртующими сообщениями, а при встрече вместе остановитесь на одном долгом поцелуе.",
      "Когда останетесь вдвоём, по очереди прошепчите друг другу одну фразу о желании и ответьте на неё поцелуем поверх одежды.",
      "Обменяйтесь в течение дня парой игривых намёков, а вечером по очереди выберите, где оставить друг другу один нежный поцелуй.",
    ],
    passion: [
      "По очереди занимайтесь оральным сексом, не спеша целуя друг друга и сохраняя тёплый зрительный контакт.",
      "Займитесь проникающим сексом в медленном ритме: по очереди задавайте темп и оставайтесь близко друг к другу.",
      "По очереди мастурбируйте друг друга руками, меняя нежные прикосновения по реакции партнёра.",
    ],
    hard: [
      "По очереди занимайтесь оральным сексом и прямо, грязными словами называйте, что делаете друг с другом.",
      "Займитесь энергичным проникающим сексом: один задаёт жёсткий ритм, второй направляет движения руками; затем поменяйтесь ролями.",
      "Если оба хотите, снимите приватное порно, пока по очереди мастурбируете друг друга; оставьте видео только себе и никому не отправляйте.",
      "Доводите друг друга до края пальцами, останавливайтесь перед оргазмом, а затем возобновляйте стимуляцию в более быстром ритме.",
    ],
  },
  en: {
    compliments: [
      "Over the next day, take turns sending each other ordinary private selfies with specific compliment captions; keep every photo between the two of you.",
      "Tonight, each of you name one quality you genuinely appreciate in the other. Add a real example only if one comes to mind; do not invent one.",
      "Each of you send your partner a short note naming something you genuinely appreciate about them.",
    ],
    tenderness: [
      "Take turns giving each other a five-minute shoulder massage to a song you both love.",
      "Take turns giving each other a hand massage with lotion, working slowly across each palm and finger.",
      "Choose a song and take turns leading each other through one slow dance, phones away.",
    ],
    desire: [
      "Both of you trade a few flirty messages during the day, then pause at one lingering kiss when you meet.",
      "When alone together, take turns whispering one thing you want and answer each with a kiss over clothing.",
      "Exchange a couple of playful hints during the day, then both of you choose one place to leave each other a gentle kiss.",
    ],
    passion: [
      "Take turns giving each other oral sex slowly, with unhurried kisses and warm eye contact.",
      "Have penetrative sex at a gentle pace; trade control of the rhythm and stay close, looking into each other's eyes.",
      "Take turns masturbating each other by hand, keeping a tender rhythm and following each other's reactions.",
    ],
    hard: [
      "Take turns giving each other oral sex; say plainly, in dirty words, what you are doing and keep a firm pace.",
      "Have vigorous penetrative sex: one partner sets the rhythm while the other guides the movement with their hands.",
      "If you both want to, film private porn while taking turns masturbating each other; keep the video private and never share it.",
      "Take turns bringing each other close to orgasm with your fingers, stopping just before it and resuming with a firmer rhythm.",
    ],
  },
  hi: {
    compliments: [
      "अगले दिन खाली समय में आप दोनों एक-दूसरे को साधारण निजी सेल्फ़ी के साथ खास तारीफ़ भेजें; तस्वीरें केवल आप दोनों के बीच रहें।",
      "आज शाम बारी-बारी से एक ऐसी बात बताएं जिसकी आप सचमुच अपने साथी में कद्र करते हैं। असली उदाहरण तभी दें जब वह खुद याद आए; कुछ गढ़ें नहीं।",
      "आप दोनों अपने साथी को एक छोटा संदेश भेजें कि आप उनमें किस बात की सचमुच कद्र करते हैं।",
    ],
    tenderness: [
      "एक-दूसरे के पसंदीदा गीत पर बारी-बारी से पाँच मिनट कंधों की मालिश करें।",
      "क्रीम लगाकर बारी-बारी से एक-दूसरे की हथेलियों और उंगलियों की मालिश करें।",
      "एक गीत चुनें और बिना फोन के बारी-बारी से एक-दूसरे को धीमे नृत्य में आगे बढ़ाएं।",
    ],
    desire: [
      "दिन में आप दोनों कुछ छोटे फ़्लर्टिंग संदेश एक-दूसरे को भेजें, फिर मिलने पर एक लंबा चुंबन साझा करें।",
      "जब आप दोनों अकेले हों, बारी-बारी से अपनी एक इच्छा फुसफुसाएं और कपड़ों के ऊपर से चुंबन देकर जवाब दें।",
      "दिन में आपस में दो चंचल इशारे साझा करें, फिर शाम को बारी-बारी से एक जगह चुनें जहां साथी को चूमें।",
    ],
    passion: [
      "बारी-बारी से एक-दूसरे को ओरल सेक्स दें, धीरे-धीरे चुंबन करें और प्यार भरी नज़रें मिलाएँ।",
      "आप दोनों धीरे-धीरे प्रवेश वाला सेक्स करें; लय तय करें और एक-दूसरे के करीब रहें।",
      "बारी-बारी से हाथों से एक-दूसरे का हस्तमैथुन करें और साथी की प्रतिक्रिया के अनुसार कोमल लय रखें।",
    ],
    hard: [
      "बारी-बारी से एक-दूसरे को ओरल सेक्स दें; सीधे और अश्लील शब्दों में बताएं कि क्या कर रहे हैं, और लय तेज़ रखें।",
      "आप दोनों तेज़ प्रवेश वाला सेक्स करें: एक व्यक्ति लय तय करे और दूसरा गति को निर्देशित करे।",
      "अगर आप दोनों चाहें, तो एक-दूसरे का हस्तमैथुन करते हुए निजी पोर्न वीडियो बनाएं और किसी के साथ साझा न करें।",
      "बारी-बारी से उंगलियों से साथी के जननांगों को उत्तेजित करें, लय तेज़ करें और चरमोत्कर्ष से ठीक पहले रुकें।",
    ],
  },
  pt: {
    compliments: [
      "Nas próximas 24 horas, vocês dois enviem selfies comuns e privadas com elogios específicos; mantenham as fotos só entre vocês.",
      "Vocês dois digam uma qualidade do parceiro que realmente admiram; acrescentem um exemplo real só se ele vier à memória.",
      "Vocês dois enviem ao parceiro uma mensagem curta dizendo o que realmente apreciam nele ou nela.",
    ],
    tenderness: [
      "Revezem-se numa massagem de cinco minutos nos ombros ao som de uma música que os dois adoram.",
      "Revezem-se numa massagem nas mãos com creme, passando devagar por cada palma e dedo.",
      "Escolham uma música e conduzam um ao outro, por turnos, numa dança lenta sem celulares.",
    ],
    desire: [
      "Vocês dois troquem algumas mensagens de flerte durante o dia e parem num beijo demorado quando se encontrarem.",
      "Quando estiverem a sós, revezem-se em sussurrar um desejo e respondam cada vez com um beijo por cima da roupa.",
      "Troquem duas provocações leves durante o dia e, à noite, escolham um lugar para beijar um ao outro.",
    ],
    passion: [
      "Revezem-se no sexo oral, sem pressa, com beijos demorados e um olhar carinhoso.",
      "Tenham relações com penetração em ritmo lento, mantendo o corpo perto um do outro.",
      "Revezem-se em masturbar um ao outro com as mãos, mantendo um ritmo suave e atento às reações do parceiro.",
    ],
    hard: [
      "Revezem-se no sexo oral e digam sem rodeios, com palavras mais sujas, o que estão fazendo.",
      "Tenham relações com penetração em ritmo intenso: uma pessoa conduz e a outra guia o movimento.",
      "Se vocês dois quiserem, gravem um vídeo pornô privado enquanto se masturbam mutuamente; não compartilhem a gravação.",
      "Levem um ao outro até perto do orgasmo com os dedos, parem antes do clímax e retomem com um ritmo mais firme.",
    ],
  },
  es: {
    compliments: [
      "Durante el próximo día, los dos envíense selfies normales y privados con un cumplido concreto; mantengan las fotos solo entre ustedes.",
      "Ambos nombren una cualidad de la pareja que de verdad aprecian; añadan un ejemplo real solo si les viene a la mente.",
      "Ambos envíen a su pareja un mensaje breve sobre algo que de verdad aprecian de ella.",
    ],
    tenderness: [
      "Dense por turnos un masaje de hombros de cinco minutos con una canción que les guste a ambos.",
      "Por turnos, lean en voz alta un poema o un fragmento que les guste y dedíquenlo a la otra persona.",
      "Elijan una canción y guíense por turnos en un baile lento, sin teléfonos.",
    ],
    desire: [
      "Intercambien algunos mensajes coquetos durante el día y, al verse, quédense en un beso largo.",
      "Cuando estén a solas, por turnos susurren un deseo y respondan con un beso por encima de la ropa.",
      "Compartan un par de insinuaciones juguetonas durante el día y, por turnos, elijan dónde dejar un beso al otro.",
    ],
    passion: [
      "Por turnos, practiquen sexo oral sin prisa, con besos largos y una mirada cariñosa.",
      "Tengan relaciones con penetración lentamente, alternando quién guía el ritmo y manteniéndose cerca.",
      "Por turnos, masturben al otro con las manos, con un ritmo suave y atentos a su reacción.",
    ],
    hard: [
      "Por turnos, practiquen sexo oral y díganse sin rodeos, con palabras obscenas, lo que están haciendo.",
      "Tengan relaciones con penetración a un ritmo intenso: una persona marca el movimiento y la otra lo guía.",
      "Si ambos quieren, graben un vídeo porno privado mientras se masturban mutuamente; guárdenlo en privado y no lo compartan.",
      "Por turnos, cada uno estimula los genitales del otro con los dedos, aumenta el ritmo y se detiene justo antes del orgasmo.",
    ],
  },
};

const SOLO_SEXUAL_FALLBACKS: Record<string, Pick<StaticPool, "passion" | "hard">> = {
  ru: {
    passion: [
      "При встрече займись с партнёром оральным сексом медленно и нежно, следя за реакцией партнёра.",
      "Начни с партнёром проникающий секс в мягком ритме, меняя темп по реакции партнёра.",
      "Мастурбируй партнёру руками, меняя нежные прикосновения по реакции партнёра.",
    ],
    hard: [
      "При встрече займись с партнёром оральным сексом и прямо, грязными словами называй, что делаешь.",
      "Начни с партнёром энергичный проникающий секс, задавая уверенный ритм и меняя его по реакции партнёра.",
      "Мастурбируй партнёру руками в быстром ритме и прямо говори, что именно делаешь.",
      "Доведи партнёра до края пальцами, остановись перед оргазмом, затем возобнови стимуляцию в более быстром ритме.",
    ],
  },
  en: {
    passion: [
      "Give your partner gentle oral sex at an unhurried pace, adjusting to their reactions.",
      "Lead penetrative sex with your partner at a slow, tender pace and keep warm eye contact.",
      "Masturbate your partner by hand, keeping your touch gentle and following their response.",
    ],
    hard: [
      "Give your partner oral sex and say plainly, with a little dirty talk, what you are doing.",
      "Lead vigorous penetrative sex with your partner, setting a firm pace and adjusting to their response.",
      "Masturbate your partner by hand at a brisk pace and name the act directly in dirty words.",
      "Bring your partner close to orgasm with your fingers, stop just before it, then resume with a firmer rhythm.",
    ],
  },
  hi: {
    passion: [
      "अपने साथी को प्यार से ओरल सेक्स दें, धीरे-धीरे और उनकी प्रतिक्रिया देखते हुए।",
      "अपने साथी के साथ धीरे-धीरे प्रवेश वाला सेक्स करें और उनकी प्रतिक्रिया के अनुसार लय नरम रखें।",
      "अपने साथी का हाथों से हस्तमैथुन करें और उनकी प्रतिक्रिया के अनुसार कोमल गति रखें।",
    ],
    hard: [
      "अपने साथी को सीधे और थोड़े अश्लील शब्दों में ओरल सेक्स दें और बताएं कि आप क्या कर रहे हैं।",
      "अपने साथी के साथ तेज़ प्रवेश वाला सेक्स करें और गति को साफ़ तौर पर नियंत्रित करें।",
      "अपने साथी का हाथों से हस्तमैथुन करें और सीधे, गंदे शब्दों में क्रिया का नाम लें।",
      "उंगलियों से अपने साथी के जननांगों को उत्तेजित करें, लय तेज़ करें और चरमोत्कर्ष से ठीक पहले रुकें।",
    ],
  },
  pt: {
    passion: [
      "Faça sexo oral no seu par sem pressa, com delicadeza e atenção às reações.",
      "Conduza o sexo com penetração com seu par em um ritmo suave e carinhoso.",
      "Masturbe seu par com as mãos, mantendo um toque delicado e observando as reações.",
    ],
    hard: [
      "Faça sexo oral no seu par e diga sem rodeios, com palavras mais sujas, o que está fazendo.",
      "Conduza o sexo com penetração com seu par em um ritmo intenso e firme.",
      "Masturbe seu par com as mãos em ritmo acelerado e nomeie o ato com palavras diretas.",
      "Leve seu par ao limite com os dedos, pare antes do orgasmo e retome a estimulação em um ritmo mais firme.",
    ],
  },
  es: {
    passion: [
      "Practica sexo oral con tu pareja sin prisa, con ternura y observa su reacción.",
      "Guía el sexo con penetración con tu pareja a un ritmo lento y cariñoso.",
      "Masturba a tu pareja con las manos, con caricias suaves y observa su respuesta.",
    ],
    hard: [
      "Practica sexo oral con tu pareja y di sin rodeos, con palabras algo obscenas, lo que estás haciendo.",
      "Guía el sexo con penetración con tu pareja a un ritmo intenso y firme.",
      "Masturba a tu pareja con las manos a buen ritmo y nombra el acto con palabras directas y sucias.",
      "Lleva a tu pareja al límite con los dedos, detente antes del orgasmo y retoma la estimulación con un ritmo más firme.",
    ],
  },
};

const SOLO_DAILY_FALLBACKS: Record<string, Pick<StaticPool, "compliments" | "tenderness" | "desire">> = {
  ru: {
    compliments: [
      "Напиши партнёру конкретный комплимент о том, что тебе особенно нравится в нём или ней, и объясни, почему именно эта деталь тебя цепляет.",
      "Запиши короткое голосовое: назови одну черту партнёра, которой ты восхищаешься, и вспомни поступок, в котором она проявилась.",
      "Отправь партнёру личное сообщение о том, что в его или её внешности сегодня особенно притягивает твой взгляд.",
    ],
    tenderness: [
      "Сделай партнёру пятиминутный массаж плеч, медленно разминая напряжённые места.",
      "Нанеси крем на руки партнёра и мягко разомни каждую ладонь и пальцы.",
      "Сделай партнёру расслабляющий массаж головы, уделив внимание вискам и коже головы.",
    ],
    desire: [
      "Отправь партнёру голосовое шёпотом: вспомни поцелуй, который хочешь повторить, и предложи выбрать для него момент сегодня.",
      "Напиши партнёру, какой его или её образ тебе хочется увидеть вечером, и попроси выбрать одну вещь для этого образа.",
      "Отправь партнёру один дерзкий намёк о том, куда ты хочешь поцеловать его или её при первой возможности.",
    ],
  },
  en: {
    compliments: [
      "Send your partner a specific compliment about a detail you find especially attractive, and say why it stays on your mind.",
      "Record a short voice note naming one quality you admire in your partner and a real moment when you saw it.",
      "Send your partner a personal message about one detail in their appearance that caught your eye today.",
    ],
    tenderness: [
      "Give your partner a five-minute shoulder massage, slowly easing the places that feel tense.",
      "Apply hand cream to your partner's hands and gently massage each palm and finger.",
      "Give your partner a relaxing scalp massage, taking your time around the temples.",
    ],
    desire: [
      "Send your partner a whispered voice note recalling a kiss you want to repeat, then suggest a moment for it today.",
      "Tell your partner which look you would love to see them wear tonight, and ask them to choose one piece for it.",
      "Send your partner one daring hint about where you want to kiss them the next time you meet.",
    ],
  },
  hi: {
    compliments: [
      "अपने साथी को एक खास तारीफ़ भेजें कि उनकी कौन-सी बात आपको सबसे ज़्यादा आकर्षित करती है, और बताएं कि वह बात आपको क्यों याद रहती है।",
      "एक छोटा वॉइस नोट रिकॉर्ड करें: साथी की वह खूबी बताएं जिसकी आप कद्र करते हैं, और उससे जुड़ा कोई सच्चा पल याद करें।",
      "अपने साथी को संदेश भेजें कि आज उनकी खूबसूरती की कौन-सी बात ने आपका ध्यान खींचा।",
    ],
    tenderness: [
      "अपने साथी के कंधों की पाँच मिनट मालिश करें और तनाव वाली जगहों को धीरे-धीरे आराम दें।",
      "साथी के हाथों पर क्रीम लगाकर हथेलियों और हर उंगली की हल्की मालिश करें।",
      "अपने साथी के सिर की आरामदेह मालिश करें और कनपटियों पर समय दें।",
    ],
    desire: [
      "धीमी आवाज़ में वॉइस नोट भेजें: उस चुंबन को याद करें जिसे आप दोहराना चाहते हैं, और आज उसके लिए एक समय सुझाएं।",
      "साथी को बताएं कि आज शाम आप उन्हें किस अंदाज़ में देखना चाहेंगे, और उस लुक के लिए एक कपड़ा चुनने को कहें।",
      "साथी को एक शरारती इशारा भेजें कि अगली मुलाकात में आप उन्हें कहाँ चूमना चाहते हैं।",
    ],
  },
  pt: {
    compliments: [
      "Envie ao seu par um elogio específico sobre um detalhe que você acha especialmente atraente e diga por que ele não sai da sua cabeça.",
      "Grave um áudio curto contando uma qualidade que admira no seu par e um momento real em que ela apareceu.",
      "Envie uma mensagem pessoal dizendo qual detalhe da aparência do seu par chamou sua atenção hoje.",
    ],
    tenderness: [
      "Faça uma massagem de cinco minutos nos ombros do seu par, soltando devagar os pontos tensos.",
      "Passe creme nas mãos do seu par e massageie com delicadeza cada palma e cada dedo.",
      "Faça uma massagem relaxante na cabeça do seu par, com calma nas têmporas.",
    ],
    desire: [
      "Envie um áudio sussurrado lembrando um beijo que quer repetir e sugira um momento para isso hoje.",
      "Conte ao seu par qual visual gostaria de ver nele ou nela esta noite e peça que escolha uma peça para compô-lo.",
      "Envie ao seu par uma provocação sobre onde você quer beijá-lo ou beijá-la na próxima oportunidade.",
    ],
  },
  es: {
    compliments: [
      "Envía a tu pareja un cumplido concreto sobre un detalle que te resulta especialmente atractivo y cuéntale por qué no dejas de pensar en él.",
      "Graba una nota de voz breve: nombra una cualidad que admiras de tu pareja y un momento real en que la viste.",
      "Envía a tu pareja un mensaje personal sobre un detalle de su aspecto que te llamó la atención hoy.",
    ],
    tenderness: [
      "Dale a tu pareja un masaje de hombros de cinco minutos, aflojando despacio las zonas tensas.",
      "Prepara una bebida caliente para tu pareja y sírvela en su taza favorita.",
      "Dale a tu pareja un masaje relajante en la cabeza, dedicando tiempo a las sienes.",
    ],
    desire: [
      "Envía una nota de voz susurrada recordando un beso que quieres repetir y sugiere un momento para hacerlo hoy.",
      "Cuéntale a tu pareja qué estilo te gustaría que llevara esta noche y pídele que elija una prenda.",
      "Envía a tu pareja una insinuación atrevida sobre dónde quieres besarla en cuanto tengan ocasión.",
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

const MUTUAL_ONLY_TASK_MARKERS: Record<string, RegExp> = {
  ru: /(?:позици\p{L}*.{0,8}69|в\s+позе\s+69|взаимн\p{L}*.{0,25}(?:оральн|мастурб)|друг\s+друга.{0,25}ртом)/iu,
  en: /(?:position\s+69|mutual\s+(?:oral|masturbation)|each other.{0,25}(?:orally|with their mouths))/iu,
  hi: /(?:69\s*(?:स्थिति|पोज़िशन)|आपसी\s+(?:मुखमैथुन|हस्तमैथुन)|एक-दूसरे.{0,25}मुंह)/u,
  pt: /(?:posição\s+69|sexo oral mútuo|masturbação mútua|um ao outro.{0,25}oralmente)/iu,
  es: /(?:posición\s+69|sexo oral mutuo|masturbación mutua|el uno al otro.{0,25}oralmente)/iu,
};

const UNSAFE_TASK_MARKERS: Record<string, RegExp> = {
  ru: /(?:без\s+согласия|игнорир\w*\s+(?:отказ|боль)|не\s+может\s+(?:двигаться|отказаться)|не\s+двигается|не\s+(?:двигайся|шевелись|двигаться)|не\s+слышат\s+и\s+не\s+видят|делай\s+что\s+хочешь|без\s+вопросов|подчин\w*\s+без|застав\w*|принуд\w*|удуш\w*|души\s|не\s+спрашивай|насиль\w*)/iu,
  en: /(?:without consent|can't (?:move|refuse)|cannot (?:move|refuse)|at their mercy|do whatever you want|don't move|do not move|stay still|obey without question|can't hear (?:or|and) see|force(?:d)?|coerc|chok|strangl|ignore (?:their )?(?:no|stop|pain)|don't ask)/iu,
  hi: /(?:सहमति के बिना|हिल नहीं सकता|हिल नहीं सकती|हिलते नहीं|न\s+हिलें|न\s+हिलना|मत\s+हिलो|बिना\s+सवाल.*(?:मान|आज्ञा)|जो चाहो करो|जबरदस्ती|ज़बरदस्ती|मना करने पर भी|गला घोंट|दर्द की अनदेखी)/u,
  pt: /(?:sem consentimento|não pode se mover|não consegue se mexer|não\s+se\s+(?:mova|mex\w*)|ordene\w*.{0,40}não\s+se\s+mova|obedeç\w*\s+sem\s+question\w*|à mercê|faça o que quiser|forç\w*|coag\w*|estrang\w*|ignore.*(?:não|pare|dor))/iu,
  es: /(?:sin consentimiento|no puede moverse|no puede negarse|no\s+te\s+muevas|que\s+no\s+se\s+mueva|ordena\w*.{0,40}no\s+se\s+mueva|obedec\w*\s+sin\s+cuestionar|a su merced|haz lo que quieras|forz\w*|coaccion\w*|estrang\w*|ignora.*(?:no|para|dolor))/iu,
};

const SEXUAL_FILMING_MARKERS: Record<string, RegExp> = {
  ru: /(?:порно|эротическ\p{L}*\s+съ[её]мк|снять\p{L}*\s+порно|запис\p{L}*.{0,30}(?:секс|вагинальн|оральн))/iu,
  en: /(?:porn|erotic filming|film.{0,30}(?:sex|intercourse|oral)|record.{0,30}(?:sex|intercourse|oral))/iu,
  hi: /(?:पोर्न|कामुक.{0,20}(?:वीडियो|रिकॉर्ड)|रिकॉर्ड.{0,30}(?:सेक्स|संभोग))/u,
  pt: /(?:porn[oô]|gravação erótica|film(?:ar|agem).{0,30}(?:sexo|oral)|grav(?:ar|ação).{0,30}(?:sexo|oral))/iu,
  es: /(?:porno|grabación erótica|film(?:ar|ación).{0,30}(?:sexo|oral)|grab(?:ar|ación).{0,30}(?:sexo|oral))/iu,
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

const INTIMATE_PHOTO_MARKERS: Record<string, RegExp> = {
  ru: /(?:интимн\p{L}*.{0,20}(?:фото|сним)|(?:фото|сним).{0,20}интимн\p{L}*|нюдс|обнажённ\p{L}*\s+фото)/iu,
  en: /(?:intimate.{0,20}(?:photo|picture)|(?:photo|picture).{0,20}intimate|nude photo|naked photo|erotic selfie)/iu,
  hi: /(?:अंतरंग.{0,20}(?:फ़ोटो|फोटो|तस्वीर)|(?:फ़ोटो|फोटो|तस्वीर).{0,20}अंतरंग|नग्न.{0,15}(?:फ़ोटो|फोटो))/u,
  pt: /(?:foto íntim[ao]|íntim[ao].{0,15}foto|foto nua|selfie erótic[ao])/iu,
  es: /(?:foto íntim[ao]|íntim[ao].{0,15}foto|foto desnuda|selfi erótic[ao])/iu,
};

function isTaskExampleMediaAllowed(task: string, category: string, lang: string, mode: TaskMode): boolean {
  const mediaMarkers = EXAMPLE_MEDIA_MARKERS[lang] ?? EXAMPLE_MEDIA_MARKERS.en;
  if (!mediaMarkers.test(task)) return true;
  const intimatePhoto = (INTIMATE_PHOTO_MARKERS[lang] ?? INTIMATE_PHOTO_MARKERS.en).test(task);
  if (intimatePhoto && category !== "desire") return false;
  const sexualFilming = (SEXUAL_FILMING_MARKERS[lang] ?? SEXUAL_FILMING_MARKERS.en).test(task);
  if (!sexualFilming) return true;
  if (category !== "hard" || mode !== "together") return false;
  return hasHardSexualAct(task, lang)
    && (FILMING_CONSENT_MARKERS[lang] ?? FILMING_CONSENT_MARKERS.en).test(task)
    && (PRIVATE_FILMING_MARKERS[lang] ?? PRIVATE_FILMING_MARKERS.en).test(task);
}

function hasCategorySexualAct(task: string, category: string, lang: string): boolean {
  return isTaskTextCategoryAppropriate(task, category, lang);
}

function getTaskExampleEntries(
  category: string,
  requestId: string,
  mode: TaskMode,
  recentVariationTags: TaskVariationTag[],
  recentPaidVariationTags: TaskVariationTag[],
): TaskReferenceExample[] {
  const sourcePool = TASK_REFERENCE_LIBRARY[category as keyof typeof TASK_REFERENCE_LIBRARY] ?? [];
  const eligible = sourcePool.filter((example) =>
    (!example.mode || example.mode === mode)
    && !(category === "hard" && example.tag === "sex_toy")
    && (!isManualStimulationTask(example.text, "ru") || isManualStimulationAllowed(recentPaidVariationTags))
  );
  const getReferenceTag = (example: TaskReferenceExample) => getTaskVariationTag(example.text, "ru") ?? example.tag;
  const fresh = eligible.filter((example) => !recentVariationTags.includes(getReferenceTag(example)));
  const preferred = fresh.length > 0 ? fresh : eligible;
  const order = seededShuffle(preferred, hashSeed(`${requestId}:${category}:${mode}:curated-examples`));
  const examples: TaskReferenceExample[] = [];
  const families = new Set<string>();
  const tagCounts = new Map<TaskVariationTag, number>();
  for (const candidate of order) {
    const tag = getReferenceTag(candidate);
    if (families.has(candidate.family) || (tagCounts.get(tag) ?? 0) >= 2) continue;
    examples.push(candidate);
    families.add(candidate.family);
    tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    if (examples.length === 10) break;
  }
  return examples;
}

function getTaskExamples(
  category: string,
  _lang: string,
  requestId: string,
  mode: TaskMode,
  _gender: string,
  recentVariationTags: TaskVariationTag[],
  recentPaidVariationTags: TaskVariationTag[],
): string[] {
  return getTaskExampleEntries(category, requestId, mode, recentVariationTags, recentPaidVariationTags).map(({ text }) => text);
}

function getTaskExamplesPrompt(category: string, lang: string, requestId: string, mode: TaskMode, gender: string, recentVariationTags: TaskVariationTag[], recentPaidVariationTags: TaskVariationTag[]): string {
  const examples = getTaskExamples(category, lang, requestId, mode, gender, recentVariationTags, recentPaidVariationTags);
  if (examples.length === 0) return "";
  const intro: Record<string, string> = {
    ru: "Ниже — авторские русскоязычные примеры из библиотеки Touché, согласованной с владельцем продукта. Возьми из одного примера центральную идею и живую подачу, но не копируй его текст и не объединяй несколько примеров в одно задание. Адаптируй роли и анатомию к режиму и полу пользователя. Не выдумывай общих воспоминаний и прошлых поступков.",
    en: "Below are curated Russian-language examples from Touché's approved reference library. Take one example's central activity and natural tone, but do not copy its wording or combine several examples into one task. Adapt roles and anatomy to the requested mode and user gender. Do not invent shared memories or past actions.",
    hi: "नीचे Touché की स्वीकृत संदर्भ लाइब्रेरी से रूसी भाषा के चुने हुए उदाहरण हैं। एक उदाहरण की मुख्य गतिविधि और स्वाभाविक शैली लें, लेकिन उसके शब्द न दोहराएँ और कई उदाहरणों को एक काम में न मिलाएँ। भूमिका और शरीर-संबंधी विवरण चुने हुए मोड तथा उपयोगकर्ता के लिंग के अनुसार ढालें। साझा यादें या पिछली घटनाएँ न गढ़ें।",
    pt: "Abaixo estão exemplos em russo da biblioteca de referência aprovada do Touché. Use a atividade central e o tom natural de um exemplo, sem copiar a redação nem juntar vários exemplos numa só tarefa. Adapte os papéis e a anatomia ao modo e ao gênero do usuário. Não invente lembranças compartilhadas nem ações passadas.",
    es: "A continuación hay ejemplos en ruso de la biblioteca de referencia aprobada de Touché. Toma la actividad central y el tono natural de un ejemplo, sin copiar sus palabras ni combinar varios ejemplos en una sola tarea. Adapta los papeles y la anatomía al modo y al género del usuario. No inventes recuerdos compartidos ni acciones pasadas.",
  };
  const sharedStyleIntro: Record<string, string> = {
    ru: "Для совместного задания используй идею действия, но не копируй формулировки с «по очереди» и не превращай текст в сценарий переписки. Если выберешь сообщения, пусть они приходят в разные удобные моменты дня, без обязательного немедленного ответа.",
    en: "For Together tasks, borrow the activity idea but do not copy turn-taking wording or turn the task into a scripted chat. If using messages, let them arrive at separate convenient moments during the day, with no required immediate reply.",
    hi: "साझा काम में गतिविधि का विचार लें, लेकिन बारी-बारी वाली भाषा न दोहराएँ और काम को लिखित संवाद की पटकथा न बनाएँ। संदेश चुनें तो वे दिन में सुविधाजनक अलग-अलग समय पर भेजे जा सकें; तुरंत जवाब अनिवार्य न हो।",
    pt: "Nas tarefas a dois, aproveite a ideia da atividade, mas não copie a alternância de turnos nem transforme a tarefa em um diálogo roteirizado. Se escolher mensagens, elas devem poder ser enviadas em momentos diferentes e convenientes do dia, sem exigir resposta imediata.",
    es: "En las tareas compartidas, aprovecha la idea de la actividad, pero no copies los turnos ni conviertas el texto en un chat guionizado. Si eliges mensajes, que puedan enviarse en distintos momentos cómodos del día, sin exigir respuesta inmediata.",
  };
  const hardIntro: Record<string, string> = {
    ru: "Ниже — примеры из утверждённой библиотеки «Хард». Возьми из одного примера идею конкретного действия, сохрани прямой и немного грязный тон. В каждом задании назови сексуальный акт; нагота, лежание, раздевание, поцелуи и общие ласки могут быть только деталями.",
    en: "Below are examples from the approved Hard reference library. Take one example's concrete activity and keep the tone direct and slightly dirty. Name a sexual act in every task; nudity, lying together, undressing, kissing, and general caresses may only be supporting details.",
    hi: "नीचे स्वीकृत हार्ड संदर्भ लाइब्रेरी के उदाहरण हैं। किसी एक उदाहरण की ठोस गतिविधि लें और सीधी, थोड़ी अश्लील शैली रखें। हर काम में यौन क्रिया स्पष्ट बताएं; नग्नता, साथ लेटना, कपड़े उतारना, चूमना और सामान्य सहलाना केवल सहायक विवरण हो सकते हैं।",
    pt: "Abaixo estão exemplos da biblioteca de referência aprovada de Hard. Use a atividade concreta de um exemplo e mantenha o tom direto e um pouco ousado. Nomeie um ato sexual em cada tarefa; nudez, ficar deitado junto, tirar a roupa, beijar e carícias gerais só podem ser detalhes adicionais.",
    es: "A continuación hay ejemplos de la biblioteca de referencia aprobada de Hard. Toma la actividad concreta de un ejemplo y mantén un tono directo y algo atrevido. Nombra un acto sexual en cada tarea; la desnudez, tumbarse juntos, quitarse la ropa, besarse y las caricias generales solo pueden ser detalles secundarios.",
  };
  const preamble = category === "hard" ? hardIntro[lang] ?? hardIntro.en : intro[lang] ?? intro.en;
  const sharedNote = mode === "together" ? sharedStyleIntro[lang] ?? sharedStyleIntro.en : "";
  return `${preamble}${sharedNote ? `\n${sharedNote}` : ""}\n${examples.map((example, index) => `${index + 1}. ${example}`).join("\n")}`;
}

function getFallback(
  cat: string,
  lang: string,
  mode: TaskMode,
  requestId: string,
  gender: string,
  recentVariationTags: TaskVariationTag[],
): string {
  const localeFallbacks = DAILY_TASK_FALLBACKS[lang] ?? DAILY_TASK_FALLBACKS.en;
  const fallbackTasks = mode === "solo"
    ? cat === "passion" || cat === "hard"
      ? SOLO_SEXUAL_FALLBACKS[lang]?.[cat] ?? []
      : SOLO_DAILY_FALLBACKS[lang]?.[cat as "compliments" | "tenderness" | "desire"] ?? []
    : localeFallbacks[cat] ?? [];
  const unsafeMarkers = UNSAFE_TASK_MARKERS[lang] ?? UNSAFE_TASK_MARKERS.en;
  const wellFormed = fallbackTasks.filter((task) =>
    isTaskTextWellFormed(task, lang, mode)
    && !unsafeMarkers.test(task)
    && isTaskTextModeAppropriate(task, lang, mode)
    && hasCategorySexualAct(task, cat, lang)
    && !(mode === "solo" && (MUTUAL_ONLY_TASK_MARKERS[lang] ?? MUTUAL_ONLY_TASK_MARKERS.en).test(task))
    && isTaskExampleMediaAllowed(task, cat, lang, mode)
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
    ru: "Одиночный режим: задание получает только один совершеннолетний пользователь. Обращайся к нему как к одному человеку и опиши одно действие, которое он может сделать для партнёра. Партнёр может быть адресатом, но не должен выполнять отдельную часть или отвечать. В «Страсти» и «Харде» пользователь выполняет конкретный названный акт для партнёра; не пиши о взаимных действиях и очередности. Динамику подчинения в «Харде» в режиме Solo не используй.",
    en: "Solo mode: only one adult user receives the task. Address that user individually and describe one action they can take for their partner. The partner may receive the gesture but must not be assigned a separate action or reply. In Passion and Hard, the user performs the named act for their partner; do not make the act mutual or alternate turns. Do not use a submission dynamic in Solo Hard tasks.",
    hi: "एकल मोड: काम केवल एक वयस्क उपयोगकर्ता को मिलता है। उसी व्यक्ति को संबोधित करें और ऐसा एक काम बताएँ जो वह अपने साथी के लिए कर सकता है। साथी काम का प्राप्तकर्ता हो सकता है, लेकिन उससे अलग काम या जवाब की अपेक्षा न करें। जुनून और हार्ड में उपयोगकर्ता साथी के लिए नामित यौन क्रिया करे; आपसी क्रिया या बारी-बारी के निर्देश न दें। एकल हार्ड काम में समर्पण-आधारित भूमिका न रखें।",
    pt: "Modo solo: somente um adulto recebe a tarefa. Dirija-se a essa pessoa e descreva uma ação que ela pode fazer para o parceiro. O parceiro pode receber o gesto, mas não deve ter uma ação separada nem uma resposta como obrigação. Em Paixão e hard, o usuário executa o ato nomeado no parceiro; não use ações mútuas nem alternância. Não use dinâmica de submissão em tarefas hard no modo solo.",
    es: "Modo individual: solo una persona adulta recibe la tarea. Dirígete a esa persona y describe una acción que pueda hacer por su pareja. La pareja puede recibir el gesto, pero no debe tener una acción separada ni una respuesta obligatoria. En Pasión y hard, quien inicia realiza el acto nombrado para su pareja; no uses acciones mutuas ni turnos. No uses dinámicas de sumisión en tareas hard individuales.",
  },
  together: {
    ru: "Парный режим: обоим показывается один и тот же текст. Создай одно общее задание для совершеннолетних мужчины и женщины, не две раздельные инструкции и не ролевую сцену. Чаще предлагай связь, которая естественно продолжается в течение дня: например, обмен флиртующими сообщениями или голосовыми с паузами, в удобное каждому время, а не репликами строго по очереди. Не требуй немедленного ответа, заданного расписания или гарантированной встречи вечером. Для «Комплиментов» оставайся в тёплой и несексуальной тональности; для «Нежности» — в нежных неинтимных жестах; для «Желания» — в соблазнительном предвкушении без сексуального акта; для «Страсти» и «Харда» обязательно назови одно конкретное сексуальное действие, в котором участвуют оба. Если предлагаешь вечерний финал, сформулируй его как приглашение на случай, если оба будут свободны и захотят. Не заставляй партнёров выполнять действия по очереди. Взаимная мастурбация допустима, если прямо сказано, что оба ласкают друг друга руками.",
    en: "Together mode: both partners see the same task. Create one shared activity for an adult man and woman, not two separate instructions or roleplay. Prefer a connection that unfolds naturally during the day—for example, flirty messages or voice notes spaced out and sent when convenient, not a scripted back-and-forth or mandatory turns. Do not require an immediate reply, a fixed schedule, or a guaranteed evening together. Keep Compliments warm and nonsexual; Tenderness gently affectionate and non-intimate; Desire teasing and anticipatory without a sex act; Passion and Hard must name one concrete sexual act involving both partners. If you suggest an evening ending, phrase it as an invitation if both are free and want it. Do not make partners perform actions in turns. Mutual masturbation is valid when you clearly say both use their hands on each other.",
    hi: "साथी मोड: दोनों को एक ही पाठ दिखता है। वयस्क पुरुष और महिला के लिए एक साझा गतिविधि लिखें, दो अलग निर्देश या भूमिका-अभिनय नहीं। अक्सर ऐसा जुड़ाव चुनें जो दिन भर स्वाभाविक रूप से चलता रहे—जैसे सुविधा के समय भेजे गए फ़्लर्ट भरे संदेश या वॉइस नोट, न कि तय क्रम में बातचीत या अनिवार्य बारी-बारी। तुरंत जवाब, तय समय-सारणी या शाम को मिलना ज़रूरी न करें। तारीफ़ को स्नेहपूर्ण और गैर-यौन रखें; कोमलता को प्यार भरा लेकिन गैर-अंतरंग; इच्छा को आकर्षक प्रतीक्षा, बिना यौन क्रिया के; जुनून और हार्ड में दोनों की भागीदारी वाली एक ठोस यौन क्रिया स्पष्ट बताएँ। शाम का सुझाव केवल निमंत्रण हो, अगर दोनों उपलब्ध हों और चाहें। कार्यों को बारी-बारी से करना अनिवार्य न करें। आपसी हस्तमैथुन तभी लिखें जब स्पष्ट हो कि दोनों एक-दूसरे को हाथों से सहलाते हैं।",
    pt: "Modo a dois: ambos veem o mesmo texto. Crie uma atividade compartilhada para um homem e uma mulher adultos, não duas instruções separadas nem uma encenação. Prefira uma conexão que aconteça naturalmente ao longo do dia — por exemplo, mensagens ou áudios provocantes enviados com intervalos, quando for conveniente, e não um diálogo roteirizado ou turnos obrigatórios. Não exija resposta imediata, horário fixo nem encontro garantido à noite. Elogios devem ser calorosos e não sexuais; Carinho, afetuoso e não íntimo; Desejo, sedutor e antecipatório, sem ato sexual; Paixão e Hard devem nomear um ato sexual concreto que envolva ambos. Se sugerir um final à noite, faça um convite condicionado à disponibilidade e à vontade dos dois. Não imponha ações alternadas. Masturbação mútua é válida se disser claramente que ambos acariciam um ao outro com as mãos.",
    es: "Modo en pareja: ambos ven el mismo texto. Crea una actividad compartida para un hombre y una mujer adultos, no dos instrucciones separadas ni una escena de rol. Prefiere una conexión que avance de forma natural durante el día —por ejemplo, mensajes o audios coquetos enviados con pausas, cuando resulte cómodo, no un diálogo guionizado ni turnos obligatorios. No exijas respuesta inmediata, horario fijo ni una cita garantizada por la noche. Cumplidos debe ser cálido y no sexual; Ternura, afectuosa y no íntima; Deseo, seductor y anticipatorio, sin acto sexual; Pasión y Hard deben nombrar un acto sexual concreto que involucre a ambos. Si propones un final nocturno, preséntalo como invitación si ambos tienen tiempo y quieren. No impongas acciones por turnos. La masturbación mutua es válida si indicas claramente que ambos se acarician con las manos.",
  },
};

const WRITING_STYLE_INSTRUCTIONS: Record<string, string> = {
  ru: "СТИЛЬ И КАЧЕСТВО: Пиши красиво, живо и чувственно — как личное приглашение партнёру, а не памятка или список обязанностей. Выбери одну центральную идею, назови конкретное действие и добавь одну уместную деталь, создающую настроение. Для «Комплиментов» — искренность и точность; для «Нежности» — тепло и бережность; для «Желания» — флирт, интрига и предвкушение; для «Страсти» — чувственный, нежный язык при ясном названии сексуального действия; для «Харда» — прямота и немного дерзости без грубости ради грубости. Пиши естественным русским, обращайся к обоим на «вы», когда задание совместное. Избегай канцелярского тона, клише, пафоса, пустых обещаний вроде «это будет незабываемо», повторяющихся концовок и перегруженных инструкций. Красота — в точной детали и напряжении ожидания, не в длинных метафорах.",
  en: "STYLE AND QUALITY: Write beautifully, naturally, and sensually—as a personal invitation, not a checklist or set of duties. Choose one central idea, name a concrete action, and add one fitting detail that sets the mood. Compliments should feel sincere and specific; Tenderness warm and gentle; Desire playful, teasing, and anticipatory; Passion tender and sensual while clearly naming the sexual act; Hard direct and a little daring, never crude for its own sake. Use natural language and address both partners in Together tasks. Avoid clinical phrasing, clichés, purple prose, empty promises such as “it will be unforgettable,” repeated endings, and overloaded instructions. Let one precise detail and a little anticipation create the beauty.",
  hi: "शैली और गुणवत्ता: सुंदर, स्वाभाविक और संवेदनशील ढंग से लिखें—जैसे साथी के लिए निजी निमंत्रण, न कि निर्देशों की सूची। एक मुख्य विचार चुनें, ठोस गतिविधि बताएँ और माहौल बनाने वाला एक उपयुक्त विवरण जोड़ें। तारीफ़ सच्ची और विशिष्ट हो; कोमलता गर्मजोशी भरी और नाज़ुक; इच्छा चुलबुली और प्रतीक्षा जगाने वाली; जुनून स्पष्ट यौन क्रिया के साथ कोमल और संवेदनशील; हार्ड सीधा और थोड़ा साहसी, पर बेवजह भद्दा नहीं। स्वाभाविक भाषा रखें। चिकित्सकीय शब्दों, घिसे-पिटे वाक्यों, अतिनाटकीय रूपकों, खोखले वादों और दोहराए गए अंत से बचें। सुंदरता एक सटीक विवरण और प्रतीक्षा के एहसास से आए।",
  pt: "ESTILO E QUALIDADE: Escreva de forma bonita, natural e sensual — como um convite pessoal ao parceiro, não como uma lista de tarefas. Escolha uma ideia central, nomeie uma ação concreta e acrescente um detalhe adequado que crie clima. Elogios devem soar sinceros e específicos; Carinho, caloroso e delicado; Desejo, brincalhão e cheio de expectativa; Paixão, terno e sensual, com o ato sexual claramente nomeado; Hard, direto e um pouco ousado, sem vulgaridade gratuita. Use linguagem natural e dirija-se aos dois nas tarefas compartilhadas. Evite tom clínico, clichês, metáforas exageradas, promessas vazias e finais repetitivos. A beleza deve vir de um detalhe preciso e da expectativa.",
  es: "ESTILO Y CALIDAD: Escribe de forma bonita, natural y sensual, como una invitación personal a la pareja, no como una lista de obligaciones. Elige una idea central, nombra una acción concreta y añade un detalle adecuado que cree ambiente. Cumplidos debe sonar sincero y específico; Ternura, cálida y delicada; Deseo, juguetón y lleno de anticipación; Pasión, tierno y sensual, nombrando claramente el acto sexual; Hard, directo y un poco atrevido, nunca vulgar sin motivo. Usa lenguaje natural y dirígete a ambos en las tareas compartidas. Evita el tono clínico, los clichés, las metáforas recargadas, las promesas vacías y los finales repetitivos. La belleza debe surgir de un detalle preciso y de la expectativa.",
};

// ─── ПРОМПТЫ (ИИ сам придумывает, а не выбирает из списка) ────────────────

const PROMPTS: Record<string, Record<string, string>> = {
  compliments: {
    ru: `Ты создаёшь одно задание для категории «КОМПЛИМЕНТЫ» в гетеросексуальной паре мужчина–женщина.

Стиль: используй конкретную, правдивую деталь, которую пользователь может выбрать сам, и одну выразительную деталь. Задание должно звучать лично, а не как общий комплимент из открытки. Не приписывай партнёру события, поступки или реакции, о которых пользователь не сообщил.
Категория только про слова и лёгкие знаки внимания: конкретные комплименты, благодарность, тёплые воспоминания, если реальный эпизод действительно приходит на ум, личные голосовые, ласковое фото с подписью или короткое доброе видеообращение. Не требуй конкретного воспоминания: если оно не вспоминается, комплимент должен быть выполнимым без него. Не добавляй флирт, прикосновения или интимные фото.

Придумай новое задание в духе приложенных примеров, не копируя их. Одно ясное действие; максимум 1–3 связанных шага, обычно 1–2 предложения. Не добавляй шаблонный финал «пусть почувствует». До ${MAX_TASK_CHARS} символов. Верни только текст задания.`,
    en: `Create one task for the "COMPLIMENTS" category for a heterosexual man-woman couple.

Style: use one truthful detail the user can choose and one vivid detail. Make it personal rather than a generic greeting-card compliment. Do not invent the partner's past actions or reactions.
This is the lightest level: specific compliments, thanks, warm shared memories only when a real memory comes to mind, personal voice notes, affectionate photos with a caption, or a short loving video message. Never require a specific memory; the task must still work without one. Do not add flirting, touch, or intimate photos.

Create a new task in the style of the supplied examples without copying them. One clear action with at most 1–3 connected steps, usually 1–2 sentences. Avoid a formulaic "let them feel" ending. Up to ${MAX_TASK_CHARS} characters. Return only the task text.`,
  },
  tenderness: {
    ru: `Ты создаёшь одно задание для категории «НЕЖНОСТЬ» в гетеросексуальной паре мужчина–женщина.

Категория — ласковая, но не интимная близость: объятия, держаться за руки, поцелуй в лоб или щёку, массаж кистей/плеч/спины/стоп, расчесать волосы, нанести крем на руки, фото объятий или рук и видео с воздушным поцелуем. Не переходи к прикосновениям к интимным зонам, раздеванию или прелюдии. Описывай действие, которое можно сделать сейчас; не предполагай, что пара уже пережила конкретный момент или сейчас находится рядом.

Создай новое задание в духе приложенных примеров, не копируя их. Одно ясное действие или 1–3 естественно связанных шага, обычно 1–2 предложения. Не повторяй один и тот же шаблонный финал. До ${MAX_TASK_CHARS} символов. Верни только текст задания.`,
    en: `Create one task for the "TENDERNESS" category for a heterosexual man-woman couple.

Keep it to non-intimate affection: hugs, holding hands, a forehead/cheek kiss, hand/shoulder/back/foot massage, brushing their hair, applying hand cream, a photo of your hands or embrace, or a short blown-kiss video. No intimate-area touch, undressing, or foreplay. Use one concrete gesture and one sensory detail; avoid a long scene or required recording. Describe something the user can do now; do not assume a specific past moment or that the couple is currently together.

Create a new task in the style of the supplied examples without copying them. One clear action or 1–3 naturally connected steps, usually 1–2 sentences. Avoid repetitive formulaic endings. Up to ${MAX_TASK_CHARS} characters. Return only the task text.`,
  },
  desire: {
    ru: `Ты создаёшь одно задание для категории «ЖЕЛАНИЕ» — предвкушение и прелюдия до секса — в гетеросексуальной паре мужчина–женщина.

Создавай предвкушение через флирт, соблазнение, поцелуи, раздевание, нежное прикосновение к интимным зонам, чувственный массаж, сливки или лёд на коже, мягкую сенсорную игру с повязкой, совместную ванну/душ без секса, личное интимное селфи или короткое видео-приветствие для партнёра. Интимное фото/видео должно быть добровольным и только для партнёра; не снимай сам секс. Например, можно описать игривый образ в свободной футболке без белья или соблазняющий наклон. Не описывай оральные действия, проникновение или активную сексуальную стимуляцию.
Соблюдай анатомию и естественную последовательность. Одно центральное действие, не длинная сцена.

Придумай новое задание в духе примеров, не копируя их. 1–3 связанных шага, обычно 1–2 предложения; конкретно и чувственно, без повторяющегося «пусть почувствует». До ${MAX_TASK_CHARS} символов. Верни только текст задания.`,
    en: `Create one task for the "DESIRE" category—anticipation and foreplay before sex—for a heterosexual man-woman couple.

Build anticipation through flirting, seduction, kisses, undressing, gentle intimate touch, sensual massage, whipped cream or ice on the skin, gentle blindfolded sensory play, a shared bath/shower without sex, a private intimate selfie, or a short intimate greeting video for the partner. Intimate media must be voluntary and addressed only to the partner; do not film sex. An oversized shirt without underwear or a teasing bend is one possible idea. Do not describe oral acts, penetration, or active sexual stimulation.
Keep the anatomy and order of actions physically plausible. Use one central action, not a long scene.

Create a new task in the style of the examples without copying them. Use 1–3 connected steps, usually 1–2 sentences; be concrete and sensual, and avoid repetitive "let them feel" endings. Up to ${MAX_TASK_CHARS} characters. Return only the task text.`,
  },
  passion: {
    ru: `Ты создаёшь одно задание для категории «СТРАСТЬ» — конкретный чувственный секс в гетеросексуальной паре мужчина–женщина.

Используй отобранные примеры Touché ниже как источник разнообразия. Возьми одно центральное сексуальное действие из примеров; не добавляй к нему случайный реквизит и не объединяй несколько примеров. Ручная или пальцевая стимуляция может быть центральным действием не чаще одного раза на двадцать заданий. Тон нежный и чувственный. Один поцелуй, общий массаж или разговор о желании сами по себе недостаточны. Опиши выбранное действие нежно и красиво.
Соблюдай анатомию и выполнимый порядок. Не обещай конкретную реакцию тела. Если упоминается оргазм, он обычно завершает задание; не добавляй после него следующий акт автоматически. Не добавляй реквизит, музыку или съёмку по умолчанию.

Создай оригинальное задание, опираясь на разные идеи в переданных примерах, но не копируя их. 1–3 связанных шага, обычно 1–2 предложения, до ${MAX_TASK_CHARS} символов. Без шаблонных концовок и пояснений; верни только текст задания.`,
    en: `Create one task for the "PASSION" category: a concrete, sensual sexual act for a heterosexual man-woman couple.

Use the selected Touché examples below as the source of variety. Choose one central sexual activity from them; do not add unrelated props or combine several examples. Hand- or finger-led stimulation may be the central act no more than once in twenty tasks. Use position 69 only in Together; name both actions and anatomy explicitly: he gives oral pleasure to her vulva/clitoris, and she to his penis. Keep the tone tender and sensual. A kiss, general massage, or talk about desire alone is not enough. Describe the selected act tenderly and beautifully.
Keep anatomy and order physically plausible. Do not guarantee a bodily response. If orgasm is mentioned, it usually ends the task; do not automatically add another act afterward. Do not add props, music, or filming by default.

Create an original task based on varied ideas from the supplied examples without copying them: 1–3 connected steps, usually 1–2 sentences, up to ${MAX_TASK_CHARS} characters. Avoid formulaic endings and explanations; return only the task text.`,
  },
  hard: {
    ru: `Ты создаёшь короткое задание категории «ХАРД» для совершеннолетней пары мужчина–женщина: конкретный сексуальный акт, поданный прямо и немного грязно.

Используй только конкретные сексуальные действия из отобранных примеров «Харда» ниже; не подменяй выбранный акт реквизитом. Ручная или пальцевая стимуляция может быть центральным действием не чаще одного раза на двадцать заданий. Более напористый ритм, грязные слова, повязка и мягкая фиксация запястий могут дополнять акт. Временная роль подчинения допустима только во «Вместе»; назови короткую длительность и стоп-сигнал. Никакой боли, принуждения, ограничения дыхания или опасности. Домашнее порно — только вместе с конкретным сексуальным актом, если оба этого хотят; видео остаётся приватным.

Каждое задание обязано прямо назвать физический сексуальный акт. Нагота, раздевание, поцелуи, массаж, реквизит или съёмка без акта не подходят. Соблюдай анатомию и порядок действий. Это короткая карточка, не ролевая сцена: без персонажей, сюжета и длинных диалогов. 1–3 связанных шага, обычно 1–2 предложения, до ${MAX_TASK_CHARS} символов. Верни только текст задания.`,
    en: `Create one short HARD task for an adult heterosexual man-woman couple: name a concrete sexual act in a direct, slightly dirty tone.

Use only concrete sexual activities from the selected Hard examples below; do not let props replace the central act. Hand- or finger-led stimulation may be the central act no more than once in twenty tasks. A firmer rhythm, dirty talk, a blindfold, or gentle wrist restraint may support the act. A time-bounded submission dynamic is Together-only; name its short duration and a stop signal. No pain, coercion, breath restriction, or danger. Homemade porn may accompany a concrete act only if both want it; keep the video private.

Every task must explicitly name the physical sexual act. Nudity, undressing, kissing, massage, props, or filming without an act do not qualify. Keep anatomy and sequence plausible. This is a short task, not roleplay: no characters, plot, or long dialogue. Use 1–3 connected steps, usually 1–2 sentences, up to ${MAX_TASK_CHARS} characters. Return only the task text.`,
  },
};

const CATEGORY_VARIETY_GUIDANCE: Record<string, Record<string, string>> = {
  ru: {
    compliments: "Не своди задания к «я скучаю» и обычным сообщениям: чередуй конкретную похвалу вслух, голосовую записку, записку от руки, обычное селфи или короткое видео с точным комплиментом, благодарность за характер или навык. Выбирай один формат; комплимент должен быть правдивым и конкретным.",
    tenderness: "Оставайся в несексуальной нежности: чередуй объятия и поцелуи, успокаивающие прикосновения, массаж рук/плеч/ступней, заботу о волосах, медленный танец, тёплый напиток и обычное ласковое фото или видео. Не своди категорию к переписке.",
    desire: "Это прелюдия, не сам секс: чередуй флирт, поцелуй, дразнящий жест через одежду, чувственный массаж с интимным прикосновением, совместный душ, личное интимное фото или короткое видео-приветствие партнёру. Фото и видео — только по желанию, лично партнёру, без отправки кому-либо ещё и без публикации.",
     passion: "Бери разнообразные конкретные сексуальные действия из примеров ниже: оральные ласки, взаимную позу 69 (только Together), проникающий секс в разных позициях, анальную стимуляцию или секс, чувственные детали, душ или ванну, уединённую припаркованную машину. Ручная стимуляция не должна быть центральным действием чаще одного раза на двадцать заданий. Выбирай один основной акт и соблюдай анатомию.",
     hard: "Бери прямые сексуальные действия только из примеров ниже: оральный секс, проникающий секс в разных позициях, анальную стимуляцию или секс, душ или ванну, уединённую припаркованную машину; подчинение — только Together. Ручная стимуляция не должна быть центральным действием чаще одного раза на двадцать заданий. Жёсткость допустима только в рамках названного акта.",
  },
  en: {
    compliments: "Do not default to “I miss you” or plain texts. Rotate specific spoken praise, a short voice note, a handwritten note, an ordinary selfie or short video with a precise compliment, and appreciation of a real skill or quality. Choose one format; keep praise truthful and specific.",
    tenderness: "Keep it nonsexual. Rotate hugs and kisses, reassuring touch, hand/shoulder/foot care, gentle hair care, a slow dance, a warm drink, and an ordinary affectionate photo or video. Do not reduce the category to texting.",
    desire: "Keep this at foreplay, not sex itself. Rotate flirtation, a kiss, teasing through clothing, sensual massage with intimate touch, a shared shower, a private intimate photo, or a short private greeting video for the partner. Media is optional, only for the partner, never forwarded or posted.",
     passion: "Draw varied concrete sexual activities from the examples below: oral pleasure, mutual 69 (Together only), penetrative sex in varied positions, anal stimulation or anal sex, sensual details, shower or bath sex, and sex in a secluded parked car. Hand- or finger-led stimulation may be the central act no more than once in twenty tasks. Choose one main act and keep anatomy clear.",
     hard: "Use direct sexual acts from the examples below: oral sex, penetrative sex in varied positions, anal stimulation or anal sex, shower or bath sex, and sex in a secluded parked car; submission is Together-only. Hand- or finger-led stimulation may be the central act no more than once in twenty tasks. Name the direct act.",
  },
  hi: {
    compliments: "हर बार “मुझे तुम्हारी याद आती है” जैसे संदेश न चुनें। खास और सच्ची मौखिक तारीफ़, छोटा वॉइस नोट, हाथ से लिखा नोट, सटीक तारीफ़ वाला सामान्य सेल्फ़ी या छोटा वीडियो, और किसी वास्तविक गुण या हुनर की सराहना—इनका बारी-बारी से उपयोग करें। एक ही तरीका चुनें।",
    tenderness: "इसे गैर-यौन कोमलता तक रखें। गले लगना और चूमना, आश्वस्त करने वाला स्पर्श, हाथ/कंधे/पैर की देखभाल, बालों को प्यार से सँवारना, धीमा नृत्य, गर्म पेय, और सामान्य स्नेहपूर्ण फोटो या वीडियो—इनमें विविधता रखें। इसे केवल संदेशों तक सीमित न करें।",
    desire: "इसे सेक्स नहीं, बल्कि शुरुआती अंतरंगता रखें: फ़्लर्ट, चुंबन, कपड़ों के ऊपर से चिढ़ाना, अंतरंग स्पर्श वाला कामुक मसाज, साथ में शॉवर, निजी अंतरंग फ़ोटो, या साथी के लिए छोटा निजी वीडियो-संदेश। मीडिया वैकल्पिक हो, केवल साथी के लिए; आगे न भेजें और प्रकाशित न करें।",
     passion: "नीचे दिए गए उदाहरणों से ठोस यौन गतिविधियों में विविधता लें: ओरल आनंद, आपसी 69 (केवल Together), प्रवेश वाला सेक्स और अलग-अलग स्थितियाँ, गुदा उत्तेजना या सेक्स, संवेदनात्मक विवरण, शॉवर या बाथ में सेक्स, और एकांत में खड़ी कार। हाथ या उंगलियों से उत्तेजना बीस में एक से अधिक कामों का मुख्य कार्य न बने। एक मुख्य क्रिया चुनें और शरीर-संबंधी विवरण स्पष्ट रखें।",
     hard: "नीचे दिए गए उदाहरणों से सीधे यौन कृत्य चुनें: ओरल सेक्स, प्रवेश वाला सेक्स और अलग-अलग स्थितियाँ, गुदा उत्तेजना या सेक्स, शॉवर या बाथ में सेक्स, और एकांत में खड़ी कार; समर्पण केवल Together में। हाथ या उंगलियों से उत्तेजना बीस में एक से अधिक कामों का मुख्य कार्य न बने। स्पष्ट यौन क्रिया चुनें।",
  },
  pt: {
    compliments: "Não use sempre “estou com saudades” ou uma mensagem simples. Alterne elogios específicos ditos ao vivo, um áudio curto, um bilhete escrito à mão, uma selfie comum ou um vídeo curto com um elogio preciso, e o reconhecimento de uma qualidade ou habilidade real. Escolha um formato e seja sincero.",
    tenderness: "Mantenha o carinho não sexual. Varie entre abraços e beijos, toque reconfortante, cuidado com mãos/ombros/pés, carinho no cabelo, dança lenta, uma bebida quente e uma foto ou vídeo afetuoso comum. Não reduza a categoria a mensagens.",
    desire: "Fique nas preliminares, sem descrever o sexo: flerte, beijo, provocação por cima da roupa, massagem sensual com toque íntimo, banho juntos, foto íntima privada ou um vídeo curto de saudação para o parceiro. A mídia é opcional, só para o parceiro; nunca encaminhe nem publique.",
     passion: "Use a variedade de ações sexuais concretas dos exemplos abaixo: prazer oral, 69 mútuo (somente Together), sexo com penetração em posições variadas, estímulo anal ou sexo anal, detalhes sensoriais, sexo no chuveiro ou na banheira e sexo em carro estacionado num local privado. Estímulo com mãos ou dedos pode ser o ato central no máximo uma vez a cada vinte tarefas. Escolha um ato principal e mantenha a anatomia clara.",
     hard: "Use atos sexuais diretos dos exemplos abaixo: sexo oral, sexo com penetração em posições variadas, estímulo anal ou sexo anal, sexo no chuveiro ou na banheira e sexo em carro estacionado num local privado; submissão somente em Together. Estímulo com mãos ou dedos pode ser o ato central no máximo uma vez a cada vinte tarefas. Nomeie claramente o ato.",
  },
  es: {
    compliments: "No uses siempre “te extraño” ni mensajes genéricos. Alterna elogios específicos en voz alta, una nota de voz breve, una nota escrita a mano, un selfie normal o un vídeo corto con un elogio preciso, y el reconocimiento de una habilidad o cualidad real. Elige un formato y sé sincero.",
    tenderness: "Mantén la ternura en lo no sexual. Alterna abrazos y besos, contacto reconfortante, cuidado de manos/hombros/pies, caricias en el pelo, un baile lento, una bebida caliente y una foto o vídeo afectuoso normal. No reduzcas la categoría a mensajes.",
    desire: "Quédate en los preliminares, sin describir el sexo: coqueteo, un beso, provocación sobre la ropa, masaje sensual con contacto íntimo, una ducha juntos, una foto íntima privada o un vídeo breve de saludo para la pareja. El contenido es opcional, solo para la pareja; no lo reenvíes ni publiques.",
     passion: "Usa la variedad de acciones sexuales concretas de los ejemplos: placer oral, 69 mutuo (solo Together), sexo con penetración en distintas posturas, estimulación anal o sexo anal, detalles sensoriales, sexo en la ducha o la bañera y sexo en un coche aparcado en un lugar privado. La estimulación con manos o dedos puede ser el acto central como máximo una vez cada veinte tareas. Elige un acto principal y mantén clara la anatomía.",
     hard: "Usa actos sexuales directos de los ejemplos: sexo oral, sexo con penetración en distintas posturas, estimulación anal o sexo anal, sexo en la ducha o la bañera y sexo en un coche aparcado en un lugar privado; sumisión solo en Together. La estimulación con manos o dedos puede ser el acto central como máximo una vez cada veinte tareas. Nombra el acto con claridad.",
  },
};

function getCategoryVarietyGuidance(category: string, lang: string): string {
  return CATEGORY_VARIETY_GUIDANCE[lang]?.[category]
    ?? CATEGORY_VARIETY_GUIDANCE.en[category]
    ?? "";
}

function getVariationInstruction(
  category: string,
  lang: string,
  requestId: string,
  mode: TaskMode,
  gender: string,
  recentVariationTags: TaskVariationTag[],
  recentPaidVariationTags: TaskVariationTag[],
): string {
  const examples = getTaskExampleEntries(category, requestId, mode, recentVariationTags, recentPaidVariationTags);
  if (examples.length === 0) return "";

  const selectedIndex = seededShuffle(
    examples.map((_, index) => index),
    hashSeed(`${requestId}:${lang}:${category}:${mode}:curated-focus`),
  )[0];
  const exampleNumber = selectedIndex + 1;
  const directions: Record<string, string> = {
    ru: `Для разнообразия возьми центральное действие только из примера №${exampleNumber} в списке ниже. Не копируй формулировку и не соединяй его с другими примерами; адаптируй роли, анатомию и тон к заданию.`,
    en: `For variety, take the central activity only from example #${exampleNumber} below. Do not copy its wording or combine it with other examples; adapt roles, anatomy, and tone to the requested task.`,
    hi: `विविधता के लिए नीचे दिए गए उदाहरण ${exampleNumber} की मुख्य गतिविधि ही लें। शब्द न दोहराएँ और कई उदाहरण न मिलाएँ; भूमिका, शरीर-संबंधी विवरण और शैली को अनुरोधित काम के अनुसार ढालें।`,
    pt: `Para variar, use somente a atividade central do exemplo ${exampleNumber} abaixo. Não copie a redação nem combine exemplos; adapte os papéis, a anatomia e o tom à tarefa solicitada.`,
    es: `Para variar, usa solo la actividad central del ejemplo ${exampleNumber}. No copies su redacción ni combines ejemplos; adapta los papeles, la anatomía y el tono a la tarea solicitada.`,
  };
  return directions[lang] ?? directions.en;
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
  const clientVariationTags: TaskVariationTag[] = rawVariationTags
    .slice(-(MANUAL_STIMULATION_WINDOW - 1))
    .map((tag) => isTaskVariationTag(tag) ? tag : "other");
  let recentVariationTags = clientVariationTags;
  let recentPaidVariationTags: TaskVariationTag[] = [];
  if (PAID_CATEGORIES.has(category)) {
    const [categoryHistory, paidHistory] = await Promise.all([
      supabase.from("generated_tasks")
        .select("task_text")
        .eq("user_id", caller.id)
        .eq("category", category)
        .order("created_at", { ascending: false })
        .limit(MANUAL_STIMULATION_WINDOW - 1),
      supabase.from("generated_tasks")
        .select("task_text")
        .eq("user_id", caller.id)
        .in("category", ["passion", "hard"])
        .order("created_at", { ascending: false })
        .limit(MANUAL_STIMULATION_WINDOW - 1),
    ]);
    if (categoryHistory.error) {
      console.warn("[task-generation] recent task history unavailable", {
        category, mode, scope: "category", code: categoryHistory.error.code ?? "unknown",
      });
    } else {
      recentVariationTags = [...(categoryHistory.data ?? [])]
        .reverse()
        .map((row: { task_text?: unknown }) =>
          getVariationTagAcrossLanguages(String(row.task_text ?? ""), lang) ?? "other"
        );
    }
    if (paidHistory.error) {
      console.warn("[task-generation] recent task history unavailable", {
        category, mode, scope: "paid_categories", code: paidHistory.error.code ?? "unknown",
      });
    } else {
      recentPaidVariationTags = [...(paidHistory.data ?? [])]
        .reverse()
        .map((row: { task_text?: unknown }) =>
          getVariationTagAcrossLanguages(String(row.task_text ?? ""), lang) ?? "other"
        );
    }
  }
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
  const dailyCategory = premium && PAID_CATEGORIES.has(category) ? `premium_${category}` : category;
  const [{ data: dailyUsage, error: dailyUsageError }, { data: referralCredit, error: referralError }, { data: paidCredit, error: paidCreditError }] = await Promise.all([
    supabase.from("user_daily_limits").select("count,bonus").eq("user_id", caller.id).eq("category", dailyCategory).eq("date", appDate()).maybeSingle(),
    supabase.from("referral_task_credits").select("balance").eq("user_id", caller.id).eq("category", category).maybeSingle(),
    supabase.from("premium_task_credits").select("balance").eq("user_id", caller.id).eq("category", category).maybeSingle(),
  ]);
  if (dailyUsageError || referralError || paidCreditError) return res.status(500).json({ error: "limits_read_failed" });
  const baseLimit = PAID_CATEGORIES.has(category) && !premium ? 0 : FREE_LIMIT + Number(dailyUsage?.bonus ?? 0);
  const available = Math.max(0, baseLimit - Number(dailyUsage?.count ?? 0))
    + Number(referralCredit?.balance ?? 0) + Number(paidCredit?.balance ?? 0);
  if (available < 1) {
    const error = PAID_CATEGORIES.has(category) && !premium ? "subscription_required" : "limit_exceeded";
    return res.status(403).json({ error, remaining: 0, isPremium: premium });
  }

  type AiFallbackReason =
    | "missing_key"
    | "timeout"
    | "network_error"
    | "rate_limited"
    | "upstream_error"
    | "upstream_rejected"
    | "invalid_response"
    | "empty_response"
    | "quality_rejected";
  const RETRYABLE_AI_REASONS = new Set<AiFallbackReason>([
    "network_error", "upstream_error", "invalid_response", "empty_response", "quality_rejected",
  ]);
  let task: string | null = null;
  let source: "ai" | "fallback" = "ai";
  let fallbackReason: AiFallbackReason | null = DEEPSEEK_API_KEY ? null : "missing_key";
  let aiHttpStatus: number | null = null;
  const aiStartedAt = Date.now();
  if (DEEPSEEK_API_KEY) {
    for (let attempt = 0; attempt < 2 && !task; attempt += 1) {
      const attemptRequestId = attempt === 0 ? requestId : `${requestId}:retry`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12_000);
      let attemptReason: AiFallbackReason | null = null;
      aiHttpStatus = null;
      try {
        const roleInstruction = getGenderLine(lang, gender);
        const retryInstruction = attempt === 0 ? "" : ({
          ru: "Это повторная попытка: придумай новое задание с другим центральным действием, строго следуя выбранному фокусу разнообразия и проверкам качества.",
          en: "This is a retry: write a new task with a different central act, following the selected variety focus and all quality rules.",
          hi: "यह दोबारा कोशिश है: अलग मुख्य क्रिया वाला नया काम लिखें और चुने हुए विविधता-फोकस व गुणवत्ता नियमों का पालन करें।",
          pt: "Esta é uma nova tentativa: crie uma tarefa com outro ato central, seguindo o foco de variedade e todas as regras de qualidade.",
          es: "Este es un nuevo intento: escribe una tarea con otro acto central y sigue el enfoque de variedad y todas las reglas de calidad.",
        } as Record<Lang, string>)[lang as Lang];
        const systemPrompt = `${getPrompt(category, lang)}\n\n${WRITING_STYLE_INSTRUCTIONS[lang] ?? WRITING_STYLE_INSTRUCTIONS.en}\n\n${MODE_INSTRUCTIONS[mode][lang]}\n\n${getCategoryVarietyGuidance(category, lang)}\n\n${getVariationInstruction(category, lang, attemptRequestId, mode, gender, recentVariationTags, recentPaidVariationTags)}\n\n${retryInstruction}\n\n${roleInstruction}\n\n${getTaskQualityRules(lang, mode)}\n\n${LANGUAGE_INSTRUCTIONS[lang]}`;
        const aiRes = await fetch(DEEPSEEK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${DEEPSEEK_API_KEY}` },
          signal: controller.signal,
          body: JSON.stringify({ model: "deepseek-chat", messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: [
              LANGUAGE_INSTRUCTIONS[lang],
              getTaskExamplesPrompt(category, lang, attemptRequestId, mode, gender, recentVariationTags, recentPaidVariationTags),
            ].filter(Boolean).join("\n\n") },
          ], max_tokens: 180, temperature: 0.9 }),
        });
        aiHttpStatus = aiRes.status;
        if (!aiRes.ok) {
          attemptReason = aiRes.status === 429
            ? "rate_limited"
            : aiRes.status >= 500 ? "upstream_error" : "upstream_rejected";
        } else {
          let data: any;
          try {
            data = await aiRes.json();
          } catch {
            attemptReason = "invalid_response";
          }
          if (attemptReason !== "invalid_response") {
            if (!data || typeof data !== "object" || !Array.isArray(data.choices)) {
              attemptReason = "invalid_response";
            } else {
              const candidate = String(data.choices?.[0]?.message?.content ?? "").replace(/^["']|["']$/g, "").replace(/^\d+\.\s*/, "").trim();
              const forbidden = ["я рекомендую", "тебе стоит", "можешь попробовать"];
              const candidateVariationTag = getTaskVariationTag(candidate, lang);
              const manualStimulationAllowed = isManualStimulationAllowed(recentPaidVariationTags);
              const repeatsRecentVariation = candidateVariationTag !== null
                && recentVariationTags.includes(candidateVariationTag);
              if (!candidate) {
                attemptReason = "empty_response";
              } else if (candidate.length >= 15 && candidate.length <= MAX_TASK_CHARS
                && matchesRequestedLanguage(candidate, lang)
                && isTaskTextWellFormed(candidate, lang, mode)
                && isTaskTextModeAppropriate(candidate, lang, mode)
                && hasAnatomicallyClearOralAct(candidate, lang, mode, gender === "female" ? "female" : "male")
                && hasCategorySexualAct(candidate, category, lang)
                && (manualStimulationAllowed || !isManualStimulationTask(candidate, lang))
                && !repeatsRecentVariation
                && !(mode === "solo" && (MUTUAL_ONLY_TASK_MARKERS[lang] ?? MUTUAL_ONLY_TASK_MARKERS.en).test(candidate))
                && isTaskExampleMediaAllowed(candidate, category, lang, mode)
                && !forbidden.some(f => candidate.toLowerCase().includes(f))) {
                task = candidate;
              } else {
                attemptReason = "quality_rejected";
              }
            }
          }
        }
      } catch (error) {
        attemptReason = error instanceof Error && error.name === "AbortError"
          ? "timeout"
          : "network_error";
      } finally {
        clearTimeout(timeout);
      }
      fallbackReason = task ? null : attemptReason ?? "network_error";
      if (!task && attempt === 0 && fallbackReason && RETRYABLE_AI_REASONS.has(fallbackReason)) {
        console.info("[task-generation] retrying AI request", {
          category, lang, mode, reason: fallbackReason, httpStatus: aiHttpStatus,
        });
        if (fallbackReason === "network_error" || fallbackReason === "upstream_error") {
          await new Promise((resolve) => setTimeout(resolve, 250));
        }
      } else {
        break;
      }
    }
  }

  if (!task) {
    const reason = fallbackReason ?? "network_error";
    console.warn("[task-generation] AI fallback", {
      category, lang, mode, reason, httpStatus: aiHttpStatus, elapsedMs: Date.now() - aiStartedAt,
    });
    if (PAID_CATEGORIES.has(category)) {
      return res.status(503).json({ error: "ai_unavailable", retryable: true });
    }
    try {
      task = getFallback(category, lang, mode, requestId, gender, recentVariationTags);
      source = "fallback";
    } catch {
      return res.status(503).json({ error: "task_generation_unavailable", retryable: true });
    }
  }
  if (source === "ai") {
    console.info("[task-generation] AI generated task", {
      category, lang, mode, elapsedMs: Date.now() - aiStartedAt,
    });
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
