import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { Lang } from "@/data/i18n";
import useTelegramTopInset from "./useTelegramTopInset";
import "./DiceScreen.css";

type Props = { lang: Lang; onBack: () => void };
type DieKey = "male" | "female";
type Face = { file: string; label: Record<Lang, string> };
const ROLL_MS = 1450;
const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

const MALE_FACES: Face[] = [
  { file: "hand", label: { ru: "Рука", en: "Hand", hi: "हाथ", pt: "Mão", es: "Mano" } },
  { file: "tongue", label: { ru: "Язык", en: "Tongue", hi: "जीभ", pt: "Língua", es: "Lengua" } },
  { file: "male-chest", label: { ru: "Грудь", en: "Chest", hi: "छाती", pt: "Peito", es: "Pecho" } },
  { file: "male-pelvis", label: { ru: "Пенис", en: "Penis", hi: "लिंग", pt: "Pênis", es: "Pene" } },
  { file: "eggs", label: { ru: "Яички", en: "Testicles", hi: "अंडकोष", pt: "Testículos", es: "Testículos" } },
  { file: "male-buttocks", label: { ru: "Ягодицы", en: "Buttocks", hi: "नितंब", pt: "Nádegas", es: "Glúteos" } },
];
const FEMALE_FACES: Face[] = [
  { file: "female-buttocks", label: { ru: "Ягодицы", en: "Buttocks", hi: "नितंब", pt: "Nádegas", es: "Glúteos" } },
  { file: "hand", label: { ru: "Рука", en: "Hand", hi: "हाथ", pt: "Mão", es: "Mano" } },
  { file: "female-chest", label: { ru: "Грудь", en: "Chest", hi: "छाती", pt: "Peito", es: "Pecho" } },
  { file: "female-pelvis", label: { ru: "Таз", en: "Pelvis", hi: "श्रोणि", pt: "Pelve", es: "Pelvis" } },
  { file: "tongue", label: { ru: "Язык", en: "Tongue", hi: "जीभ", pt: "Língua", es: "Lengua" } },
  { file: "lips", label: { ru: "Губы", en: "Lips", hi: "होंठ", pt: "Lábios", es: "Labios" } },
];

const COPY: Record<Lang, {
  back: string; title: string; subtitle: string; throw: string; rolling: string; again: string; hint: string;
  male: string; female: string; result: string; status: (male: string, female: string) => string;
}> = {
  ru: { back: "Назад", title: "Кости", subtitle: "Два броска. Один общий выбор.", throw: "Бросить кости", rolling: "Кости бросаются…", again: "Бросить ещё раз", hint: "Пусть случай решит, с чего начать", male: "Мужская кость", female: "Женская кость", result: "Результат броска", status: (m, f) => `${m} · ${f}` },
  en: { back: "Back", title: "Dice", subtitle: "Two rolls. One shared choice.", throw: "Roll the dice", rolling: "Rolling the dice…", again: "Roll again", hint: "Let chance choose where to begin", male: "Male die", female: "Female die", result: "Roll result", status: (m, f) => `${m} · ${f}` },
  hi: { back: "वापस", title: "पासे", subtitle: "दो पासे। एक साझा चुनाव।", throw: "पासे फेंकें", rolling: "पासे घूम रहे हैं…", again: "फिर फेंकें", hint: "शुरुआत का चुनाव संयोग पर छोड़ें", male: "पुरुष पासा", female: "महिला पासा", result: "पासे का परिणाम", status: (m, f) => `${m} · ${f}` },
  pt: { back: "Voltar", title: "Dados", subtitle: "Dois lançamentos. Uma escolha a dois.", throw: "Lançar os dados", rolling: "Os dados estão rolando…", again: "Lançar novamente", hint: "Deixem o acaso escolher por onde começar", male: "Dado masculino", female: "Dado feminino", result: "Resultado dos dados", status: (m, f) => `${m} · ${f}` },
  es: { back: "Volver", title: "Dados", subtitle: "Dos lanzamientos. Una elección compartida.", throw: "Lanzar los dados", rolling: "Los dados están rodando…", again: "Lanzar otra vez", hint: "Dejen que el azar elija por dónde empezar", male: "Dado masculino", female: "Dado femenino", result: "Resultado de los dados", status: (m, f) => `${m} · ${f}` },
};

const FACE_TARGETS = [
  { x: 0, y: 0 }, { x: 0, y: -90 }, { x: 0, y: -180 },
  { x: 0, y: 90 }, { x: -90, y: 0 }, { x: 90, y: 0 },
];
const FEMALE_FRONT_ORDER = [5, 1, 0, 3, 4, 2];

function Die({ kind, faces, selected, lang, rotation }: {
  kind: DieKey; faces: Face[]; selected: number; lang: Lang; rotation: { x: number; y: number };
}) {
  const classes = ["front", "right", "back", "left", "top", "bottom"];
  const outerStyle = {
    "--die-x": `${rotation.x}deg`,
    "--die-y": `${rotation.y}deg`,
  } as CSSProperties;
  const visibleFaceIndex = selected;
  return (
    <div className={`touche-dice__die-stage touche-dice__die-stage--${kind}`} role="img" data-testid={`die-${kind}`} aria-label={`${kind === "male" ? COPY[lang].male : COPY[lang].female}: ${faces[visibleFaceIndex].label[lang]}`}>
      <div className="touche-dice__die-shadow" />
      <div className="touche-dice__cube" style={outerStyle}>
        {classes.map((faceClass, position) => {
          const faceIndex = kind === "female" ? FEMALE_FRONT_ORDER[position] : position;
          const face = faces[faceIndex];
          return (
            <div className={`touche-dice__face touche-dice__face--${faceClass}`} key={face.file}>
              <img src={`/images/dice-parts/${face.file}.png`} alt={face.label[lang]} draggable={false} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function DiceScreen({ lang, onBack }: Props) {
  const copy = COPY[lang];
  const top = useTelegramTopInset();
  const [rolling, setRolling] = useState(false);
  const [maleIndex, setMaleIndex] = useState(0);
  const [femaleIndex, setFemaleIndex] = useState(5);
  const [rollNumber, setRollNumber] = useState(0);
  const [rotation, setRotation] = useState({ male: { x: 0, y: 0 }, female: { x: 0, y: 0 } });
  const busyRef = useRef(false);
  const timer = useRef<number | null>(null);
  const rotationRef = useRef(rotation);
  const bodyStyle = { "--dice-top": `${top}px` } as CSSProperties;
  const result = rollNumber > 0 ? copy.status(MALE_FACES[maleIndex].label[lang], FEMALE_FACES[femaleIndex].label[lang]) : copy.hint;

  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current);
  }, []);

  function roll() {
    if (busyRef.current) return;
    busyRef.current = true;
    setRolling(true);
    const male = Math.floor(Math.random() * 6);
    const female = Math.floor(Math.random() * 6);
    setMaleIndex(male);
    setFemaleIndex(female);
    const reduced = window.matchMedia?.(REDUCED_MOTION).matches ?? false;
    const maleBase = FACE_TARGETS[male];
    const femaleBase = FACE_TARGETS[FEMALE_FRONT_ORDER.indexOf(female)];
    const advance = (previous: number, target: number) =>
      reduced ? target : previous + 1080 + (((target - previous) % 360 + 360) % 360);
    const next = {
      male: { x: advance(rotationRef.current.male.x, maleBase.x), y: advance(rotationRef.current.male.y, maleBase.y) },
      female: { x: advance(rotationRef.current.female.x, femaleBase.x), y: advance(rotationRef.current.female.y, femaleBase.y) },
    };
    rotationRef.current = next;
    setRotation(next);
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred("light");
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      busyRef.current = false;
      setRolling(false);
      setRollNumber(value => value + 1);
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred?.("success");
    }, reduced ? 80 : ROLL_MS);
  }

  return (
    <main className="touche-dice" style={bodyStyle} data-rolling={rolling}>
      <header className="touche-dice__header">
        <button type="button" className="touche-dice__back" onClick={onBack} aria-label={copy.back} data-testid="button-dice-back">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 18 9 12l6-6" /></svg>
        </button>
        <span className="touche-dice__brand">Touch<em>é</em></span>
        <span className="touche-dice__header-space" />
      </header>
      <div className="touche-dice__body">
        <section className="touche-dice__intro">
          <span className="touche-dice__eyebrow">18+ <i /> TOUCHÉ</span>
          <h1>{copy.title}</h1>
          <p>{copy.subtitle}</p>
        </section>
        <section className="touche-dice__table" aria-label={copy.result}>
          <div className="touche-dice__dice-pair">
            <div className="touche-dice__player">
              <Die kind="male" faces={MALE_FACES} selected={maleIndex} lang={lang} rotation={rotation.male} />
              <span className="touche-dice__player-label">{copy.male}</span>
            </div>
            <div className="touche-dice__join" aria-hidden="true"><i /></div>
            <div className="touche-dice__player">
              <Die kind="female" faces={FEMALE_FACES} selected={femaleIndex} lang={lang} rotation={rotation.female} />
              <span className="touche-dice__player-label">{copy.female}</span>
            </div>
          </div>
          <p className={`touche-dice__status${rollNumber ? " is-result" : ""}`} aria-live="polite" role="status" data-testid="status-dice-result">
            {rolling ? copy.rolling : result}
          </p>
        </section>
        <button type="button" className="touche-dice__button" onClick={roll} disabled={rolling} data-testid="button-dice-roll">
          <span className="touche-dice__button-mark" aria-hidden="true"><i /><i /><i /></span>
          {rolling ? copy.rolling : rollNumber ? copy.again : copy.throw}
        </button>
      </div>
    </main>
  );
}
