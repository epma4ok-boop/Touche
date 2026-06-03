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
    ru: [
      "Посмотри партнёру в глаза и скажи ему одну конкретную вещь, которую ты заметил(а) в нём за последнее время — что-то маленькое, настоящее и твоё.",
      "Напиши партнёру одно предложение о том, за что ты ему благодарен(а) прямо сейчас. Прочитай вслух.",
      "Скажи партнёру, какой именно момент с ним ты мог(ла) бы вспоминать всю жизнь — и почему именно он.",
      "Назови три черты характера партнёра, которые делают тебя лучше. Не торопись — пусть каждое слово прозвучит.",
      "Расскажи партнёру, как именно он выглядит сегодня — конкретно и искренне, не общими словами.",
    ],
    en: [
      "Look your partner in the eyes and name one specific thing you've noticed about them recently — something small, real, and yours.",
      "Write your partner one sentence about what you're grateful for right now. Read it aloud.",
      "Tell your partner which moment with them you could remember for a lifetime — and exactly why that one.",
      "Name three character traits of your partner that make you a better person. Don't rush — let each word land.",
      "Describe how your partner looks today — specifically and honestly, not in general terms.",
    ],
    hi: [
      "अपने साथी की आंखों में देखें और हाल ही में उनके बारे में एक विशेष चीज़ बताएं — कुछ छोटा, सच्चा।",
      "अपने साथी के लिए एक वाक्य लिखें जिसमें आप अभी क्यों आभारी हैं। ज़ोर से पढ़ें।",
      "साथी को बताएं कि उनके साथ कौन सा पल आप जीवन भर याद रखेंगे — और क्यों।",
      "साथी के तीन गुण बताएं जो आपको बेहतर इंसान बनाते हैं। जल्दी मत करें।",
      "बताएं कि आपका साथी आज कैसा दिख रहा है — विशेष रूप से और ईमानदारी से।",
    ],
    pt: [
      "Olhe nos olhos do seu parceiro e diga uma coisa específica que você notou nele recentemente — algo pequeno, real e seu.",
      "Escreva ao seu parceiro uma frase sobre pelo que você é grato agora. Leia em voz alta.",
      "Conte ao seu parceiro qual momento com ele você poderia lembrar para sempre — e exatamente por quê.",
      "Nomeie três traços de caráter do seu parceiro que fazem de você uma pessoa melhor.",
      "Descreva como seu parceiro está hoje — especificamente e honestamente.",
    ],
    es: [
      "Mira a los ojos de tu pareja y nombra una cosa específica que hayas notado en ella recientemente — algo pequeño y real.",
      "Escríbele a tu pareja una frase sobre lo que agradeces ahora mismo. Léela en voz alta.",
      "Dile a tu pareja qué momento contigo podría recordar toda la vida — y exactamente por qué.",
      "Nombra tres rasgos de carácter de tu pareja que te hacen mejor persona. No te apresures.",
      "Describe cómo se ve tu pareja hoy — específicamente y con honestidad.",
    ],
  },
  tenderness: {
    ru: [
      "Возьми лицо партнёра в ладони и поцелуй его — медленно, три раза. Между поцелуями смотри ему в глаза.",
      "Попроси партнёра лечь. Медленно проведи кончиками пальцев по его рукам, плечам и шее — три минуты, без слов.",
      "Обними партнёра сзади и просто подышите вместе. Не говори ничего — только чувствуй его дыхание.",
      "Поцелуй партнёра в лоб, в щёку, в шею — по очереди, медленно. Пусть это не торопится.",
      "Переплети пальцы с партнёром и просто посиди так две минуты. Смотри только на него.",
    ],
    en: [
      "Cup your partner's face in your hands and kiss them slowly, three times. Between each kiss, hold their gaze.",
      "Ask your partner to lie down. Slowly trace their arms, shoulders, and neck with your fingertips — three minutes, no words.",
      "Hold your partner from behind and just breathe together. Say nothing — only feel their breathing.",
      "Kiss your partner on the forehead, cheek, and neck — one by one, slowly. Let it take its time.",
      "Interlace your fingers with your partner's and sit that way for two minutes. Look only at them.",
    ],
    hi: [
      "साथी का चेहरा अपनी हथेलियों में लें और धीरे से तीन बार चूमें। बीच में उनकी आंखों में देखें।",
      "साथी को लेटने के लिए कहें। तीन मिनट तक उनकी बाहों, कंधों और गर्दन पर उंगलियां फेरें — बिना कुछ बोले।",
      "साथी को पीछे से गले लगाएं और साथ सांस लें। कुछ मत कहें — बस उनकी सांस महसूस करें।",
      "साथी को माथे, गाल और गर्दन पर धीरे-धीरे चूमें। जल्दी मत करें।",
      "साथी की उंगलियों में अपनी उंगलियां डालें और दो मिनट बैठें। केवल उन्हें देखें।",
    ],
    pt: [
      "Segure o rosto do seu parceiro nas mãos e beije-o devagar, três vezes. Entre cada beijo, olhe em seus olhos.",
      "Peça ao seu parceiro para deitar. Percorra lentamente seus braços, ombros e pescoço com a ponta dos dedos — três minutos, sem palavras.",
      "Abrace seu parceiro por trás e apenas respirem juntos. Não diga nada — apenas sinta a respiração dele.",
      "Beije seu parceiro na testa, na bochecha e no pescoço — um a um, devagar. Deixe o tempo passar.",
      "Entrelace os dedos com os do seu parceiro e fique assim por dois minutos. Olhe apenas para ele.",
    ],
    es: [
      "Toma el rostro de tu pareja entre tus manos y bésala despacio, tres veces. Entre cada beso, sostén su mirada.",
      "Pide a tu pareja que se recueste. Recorre lentamente sus brazos, hombros y cuello con las yemas de los dedos — tres minutos, sin palabras.",
      "Abraza a tu pareja por detrás y simplemente respiren juntos. No digas nada — solo siente su respiración.",
      "Besa a tu pareja en la frente, la mejilla y el cuello — uno a uno, despacio. Que no tenga prisa.",
      "Entrelaza tus dedos con los de tu pareja y quédense así dos minutos. Mira solo a tu pareja.",
    ],
  },
  desire: {
    ru: [
      "Медленно расстегни одну пуговицу на одежде партнёра, не отрывая взгляда от его глаз. Только одну. Дальше — пауза.",
      "Поцелуй партнёра в шею — начни с мочки уха и двигайся медленно вниз. Покусывай.",
      "Прошепчи партнёру на ухо одно конкретное желание — то, что хочешь прямо сейчас. Подробно.",
      "Проведи ногтями по спине партнёра сверху вниз — медленно, с лёгким давлением. Смотри на его реакцию.",
      "Скажи партнёру, какую часть его тела ты хочешь почувствовать прямо сейчас — и коснись её.",
    ],
    en: [
      "Slowly undo one button on your partner's clothes without looking away from their eyes. Just one. Then pause.",
      "Kiss your partner on the neck — start at the earlobe and move slowly down. Use your teeth lightly.",
      "Whisper one specific desire into your partner's ear — what you want right now. In detail.",
      "Run your nails down your partner's back — slowly, with light pressure. Watch their reaction.",
      "Tell your partner which part of their body you want to feel right now — then touch it.",
    ],
    hi: [
      "साथी की आंखों से नज़र हटाए बिना उनके कपड़े का एक बटन धीरे से खोलें। सिर्फ एक। फिर रुकें।",
      "साथी की गर्दन पर चुंबन करें — कान से शुरू करें और धीरे नीचे जाएं। हल्के से काटें।",
      "साथी के कान में एक विशेष इच्छा फुसफुसाएं — अभी क्या चाहते हैं। विस्तार से।",
      "साथी की पीठ पर नाखून धीरे-धीरे नीचे की ओर खींचें। उनकी प्रतिक्रिया देखें।",
      "साथी को बताएं कि आप उनके शरीर का कौन सा हिस्सा अभी महसूस करना चाहते हैं — और छुएं।",
    ],
    pt: [
      "Abra devagar um botão da roupa do seu parceiro sem desviar os olhos dos dele. Só um. Depois, pausa.",
      "Beije o pescoço do seu parceiro — comece pelo lóbulo da orelha e desça devagar. Use os dentes levemente.",
      "Sussurre um desejo específico no ouvido do seu parceiro — o que você quer agora. Em detalhes.",
      "Passe as unhas pelas costas do seu parceiro de cima para baixo — devagar, com leve pressão. Observe a reação.",
      "Diga ao seu parceiro qual parte do corpo dele você quer sentir agora — e toque-a.",
    ],
    es: [
      "Desabrocha despacio un botón de la ropa de tu pareja sin apartar los ojos de los suyos. Solo uno. Luego pausa.",
      "Besa el cuello de tu pareja — empieza por el lóbulo de la oreja y baja despacio. Usa los dientes con suavidad.",
      "Susurra un deseo específico al oído de tu pareja — lo que quieres ahora mismo. Con detalle.",
      "Pasa las uñas por la espalda de tu pareja de arriba abajo — despacio, con leve presión. Observa su reacción.",
      "Dile a tu pareja qué parte de su cuerpo quieres sentir ahora mismo — y tócala.",
    ],
  },
  passion: {
    ru: [
      "Возьми партнёра за руку и веди его туда, где хочешь быть с ним. Без слов. Он поймёт.",
      "Скажи партнёру прямо, чего ты от него хочешь прямо сейчас — и как именно. Без намёков.",
      "Разденься сам(а) перед партнёром — медленно, глядя на него. Дай ему наблюдать.",
      "Попроси партнёра лечь и поцелуй его сверху вниз — не пропуская ни одного места.",
      "Возьми партнёра за запястья, удержи их над головой и поцелуй так, как будто нет завтра.",
    ],
    en: [
      "Take your partner by the hand and lead them to where you want to be with them. No words. They'll understand.",
      "Tell your partner directly what you want from them right now — and exactly how. No hints.",
      "Undress yourself in front of your partner — slowly, looking at them. Let them watch.",
      "Ask your partner to lie down and kiss them from top to bottom — missing nothing.",
      "Hold your partner's wrists above their head and kiss them like there's no tomorrow.",
    ],
    hi: [
      "साथी का हाथ पकड़ें और उन्हें वहां ले जाएं जहां आप उनके साथ रहना चाहते हैं। बिना शब्दों के।",
      "साथी को सीधे बताएं कि आप अभी उनसे क्या चाहते हैं — और बिल्कुल कैसे। कोई इशारा नहीं।",
      "साथी के सामने खुद धीरे-धीरे कपड़े उतारें — उन्हें देखते हुए। उन्हें देखने दें।",
      "साथी को लेटने दें और उन्हें ऊपर से नीचे तक चूमें — कोई जगह न छोड़ें।",
      "साथी की कलाइयां उनके सिर के ऊपर पकड़ें और ऐसे चूमें जैसे कल न हो।",
    ],
    pt: [
      "Pegue seu parceiro pela mão e leve-o até onde você quer estar com ele. Sem palavras. Ele entenderá.",
      "Diga diretamente ao seu parceiro o que você quer dele agora — e exatamente como. Sem insinuações.",
      "Tire suas próprias roupas na frente do seu parceiro — devagar, olhando para ele. Deixe-o observar.",
      "Peça ao seu parceiro para deitar e beije-o de cima a baixo — sem deixar nada de fora.",
      "Segure os pulsos do seu parceiro acima da cabeça e beije-o como se não houvesse amanhã.",
    ],
    es: [
      "Toma a tu pareja de la mano y llévala adonde quieres estar con ella. Sin palabras. Entenderá.",
      "Dile directamente a tu pareja lo que quieres de ella ahora mismo — y exactamente cómo. Sin insinuaciones.",
      "Desvístete tú mismo frente a tu pareja — despacio, mirándola. Deja que observe.",
      "Pide a tu pareja que se acueste y bésala de arriba abajo — sin dejar nada.",
      "Sostén las muñecas de tu pareja sobre su cabeza y bésala como si no hubiera mañana.",
    ],
  },
  hard: {
    ru: [
      "Скажи партнёру позу, в которой хочешь его прямо сейчас. Точно и вслух — без стеснения.",
      "Возьми полный контроль на следующие десять минут. Скажи партнёру, что делать — шаг за шагом.",
      "Опиши партнёру свою самую смелую сексуальную фантазию — подробно, ничего не скрывая. Прямо сейчас.",
      "Скажи партнёру: «Я хочу тебя» — и покажи именно как. Без предисловий.",
      "Выбери одну вещь, которую всегда хотел(а) попробовать, и попроси партнёра прямо сейчас.",
    ],
    en: [
      "Tell your partner which position you want them in right now. Out loud, specifically — no hesitation.",
      "Take full control for the next ten minutes. Tell your partner what to do — step by step.",
      "Describe your boldest sexual fantasy to your partner — in detail, hiding nothing. Right now.",
      "Say to your partner 'I want you' — and show them exactly how. No preamble.",
      "Choose one thing you've always wanted to try and ask your partner for it directly right now.",
    ],
    hi: [
      "साथी को बताएं कि आप उन्हें अभी किस position में चाहते हैं। ज़ोर से, स्पष्ट रूप से।",
      "अगले दस मिनट पूरा नियंत्रण लें। साथी को बताएं क्या करना है — कदम दर कदम।",
      "अपनी सबसे साहसी यौन कल्पना साथी को विस्तार से बताएं — कुछ भी छिपाए बिना।",
      "साथी से कहें 'मैं तुम्हें चाहता/चाहती हूं' — और दिखाएं बिल्कुल कैसे।",
      "एक चीज़ चुनें जो हमेशा आज़माना चाहते थे और साथी से सीधे मांगें।",
    ],
    pt: [
      "Diga ao seu parceiro em qual posição você o quer agora. Em voz alta, especificamente — sem hesitação.",
      "Assuma o controle total pelos próximos dez minutos. Diga ao seu parceiro o que fazer — passo a passo.",
      "Descreva sua fantasia sexual mais ousada ao seu parceiro — em detalhes, sem esconder nada. Agora.",
      "Diga ao seu parceiro 'Eu te quero' — e mostre exatamente como. Sem preâmbulos.",
      "Escolha uma coisa que sempre quis tentar e peça ao seu parceiro diretamente agora.",
    ],
    es: [
      "Dile a tu pareja en qué posición la quieres ahora mismo. En voz alta, específicamente — sin dudar.",
      "Toma el control total durante los próximos diez minutos. Di a tu pareja qué hacer — paso a paso.",
      "Describe tu fantasía sexual más atrevida a tu pareja — en detalle, sin ocultar nada. Ahora.",
      "Di a tu pareja 'Te deseo' — y muéstrale exactamente cómo. Sin preámbulos.",
      "Elige algo que siempre hayas querido probar y pídelo directamente a tu pareja ahora.",
    ],
  },
};

const SYSTEM_PROMPTS: Record<string, Record<string, string>> = {
  compliments: {
    ru: `Ты пишешь романтические задания-комплименты для пар. Задание должно:
- Быть конкретным и личным, не банальным ("ты красивая" — не считается)
- Говорить о конкретном качестве, поступке, чёрте характера или моменте
- Вызывать настоящее чувство, а не просто слова
- Максимум 2 предложения, прямое указание ("Скажи...", "Посмотри...", "Напиши...")
- Никакого флирта, никаких касаний, только слова и чувства
Верни только само задание.`,
    en: `You write romantic compliment tasks for couples. The task must:
- Be specific and personal, not generic ("you're beautiful" doesn't count)
- Reference a specific quality, action, character trait, or moment
- Evoke a real feeling, not just words
- Max 2 sentences, direct instruction ("Tell them...", "Look at...", "Write...")
- No flirting, no touching — only words and feelings
Return only the task itself.`,
    hi: `आप जोड़ों के लिए रोमांटिक तारीफ-कार्य लिखते हैं। कार्य होना चाहिए:
- विशिष्ट और व्यक्तिगत, सामान्य नहीं
- किसी विशेष गुण, कार्य या पल का उल्लेख करे
- अधिकतम 2 वाक्य, सीधा निर्देश हिंदी में
केवल कार्य वापस करें।`,
    pt: `Você escreve tarefas-elogio românticas para casais. A tarefa deve:
- Ser específica e pessoal, não genérica
- Referenciar uma qualidade, ação ou traço de caráter específico
- Máx 2 frases, instrução direta em Português Brasileiro
Retorne apenas a tarefa.`,
    es: `Escribes tareas-piropo románticas para parejas. La tarea debe:
- Ser específica y personal, no genérica
- Referenciar una cualidad, acción o rasgo de carácter específico
- Máx 2 frases, instrucción directa en Español
Devuelve solo la tarea.`,
  },
  tenderness: {
    ru: `Ты пишешь нежные задания для пар — прикосновения, поцелуи, объятия. Задание должно:
- Быть о физическом, но нежном — без эротики и сексуального подтекста
- Включать конкретное действие: куда касаться, как именно, сколько времени
- Создавать ощущение близости, не возбуждения
- Максимум 2 предложения, прямое указание
- Примеры: поцелуй в лоб, медленный массаж рук, объятие молча, прикосновение к лицу
Верни только само задание.`,
    en: `You write tender tasks for couples — touches, kisses, embraces. The task must:
- Be physical but tender — no eroticism or sexual undertones
- Include a specific action: where to touch, exactly how, for how long
- Create closeness, not arousal
- Max 2 sentences, direct instruction
- Examples: forehead kiss, slow hand massage, silent embrace, tracing the face
Return only the task itself.`,
    hi: `आप जोड़ों के लिए कोमल कार्य लिखते हैं — स्पर्श, चुंबन, आलिंगन। कार्य होना चाहिए:
- शारीरिक लेकिन कोमल — कोई कामुकता नहीं
- विशिष्ट क्रिया: कहां छूना है, कैसे, कितनी देर
- अधिकतम 2 वाक्य, सीधा निर्देश हिंदी में
केवल कार्य वापस करें।`,
    pt: `Você escreve tarefas carinhosas para casais — toques, beijos, abraços. A tarefa deve:
- Ser física mas terna — sem erotismo
- Incluir uma ação específica: onde tocar, exatamente como, por quanto tempo
- Criar proximidade, não excitação
- Máx 2 frases, instrução direta em Português Brasileiro
Retorne apenas a tarefa.`,
    es: `Escribes tareas tiernas para parejas — toques, besos, abrazos. La tarea debe:
- Ser física pero tierna — sin erotismo
- Incluir una acción específica: dónde tocar, exactamente cómo, cuánto tiempo
- Crear cercanía, no excitación
- Máx 2 frases, instrucción directa en Español
Devuelve solo la tarea.`,
  },
  desire: {
    ru: `Ты пишешь эротические задания-прелюдии для пар (18+). Задание должно:
- Быть про прелюдию: раздевание, покусывание, прикосновения с намёком, шёпот желания
- Создавать напряжение и желание, но НЕ описывать секс
- Быть чувственным и дерзким — граница: всё, что предшествует сексу
- Максимум 2 предложения, прямое указание
- Примеры: расстегнуть одну пуговицу, поцелуй в шею с прикусыванием, прошептать желание на ухо, провести ногтями по спине
Верни только само задание.`,
    en: `You write erotic foreplay tasks for couples (18+). The task must:
- Be about foreplay: undressing, light biting, suggestive touching, whispering desire
- Create tension and want, but NOT describe sex itself
- Be sensual and daring — boundary: everything that comes before intercourse
- Max 2 sentences, direct instruction
- Examples: undo one button, neck kiss with teeth, whisper a desire, rake nails down the back
Return only the task itself.`,
    hi: `आप जोड़ों के लिए कामुक प्रस्तावना कार्य लिखते हैं (18+)। कार्य होना चाहिए:
- प्रस्तावना के बारे में: कपड़े उतारना, हल्के काटना, कामुक स्पर्श, इच्छा फुसफुसाना
- तनाव बनाएं लेकिन सेक्स का वर्णन न करें
- अधिकतम 2 वाक्य, सीधा निर्देश हिंदी में
केवल कार्य वापस करें।`,
    pt: `Você escreve tarefas de prelúdio erótico para casais (18+). A tarefa deve:
- Ser sobre prelúdio: despir, mordidas leves, toque sugestivo, sussurrar desejos
- Criar tensão e desejo, mas NÃO descrever o sexo em si
- Máx 2 frases, instrução direta em Português Brasileiro
Retorne apenas a tarefa.`,
    es: `Escribes tareas de preludio erótico para parejas (18+). La tarea debe:
- Ser sobre el preludio: desnudar, mordidas suaves, toque sugestivo, susurrar deseos
- Crear tensión y deseo, pero NO describir el sexo en sí
- Máx 2 frases, instrucción directa en Español
Devuelve solo la tarea.`,
  },
  passion: {
    ru: `Ты пишешь страстные сексуальные задания для взрослых пар (18+). Задание должно:
- Описывать сексуальное действие — нежное, страстное, конкретное
- Говорить о сексе прямо: как, где, в каком настроении
- Быть эмоциональным и телесным одновременно — секс как соединение, а не только физика
- Максимум 2 предложения, прямое указание
- Примеры: привести партнёра в спальню, поцеловать снизу вверх всё тело, сказать что хочешь прямо сейчас
Верни только само задание.`,
    en: `You write passionate sexual tasks for adult couples (18+). The task must:
- Describe a sexual action — tender, passionate, specific
- Speak about sex directly: how, where, in what mood
- Be emotional and physical at the same time — sex as connection, not just mechanics
- Max 2 sentences, direct instruction
- Examples: lead partner to the bedroom, kiss every inch from bottom to top, say exactly what you want right now
Return only the task itself.`,
    hi: `आप वयस्क जोड़ों के लिए भावुक यौन कार्य लिखते हैं (18+)। कार्य होना चाहिए:
- यौन क्रिया का वर्णन करे — कोमल, भावुक, विशिष्ट
- सेक्स के बारे में सीधे बोले: कैसे, कहां
- अधिकतम 2 वाक्य, सीधा निर्देश हिंदी में
केवल कार्य वापस करें।`,
    pt: `Você escreve tarefas sexuais apaixonadas para casais adultos (18+). A tarefa deve:
- Descrever uma ação sexual — terna, apaixonada, específica
- Falar sobre sexo diretamente: como, onde, com que humor
- Máx 2 frases, instrução direta em Português Brasileiro
Retorne apenas a tarefa.`,
    es: `Escribes tareas sexuales apasionadas para parejas adultas (18+). La tarea debe:
- Describir una acción sexual — tierna, apasionada, específica
- Hablar del sexo directamente: cómo, dónde, con qué ánimo
- Máx 2 frases, instrucción directa en Español
Devuelve solo la tarea.`,
  },
  hard: {
    ru: `Ты пишешь откровенные сексуальные задания для пар (18+). Задание должно:
- Быть прямым и откровенным: конкретная поза, доминирование, интенсивность
- Называть вещи своими именами — без эвфемизмов
- Описывать конкретное сексуальное действие с деталями: поза, прикосновения, команды
- Максимум 2 предложения, прямое указание
Верни только само задание.`,
    en: `You write explicit sexual tasks for adult couples (18+). The task must:
- Be direct and explicit: specific position, dominance, intensity
- Call things what they are — no euphemisms
- Describe a specific sexual action with details: position, touches, commands
- Max 2 sentences, direct instruction
Return only the task itself.`,
    hi: `आप जोड़ों के लिए स्पष्ट यौन कार्य लिखते हैं (18+)। कार्य होना चाहिए:
- सीधा और स्पष्ट: विशिष्ट स्थिति, प्रभुत्व, तीव्रता
- चीजों को उनके नाम से पुकारें
- अधिकतम 2 वाक्य, सीधा निर्देश हिंदी में
केवल कार्य वापस करें।`,
    pt: `Você escreve tarefas sexuais explícitas para casais adultos (18+). A tarefa deve:
- Ser direta e explícita: posição específica, dominância, intensidade
- Chamar as coisas pelo nome — sem eufemismos
- Máx 2 frases, instrução direta em Português Brasileiro
Retorne apenas a tarefa.`,
    es: `Escribes tareas sexuales explícitas para parejas adultas (18+). La tarea debe:
- Ser directa y explícita: posición específica, dominancia, intensidad
- Llamar las cosas por su nombre — sin eufemismos
- Máx 2 frases, instrucción directa en Español
Devuelve solo la tarea.`,
  },
};

function userMsg(lang: string): string {
  if (lang === "ru") return "Придумай одно оригинальное задание. Верни только само задание, без объяснений, заголовков и кавычек.";
  if (lang === "hi") return "एक मूल कार्य बनाएं हिंदी में। केवल कार्य, कोई स्पष्टीकरण नहीं।";
  if (lang === "pt") return "Crie uma tarefa original em Português Brasileiro. Apenas a tarefa, sem explicações.";
  if (lang === "es") return "Crea una tarea original en Español. Solo la tarea, sin explicaciones.";
  return "Create one original task. Return only the task itself, no explanations, headers, or quotes.";
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
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(DEEPSEEK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${DEEPSEEK_API_KEY}` },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user",   content: userMsg(lang) },
        ],
        max_tokens: 150,
        temperature: 1.15,
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
