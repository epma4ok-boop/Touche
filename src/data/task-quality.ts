const QUALITY_RULES: Record<string, string> = {
  ru: `Проверка качества — выполни её молча перед ответом:
  - Верни одно задание с одной центральной идеей. Оно может разворачиваться в течение ближайших суток через 2–4 коротких момента в свободное время; не требуй постоянной переписки или присутствия рядом весь день.
  - Пиши прямо и естественно, обычно в 1–2 предложениях: конкретные действия плюс одна выразительная деталь. Не повторяй один и тот же финал «пусть почувствует».
 - Сохраняй заданные пол и роли мужчины и женщины. Проверяй, кто действует, на ком и какие части тела участвуют.
 - Расположи действия в физически выполнимом порядке. Не пропускай необходимый переход и не обещай автоматическую телесную реакцию.
  - Чётко соблюдай границы категории: комплименты и нежность несексуальны; желание — прелюдия до секса; страсть и хард требуют конкретного действия — орального секса, вагинального секса или мастурбации партнёра/взаимной мастурбации в зависимости от режима. В страсти опиши его нежно и красиво, в харде — прямо и немного грязно.
 - Не описывай принуждение, игнорирование боли или опасную механику. Не добавляй в текст задания пояснения о договорённостях, стоп-словах или безопасности.
 - Если упоминается оргазм, обычно заверши задание на нём; не начинай после него следующий сексуальный акт автоматически.
   - Не требуй интимных фото. Эротическая съёмка допустима только как необязательный вариант в «Харде», если оба этого хотят; такое видео нельзя публиковать или отправлять. Обычные личные селфи допустимы, если уместны. Не добавляй реквизит по шаблону.
   - Это реальное задание, не ролевая игра: без вымышленных персонажей, сюжета и длинных диалогов. Верни только текст задания, без вступления и пояснений.`,
  en: `Quality check — do this silently before answering:
  - Return one task with one central idea. It may unfold over the next 24 hours in 2–4 short moments during free time; do not require constant messaging or being together all day.
  - Write directly and naturally, usually in 1–2 sentences: concrete actions plus one vivid detail. Avoid repeating the same "let them feel" ending.
 - Keep the man-woman roles fixed. Check who acts, who receives the action, and which body parts are involved.
 - Put actions in a physically possible order. Do not skip necessary transitions or promise an automatic bodily response.
  - Keep category boundaries clear: compliments and tenderness are nonsexual; desire is foreplay before sex; passion and hard require a concrete act—oral sex, vaginal sex, or masturbation of a partner/mutual masturbation as appropriate to the mode. Make passion tender and beautiful; make hard direct and a little dirty.
 - Do not describe coercion, ignoring pain, or physically dangerous actions. Do not put explanations about agreements, safewords, or safety in the task text.
 - If orgasm is mentioned, usually make it the endpoint; do not automatically start another sexual act afterward.
   - Do not require intimate photos. Optional erotic filming is allowed only in Hard, only if both want it; never ask them to share or post it. Ordinary private selfies are allowed when relevant. Do not add props by default.
   - This is a real activity, not roleplay: no fictional characters, plot, or long dialogue. Return only the task text, with no introduction or explanation.`,
  hi: `उत्तर देने से पहले चुपचाप जाँचें:
   - एक काम और एक मुख्य विचार दें। यह अगले 24 घंटों में खाली समय के 2–4 छोटे पलों में पूरा हो सकता है; लगातार संदेश भेजना या पूरे दिन साथ रहना आवश्यक न करें।
  - सीधे और स्वाभाविक ढंग से लिखें, आम तौर पर 1–2 वाक्यों में: ठोस क्रियाएँ और एक खास विवरण। एक ही भावुक अंत बार-बार न दोहराएँ।
 - पुरुष और महिला की भूमिकाएँ स्थिर रखें। जाँचें कि कौन क्रिया कर रहा है, किस पर, और शरीर के कौन-से हिस्से शामिल हैं।
 - क्रियाओं का क्रम शारीरिक रूप से संभव हो। आवश्यक बदलाव न छोड़ें और शरीर की प्रतिक्रिया की गारंटी न दें।
  - श्रेणी की सीमा बनाएँ: प्रशंसा और कोमलता गैर-यौन हैं; इच्छा सेक्स से पहले की भूमिका है; जुनून और हार्ड में ठोस यौन क्रिया होनी चाहिए—ओरल सेक्स, योनि सेक्स या हस्तमैथुन। चुने हुए मोड के अनुसार भूमिकाएँ तय करें। जुनून को कोमल और सुंदर रखें; हार्ड को सीधा और थोड़ा अश्लील रखें।
 - ज़बरदस्ती, दर्द की अनदेखी या खतरनाक क्रियाएँ न लिखें। कार्य में समझौते, सुरक्षित शब्द या सुरक्षा की व्याख्या न जोड़ें।
 - अगर चरमोत्कर्ष का उल्लेख हो, तो आम तौर पर वहीं कार्य समाप्त करें; उसके बाद अपने-आप अगली यौन क्रिया न जोड़ें।
   - अंतरंग फ़ोटो अनिवार्य न करें। कामुक वीडियो केवल हार्ड श्रेणी में एक वैकल्पिक क्रिया हो सकता है, जब दोनों उसे चाहें; उसे साझा या प्रकाशित करने को न कहें। उपयुक्त होने पर साधारण निजी सेल्फ़ी ठीक हैं। सामान अपने-आप न जोड़ें।
   - यह वास्तविक गतिविधि है, भूमिका-अभिनय नहीं: काल्पनिक पात्र, कहानी या लंबा संवाद नहीं। केवल कार्य का पाठ लौटाएँ।`,
  pt: `Verifique a qualidade em silêncio antes de responder:
   - Escreva uma tarefa com uma ideia central. Ela pode acontecer em 2–4 momentos curtos durante o tempo livre nas próximas 24 horas; não exija mensagens constantes nem que estejam juntos o dia todo.
  - Use linguagem direta e natural, geralmente em 1–2 frases: ações concretas e um detalhe marcante. Evite repetir o mesmo fecho emocional.
 - Mantenha fixos os papéis do homem e da mulher. Confira quem age, quem recebe a ação e quais partes do corpo estão envolvidas.
 - Organize as ações em uma ordem fisicamente possível. Não pule transições nem prometa uma reação corporal automática.
  - Respeite os limites da categoria: elogios e carinho são não sexuais; desejo é preliminar antes do sexo; paixão e hard exigem um ato concreto — sexo oral, sexo vaginal ou masturbação do parceiro/mútua conforme o modo. Paixão deve ser terna e bonita; hard, direto e um pouco mais sujo.
 - Não descreva coerção, ignorar dor ou ações fisicamente perigosas. Não inclua explicações sobre acordos, palavra de segurança ou segurança no texto.
 - Se mencionar orgasmo, normalmente encerre a tarefa ali; não comece automaticamente outro ato sexual depois.
   - Não exija fotos íntimas. Uma gravação erótica opcional só pode aparecer em hard, se ambos quiserem; nunca peça para compartilhar ou publicar o vídeo. Selfies comuns e privadas podem aparecer quando fizerem sentido. Não acrescente acessórios por padrão.
   - Esta é uma atividade real, não uma interpretação: sem personagens fictícios, enredo ou diálogos longos. Retorne somente o texto da tarefa.`,
  es: `Comprueba la calidad en silencio antes de responder:
   - Escribe una tarea con una idea central. Puede desarrollarse durante las próximas 24 horas en 2–4 momentos breves durante el tiempo libre; no exijas mensajes constantes ni estar juntos todo el día.
  - Usa un tono directo y natural, normalmente en 1–2 frases: acciones concretas y un detalle expresivo. Evita repetir el mismo cierre emocional.
 - Mantén fijos los papeles del hombre y la mujer. Comprueba quién actúa, quién recibe la acción y qué partes del cuerpo intervienen.
 - Ordena las acciones de forma físicamente posible. No omitas transiciones ni prometas una reacción corporal automática.
  - Respeta los límites de cada categoría: cumplidos y ternura no son sexuales; deseo es el juego previo antes del sexo; pasión y hard requieren un acto concreto — sexo oral, sexo vaginal o masturbación de la pareja/mutua según el modo. Pasión debe ser tierna y bonita; hard, directo y algo más sucio.
 - No describas coerción, ignorar el dolor ni acciones físicamente peligrosas. No añadas explicaciones sobre acuerdos, palabras de seguridad o seguridad al texto.
 - Si mencionas el orgasmo, normalmente termina ahí la tarea; no empieces automáticamente otro acto sexual después.
   - No exijas fotos íntimas. La grabación erótica solo puede ser una opción en hard y si ambos la quieren; nunca pidas compartir ni publicar el vídeo. Se permiten selfies normales y privados cuando encajen. No añadas accesorios por defecto.
   - Es una actividad real, no una interpretación: sin personajes ficticios, trama ni diálogos largos. Devuelve solo el texto de la tarea.`,
};

const MODE_RULES: Record<string, Record<"solo" | "together", string>> = {
  ru: {
    solo: "В одиночном режиме задание получает один пользователь. Обращайся к нему как к одному человеку и опиши одно действие, которое он может сделать для партнёра. В «Страсти» и «Харде» пользователь выполняет названное действие для партнёра; не используй взаимные действия, «по очереди» или отдельное задание партнёру.",
    together: "В парном режиме один инициирует задание, а оба получают один и тот же текст. Опиши одно общее действие для совершеннолетних мужчины и женщины, включив обоих в сексуальное действие; не превращай карточку в два отдельных задания.",
  },
  en: {
    solo: "In solo mode, only the initiating user receives the task. Address that person individually and describe one action they can take for their partner. For Passion and Hard, the user performs the named act for the partner; do not use mutual actions, take-turns instructions, or a separate task for the partner.",
    together: "In together mode, one person starts and both receive the same text. Write one shared action for an adult man and woman and explicitly include both in the sexual act, not two separate tasks.",
  },
  hi: {
    solo: "एकल मोड में केवल उपयोगकर्ता को काम मिलता है। उसी व्यक्ति को संबोधित करें और ऐसा एक काम बताएँ जो वह अपने साथी के लिए कर सकता है; साथी से जवाब या अलग काम की अपेक्षा न करें। जुनून और हार्ड में उपयोगकर्ता साथी के लिए नामित क्रिया करे; आपसी क्रिया या बारी-बारी के निर्देश न दें।",
    together: "साथी मोड में एक व्यक्ति शुरुआत करता है और दोनों को वही पाठ मिलता है। वयस्क पुरुष और महिला की साझा गतिविधि लिखें और यौन क्रिया में दोनों को स्पष्ट रूप से शामिल करें; दो अलग काम न दें।",
  },
  pt: {
    solo: "No modo solo, somente o usuário recebe a tarefa. Dirija-se a essa pessoa e descreva uma ação que ela pode fazer para o parceiro; não exija resposta nem uma ação separada do parceiro. Em Paixão e hard, o usuário executa o ato nomeado no parceiro; não use ações mútuas nem instruções para alternar.",
    together: "No modo a dois, uma pessoa inicia e ambos recebem o mesmo texto. Escreva uma ação compartilhada por um homem e uma mulher adultos, incluindo claramente os dois no ato sexual, não duas tarefas separadas.",
  },
  es: {
    solo: "En modo individual, solo quien inicia recibe la tarea. Dirígete a esa persona y describe una acción que pueda hacer por su pareja; no exijas una respuesta ni una acción separada. En Pasión y hard, quien inicia realiza el acto nombrado para su pareja; no uses acciones mutuas ni instrucciones para turnarse.",
    together: "En modo en pareja, una persona inicia y ambos reciben el mismo texto. Escribe una acción compartida para un hombre y una mujer adultos e incluye claramente a ambos en el acto sexual, no dos tareas separadas.",
  },
};

const META_PREFIXES: Record<string, RegExp> = {
  ru: /^(?:вот\s+(?:цитата|задание|вариант|текст)|(?:задание|ответ|цитата)\s*[:;—-])/iu,
  en: /^(?:here\s+(?:is|'s)\s+(?:the\s+)?(?:task|quote|text)|(?:task|answer|quote)\s*[:;—-])/iu,
  hi: /^(?:यह\s+(?:कार्य|उद्धरण|पाठ)|(?:कार्य|उत्तर|उद्धरण)\s*[:;—-])/u,
  pt: /^(?:aqui está\s+(?:a tarefa|a citação|o texto)|(?:tarefa|resposta|citação)\s*[:;—-])/iu,
  es: /^(?:aquí está\s+(?:la tarea|la cita|el texto)|(?:tarea|respuesta|cita)\s*[:;—-])/iu,
};

const INCOMPLETE_ENDINGS: Record<string, RegExp> = {
  ru: /(?:(?:^|\s)(?:и|или|но|потом|затем|после|чтобы|когда)\s*[.!?…]*$|(?:^|\s)(?:потом|затем)\s+(?:войд[иите]|проникни|вставь|положи|помести|направь|перейди)\s*[.!?…]*$)/iu,
  en: /(?:\b(?:and|or|but|then|after|with|into|to|when|while|because)\s*[.!?…]*$|\b(?:then|after that)\s+(?:enter|insert|penetrate|put|place|move)\s*[.!?…]*$)/iu,
  hi: /(?:और|या|लेकिन|फिर|उसके बाद|के साथ|क्योंकि)\s*[.!?…]*$/u,
  pt: /(?:\b(?:e|ou|mas|depois|então|com|para|quando|porque)\s*[.!?…]*$|\b(?:depois|em seguida)\s+(?:entre|insira|penetre|coloque|ponha)\s*[.!?…]*$)/iu,
  es: /(?:\b(?:y|o|pero|después|luego|con|para|cuando|porque)\s*[.!?…]*$|\b(?:después|luego)\s+(?:entra|inserta|penetra|coloca|pon)\s*[.!?…]*$)/iu,
};

const ROLEPLAY_SCENARIO_MARKERS: Record<string, RegExp> = {
  ru: /(?:ролевая\s+игра|ролев(?:ая|ую)\s+сцен|разыграй(?:те)?\s+(?:сцену|роль)|сыграй(?:те)?\s+(?:сцену|роль)|притворись|представь(?:те)?(?:\s+себя\s+(?:в|в роли)|\s*,?\s*что)|персонаж(?:и|ей|а)?\s*[:—-]|выбери(?:те)?\s+роли|распределите\s+роли|сценар\w*\s+(?:ролев|с\s+персонаж))/iu,
  en: /\b(?:role[- ]?play|pretend to be|pretend you're|act as|play the role|stay in character|choose your roles|decide on your roles|fictional character|roleplay scenario|scenario with characters|imagine (?:that )?(?:you|your partner)|write a (?:scene|script)|create a scenario)\b/iu,
  hi: /(?:भूमिका निभाएँ|भूमिका निभाओ|भूमिका अदा करें|कल्पना करें कि|कल्पना करो कि|पात्र बनें|किरदार बनें|भूमिकाएँ बाँटें|संवाद लिखें)/u,
  pt: /(?:role[- ]?play|interprete o papel|assuma o papel|finja ser|finja que|imagine que|personagem|roteiro|cena de interpretação|decidam os papéis)/iu,
  es: /(?:role[- ]?play|interpreta el papel|haz de cuenta|finge ser|finge que|imagina que|personaje|guion|guión|escena de rol|decidan los papeles)/iu,
};

const CLIMAX_BEFORE_SEXUAL_CONTINUATION: Record<string, RegExp> = {
  ru: /(?:оргазм|конч(?:и|ить|ил|ила|или|ает|ит)|финиш).{0,110}(?:и(?:\s+сразу)?|а\s+(?:потом|затем|после)|потом|затем|после(?:\s+этого|\s+оргазма)?|когда|как только|сразу после).{0,80}(?:войди|войдите|войти|проникни|проникните|проникнуть|вставь|вставьте|введи|введите|занимайся сексом|займитесь сексом|продолжи|продолжите|начни|начните)/iu,
  en: /(?:orgasm|climax|finish(?:ed)?|cum(?:s|med)?).{0,110}(?:\s+and|\s+then|\s+after(?: that)?|\s+once|\s+when|\s+next|immediately after|right after).{0,80}(?:penetrat\w*|enter\w*|insert\w*|have sex|continu\w*|start another round|go inside)/iu,
  hi: /(?:चरमोत्कर्ष|ऑर्गै?ज़्म|ऑर्गेज़्म|चरम सुख).{0,110}(?:फिर|उसके बाद|बाद में|और फिर|तुरंत बाद|जब).{0,80}(?:प्रवेश|सेक्स|जारी रखें|शुरू करें)/u,
  pt: /(?:orgasmo|clímax|gozar|terminar).{0,110}(?:\s+e|\s+depois|\s+em seguida|\s+então|logo depois|quando|assim que).{0,80}(?:penetr\w*|entr\w*|introduz\w*|fazer sexo|continu\w*|começ\w* outra rodada)/iu,
  es: /(?:orgasmo|clímax|correrse|terminar).{0,110}(?:\s+y|\s+después|\s+luego|\s+entonces|inmediatamente después|cuando|una vez que).{0,80}(?:penetr\w*|entr\w*|introduc\w*|tener sexo|continu\w*|empezar otra ronda)/iu,
};

const SEXUAL_CONTINUATION_AFTER_CLIMAX: Record<string, RegExp> = {
  ru: /(?:после(?:\s+(?:этого|её|его|первого|женского|партнёра|партнёрши))*\s+оргазм\w*|когда.{0,50}(?:оргазм|конч(?:и|ить|ил|ила|или|ает|ит)|финиш)).{0,80}(?:войди|войдите|войти|проникни|проникните|проникнуть|вставь|вставьте|введи|введите|занимайся сексом|займитесь сексом|продолжи|продолжите|начни|начните)/iu,
  en: /(?:after|when|once).{0,50}(?:orgasm|climax|finish(?:ed)?|cum(?:s|med)?).{0,80}(?:penetrat\w*|enter\w*|insert\w*|have sex|continu\w*|start another round|go inside)/iu,
  hi: /(?:जब.{0,50}(?:चरमोत्कर्ष|ऑर्गै?ज़्म|ऑर्गेज़्म|चरम सुख)|(?:चरमोत्कर्ष|ऑर्गै?ज़्म|ऑर्गेज़्म|चरम सुख).{0,30}के बाद).{0,80}(?:प्रवेश|सेक्स|जारी रखें|शुरू करें)/u,
  pt: /(?:depois|quando|assim que).{0,50}(?:orgasmo|clímax|gozar|terminar).{0,80}(?:penetr\w*|entr\w*|introduz\w*|fazer sexo|continu\w*|começ\w* outra rodada)/iu,
  es: /(?:después|cuando|una vez que).{0,50}(?:orgasmo|clímax|correrse|terminar).{0,80}(?:penetr\w*|entr\w*|introduc\w*|tener sexo|continu\w*|empezar otra ronda)/iu,
};

const SHARED_TASK_FORMAT_RULES: Record<string, string> = {
  ru: "Обращайся к обоим партнёрам во множественном числе и включай обоих в действие: например, «вы вдвоём», «по очереди», «друг другу». Не давай задание только одному партнёру.",
  en: "Address both partners as a unit and explicitly include both in the action, using wording such as “both of you,” “together,” “each other,” or “take turns.” Do not make one partner the only actor.",
  hi: "दोनों साथियों को साथ संबोधित करें और दोनों को गतिविधि में शामिल करें; केवल एक साथी को काम करने का निर्देश न दें।",
  pt: "Dirija-se aos dois parceiros e inclua ambos na atividade, com expressões como “vocês dois”, “juntos”, “um ao outro” ou “revezem-se”. Não deixe apenas uma pessoa como responsável pela ação.",
  es: "Dirígete a ambos e inclúyelos en la actividad, con expresiones como «los dos», «juntos», «el uno al otro» o «por turnos». No dejes a una sola persona como única responsable.",
};

const SHARED_TASK_MARKERS: Record<string, RegExp> = {
  ru: /(?<![\p{L}\p{N}])(?:оба|обе|вместе|вдво[её]м|друг\s+друга|друг\s+другу|по\s+очереди|каждый\s+из\s+вас|обменяйтесь|обменивайтесь|обнимитесь|обнимайтесь|поцелуйтесь|целуйтесь)(?![\p{L}\p{N}])/iu,
  en: /\b(?:both of you|you both|each other|one another|together|take turns|both partners|each of you)\b/iu,
  hi: /(?:आप दोनों|दोनों|एक-दूसरे|एक दूसरे|साथ में|मिलकर|बारी-बारी|आपस में)/u,
  pt: /\b(?:vocês dois|ambos|ambas|juntos|juntas|um ao outro|um para o outro|cada um de vocês|por turnos|revezem-se|troquem|entre vocês)\b/iu,
  es: /\b(?:ambos|ambas|los dos|ustedes dos|juntos|juntas|uno al otro|el uno al otro|mutuamente|por turnos|cada uno de ustedes|intercambien|entre ustedes)\b/iu,
};

const CONCRETE_SEXUAL_ACT_MARKERS: Record<string, RegExp> = {
  ru: /(?:оральн\p{L}*\s+секс|оральн\p{L}*\s+ласк|секс\s+ртом|минет|кунилингус|вагинальн\p{L}*\s+секс|вагинальн\p{L}*\s+проник|мастурбац\p{L}*|мастурбир\p{L}*|дроч\p{L}*)/iu,
  en: /(?:oral sex|cunnilingus|fellatio|vaginal sex|vaginal intercourse|penetrat\w*|intercourse|mutual masturbation|masturbat\w*)/iu,
  hi: /(?:ओरल सेक्स|मुख मैथुन|योनि सेक्स|योनि में प्रवेश|योनि प्रवेश|हस्तमैथुन|मास्टर्बेशन)/u,
  pt: /(?:sexo oral|sexo vaginal|penetraç\w*|masturbaç\w*|masturb\p{L}*)/iu,
  es: /(?:sexo oral|sexo vaginal|penetraci\w*|masturbaci\w*|masturb\p{L}*)/iu,
};

export function getTaskQualityRules(lang: string, mode: "solo" | "together" = "together"): string {
  const languageRules = QUALITY_RULES[lang] ?? QUALITY_RULES.en;
  const modeRule = MODE_RULES[lang]?.[mode] ?? MODE_RULES.en[mode];
  const sharedFormatRule = SHARED_TASK_FORMAT_RULES[lang] ?? SHARED_TASK_FORMAT_RULES.en;
  return mode === "together"
    ? `${languageRules}\n - ${modeRule}\n - ${sharedFormatRule}`
    : `${languageRules}\n - ${modeRule}`;
}

export function isSharedTaskText(text: string, lang: string): boolean {
  const marker = SHARED_TASK_MARKERS[lang] ?? SHARED_TASK_MARKERS.en;
  return marker.test(text.replace(/\s+/gu, " ").trim());
}

export function isTaskTextModeAppropriate(text: string, lang: string, mode: "solo" | "together"): boolean {
  return mode === "together"
    ? isSharedTaskText(text, lang)
    : !isSharedTaskText(text, lang);
}

export function hasConcreteSexualAct(text: string, lang: string): boolean {
  const marker = CONCRETE_SEXUAL_ACT_MARKERS[lang] ?? CONCRETE_SEXUAL_ACT_MARKERS.en;
  return marker.test(text.replace(/\s+/gu, " ").trim());
}

export function isTaskTextWellFormed(text: string, lang: string, mode?: "solo" | "together"): boolean {
  const normalized = text.replace(/\s+/gu, " ").trim();
  if (!normalized) return false;
  if (META_PREFIXES[lang]?.test(normalized)) return false;
  if (INCOMPLETE_ENDINGS[lang]?.test(normalized)) return false;
  if (ROLEPLAY_SCENARIO_MARKERS[lang]?.test(normalized)) return false;
  if (CLIMAX_BEFORE_SEXUAL_CONTINUATION[lang]?.test(normalized)
    || SEXUAL_CONTINUATION_AFTER_CLIMAX[lang]?.test(normalized)) return false;
  return true;
}