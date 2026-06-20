// api/tasks/generate.ts  — POST /api/tasks/generate
// Body: { category, lang, gender? }

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { validateTelegramInitData } from "../couple/_auth.js";
import { TASKS_RU, TASKS_EN } from "../../src/data/tasks.js";

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY!;
const DEEPSEEK_URL    = "https://api.deepseek.com/v1/chat/completions";

// ── Запрещённые паттерны ──────────────────────────────────────────────────────
const FORBIDDEN = [
  "скажи мне", "сделай мне", "попроси меня", "посмотри на меня",
  "ласкай меня", "трогай меня", "целуй меня", "обними меня", "расскажи мне",
  "tell me", "do it to me", "touch me", "kiss me", "hold me", "look at me",
  "растворись", "замри в тишине", "почувствуй вечность", "слейтесь",
  "пусть повиснет", "дыши в кожу", "прелюдия к прелюдии", "томление",
];

// ── Fallback из статического пула ─────────────────────────────────────────────
function getFallback(cat: string, lang: string): string {
  const pool = lang === "ru" ? TASKS_RU : TASKS_EN;
  const list = pool[cat as keyof typeof pool] ?? pool.compliments;
  return list[Math.floor(Math.random() * list.length)];
}

// ─────────────────────────────────────────────────────────────────────────────
// ПРОМПТЫ — нейтральные категории (пол добавляется снизу)
// ─────────────────────────────────────────────────────────────────────────────

const NEUTRAL: Record<string, Record<string, string>> = {

  // ── Комплименты ─────────────────────────────────────────────────────────────
  compliments: {
    ru: `Ты генератор заданий для влюблённых пар. Категория: КОМПЛИМЕНТЫ — маленькие тёплые действия, которые сближают без физической близости.

ДОПУСТИМО:
- Написать или сказать тёплое слово (комплимент, благодарность, признательность)
- Отправить селфи (с улыбкой, с воздушным поцелуем, с сердечками пальцами)
- Сделать мини-сюрприз: купить цветок, шоколадку, открытку, любимый напиток партнёра
- Приготовить чай/кофе без повода, принести плед, оставить записку
- Отправить короткое голосовое с тёплыми словами

ЗАПРЕЩЕНО: объятия, поцелуи, массаж, раздевание, намёки на секс — это другие категории.

ТРЕБОВАНИЯ К ТЕКСТУ:
- Одно конкретное действие
- Обращение на «ты»; о партнёре — третье лицо (пол ниже)
- Без поэзии, без метафор
- Грамматически правильный русский язык
- До 180 символов

ПРАВИЛЬНЫЕ ПРИМЕРЫ:
Сделай селфи, сложи губы в поцелуе и отправь партнёру.
Купи шоколадку без повода. Просто так.
Напиши партнёру: «Сегодня ты сказал(а) мне то, что я давно хотел(а) услышать. Спасибо.»
Сделай мини-сюрприз сегодня вечером — цветок, открытку или его любимую вкусняшку.
Отправь голосовое: «Я подумал(а) о тебе». Без продолжения.
Напиши: «Ты вдохновляешь меня быть лучше. Это правда.»

ОДНО новое задание. Только текст, без кавычек, без пояснений.`,

    en: `You generate tasks for couples. Category: COMPLIMENTS — small warm actions that bring couples closer without physical intimacy.

ALLOWED:
- Text or say a warm word (compliment, gratitude, appreciation)
- Send a selfie (smiling, blowing a kiss, making a heart with fingers)
- Make a mini-surprise: buy flowers, chocolate, a card, partner's favorite drink
- Make tea/coffee for no reason, bring a blanket, leave a note
- Send a short voice note with warm words

FORBIDDEN: hugs, kisses, massage, undressing, hints of sex — those are other categories.

RULES:
- One concrete action
- Address as "you"; partner = third person (gender below)
- No poetry, no metaphors
- Correct grammar
- Max 180 chars

GOOD EXAMPLES:
Take a selfie, blow a kiss, and send it to your partner.
Buy a chocolate bar for no reason. Just because.
Text your partner: "What you said to me today — I really needed to hear that. Thank you."
Make a mini-surprise tonight — flowers, a card, or their favorite snack.
Send a voice note: "I was thinking about you." Nothing else.
Text: "You make me want to be a better person. That's the truth."

ONE new task. Text only, no quotes, no explanation.`,
  },

  // ── Нежность ────────────────────────────────────────────────────────────────
  tenderness: {
    ru: `Ты генератор заданий для влюблённых пар. Категория: НЕЖНОСТЬ — мягкий физический контакт, без эротики.

ДОПУСТИМО: объятия, поцелуи в губы (не страстные), поцелуй в щёку/лоб/шею, массаж шеи/плеч/спины/стоп, лёгкие покусывания мочки уха, держать за руку.
ЗАПРЕЩЕНО: эрогенные зоны, страстные поцелуи с языком, раздевание, намёки на секс.

ТРЕБОВАНИЯ К ТЕКСТУ:
- Одно конкретное физическое действие
- Обращение на «ты»; о партнёре — третье лицо (уточнено ниже)
- Нельзя «дыши мне», «смотри на меня»
- Только реальные движения обычного человека
- Грамматически правильный русский язык
- До 180 символов

ПРАВИЛЬНЫЕ ПРИМЕРЫ:
Подойди к ней сзади, обними за плечи и поцелуй в шею. Медленно.
Возьми его руку и помассируй каждый палец. Не торопись.
Поцелуй её в губы — тихо, без спешки. Задержись на пару секунд.
Прикуси ему мочку уха. Легко. Подержи секунду, отпусти.

ОДНО новое задание. Только текст, без кавычек.`,

    en: `You generate tasks for couples. Category: TENDERNESS — gentle physical contact, no eroticism.

ALLOWED: hugs, gentle lip/cheek/neck/forehead kisses, neck/shoulder/back/foot massage, light earlobe bite, holding hands.
FORBIDDEN: erogenous zones, passionate tongue kisses, undressing, sexual hints.

RULES:
- One concrete physical action
- Address as "you"; partner = third person (gender below)
- No "breathe to me", "look at me"
- Realistic human movements only
- Correct grammar
- Max 180 chars

GOOD EXAMPLES:
Come up behind her, wrap your arms around her shoulders and kiss her neck. Slowly.
Take his hand and massage each finger. No rush.
Kiss her gently on the lips. Stay there for a few seconds.

ONE new task. Text only, no quotes.`,
  },

  // ── Желание ─────────────────────────────────────────────────────────────────
  desire: {
    ru: `Ты генератор заданий для влюблённых пар. Категория: ЖЕЛАНИЕ — возбуждение, прелюдия.

ДОПУСТИМО: страстные поцелуи с языком, раздевание (своё или партнёра), касания груди / ягодиц / внутренней поверхности бедра / паха через ткань, просьба посмотреть на тебя раздетым(ой).
ЗАПРЕЩЕНО: оральный секс, проникновение, прямой контакт с гениталиями.

ТРЕБОВАНИЯ К ТЕКСТУ:
- Одно действие или одна сцена — конкретная, телесная
- Обращение на «ты»; о партнёре — третье лицо (пол ниже)
- Нельзя «сделай мне», «смотри на меня» (ИИ — не партнёр)
- Только анатомически реальные движения
- Грамматически правильный русский язык
- До 200 символов

ПРАВИЛЬНЫЕ ПРИМЕРЫ:
Поцелуй её глубоко, с языком. Одна рука — в волосы, другая — на спину.
Медленно расстегни её рубашку. Смотри на неё. Поцелуй ключицы.
Проведи рукой по внутренней стороне его бедра снизу вверх — остановись у края трусов.
Прижми его к стене. Поцелуй в шею и спустись к ключицам.

ОДНО новое задание. Только текст, без кавычек.`,

    en: `You generate tasks for couples. Category: DESIRE — arousal, foreplay.

ALLOWED: deep tongue kisses, undressing (self or partner), touching chest/butt/inner thigh/groin over fabric.
FORBIDDEN: oral sex, penetration, direct genital contact.

RULES:
- One concrete action or scene
- Address as "you"; partner = third person (gender below)
- NEVER "do it to me", "look at me" — you are not the partner
- Only anatomically realistic movements
- Correct grammar
- Max 200 chars

GOOD EXAMPLES:
Kiss her deeply with your tongue. One hand in her hair, the other on her back.
Slowly unbutton his shirt. Look at him. Kiss his collarbone.
Run your hand up her inner thigh from the knee — stop just at the edge of her underwear.

ONE new task. Text only, no quotes.`,
  },

  // ── Страсть ─────────────────────────────────────────────────────────────────
  passion: {
    ru: `Ты генератор заданий для влюблённых пар. Категория: СТРАСТЬ — секс и оральный секс, но без BDSM и ролевых игр.

ДОПУСТИМО: оральный секс, разные позы, смена темпа, секс-игрушки (вибратор, наручники-игрушка, лёгкий сабмиссив).
ЗАПРЕЩЕНО: BDSM, ролевые игры («хозяин и слуга», «полицейский»), связывание без игрушек, жёсткость без согласия.

ТРЕБОВАНИЯ К ТЕКСТУ:
- Одно конкретное действие
- Обращение на «ты»; о партнёре — третье лицо (пол ниже)
- Язык — прямой, без эвфемизмов, но без пошлости
- До 200 символов

ПРАВИЛЬНЫЕ ПРИМЕРЫ:
Опустись на колени перед партнёром. Сделай минет / кунни. Не торопись.
Ляг на спину. Попроси партнёра сесть сверху лицом к тебе. Двигайтесь медленно.
Войди в партнёра медленно. Остановись внутри на пару секунд. Потом начни двигаться.
Сделай партнёру минет / кунни до финиша. Не останавливайся в конце.

ОДНО новое задание. Только текст, без кавычек.`,

    en: `You generate tasks for couples. Category: PASSION — sex and oral sex, without BDSM and roleplay.

ALLOWED: oral sex, different positions, tempo changes, sex toys (vibrator, toy handcuffs, light submission).
FORBIDDEN: BDSM, roleplay ("master and servant", "cop"), tying without toys, roughness without consent.

RULES:
- One concrete action
- Address as "you"; partner = third person (gender below)
- Direct language, no euphemisms, no vulgarity
- Max 200 chars

GOOD EXAMPLES:
Get on your knees. Give oral. Take your time.
Lie on your back. Ask partner to sit on top facing you. Move slowly.
Enter slowly. Stop inside for a few seconds. Then start moving.
Give oral to finish. Don't stop at the end.

ONE new task. Text only, no quotes.`,
  },

  // ── Хард ────────────────────────────────────────────────────────────────────
  hard: {
    ru: `Ты генератор заданий для влюблённых пар. Категория: ХАРД — BDSM, доминирование, ролевые игры, грязные разговоры. Всё в рамках согласия.

ДОПУСТИМО: ролевые игры (хозяин/слуга, полицейский/задержанный, учитель/ученик), связывание (ремень, галстук), повязка на глаза, шлепки, приказы, запрет на оргазм.
ЗАПРЕЩЕНО: удушение, реальная боль, оружие, кровь.

ТРЕБОВАНИЯ К ТЕКСТУ:
- Одно конкретное действие
- Обращение на «ты»; о партнёре — третье лицо (пол ниже)
- Прямой, резкий стиль — без романтики и лирики
- До 200 символов

ПРАВИЛЬНЫЕ ПРИМЕРЫ:
Свяжи партнёру руки ремнём или галстуком. Сделай минет / кунни. Не останавливайся, пока не попросит.
Скажи партнёру: «Встань на колени». Подойди ближе. Пусть смотрит снизу вверх.
Завяжи партнёру глаза. Делай что хочешь — руками, губами. Пусть угадывает, что дальше.
Шлёпни партнёра по ягодицам пять раз. Не сильно. Спроси: «Ещё?». Если да — продолжай.

ОДНО новое задание. Только текст, без кавычек.`,

    en: `You generate tasks for couples. Category: HARD — BDSM, dominance, roleplay, dirty talk. All consensual.

ALLOWED: roleplay (master/servant, cop/detained, teacher/student), tying (belt, tie), blindfold, spanking, commands, orgasm denial.
FORBIDDEN: choking, real injury, weapons, blood.

RULES:
- One concrete action
- Address as "you"; partner = third person (gender below)
- Direct, sharp style — no romance, no poetry
- Max 200 chars

GOOD EXAMPLES:
Tie partner's hands with a belt or tie. Give oral. Don't stop until asked.
Say: "Get on your knees". Come closer. Let them look up.
Blindfold your partner. Do whatever you want — hands, lips. Let them guess.
Spank partner's butt five times. Not hard. Ask: "More?". If yes — continue.

ONE new task. Text only, no quotes.`,
  },
};

// ── Сообщение пользователя на нативном языке ─────────────────────────────────
const USER_MSG: Record<string, string> = {
  ru: "Сгенерируй одно задание.",
  en: "Generate one task.",
  hi: "एक टास्क बनाएं।",
  pt: "Gere uma tarefa.",
  es: "Genera una tarea.",
};

// ── Лёгкий гендерный контекст для нейтральных категорий ─────────────────────
function genderCtx(gender: string | undefined, lang: string): string {
  if (!gender) return "";
  const g = gender === "male" ? "male" : "female";
  const ctx: Record<string, Record<string, string>> = {
    ru: {
      male:   "\n\nПОЛ: Пользователь — МУЖЧИНА, партнёрша — ЖЕНЩИНА. Глаголы мужского рода. О партнёрше: «она/её/ей».",
      female: "\n\nПОЛ: Пользователь — ЖЕНЩИНА, партнёр — МУЖЧИНА. Глаголы женского рода. О партнёре: «он/его/ему».",
    },
    en: {
      male:   "\n\nGENDER: User is a MAN, partner is a WOMAN. Use she/her for partner.",
      female: "\n\nGENDER: User is a WOMAN, partner is a MAN. Use he/him for partner.",
    },
    hi: {
      male:   "\n\nलिंग: उपयोगकर्ता पुरुष है, पार्टनर महिला है।",
      female: "\n\nलिंग: उपयोगकर्ता महिला है, पार्टनर पुरुष है।",
    },
    pt: {
      male:   "\n\nGÊNERO: Usuário é homem, parceira é mulher. Use ela/a para a parceira.",
      female: "\n\nGÊNERO: Usuária é mulher, parceiro é homem. Use ele/o para o parceiro.",
    },
    es: {
      male:   "\n\nGÉNERO: Usuario es hombre, pareja es mujer. Use ella para la pareja.",
      female: "\n\nGÉNERO: Usuaria es mujer, pareja es hombre. Use él para la pareja.",
    },
  };
  return ctx[lang]?.[g] ?? "";
}

// ── Строим system-промпт ──────────────────────────────────────────────────────
function buildSystem(category: string, lang: string, gender: string | undefined): string | null {
  const g = gender === "male" || gender === "female" ? gender : "male";

  const nDef = NEUTRAL[category];
  if (!nDef) return null;
  const base = nDef[lang] ?? nDef["en"];
  if (!base) return null;
  return base + genderCtx(gender, lang);
}

const MAX_CHARS = 260;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "https://t.me");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-telegram-init-data");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const initData = req.headers["x-telegram-init-data"] as string;
  if (!validateTelegramInitData(initData, process.env.BOT_TOKEN!))
    return res.status(401).json({ error: "Unauthorized" });

  const { category, lang = "ru", gender } = req.body as {
    category: string; lang?: string; gender?: string;
  };

  if (!category) return res.status(400).json({ error: "category required" });
  if (!DEEPSEEK_API_KEY) return res.status(200).json({ task: getFallback(category, lang), source: "fallback" });

  const systemPrompt = buildSystem(category, lang, gender);
  if (!systemPrompt) return res.status(200).json({ task: getFallback(category, lang), source: "fallback" });

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 9000);

    const resp = await fetch(DEEPSEEK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${DEEPSEEK_API_KEY}` },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user",   content: USER_MSG[lang] ?? "Generate one task." },
        ],
        max_tokens: 160,
        temperature: 0.9,
        top_p: 0.95,
      }),
      signal: ctrl.signal,
    });

    clearTimeout(timer);
    if (!resp.ok) return res.status(200).json({ task: getFallback(category, lang), source: "fallback" });

    const data = await resp.json();
    let task: string = data.choices?.[0]?.message?.content?.trim() ?? "";

    // Убираем обрамляющие кавычки
    task = task.replace(/^[«"'„"']|[»"'"']$/g, "").trim();
    // Убираем нумерацию типа "1. "
    task = task.replace(/^\d+\.\s*/, "");

    const bad = FORBIDDEN.some(p => task.toLowerCase().includes(p));
    if (!task || task.length < 10 || task.length > MAX_CHARS || bad)
      return res.status(200).json({ task: getFallback(category, lang), source: "fallback" });

    return res.status(200).json({ task, source: "ai" });
  } catch {
    return res.status(200).json({ task: getFallback(category, lang), source: "fallback" });
  }
}
