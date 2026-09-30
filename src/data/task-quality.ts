const QUALITY_RULES: Record<string, string> = {
  ru: `Проверка качества — выполни её молча перед ответом:
- Верни одно самостоятельное, завершённое задание из 1–3 тесно связанных шагов, а не набор случайных действий.
- В каждом шаге ясно, кто действует и на ком; сохраняй одни и те же роли и направление действий. У каждого местоимения должен быть понятный адресат.
- Расположи действия в выполнимом порядке. Не пропускай необходимый переход, не объединяй физически несовместимые действия и заверши мысль конкретно.
- Для интимных и силовых действий предполагай только совершеннолетних участников с предварительным взаимным согласием и возможностью остановиться в любой момент.
- Не ставь оргазм перед следующим сексуальным действием как автоматический переход: обычно оргазм — финал. Продолжение после него допустимо только если ясно, что оба этого хотят и партнёру комфортно.
- Не добавляй вступление, заголовок, слова вроде «Вот цитата» или пояснения. Верни только текст задания.`,
  en: `Quality check — do this silently before answering:
- Return one complete, self-contained task with 1–3 closely connected steps, not a pile of unrelated actions.
- Make it clear who performs each action and who receives it. Keep roles and action direction consistent; every pronoun must have a clear referent.
- Put actions in a physically possible order. Do not skip a necessary transition, combine incompatible actions, or leave the ending incomplete.
- For intimate or power-play actions, assume consenting adults who can stop at any time.
- Do not treat orgasm as an automatic lead-in to another sexual act; usually make it the endpoint. If the task continues afterward, make the mutual desire and comfort explicit.
- Do not add an introduction, label, quote attribution, or explanation. Return only the task.`,
  hi: `उत्तर देने से पहले चुपचाप जाँचें:
- एक पूरा, अपने-आप में स्पष्ट कार्य दें, जिसमें 1–3 जुड़े हुए चरण हों; असंबंधित कार्रवाइयों की सूची न दें।
- हर चरण में स्पष्ट हो कि कौन क्या कर रहा है और किसके साथ। भूमिकाएँ और क्रिया की दिशा न बदलें; सर्वनाम का संदर्भ स्पष्ट रखें।
- कार्रवाइयों का क्रम व्यावहारिक हो; आवश्यक बदलाव न छोड़ें और अधूरा अंत न दें।
- अंतरंग या शक्ति-आधारित गतिविधियों में केवल सहमति देने वाले वयस्क हों, जिन्हें किसी भी समय रुकने का विकल्प हो।
- चरमोत्कर्ष को अपने-आप अगली यौन क्रिया की शुरुआत न मानें; सामान्यतः इसे कार्य का अंत रखें। आगे जारी रखने पर दोनों की इच्छा और सहजता स्पष्ट हो।
- भूमिका या उद्धरण का परिचय न जोड़ें। केवल कार्य लिखें।`,
  pt: `Verifique a qualidade em silêncio antes de responder:
- Escreva uma tarefa completa e independente, com 1–3 etapas diretamente relacionadas; não faça uma lista de ações sem ligação.
- Deixe claro quem faz cada ação e com quem. Mantenha os papéis e a direção das ações; todo pronome deve ter um referente claro.
- Organize as ações em uma ordem fisicamente possível. Não pule transições necessárias nem deixe o final incompleto.
- Em atividades íntimas ou de poder, considere apenas adultos que consentem e podem parar a qualquer momento.
- Não trate o orgasmo como passagem automática para outro ato sexual; normalmente, ele deve encerrar a tarefa. Se houver continuação, deixe claro que ambos querem e estão confortáveis.
- Não acrescente introdução, rótulo, atribuição de citação ou explicação. Retorne somente a tarefa.`,
  es: `Comprueba la calidad en silencio antes de responder:
- Escribe una tarea completa e independiente, con 1–3 pasos estrechamente relacionados; no una lista de acciones inconexas.
- Deja claro quién realiza cada acción y con quién. Mantén los papeles y la dirección de las acciones; cada pronombre debe tener un referente claro.
- Ordena las acciones de forma físicamente posible. No omitas transiciones necesarias ni dejes el final incompleto.
- En actividades íntimas o de poder, presupón adultos que consienten y pueden parar en cualquier momento.
- No presentes el orgasmo como paso automático hacia otro acto sexual; normalmente debe cerrar la tarea. Si continúa, deja claro que ambos quieren seguir y están cómodos.
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

const CLIMAX_BEFORE_SEXUAL_CONTINUATION: Record<string, RegExp> = {
  ru: /(?:оргазм|конч(?:и|ить|ил|ила|или)|финиш).{0,100}(?:а\s+потом|потом|затем|после этого).{0,70}(?:войди|войдите|войти|проникни|проникните|проникнуть|вставь|вставьте|введи|введите|занимайся сексом|займитесь сексом|продолжи|продолжите|начни|начните)/iu,
  en: /(?:orgasm|climax|finish|cum).{0,100}\b(?:then|after that|and then)\b.{0,70}\b(?:penetrate|enter|insert|have sex|continue|start another round)\b/iu,
  pt: /(?:orgasmo|clímax|gozar|terminar).{0,100}\b(?:depois|em seguida|então)\b.{0,70}\b(?:penetrar|entrar|introduzir|fazer sexo|continuar|começar outra rodada)\b/iu,
  es: /(?:orgasmo|clímax|correrse|terminar).{0,100}\b(?:después|luego|entonces)\b.{0,70}\b(?:penetrar|entrar|introducir|tener sexo|continuar|empezar otra ronda)\b/iu,
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
  if (
    CLIMAX_BEFORE_SEXUAL_CONTINUATION[lang]?.test(normalized)
    && !EXPLICIT_CONTINUATION_CONSENT[lang]?.test(normalized)
  ) return false;
  return true;
}