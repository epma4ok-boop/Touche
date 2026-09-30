const QUALITY_RULES: Record<string, string> = {
  ru: `Проверка качества — выполни её молча перед ответом:
- Верни одно самостоятельное, завершённое задание из 1–3 тесно связанных шагов, а не набор случайных действий.
- В каждом шаге ясно, кто действует и на ком; сохраняй одни и те же роли и направление действий. У каждого местоимения должен быть понятный адресат.
- Расположи действия в выполнимом порядке. Не пропускай необходимый переход, не объединяй физически несовместимые действия и заверши мысль конкретно.
- Для интимных и силовых действий предполагай только совершеннолетних участников с предварительным взаимным согласием и возможностью остановиться в любой момент.
- Не ставь оргазм перед следующим сексуальным действием как автоматический переход: обычно оргазм — финал. Продолжение после него допустимо только если ясно, что оба этого хотят и партнёру комфортно.
- Меняй центральную идею задания. Не добавляй музыку, повязку на глаза, съёмку или реквизит по шаблону — они не обязательны.
- Это короткое задание, не ролевая сцена: не придумывай персонажей, сюжет, диалоги и распределение ролей. Ролевые сценарии находятся отдельно.
- Не добавляй вступление, заголовок, слова вроде «Вот цитата» или пояснения. Верни только текст задания.`,
  en: `Quality check — do this silently before answering:
- Return one complete, self-contained task with 1–3 closely connected steps, not a pile of unrelated actions.
- Make it clear who performs each action and who receives it. Keep roles and action direction consistent; every pronoun must have a clear referent.
- Put actions in a physically possible order. Do not skip a necessary transition, combine incompatible actions, or leave the ending incomplete.
- For intimate or power-play actions, assume consenting adults who can stop at any time.
- Do not treat orgasm as an automatic lead-in to another sexual act; usually make it the endpoint. If the task continues afterward, make the mutual desire and comfort explicit.
- Vary the task's central idea. Do not add music, blindfolds, filming, or props by default; none are required.
- This is a short task, not a roleplay scene: do not invent characters, a plot, dialogue, or assigned roles. Roleplay scenarios belong in their separate feature.
- Do not add an introduction, label, quote attribution, or explanation. Return only the task.`,
  hi: `उत्तर देने से पहले चुपचाप जाँचें:
- एक पूरा, अपने-आप में स्पष्ट कार्य दें, जिसमें 1–3 जुड़े हुए चरण हों; असंबंधित कार्रवाइयों की सूची न दें।
- हर चरण में स्पष्ट हो कि कौन क्या कर रहा है और किसके साथ। भूमिकाएँ और क्रिया की दिशा न बदलें; सर्वनाम का संदर्भ स्पष्ट रखें।
- कार्रवाइयों का क्रम व्यावहारिक हो; आवश्यक बदलाव न छोड़ें और अधूरा अंत न दें।
- अंतरंग या शक्ति-आधारित गतिविधियों में केवल सहमति देने वाले वयस्क हों, जिन्हें किसी भी समय रुकने का विकल्प हो।
- चरमोत्कर्ष को अपने-आप अगली यौन क्रिया की शुरुआत न मानें; सामान्यतः इसे कार्य का अंत रखें। आगे जारी रखने पर दोनों की इच्छा और सहजता स्पष्ट हो।
- हर बार कार्य का मुख्य विचार बदलें। संगीत, आँखों पर पट्टी, रिकॉर्डिंग या सामान अपने-आप न जोड़ें।
- यह छोटा कार्य है, भूमिका-अभिनय का दृश्य नहीं। काल्पनिक पात्र, कहानी, संवाद या तय भूमिकाएँ न बनाएँ; ऐसे दृश्य अलग सुविधा में हैं।
- भूमिका या उद्धरण का परिचय न जोड़ें। केवल कार्य लिखें।`,
  pt: `Verifique a qualidade em silêncio antes de responder:
- Escreva uma tarefa completa e independente, com 1–3 etapas diretamente relacionadas; não faça uma lista de ações sem ligação.
- Deixe claro quem faz cada ação e com quem. Mantenha os papéis e a direção das ações; todo pronome deve ter um referente claro.
- Organize as ações em uma ordem fisicamente possível. Não pule transições necessárias nem deixe o final incompleto.
- Em atividades íntimas ou de poder, considere apenas adultos que consentem e podem parar a qualquer momento.
- Não trate o orgasmo como passagem automática para outro ato sexual; normalmente, ele deve encerrar a tarefa. Se houver continuação, deixe claro que ambos querem e estão confortáveis.
- Varie a ideia central da tarefa. Não acrescente música, venda nos olhos, gravação ou acessórios por padrão; nada disso é obrigatório.
- Esta é uma tarefa curta, não uma cena de interpretação: não invente personagens, enredo, diálogos ou papéis. Os cenários de interpretação ficam em outro recurso.
- Não acrescente introdução, rótulo, atribuição de citação ou explicação. Retorne somente a tarefa.`,
  es: `Comprueba la calidad en silencio antes de responder:
- Escribe una tarea completa e independiente, con 1–3 pasos estrechamente relacionados; no una lista de acciones inconexas.
- Deja claro quién realiza cada acción y con quién. Mantén los papeles y la dirección de las acciones; cada pronombre debe tener un referente claro.
- Ordena las acciones de forma físicamente posible. No omitas transiciones necesarias ni dejes el final incompleto.
- En actividades íntimas o de poder, presupón adultos que consienten y pueden parar en cualquier momento.
- No presentes el orgasmo como paso automático hacia otro acto sexual; normalmente debe cerrar la tarea. Si continúa, deja claro que ambos quieren seguir y están cómodos.
- Varía la idea central de la tarea. No añadas música, vendas, grabación ni accesorios por defecto; no son obligatorios.
- Esta es una tarea breve, no una escena de interpretación: no inventes personajes, trama, diálogos ni papeles. Los escenarios de interpretación van aparte.
- No añadas introducciones, etiquetas, atribuciones de citas ni explicaciones. Devuelve solo la tarea.`,
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

const EXPLICIT_CONTINUATION_CONSENT: Record<string, RegExp> = {
  ru: /(?:если|когда)\s+(?:оба|вы оба|партнёр|партнёрша|она|он)\s+(?:хотят|хочет|согласны|согласна|согласен)|спрос(?:и|ите).{0,50}(?:хочет ли|хотят ли|комфортно ли|можно ли)|только если.{0,40}(?:оба согласны|оба хотят|комфортно|согласие)/iu,
  en: /(?:if|when)\s+(?:both|she|he|they|your partner)\s+(?:want|wants|agree|consent|feel comfortable)|ask.{0,50}(?:if|whether).{0,30}(?:want|comfortable|continue)|only if.{0,40}(?:both agree|both want|comfortable|consent)/iu,
  hi: /(?:यदि|जब)\s+(?:दोनों|वह)\s+(?:चाहें|चाहती|चाहता|सहमत|आरामदायक)|पूछें.{0,50}(?:चाहते|चाहती|आरामदायक)/u,
  pt: /(?:se|quando)\s+(?:ambos|ela|ele|vocês|seu parceiro)\s+(?:quiserem|quiser|concordarem|consentirem|se sentirem confortáveis)|pergunte.{0,50}(?:se|se querem|se está confortável)|somente se.{0,40}(?:ambos concordarem|ambos quiserem|consentirem)/iu,
  es: /(?:si|cuando)\s+(?:ambos|ella|él|ustedes|tu pareja)\s+(?:quieren|quiere|aceptan|consienten|se sienten cómodos)|pregunta.{0,50}(?:si|si quiere|si está cómoda|si está cómodo)|solo si.{0,40}(?:ambos aceptan|ambos quieren|consienten)/iu,
};

export function getTaskQualityRules(lang: string): string {
  return QUALITY_RULES[lang] ?? QUALITY_RULES.en;
}

export function isTaskTextWellFormed(text: string, lang: string): boolean {
  const normalized = text.replace(/\s+/gu, " ").trim();
  if (!normalized) return false;
  if (META_PREFIXES[lang]?.test(normalized)) return false;
  if (INCOMPLETE_ENDINGS[lang]?.test(normalized)) return false;
  if (ROLEPLAY_SCENARIO_MARKERS[lang]?.test(normalized)) return false;
  if (
    (
      CLIMAX_BEFORE_SEXUAL_CONTINUATION[lang]?.test(normalized)
      || SEXUAL_CONTINUATION_AFTER_CLIMAX[lang]?.test(normalized)
    )
    && !EXPLICIT_CONTINUATION_CONSENT[lang]?.test(normalized)
  ) return false;
  return true;
}