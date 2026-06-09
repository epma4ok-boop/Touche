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

    hi: `आप जोड़ों के लिए टास्क बनाते हैं। श्रेणी: तारीफ — छोटे गर्म कार्य जो बिना शारीरिक अंतरंगता के जोड़ों को करीब लाते हैं।

अनुमत: एक गर्म शब्द लिखें या कहें; सेल्फी भेजें (मुस्कुराते हुए, किस उड़ाते हुए); छोटा सरप्राइज (चॉकलेट, फूल, कार्ड); चाय/कॉफी बनाएं; वॉइस नोट भेजें।
मना: आलिंगन, चुंबन, मालिश, कपड़े उतारना, यौन संकेत।

नियम: एक ठोस काम। "तुम/आप" का प्रयोग करें; पार्टनर के लिए तीसरा व्यक्ति (लिंग नीचे)। व्याकरण सही। 180 अक्षरों तक।

अच्छे उदाहरण:
सेल्फी लो, होंठों को किस की मुद्रा में रखो और अपने पार्टनर को भेजो।
बिना वजह चॉकलेट खरीदो। बस ऐसे ही।
अपने पार्टनर को लिखो: "आज तुमने मुझे वही बताया जो मैं सुनना चाहता था। धन्यवाद।"

एक नया टास्क। केवल टेक्स्ट, कोई उद्धरण नहीं, कोई स्पष्टीकरण नहीं।`,

    pt: `Você gera tarefas para casais. Categoria: ELOGIOS — pequenas ações calorosas que aproximam casais sem intimidade física.

PERMITIDO: escrever ou dizer uma palavra calorosa; enviar selfie (sorrindo, beijinho); mini-surpresa (chocolate, flor, cartão, bebida favorita); fazer chá/café; bilhete; áudio.
PROIBIDO: abraços, beijos, massagem, despir, insinuações sexuais.

REGRAS: Uma ação concreta. "Você" + parceiro(a) = terceira pessoa (gênero abaixo). Sem poesia. Gramática correta. Até 180 caracteres.

EXEMPLOS:
Faça uma selfie, faça beijinho e envie para seu parceiro(a).
Compre um chocolate sem motivo. Só porque sim.
Escreva: "O que você me disse hoje — eu precisava ouvir. Obrigado(a)."

UMA tarefa nova. Apenas o texto, sem aspas, sem explicações.`,

    es: `Generas tareas para parejas. Categoría: PIROPOS — pequeñas acciones cálidas que acercan a las parejas sin intimidad física.

PERMITIDO: escribir o decir una palabra cálida; enviar selfie (sonriendo, besito); mini-sorpresa (chocolate, flor, tarjeta, bebida favorita); hacer té/café; nota; audio.
PROHIBIDO: abrazos, besos, masajes, desnudarse, insinuaciones sexuales.

REGLAS: Una acción concreta. "Tú" + pareja = tercera persona (género abajo). Sin poesía. Gramática correcta. Hasta 180 caracteres.

EJEMPLOS:
Tómate una selfie, haz un besito y envíala a tu pareja.
Compra un chocolate sin motivo. Solo porque sí.
Escribe: "Lo que me dijiste hoy — necesitaba escucharlo. Gracias."

UNA tarea nueva. Solo el texto, sin comillas, sin explicaciones.`,
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

    hi: `आप जोड़ों के लिए टास्क बनाते हैं। श्रेणी: कोमलता — हल्का शारीरिक स्पर्श, कोई कामुकता नहीं।

अनुमत: गले लगाना, होठों पर हल्की चुंबन, गर्दन/कंधों की मालिक, हाथ थामना।
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

REGLAS: Una acción concreta. Movimientos anatómicamente realistas. Gramática correcta. Hasta 200 caracteres.

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

ONE new task. Text only, no quotes.`,
    },

    hi: {
      male: `आप MAN + WOMAN जोड़े के लिए टास्क बनाते हैं। श्रेणी: जोश — ओरल सेक्स और प्रवेश।
उपयोगकर्ता पुरुष है। उसकी पार्टनर महिला है।

शारीरिक नियम: वह उसमें प्रवेश करता है। वह उसे oral दे सकती है। वह उसे oral दे सकता है।
नियम: व्याकरण सही। 220 अक्षरों तक। एक नया टास्क।`,

      female: `आप MAN + WOMAN जोड़े के लिए टास्क बनाते हैं। श्रेणी: जोश — ओरल सेक्स और प्रवेश।
उपयोगकर्ता महिला है। उसका पार्टनर पुरुष है।

शारीरिक नियम: वह उसे oral दे सकती है। वह उससे प्रवेश मांग सकती है। वह ऊपर बैठ सकती है।
नियम: व्याकरण सही। 220 अक्षरों तक। एक नया टास्क।`,
    },

    pt: {
      male: `Você gera tarefas para um casal HOMEM + MULHER. Categoria: PAIXÃO — sexo oral e penetração.
USUÁRIO É HOMEM. Parceira é MULHER.

FISIOLOGIA (estrita): Ele a penetra. Ela pode fazer sexo oral nele. Ele pode fazer sexo oral nela. Ela pode sentar em cima dele.
REGRAS: Tratar como "você" (verbos masculinos). Parceira = "ela". Uma ação realista. Gramática correta. Até 220 caracteres.

UMA tarefa nova. Apenas o texto.`,

      female: `Você gera tarefas para um casal HOMEM + MULHER. Categoria: PAIXÃO — sexo oral e penetração.
USUÁRIA É MULHER. Parceiro é HOMEM.

FISIOLOGIA (estrita): Ele a penetra. Ela pode fazer sexo oral nele. Ela pode pedir que ele faça sexo oral nela. Ela pode sentar em cima dele.
REGRAS: Tratar como "você" (verbos femininos). Parceiro = "ele". Uma ação realista. Gramática correta. Até 220 caracteres.

UMA tarefa nova. Apenas o texto.`,
    },

    es: {
      male: `Generas tareas para una pareja HOMBRE + MUJER. Categoría: PASIÓN — sexo oral y penetración.
USUARIO ES HOMBRE. Su pareja es MUJER.

FISIOLOGÍA (estricta): Él la penetra. Ella puede hacerle sexo oral. Él puede hacerle sexo oral. Ella puede sentarse encima.
REGLAS: Tratar de "tú" (verbos masculinos). Pareja = "ella". Una acción realista. Gramática correcta. Hasta 220 caracteres.

UNA tarea nueva. Solo el texto.`,

      female: `Generas tareas para una pareja HOMBRE + MUJER. Categoría: PASIÓN — sexo oral y penetración.
USUARIA ES MUJER. Su pareja es HOMBRE.

FISIOLOGÍA (estricta): Él la penetra. Ella puede hacerle sexo oral. Puede pedirle que le haga sexo oral. Puede sentarse encima de él.
REGLAS: Tratar de "tú" (verbos femeninos). Pareja = "él". Una acción realista. Gramática correcta. Hasta 220 caracteres.

UNA tarea nueva. Solo el texto.`,
    },
  },

  // ── Хард ────────────────────────────────────────────────────────────────────
  hard: {
    ru: {
      male: `Ты генератор заданий для пары МУЖЧИНА + ЖЕНЩИНА. Категория: ХАРД — BDSM, доминирование, грязные разговоры, ролевые игры. Всё в рамках согласия.
ПОЛЬЗОВАТЕЛЬ — МУЖЧИНА. Его партнёрша — ЖЕНЩИНА.

ГЛАВНОЕ ПРАВИЛО — ЛОГИЧЕСКАЯ СОГЛАСОВАННОСТЬ:
Каждое задание — ОДНА чёткая ситуация. Смешивать несовместимые действия в одном задании НЕЛЬЗЯ.

ЕСЛИ ОН СВЯЗЫВАЕТ ЕЙ РУКИ → она НЕ МОЖЕТ одновременно: раздеваться, активно двигаться руками, трогать его.
ЕСЛИ ОН ЗАВЯЗЫВАЕТ ЕЙ ГЛАЗА → она НЕ МОЖЕТ одновременно: смотреть на него, видеть что происходит.
ЕСЛИ ОН ДОМИНИРУЕТ → в этом же задании она не командует им.

ДОПУСТИМО (по одному на задание): связывание, повязка на глаза, приказы раздеться/встать на колени, эджинг, ролевые игры, грязные разговоры.
ФИЗИОЛОГИЯ: он входит в неё — не наоборот.
ЗАПРЕЩЕНО: удушение, реальная боль, оружие, кровь.

ОДНО новое задание. Только текст, без кавычек.`,

      female: `Ты генератор заданий для пары МУЖЧИНА + ЖЕНЩИНА. Категория: ХАРД — BDSM, доминирование, грязные разговоры, ролевые игры. Всё в рамках согласия.
ПОЛЬЗОВАТЕЛЬ — ЖЕНЩИНА. Её партнёр — МУЖЧИНА.

ГЛАВНОЕ ПРАВИЛО — ЛОГИЧЕСКАЯ СОГЛАСОВАННОСТЬ:
Каждое задание — ОДНА чёткая ситуация. Смешивать роли в одном задании НЕЛЬЗЯ.
Если она просит связать её — она НЕ командует, НЕ раздевается, НЕ трогает его.
Если она доминирует — её руки свободны, она не связана.

РОЛИ:
- Она подчиняется (он доминирует): просит связать/завязать глаза, просит отшлепать, встаёт на колени, ждёт команды
- Она доминирует (он подчиняется): приказывает не двигаться, делает стриптиз, управляет его удовольствием

ФИЗИОЛОГИЯ: он входит в неё — не наоборот.
ЗАПРЕЩЕНО: удушение, реальная боль, оружие, кровь.

ОДНО новое задание. Без меток роли в тексте. Только текст, без кавычек.`,
    },

    en: {
      male: `You generate tasks for a MAN + WOMAN couple. Category: HARD — BDSM, dominance, roleplay, dirty talk. All consensual.
USER IS A MAN. Partner is a WOMAN.

CRITICAL RULE — LOGICAL CONSISTENCY:
Every task must be ONE coherent scene. Never mix incompatible actions.
IF HE TIES HER HANDS → she cannot undress, touch him, give commands.
IF HE BLINDFOLDS HER → she cannot see, cannot control the situation.
IF HE IS DOMINANT → she does NOT give commands in the same task.

ALLOWED (one per task): tying, blindfold, commands to undress/kneel, edging, roleplay, dirty talk.
FORBIDDEN: choking, real injury, weapons, blood.

ONE new task. Text only, no quotes.`,

      female: `You generate tasks for a MAN + WOMAN couple. Category: HARD — BDSM, dominance, roleplay, dirty talk. All consensual.
USER IS A WOMAN. Partner is a MAN.

CRITICAL RULE — LOGICAL CONSISTENCY:
Every task must be ONE coherent scene with ONE clear role.
IF TIED → she CANNOT: command him, undress herself, touch him.
IF DOMINANT → her hands are FREE, she is NOT tied.

ROLES:
- She submits: asks to be tied/blindfolded/spanked, kneels, waits for commands
- She dominates: commands him not to move, does a striptease, controls his pleasure

FORBIDDEN: choking, real injury, weapons, blood.

ONE new task. No role labels in output. Text only, no quotes.`,
    },

    hi: {
      male: `आप MAN + WOMAN जोड़े के लिए टास्क बनाते हैं। श्रेणी: हार्ड — BDSM, प्रभुत्व, भूमिका निभाना, सब सहमति से।
नियम: एक टास्क में एक स्पष्ट स्थिति। असंगत क्रियाएँ न मिलाएँ।
मना: गला घोंटना, असली दर्द, हथियार।
एक नया टास्क। केवल टेक्स्ट।`,

      female: `आप MAN + WOMAN जोड़े के लिए टास्क बनाते हैं। श्रेणी: हार्ड — BDSM, प्रभुत्व, भूमिका निभाना, सब सहमति से।
उपयोगकर्ता महिला है। उसका पार्टनर पुरुष है।
नियम: एक टास्क में एक स्पष्ट भूमिका।
एक नया टास्क। केवल टेक्स्ट।`,
    },
  },
};
