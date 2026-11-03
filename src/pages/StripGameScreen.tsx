import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { Lang } from "../data/i18n";
import useTelegramTopInset from "./useTelegramTopInset";
import "./StripGameScreen.css";
import "./StripGameScreenPremium.css";
import { StripCharacter, StripMiniGame } from "./StripGameVisuals";
import { STRIP_CLOTHES, applyStripOutcome, createMiniRound, validMiniRound, rpsOutcome, type MiniRound, type RpsChoice } from "./stripGameRules";

type PlayerIndex = 0 | 1;
type Phase = "playing" | "finished";
type Card = { id: string; category: string; task: string; criteria: string };
type Player = { layersRemoved: number; finalCompleted?: number };
type Session = {
  v: 1;
  phase: Phase;
  players: [Player, Player];
  turn: PlayerIndex;
  card: Card | null;
  used: Record<string, string[]>;
  winner: PlayerIndex | null;
  mini?: MiniRound | null;
};
type Props = { lang: Lang; onBack: () => void };

const STORAGE_KEY = "touche.strip.session.v1";
const LAYER_SETS = STRIP_CLOTHES;

const CARDS: Card[][] = [
  [
    { id: "l1-look", category: "Взгляд", task: "Посмотри партнёру в глаза с самым соблазняющим выражением и не улыбайся 15 секунд.", criteria: "Удержи взгляд 15 секунд, не улыбнувшись." },
    { id: "l1-tongue", category: "Скороговорка", task: "Трижды произнеси: «Карл у Клары украл кораллы, а Клара у Карла украла кларнет».", criteria: "Произнеси фразу три раза подряд без ошибки." },
    { id: "l1-rhyme", category: "Рифма за 10 секунд", task: "Назови три рифмы к слову «желание».", criteria: "Уложись в 10 секунд и назови три разных слова в рифму." },
    { id: "l1-animal", category: "Изобрази животное", task: "Покажи кота, который просит еду. Не засмейся.", criteria: "Изображай кота 15 секунд, не засмеявшись." },
    { id: "l1-dance", category: "Танец", task: "Станцуй медленный соблазняющий танец, глядя партнёру в глаза.", criteria: "Танцуй 20 секунд и не отводи взгляд." },
    { id: "l1-voice", category: "Интонация", task: "Попроси партнёра сказать любую фразу и повтори её голосом влюблённого человека.", criteria: "Повтори фразу целиком с выбранной интонацией, не рассмеявшись." },
    { id: "l1-language", category: "Другие языки", task: "Придумай несколько фраз на выдуманном языке и произноси их с серьёзным видом.", criteria: "Говори 15 секунд, не засмеявшись." },
    { id: "l1-mirror", category: "Зеркало", task: "Повторяй движения и выражение лица партнёра с задержкой в три секунды.", criteria: "Не сбейся в течение 20 секунд." },
    { id: "l1-martial-arts", category: "Боевое искусство", task: "Изобрази боксёра на ринге и покажи серию из пяти ударов в воздух.", criteria: "Покажи ровно пять ударов, не засмеявшись." },
  ],
  [
    { id: "l2-balance", category: "Спорт", task: "Постой на одной ноге, пока партнёр медленно считает до двадцати.", criteria: "Удержи равновесие все 20 секунд, не касаясь второй ногой пола." },
    { id: "l2-story", category: "История по буквам", task: "Расскажи о вашем первом свидании в двух предложениях. Второе начни с последней буквы первого.", criteria: "Скажи ровно два связанных предложения; второе начинается на нужную букву." },
    { id: "l2-phone", category: "Телефонные трюки", task: "Набери носом сообщение «Я скучаю по тебе» и покажи его партнёру.", criteria: "Сообщение должно читаться без исправлений." },
    { id: "l2-number", category: "Угадай число", task: "Приложение загадало число от 1 до 10. Назови одну догадку вслух и открой изображение.", criteria: "Совпадение с ответом приложения — выполнено; другой ответ — провал." },
    { id: "l2-rps", category: "Угадай предмет", task: "Приложение спрятало камень, ножницы или лист бумаги. Назови один вариант вслух, затем открой картинку.", criteria: "Угадай предмет приложения. Это угадывание, а не поединок с партнёром." },
    { id: "l2-squat", category: "Спорт", task: "Сделай десять приседаний подряд в комфортном темпе.", criteria: "Выполни 10 приседаний без паузы." },
    { id: "l2-memory", category: "История по буквам", task: "Расскажи в двух предложениях о вашем самом смешном общем моменте. Второе предложение начни с последней буквы первого.", criteria: "Скажи два предложения и начни второе с правильной буквы." },
    { id: "l2-whisper", category: "Телефонные трюки", task: "Запиши короткое голосовое сообщение шёпотом: «Я хочу провести этот вечер рядом с тобой».", criteria: "Отправь партнёру голосовое, в котором слышна вся фраза." },
  ],
  [
    { id: "l3-pose", category: "Изобрази позу", task: "Прими выразительную позу, в которой ты чувствуешь себя особенно привлекательным или привлекательной.", criteria: "Удерживай позу 20 секунд, не смеясь." },
    { id: "l3-selfie", category: "Селфи с намёком", task: "Сделай селфи с пальцем у губ, томным взглядом и приоткрытым ртом. Отправь партнёру.", criteria: "Сделай кадр с указанными жестом и выражением лица и отправь его партнёру." },
    { id: "l3-message", category: "Эротичное сообщение", task: "Напиши партнёру три предложения о том, чего тебе хочется от вашего сегодняшнего вечера — чувственно, без спешки.", criteria: "Сообщение состоит ровно из трёх законченных предложений и показано партнёру." },
    { id: "l3-guess", category: "Угадай часть тела", task: "Приложение выбрало часть тела. Назови одну догадку вслух, затем открой размытую картинку.", criteria: "Названная часть тела должна совпасть с ответом приложения." },
    { id: "l3-compliment", category: "Комплимент", task: "Скажи партнёру, что именно в его или её взгляде, голосе или руках кажется тебе особенно привлекательным.", criteria: "Скажи один конкретный комплимент, глядя партнёру в глаза, не рассмеявшись." },
    { id: "l3-anticipation", category: "Намёк", task: "Напиши партнёру три предложения о том, чего хочешь сегодня вечером.", criteria: "Напиши ровно три законченных предложения и покажи сообщение партнёру." },
    { id: "l3-breath", category: "Комплимент", task: "Глядя партнёру в глаза, скажи, что именно в его или её теле тебе нравится.", criteria: "Назови одну конкретную часть тела и скажи о ней один законченный комплимент." },
    { id: "l3-oral-hint", category: "Эротичное селфи", task: "Сделай селфи с намёком на оральный поцелуй: язык, губы и взгляд в камеру. Отправь партнёру.", criteria: "Сделай один кадр с указанными выражением лица и взглядом и отправь его партнёру." },
    { id: "l3-eye-compliment", category: "Эротичный комплимент", task: "Скажи партнёру одним предложением, что хочешь с ним или с ней сделать.", criteria: "Скажи одно законченное предложение, глядя партнёру в глаза." },
  ],
  [
    { id: "l4-photo", category: "Эротичное фото в позе", task: "Сделай эротичное фото в позе лёжа на боку, с намёком. Отправь партнёру.", criteria: "Сделай и отправь один кадр в указанной позе." },
    { id: "l4-video", category: "Эротичное видео", task: "Запиши видео на пять секунд: медленно проведи рукой по телу и задержи взгляд в камере. Отправь партнёру.", criteria: "Отправь партнёру непрерывное видео длительностью пять секунд." },
    { id: "l4-dance", category: "Эротичный танец", task: "Станцуй перед партнёром одну минуту, будто раздеваешься, но не снимай одежду.", criteria: "Танцуй ровно одну минуту, не снимая одежду." },
    { id: "l4-pose", category: "Угадай позу", task: "Партнёр без слов показывает позу из трёх вариантов: сидя, стоя у стены или лёжа на боку. Угадай вариант.", criteria: "Назови позу правильно с первой попытки." },
    { id: "l4-sensory", category: "Эротичное фото", task: "Сделай фото стоя у стены в чувственной позе и отправь партнёру.", criteria: "Сделай и отправь один кадр стоя у стены." },
    { id: "l4-whisper", category: "Эротичный танец", task: "Станцуй сидя одну минуту, используя только корпус и руки.", criteria: "Продолжай танцевать одну минуту, не вставая." },
    { id: "l4-video-top", category: "Эротичное видео", task: "Запиши видео на пять секунд, медленно снимая или приспуская верх одежды. Отправь партнёру.", criteria: "Отправь партнёру непрерывное видео длительностью пять секунд с указанным действием." },
    { id: "l4-pose-wall", category: "Угадай позу", task: "Партнёр показывает одну из поз: сидя, стоя у стены или лёжа на боку. Угадай с первой попытки.", criteria: "Назови правильно одну из трёх поз с первой попытки." },
  ],
  [
    { id: "l5-touch", category: "Эротичное действие", task: "Прижмись сосками к губам партнёра и оставайся так 10 секунд.", criteria: "Удерживай положение 10 секунд." },
    { id: "l5-nipple", category: "Эротичное действие", task: "Оближи пальцы и води ими по своим ореолам сосков 20 секунд.", criteria: "Продолжай действие 20 секунд." },
    { id: "l5-photo", category: "Эротичное фото", task: "Сделай эротичное фото груди без лица и отправь партнёру.", criteria: "Сделай кадр без лица и отправь его партнёру." },
    { id: "l5-words", category: "Грязные вещи шёпотом", task: "Шёпотом скажи партнёру у уха три пошлые фразы о том, что хочешь сделать сегодня.", criteria: "Произнеси три законченные фразы шёпотом; оценивать их тон не нужно." },
    { id: "l5-video", category: "Эротичное видео", task: "Запиши видео на 5–10 секунд с рукой под бельём и отправь партнёру.", criteria: "Отправь один непрерывный ролик длительностью от пяти до десяти секунд." },
    { id: "l5-underwear", category: "Эротичное действие", task: "Положи руку на свои трусы и нежно поглаживай 20 секунд.", criteria: "Продолжай действие 20 секунд." },
    { id: "l5-wish", category: "Эротичное действие", task: "Запусти руку себе под трусы и погладь себя 20 секунд.", criteria: "Продолжай действие 20 секунд." },
    { id: "l5-hand", category: "Эротичное действие", task: "Возьми руку партнёра, положи её себе на грудь и веди ею, массируя грудь 20 секунд.", criteria: "Продолжай действие 20 секунд." },
    { id: "l5-hips-photo", category: "Эротичное фото", task: "Сделай эротичное фото спины или ягодиц с намёком и отправь партнёру.", criteria: "Сделай и отправь один кадр спины или ягодиц." },
    { id: "l5-video-legs", category: "Эротичное видео", task: "Запиши видео на 5–10 секунд с раздвинутыми ногами в белье и отправь партнёру.", criteria: "Отправь один непрерывный ролик длительностью от пяти до десяти секунд." },
  ],
];

const FINAL_CARD: Card = {
  id: "l5-rps", category: "Финальный поединок с приложением",
  task: "Пять заданий на последнем уровне выполнены. Теперь сыграй с приложением в камень, ножницы, бумагу.",
  criteria: "Ничья — переиграй без штрафа. Победа — одежда остаётся, ход переходит партнёру. Поражение — снимается последний слой, игра заканчивается.",
};

type Copy = {
  back: string; title: string; subtitle: string; kicker: string; playKicker: string; start: string;
  rulesTitle: string; rules: string[]; age: string; firstTurn: string; woman: string; man: string;
  chooseFirst: string; startGame: string; restart: string; restartConfirm: string; confirm: string; cancel: string;
  turn: string; level: string; draw: string; card: string; criteria: string; completed: string; failed: string;
  layers: string; removed: string; left: string; nextLayer: string; removeLayer: string;
  winner: string; loser: string; wish: string; finishNote: string;
  newGame: string; toGames: string; russianNote: string; layerChanged: string;
};

const COPY: Record<Lang, Copy> = {
  ru: {
    back: "Назад к играм", title: "Стрип или действие", subtitle: "Игра для двоих на одном телефоне",
    kicker: "ИГРА ДЛЯ ДВОИХ · ОДИН ТЕЛЕФОН", playKicker: "18+ · TOUCHÉ",
    start: "Начать игру",
    rulesTitle: "Как играть", rules: ["Ходите по очереди и тяните карту своего уровня.", "Выполнено — одежда остаётся, ход переходит партнёру.", "Провал — снимается следующий слой, уровень растёт, ход переходит.", "Пропустить карту нельзя. Слои снимаются только с себя и строго по порядку."],
    age: "Только для взрослых 18+.",
    firstTurn: "Кто ходит первым?", woman: "Женщина", man: "Мужчина", chooseFirst: "Выберите первого игрока",
    startGame: "Начать раунд", restart: "Начать заново", restartConfirm: "Сбросить сохранённую игру и начать заново?",
    confirm: "Сбросить игру", cancel: "Оставить игру", turn: "Ваш ход", level: "Уровень", draw: "Тянуть карту",
    card: "Задание", criteria: "Критерий выполнения", completed: "Выполнил", failed: "Провалил",
    layers: "Слои", removed: "снято", left: "осталось", nextLayer: "Следующий слой", removeLayer: "снять слой",
    winner: "Победитель", loser: "Проигравший",
    wish: "Победитель сразу загадывает желание. Проигравший его выполняет.",
    finishNote: "Игра завершена.",
    newGame: "Новая игра", toGames: "К играм", russianNote: "Карточки и задания остаются на русском языке.",
    layerChanged: "Снят слой: {layer}. Теперь ход партнёра.",
  },
  en: {
    back: "Back to games", title: "Стрип или действие", subtitle: "A two-player game for one phone",
    kicker: "A TWO-PLAYER GAME · ONE PHONE", playKicker: "18+ · TOUCHÉ",
    start: "Start game",
    rulesTitle: "How to play", rules: ["Take turns drawing a card for your current level.", "Complete it: your clothes stay on and the turn passes.", "Fail it: remove your next layer, advance a level, and pass the turn.", "There is no skip. Remove only your own layers, in order."],
    age: "For adults 18+ only.",
    firstTurn: "Who goes first?", woman: "Woman", man: "Man", chooseFirst: "Choose the first player",
    startGame: "Start round", restart: "Start over", restartConfirm: "Reset the saved game and start over?",
    confirm: "Reset game", cancel: "Keep game", turn: "Your turn", level: "Level", draw: "Draw a card",
    card: "Challenge", criteria: "Completion criteria", completed: "Completed", failed: "Failed",
    layers: "Layers", removed: "removed", left: "left", nextLayer: "Next layer", removeLayer: "remove one layer",
    winner: "Winner", loser: "Lost",
    wish: "The winner makes a wish right away. The loser carries it out.",
    finishNote: "The game is over.",
    newGame: "New game", toGames: "Back to games", russianNote: "Cards and challenges remain in Russian.",
    layerChanged: "Removed: {layer}. The other player is up.",
  },
  hi: {
    back: "खेलों पर वापस", title: "Стрип или действие", subtitle: "एक फ़ोन पर दो लोगों का खेल",
    kicker: "दो लोगों का खेल · एक फ़ोन", playKicker: "18+ · TOUCHÉ",
    start: "खेल शुरू करें",
    rulesTitle: "कैसे खेलें", rules: ["बारी-बारी से अपने स्तर का कार्ड लें।", "पूरा करने पर कपड़े वैसे ही रहते हैं और बारी साथी की होती है।", "असफल होने पर अपनी अगली परत हटाएँ, स्तर बढ़ाएँ और बारी साथी को दें।", "कोई कार्ड छोड़ा नहीं जा सकता। अपनी परतें क्रम से हटाएँ।"],
    age: "केवल 18+ वयस्कों के लिए।",
    firstTurn: "पहली बारी किसकी?", woman: "महिला", man: "पुरुष", chooseFirst: "पहला खिलाड़ी चुनें",
    startGame: "राउंड शुरू करें", restart: "फिर से शुरू करें", restartConfirm: "सहेजा खेल रीसेट करके फिर शुरू करें?",
    confirm: "खेल रीसेट करें", cancel: "खेल रहने दें", turn: "आपकी बारी", level: "स्तर", draw: "कार्ड लें",
    card: "चुनौती", criteria: "पूरा करने का मानदंड", completed: "पूरा हुआ", failed: "असफल",
    layers: "परतें", removed: "हटीं", left: "बाकी", nextLayer: "अगली परत", removeLayer: "एक परत हटाएँ",
    winner: "विजेता", loser: "हारे",
    wish: "विजेता तुरंत एक इच्छा बताएगा। हारने वाला उसे पूरा करेगा।",
    finishNote: "खेल समाप्त हुआ।",
    newGame: "नया खेल", toGames: "खेलों पर वापस", russianNote: "कार्ड और चुनौतियाँ रूसी में ही रहेंगी।",
    layerChanged: "परत हटी: {layer}। अब साथी की बारी है।",
  },
  pt: {
    back: "Voltar aos jogos", title: "Стрип или действие", subtitle: "Um jogo para dois em um só celular",
    kicker: "JOGO PARA DOIS · UM CELULAR", playKicker: "18+ · TOUCHÉ",
    start: "Começar jogo",
    rulesTitle: "Como jogar", rules: ["Alternem as jogadas e tirem uma carta do nível atual.", "Cumpriu: as roupas ficam e a vez passa para a outra pessoa.", "Falhou: retire a próxima camada, avance um nível e passe a vez.", "Não é possível pular. Retire apenas suas próprias camadas, na ordem."],
    age: "Somente para adultos 18+.",
    firstTurn: "Quem começa?", woman: "Mulher", man: "Homem", chooseFirst: "Escolha quem começa",
    startGame: "Começar rodada", restart: "Recomeçar", restartConfirm: "Apagar o jogo salvo e recomeçar?",
    confirm: "Reiniciar jogo", cancel: "Manter jogo", turn: "Sua vez", level: "Nível", draw: "Tirar uma carta",
    card: "Desafio", criteria: "Critério de conclusão", completed: "Cumprido", failed: "Falhei",
    layers: "Camadas", removed: "removidas", left: "restantes", nextLayer: "Próxima camada", removeLayer: "remover uma camada",
    winner: "Vencedor", loser: "Perdeu",
    wish: "O vencedor faz um pedido imediatamente. Quem perdeu o realiza.",
    finishNote: "O jogo terminou.",
    newGame: "Novo jogo", toGames: "Voltar aos jogos", russianNote: "As cartas e os desafios continuam em russo.",
    layerChanged: "Camada removida: {layer}. Agora é a vez da outra pessoa.",
  },
  es: {
    back: "Volver a juegos", title: "Стрип или действие", subtitle: "Un juego para dos en un solo móvil",
    kicker: "JUEGO PARA DOS · UN MÓVIL", playKicker: "18+ · TOUCHÉ",
    start: "Empezar juego",
    rulesTitle: "Cómo jugar", rules: ["Tomen turnos y saquen una carta de su nivel actual.", "Completada: la ropa se queda y el turno pasa a la otra persona.", "Fallida: quítate la siguiente capa, sube un nivel y pasa el turno.", "No se puede saltar. Cada persona se quita sus propias capas, en orden."],
    age: "Solo para adultos 18+.",
    firstTurn: "¿Quién empieza?", woman: "Mujer", man: "Hombre", chooseFirst: "Elijan quién empieza",
    startGame: "Empezar ronda", restart: "Empezar de nuevo", restartConfirm: "¿Borrar la partida guardada y empezar de nuevo?",
    confirm: "Reiniciar juego", cancel: "Conservar partida", turn: "Tu turno", level: "Nivel", draw: "Sacar una carta",
    card: "Reto", criteria: "Criterio para completarlo", completed: "Completado", failed: "Fallé",
    layers: "Capas", removed: "quitadas", left: "restantes", nextLayer: "Siguiente capa", removeLayer: "quitar una capa",
    winner: "Ganador", loser: "Perdió",
    wish: "Quien gana pide un deseo en el acto. Quien pierde lo cumple.",
    finishNote: "La partida ha terminado.",
    newGame: "Nueva partida", toGames: "Volver a juegos", russianNote: "Las cartas y los retos siguen en ruso.",
    layerChanged: "Capa quitada: {layer}. Le toca a la otra persona.",
  },
};

function createSession(first: PlayerIndex): Session {
  return { v: 1, phase: "playing", players: [{ layersRemoved: 0 }, { layersRemoved: 0 }], turn: first, card: null, used: {}, winner: null };
}

function isCard(value: unknown): value is Card {
  return !!value && typeof value === "object" && typeof (value as Card).id === "string" &&
    typeof (value as Card).category === "string" && typeof (value as Card).task === "string" &&
    typeof (value as Card).criteria === "string";
}

function loadSession(): Session | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<Session>;
    if (value.v !== 1 || (value.phase !== "playing" && value.phase !== "finished") ||
      !Array.isArray(value.players) || value.players.length !== 2 ||
      !value.players.every(p => p && Number.isInteger(p.layersRemoved) && p.layersRemoved >= 0 && p.layersRemoved <= 5) ||
      (value.turn !== 0 && value.turn !== 1) || !value.used || typeof value.used !== "object" ||
      (value.card !== null && value.card !== undefined && !isCard(value.card)) ||
      (value.winner !== null && value.winner !== 0 && value.winner !== 1) ||
      (value.phase === "finished" && (value.winner === null || !value.players.some(p => p.layersRemoved === 5))) ||
      (value.phase === "playing" && (value.winner !== null || value.players.some(p => p.layersRemoved === 5)))) return null;
    const players = value.players.map(p => ({
      layersRemoved: p.layersRemoved,
      finalCompleted: Number.isInteger(p.finalCompleted) && (p.finalCompleted ?? 0) >= 0 && (p.finalCompleted ?? 0) <= 5 ? p.finalCompleted : 0,
    })) as [Player, Player];
    const ready = players[value.turn].layersRemoved === 4 && (players[value.turn].finalCompleted ?? 0) >= 5;
    let card = value.card ? CARDS.flat().find(item => item.id === value.card?.id) ?? value.card : null;
    if (ready) card = FINAL_CARD;
    else if (card?.id === "l5-rps") card = null;
    const mini = card ? validMiniRound(value.mini, card.id) ? value.mini : createMiniRound(card.id) : null;
    return {
      v: 1, phase: value.phase, players, turn: value.turn, mini,
      card, used: value.used as Record<string, string[]>, winner: value.winner ?? null,
    };
  } catch {
    return null;
  }
}

function saveSession(session: Session | null) {
  try {
    if (session) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch { /* The current game remains playable in memory if storage is unavailable. */ }
}

function BackIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 18 9 12l6-6" /></svg>;
}

export function DollArt({ player, removed }: { player: PlayerIndex; removed: number }) {
  const woman = player === 0;
  const key = woman ? "her" : "him";
  const hairFill = `url(#doll-${key}-hair)`;
  const skinFill = `url(#doll-${key}-skin)`;
  const outerFill = `url(#doll-${key}-outer)`;
  const bottomFill = `url(#doll-${key}-bottom)`;
  const baseFill = `url(#doll-${key}-base)`;
  const underFill = `url(#doll-${key}-under)`;
  return (
    <svg
      className={`strip-premium__doll strip-premium__figure-${woman ? "woman" : "man"}`}
      viewBox="0 0 180 370"
      role="img"
      aria-label={woman ? "Взрослая кукла в женском образе" : "Взрослая кукла в мужском образе"}
    >
      <defs>
        <linearGradient id={`doll-${key}-skin`} x1="0" x2="1" y1="0" y2="1">
          <stop stopColor={woman ? "#f7dcc7" : "#efc8aa"} />
          <stop offset=".58" stopColor={woman ? "#e9b49b" : "#d99b7d"} />
          <stop offset="1" stopColor={woman ? "#d58d7b" : "#bd795f"} />
        </linearGradient>
        <linearGradient id={`doll-${key}-hair`} x1=".08" x2=".92" y1="0" y2="1">
          <stop stopColor={woman ? "#4b1e3c" : "#252037"} />
          <stop offset=".48" stopColor={woman ? "#9e4b70" : "#5e5069"} />
          <stop offset="1" stopColor={woman ? "#3c1b37" : "#211b2c"} />
        </linearGradient>
        <linearGradient id={`doll-${key}-outer`} x1="0" x2="1" y1="0" y2="1">
          <stop stopColor={woman ? "#e67f92" : "#7e9ca0"} />
          <stop offset="1" stopColor={woman ? "#8b2e59" : "#3e5265"} />
        </linearGradient>
        <linearGradient id={`doll-${key}-bottom`} x1="0" x2=".2" y1="0" y2="1">
          <stop stopColor={woman ? "#e6b273" : "#846078"} />
          <stop offset="1" stopColor={woman ? "#b46d4f" : "#493349"} />
        </linearGradient>
        <linearGradient id={`doll-${key}-base`} x1="0" x2="1" y1="0" y2="1">
          <stop stopColor={woman ? "#f4c8c3" : "#e8ddd6"} />
          <stop offset="1" stopColor={woman ? "#df9ca5" : "#cfc5c4"} />
        </linearGradient>
        <linearGradient id={`doll-${key}-under`} x1="0" x2="1" y1="0" y2="1">
          <stop stopColor={woman ? "#ac4168" : "#596979"} />
          <stop offset="1" stopColor={woman ? "#7b294e" : "#344755"} />
        </linearGradient>
        <filter id={`doll-${key}-shadow`} x="-30%" y="-20%" width="160%" height="150%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
      </defs>
      <ellipse cx="90" cy="355" rx="43" ry="7" fill="#582d48" opacity=".15" filter={`url(#doll-${key}-shadow)`} />

      {/* Sculpted hair sits behind the articulated fashion-doll body. */}
      {woman ? (
        <path className="strip-premium__hair-back" fill={hairFill} d="M48 69C38 30 55 8 88 9c37 1 54 24 47 69l10 93-20 9-13-92H62l-10 91-21-11z" />
      ) : (
        <path className="strip-premium__hair-back" fill={hairFill} d="M49 60C46 25 63 9 91 9c31 0 45 18 39 52-12-11-25-16-40-15-15 1-28 6-41 14z" />
      )}

      {/* Long legs and articulated arms remain modestly covered by an opaque base suit. */}
      <path className="strip-premium__skin" style={{ fill: skinFill }} d="M76 198 68 329l14 2 9-93 10 93 14-2-8-131z" />
      <path className="strip-premium__skin" style={{ fill: "none", stroke: skinFill }} d="M67 119 48 184l9 6 26-50m31-21 19 65-9 6-26-49" strokeWidth="15" strokeLinecap="round" />
      <path className="strip-premium__joints" d="M48 178a7 7 0 1 0 0 14 7 7 0 0 0 0-14zm82 0a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM76 274a6 6 0 1 0 0 12 6 6 0 0 0 0-12zm28 0a6 6 0 1 0 0 12 6 6 0 0 0 0-12z" />
      <path className="strip-premium__bodysuit" d="M70 111q20-11 40 0l13 80-14 15H71l-14-15zM68 198h44l7 47-29 13-29-13z" />
      <path className="strip-premium__skin" style={{ fill: skinFill }} d="M73 326q10-4 19 0l3 15H67zm18 0q10-4 19 0l4 15H88z" />

      {/* Layer four: the inner top remains after the outer top comes off. */}
      <path className="strip-premium__garment strip-premium__garment--base" fill={baseFill} data-gone={removed >= 4} d="M70 117q20 12 40 0l6 31q-26 13-52 0z" />
      {woman && <path className="strip-premium__stitch" d="M79 122q11 8 22 0m-24 20q13 6 26 0" />}
      {!woman && <path className="strip-premium__stitch" d="m82 119 8 11 8-11m-10 11v14" />}

      {/* The final underwear layer sits beneath the skirt or trousers. */}
      <path className="strip-premium__garment strip-premium__garment--under" fill={underFill} data-gone={removed >= 5} d="M68 239q22 10 44 0l-3 19q-19 10-38 0z" />
      <path className="strip-premium__stitch" d="M79 244q11 7 22 0" />

      {/* Layer two: statement jacket / blouse. */}
      <path className="strip-premium__garment strip-premium__garment--outer" fill={outerFill} data-gone={removed >= 2} d="M68 111q22-13 44 0l17 65-15 8-16-38-1 40H83l-1-40-15 38-15-8z" />
      <path className="strip-premium__garment strip-premium__garment--outer" fill={outerFill} data-gone={removed >= 2} d="m68 113-15 65 12 6 15-37zm44-2 17 67-12 6-15-37z" />
      <path className="strip-premium__stitch" d="m90 116 0 55m-18-43-6 30m42-30 6 30" />
      <circle cx="96" cy="143" r="2" fill="#f7d89a" />
      <circle cx="96" cy="155" r="2" fill="#f7d89a" />

      {/* Layer three: skirt or tailored trousers. */}
      {woman ? (
          <path className="strip-premium__garment strip-premium__garment--bottom" fill={bottomFill} data-gone={removed >= 3} d="M61 190h58l-8 53q-20 12-42 0z" />
      ) : (
        <>
          <path className="strip-premium__garment strip-premium__garment--bottom" fill={bottomFill} data-gone={removed >= 3} d="M61 190h58l-7 53-20 3-3-38-4 38-21-3z" />
          <path className="strip-premium__stitch" d="m90 197 0 48m-19-43 4 34m34-34-4 34" />
        </>
      )}
      {woman && <path className="strip-premium__stitch" d="M67 202q23 8 46 0m-44 25q21 7 42 0" />}

      {/* Layer one: socks and miniature shoes disappear first. */}
      <path className="strip-premium__sock" fill={woman ? "#8f345c" : "#3e354d"} data-gone={removed >= 1} d="M67 326h18l-1 15H62q0-8 5-15zm30 0h18l8 15H98z" />

      {/* Head, painted eyes and glossy details. */}
      <path className="strip-premium__skin" style={{ fill: skinFill }} d="M79 91h22v25H79z" />
      <ellipse className="strip-premium__skin" style={{ fill: skinFill }} cx="90" cy="59" rx="29" ry="36" />
      <path className="strip-premium__hair-front" style={{ fill: hairFill }} d={woman ? "M61 48Q65 12 95 17q23 4 31 29-16-7-27-20-12 15-38 22z" : "M61 45Q65 10 95 16q19 4 27 20-18-6-30-2-14 1-31 11z"} />
      <path className="strip-premium__face-detail" d="M69 52q7-5 14-1m15 0q7-4 14 1" />
      <ellipse className="strip-premium__eye" cx="77" cy="57" rx="2.5" ry="3" />
      <ellipse className="strip-premium__eye" cx="105" cy="57" rx="2.5" ry="3" />
      <circle cx="77.7" cy="56" r=".8" fill="#fff9f3" /><circle cx="105.7" cy="56" r=".8" fill="#fff9f3" />
      <path className="strip-premium__blush" d="M66 69q9-5 17 0-7 8-15 4zm22-1q9-5 17 0-7 8-15 4z" />
      <path d="M85 72q5 3 10 0" fill="none" stroke="#9f4965" strokeWidth="2" strokeLinecap="round" />
      <path className="strip-premium__hair-shine" d={woman ? "M54 49q4-26 23-34m48 61 4 37" : "M63 34q8-19 25-20"} />
      {woman && <><circle className="strip-premium__earring" cx="61" cy="73" r="3" /><circle className="strip-premium__earring" cx="119" cy="73" r="3" /></>}
    </svg>
  );
}

function PlayerFigure({ player, removed, active, copy, fromStage }: { player: PlayerIndex; removed: number; active: boolean; copy: Copy; fromStage?: number }) {
  const name = player === 0 ? copy.woman : copy.man;
  const layers = LAYER_SETS[player];
  const nextLayer = layers[removed];
  return (
    <article className="strip-player" data-active={active} data-testid={`card-strip-player-${player}`}>
      <div className="strip-player__figure"><StripCharacter player={player} stage={removed} fromStage={fromStage} /></div>
      <div className="strip-player__heading">
        <strong>{name}</strong>
        <span>{removed} / 5 {copy.removed}</span>
      </div>
      <div className="strip-player__level" aria-label={`${copy.level} ${Math.min(removed + 1, 5)}`}>
        <span>{copy.level}</span><b>{Math.min(removed + 1, 5)}</b>
      </div>
      <div className="strip-premium__progress" role="img" aria-label={`${copy.layers}: ${removed} ${copy.removed} / 5`}>
        {layers.map((layer, index) => <span key={layer} data-removed={index < removed} />)}
      </div>
      <p className="strip-premium__next">
        {nextLayer ? <>{copy.nextLayer}: <strong>{nextLayer}</strong></> : copy.removed}
      </p>
      <ol className="strip-premium__sr-only">
        {layers.map((layer, index) => <li key={layer} aria-current={index === removed ? "step" : undefined}>{layer}</li>)}
      </ol>
    </article>
  );
}

export default function StripGameScreen({ lang, onBack }: Props) {
  const top = useTelegramTopInset();
  const copy = COPY[lang];
  const [session, setSession] = useState<Session | null>(() => loadSession());
  const [first, setFirst] = useState<PlayerIndex>(0);
  const [confirming, setConfirming] = useState(false);
  const [lastResult, setLastResult] = useState("");
  const [removal, setRemoval] = useState<{ player: PlayerIndex; from: number } | null>(null);
  const challengeHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const currentLevel = session ? Math.min(session.players[session.turn].layersRemoved, 4) : 0;
  const levelCards = useMemo(() => session ? CARDS[currentLevel].filter(card => card.id !== "l5-rps") : [], [session, currentLevel]);

  useEffect(() => { saveSession(session); }, [session]);
  useEffect(() => {
    if (!session?.card) return;
    const frame = window.requestAnimationFrame(() => challengeHeadingRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [session?.card?.id]);

  const playerNames = [copy.woman, copy.man] as const;
  const startGame = () => {
    setRemoval(null);
    setSession(createSession(first));
    setConfirming(false);
    setLastResult("");
  };
  const drawCard = () => {
    if (!session || session.card || session.phase !== "playing") return;
    setRemoval(null);
    if (currentLevel === 4 && (session.players[session.turn].finalCompleted ?? 0) >= 5) {
      setSession({ ...session, card: FINAL_CARD, mini: createMiniRound(FINAL_CARD.id) });
      return;
    }
    const key = String(currentLevel);
    const alreadyUsed = session.used[key] ?? [];
    const available = levelCards.filter(card => !alreadyUsed.includes(card.id));
    const pool = available.length ? available : levelCards;
    const card = pool[Math.floor(Math.random() * pool.length)];
    const used = { ...session.used, [key]: available.length ? [...alreadyUsed, card.id] : [card.id] };
    setSession({ ...session, card, used, mini: createMiniRound(card.id) });
    setLastResult("");
  };
  const resolveTurn = (completed: boolean) => {
    if (!session || !session.card || session.phase !== "playing") return;
    if (session.mini && !session.mini.revealed) return;
    const final = session.card.id === FINAL_CARD.id;
    if (final) {
      if (!session.mini?.choice || !session.mini.revealed) return;
      const outcome = rpsOutcome(session.mini.choice, session.mini.target as RpsChoice);
      if (outcome === "tie" || completed !== (outcome === "win")) return;
    }
    const current = session.turn;
    if (!completed) setRemoval({ player: current, from: session.players[current].layersRemoved });
    const removedLayer = LAYER_SETS[current][session.players[current].layersRemoved];
    const next = applyStripOutcome(session.players, current, completed, final);
    setSession({
      ...session, players: next.players, turn: next.turn,
      card: next.needsFinal ? FINAL_CARD : null,
      mini: next.needsFinal ? createMiniRound(FINAL_CARD.id) : null,
      phase: next.finished ? "finished" : "playing", winner: next.winner,
    });
    setLastResult(next.finished ? "" : completed ? copy.completed : copy.layerChanged.replace("{layer}", removedLayer));
  };
  const restart = () => {
    setRemoval(null);
    saveSession(null);
    setSession(null);
    setConfirming(false);
    setLastResult("");
  };

  const header = (
    <header className="strip__header">
      <button type="button" className="strip__back" onClick={onBack} aria-label={copy.back} data-testid="button-strip-back">
        <BackIcon />
      </button>
      <span className="strip__brand">Touch<em>é</em></span>
      <span />
    </header>
  );

  let body;
  if (!session) {
    body = (
      <section className="strip__intro strip-enter">
        <span className="strip__eyebrow">18+ <i /> TOUCHÉ</span>
        <span className="strip__sequence" aria-hidden="true">03 / 03</span>
        <p className="strip__kicker">{copy.kicker}</p>
        <h1 tabIndex={-1} data-testid="text-strip-title">{copy.title}</h1>
        <p className="strip__lead">{copy.subtitle}</p>
        <div className="strip-premium__intro-stage" aria-hidden="true">
          {[0, 1].map(index => (
            <div className="strip-premium__intro-doll" key={index}>
              <StripCharacter player={index as PlayerIndex} stage={0} />
            </div>
          ))}
        </div>
        <details className="strip-premium__rules">
          <summary>{copy.rulesTitle}</summary>
          <ol className="strip__rules">{copy.rules.map((rule, index) => <li key={rule}><i>0{index + 1}</i><span>{rule}</span></li>)}</ol>
        </details>
        <div className="strip__age-note" role="note"><span>18+</span><p>{copy.age}</p></div>
        {lang !== "ru" && <p className="strip__language-note" lang={lang}>{copy.russianNote}</p>}
        <fieldset className="strip__first">
          <legend>{copy.firstTurn}</legend>
          <div>
            {playerNames.map((name, index) => (
              <button key={name} type="button" aria-pressed={first === index} onClick={() => setFirst(index as PlayerIndex)}
                className="strip__pick" data-testid={`button-strip-first-${index}`}>
                <span className="strip__pick-mark" aria-hidden="true">{index === 0 ? "01" : "02"}</span>{name}
              </button>
            ))}
          </div>
        </fieldset>
        <button type="button" className="strip-btn" onClick={startGame} data-testid="button-strip-start">{copy.start}</button>
      </section>
    );
  } else if (session.phase === "finished" && session.winner !== null) {
    const loser: PlayerIndex = session.winner === 0 ? 1 : 0;
    body = (
      <section className="strip__finish strip-enter" data-testid="panel-strip-finish">
        <span className="strip__eyebrow">18+ <i /> TOUCHÉ</span>
        <div className="strip-premium__intro-stage strip-premium__finish-stage" aria-hidden="true">
          {session.players.map((player, index) => (
            <div className="strip-premium__intro-doll" key={index}>
              <StripCharacter player={index as PlayerIndex} stage={player.layersRemoved} fromStage={removal?.player === index ? removal.from : undefined} />
            </div>
          ))}
        </div>
        <div className="strip__finish-mark" aria-hidden="true">
          <svg viewBox="0 0 40 40"><path d="M20 3 23.5 16.5 37 20l-13.5 3.5L20 37l-3.5-13.5L3 20l13.5-3.5L20 3Z" /></svg>
        </div>
        <p className="strip__kicker">{copy.winner.toUpperCase()}</p>
        <h1 data-testid="text-strip-winner">{playerNames[session.winner]}</h1>
        <div className="strip__result">
          <p><span>{copy.winner}</span><strong>{playerNames[session.winner]}</strong></p>
          <p><span>{copy.loser}</span><strong>{playerNames[loser]}</strong></p>
        </div>
        <p className="strip__wish">{copy.wish}</p>
        <p className="strip__finish-note">{copy.finishNote}</p>
        {confirming ? (
          <div className="strip__confirm" role="alertdialog" aria-label={copy.restartConfirm}>
            <p>{copy.restartConfirm}</p>
            <button type="button" className="strip-btn strip-btn--danger" onClick={restart} data-testid="button-strip-restart-confirm">{copy.confirm}</button>
            <button type="button" className="strip-btn strip-btn--text" onClick={() => setConfirming(false)} data-testid="button-strip-restart-cancel">{copy.cancel}</button>
          </div>
        ) : (
          <button type="button" className="strip-btn" onClick={() => setConfirming(true)} data-testid="button-strip-new-game">{copy.newGame}</button>
        )}
        <button type="button" className="strip-btn strip-btn--text" onClick={onBack} data-testid="button-strip-to-games">{copy.toGames}</button>
      </section>
    );
  } else {
    body = (
      <section className="strip__play strip-enter" data-testid="panel-strip-play">
        <div className="strip__play-heading">
          <span className="strip__sequence" aria-hidden="true">03 / 03</span>
          <p className="strip__kicker">{copy.playKicker}</p>
          <h1>{copy.title}</h1>
          <div className="strip__turn" aria-live="polite" data-testid="status-strip-turn">
            <span>{copy.turn}</span><strong>{playerNames[session.turn]}</strong>
          </div>
        </div>
        <div className="strip__players">
          {session.players.map((player, index) => (
            <PlayerFigure key={index} player={index as PlayerIndex} removed={player.layersRemoved}
              active={session.turn === index} copy={copy} fromStage={removal?.player === index ? removal.from : undefined} />
          ))}
        </div>
        {session.players[session.turn].layersRemoved === 4 && <p className="strip-final-counter">Задания на последнем уровне: {session.players[session.turn].finalCompleted ?? 0} / 5 · затем поединок с приложением</p>}
        <div className="strip__play-area" aria-live="polite">
          {!session.card ? (
            <>
              <div className="strip__level-line"><span>{copy.level} {Math.min(session.players[session.turn].layersRemoved + 1, 5)}</span><span>{copy.layers} {5 - session.players[session.turn].layersRemoved} {copy.left}</span></div>
              {lastResult && <p className="strip__result-toast" role="status" data-testid="status-strip-result">{lastResult}</p>}
              <button type="button" className="strip-btn" onClick={drawCard} data-testid="button-strip-draw">{copy.draw}</button>
            </>
          ) : (
            <p className="strip-premium__waiting" role="status">{copy.card} · {playerNames[session.turn]}</p>
          )}
        </div>
        {confirming ? (
          <div className="strip__confirm strip__confirm--inline" role="alertdialog" aria-label={copy.restartConfirm}>
            <p>{copy.restartConfirm}</p>
            <button type="button" className="strip-btn strip-btn--danger" onClick={restart} data-testid="button-strip-restart-confirm">{copy.confirm}</button>
            <button type="button" className="strip-btn strip-btn--text" onClick={() => setConfirming(false)} data-testid="button-strip-restart-cancel">{copy.cancel}</button>
          </div>
        ) : (
          <button type="button" className="strip__restart-link" onClick={() => setConfirming(true)} data-testid="button-strip-restart">{copy.restart}</button>
        )}
      </section>
    );
  }

  return (
    <main className="strip strip-premium" style={{ "--strip-top": `${top}px` } as CSSProperties}>
      {!session?.card && (
        <>
          {header}
          <div className="strip__body">{body}</div>
        </>
      )}
      {session?.card && session.phase === "playing" && (
        <section className="strip-premium__reveal strip-enter" role="dialog" aria-modal="true" aria-labelledby="text-strip-task" data-testid="card-strip-challenge">
          <div className="strip-premium__reveal-top">
            <div className="strip-premium__reveal-brand">
              <strong>18+ · TOUCHÉ</strong>
              <span className="strip-premium__reveal-level">{copy.card}<b>{copy.level} {Math.min(session.players[session.turn].layersRemoved + 1, 5)}</b></span>
            </div>
            <span className="strip-premium__reveal-turn">{copy.turn}<br /><strong>{playerNames[session.turn]}</strong></span>
          </div>
          <div className="strip-premium__reveal-cardno" lang="ru">{session.card.category}</div>
          <h2 id="text-strip-task" ref={challengeHeadingRef} tabIndex={-1} lang="ru" className="strip-premium__reveal-task" data-testid="text-strip-task">
            {session.card.task}
          </h2>
          <div className="strip-premium__reveal-criteria">
            <strong>{copy.criteria}</strong>
            <p lang="ru" data-testid="text-strip-criteria">{session.card.criteria}</p>
          </div>
          {session.mini && <StripMiniGame round={session.mini} onChange={mini => setSession(previous => previous && previous.card ? { ...previous, mini } : previous)} />}
          {session.mini?.kind === "final" ? (
            session.mini.revealed && session.mini.choice && rpsOutcome(session.mini.choice, session.mini.target as RpsChoice) !== "tie" && (
              <div className="strip-premium__reveal-actions">
                <button type="button" className="strip-btn" onClick={() => resolveTurn(rpsOutcome(session.mini!.choice!, session.mini!.target as RpsChoice) === "win")}>Продолжить</button>
              </div>
            )
          ) : <div className="strip-premium__reveal-actions">
            <button type="button" className="strip-btn" disabled={!!session.mini && !session.mini.revealed} onClick={() => resolveTurn(true)} data-testid="button-strip-complete">{copy.completed}</button>
            <button type="button" className="strip-btn strip-btn--fail" disabled={!!session.mini && !session.mini.revealed} onClick={() => resolveTurn(false)} data-testid="button-strip-fail">{copy.failed} <span>· {copy.removeLayer}</span></button>
          </div>}
          <p className="strip-premium__reveal-foot">{copy.kicker}</p>
        </section>
      )}
    </main>
  );
}
