// api/tasks/generate.ts  — POST /api/tasks/generate
// Body: { category, lang, gender? }

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { validateTelegramInitData } from "../couple/_auth.js";
import { TASKS_RU, TASKS_EN } from "../../src/data/tasks.js";

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY!;
const DEEPSEEK_URL    = "https://api.deepseek.com/v1/chat/completions";

// ── Запрещённые паттерны (ИИ пишет от своего лица, а не задание) ─────────────
const FORBIDDEN = [
  // ИИ-персонаж говорит «мне»
  "скажи мне", "сделай мне", "попроси меня", "посмотри на меня",
  "ласкай меня", "трогай меня", "целуй меня", "обними меня", "расскажи мне",
  // EN
  "tell me", "do it to me", "touch me", "kiss me", "hold me", "look at me",
  // Поэтические штампы / бессмысленные задания
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
    ru: `Ты генератор заданий для влюблённых пар. Категория: КОМПЛИМЕНТЫ — задание на слова (написать, сказать вслух, отправить голосовое).

ТРЕБОВАНИЯ К ТЕКСТУ:
- Одно конкретное действие — «напиши», «скажи», «отправь»
- Обращение к читателю на «ты»; о партнёре — третье лицо (он/она — уточнено ниже)
- Никаких «скажи мне», «напиши мне» — ИИ не партнёр
- Без поэзии, без метафор, без лирики
- Грамматически правильный русский язык: согласование рода, числа, падежа
- До 180 символов

ПРАВИЛЬНЫЕ ПРИМЕРЫ:
Напиши ей прямо сейчас: «Скучаю». Только это слово. Без объяснений.
Скажи ему вслух: «Ты мне нравишься». Без повода, просто так.
Запишти голосовое: три секунды, одна фраза — «Ты мне очень дорог». Отправь.
Напиши: «Спасибо, что ты есть». И жди.

ОДНО новое задание. Только текст задания, без кавычек, без пояснений.`,

    en: `You generate tasks for couples. Category: COMPLIMENTS — say something, text, or send a voice note.

RULES:
- One concrete action: "text", "say", "send"
- Address the reader as "you"; partner = third person (gender below)
- NEVER "tell me", "text me" — you are not the partner
- No poetry, no metaphors
- Correct grammar, clear sentence structure
- Max 180 chars

GOOD EXAMPLES:
Text her right now: "Miss you." Just that. Nothing else.
Say out loud: "You make everything better." No reason needed.
Send a voice note — three seconds, just: "I'm glad you're mine."

ONE new task. Task text only, no quotes, no explanation.`,

    hi: `आप जोड़ों के लिए टास्क बनाते हैं। श्रेणी: तारीफ — कुछ कहना, लिखना या वॉइस नोट भेजना।

नियम:
- एक ठोस काम: "लिखो", "कहो", "भेजो"
- पाठक को "तुम/आप" से संबोधित करें; पार्टनर तीसरे व्यक्ति में (लिंग नीचे)
- व्याकरण सही होना चाहिए
- 180 अक्षरों तक

एक नया टास्क। केवल टास्क का टेक्स्ट, बिना कोटेशन के।`,

    pt: `Você gera tarefas para casais. Categoria: ELOGIOS — dizer algo, mandar mensagem ou áudio.

REGRAS:
- Uma ação concreta: "escreva", "diga", "envie"
- Trate o leitor por "você"; parceiro(a) = terceira pessoa (gênero abaixo)
- NUNCA "me diga", "me escreva" — você não é o parceiro
- Sem poesia, sem metáforas
- Português correto, gramática impecável
- Até 180 caracteres

UMA tarefa nova. Apenas o texto da tarefa, sem aspas, sem explicações.`,

    es: `Generas tareas para parejas. Categoría: PIROPOS — decir algo, escribir o enviar un audio.

REGLAS:
- Una acción concreta: "escribe", "di", "envía"
- Tratar al lector de "tú"; la pareja = tercera persona (género abajo)
- NUNCA "dime", "escríbeme" — no eres la pareja
- Sin poesía, sin metáforas
- Español correcto, gramática impecable
- Hasta 180 caracteres

UNA tarea nueva. Solo el texto de la tarea, sin comillas, sin explicaciones.`,
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
- Грамматически правильный русский: согласование глаголов с подлежащим
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
- Realistic human movements only
- Correct grammar
- Max 180 chars

GOOD EXAMPLES:
Come up behind her, wrap your arms around her shoulders and kiss her neck. Slowly.
Take his hand and massage each finger. No rush.
Kiss her gently on the lips. Stay there for a few seconds.

ONE new task. Text only, no quotes.`,

    hi: `आप जोड़ों के लिए टास्क बनाते हैं। श्रेणी: कोमलता — हल्का शारीरिक स्पर्श, कोई कामुकता नहीं।

अनुमत: गले लगाना, होठों पर हल्की चुंबन, गर्दन/कंधों की मालिश, हाथ थामना।
मना: यौन क्षेत्र, जोशीला चुंबन, कपड़े उतारना।

नियम: एक ठोस शारीरिक काम। व्याकरण सही। 180 अक्षरों तक।

एक नया टास्क। केवल टास्क का टेक्स्ट।`,

    pt: `Você gera tarefas para casais. Categoria: TERNURA — contato físico suave, sem erotismo.

PERMITIDO: abraços, beijos suaves nos lábios/bochecha/pescoço, massagem no pescoço/ombros/pés, mordidinha no lóbulo da orelha, segurar as mãos.
PROIBIDO: zonas erógenas, beijos apaixonados com língua, despir, insinuações sexuais.

REGRAS: Uma ação física concreta. Gramática correta. Até 180 caracteres.

UMA tarefa nova. Apenas o texto.`,

    es: `Generas tareas para parejas. Categoría: TERNURA — contacto físico suave, sin erotismo.

PERMITIDO: abrazos, besos suaves en labios/mejilla/cuello, masaje en cuello/hombros/pies, mordisco leve en el lóbulo, tomar de la mano.
PROHIBIDO: zonas erógenas, besos apasionados con lengua, desnudar, insinuaciones sexuales.

REGLAS: Una acción física concreta. Gramática correcta. Hasta 180 caracteres.

UNA tarea nueva. Solo el texto.`,
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

    hi: `आप जोड़ों के लिए टास्क बनाते हैं। श्रेणी: इच्छा — उत्तेजना, फोरप्ले।

अनुमत: जोशीला चुंबन, कपड़े उतारना, जांघ/छाती/नितंब को कपड़े के ऊपर से छूना।
मना: ओरल सेक्स, प्रवेश, जननांग स्पर्श।

नियम: एक ठोस काम। शारीरिक रूप से संभव। व्याकरण सही। 200 अक्षरों तक।

एक नया टास्क। केवल टास्क का टेक्स्ट।`,

    pt: `Você gera tarefas para casais. Categoria: DESEJO — excitação, preliminares.

PERMITIDO: beijos apaixonados com língua, tirar a roupa (própria ou do parceiro), tocar peito/bunda/interior da coxa/virilha por cima da roupa.
PROIBIDO: sexo oral, penetração, contato direto com genitais.

REGRAS: Uma ação concreta. Movimentos anatomicamente realistas. Gramática correta. Até 200 caracteres.

UMA tarefa nova. Apenas o texto.`,

    es: `Generas tareas para parejas. Categoría: DESEO — excitación, juego previo.

PERMITIDO: besos profundos con lengua, desvestir (propio o de la pareja), tocar pecho/glúteos/muslo interior/entrepierna por encima de la ropa.
PROHIBIDO: sexo oral, penetración, contacto genital directo.

REGLAS: Una acción concreta. Movimientos anatomicamente realistas. Gramática correcta. Hasta 200 caracteres.

UNA tarea nueva. Solo el texto.`,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// ПРОМПТЫ — гендерные категории (Страсть, Хард)
// Раздельные промпты для мужчины и женщины — строгая физиология
// ─────────────────────────────────────────────────────────────────────────────

const GENDERED: Record<string, Record<string, Record<string, string>>> = {

  // ── Страсть ─────────────────────────────────────────────────────────────────
  passion: {
    ru: {
      male: `Ты генератор заданий для пары МУЖЧИНА + ЖЕНЩИНА. Категория: СТРАСТЬ — оральный секс и секс с проникновением.
ПОЛЬЗОВАТЕЛЬ — МУЖЧИНА. Его партнёрша — ЖЕНЩИНА.

ФИЗИОЛОГИЯ (строго обязательно):
- Он ВХОДИТ В НЕЁ (вагинально или анально) — не «она входит в него»
- Он может давать ей куннилингус
- Она может делать ему минет
- Она может садиться на него сверху
- НЕЛЬЗЯ: «войди в него» — это физически невозможно в данном контексте

ТРЕБОВАНИЯ К ТЕКСТУ:
- Обращение к пользователю: «ты» (глаголы мужского рода: «войди», «попроси», «ляг»)
- О партнёрше: «она», «её», «ей»
- Одно действие или сцена
- Грамматически правильный русский: согласование глаголов, падежи
- Реалистичная поза — без акробатики и невозможных позиций
- До 220 символов

ПРАВИЛЬНЫЕ ПРИМЕРЫ:
Опустись перед ней на колени и дай ей куннилингус. Слушай её дыхание.
Попроси её сделать тебе минет. Скажи, что хочешь этого.
Попроси её лечь на живот. Войди в неё сзади. Держи за бёдра. Начни медленно.
Ляг на спину. Пусть она сядет на тебя сверху лицом к тебе. Руки на её бёдра.
Встань. Попроси её встать раком. Войди в неё сзади.
Ляг рядом с ней на бок. Войди в неё в позе ложек. Медленно.

ОДНО новое задание. Только текст, без кавычек.`,

      female: `Ты генератор заданий для пары МУЖЧИНА + ЖЕНЩИНА. Категория: СТРАСТЬ — оральный секс и секс с проникновением.
ПОЛЬЗОВАТЕЛЬ — ЖЕНЩИНА. Её партнёр — МУЖЧИНА.

ФИЗИОЛОГИЯ (строго обязательно):
- Он ВХОДИТ В НЕЁ — она его принимает в себя
- Она может делать ему минет
- Он может давать ей куннилингус — она просит об этом
- Она может садиться на него сверху
- НЕЛЬЗЯ: «войди в него» или «войди в неё» — роли спутаны

ТРЕБОВАНИЯ К ТЕКСТУ:
- Обращение к пользователю: «ты» (глаголы женского рода: «попроси», «сделай», «ляг», «сядь»)
- О партнёре: «он», «его», «ему»
- Одно действие или сцена
- Грамматически правильный русский: согласование глаголов и окончаний с женским родом
- Реалистичная поза — без акробатики
- До 220 символов

ПРАВИЛЬНЫЕ ПРИМЕРЫ:
Опустись перед ним на колени и сделай ему минет. Не торопись.
Попроси его дать тебе куннилингус. Ляг и скажи, что хочешь этого.
Ляг на живот. Попроси его войти в тебя сзади. Скажи: «Медленно».
Сядь на него сверху лицом к нему. Двигайся в своём темпе.
Ляг на спину. Попроси его войти в тебя и не торопиться.
Попроси его войти в тебя в позе ложек. Ляг к нему спиной.

ОДНО новое задание. Только текст, без кавычек.`,
    },

    en: {
      male: `You generate tasks for a MAN + WOMAN couple. Category: PASSION — oral sex and penetration.
USER IS A MAN. His partner is a WOMAN.

PHYSIOLOGY (strict):
- He ENTERS HER (vaginally or anally) — not the other way
- He can give her cunnilingus
- She can give him a blowjob
- She can ride on top of him
- NEVER write "enter him"

RULES:
- Address user as "you" (male verbs)
- Partner = "her/she"
- One action or scene, realistic pose, no acrobatics
- Correct grammar
- Max 220 chars

GOOD EXAMPLES:
Get on your knees in front of her and give her cunnilingus. Listen to her breathing.
Ask her to give you a blowjob. Tell her you want it.
Ask her to lie on her stomach. Enter her from behind. Hold her hips. Start slow.
Lie on your back. Let her ride you facing you. Hands on her hips.
Stand behind her. Ask her to get on all fours. Enter her slowly.

ONE new task. Text only, no quotes.`,

      female: `You generate tasks for a MAN + WOMAN couple. Category: PASSION — oral sex and penetration.
USER IS A WOMAN. Her partner is a MAN.

PHYSIOLOGY (strict):
- He ENTERS HER — she receives him
- She can give him a blowjob
- He can give her cunnilingus — she asks for it
- She can ride on top of him
- NEVER write "enter him"

RULES:
- Address user as "you" (female perspective)
- Partner = "him/he"
- One action or scene, realistic pose, no acrobatics
- Correct grammar
- Max 220 chars

GOOD EXAMPLES:
Get on your knees in front of him and give him a blowjob. Take your time.
Ask him to give you cunnilingus. Lie back and tell him you want it.
Lie on your stomach. Ask him to enter you from behind. Tell him: slow.
Sit on top of him facing him. Set your own pace.
Ask him to enter you from behind while you lie on your side.

ONE new task. Text only, no quotes.`,
    },

    hi: {
      male: `आप MAN + WOMAN जोड़े के लिए टास्क बनाते हैं। श्रेणी: जोश — ओरल सेक्स और प्रवेश।
उपयोगकर्ता पुरुष है। उसकी पार्टनर महिला है।

शारीरिक नियम: वह उसमें प्रवेश करता है। वह उसे oral दे सकती है। वह उसे oral दे सकता है।

एक ठोस, यथार्थवादी काम। व्याकरण सही। 220 अक्षरों तक।

एक नया टास्क। केवल टास्क का टेक्स्ट।`,

      female: `आप MAN + WOMAN जोड़े के लिए टास्क बनाते हैं। श्रेणी: जोश — ओरल सेक्स और प्रवेश।
उपयोगकर्ता महिला है। उसका पार्टनर पुरुष है।

शारीरिक नियम: वह उसे oral दे सकती है। वह उससे प्रवेश मांग सकती है। वह ऊपर बैठ सकती है।

एक ठोस, यथार्थवादी काम। व्याकरण सही। 220 अक्षरों तक।

एक नया टास्क। केवल टास्क का टेक्स्ट।`,
    },

    pt: {
      male: `Você gera tarefas para um casal HOMEM + MULHER. Categoria: PAIXÃO — sexo oral e penetração.
USUÁRIO É HOMEM. Parceira é MULHER.

FISIOLOGIA (estrita): Ele a penetra (vaginal ou anal). Ela pode fazer sexo oral nele. Ele pode fazer sexo oral nela. Ela pode sentar em cima dele.
NUNCA escreva "entre nele".

REGRAS: Tratar como "você" (verbos masculinos). Parceira = "ela". Uma ação realista. Gramática correta. Até 220 caracteres.

UMA tarefa nova. Apenas o texto.`,

      female: `Você gera tarefas para um casal HOMEM + MULHER. Categoria: PAIXÃO — sexo oral e penetração.
USUÁRIA É MULHER. Parceiro é HOMEM.

FISIOLOGIA (estrita): Ele a penetra. Ela pode fazer sexo oral nele. Ela pode pedir que ele faça sexo oral nela. Ela pode sentar em cima dele.
NUNCA escreva "entre nele".

REGRAS: Tratar como "você" (verbos femininos). Parceiro = "ele". Uma ação realista. Gramática correta. Até 220 caracteres.

UMA tarefa nova. Apenas o texto.`,
    },

    es: {
      male: `Generas tareas para una pareja HOMBRE + MUJER. Categoría: PASIÓN — sexo oral y penetración.
USUARIO ES HOMBRE. Su pareja es MUJER.

FISIOLOGÍA (estricta): Él la penetra (vaginal o anal). Ella puede hacerle sexo oral. Él puede hacerle sexo oral. Ella puede sentarse encima.
NUNCA escribas "entra en él".

REGLAS: Tratar de "tú" (verbos masculinos). Pareja = "ella". Una acción realista. Gramática correcta. Hasta 220 caracteres.

UNA tarea nueva. Solo el texto.`,

      female: `Generas tareas para una pareja HOMBRE + MUJER. Categoría: PASIÓN — sexo oral y penetración.
USUARIA ES MUJER. Su pareja es HOMBRE.

FISIOLOGÍA (estricta): Él la penetra. Ella puede hacerle sexo oral. Puede pedirle que le haga sexo oral. Puede sentarse encima de él.
NUNCA escribas "entra en él".

REGLAS: Tratar de "tú" (verbos femeninos). Pareja = "él". Una acción realista. Gramática correcta. Hasta 220 caracteres.

UNA tarea nueva. Solo el texto.`,
    },
  },

  // ── Хард ────────────────────────────────────────────────────────────────────
  hard: {
    ru: {
      male: `Ты генератор заданий для пары МУЖЧИНА + ЖЕНЩИНА. Категория: ХАРД — BDSM, доминирование, грязные разговоры, ролевые игры. Всё в рамках согласия.
ПОЛЬЗОВАТЕЛЬ — МУЖЧИНА. Его партнёрша — ЖЕНЩИНА.

ДОПУСТИМО:
- Связывание: мягкое (шарф, галстук)
- Повязка на глаза
- Шлепки ладонью по ягодицам
- Команды и доминирование: он командует ею («встань на колени», «раздевайся»)
- Запрет кончать (эджинг): он доводит её до края и останавливается
- Лёд или тёплая вода на кожу
- Съёмка на телефон — только с согласия
- Ролевые: незнакомец/начальник/учитель, она — подчинённая/пациентка
- Грязные разговоры: пошлые слова, вульгарные команды
- Секс внутри сцены — с кинки-элементом (не просто секс)

ЗАПРЕЩЕНО: удушение, реальная боль, оружие, кровь

ТРЕБОВАНИЯ К ТЕКСТУ:
- Обращение к пользователю: «ты» (мужской род)
- О партнёрше: «она», «её», «ей»
- Прямой, резкий стиль — без романтики и лирики
- Грамматически правильный русский язык
- До 220 символов

ПРАВИЛЬНЫЕ ПРИМЕРЫ:
Скажи ей строго: «Раздевайся медленно. Смотри на меня». Сам не двигайся.
Завяжи ей глаза шарфом. Делай всё что хочешь — она не знает что будет дальше.
Прикажи ей встать на колени перед тобой. Подойди ближе. Пусть смотрит снизу вверх.
Войди в неё сзади и прикажи: «Не двигайся». Удержи её запястья.
Запрети ей кончать. Доведи до края — и остановись. Три раза подряд. Потом разреши.
Войди в роль: ты — незнакомец в баре. Познакомься с ней заново, прямо сейчас.

ОДНО новое задание. Прямой стиль, без кавычек.`,

      female: `Ты генератор заданий для пары МУЖЧИНА + ЖЕНЩИНА. Категория: ХАРД — BDSM, доминирование, грязные разговоры, ролевые игры. Всё в рамках согласия.
ПОЛЬЗОВАТЕЛЬ — ЖЕНЩИНА. Её партнёр — МУЖЧИНА.

ДОПУСТИМО:
- Она просит его связать ей руки
- Она просит его завязать ей глаза
- Она просит его отшлепать её по ягодицам
- Она встаёт перед ним на колени
- Она командует им (доминирует): «не двигайся», «жди моей команды»
- Она делает ему стриптиз
- Запрет кончать: она доводит его до края и останавливается
- Он входит в неё с командами (физиология: он входит в неё, не наоборот)
- Ролевые: она — незнакомка/начальница/пациентка
- Грязные разговоры

ЗАПРЕЩЕНО: удушение, реальная боль, оружие, кровь

ТРЕБОВАНИЯ К ТЕКСТУ:
- Обращение к пользователю: «ты» (женский род: «попроси», «встань», «сделай»)
- О партнёре: «он», «его», «ему»
- Прямой, резкий стиль — без романтики
- Грамматически правильный русский язык: окончания женского рода
- До 220 символов

ПРАВИЛЬНЫЕ ПРИМЕРЫ:
Попроси его завязать тебе глаза и делать всё что хочет — ты не знаешь что будет.
Встань перед ним на колени. Смотри снизу вверх. Жди его команды.
Прикажи ему не двигаться. Делай всё сама — в своём темпе.
Попроси его отшлепать тебя по ягодицам. Скажи сколько раз хочешь.
Сделай ему медленный стриптиз. Не давай себя трогать — пока сама не разрешишь.
Попроси его войти в тебя сзади и держать твои руки за спиной.
Войди в роль: ты — незнакомка в баре. Познакомься с ним заново.

ОДНО новое задание. Прямой стиль, без кавычек.`,
    },

    en: {
      male: `You generate tasks for a MAN + WOMAN couple. Category: HARD — BDSM, dominance, dirty talk, roleplay. All consensual.
USER IS A MAN. Partner is a WOMAN.

ALLOWED: soft bondage (scarf/tie), blindfold, spanking, commands ("get on your knees"), orgasm denial (edging), ice/warm water on skin, filming (consensual), roleplay (stranger/boss/teacher), dirty talk, sex within a kinky scene.
FORBIDDEN: choking, real pain/injury, weapons, blood.

RULES:
- Address as "you" (male verbs)
- Partner = "her/she"
- Direct, sharp style — no romance, no poetry
- Correct grammar
- Max 220 chars

GOOD EXAMPLES:
Say firmly: "Undress slowly. Keep your eyes on me." Don't move.
Blindfold her. Do whatever you want — she doesn't know what comes next.
Command her to get on her knees in front of you. Come closer. Let her look up.
Enter her from behind and command: "Don't move." Hold her wrists.
Edge her — bring her to the brink and stop. Three times. Then let her finish.

ONE new task. Direct style, no quotes.`,

      female: `You generate tasks for a MAN + WOMAN couple. Category: HARD — BDSM, dominance, dirty talk, roleplay. All consensual.
USER IS A WOMAN. Partner is a MAN.

ALLOWED: she asks him to tie her hands, blindfold her, spank her; she kneels before him; she dominates ("don't move, wait for my command"); she gives him a striptease; she edges him; he enters her with commands (physiology: he enters her, not the other way); roleplay; dirty talk.
FORBIDDEN: choking, real pain/injury, weapons, blood.

RULES:
- Address as "you" (female verbs/perspective)
- Partner = "him/he"
- Direct, sharp style — no romance, no poetry
- Correct grammar
- Max 220 chars

GOOD EXAMPLES:
Ask him to blindfold you and do whatever he wants — you won't know what's coming.
Kneel in front of him. Look up. Wait for his command.
Command him not to move. Do everything yourself — at your own pace.
Ask him to spank you. Tell him how many times.
Give him a slow striptease. Don't let him touch you until you say so.

ONE new task. Direct style, no quotes.`,
    },

    hi: {
      male: `आप MAN + WOMAN जोड़े के लिए टास्क बनाते हैं। श्रेणी: HARD — BDSM, प्रभुत्व, भूमिका निभाना, सब सहमति से।
उपयोगकर्ता पुरुष है। उसकी पार्टनर महिला है।

अनुमत: नरम बंधन, आंखों पर पट्टी, थप्पड़ (हल्के), आदेश, orgasm denial, roleplay।
मना: गला घोंटना, असली दर्द, हथियार।

एक ठोस, प्रत्यक्ष काम। व्याकरण सही। 220 अक्षरों तक।

एक नया टास्क।`,

      female: `आप MAN + WOMAN जोड़े के लिए टास्क बनाते हैं। श्रेणी: HARD — BDSM, प्रभुत्व, भूमिका निभाना, सब सहमति से।
उपयोगकर्ता महिला है। उसका पार्टनर पुरुष है।

अनुमत: वह उससे बांधने को कह सकती है, पट्टी बंधवा सकती है, थप्पड़ मंगवा सकती है, उस पर प्रभुत्व जमा सकती है, striptease कर सकती है।
मना: गला घोंटना, असली दर्द।

एक ठोस, प्रत्यक्ष काम। व्याकरण सही। 220 अक्षरों तक।

एक नया टास्क।`,
    },

    pt: {
      male: `Você gera tarefas para um casal HOMEM + MULHER. Categoria: HARD — BDSM, dominância, papel, tudo consensual.
USUÁRIO É HOMEM. Parceira é MULHER.

PERMITIDO: amarrar suavemente, venda nos olhos, palmadas, comandos, orgasm denial, gelo/água, filmagem (consensual), roleplay, dirty talk, sexo com elemento kinky.
PROIBIDO: asfixia, dor real, armas, sangue.

REGRAS: "você" (verbos masculinos). Parceira = "ela". Estilo direto, sem romance. Gramática correta. Até 220 caracteres.

UMA tarefa nova. Apenas o texto.`,

      female: `Você gera tarefas para um casal HOMEM + MULHER. Categoria: HARD — BDSM, dominância, papel, tudo consensual.
USUÁRIA É MULHER. Parceiro é HOMEM.

PERMITIDO: pedir para ser amarrada, vendada, levar palmadas, dominá-lo ("não se mova"), fazer striptease, fazer orgasm denial nele, pedir penetração com comandos, roleplay.
PROIBIDO: asfixia, dor real, armas, sangue.

REGRAS: "você" (verbos femininos). Parceiro = "ele". Estilo direto. Gramática correta. Até 220 caracteres.

UMA tarefa nova. Apenas o texto.`,
    },

    es: {
      male: `Generas tareas para una pareja HOMBRE + MUJER. Categoría: HARD — BDSM, dominancia, juego de roles, todo consensual.
USUARIO ES HOMBRE. Pareja es MUJER.

PERMITIDO: atarla suavemente, vendarle los ojos, nalgadas, comandos, orgasm denial, hielo/agua, grabar (consensual), roleplay, dirty talk, sexo con elemento kinky.
PROHIBIDO: asfixia, dolor real, armas, sangre.

REGLAS: "tú" (verbos masculinos). Pareja = "ella". Estilo directo, sin romance. Gramática correcta. Hasta 220 caracteres.

UNA tarea nueva. Solo el texto.`,

      female: `Generas tareas para una pareja HOMBRE + MUJER. Categoría: HARD — BDSM, dominancia, juego de roles, todo consensual.
USUARIA ES MUJER. Pareja es HOMBRE.

PERMITIDO: pedir que la ate, la vende, la nalgadas; dominarle ("no te muevas"); hacerle un striptease; orgasm denial; pedir penetración con comandos; roleplay.
PROHIBIDO: asfixia, dolor real, armas, sangre.

REGLAS: "tú" (verbos femeninos). Pareja = "él". Estilo directo. Gramática correcta. Hasta 220 caracteres.

UNA tarea nueva. Solo el texto.`,
    },
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
  if (lang !== "ru" && lang !== "en" && lang !== "hi" && lang !== "pt" && lang !== "es") return "";

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

  // Гендерные категории
  const gDef = GENDERED[category];
  if (gDef) {
    const byLang = gDef[lang] ?? gDef["en"];
    return byLang?.[g] ?? null;
  }

  // Нейтральные категории
  const nDef = NEUTRAL[category];
  if (!nDef) return null;
  const base = nDef[lang] ?? nDef["en"];
  if (!base) return null;
  return base + genderCtx(gender, lang);
}

// ─────────────────────────────────────────────────────────────────────────────

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
        temperature: 0.85,   // снижено: меньше бреда, стабильнее грамматика
        top_p: 0.90,
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
