// api/tasks/generate.ts
// POST /api/tasks/generate
// Body: { category, lang, gender? }

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { randomUUID } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { validateTelegramInitData } from "../couple/_auth.js";
import { appDate } from "../limits.js";
import { claimFriendInvite } from "../referrals/_claim.js";
import { TASKS_RU } from "../../src/data/tasks-ru.js";
import { TASKS_EN } from "../../src/data/tasks-en.js";
import { TASKS_HI } from "../../src/data/tasks-hi.js";
import { TASKS_PT } from "../../src/data/tasks-pt.js";
import { TASKS_ES } from "../../src/data/tasks-es.js";
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

async function notifyPartner(chatId: number, partnerUserId: number, coupleId: string, taskId: string, lang: string): Promise<boolean> {
  if (!BOT_TOKEN || !APP_URL) return false;
  const { data: preference, error: preferenceError } = await supabase
    .from("couple_member_preferences")
    .select("telegram_notifications_enabled")
    .eq("couple_id", coupleId)
    .eq("user_id", partnerUserId)
    .maybeSingle();
  if (preferenceError || preference?.telegram_notifications_enabled !== true) return false;
  const messages: Record<string, { text: string; button: string }> = {
    ru: { text: "Партнёр выбрал общее задание для вас двоих. Откройте его в Touché, когда будете готовы.", button: "Открыть наше задание" },
    en: { text: "Your partner picked a shared task for the two of you. Open it in Touché when you’re ready.", button: "Open our task" },
    hi: { text: "आपके साथी ने आप दोनों के लिए एक साझा काम चुना है। तैयार होने पर इसे Touché में खोलें।", button: "हमारा काम खोलें" },
    pt: { text: "Seu parceiro escolheu uma tarefa para vocês dois. Abram no Touché quando estiverem prontos.", button: "Abrir nossa tarefa" },
    es: { text: "Tu pareja eligió una tarea para ambos. Ábranla en Touché cuando estén listos.", button: "Abrir nuestra tarea" },
  };
  const message = messages[lang] ?? messages.en;
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
        chat_id: chatId,
        text: message.text,
        reply_markup: { inline_keyboard: [[{ text: message.button, web_app: { url } }]] },
      }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

const STATIC_POOLS: Record<string, StaticPool> = {
  ru: TASKS_RU,
  en: TASKS_EN,
  hi: TASKS_HI,
  pt: TASKS_PT,
  es: TASKS_ES,
};

const SOLO_FALLBACKS: Record<string, StaticPool> = {
  ru: {
    compliments: ["Назови три качества, которые ценишь в себе, и произнеси вслух то, которое сейчас особенно важно."],
    tenderness: ["Нанеси немного крема на руки и медленно помассируй каждую ладонь, не отвлекаясь на экран."],
    desire: ["Проведи ладонью по телу поверх одежды и задержись там, где предвкушение ощущается сильнее."],
    passion: ["Устрой себе личный чувственный момент: исследуй прикосновениями одну зону тела в удобном для тебя темпе."],
    hard: ["Выбери одно уверенное, прямое прикосновение к себе и несколько минут сохраняй выбранный ритм."],
  },
  en: {
    compliments: ["Name three things you appreciate about yourself, then say the one you most need to hear out loud."],
    tenderness: ["Warm a little lotion between your palms and slowly massage each hand without looking at a screen."],
    desire: ["Trace a slow touch over your clothes and linger where the anticipation feels strongest."],
    passion: ["Make a private sensual moment for yourself: explore one area of your body at a pace that feels comfortable."],
    hard: ["Choose one firm, direct touch for yourself and keep a deliberate rhythm for a few minutes."],
  },
  hi: {
    compliments: ["अपने बारे में तीन ऐसी बातें बोलें जिनकी आप कद्र करते हैं, फिर उनमें से एक बात ज़ोर से कहें।"],
    tenderness: ["हथेलियों में थोड़ा लोशन गर्म करें और बिना स्क्रीन देखे हर हथेली की धीरे-धीरे मालिश करें।"],
    desire: ["कपड़ों के ऊपर अपनी त्वचा पर धीरे हाथ फेरें और जहाँ उत्सुकता अधिक लगे वहाँ ठहरें।"],
    passion: ["अपने लिए एक निजी, संवेदनशील पल बनाएँ और अपनी सुविधा की गति से शरीर के एक हिस्से को स्पर्श से महसूस करें।"],
    hard: ["अपने लिए एक दृढ़ और स्पष्ट स्पर्श चुनें और कुछ मिनट उसी लय को बनाए रखें।"],
  },
  pt: {
    compliments: ["Diga três qualidades que você aprecia em si e fale em voz alta aquela que mais precisa ouvir hoje."],
    tenderness: ["Aqueça um pouco de creme entre as mãos e massageie cada palma devagar, sem olhar para a tela."],
    desire: ["Deslize a mão lentamente sobre a roupa e demore onde a expectativa parecer mais forte."],
    passion: ["Crie um momento sensual só seu: explore uma região do corpo no ritmo que for confortável."],
    hard: ["Escolha um toque firme e direto em si e mantenha um ritmo intencional por alguns minutos."],
  },
  es: {
    compliments: ["Di tres cosas que valoras de ti y expresa en voz alta la que más necesitas escuchar hoy."],
    tenderness: ["Calienta un poco de crema entre las manos y masajea cada palma despacio, sin mirar la pantalla."],
    desire: ["Desliza la mano lentamente sobre la ropa y detente donde la expectativa se sienta más intensa."],
    passion: ["Regálate un momento sensual y privado: explora una zona de tu cuerpo al ritmo que te resulte cómodo."],
    hard: ["Elige un toque firme y directo para ti y mantén un ritmo deliberado durante unos minutos."],
  },
};

function isTaskMode(mode: string): mode is TaskMode {
  return MODES.has(mode as TaskMode);
}

function getFallback(cat: string, lang: string, mode: TaskMode): string {
  if (mode === "solo") {
    const pool = SOLO_FALLBACKS[lang] ?? SOLO_FALLBACKS.en;
    const options = pool[cat] ?? pool.compliments;
    return options[Math.floor(Math.random() * options.length)];
  }
  const pool = STATIC_POOLS[lang] ?? STATIC_POOLS["en"];
  const list = (pool as StaticPool)[cat] ?? (pool as StaticPool)["compliments"];
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

function getSoloGenderLine(lang: string, gender: string): string {
  const copy: Record<string, Record<string, string>> = {
    ru: {
      male: "Пользователь — совершеннолетний мужчина. Обращайся к нему на «ты»; в задании действует только он.",
      female: "Пользователь — совершеннолетняя женщина. Обращайся к ней на «ты»; в задании действует только она.",
    },
    en: {
      male: "The user is an adult man. Address him directly as 'you'; he is the only person in the task.",
      female: "The user is an adult woman. Address her directly as 'you'; she is the only person in the task.",
    },
    hi: {
      male: "उपयोगकर्ता वयस्क पुरुष है। सीधे 'आप' कहकर संबोधित करें; कार्य में केवल वही व्यक्ति शामिल है।",
      female: "उपयोगकर्ता वयस्क महिला है। सीधे 'आप' कहकर संबोधित करें; कार्य में केवल वही व्यक्ति शामिल है।",
    },
    pt: {
      male: "O usuário é um homem adulto. Fale diretamente com 'você'; somente ele participa da tarefa.",
      female: "A usuária é uma mulher adulta. Fale diretamente com 'você'; somente ela participa da tarefa.",
    },
    es: {
      male: "El usuario es un hombre adulto. Háblale directamente de tú; solo él participa en la tarea.",
      female: "La usuaria es una mujer adulta. Háblale directamente de tú; solo ella participa en la tarea.",
    },
  };
  return copy[lang]?.[gender] ?? copy.en.male;
}

const MODE_INSTRUCTIONS: Record<string, Record<string, string>> = {
  solo: {
    ru: "Режим «один»: создай задание для одного совершеннолетнего пользователя, которое он выполняет самостоятельно. Это указание важнее формулировок о паре в описании категории. Не упоминай партнёра, взаимодействие или действия второго человека. В комплиментах — самоподдержка, в нежности — бережный уход за собой; чувственные категории остаются одиночными.",
    en: "Solo mode: write for one adult user acting alone. This instruction overrides couple wording in the category description. Do not mention a partner, interaction, or actions by a second person. Compliments should be self-affirming; tenderness should be self-care. Sensual categories remain solo.",
    hi: "एकल मोड: एक वयस्क उपयोगकर्ता के लिए काम लिखें जो इसे अकेले करे। यह निर्देश श्रेणी के जोड़े-संबंधी वर्णन से ऊपर है। साथी, बातचीत या दूसरे व्यक्ति की क्रिया का उल्लेख न करें। प्रशंसा आत्म-प्रोत्साहन हो और कोमलता स्वयं की देखभाल हो।",
    pt: "Modo individual: escreva para uma pessoa adulta que realiza a tarefa sozinha. Esta regra prevalece sobre qualquer descrição de casal na categoria. Não mencione parceiro, interação ou ações de outra pessoa. Elogios são de autoestima; carinho é autocuidado.",
    es: "Modo individual: escribe para una persona adulta que realiza la tarea a solas. Esta regla prevalece sobre cualquier descripción de pareja en la categoría. No menciones pareja, interacción ni acciones de otra persona. Los cumplidos son de autoestima y la ternura es autocuidado.",
  },
  together: {
    ru: "Парный режим: это одно общее задание для совершеннолетних мужчины и женщины, а не две отдельные роли. Оба участвуют в одном естественном ритуале; текст виден обоим. Соблюдай согласованное описание пола, анатомию и физически правдоподобный порядок действий.",
    en: "Together mode: create one shared task for an adult man and woman, not two separate roles. Both take part in the same natural ritual; both see the same text. Keep the stated genders, anatomy, and physical sequence plausible.",
    hi: "साथी मोड: वयस्क पुरुष और महिला के लिए एक साझा काम लिखें, दो अलग भूमिकाएँ नहीं। दोनों एक ही स्वाभाविक गतिविधि में भाग लें; वही पाठ दोनों देखेंगे।",
    pt: "Modo a dois: crie uma única tarefa compartilhada para um homem e uma mulher adultos, não dois papéis separados. Ambos participam do mesmo ritual natural e veem o mesmo texto.",
    es: "Modo en pareja: crea una sola tarea compartida para un hombre y una mujer adultos, no dos papeles separados. Ambos participan en el mismo ritual natural y ven el mismo texto.",
  },
};

// ─── ПРОМПТЫ (ИИ сам придумывает, а не выбирает из списка) ────────────────

const PROMPTS: Record<string, Record<string, string>> = {
  compliments: {
    ru: `Ты создаёшь одно задание для категории «КОМПЛИМЕНТЫ» в гетеросексуальной паре мужчина–женщина.

Стиль: естественное обращение на «ты», конкретный поступок или наблюдение, одна выразительная деталь. Задание должно звучать лично, а не как общий комплимент из открытки.
Категория только про слова и знаки внимания: сказать или написать комплимент, поблагодарить за конкретную мелочь, напомнить об общем тёплом воспоминании. Без физической близости, эротики и обязательных фото или видео.

Придумай новое задание в духе приложенных примеров, не копируя их. Одно ясное действие; максимум 1–3 связанных шага, обычно 1–2 предложения. Не добавляй шаблонный финал «пусть почувствует». До ${MAX_TASK_CHARS} символов. Верни только текст задания.`,
    en: `Create one task for the "COMPLIMENTS" category for a heterosexual man-woman couple.

Style: natural direct address, one specific observation or gesture, and one vivid detail. Make it personal rather than a generic greeting-card compliment.
This category is about words and thoughtful gestures only: give a specific compliment, thank the partner for a small real thing, or recall a warm shared memory. No physical intimacy, erotic content, or required photos/videos.

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
      "поблагодарить за одну конкретную недавнюю мелочь",
      "короткий голосовой комплимент без подарков и реквизита",
      "тёплая отсылка к общему воспоминанию",
      "спонтанный знак внимания, который не требует покупки",
    ],
    en: [
      "thank your partner for one specific recent small thing",
      "a short spoken compliment without gifts or props",
      "a warm reference to a shared memory",
      "a spontaneous small gesture that requires no purchase",
    ],
  },
  tenderness: {
    ru: [
      "короткое успокаивающее прикосновение без эротического продолжения",
      "объятие или забота о руках без реквизита",
      "мягкий массаж одной конкретной зоны",
      "спокойный совместный момент с одним понятным жестом заботы",
    ],
    en: [
      "a brief comforting touch without erotic escalation",
      "a hug or gentle hand care without props",
      "a gentle massage focused on one specific area",
      "a calm shared moment with one clear gesture of care",
    ],
  },
  desire: {
    ru: [
      "игривое предвкушение через одежду, до секса",
      "короткий шёпот о желании без длинного диалога",
      "чувственное сближение без съёмки и реквизита",
      "поцелуй или прикосновение, завершающееся на границе прелюдии",
    ],
    en: [
      "playful anticipation through clothing, before sex",
      "a brief whispered desire without extended dialogue",
      "sensual closeness without filming or props",
      "a kiss or touch that stays at the edge of foreplay",
    ],
  },
  passion: {
    ru: [
      "одна смена темпа и пауза, без фоновой музыки",
      "взаимные прикосновения и реакция друг на друга, без реквизита",
      "одна подходящая поза или угол, без длинной последовательности",
      "одна выразительная пауза или смена ритма",
      "завершить задание оргазмом, без автоматического продолжения после него",
      "внимание к одному желанию партнёра, без камеры и съёмки",
    ],
    en: [
      "one change of pace and a pause, without background music",
      "mutual touch and responding to each other, without props",
      "one suitable position or angle, not a long sequence",
      "one expressive pause or change of rhythm",
      "end the task with orgasm, with no automatic continuation afterward",
      "focus on one partner's stated desire, without cameras or recording",
    ],
  },
  hard: {
    ru: [
      "грязная прямая фраза без длинного диалога",
      "властный тон в одной короткой команде",
      "интенсивность через темп и ожидание, без реквизита",
      "одна выразительная деталь физического действия",
      "короткая игра с задержкой и нарастающим напряжением",
      "прямое описание желания без метафор и повторов",
    ],
    en: [
      "a dirty, direct line without extended dialogue",
      "a commanding tone in one short instruction",
      "intensity through pace and anticipation, without props",
      "one vivid detail of physical action",
      "brief teasing delay and rising tension",
      "direct wording of desire without metaphors or repetition",
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

  let partnerTgId: number | null = null;
  let partnerUserId: number | null = null;
  if (mode === "together") {
    if (!coupleId) return res.status(400).json({ error: "couple_id_required" });
    const { data } = await supabase.from("couples").select("user_a_id,user_b_id").eq("id", coupleId).maybeSingle();
    if (!data || (data.user_a_id !== caller.id && data.user_b_id !== caller.id)) return res.status(403).json({ error: "couple_access_denied" });
    partnerTgId = data.user_a_id === caller.id ? data.user_b_id : data.user_a_id;
    partnerUserId = partnerTgId;
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
        const roleInstruction = mode === "solo" ? getSoloGenderLine(lang, gender) : getGenderLine(lang, gender);
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
  const partnerNotified = mode === "together" && partnerTgId && saved.taskId
    ? await notifyPartner(partnerTgId, partnerUserId!, coupleId!, String(saved.taskId), lang)
    : false;
  return res.status(200).json({
    ok: true, task: saved.task, taskId: saved.taskId,
    source: saved.source, remaining: saved.remaining, isPremium: premium, partnerNotified,
  });
}
