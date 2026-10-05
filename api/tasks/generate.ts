// api/tasks/generate.ts
// POST /api/tasks/generate
// Body: { category, lang, gender? }

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { randomUUID } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { validateTelegramInitData } from "../couple/_auth.js";
import { appDate } from "../limits.js";
import { claimFriendInvite } from "../referrals/_claim.js";
import { getTaskQualityRules, isTaskTextWellFormed } from "../../src/data/task-quality.js";
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
const MAX_TASK_CHARS = 280;
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

type StaticPool = Record<string, string[]>;

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
    compliments: ["В ближайшие сутки в свободные минуты отправляйте друг другу обычные селфи с короткими подписями-комплиментами; пусть каждое остаётся личным."],
    tenderness: ["В ближайшие сутки обнимайтесь при каждой встрече, а если будете врозь — отправьте друг другу по одному короткому тёплому голосовому сообщению."],
    desire: ["В течение ближайших суток обменивайтесь короткими флиртующими сообщениями в свободное время, а при встрече оставьте один долгий поцелуй на границе прелюдии."],
    passion: ["В течение дня обменяйтесь по одному чувственному намёку, а когда останетесь вдвоём, займитесь медленным сексом, меняя темп по реакции друг друга."],
    hard: ["В течение дня обменяйтесь откровенными сообщениями о желании; при встрече женщина наклоняется и упирается ладонями в стену, а мужчина входит в неё сзади в уверенном ритме."],
  },
  en: {
    compliments: ["Over the next 24 hours, send each other ordinary selfies with short compliment captions whenever you have a free moment; keep them private."],
    tenderness: ["Over the next day, share a brief hug whenever you meet; if you are apart, send each other one warm, short voice note."],
    desire: ["Over the next 24 hours, trade brief flirty messages in your free moments, then share one lingering kiss when you meet and stop at the edge of foreplay."],
    passion: ["Trade one sensual hint during the day, then enjoy slow sex when you are together, changing pace in response to each other."],
    hard: ["Trade explicit messages about what you want during the day; when you meet, she leans against the wall and he enters her from behind with a firm rhythm."],
  },
  hi: {
    compliments: ["अगले 24 घंटों में, खाली समय मिलने पर एक-दूसरे को साधारण सेल्फ़ी के साथ छोटा तारीफ़ भरा कैप्शन भेजें; तस्वीरें सिर्फ़ आप दोनों तक रहें।"],
    tenderness: ["अगले 24 घंटों में हर मुलाक़ात पर थोड़ी देर गले मिलें; दूर हों तो एक-दूसरे को छोटा और स्नेह भरा वॉइस मैसेज भेजें।"],
    desire: ["अगले 24 घंटों में खाली समय पर छोटे फ़्लर्टिंग संदेश भेजें, फिर मिलने पर एक लंबा चुंबन साझा करें और चुंबन को ही इस काम का अंत रखें।"],
    passion: ["दिन में एक कामुक संकेत भेजें, फिर साथ होने पर धीरे-धीरे सेक्स करें और एक-दूसरे की प्रतिक्रिया के अनुसार गति बदलें।"],
    hard: ["दिन में अपनी इच्छा के बारे में स्पष्ट संदेश भेजें; मिलने पर महिला दीवार की ओर झुके और पुरुष पीछे से प्रवेश करे, एक दृढ़ लय के साथ।"],
  },
  pt: {
    compliments: ["Nas próximas 24 horas, enviem selfies comuns com legendas curtas de elogio nos momentos livres; mantenham as fotos privadas entre vocês."],
    tenderness: ["Nas próximas 24 horas, troquem um abraço breve sempre que se encontrarem; se estiverem longe, enviem uma mensagem de voz carinhosa."],
    desire: ["Nas próximas 24 horas, troquem mensagens curtas de flerte nos momentos livres e depois compartilhem um beijo demorado quando se encontrarem."],
    passion: ["Troquem uma sugestão sensual durante o dia e, quando estiverem juntos, façam sexo devagar, ajustando o ritmo às reações um do outro."],
    hard: ["Troquem mensagens explícitas sobre o que desejam durante o dia; ao se encontrarem, ela se inclina contra a parede e ele a penetra por trás num ritmo firme."],
  },
  es: {
    compliments: ["Durante las próximas 24 horas, envíense selfies normales con frases breves de cumplido cuando tengan un rato libre; manténganlas en privado."],
    tenderness: ["Durante las próximas 24 horas, abrácense brevemente cada vez que se encuentren; si están separados, envíense una nota de voz cariñosa."],
    desire: ["Durante las próximas 24 horas, intercambien mensajes breves de coqueteo en sus ratos libres y luego compartan un beso largo al verse."],
    passion: ["Envíense una insinuación sensual durante el día y, cuando estén juntos, disfruten de sexo lento, ajustando el ritmo a las reacciones del otro."],
    hard: ["Intercambien mensajes explícitos sobre lo que desean durante el día; al verse, ella se inclina contra la pared y él la penetra por detrás con un ritmo firme."],
  },
};

function isTaskMode(mode: string): mode is TaskMode {
  return MODES.has(mode as TaskMode);
}

function getFallback(cat: string, lang: string, mode: TaskMode): string {
  const pool = DAILY_TASK_FALLBACKS[lang] ?? DAILY_TASK_FALLBACKS.en;
  const list = pool[cat] ?? pool.compliments;
  const wellFormed = list.filter(task => isTaskTextWellFormed(task, lang, mode));
  const candidates = wellFormed.length > 0 ? wellFormed : list;
  return candidates[Math.floor(Math.random() * candidates.length)];
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
    ru: "Режим «один инициирует»: задание первым получает один совершеннолетний пользователь, но выполняет его вместе со взрослым партнёром. Это всегда совместное действие пары, не самопомощь и не уход за собой.",
    en: "One-person-start mode: one adult user receives the task first, but completes it with their adult partner. It must be a shared couple action, never self-care or something done alone.",
    hi: "एक व्यक्ति-शुरू मोड: एक वयस्क उपयोगकर्ता को काम पहले मिलता है, लेकिन वह इसे अपने वयस्क साथी के साथ करता है। यह जोड़े की साझा गतिविधि हो, अकेले की देखभाल या अकेली क्रिया नहीं।",
    pt: "Modo iniciado por uma pessoa: um usuário adulto recebe a tarefa primeiro, mas a realiza com seu parceiro adulto. A atividade deve ser do casal, nunca autocuidado ou algo feito sozinho.",
    es: "Modo iniciado por una persona: un usuario adulto recibe la tarea primero, pero la realiza con su pareja adulta. Debe ser una actividad compartida, nunca autocuidado ni algo que se haga a solas.",
  },
  together: {
    ru: "Парный режим: один инициирует задание в приложении, а партнёру автоматически отправляется тот же текст в Telegram. Создай одно общее действие для совершеннолетних мужчины и женщины, не два отдельных задания. Сохраняй роли, анатомию и физически правдоподобную последовательность.",
    en: "Together mode: one person starts the task in the app and the identical text is automatically sent to their partner in Telegram. Create one shared action for an adult man and woman, not two separate tasks. Keep roles, anatomy, and physical sequence plausible.",
    hi: "साथी मोड: एक व्यक्ति ऐप में काम शुरू करता है और वही पाठ उसके साथी को Telegram पर अपने-आप भेजा जाता है। वयस्क पुरुष और महिला के लिए एक साझा गतिविधि लिखें, दो अलग काम नहीं; भूमिकाएँ और शारीरिक क्रम सही रखें।",
    pt: "Modo a dois: uma pessoa inicia a tarefa no app e o mesmo texto é enviado automaticamente ao parceiro pelo Telegram. Crie uma única ação compartilhada por um homem e uma mulher adultos, não duas tarefas; mantenha papéis, anatomia e sequência plausíveis.",
    es: "Modo en pareja: una persona inicia la tarea en la app y el mismo texto se envía automáticamente a su pareja por Telegram. Crea una sola acción compartida por un hombre y una mujer adultos, no dos tareas; mantén coherentes los papeles, la anatomía y la secuencia.",
  },
};

// ─── ПРОМПТЫ (ИИ сам придумывает, а не выбирает из списка) ────────────────

const PROMPTS: Record<string, Record<string, string>> = {
  compliments: {
    ru: `Ты создаёшь одно задание для категории «КОМПЛИМЕНТЫ» в гетеросексуальной паре мужчина–женщина.

Стиль: естественное обращение на «ты», конкретный поступок или наблюдение, одна выразительная деталь. Задание должно звучать лично, а не как общий комплимент из открытки.
Категория только про слова и знаки внимания: сказать или написать комплимент, поблагодарить за конкретную мелочь, напомнить об общем тёплом воспоминании. Можно предложить в течение дня обмениваться обычными личными селфи с короткими подписями-комплиментами; никаких интимных фото или публикаций.

Придумай новое задание в духе приложенных примеров, не копируя их. Одно ясное действие; максимум 1–3 связанных шага, обычно 1–2 предложения. Не добавляй шаблонный финал «пусть почувствует». До ${MAX_TASK_CHARS} символов. Верни только текст задания.`,
    en: `Create one task for the "COMPLIMENTS" category for a heterosexual man-woman couple.

Style: natural direct address, one specific observation or gesture, and one vivid detail. Make it personal rather than a generic greeting-card compliment.
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

  let task = getFallback(category, lang, mode);
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
          { role: "user", content: LANGUAGE_INSTRUCTIONS[lang] },
        ], max_tokens: 180, temperature: 0.82 }),
      });
      if (aiRes.ok) {
        const data = await aiRes.json();
        const candidate = String(data.choices?.[0]?.message?.content ?? "").replace(/^["']|["']$/g, "").replace(/^\d+\.\s*/, "").trim();
        const forbidden = ["я рекомендую", "тебе стоит", "можешь попробовать"];
        if (candidate.length >= 15 && candidate.length <= MAX_TASK_CHARS
          && matchesRequestedLanguage(candidate, lang)
          && isTaskTextWellFormed(candidate, lang, mode)
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
