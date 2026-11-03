import { useEffect, useRef, useState } from "react";
import { BODY_CHOICES, RPS_CHOICES, rpsOutcome, type MiniRound, type RpsChoice } from "./stripGameRules";
import "./StripGameFinal.css";

const CLOTHES = [
  ["Жакет", "Юбка", "Бюстгальтер", "Колготки", "Трусы"],
  ["Пиджак", "Брюки", "Рубашка", "Нижний слой", "Бельё"],
];
const assetBase = `${import.meta.env.BASE_URL.replace(/\/$/, "")}/`;
const imagePath = (player: number, stage: number) =>
  `${assetBase}images/strip-game/touche-mini-games-${player === 0 ? "woman" : "man"}-${stage}.webp`;

export function StripCharacter({ player, stage, fromStage }: { player: 0 | 1; stage: number; fromStage?: number }) {
  const previous = useRef(stage);
  const [leaving, setLeaving] = useState<number | null>(() => fromStage !== undefined && fromStage < stage ? fromStage : null);
  useEffect(() => {
    if (fromStage !== undefined && fromStage < stage) setLeaving(fromStage);
    else if (stage > previous.current) setLeaving(previous.current);
    previous.current = stage;
    const timer = window.setTimeout(() => setLeaving(null), 850);
    return () => window.clearTimeout(timer);
  }, [stage, fromStage]);
  useEffect(() => {
    if (stage >= 5) return;
    const image = new Image();
    image.src = imagePath(player, stage + 1);
  }, [player, stage]);
  return <div className="strip-final-character">
    {leaving !== null && <img key={`old-${leaving}`} className="strip-final-character__old" src={imagePath(player, leaving)} alt="" aria-hidden="true" />}
    <img key={stage} className={leaving === null ? "" : "strip-final-character__new"} src={imagePath(player, stage)}
      alt={`Взрослый персонаж: снято слоёв ${stage} из 5; интимные области закрыты`} />
    {leaving !== null && <span key={`layer-${leaving}`} className="strip-final-garment" aria-hidden="true">
      <svg viewBox="0 0 48 46"><path d={leaving === 4 ? "M8 11h32l-4 14-8-3-4 14-4-14-8 3z" : leaving === 1 ? "M10 8h28l-4 32H14z" : "m15 8 9-4 9 4 8 10-6 5-4-4v20H17V19l-4 4-6-5z"} /></svg>
      {CLOTHES[player][leaving]}
    </span>}
  </div>;
}

export function RpsArt({ value }: { value: string }) {
  return <svg viewBox="0 0 112 82" className="strip-final-symbol" role="img" aria-label={value}>
    {value === "Камень" && <><path fill="#b58d8c" d="m17 61 3-23 15-20 15 3 8-5 18 13 5 20-11 15-17 7-23-2z" /><path d="m20 38 22 2 8-19m-8 19 11 24 18-16-18-8 23-11M30 69l5-25" /></>}
    {value === "Бумага" && <><path fill="#f9eadd" d="M24 7h39l16 16v49H24z" /><path fill="#dcb7b7" d="M63 7v17h16" /><path d="M33 36h31M33 44h31M33 52h25" /></>}
    {value === "Ножницы" && <><path fill="#d9d8df" d="m50 40-28-29q-4-4-7 0t1 8l26 24m8-3 28-29q4-4 7 0t-1 8L58 43" /><path stroke="#b66b89" strokeWidth="6" d="M48 43 30 56m24-13 17 13" /><ellipse fill="none" stroke="#b66b89" strokeWidth="6" cx="22" cy="62" rx="11" ry="10" /><ellipse fill="none" stroke="#b66b89" strokeWidth="6" cx="79" cy="62" rx="11" ry="10" /><circle fill="#f6d5bd" cx="52" cy="43" r="4" /></>}
  </svg>;
}

function BodyArt({ value }: { value: string }) {
  const paths: Record<string, string> = {
    Рука: "M21 48q-4-3-6-12l-3-12q-1-4 3-5t6 4l3 8V12q0-5 4-5t4 5v15-18q0-5 4-5t4 5v19-14q0-5 4-5t4 5v17-8q1-5 5-4t4 6l-2 15q-2 12-14 13H31q-6-1-10-5z",
    Нога: "m22 8 20 1-2 24 8 13q2 4-3 5H18q-6-2-2-7l8-12z",
    Голова: "M15 26q0-18 17-20 17 1 17 19v11q-1 9-10 12v5H25v-6q-10-4-10-15z",
    "Женские гениталии": "M32 7c-3 8-11 10-11 18q0 7 11 9 11-2 11-9c0-8-8-10-11-18ZM32 49c-3-8-11-10-11-18q0-7 11-9 11 2 11 9c0 8-8 10-11 18Z",
    "Мужские гениталии": "M32 7q5 10 13 12-8 7-13 15-5-8-13-15 8-2 13-12ZM32 49q5-10 13-12-8-7-13-15-5 8-13 15 8 2 13 12Z",
    Попа: "M15 13q17-9 34 0l-2 25q-3 12-15 12T17 38zM32 17v24",
    Спина: "M21 12q11-8 22 0l7 12-6 5-3 20H23l-3-20-6-5zM32 14v33m-10-22 10 5 10-5",
    Грудь: "M25 8h14l5 8 12 9-8 10-7-5 3 18H20l3-18-7 5-8-10 12-9zM23 22q9 9 18 0m-17 8q8 8 16 0",
  };
  return <svg viewBox="0 0 64 56" className="strip-final-body" role="img" aria-label={value === "Грудь" ? "Женская грудь" : value}><path d={paths[value]} /></svg>;
}

export function StripMiniGame({ round, onChange }: { round: MiniRound; onChange: (round: MiniRound) => void }) {
  const final = round.kind === "final";
  const outcome = final && round.choice && round.revealed ? rpsOutcome(round.choice, round.target as RpsChoice) : null;
  return <div className="strip-final-mini">
    <p>{final ? "Выбери свой знак, затем открой знак приложения." : "Сначала назови ответ вслух, затем коснись размытой картинки."}</p>
    {final && !round.revealed && <div className="strip-final-choices">
      {RPS_CHOICES.map(choice => <button type="button" key={choice} aria-pressed={round.choice === choice} onClick={() => onChange({ ...round, choice })}><RpsArt value={choice} /><span>{choice}</span></button>)}
    </div>}
    <button className="strip-final-hidden" type="button" disabled={round.revealed || (final && !round.choice)}
      onClick={() => onChange({ ...round, revealed: true })} data-revealed={round.revealed}
      aria-label={round.revealed ? `Ответ приложения: ${round.target}` : "Открыть скрытый ответ приложения"}>
      <span aria-hidden={!round.revealed} className="strip-final-hidden__art">
        {round.revealed ? <>
          {round.kind === "number" ? <b className="strip-final-number">{round.target}</b> : round.kind === "body" ? <BodyArt value={round.target} /> : <RpsArt value={round.target} />}
          <strong>{round.target === "Грудь" ? "Грудь (женская)" : round.target}</strong>
        </> : <span className="strip-final-mystery" />}
      </span>
      <small>{round.revealed ? "ВЫБОР ПРИЛОЖЕНИЯ" : "КОСНИСЬ, ЧТОБЫ ОТКРЫТЬ"}</small>
    </button>
    {!round.revealed && <p className="strip-final-options">Варианты: {round.kind === "body" ? BODY_CHOICES.join(" · ") : round.kind === "number" ? "от 1 до 10" : RPS_CHOICES.join(" · ")}</p>}
    {round.revealed && !final && <p>Сверь с ответом, который ты назвал вслух. Совпало — «Выполнил», не совпало — «Провалил». Микрофон не используется.</p>}
    {outcome && <p role="status"><strong>{outcome === "tie" ? "Ничья — переиграй без штрафа." : outcome === "win" ? "Ты выиграл. Одежда остаётся, ход переходит партнёру." : "Приложение выиграло. Снимается последний слой."}</strong> Твой знак: {round.choice}.</p>}
    {outcome === "tie" && <button className="strip-btn" type="button" onClick={() => onChange({ ...round, target: RPS_CHOICES[Math.floor(Math.random() * 3)], choice: null, revealed: false })}>Переиграть</button>}
  </div>;
}
