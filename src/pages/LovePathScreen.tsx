import { useEffect, useMemo, useState } from "react";
import type { Lang } from "@/data/i18n";
import "./LovePathScreen.css";

type Task = { title: string; action: string; receive: string };
type Day = { category: string; title: string; tasks: Task[] };
type Step = "board" | "choices" | "instructions" | "final" | "scenario";
type GameState = {
  started: boolean; gameId?: string; moveCount?: number; selfUserId?: number;
  nextActorUserId?: number | null; canChoose?: boolean;
  moves?: { day: number; actorUserId: number; cardId: string | null; date: string }[];
  todayMove?: { day: number; cardId: string | null; actorUserId: number } | null;
  finale?: { myChoice: string | null; partnerHasChosen: boolean; matched: boolean; sharedChoice: string | null };
};

function useTelegramTopInset(): number {
  const [top, setTop] = useState(() => window.Telegram?.WebApp ? 96 : 18);
  useEffect(() => {
    const tg = window.Telegram?.WebApp as any;
    const update = () => {
      const safe = tg?.safeAreaInset?.top ?? 0;
      const content = tg?.contentSafeAreaInset?.top ?? 0;
      setTop(tg ? Math.max(96, safe + 72, content + safe + 16) : 18);
    };
    update();
    tg?.onEvent?.("safeAreaChanged", update);
    tg?.onEvent?.("contentSafeAreaInsetChanged", update);
    const timer = window.setTimeout(update, 700);
    return () => {
      tg?.offEvent?.("safeAreaChanged", update);
      tg?.offEvent?.("contentSafeAreaInsetChanged", update);
      window.clearTimeout(timer);
    };
  }, []);
  return top;
}

async function gameRequest(method: "GET" | "POST", body?: Record<string, string>): Promise<GameState> {
  const response = await fetch("/api/couple/intimacy?action=love_path", {
    method,
    headers: { "Content-Type": "application/json", "x-telegram-init-data": window.Telegram?.WebApp?.initData ?? "" },
    body: method === "POST" ? JSON.stringify(body ?? {}) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(String(data.error ?? "love_path_unavailable"));
  return data as GameState;
}

const DAYS: Day[] = [
  {
    category: "Комплименты", title: "Начните с тёплых слов",
    tasks: [
      { title: "Три точных комплимента", action: "Сегодня скажи партнёру три конкретных комплимента. Не общие слова — назови то, что тебе особенно нравится именно в нём.", receive: "Сегодня партнёр приготовил для тебя три личных комплимента. Устройтесь рядом и выслушай их без спешки." },
      { title: "Записка на вечер", action: "Оставь партнёру короткую записку с одной причиной, за что ты его ценишь. Положи её туда, где он обязательно найдёт.", receive: "Сегодня найди записку от партнёра и прочитай её вместе. Скажи, какая фраза запомнилась больше всего." },
      { title: "Голосовое сообщение", action: "Запиши партнёру голосовое: вспомни один момент, когда ты особенно гордился им или был счастлив рядом.", receive: "Сегодня послушай голосовое от партнёра, не отвлекаясь на телефон. Ответь одним предложением о том, что почувствовал." },
    ],
  },
  {
    category: "Нежность", title: "Добавьте заботы",
    tasks: [
      { title: "Десять минут внимания", action: "Убери телефоны, устройтесь поудобнее и десять минут слушай партнёра. Задай один вопрос о том, что сделало его день лучше.", receive: "Сегодня партнёр уделит тебе десять минут без телефонов. Расскажи, что сейчас занимает твои мысли." },
      { title: "Массаж плеч", action: "Предложи партнёру массаж плеч на десять минут. Перед началом уточни, комфортны ли прикосновения и сила давления.", receive: "Сегодня партнёр предложит тебе массаж плеч. Ты можешь подсказать, как тебе удобно, или попросить остановиться." },
      { title: "Медленный танец", action: "Выбери песню, которая напоминает тебе о вас, и пригласи партнёра на один медленный танец.", receive: "Сегодня партнёр пригласит тебя на медленный танец. Выбери песню или просто доверься его выбору." },
    ],
  },
  {
    category: "Желание", title: "Заставьте ждать",
    tasks: [
      { title: "Сообщение с намёком", action: "Отправь партнёру короткое сообщение с намёком на то, чего тебе хочется от сегодняшнего вечера. Оставь интригу, но не обещай того, на что не согласен.", receive: "Сегодня партнёр оставит тебе соблазнительный намёк на вечер. Ответь, что тебе откликается, и сам выбери темп." },
      { title: "Свидание после темноты", action: "Пригласи партнёра на свидание при приглушённом свете. Подготовь музыку и предложи выбрать: танец, поцелуй или просто разговор.", receive: "Сегодня партнёр устроит свидание при приглушённом свете. Выбери, с чего начать, и меняй план, когда захочешь." },
      { title: "Скажи, что заводит", action: "На ушко скажи партнёру одну деталь в его образе или поведении, которая сегодня особенно тебя заводит. Затем остановись и дождись его реакции.", receive: "Сегодня партнёр шёпотом скажет, что в тебе его особенно заводит. Прими комплимент и ответь только если хочется." },
    ],
  },
  {
    category: "Страсть", title: "Добавьте искры",
    tasks: [
      { title: "Поцелуй с паузой", action: "Пригласи партнёра на долгий поцелуй. Сделай паузу, посмотри ему в глаза и спроси, хочется ли продолжить.", receive: "Сегодня партнёр пригласит тебя на долгий поцелуй и даст самому решить, продолжать ли." },
      { title: "Танец для двоих", action: "Выбери одну песню и станцуй для партнёра. Начни с собственного комфортного темпа, а в конце пригласи его присоединиться.", receive: "Сегодня партнёр приготовил для тебя танец. Смотри, наслаждайся моментом и присоединяйся, если захочешь." },
      { title: "Массаж при мягком свете", action: "Предложи партнёру массаж плеч и спины при мягком свете. Спроси, где можно касаться и куда не нужно; не переходи к следующему шагу без ясного согласия.", receive: "Сегодня партнёр предложит чувственный массаж. Ты выбираешь зоны прикосновений, темп и момент остановки." },
    ],
  },
  {
    category: "Страсть", title: "Дразните и соблазняйте",
    tasks: [
      { title: "Сюрприз с интригой", action: "Подготовь для партнёра флиртующий сюрприз: приглушённый свет, музыка и записка с намёком. Пусть он сам выберет, как продолжить.", receive: "Сегодня партнёр приготовил для тебя соблазнительный сюрприз. Ты решаешь, хочется ли продолжить." },
      { title: "Поцелуй без спешки", action: "Предложи партнёру поцелуй без спешки. Начни с вопроса или жеста, который даст ему легко согласиться или отказаться.", receive: "Сегодня партнёр предложит тебе поцелуй. Реши сам, хочется ли тебе этого сейчас и как именно." },
      { title: "Три желания", action: "Попроси партнёра назвать три небольших желания на вечер. Выбери одно, которое подходит вам обоим, и выполните только его.", receive: "Сегодня партнёр попросит назвать три желания на вечер. Предлагай только то, чего действительно хочешь, а выбор сделайте вместе." },
    ],
  },
  {
    category: "Страсть", title: "Доверьтесь моменту",
    tasks: [
      { title: "Выбери темп", action: "Пригласи партнёра на десять минут тесных объятий. Шепни ему что-нибудь приятное и спроси, хочется ли добавить поцелуи.", receive: "Сегодня партнёр пригласит тебя в объятия и может предложить поцелуи. Ты выбираешь темп и можешь оставить всё только объятиями." },
      { title: "Тактильная карта", action: "Предложи чувственную игру с закрытыми глазами: медленно коснись шеи, плеч или спины — только тех зон, которые партнёр заранее разрешил. После каждого шага спрашивай, продолжать ли.", receive: "Сегодня партнёр предложит игру с прикосновениями. Заранее назови подходящие зоны, а в любой момент можешь открыть глаза или остановить игру." },
      { title: "Скажи, чего хочешь", action: "Назови партнёру одно прикосновение или поцелуй, которого тебе хочется сегодня. Спроси, подходит ли это ему, и договоритесь о простом стоп-сигнале.", receive: "Сегодня партнёр поделится своим желанием. Ответь честно, что тебе подходит, а что нет; никаких обещаний продолжать дальше." },
    ],
  },
  {
    category: "Страсть", title: "Последний шаг к центру",
    tasks: [
      { title: "Приглашение к финалу", action: "Пригласи партнёра на особенный вечер вдвоём. Спросите друг друга, какие поцелуи и прикосновения сегодня желанны, а какие точно исключены.", receive: "Сегодня партнёр предложит особенный вечер. Назови свои границы и то, чему открыт именно сейчас — согласие можно изменить в любой момент." },
      { title: "Подготовь пространство", action: "Подготовь мягкий свет, музыку и место, где вам будет удобно быть близко. Предложи партнёру выбрать, с чего начать: танец, массаж или поцелуй.", receive: "Сегодня партнёр подготовит место для вас двоих. Выбери начало вечера и вместе решите, хочется ли продолжать." },
      { title: "Скажи главное", action: "Скажи партнёру, какой его жест за эту неделю сильнее всего тебя притянул. Затем предложи выбрать финальный сценарий, который нравится обоим.", receive: "Сегодня партнёр поделится, что в тебе его притянуло. Расскажи о своём и выберите финал без давления." },
    ],
  },
];

const FINALE = [
  { title: "Медленный танец", scenario: "Выберите одну песню. Начните танцевать на расстоянии, а затем сближайтесь только если обоим этого хочется. В конце каждый говорит, какой момент запомнился." },
  { title: "Слепая дегустация", scenario: "Подготовьте три безопасных вкуса и по очереди угадывайте их с закрытыми глазами. Перед каждым новым вкусом спросите, готов ли партнёр продолжать." },
  { title: "Свидание-сценарий", scenario: "Один из вас приглашает другого на свидание в выдуманное место. По очереди добавляйте детали истории и выбирайте, какой будет следующая сцена." },
];

const EN_DAYS: Day[] = DAYS.map((day, dayIndex) => ({
  category: ["Compliments", "Tenderness", "Desire", "Passion", "Passion", "Passion", "Passion"][dayIndex],
  title: ["Start with warm words", "Add a little care", "Share the anticipation", "Make tonight special", "Surprise each other", "Trust the moment", "One last step to the center"][dayIndex],
  tasks: day.tasks.map((task, taskIndex) => ({
    title: [
      ["Three specific compliments", "A note for tonight", "A voice message"],
      ["Ten minutes of attention", "A shoulder massage", "A slow dance"],
      ["A message to look forward to", "A date invitation", "A private compliment"],
      ["An evening ritual", "A dance for two", "A massage, at their pace"],
      ["Prepare a surprise", "A slow kiss", "An evening on their terms"],
      ["Choose the pace", "A touch game", "Share a desire"],
      ["Invite them to the finale", "Prepare the space", "Say what mattered"],
    ][dayIndex][taskIndex],
    action: "Offer this activity clearly and follow your partner’s response. Keep the pace comfortable for both of you; either person can pause or change the plan.",
    receive: "Your partner has prepared this activity for you. You choose the pace, can suggest a change, or pause at any time.",
  })),
}));

const EN_FINALE = [
  { title: "A slow dance", scenario: "Choose one song. Start dancing with a little space, then move closer only if you both want to. Afterwards, share the moment you remember most." },
  { title: "Blind tasting", scenario: "Choose three safe flavors and take turns guessing with eyes closed. Before each new taste, check that your partner is happy to continue." },
  { title: "A date in a story", scenario: "One of you invites the other to an imaginary date. Take turns adding details and choosing what happens next." },
];

const DAY_POINTS = [
  { x: 150, y: 246 }, { x: 108, y: 219 }, { x: 72, y: 184 },
  { x: 48, y: 143 }, { x: 57, y: 105 }, { x: 94, y: 88 },
  { x: 128, y: 111 }, { x: 150, y: 151 },
];

export default function LovePathScreen({ lang, onBack }: { lang: Lang; onBack: () => void }) {
  const isRu = lang === "ru";
  const topInset = useTelegramTopInset();
  const days = isRu ? DAYS : EN_DAYS;
  const finale = isRu ? FINALE : EN_FINALE;
  const [game, setGame] = useState<GameState | null>(null);
  const [step, setStep] = useState<Step>("board");
  const [selectedTask, setSelectedTask] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const completedDays = game?.moveCount ?? 0;
  const dayNumber = game?.todayMove?.day ?? Math.min(completedDays + 1, 7);
  const activeDay = days[Math.min(dayNumber - 1, 6)];
  const moveCardIndex = game?.todayMove?.cardId ? Number(game.todayMove.cardId.slice(-1)) - 1 : null;
  const activeTaskIndex = selectedTask ?? moveCardIndex;
  const activeTask = activeTaskIndex === null ? null : activeDay.tasks[activeTaskIndex];
  const finalChoiceNumber = game?.finale?.myChoice ? Number(game.finale.myChoice.slice(-1)) - 1 : null;
  const matchedFinal = game?.finale?.matched === true;
  const currentTurn = game?.todayMove
    ? (game.todayMove.actorUserId === game.selfUserId ? (isRu ? "Ход сделан сегодня" : "Today’s move is taken") : (isRu ? "Партнёр уже сделал ход" : "Partner has played today"))
    : game?.canChoose ? (isRu ? "Ваш ход" : "Your turn")
      : (isRu ? "Ход партнёра" : "Partner’s turn");

  useEffect(() => {
    let alive = true;
    const refresh = async () => {
      try {
        const next = await gameRequest("GET");
        if (!alive) return;
        setGame(next);
        setError("");
        if ((next.moveCount ?? 0) >= 7) setStep(next.finale?.matched ? "scenario" : "final");
        else if (next.todayMove?.cardId && next.todayMove.actorUserId === next.selfUserId) {
          setSelectedTask(Number(next.todayMove.cardId.slice(-1)) - 1);
          setStep("instructions");
        }
      } catch (cause) {
        if (alive) setError(cause instanceof Error ? cause.message : "love_path_unavailable");
      } finally {
        if (alive) setLoading(false);
      }
    };
    void refresh();
    const interval = window.setInterval(() => { void refresh(); }, 30_000);
    window.addEventListener("focus", refresh);
    return () => { alive = false; window.clearInterval(interval); window.removeEventListener("focus", refresh); };
  }, []);

  async function submit(body: Record<string, string>) {
    setBusy(true);
    setError("");
    try {
      const next = await gameRequest("POST", body);
      setGame(next);
      return next;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "love_path_unavailable");
      try {
        const fresh = await gameRequest("GET");
        setGame(fresh);
        if (fresh.todayMove?.cardId && fresh.todayMove.actorUserId === fresh.selfUserId) {
          const cardIndex = Number(fresh.todayMove.cardId.slice(-1)) - 1;
          setSelectedTask(cardIndex);
          setStep("instructions");
        }
      } catch {}
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function startGame() { await submit({ action: "start" }); }

  async function chooseTask(index: number) {
    const next = await submit({ action: "move", cardId: `d${dayNumber}-c${index + 1}` });
    if (next) { setSelectedTask(index); setStep("instructions"); }
  }

  async function chooseFinal(choice: number) {
    const next = await submit({ action: "final", choiceId: `f${choice + 1}` });
    if (next?.finale?.matched) setStep("scenario");
  }

  function finishDay() { setStep("board"); }
  const labels = useMemo(() => isRu ? {
    back: "Назад", kicker: "ПУТЬ ЛЮБВИ", title: "Семь шагов ближе",
    intro: "Один человек — один ход в день. Завтра очередь перейдёт к партнёру.",
    progress: `Ходов сделано: ${completedDays} из 7`,
    boardTitle: "Ваш путь", play: !game?.started ? "Начать игру" : completedDays >= 7 ? "Вы уже у финала" : game?.todayMove?.cardId ? "Открыть задание" : game?.canChoose ? `Сделать ход · день ${dayNumber}` : "Ждём следующего дня",
    day: "ДЕНЬ", choose: "Выбери одно задание", chooseHint: "Выбор сразу фиксирует ход на сегодня. Завтра очередь партнёра.",
    action: "Твоё задание", receive: "Сообщение партнёру", done: "Вернуться к полю",
    pause: "Отложить", pauseHint: "Прогресс сохранится. Вернёшься, когда будет удобно.",
    finalTitle: "Встреча в центре", finalText: "Каждый выбирает финальное задание отдельно. Совпадут выборы — откроется общий сценарий.",
    chooseFor: "Сейчас выбирает", me: "Я", partner: "Партнёр",
    mismatch: "Пока выбрали разное. Поменяйте только свой финальный выбор — неделя сохранена.",
    match: "Вы совпали. Финальное задание открыто.",
    chooseAgain: "Изменить мой выбор", scenario: "Ваш общий сценарий",
    consent: "Можно остановиться или изменить план в любой момент. Прогресс игры не пропадёт.",
    wait: "Сегодняшний ход уже сделан. Следующий участник сможет выбрать задание завтра.",
    pairRequired: "Сначала подключите партнёра в Touché, чтобы начать игру.",
    genericError: "Не удалось загрузить игру. Проверьте соединение и попробуйте снова.",
    waitingFinal: "Ваш выбор сохранён. Финал откроется, когда партнёр выберет свой вариант.",
  } : {
    back: "Back", kicker: "THE LOVE PATH", title: "Seven steps closer",
    intro: "One person makes one move each day. Tomorrow, it’s the other partner’s turn.",
    progress: `Moves made: ${completedDays} of 7`,
    boardTitle: "Your path", play: !game?.started ? "Start the game" : completedDays >= 7 ? "Finale unlocked" : game?.todayMove?.cardId ? "Open your task" : game?.canChoose ? `Make your move · day ${dayNumber}` : "Wait until tomorrow",
    day: "DAY", choose: "Choose one task", chooseHint: "Choosing locks today’s move. Tomorrow is your partner’s turn.",
    action: "Your task", receive: "Note for your partner", done: "Back to the board",
    pause: "Pause for now", pauseHint: "Your progress is saved. Return when it feels right.",
    finalTitle: "Meet in the center", finalText: "Choose the final task separately. When your choices match, the shared scenario opens.",
    chooseFor: "Choosing now", me: "Me", partner: "Partner",
    mismatch: "Your choices differ. Change only your own finale choice; the week stays saved.",
    match: "You matched. Your shared finale is ready.",
    chooseAgain: "Change my choice", scenario: "Your shared scenario",
    consent: "You can pause or change the plan at any time. Game progress stays saved.",
    wait: "Today’s move is already taken. The next partner can choose tomorrow.",
    pairRequired: "Connect your partner in Touché before starting the game.",
    genericError: "Could not load the game. Check your connection and try again.",
    waitingFinal: "Your choice is saved. The finale opens when your partner chooses too.",
  }, [completedDays, game, isRu, dayNumber]);

  return (
    <main className="love-path-screen" data-testid="screen-love-path" style={{ paddingTop: topInset }}>
      <header className="lp-header">
        <button className="lp-back" type="button" onClick={step === "board" ? onBack : () => setStep("board")} data-testid="button-love-path-back">
          <span aria-hidden="true">←</span> {labels.back}
        </button>
        <span className="lp-kicker">{labels.kicker}</span>
         <span className="lp-header-mark" aria-hidden="true" />
      </header>

      <section className="lp-intro">
        <p className="lp-eyebrow">TOUCHÉ · 18+</p>
        <h1>{labels.title}</h1>
        <p>{labels.intro}</p>
      </section>

      <div className="lp-progress" aria-label={labels.progress}>
        <div className="lp-progress-top"><span>{labels.progress}</span><span>{Math.round(completedDays / 7 * 100)}%</span></div>
        <div className="lp-progress-track"><span style={{ width: `${completedDays / 7 * 100}%` }} /></div>
      </div>

      {step === "board" && (
        <section className="lp-panel" aria-labelledby="lp-board-heading">
          <div className="lp-section-heading">
            <div><p className="lp-eyebrow">{labels.boardTitle}</p><h2 id="lp-board-heading">{completedDays >= 7 ? labels.finalTitle : activeDay.title}</h2></div>
            <span className="lp-turn">{loading ? "…" : completedDays >= 7 ? "∞" : currentTurn}</span>
          </div>
          <div className="lp-heart-board" data-testid="board-heart-path">
            <svg className="lp-heart-svg" viewBox="0 0 300 280" role="img" aria-label={isRu ? "Игровое поле в форме сердца, путь от нижнего кончика к центру" : "Heart-shaped game board, path from the point to the center"}>
              <path className="lp-heart-fill" d="M150 260 C120 235 40 187 37 125 C34 70 93 50 127 78 C140 88 147 102 150 113 C153 102 160 88 173 78 C207 50 266 70 263 125 C260 187 180 235 150 260Z" />
              <path className="lp-route" d="M150 246 C121 226 75 190 56 147 C38 106 63 78 96 83 C123 87 143 113 150 151" />
              {DAY_POINTS.map((point, index) => {
                const isToday = game?.todayMove?.day === index + 1;
                const completed = index < completedDays && !isToday;
                const current = isToday || (index === completedDays && completedDays < 7);
                const finalePoint = index === 7;
                return (
                  <g key={index} className={completed ? "is-complete" : current ? "is-current" : finalePoint && completedDays >= 7 ? "is-current is-final" : ""}>
                    <circle className="lp-node" cx={point.x} cy={point.y} r={finalePoint ? 16 : 13} />
                    <text className="lp-node-label" x={point.x} y={point.y + 4}>{index + 1}</text>
                  </g>
                );
              })}
              <text className="lp-heart-word" x="194" y="161">{isRu ? "вместе" : "together"}</text>
            </svg>
          </div>
          <div className="lp-board-legend">
            <span><i className="lp-legend-dot lp-legend-done" /> {isRu ? "Пройдено" : "Done"}</span>
            <span><i className="lp-legend-dot lp-legend-current" /> {isRu ? "Текущий шаг" : "Current step"}</span>
            <span><i className="lp-legend-dot lp-legend-final" /> {isRu ? "Финал" : "Finale"}</span>
          </div>
          <div className="lp-day-summary">
            <div><span className="lp-day-number">{completedDays >= 7 ? "07" : String(dayNumber).padStart(2, "0")}</span><div><strong>{completedDays >= 7 ? labels.finalTitle : activeDay.category}</strong><small>{completedDays >= 7 ? labels.finalText : currentTurn}</small></div></div>
            <button type="button" className="lp-primary" disabled={loading || busy || (!!game?.started && completedDays < 7 && !game.todayMove?.cardId && !game.canChoose)} onClick={() => {
              if (!game?.started) void startGame();
              else if (completedDays >= 7) setStep("final");
              else if (game.todayMove?.cardId) setStep("instructions");
              else if (game.canChoose) setStep("choices");
            }} data-testid="button-love-path-open-day">{loading || busy ? "…" : labels.play}</button>
          </div>
          {game?.todayMove && !game.todayMove.cardId && <p className="lp-muted">{labels.wait}</p>}
          {!!error && <div className="lp-match-status is-mismatch" role="alert">{error === "no_couple" ? labels.pairRequired : labels.genericError}</div>}
        </section>
      )}

      {step === "choices" && (
        <section className="lp-panel lp-task-panel">
          <div className="lp-section-heading"><div><p className="lp-eyebrow">{labels.day} {dayNumber} · {activeDay.category}</p><h2>{labels.choose}</h2></div><span className="lp-turn">{currentTurn}</span></div>
          <p className="lp-muted">{labels.chooseHint}</p>
          <div className="lp-choice-list">
            {activeDay.tasks.map((task, index) => (
              <button className="lp-choice" type="button" key={task.title} disabled={busy || !game?.canChoose} onClick={() => { void chooseTask(index); }} data-testid={`button-love-path-task-${index + 1}`}>
                <span className="lp-choice-number">0{index + 1}</span><span><strong>{task.title}</strong><small>{task.action}</small></span><span className="lp-arrow">→</span>
              </button>
            ))}
          </div>
          <button type="button" className="lp-text-button" onClick={() => setStep("board")}>{labels.pause}</button>
        </section>
      )}

      {step === "instructions" && activeTask && (
        <section className="lp-panel lp-instruction-panel">
          <div className="lp-section-heading"><div><p className="lp-eyebrow">{labels.day} {dayNumber} · {activeDay.category}</p><h2>{activeTask.title}</h2></div><span className="lp-turn">{currentTurn}</span></div>
          <article className="lp-message lp-message-actor"><span>{labels.action}</span><p>{activeTask.action}</p></article>
          <article className="lp-message lp-message-partner"><span>{labels.receive}</span><p>{activeTask.receive}</p></article>
          <p className="lp-consent-note">{labels.consent}</p>
          <button type="button" className="lp-primary lp-full" onClick={finishDay} data-testid="button-love-path-complete-day">{labels.done}</button>
          <button type="button" className="lp-text-button" onClick={() => setStep("board")}>{labels.pause}</button>
        </section>
      )}

      {step === "final" && (
        <section className="lp-panel lp-final-panel">
          <div className="lp-section-heading"><div><p className="lp-eyebrow">{isRu ? "ЦЕНТР СЕРДЦА" : "HEART CENTER"}</p><h2>{labels.finalTitle}</h2></div><span className="lp-final-heart" aria-hidden="true" /></div>
          <p className="lp-muted">{labels.finalText}</p>
          <div className="lp-choice-list lp-finale-choices">
            {finale.map((option, index) => (
              <button className={`lp-choice ${finalChoiceNumber === index ? "is-selected" : ""}`} type="button" key={option.title} disabled={busy} onClick={() => { void chooseFinal(index); }} data-testid={`button-final-choice-${index}`}>
                <span className="lp-choice-number">0{index + 1}</span><strong>{option.title}</strong><span>{finalChoiceNumber === index ? "✓" : "＋"}</span>
              </button>
            ))}
          </div>
          {finalChoiceNumber !== null && game?.finale?.partnerHasChosen && (
            <div className={`lp-match-status ${matchedFinal ? "is-match" : "is-mismatch"}`} role="status" data-testid="status-final-match">
              <strong>{matchedFinal ? labels.match : labels.mismatch}</strong>
              {matchedFinal && <button type="button" className="lp-primary lp-full" onClick={() => setStep("scenario")} data-testid="button-reveal-scenario">{isRu ? "Открыть общий сценарий" : "Reveal shared scenario"}</button>}
            </div>
          )}
          {finalChoiceNumber !== null && !game?.finale?.partnerHasChosen && <p className="lp-muted">{labels.waitingFinal}</p>}
          {!!error && <p className="lp-consent-note">{labels.genericError}</p>}
          <button type="button" className="lp-text-button" onClick={() => setStep("board")}>{labels.back}</button>
        </section>
      )}

      {step === "scenario" && matchedFinal && finalChoiceNumber !== null && (
        <section className="lp-panel lp-scenario-panel">
          <span className="lp-scenario-mark" aria-hidden="true" />
          <p className="lp-eyebrow">{labels.scenario}</p>
          <h2>{finale[finalChoiceNumber].title}</h2>
          <p className="lp-scenario-copy">{finale[finalChoiceNumber].scenario}</p>
          <p className="lp-consent-note">{labels.consent}</p>
          <button type="button" className="lp-primary lp-full" onClick={onBack} data-testid="button-love-path-finish">{isRu ? "Вернуться на главную" : "Back to home"}</button>
        </section>
      )}
      <footer className="lp-footer">{labels.pauseHint}</footer>
    </main>
  );
}
