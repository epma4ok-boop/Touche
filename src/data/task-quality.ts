const QUALITY_RULES: Record<string, string> = {
  ru: `Проверка качества — выполни её молча перед ответом:
 - Верни одно самостоятельное задание с одной центральной идеей и 1–3 тесно связанными шагами.
 - Пиши прямо и естественно: конкретное действие плюс одна выразительная деталь. Обычно достаточно 1–2 предложений; не повторяй один и тот же финал «пусть почувствует».
 - Сохраняй заданные пол и роли мужчины и женщины. Проверяй, кто действует, на ком и какие части тела участвуют.
 - Расположи действия в физически выполнимом порядке. Не пропускай необходимый переход и не обещай автоматическую телесную реакцию.
 - Чётко соблюдай границы категории: комплименты и нежность несексуальны; желание — прелюдия до секса; страсть — чувственный секс; хард — более прямой и грязный стиль.
 - Не описывай принуждение, игнорирование боли или опасную механику. Не добавляй в текст задания пояснения о договорённостях, стоп-словах или безопасности.
 - Если упоминается оргазм, обычно заверши задание на нём; не начинай после него следующий сексуальный акт автоматически.
 - Не требуй интимных фото, видео или съёмки. Не добавляй реквизит по шаблону.
 - Это короткое задание, не ролевая сцена: без персонажей, сюжета и длинных диалогов. Верни только текст задания, без вступления и пояснений.`,
  en: `Quality check — do this silently before answering:
 - Return one self-contained task with one central idea and 1–3 closely connected steps.
 - Write directly and naturally: one concrete action plus one vivid detail. Usually 1–2 sentences are enough; avoid repeating the same "let them feel" ending.
 - Keep the man-woman roles fixed. Check who acts, who receives the action, and which body parts are involved.
 - Put actions in a physically possible order. Do not skip necessary transitions or promise an automatic bodily response.
 - Keep category boundaries clear: compliments and tenderness are nonsexual; desire is foreplay before sex; passion is sensual sex; hard is more direct and dirty in tone.
 - Do not describe coercion, ignoring pain, or physically dangerous actions. Do not put explanations about agreements, safewords, or safety in the task text.
 - If orgasm is mentioned, usually make it the endpoint; do not automatically start another sexual act afterward.
 - Do not require intimate photos, video, or filming. Do not add props by default.
 - This is a short task, not a roleplay scene: no characters, plot, or long dialogue. Return only the task text, with no introduction or explanation.`,
  hi: `उत्तर देने से पहले चुपचाप जाँचें:
 - एक स्पष्ट कार्य दें: एक मुख्य विचार और 1–3 जुड़े हुए चरण।
 - सीधे और स्वाभाविक ढंग से लिखें: एक ठोस क्रिया और एक खास विवरण। आम तौर पर 1–2 वाक्य पर्याप्त हैं; एक ही भावुक अंत बार-बार न दोहराएँ।
 - पुरुष और महिला की भूमिकाएँ स्थिर रखें। जाँचें कि कौन क्रिया कर रहा है, किस पर, और शरीर के कौन-से हिस्से शामिल हैं।
 - क्रियाओं का क्रम शारीरिक रूप से संभव हो। आवश्यक बदलाव न छोड़ें और शरीर की प्रतिक्रिया की गारंटी न दें।
 - श्रेणी की सीमा बनाएँ: प्रशंसा और कोमलता गैर-यौन हैं; इच्छा सेक्स से पहले की भूमिका है; जुनून संवेदनशील सेक्स है; हार्ड अधिक सीधा और अश्लील लहजा है।
 - ज़बरदस्ती, दर्द की अनदेखी या खतरनाक क्रियाएँ न लिखें। कार्य में समझौते, सुरक्षित शब्द या सुरक्षा की व्याख्या न जोड़ें।
 - अगर चरमोत्कर्ष का उल्लेख हो, तो आम तौर पर वहीं कार्य समाप्त करें; उसके बाद अपने-आप अगली यौन क्रिया न जोड़ें।
 - अंतरंग फ़ोटो, वीडियो या रिकॉर्डिंग अनिवार्य न करें। सामान अपने-आप न जोड़ें।
 - यह छोटा कार्य है, भूमिका-अभिनय का दृश्य नहीं: पात्र, कहानी या लंबा संवाद नहीं। केवल कार्य का पाठ लौटाएँ।`,
  pt: `Verifique a qualidade em silêncio antes de responder:
 - Escreva uma tarefa completa com uma ideia central e 1–3 etapas diretamente relacionadas.
 - Use linguagem direta e natural: uma ação concreta e um detalhe marcante. Em geral, 1–2 frases bastam; evite repetir o mesmo fecho emocional.
 - Mantenha fixos os papéis do homem e da mulher. Confira quem age, quem recebe a ação e quais partes do corpo estão envolvidas.
 - Organize as ações em uma ordem fisicamente possível. Não pule transições nem prometa uma reação corporal automática.
 - Respeite os limites da categoria: elogios e carinho são não sexuais; desejo é preliminar antes do sexo; paixão é sexo sensual; hard tem linguagem mais direta e picante.
 - Não descreva coerção, ignorar dor ou ações fisicamente perigosas. Não inclua explicações sobre acordos, palavra de segurança ou segurança no texto.
 - Se mencionar orgasmo, normalmente encerre a tarefa ali; não comece automaticamente outro ato sexual depois.
 - Não exija fotos íntimas, vídeos ou gravações. Não acrescente acessórios por padrão.
 - Esta é uma tarefa curta, não uma cena de interpretação: sem personagens, enredo ou diálogos longos. Retorne somente o texto da tarefa.`,
  es: `Comprueba la calidad en silencio antes de responder:
 - Escribe una tarea completa con una idea central y 1–3 pasos relacionados.
 - Usa un tono directo y natural: una acción concreta y un detalle expresivo. Normalmente bastan 1–2 frases; evita repetir el mismo cierre emocional.
 - Mantén fijos los papeles del hombre y la mujer. Comprueba quién actúa, quién recibe la acción y qué partes del cuerpo intervienen.
 - Ordena las acciones de forma físicamente posible. No omitas transiciones ni prometas una reacción corporal automática.
 - Respeta los límites de cada categoría: cumplidos y ternura no son sexuales; deseo es el juego previo antes del sexo; pasión es sexo sensual; hard usa un lenguaje más directo y explícito.
 - No describas coerción, ignorar el dolor ni acciones físicamente peligrosas. No añadas explicaciones sobre acuerdos, palabras de seguridad o seguridad al texto.
 - Si mencionas el orgasmo, normalmente termina ahí la tarea; no empieces automáticamente otro acto sexual después.
 - No exijas fotos íntimas, vídeos ni grabaciones. No añadas accesorios por defecto.
 - Es una tarea breve, no una escena de interpretación: sin personajes, trama ni diálogos largos. Devuelve solo el texto de la tarea.`,
};

const MODE_RULES: Record<string, Record<"solo" | "together", string>> = {
  ru: {
    solo: "В режиме «один» действует только пользователь: не упоминай партнёра, второго человека или совместное действие.",
    together: "В парном режиме это одно общее действие для обоих, не отдельные роли и не два независимых задания.",
  },
  en: {
    solo: "In solo mode, only the user acts: do not mention a partner, another person, or a shared action.",
    together: "In together mode, write one shared action for both people, not separate roles or two independent tasks.",
  },
  hi: {
    solo: "एकल मोड में केवल उपयोगकर्ता शामिल है: साथी, दूसरे व्यक्ति या साझा क्रिया का उल्लेख न करें।",
    together: "साथी मोड में दोनों के लिए एक साझा क्रिया लिखें, अलग भूमिकाएँ या दो स्वतंत्र काम नहीं।",
  },
  pt: {
    solo: "No modo individual, somente o usuário participa: não mencione parceiro, outra pessoa ou ação compartilhada.",
    together: "No modo a dois, escreva uma ação compartilhada pelos dois, não papéis separados nem duas tarefas independentes.",
  },
  es: {
    solo: "En modo individual solo participa el usuario: no menciones pareja, otra persona ni una acción compartida.",
    together: "En modo en pareja, escribe una acción compartida por ambos, no papeles separados ni dos tareas independientes.",
  },
};

const SOLO_PARTNER_REFERENCES: Record<string, RegExp> = {
  ru: /\b(?:партн[её]р\w*|девушк\w*|парн\w*|вдво[её]м|оба|обоим|друг\s+другу)\b/iu,
  en: /\b(?:partner|boyfriend|girlfriend|both of you|each other|one another|your man|your woman)\b/iu,
  hi: /(?:साथी|दोनों|एक-दूसरे|एक दूसरे|आप दोनों)/u,
  pt: /\b(?:parceir[oa]\w*|namorad[oa]\w*|companheir[oa]\w*|vocês|um ao outro|uma à outra|juntos)\b/iu,
  es: /\b(?:pareja|novi[oa]\w*|compañer[oa]\w*|ustedes|ambos|ambas|entre sí|uno al otro|una a la otra|juntos)\b/iu,
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

export function getTaskQualityRules(lang: string, mode: "solo" | "together" = "together"): string {
  const languageRules = QUALITY_RULES[lang] ?? QUALITY_RULES.en;
  const modeRule = MODE_RULES[lang]?.[mode] ?? MODE_RULES.en[mode];
  return `${languageRules}\n - ${modeRule}`;
}

export function isTaskTextWellFormed(text: string, lang: string, mode?: "solo" | "together"): boolean {
  const normalized = text.replace(/\s+/gu, " ").trim();
  if (!normalized) return false;
  if (META_PREFIXES[lang]?.test(normalized)) return false;
  if (INCOMPLETE_ENDINGS[lang]?.test(normalized)) return false;
  if (ROLEPLAY_SCENARIO_MARKERS[lang]?.test(normalized)) return false;
  if (CLIMAX_BEFORE_SEXUAL_CONTINUATION[lang]?.test(normalized)
    || SEXUAL_CONTINUATION_AFTER_CLIMAX[lang]?.test(normalized)) return false;
  if (mode === "solo" && SOLO_PARTNER_REFERENCES[lang]?.test(normalized)) return false;
  return true;
}