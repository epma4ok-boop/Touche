import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import type { Lang } from "@/data/i18n";
import useTelegramTopInset from "./useTelegramTopInset";
import "./StripGameScreen.css";

type PlayerIndex = 0 | 1;
type Phase = "playing" | "finished";
type Card = { id: string; category: string; task: string; criteria: string };
type Player = { layersRemoved: number };
type Session = {
  v: 1;
  phase: Phase;
  players: [Player, Player];
  turn: PlayerIndex;
  card: Card | null;
  used: Record<string, string[]>;
  winner: PlayerIndex | null;
};
type Props = { lang: Lang; onBack: () => void };

const STORAGE_KEY = "touche.strip.session.v1";
const LAYER_SETS: [string[], string[]] = [
  ["Носки", "Верх", "Низ", "Бюстгальтер", "Трусы"],
  ["Носки", "Верх", "Низ", "Футболка", "Трусы"],
];

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
    { id: "l2-number", category: "Угадай число", task: "Партнёр загадывает число от 1 до 10. Назови одну догадку.", criteria: "Задача выполнена, если названное число совпало с загаданным." },
    { id: "l2-rps", category: "Камень, ножницы, бумага", task: "Сыграйте один раунд в камень, ножницы, бумагу.", criteria: "Победа или ничья — выполнено; поражение — провал. При ничьей повторите раунд." },
    { id: "l2-squat", category: "Спорт", task: "Сделай десять приседаний подряд в комфортном темпе.", criteria: "Выполни 10 приседаний без паузы." },
    { id: "l2-memory", category: "История по буквам", task: "Расскажи в двух предложениях о вашем самом смешном общем моменте. Второе предложение начни с последней буквы первого.", criteria: "Скажи два предложения и начни второе с правильной буквы." },
    { id: "l2-whisper", category: "Телефонные трюки", task: "Запиши короткое голосовое сообщение шёпотом: «Я хочу провести этот вечер рядом с тобой».", criteria: "Отправь партнёру голосовое, в котором слышна вся фраза." },
  ],
  [
    { id: "l3-pose", category: "Изобрази позу", task: "Прими выразительную позу, в которой ты чувствуешь себя особенно привлекательным или привлекательной.", criteria: "Удерживай позу 20 секунд, не смеясь." },
    { id: "l3-selfie", category: "Селфи с намёком", task: "Сделай селфи с пальцем у губ, томным взглядом и приоткрытым ртом. Отправь партнёру.", criteria: "Сделай кадр с указанными жестом и выражением лица и отправь его партнёру." },
    { id: "l3-message", category: "Эротичное сообщение", task: "Напиши партнёру три предложения о том, чего тебе хочется от вашего сегодняшнего вечера — чувственно, без спешки.", criteria: "Сообщение состоит ровно из трёх законченных предложений и показано партнёру." },
    { id: "l3-guess", category: "Угадай часть тела", task: "Партнёр молча загадывает одну из частей тела: губы, шея, плечи, ладони или спина. Назови одну догадку.", criteria: "Названная часть тела должна совпасть с загаданной." },
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
    { id: "l5-rps", category: "Камень, ножницы, бумага", task: "Сыграйте в камень, ножницы, бумагу. При ничьей переиграйте; проигрыш означает провал задания.", criteria: "Победа означает выполнение; при проигрыше нажми «Провалил»." },
    { id: "l5-underwear", category: "Эротичное действие", task: "Положи руку на свои трусы и нежно поглаживай 20 секунд.", criteria: "Продолжай действие 20 секунд." },
    { id: "l5-wish", category: "Эротичное действие", task: "Запусти руку себе под трусы и погладь себя 20 секунд.", criteria: "Продолжай действие 20 секунд." },
    { id: "l5-hand", category: "Эротичное действие", task: "Возьми руку партнёра, положи её себе на грудь и веди ею, массируя грудь 20 секунд.", criteria: "Продолжай действие 20 секунд." },
    { id: "l5-hips-photo", category: "Эротичное фото", task: "Сделай эротичное фото спины или ягодиц с намёком и отправь партнёру.", criteria: "Сделай и отправь один кадр спины или ягодиц." },
    { id: "l5-video-legs", category: "Эротичное видео", task: "Запиши видео на 5–10 секунд с раздвинутыми ногами в белье и отправь партнёру.", criteria: "Отправь один непрерывный ролик длительностью от пяти до десяти секунд." },
  ],
];

type Copy = {
  back: string; title: string; subtitle: string; kicker: string; playKicker: string; start: string;
  rulesTitle: string; rules: string[]; age: string; firstTurn: string; woman: string; man: string;
  chooseFirst: string; startGame: string; restart: string; restartConfirm: string; confirm: string; cancel: string;
  turn: string; level: string; draw: string; card: string; criteria: string; completed: string; failed: string;
  layers: string; removed: string; left: string; winner: string; loser: string; wish: string; finishNote: string;
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
    layers: "Слои", removed: "снято", left: "осталось", winner: "Победитель", loser: "Проигравший",
    wish: "Победитель сразу загадывает желание. Проигравший его выполняет.",
    finishNote: "Игра завершена.",
    newGame: "Новая игра", toGames: "К играм", russianNote: "Карточки и задания остаются на русском языке.",
    layerChanged: "Слой снят. Теперь ход партнёра.",
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
    card: "Challenge", criteria: "Completion criteria", completed: "Completed", failed: "Not completed",
    layers: "Layers", removed: "removed", left: "left", winner: "Winner", loser: "Lost",
    wish: "The winner makes a wish right away. The loser carries it out.",
    finishNote: "The game is over.",
    newGame: "New game", toGames: "Back to games", russianNote: "Cards and challenges remain in Russian.",
    layerChanged: "Layer removed. The other player is up.",
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
    card: "चुनौती", criteria: "पूरा करने का मानदंड", completed: "पूरा हुआ", failed: "पूरा नहीं हुआ",
    layers: "परतें", removed: "हटीं", left: "बाकी", winner: "विजेता", loser: "हारे", 
    wish: "विजेता तुरंत एक इच्छा बताएगा। हारने वाला उसे पूरा करेगा।",
    finishNote: "खेल समाप्त हुआ।",
    newGame: "नया खेल", toGames: "खेलों पर वापस", russianNote: "कार्ड और चुनौतियाँ रूसी में ही रहेंगी।",
    layerChanged: "एक परत हटी। अब साथी की बारी है।",
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
    card: "Desafio", criteria: "Critério de conclusão", completed: "Cumprido", failed: "Não cumprido",
    layers: "Camadas", removed: "removidas", left: "restantes", winner: "Vencedor", loser: "Perdeu",
    wish: "O vencedor faz um pedido imediatamente. Quem perdeu o realiza.",
    finishNote: "O jogo terminou.",
    newGame: "Novo jogo", toGames: "Voltar aos jogos", russianNote: "As cartas e os desafios continuam em russo.",
    layerChanged: "Camada removida. Agora é a vez da outra pessoa.",
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
    card: "Reto", criteria: "Criterio para completarlo", completed: "Completado", failed: "No completado",
    layers: "Capas", removed: "quitadas", left: "restantes", winner: "Ganador", loser: "Perdió",
    wish: "Quien gana pide un deseo en el acto. Quien pierde lo cumple.",
    finishNote: "La partida ha terminado.",
    newGame: "Nueva partida", toGames: "Volver a juegos", russianNote: "Las cartas y los retos siguen en ruso.",
    layerChanged: "Capa quitada. Le toca a la otra persona.",
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
    return {
      v: 1, phase: value.phase, players: value.players as [Player, Player], turn: value.turn,
      card: value.card ?? null, used: value.used as Record<string, string[]>, winner: value.winner ?? null,
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

function PlayerFigure({ player, removed, active, copy }: { player: PlayerIndex; removed: number; active: boolean; copy: Copy }) {
  const name = player === 0 ? copy.woman : copy.man;
  const layers = LAYER_SETS[player];
  return (
    <article className="strip-player" data-active={active} data-testid={`card-strip-player-${player}`}>
      <div className={`strip-player__figure strip-player__figure--${player === 0 ? "woman" : "man"}`} aria-hidden="true">
        <svg viewBox="0 0 100 190" role="presentation">
          <path className="strip-figure__hair" d="M36 20c0-11 6-18 15-18 11 0 16 8 15 19-4-5-8-7-14-7-5 0-10 2-16 6z" />
          <circle className="strip-figure__skin" cx="50" cy="20" r="13" />
          <path className="strip-figure__skin strip-figure__torso" d="M39 34h22l8 43-8 35H39l-8-35z" />
          <path className="strip-figure__skin" d="M35 42 22 83l6 3 18-32M65 42l13 41-6 3-18-32" />
          <path className="strip-figure__skin" d="M40 108 34 173h8l10-45 8 45h8l-6-65z" />
          <path className="strip-figure__garment strip-figure__garment--top" data-gone={removed >= 2} d="M39 35h22l6 37H33z" />
          <path className="strip-figure__garment strip-figure__garment--bottom" data-gone={removed >= 3} d="M34 74h32l-5 34H39z" />
          <path className="strip-figure__garment strip-figure__garment--base" data-gone={removed >= 4} d="M34 56q16 10 32 0l2 15H32z" />
          <path className="strip-figure__garment strip-figure__garment--under" data-gone={removed >= 5} d="M39 107h22l-2 11H41z" />
          <path className="strip-figure__sock" data-gone={removed >= 1} d="M34 165h9l-1 13H29q0-7 5-13zm23 0h9l5 13H57z" />
        </svg>
      </div>
      <div className="strip-player__heading">
        <strong>{name}</strong>
        <span>{removed} / 5 {copy.removed}</span>
      </div>
      <div className="strip-player__level" aria-label={`${copy.level} ${Math.min(removed + 1, 5)}`}>
        <span>{copy.level}</span><b>{Math.min(removed + 1, 5)}</b>
      </div>
      <div className="strip-layers" aria-label={copy.layers}>
        {layers.map((layer, index) => (
          <span className="strip-layer" data-removed={index < removed} key={layer}>
            <i aria-hidden="true">{index < removed ? "×" : String(index + 1).padStart(2, "0")}</i>
            <span>{layer}</span>
          </span>
        ))}
      </div>
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
  const currentLevel = session ? Math.min(session.players[session.turn].layersRemoved, 4) : 0;
  const levelCards = useMemo(() => session ? CARDS[currentLevel] : [], [session, currentLevel]);

  useEffect(() => { saveSession(session); }, [session]);

  const playerNames = [copy.woman, copy.man] as const;
  const startGame = () => {
    setSession(createSession(first));
    setConfirming(false);
    setLastResult("");
  };
  const drawCard = () => {
    if (!session || session.card || session.phase !== "playing") return;
    const key = String(currentLevel);
    const alreadyUsed = session.used[key] ?? [];
    const available = levelCards.filter(card => !alreadyUsed.includes(card.id));
    const pool = available.length ? available : levelCards;
    const card = pool[Math.floor(Math.random() * pool.length)];
    const used = { ...session.used, [key]: available.length ? [...alreadyUsed, card.id] : [card.id] };
    setSession({ ...session, card, used });
    setLastResult("");
  };
  const resolveTurn = (completed: boolean) => {
    if (!session || !session.card || session.phase !== "playing") return;
    const current = session.turn;
    const nextTurn: PlayerIndex = current === 0 ? 1 : 0;
    if (completed) {
      setSession({ ...session, card: null, turn: nextTurn });
      setLastResult(copy.completed);
      return;
    }
    const players = [...session.players] as [Player, Player];
    players[current] = { layersRemoved: Math.min(5, players[current].layersRemoved + 1) };
    if (players[current].layersRemoved >= 5) {
      setSession({ ...session, players, card: null, phase: "finished", winner: nextTurn });
      setLastResult("");
      return;
    }
    setSession({ ...session, players, card: null, turn: nextTurn });
    setLastResult(copy.layerChanged);
  };
  const restart = () => {
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
          <p className="strip__kicker">{copy.kicker}</p>
        <h1 tabIndex={-1} data-testid="text-strip-title">{copy.title}</h1>
        <p className="strip__lead">{copy.subtitle}</p>
        <div className="strip__panel">
          <h2>{copy.rulesTitle}</h2>
          <ol className="strip__rules">{copy.rules.map((rule, index) => <li key={rule}><i>0{index + 1}</i><span>{rule}</span></li>)}</ol>
        </div>
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
          <p className="strip__kicker">{copy.playKicker}</p>
          <h1>{copy.title}</h1>
          <div className="strip__turn" aria-live="polite" data-testid="status-strip-turn">
            <span>{copy.turn}</span><strong>{playerNames[session.turn]}</strong>
          </div>
        </div>
        <div className="strip__players">
          {session.players.map((player, index) => (
            <PlayerFigure key={index} player={index as PlayerIndex} removed={player.layersRemoved}
              active={session.turn === index} copy={copy} />
          ))}
        </div>
        <div className="strip__play-area" aria-live="polite">
          {!session.card ? (
            <>
              <div className="strip__level-line"><span>{copy.level} {Math.min(session.players[session.turn].layersRemoved + 1, 5)}</span><span>{copy.layers} {5 - session.players[session.turn].layersRemoved} {copy.left}</span></div>
              {lastResult && <p className="strip__result-toast" role="status" data-testid="status-strip-result">{lastResult}</p>}
              <button type="button" className="strip-btn" onClick={drawCard} data-testid="button-strip-draw">{copy.draw}</button>
            </>
          ) : (
            <article className="strip__challenge" data-testid="card-strip-challenge">
              <div className="strip__challenge-top"><span>{copy.card} · {copy.level} {Math.min(session.players[session.turn].layersRemoved + 1, 5)}</span><b lang="ru">{session.card.category}</b></div>
              <p lang="ru" className="strip__task" data-testid="text-strip-task">{session.card.task}</p>
              <div className="strip__criteria">
                <span>{copy.criteria}</span>
                <p lang="ru" data-testid="text-strip-criteria">{session.card.criteria}</p>
              </div>
              <div className="strip__outcomes">
                <button type="button" className="strip-btn" onClick={() => resolveTurn(true)} data-testid="button-strip-complete">{copy.completed}</button>
                <button type="button" className="strip-btn strip-btn--fail" onClick={() => resolveTurn(false)} data-testid="button-strip-fail">{copy.failed}</button>
              </div>
            </article>
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
    <main className="strip" style={{ "--strip-top": `${top}px` } as CSSProperties}>
      {header}
      <div className="strip__body">{body}</div>
    </main>
  );
}
