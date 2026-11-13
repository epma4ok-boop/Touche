import type { Lang } from "./i18n";

export type LovePathTask = { title: string; action: string; receive: string };
export type LovePathDay = { category: string; title: string; tasks: LovePathTask[] };
export type LovePathFinale = { title: string; scenario: string };

export type LovePathLabels = {
  back: string; kicker: string; title: string; intro: string;
  progress: (count: number) => string; boardTitle: string;
  start: string; finaleUnlocked: string; openTask: string; makeMove: (day: number) => string; waitTomorrow: string;
  day: string; choose: string; chooseHint: string; action: string; receive: string; done: string;
  pause: string; pauseHint: string; finalTitle: string; finalText: string;
  chooseFor: string; me: string; partner: string; mismatch: string; match: string; chooseAgain: string;
  scenario: string; consent: string; wait: string; pairRequired: string; genericError: string; waitingFinal: string;
  moveTaken: string; partnerPlayed: string; yourTurn: string; partnersTurn: string;
  boardAria: string; doneLegend: string; currentLegend: string; finaleLegend: string; together: string;
  centerKicker: string; revealScenario: string; backHome: string;
};

export const LOVE_PATH_LABELS: Record<Lang, LovePathLabels> = {
  ru: {
    back: "Назад", kicker: "ПУТЬ ЛЮБВИ", title: "Семь шагов ближе",
    intro: "Один человек — один ход в день. Завтра очередь перейдёт к партнёру.",
    progress: count => `Ходов сделано: ${count} из 7`, boardTitle: "Ваш путь",
    start: "Начать игру", finaleUnlocked: "Вы уже у финала", openTask: "Открыть задание",
    makeMove: day => `Сделать ход · день ${day}`, waitTomorrow: "Ждём следующего дня",
    day: "ДЕНЬ", choose: "Выбери одно задание", chooseHint: "Выбор сразу фиксирует ход на сегодня. Завтра очередь партнёра.",
    action: "Твоё задание", receive: "Сообщение партнёру", done: "Вернуться к полю",
    pause: "Отложить", pauseHint: "Прогресс сохранится. Вернёшься, когда будет удобно.",
    finalTitle: "Встреча в центре", finalText: "Каждый выбирает финальное задание отдельно. Совпадут выборы — откроется общий сценарий.",
    chooseFor: "Сейчас выбирает", me: "Я", partner: "Партнёр",
    mismatch: "Пока выбрали разное. Поменяйте только свой финальный выбор — неделя сохранена.",
    match: "Вы совпали. Финальное задание открыто.", chooseAgain: "Изменить мой выбор",
    scenario: "Ваш общий сценарий", consent: "Можно остановиться или изменить план в любой момент. Прогресс игры не пропадёт.",
    wait: "Сегодняшний ход уже сделан. Следующий участник сможет выбрать задание завтра.",
    pairRequired: "Сначала подключите партнёра в Touché, чтобы начать игру.",
    genericError: "Не удалось загрузить игру. Проверьте соединение и попробуйте снова.",
    waitingFinal: "Ваш выбор сохранён. Финал откроется, когда партнёр выберет свой вариант.",
    moveTaken: "Ход сделан сегодня", partnerPlayed: "Партнёр уже сделал ход", yourTurn: "Ваш ход", partnersTurn: "Ход партнёра",
    boardAria: "Игровое поле в форме сердца, путь от нижнего кончика к центру",
    doneLegend: "Пройдено", currentLegend: "Текущий шаг", finaleLegend: "Финал", together: "вместе",
    centerKicker: "ЦЕНТР СЕРДЦА", revealScenario: "Открыть общий сценарий", backHome: "Вернуться на главную",
  },
  en: {
    back: "Back", kicker: "THE LOVE PATH", title: "Seven steps closer",
    intro: "One person makes one move each day. Tomorrow, it’s the other partner’s turn.",
    progress: count => `Moves made: ${count} of 7`, boardTitle: "Your path",
    start: "Start the game", finaleUnlocked: "Finale unlocked", openTask: "Open your task",
    makeMove: day => `Make your move · day ${day}`, waitTomorrow: "Wait until tomorrow",
    day: "DAY", choose: "Choose one task", chooseHint: "Choosing locks today’s move. Tomorrow is your partner’s turn.",
    action: "Your task", receive: "Note for your partner", done: "Back to the board",
    pause: "Pause for now", pauseHint: "Your progress is saved. Return when it feels right.",
    finalTitle: "Meet in the center", finalText: "Choose the final task separately. When your choices match, the shared scenario opens.",
    chooseFor: "Choosing now", me: "Me", partner: "Partner",
    mismatch: "Your choices differ. Change only your own finale choice; the week stays saved.",
    match: "You matched. Your shared finale is ready.", chooseAgain: "Change my choice",
    scenario: "Your shared scenario", consent: "You can pause or change the plan at any time. Game progress stays saved.",
    wait: "Today’s move is already taken. The next partner can choose tomorrow.",
    pairRequired: "Connect your partner in Touché before starting the game.",
    genericError: "Could not load the game. Check your connection and try again.",
    waitingFinal: "Your choice is saved. The finale opens when your partner chooses too.",
    moveTaken: "Today’s move is taken", partnerPlayed: "Your partner has played", yourTurn: "Your turn", partnersTurn: "Partner’s turn",
    boardAria: "Heart-shaped game board, path from the point to the center",
    doneLegend: "Done", currentLegend: "Current step", finaleLegend: "Finale", together: "together",
    centerKicker: "HEART CENTER", revealScenario: "Reveal shared finale", backHome: "Back to home",
  },
  hi: {
    back: "वापस", kicker: "प्यार का रास्ता", title: "सात कदम और करीब",
    intro: "हर दिन एक साथी एक कदम लेता है। अगले दिन दूसरे साथी की बारी होती है।",
    progress: count => `कदम पूरे: ${count} / 7`, boardTitle: "आपका रास्ता",
    start: "खेल शुरू करें", finaleUnlocked: "अंतिम चरण खुला", openTask: "आज का काम खोलें",
    makeMove: day => `अपनी बारी लें · दिन ${day}`, waitTomorrow: "कल तक प्रतीक्षा करें",
    day: "दिन", choose: "एक काम चुनें", chooseHint: "चुनते ही आज की बारी तय हो जाएगी। कल आपके साथी की बारी होगी।",
    action: "आपका काम", receive: "साथी के लिए संदेश", done: "रास्ते पर लौटें",
    pause: "अभी रोकें", pauseHint: "आपकी प्रगति सुरक्षित है। जब ठीक लगे, लौटें।",
    finalTitle: "दिल के केंद्र में मिलें", finalText: "दोनों अलग-अलग अंतिम काम चुनें। चुनाव मिलने पर साझा दृश्य खुलेगा।",
    chooseFor: "अब चुन रहे हैं", me: "मैं", partner: "साथी",
    mismatch: "आपके चुनाव अलग हैं। सिर्फ़ अपना अंतिम चुनाव बदलें; सप्ताह की प्रगति सुरक्षित है।",
    match: "आपके चुनाव मिल गए। साझा अंतिम काम तैयार है।", chooseAgain: "मेरा चुनाव बदलें",
    scenario: "आपका साझा दृश्य", consent: "आप कभी भी रुक सकते हैं या योजना बदल सकते हैं। प्रगति सुरक्षित रहेगी।",
    wait: "आज की बारी पूरी हो चुकी है। अगला साथी कल काम चुन सकेगा।",
    pairRequired: "खेल शुरू करने से पहले Touché में अपने साथी को जोड़ें।",
    genericError: "खेल लोड नहीं हुआ। कनेक्शन जाँचें और फिर कोशिश करें।",
    waitingFinal: "आपका चुनाव सुरक्षित है। साथी के चुनने पर अंतिम चरण खुलेगा।",
    moveTaken: "आज की बारी पूरी", partnerPlayed: "साथी अपनी बारी ले चुका है", yourTurn: "आपकी बारी", partnersTurn: "साथी की बारी",
    boardAria: "दिल के आकार का खेल-पथ, नोक से केंद्र तक",
    doneLegend: "पूरा", currentLegend: "अभी का कदम", finaleLegend: "अंतिम चरण", together: "साथ में",
    centerKicker: "दिल का केंद्र", revealScenario: "साझा दृश्य खोलें", backHome: "मुख्य पृष्ठ पर लौटें",
  },
  pt: {
    back: "Voltar", kicker: "CAMINHO DO AMOR", title: "Sete passos mais perto",
    intro: "Uma pessoa dá um passo por dia. Amanhã, é a vez da outra pessoa.",
    progress: count => `Passos concluídos: ${count} de 7`, boardTitle: "Seu caminho",
    start: "Começar", finaleUnlocked: "Etapa final liberada", openTask: "Abrir sua tarefa",
    makeMove: day => `Faça sua jogada · dia ${day}`, waitTomorrow: "Espere até amanhã",
    day: "DIA", choose: "Escolha uma tarefa", chooseHint: "A escolha registra a jogada de hoje. Amanhã é a vez do seu par.",
    action: "Sua tarefa", receive: "Mensagem para seu par", done: "Voltar ao caminho",
    pause: "Pausar por agora", pauseHint: "Seu progresso está salvo. Volte quando quiser.",
    finalTitle: "Encontro no centro", finalText: "Cada um escolhe a tarefa final separadamente. Quando as escolhas coincidem, o cenário compartilhado se abre.",
    chooseFor: "Escolhendo agora", me: "Eu", partner: "Par",
    mismatch: "As escolhas foram diferentes. Mude apenas a sua; a semana continua salva.",
    match: "As escolhas coincidiram. A etapa final está pronta.", chooseAgain: "Mudar minha escolha",
    scenario: "Seu cenário compartilhado", consent: "Vocês podem pausar ou mudar o plano a qualquer momento. O progresso fica salvo.",
    wait: "A jogada de hoje já foi feita. A outra pessoa poderá escolher amanhã.",
    pairRequired: "Conecte seu par no Touché antes de começar.",
    genericError: "Não foi possível carregar o jogo. Verifique a conexão e tente novamente.",
    waitingFinal: "Sua escolha está salva. A etapa final abre quando seu par escolher também.",
    moveTaken: "Jogada de hoje concluída", partnerPlayed: "Seu par já jogou", yourTurn: "Sua vez", partnersTurn: "Vez do seu par",
    boardAria: "Tabuleiro em forma de coração, do ponto inferior até o centro",
    doneLegend: "Concluído", currentLegend: "Etapa atual", finaleLegend: "Final", together: "juntos",
    centerKicker: "CENTRO DO CORAÇÃO", revealScenario: "Abrir cenário compartilhado", backHome: "Voltar ao início",
  },
  es: {
    back: "Volver", kicker: "CAMINO DEL AMOR", title: "Siete pasos más cerca",
    intro: "Una persona da un paso cada día. Mañana le toca a la otra.",
    progress: count => `Pasos completados: ${count} de 7`, boardTitle: "Su camino",
    start: "Empezar", finaleUnlocked: "Etapa final desbloqueada", openTask: "Abrir tu reto",
    makeMove: day => `Haz tu jugada · día ${day}`, waitTomorrow: "Espera hasta mañana",
    day: "DÍA", choose: "Elige un reto", chooseHint: "La elección registra la jugada de hoy. Mañana le toca a tu pareja.",
    action: "Tu reto", receive: "Mensaje para tu pareja", done: "Volver al camino",
    pause: "Pausar por ahora", pauseHint: "Tu progreso está guardado. Vuelve cuando quieras.",
    finalTitle: "Encuentro en el centro", finalText: "Cada persona elige el reto final por separado. Si coinciden, se abre la escena compartida.",
    chooseFor: "Elige ahora", me: "Yo", partner: "Pareja",
    mismatch: "Eligieron opciones distintas. Cambia solo tu elección; la semana sigue guardada.",
    match: "Coincidieron. El reto final está listo.", chooseAgain: "Cambiar mi elección",
    scenario: "Su escena compartida", consent: "Pueden parar o cambiar el plan en cualquier momento. El progreso se conserva.",
    wait: "La jugada de hoy ya está hecha. La otra persona podrá elegir mañana.",
    pairRequired: "Conecta a tu pareja en Touché antes de empezar.",
    genericError: "No se pudo cargar el juego. Comprueba la conexión e inténtalo de nuevo.",
    waitingFinal: "Tu elección está guardada. La etapa final se abre cuando tu pareja también elija.",
    moveTaken: "Jugada de hoy completada", partnerPlayed: "Tu pareja ya jugó", yourTurn: "Te toca", partnersTurn: "Le toca a tu pareja",
    boardAria: "Tablero con forma de corazón, desde la punta inferior hasta el centro",
    doneLegend: "Completado", currentLegend: "Paso actual", finaleLegend: "Final", together: "juntos",
    centerKicker: "CENTRO DEL CORAZÓN", revealScenario: "Abrir escena compartida", backHome: "Volver al inicio",
  },
};

type LocaleDay = {
  category: string; title: string; taskTitles: [string, string, string];
  action: string; receive: string;
};

const HI_DAYS: LocaleDay[] = [
  { category: "तारीफ़", title: "प्यार भरे शब्दों से शुरू करें", taskTitles: ["तीन सच्ची तारीफ़ें", "शाम के लिए एक नोट", "एक प्यारा वॉइस नोट"], action: "आज अपने साथी की एक खास बात बताएं जिसकी आप सचमुच कद्र करते हैं। संदेश, नोट या आवाज़ में कहें।", receive: "आज साथी आपके लिए एक निजी तारीफ़ भेजेगा। उसे पढ़ें या सुनें और बताएं कि कौन-सा शब्द आपके साथ रहा।" },
  { category: "कोमलता", title: "थोड़ी और परवाह", taskTitles: ["दस मिनट सिर्फ़ आपके", "कंधों की मालिश", "धीमा नृत्य"], action: "चुनी हुई गतिविधि के लिए कुछ मिनट रखें: बिना फ़ोन बात, कंधों की मालिश या धीमा नृत्य। पहले पूछें कि साथी सहज है।", receive: "आज साथी चुनी गतिविधि देगा—ध्यान, मालिश या नृत्य। अपनी पसंद बताएं और आराम से आगे बढ़ें।" },
  { category: "इच्छा", title: "मीठी प्रतीक्षा जगाएं", taskTitles: ["इशारे वाला संदेश", "शाम की मुलाक़ात", "एक निजी तारीफ़"], action: "हल्का फ़्लर्ट भरा संदेश, निजी तारीफ़ या शाम की मुलाक़ात का निमंत्रण भेजें। जवाब या मिलने का दबाव न रखें।", receive: "आज साथी एक संकेत, तारीफ़ या मुलाक़ात का निमंत्रण देगा। जो अच्छा लगे उसका जवाब दें और अपना समय खुद चुनें।" },
  { category: "जुनून", title: "शाम को खास बनाएं", taskTitles: ["ठहरता हुआ चुंबन", "दो लोगों का नृत्य", "नरम रोशनी में मालिश"], action: "चुना हुआ चुंबन, नृत्य या मालिश शुरू करने से पहले साथी की सहमति लें। बीच में रुककर पूछें कि आगे बढ़ना ठीक है।", receive: "आज साथी चुनी गतिविधि का निमंत्रण देगा। आप तय करें कि इसे जारी रखना है या यहीं रोकना है।" },
  { category: "जुनून", title: "छेड़ें और लुभाएं", taskTitles: ["रहस्य भरा सरप्राइज़", "धीमा चुंबन", "तीन छोटी इच्छाएँ"], action: "चुना हुआ सरप्राइज़ तैयार करें, धीमा चुंबन लें या तीन छोटी इच्छाएँ साझा करें। आगे का कदम साथ तय करें।", receive: "आज साथी चुना हुआ सरप्राइज़ देगा, चुंबन का निमंत्रण देगा या इच्छाएँ साझा करेगा। जारी रखना आपका चुनाव है।" },
  { category: "जुनून", title: "पल पर भरोसा करें", taskTitles: ["अपनी गति चुनें", "स्पर्शों का नक्शा", "बताएं क्या चाहते हैं"], action: "अपनी पसंद की गति, स्पर्श या इच्छा बताएं। अगला कदम लेने से पहले साथी की प्रतिक्रिया सुनें और सीमाएँ तय करें।", receive: "आज साथी अपनी गति या इच्छा साझा करेगा। जो ठीक लगे वही चुनें; अपना जवाब बदलना हमेशा ठीक है।" },
  { category: "जुनून", title: "केंद्र की ओर आख़िरी कदम", taskTitles: ["अंतिम शाम का निमंत्रण", "जगह तैयार करें", "दिल की बात कहें"], action: "खास शाम का निमंत्रण दें, जगह तैयार करें या बताएं कि इस हफ़्ते किस बात ने आपको करीब महसूस कराया।", receive: "आज साथी आपको खास शाम के लिए बुलाएगा। शुरुआत और आगे बढ़ना—दोनों का चुनाव आप साथ करेंगे।" },
];

const PT_DAYS: LocaleDay[] = [
  { category: "Elogios", title: "Comecem com palavras carinhosas", taskTitles: ["Três elogios sinceros", "Um bilhete para a noite", "Uma mensagem de voz"], action: "Hoje, conte uma qualidade específica do seu par que você realmente admira. Pode ser por mensagem, bilhete ou áudio.", receive: "Hoje, seu par vai preparar um elogio pessoal para você. Leia ou escute e conte qual palavra ficou na memória." },
  { category: "Carinho", title: "Acrescentem cuidado", taskTitles: ["Dez minutos de atenção", "Massagem nos ombros", "Uma dança lenta"], action: "Reservem alguns minutos para a atividade escolhida: conversa sem celular, massagem nos ombros ou dança lenta. Pergunte se está confortável.", receive: "Hoje, seu par vai propor atenção, massagem ou dança. Diga o que prefere e sigam num ritmo confortável." },
  { category: "Desejo", title: "Criem expectativa", taskTitles: ["Uma mensagem provocante", "Um convite para a noite", "Um elogio íntimo"], action: "Envie uma mensagem provocante, um elogio íntimo ou um convite para a noite. Sem cobrar resposta nem encontro.", receive: "Hoje, seu par vai enviar uma pista, um elogio ou um convite. Responda ao que gostar e escolha seu próprio ritmo." },
  { category: "Paixão", title: "Façam a noite especial", taskTitles: ["Um beijo demorado", "Uma dança a dois", "Massagem à luz suave"], action: "Antes do beijo, da dança ou da massagem, confirme se seu par quer participar. Façam uma pausa para decidir se continuam.", receive: "Hoje, seu par vai convidar você para a atividade escolhida. Você decide se querem continuar ou parar ali." },
  { category: "Paixão", title: "Provoquem e seduzam", taskTitles: ["Uma surpresa com mistério", "Um beijo sem pressa", "Três pequenos desejos"], action: "Prepare a surpresa escolhida, troquem um beijo lento ou compartilhem três pequenos desejos. Decidam juntos o próximo passo.", receive: "Hoje, seu par vai preparar uma surpresa, convidar para um beijo ou compartilhar desejos. Continuar ou parar é escolha sua." },
  { category: "Paixão", title: "Confiem no momento", taskTitles: ["Escolha o ritmo", "Mapa de toques", "Diga o que deseja"], action: "Conte qual ritmo, toque ou desejo combina com hoje. Escute a resposta do seu par e combinem limites antes de seguir.", receive: "Hoje, seu par vai compartilhar um ritmo ou desejo. Escolha o que faz sentido para você; mudar de ideia está sempre tudo bem." },
  { category: "Paixão", title: "Último passo até o centro", taskTitles: ["Um convite para o final", "Preparem o espaço", "Diga o que importa"], action: "Convide seu par para uma noite especial, preparem o espaço ou contem o que mais aproximou vocês nesta semana.", receive: "Hoje, seu par vai convidar você para um momento especial. Escolham juntos como começar e se querem continuar." },
];

const ES_DAYS: LocaleDay[] = [
  { category: "Cumplidos", title: "Empiecen con palabras cálidas", taskTitles: ["Tres cumplidos concretos", "Una nota para la noche", "Un mensaje de voz"], action: "Hoy, cuéntale a tu pareja una cualidad concreta que de verdad aprecias. Puedes hacerlo con un mensaje, una nota o un audio.", receive: "Hoy, tu pareja preparará un cumplido personal para ti. Léelo o escúchalo y cuéntale qué palabra se te quedó." },
  { category: "Ternura", title: "Añadan un poco de cuidado", taskTitles: ["Diez minutos de atención", "Masaje de hombros", "Un baile lento"], action: "Reservad unos minutos para la actividad elegida: conversar sin móviles, masajear los hombros o bailar despacio. Pregunta si está a gusto.", receive: "Hoy, tu pareja te propondrá atención, masaje o baile. Di qué prefieres y sigan a un ritmo cómodo." },
  { category: "Deseo", title: "Dejen que crezca la espera", taskTitles: ["Un mensaje con una pista", "Una invitación nocturna", "Un cumplido privado"], action: "Envía un mensaje coqueto, un cumplido privado o una invitación para la noche. Sin exigir respuesta ni una cita.", receive: "Hoy, tu pareja te enviará una pista, un cumplido o una invitación. Responde a lo que te guste y elige tu propio ritmo." },
  { category: "Pasión", title: "Hagan especial la noche", taskTitles: ["Un beso pausado", "Un baile para dos", "Masaje con luz suave"], action: "Antes del beso, el baile o el masaje, confirma que tu pareja quiere participar. Hagan una pausa para decidir si siguen.", receive: "Hoy, tu pareja te invitará a la actividad elegida. Tú decides si quieren continuar o dejarlo ahí." },
  { category: "Pasión", title: "Provoquen y seduzcan", taskTitles: ["Una sorpresa con intriga", "Un beso sin prisa", "Tres deseos pequeños"], action: "Prepara la sorpresa elegida, compartan un beso lento o cuenten tres deseos pequeños. Decidan juntos qué sigue.", receive: "Hoy, tu pareja preparará una sorpresa, invitará a un beso o compartirá deseos. Seguir o parar es decisión tuya." },
  { category: "Pasión", title: "Confíen en el momento", taskTitles: ["Elige el ritmo", "Mapa de caricias", "Di qué deseas"], action: "Cuenta qué ritmo, caricia o deseo te apetece hoy. Escucha la respuesta de tu pareja y acuerden límites antes de seguir.", receive: "Hoy, tu pareja compartirá un ritmo o deseo. Elige lo que te resulte bien; siempre puedes cambiar de opinión." },
  { category: "Pasión", title: "Último paso hacia el centro", taskTitles: ["Una invitación al final", "Preparen el espacio", "Di lo importante"], action: "Invita a tu pareja a una noche especial, preparen el espacio o cuenten qué les hizo sentir más cerca esta semana.", receive: "Hoy, tu pareja te invitará a un momento especial. Decidan juntos cómo empezar y si quieren continuar." },
];

function toDays(localeDays: LocaleDay[]): LovePathDay[] {
  return localeDays.map(day => ({
    category: day.category,
    title: day.title,
    tasks: day.taskTitles.map(title => ({ title, action: day.action, receive: day.receive })),
  }));
}

export const LOVE_PATH_TRANSLATED_DAYS: Partial<Record<Lang, LovePathDay[]>> = {
  hi: toDays(HI_DAYS),
  pt: toDays(PT_DAYS),
  es: toDays(ES_DAYS),
};

export const LOVE_PATH_TRANSLATED_FINALE: Partial<Record<Lang, LovePathFinale[]>> = {
  hi: [
    { title: "धीमा नृत्य", scenario: "एक गीत चुनें। थोड़ी दूरी से नाचना शुरू करें और तभी पास आएँ जब दोनों चाहें। अंत में बताएं कि कौन-सा पल याद रहेगा।" },
    { title: "आँखें बंद करके स्वाद पहचानें", scenario: "तीन सुरक्षित स्वाद चुनें और बारी-बारी से आँखें बंद करके पहचानें। हर नए स्वाद से पहले पूछें कि साथी तैयार है या नहीं।" },
    { title: "कहानी वाली डेट", scenario: "एक साथी दूसरे को काल्पनिक जगह पर डेट के लिए बुलाए। बारी-बारी से कहानी में नई बातें जोड़ें और अगला दृश्य चुनें।" },
  ],
  pt: [
    { title: "Uma dança lenta", scenario: "Escolham uma música. Comecem dançando com espaço e se aproximem apenas se os dois quiserem. Depois, contem qual momento vão guardar." },
    { title: "Degustação às cegas", scenario: "Separem três sabores seguros e tentem adivinhar de olhos fechados, alternando. Antes de cada sabor, confirmem se o outro quer continuar." },
    { title: "Um encontro inventado", scenario: "Uma pessoa convida a outra para um encontro num lugar imaginário. Alternem detalhes da história e escolham juntos a próxima cena." },
  ],
  es: [
    { title: "Un baile lento", scenario: "Elijan una canción. Empiecen a bailar con algo de distancia y acérquense solo si ambos quieren. Después, cuenten qué momento recordarán." },
    { title: "Cata a ciegas", scenario: "Preparen tres sabores seguros y túrnense para adivinarlos con los ojos cerrados. Antes de cada sabor, comprueben si la otra persona quiere seguir." },
    { title: "Una cita inventada", scenario: "Una persona invita a la otra a una cita en un lugar imaginario. Añadan detalles por turnos y elijan juntos qué ocurre después." },
  ],
};
