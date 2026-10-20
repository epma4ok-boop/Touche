import { useEffect, useMemo, useState } from "react";
import type { Lang } from "@/data/i18n";
import "./LovePathScreen.css";

type Task = { title: string; action: string; receive: string };
type Day = { category: string; title: string; tasks: Task[] };
type Step = "board" | "choices" | "instructions" | "final" | "scenario";

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
    category: "Желание", title: "Поделитесь ожиданием",
    tasks: [
      { title: "Сообщение-предвкушение", action: "Напиши партнёру, какого нежного жеста тебе хотелось бы сегодня вечером. Оставь ему возможность самому выбрать момент.", receive: "Сегодня партнёр поделится, какого жеста ждёт от тебя. Ответь, что тебе подходит, и выбери удобный момент." },
      { title: "Приглашение на свидание", action: "Пригласи партнёра на короткое домашнее свидание. Подготовь напиток и попроси выбрать одну песню для вечера.", receive: "Сегодня партнёр подготовил маленькое домашнее свидание. Выбери песню и приходите без спешки." },
      { title: "Секретный комплимент", action: "Шёпотом скажи партнёру, что в нём сегодня кажется тебе особенно притягательным. Не торопись продолжать — дай ответить.", receive: "Сегодня партнёр скажет тебе, что в тебе его притягивает. Ответь только тем, чем действительно хочется поделиться." },
    ],
  },
  {
    category: "Страсть", title: "Сделайте вечер особенным",
    tasks: [
      { title: "Вечерний ритуал", action: "Создай уютную атмосферу и предложи партнёру выбрать: объятия, поцелуй или просто побыть рядом. Продолжай только если ему это приятно.", receive: "Сегодня партнёр подготовит для вас особенный вечер и предложит выбрать, как провести его начало." },
      { title: "Танец для двоих", action: "Выбери одну песню и станцуй для партнёра. Начни с собственного комфортного темпа, а в конце пригласи его присоединиться.", receive: "Сегодня партнёр приготовил для тебя танец. Смотри, наслаждайся моментом и присоединяйся, если захочешь." },
      { title: "Массаж с продолжением", action: "Предложи партнёру расслабляющий массаж. Сначала спроси, где ему приятно и чего он не хочет; дальше следуй только его ответам.", receive: "Сегодня партнёр предложит тебе массаж и будет ориентироваться на твои пожелания. Ты задаёшь темп и можешь остановить его в любой момент." },
    ],
  },
  {
    category: "Страсть", title: "Удивите друг друга",
    tasks: [
      { title: "Подготовь сюрприз", action: "Подготовь для партнёра небольшой сюрприз: музыка, приглушённый свет и время только для вас. Пусть он сам выберет, как продолжить.", receive: "Сегодня партнёр приготовил для вас сюрприз. Посмотри, что он придумал, и выбери, хочется ли продолжить." },
      { title: "Поцелуй без спешки", action: "Предложи партнёру поцелуй без спешки. Начни с вопроса или жеста, который даст ему легко согласиться или отказаться.", receive: "Сегодня партнёр предложит тебе поцелуй. Реши сам, хочется ли тебе этого сейчас и как именно." },
      { title: "Вечер по твоим правилам", action: "Спроси партнёра, какой небольшой жест сделал бы этот вечер особенным. Подготовь его и не добавляй ничего, о чём вы не договорились.", receive: "Сегодня партнёр спросит, чего тебе хочется. Назови один небольшой жест или скажи, что предпочитаешь просто провести время вместе." },
    ],
  },
  {
    category: "Страсть", title: "Доверьтесь моменту",
    tasks: [
      { title: "Выбери темп", action: "Пригласи партнёра провести десять минут в объятиях. Предложи ему самому выбрать: молчать, разговаривать или включить музыку.", receive: "Сегодня партнёр пригласит тебя провести время в объятиях. Выбери комфортный темп и скажи, что тебе приятно." },
      { title: "Тактильная карта", action: "Предложи партнёру закрыть глаза и по очереди коснись его ладоней и плеч. Перед каждым новым прикосновением спроси, можно ли продолжать.", receive: "Сегодня партнёр предложит тебе игру с прикосновениями к ладоням и плечам. Ты можешь в любой момент открыть глаза или попросить паузу." },
      { title: "Слова желания", action: "Скажи партнёру одну вещь, которую хотел бы попробовать вместе. Обсудите её спокойно и выберите только то, что подходит обоим.", receive: "Сегодня партнёр поделится одним желанием. Обсудите его без обязательств и решите вместе, хочется ли вам этого." },
    ],
  },
  {
    category: "Страсть", title: "Последний шаг к центру",
    tasks: [
      { title: "Приглашение к финалу", action: "Скажи партнёру, что ты готов перейти к финальному заданию игры. Спросите друг друга, есть ли сегодня что-то, чего точно не хочется.", receive: "Сегодня партнёр предложит перейти к финальному заданию. Назови свои границы и то, чему ты открыт." },
      { title: "Подготовь пространство", action: "Подготовь место для вашего финального задания: убери лишнее, приготовь воду и предложи партнёру выбрать музыку.", receive: "Сегодня партнёр подготовит пространство для финального задания. Вы вместе решите, когда начать и что изменить." },
      { title: "Скажи главное", action: "Скажи партнёру, что тебе особенно понравилось за эту неделю, и предложи выбрать финальное задание вместе.", receive: "Сегодня партнёр поделится тем, что ему понравилось за неделю. Расскажи о своём и выберите финал вместе." },
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

function storageKey(): string {
  const userId = (window as any).Telegram?.WebApp?.initDataUnsafe?.user?.id;
  return `touche_love_path_demo_${String(userId ?? "local")}`;
}

function loadProgress(): number {
  try {
    const value = Number(localStorage.getItem(storageKey()));
    return Number.isInteger(value) && value >= 0 && value <= 7 ? value : 0;
  } catch {
    return 0;
  }
}

export default function LovePathScreen({ lang, onBack }: { lang: Lang; onBack: () => void }) {
  const isRu = lang === "ru";
  const days = isRu ? DAYS : EN_DAYS;
  const finale = isRu ? FINALE : EN_FINALE;
  const [completedDays, setCompletedDays] = useState(loadProgress);
  const [step, setStep] = useState<Step>(() => loadProgress() >= 7 ? "final" : "board");
  const [selectedTask, setSelectedTask] = useState<number | null>(null);
  const [finalParticipant, setFinalParticipant] = useState<0 | 1>(0);
  const [finalChoices, setFinalChoices] = useState<[number | null, number | null]>([null, null]);

  useEffect(() => {
    try { localStorage.setItem(storageKey(), String(completedDays)); } catch {}
  }, [completedDays]);

  const dayIndex = Math.min(completedDays, 6);
  const activeDay = days[dayIndex];
  const activeTask = selectedTask === null ? null : activeDay.tasks[selectedTask];
  const matchedFinal = finalChoices[0] !== null && finalChoices[0] === finalChoices[1];
  const currentTurn = completedDays % 2 === 0 ? (isRu ? "Ваш ход" : "Your turn") : (isRu ? "Ход партнёра" : "Partner’s turn");
  const labels = useMemo(() => isRu ? {
    back: "Назад", kicker: "ПУТЬ ЛЮБВИ", title: "Семь шагов ближе",
    intro: "Один ход каждый день. Три задания на выбор. Финальное — только общее.",
    progress: `Пройдено дней: ${completedDays} из 7`,
    boardTitle: "Ваш путь", play: completedDays >= 7 ? "Вы уже у финала" : `Открыть день ${completedDays + 1}`,
    day: "ДЕНЬ", choose: "Выбери одно задание", chooseHint: "Выполняет тот, чей сегодня ход.",
    action: "Твоё задание", receive: "Сообщение партнёру", done: "Выполнено — следующий шаг",
    pause: "Отложить", pauseHint: "Прогресс сохранится. Вернёшься, когда будет удобно.",
    finalTitle: "Встреча в центре", finalText: "Каждый выбирает финальное задание отдельно. Совпадут выборы — откроется общий сценарий.",
    chooseFor: "Сейчас выбирает", me: "Я", partner: "Партнёр",
    mismatch: "Выбрали разное. Неделя сохранена — поменяйте только финальный выбор.",
    match: "Вы совпали. Финальное задание открыто.",
    chooseAgain: "Изменить финальный выбор", scenario: "Ваш общий сценарий",
    consent: "Можно остановиться или изменить план в любой момент. Прогресс игры не пропадёт.",
  } : {
    back: "Back", kicker: "THE LOVE PATH", title: "Seven steps closer",
    intro: "One move each day. Three tasks to choose from. The finale is shared.",
    progress: `Days completed: ${completedDays} of 7`,
    boardTitle: "Your path", play: completedDays >= 7 ? "Finale unlocked" : `Open day ${completedDays + 1}`,
    day: "DAY", choose: "Choose one task", chooseHint: "The person whose turn it is makes the move.",
    action: "Your task", receive: "Note for your partner", done: "Done — next step",
    pause: "Pause for now", pauseHint: "Your progress is saved. Return when it feels right.",
    finalTitle: "Meet in the center", finalText: "Choose the final task separately. When your choices match, the shared scenario opens.",
    chooseFor: "Choosing now", me: "Me", partner: "Partner",
    mismatch: "Different choices. Your week is saved — change only the final choice.",
    match: "You matched. Your shared finale is ready.",
    chooseAgain: "Change final choice", scenario: "Your shared scenario",
    consent: "You can pause or change the plan at any time. Game progress stays saved.",
  }, [completedDays, isRu]);

  function finishDay() {
    setCompletedDays((current) => Math.min(7, current + 1));
    setSelectedTask(null);
    setStep(completedDays >= 6 ? "final" : "board");
  }

  function setFinalChoice(choice: number) {
    setFinalChoices((current) => {
      const next: [number | null, number | null] = [...current];
      next[finalParticipant] = choice;
      return next;
    });
  }

  return (
    <main className="love-path-screen" data-testid="screen-love-path">
      <header className="lp-header">
        <button className="lp-back" type="button" onClick={step === "board" ? onBack : () => setStep("board")} data-testid="button-love-path-back">
          <span aria-hidden="true">←</span> {labels.back}
        </button>
        <span className="lp-kicker">{labels.kicker}</span>
        <span className="lp-header-mark" aria-hidden="true">♥</span>
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
            <span className="lp-turn">{completedDays >= 7 ? "∞" : currentTurn}</span>
          </div>
          <div className="lp-heart-board" data-testid="board-heart-path">
            <svg className="lp-heart-svg" viewBox="0 0 300 280" role="img" aria-label={isRu ? "Игровое поле в форме сердца, путь от нижнего кончика к центру" : "Heart-shaped game board, path from the point to the center"}>
              <path className="lp-heart-fill" d="M150 260 C120 235 40 187 37 125 C34 70 93 50 127 78 C140 88 147 102 150 113 C153 102 160 88 173 78 C207 50 266 70 263 125 C260 187 180 235 150 260Z" />
              <path className="lp-route" d="M150 246 C121 226 75 190 56 147 C38 106 63 78 96 83 C123 87 143 113 150 151" />
              {DAY_POINTS.map((point, index) => {
                const completed = index < completedDays;
                const current = index === completedDays && completedDays < 7;
                const finalePoint = index === 7;
                return (
                  <g key={index} className={completed ? "is-complete" : current ? "is-current" : finalePoint && completedDays >= 7 ? "is-current is-final" : ""}>
                    <circle className="lp-node" cx={point.x} cy={point.y} r={finalePoint ? 16 : 13} />
                    <text className="lp-node-label" x={point.x} y={point.y + 4}>{finalePoint ? "♥" : index + 1}</text>
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
            <div><span className="lp-day-number">{completedDays >= 7 ? "♥" : String(completedDays + 1).padStart(2, "0")}</span><div><strong>{completedDays >= 7 ? labels.finalTitle : activeDay.category}</strong><small>{completedDays >= 7 ? labels.finalText : currentTurn}</small></div></div>
            <button type="button" className="lp-primary" onClick={() => setStep(completedDays >= 7 ? "final" : "choices")} data-testid="button-love-path-open-day">{labels.play}</button>
          </div>
        </section>
      )}

      {step === "choices" && (
        <section className="lp-panel lp-task-panel">
          <div className="lp-section-heading"><div><p className="lp-eyebrow">{labels.day} {completedDays + 1} · {activeDay.category}</p><h2>{labels.choose}</h2></div><span className="lp-turn">{currentTurn}</span></div>
          <p className="lp-muted">{labels.chooseHint}</p>
          <div className="lp-choice-list">
            {activeDay.tasks.map((task, index) => (
              <button className="lp-choice" type="button" key={task.title} onClick={() => { setSelectedTask(index); setStep("instructions"); }} data-testid={`button-love-path-task-${index + 1}`}>
                <span className="lp-choice-number">0{index + 1}</span><span><strong>{task.title}</strong><small>{task.action}</small></span><span className="lp-arrow">→</span>
              </button>
            ))}
          </div>
          <button type="button" className="lp-text-button" onClick={() => setStep("board")}>{labels.pause}</button>
        </section>
      )}

      {step === "instructions" && activeTask && (
        <section className="lp-panel lp-instruction-panel">
          <div className="lp-section-heading"><div><p className="lp-eyebrow">{labels.day} {completedDays + 1} · {activeDay.category}</p><h2>{activeTask.title}</h2></div><span className="lp-turn">{currentTurn}</span></div>
          <article className="lp-message lp-message-actor"><span>{labels.action}</span><p>{activeTask.action}</p></article>
          <article className="lp-message lp-message-partner"><span>{labels.receive}</span><p>{activeTask.receive}</p></article>
          <p className="lp-consent-note">{labels.consent}</p>
          <button type="button" className="lp-primary lp-full" onClick={finishDay} data-testid="button-love-path-complete-day">{labels.done}</button>
          <button type="button" className="lp-text-button" onClick={() => setStep("choices")}>{labels.pause}</button>
        </section>
      )}

      {step === "final" && (
        <section className="lp-panel lp-final-panel">
          <div className="lp-section-heading"><div><p className="lp-eyebrow">{isRu ? "ЦЕНТР СЕРДЦА" : "HEART CENTER"}</p><h2>{labels.finalTitle}</h2></div><span className="lp-final-heart">♥</span></div>
          <p className="lp-muted">{labels.finalText}</p>
          <div className="lp-participant-switch" role="group" aria-label={labels.chooseFor}>
            <span>{labels.chooseFor}:</span>
            {([0, 1] as const).map((participant) => <button key={participant} type="button" className={finalParticipant === participant ? "active" : ""} onClick={() => setFinalParticipant(participant)} data-testid={`button-final-participant-${participant}`}>{participant === 0 ? labels.me : labels.partner}</button>)}
          </div>
          <div className="lp-choice-list lp-finale-choices">
            {finale.map((option, index) => (
              <button className={`lp-choice ${finalChoices[finalParticipant] === index ? "is-selected" : ""}`} type="button" key={option.title} onClick={() => setFinalChoice(index)} data-testid={`button-final-choice-${finalParticipant}-${index}`}>
                <span className="lp-choice-number">0{index + 1}</span><strong>{option.title}</strong><span>{finalChoices[finalParticipant] === index ? "✓" : "＋"}</span>
              </button>
            ))}
          </div>
          {finalChoices[0] !== null && finalChoices[1] !== null && (
            <div className={`lp-match-status ${matchedFinal ? "is-match" : "is-mismatch"}`} role="status" data-testid="status-final-match">
              <strong>{matchedFinal ? labels.match : labels.mismatch}</strong>
              {matchedFinal && <button type="button" className="lp-primary lp-full" onClick={() => setStep("scenario")} data-testid="button-reveal-scenario">{isRu ? "Открыть общий сценарий" : "Reveal shared scenario"}</button>}
            </div>
          )}
          <button type="button" className="lp-text-button" onClick={() => { setFinalChoices([null, null]); setFinalParticipant(0); }}>{labels.chooseAgain}</button>
        </section>
      )}

      {step === "scenario" && matchedFinal && finalChoices[0] !== null && (
        <section className="lp-panel lp-scenario-panel">
          <span className="lp-scenario-mark">♥</span>
          <p className="lp-eyebrow">{labels.scenario}</p>
          <h2>{finale[finalChoices[0]].title}</h2>
          <p className="lp-scenario-copy">{finale[finalChoices[0]].scenario}</p>
          <p className="lp-consent-note">{labels.consent}</p>
          <button type="button" className="lp-primary lp-full" onClick={onBack} data-testid="button-love-path-finish">{isRu ? "Вернуться на главную" : "Back to home"}</button>
        </section>
      )}
      <footer className="lp-footer">{labels.pauseHint}</footer>
    </main>
  );
}
