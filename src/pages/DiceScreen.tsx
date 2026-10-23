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
  { file: "female-pelvis", label: { ru: "Киска", en: "Pussy", hi: "योनि", pt: "Vulva", es: "Vulva" } },
  { file: "tongue", label: { ru: "Язык", en: "Tongue", hi: "जीभ", pt: "Língua", es: "Lengua" } },
  { file: "lips", label: { ru: "Губы", en: "Lips", hi: "होंठ", pt: "Lábios", es: "Labios" } },
];

const COPY: Record<Lang, {
  back: string; title: string; subtitle: string; throw: string; rolling: string; again: string; hint: string;
  male: string; female: string; result: string; status: (male: string, female: string) => string;
  captions: string[];
}> = {
  ru: {
    back: "Назад", title: "Кости", subtitle: "Два броска. Один общий выбор.", throw: "Бросить кости", rolling: "Кости бросаются…", again: "Бросить ещё раз", hint: "Пусть случай решит, с чего начать",
    male: "Мужская кость", female: "Женская кость", result: "Результат броска", status: (m, f) => `${m} · ${f}`,
    captions: [
      "Рука и ягодицы — осторожный намёк на шлепок?",
      "Эх, сегодня без интима? Просто подержитесь за руки — тоже романтика.",
      "Рука и грудь: знакомство уже состоялось.",
      "Рука и киска — кости почти подсказывают, куда направить ладонь.",
      "Рука и язык? Похоже, сегодня понадобится координация.",
      "Рука и губы — поцелуй с небольшим спецэффектом.",
      "Язык и ягодицы — вечер явно не про скучные разговоры.",
      "Язык и рука — команда собрана, сценарий выбирайте сами.",
      "Язык и грудь — кости явно за поцелуи с продолжением.",
      "Язык и киска — о-о, случай уже без стеснения намекает.",
      "Два языка? Кости за поцелуи без лишних слов.",
      "Язык и губы — поцелуйный отдел сегодня при полном составе.",
      "Ну… сядь ему на грудь, что ли. Кости плохого не посоветуют.",
      "Грудь и рука — обнимашки уже почти начались.",
      "Грудь к груди — официальный повод обняться.",
      "Грудь и киска: сначала обнимашки, а там посмотрим.",
      "Грудь и язык — сегодня комплименты могут закончиться.",
      "Грудь и губы — начните с поцелуя, советуют эксперты-кости.",
      "Пенис и ягодицы: о-о, вечер обещает быть интересным.",
      "Пенис и рука — кому-то пригодится ловкость рук.",
      "Пенис и грудь — кости намекают на горячий вечер.",
      "Пенис и киска — тут уже почти готовый сценарий.",
      "О-о… кому-то сегодня повезёт.",
      "Пенис и губы — кости сегодня не стесняются намекать.",
      "Яички и ягодицы — маршрут неожиданный, но уверенный.",
      "Яички и рука — только нежно, мы не на переговорах.",
      "Яички и грудь — сочетание необычное; пусть спасёт импровизация.",
      "Яички и киска — кости добавили щепотку пикантности.",
      "Яички и язык — у кого-то сегодня смелые планы.",
      "Яички и губы — пусть губы сначала скажут что-то приятное.",
      "Две попы — кости голосуют за смех и близкую дистанцию.",
      "Ягодицы и рука — вариант «похлопать» обсуждается?",
      "У него попа, у неё грудь — кости сегодня за неожиданный сюжет.",
      "Ягодицы и киска — может, устроить смешной танец?",
      "Попа и язык — у костей сегодня явно хорошее чувство юмора.",
      "Попа и губы — начните с поцелуя, дальше решит настроение.",
    ],
  },
  en: {
    back: "Back", title: "Dice", subtitle: "Two rolls. One shared choice.", throw: "Roll the dice", rolling: "Rolling the dice…", again: "Roll again", hint: "Let chance choose where to begin",
    male: "Male die", female: "Female die", result: "Roll result", status: (m, f) => `${m} · ${f}`,
    captions: [
      "Hand + buttocks: a gentle hint from the dice?",
      "Two hands? No intimacy tonight—just hold hands. Still romantic.",
      "Hand + chest: the introductions are already over.",
      "Hand + pussy: the dice are practically pointing where to put it.",
      "Hand + tongue? Coordination may be required tonight.",
      "Hand + lips: a kiss with a little special effect.",
      "Tongue + buttocks: tonight's clearly not about small talk.",
      "Tongue + hand: the team is set; choose your own scenario.",
      "Tongue + chest: the dice are rooting for kisses with a sequel.",
      "Tongue + pussy: ooh, the dice have stopped being subtle.",
      "Two tongues? The dice vote for kisses without extra words.",
      "Tongue + lips: the kissing department is fully staffed tonight.",
      "Buttocks + chest: maybe sit on his chest? The dice say so.",
      "Chest + hand: cuddles are almost underway.",
      "Chest to chest: an officially approved reason to hug.",
      "Chest + pussy: start with a cuddle and see where the evening goes.",
      "Chest + tongue: compliments might not be the only thing happening.",
      "Chest + lips: start with a kiss, say the dice experts.",
      "Penis + buttocks: ooh, this evening looks interesting.",
      "Penis + hand: someone's going to need a steady hand.",
      "Penis + chest: the dice are hinting at a hot evening.",
      "Penis + pussy: that's almost a ready-made scenario.",
      "Penis + tongue: ooh… someone's in for a lucky evening.",
      "Penis + lips: the dice aren't shy about dropping hints tonight.",
      "Testicles + buttocks: an unexpected route, but a confident one.",
      "Testicles + hand: gently now—we're not in a negotiation.",
      "Testicles + chest: an unusual pairing; let improvisation save the evening.",
      "Testicles + pussy: the dice added a pinch of spice.",
      "Testicles + tongue: someone's making bold plans tonight.",
      "Testicles + lips: maybe let the lips say something nice first.",
      "Two bottoms? The dice vote for laughter and a closer distance.",
      "Bottom + hand: is a playful pat on the table?",
      "Bottom + chest: the dice really do love a plot twist.",
      "Bottom + pussy: maybe try a silly little dance?",
      "Bottom + tongue: the dice clearly have a sense of humor.",
      "Bottom + lips: start with a kiss; let the mood decide the rest.",
    ],
  },
  hi: {
    back: "वापस", title: "पासे", subtitle: "दो पासे। एक साझा चुनाव।", throw: "पासे फेंकें", rolling: "पासे घूम रहे हैं…", again: "फिर फेंकें", hint: "शुरुआत का चुनाव संयोग पर छोड़ें",
    male: "पुरुष पासा", female: "महिला पासा", result: "पासे का परिणाम", status: (m, f) => `${m} · ${f}`,
    captions: [
      "हाथ और नितंब — पासे हल्के से थपकी देने का इशारा कर रहे हैं?",
      "दो हाथ? आज अंतरंगता नहीं—बस हाथ थामिए, रोमांस तो है।",
      "हाथ और छाती: परिचय तो हो ही गया।",
      "हाथ और योनि — पासे लगभग बता रहे हैं कि हाथ कहाँ रखना है।",
      "हाथ और जीभ? आज तालमेल की ज़रूरत पड़ेगी।",
      "हाथ और होंठ — एक छोटा-सा खास असर वाला चुंबन।",
      "जीभ और नितंब — आज की शाम छोटी-मोटी बातों वाली नहीं।",
      "जीभ और हाथ — टीम तैयार है, कहानी आप चुनें।",
      "जीभ और छाती — पासे आगे बढ़ते चुंबनों के पक्ष में हैं।",
      "जीभ और योनि — ओह, किस्मत अब साफ़ इशारे कर रही है।",
      "दो जीभें? पासे बिना शब्दों वाले चुंबनों के पक्ष में हैं।",
      "जीभ और होंठ — आज चुंबनों की टीम पूरी है।",
      "नितंब और छाती — उसकी छाती पर बैठ जाएँ? पासों ने कहा है।",
      "छाती और हाथ — गले लगना बस शुरू ही होने वाला है।",
      "छाती से छाती — गले मिलने का आधिकारिक बहाना।",
      "छाती और योनि: पहले गले मिलें, फिर शाम तय करेगी।",
      "छाती और जीभ — तारीफ़ों के बाद भी कुछ हो सकता है।",
      "छाती और होंठ — पहले चुंबन से शुरू करें, पासों की सलाह।",
      "लिंग और नितंब — ओह, शाम दिलचस्प लग रही है।",
      "लिंग और हाथ — किसी को हाथों की फुर्ती दिखानी होगी।",
      "लिंग और छाती — पासे गर्म शाम का इशारा कर रहे हैं।",
      "लिंग और योनि — कहानी लगभग तैयार है।",
      "लिंग और जीभ — ओह… आज किसी की किस्मत चमकने वाली है।",
      "लिंग और होंठ — आज पासे इशारे करने में शर्माते नहीं।",
      "अंडकोष और नितंब — रास्ता अनपेक्षित है, पर आत्मविश्वास पूरा।",
      "अंडकोष और हाथ — धीरे से, यह कोई बातचीत की मेज़ नहीं।",
      "अंडकोष और छाती — अनोखी जोड़ी; शाम को सहजता बचाएगी।",
      "अंडकोष और योनि — पासों ने थोड़ी शरारत मिला दी।",
      "अंडकोष और जीभ — आज किसी की योजना काफ़ी साहसी है।",
      "अंडकोष और होंठ — पहले होंठों से कुछ अच्छा सुन लें।",
      "दो नितंब? पासे हँसी और थोड़ी नज़दीकी के पक्ष में हैं।",
      "नितंब और हाथ — हल्की थपकी का प्रस्ताव रखें?",
      "नितंब और छाती — पासों को कहानी में मोड़ पसंद हैं।",
      "नितंब और योनि — कोई मज़ेदार-सा नाच हो जाए?",
      "नितंब और जीभ — पासों का हास्य-बोध आज कमाल का है।",
      "नितंब और होंठ — चुंबन से शुरू करें, आगे मूड तय करेगा।",
    ],
  },
  pt: {
    back: "Voltar", title: "Dados", subtitle: "Dois lançamentos. Uma escolha a dois.", throw: "Lançar os dados", rolling: "Os dados estão rolando…", again: "Lançar novamente", hint: "Deixem o acaso escolher por onde começar",
    male: "Dado masculino", female: "Dado feminino", result: "Resultado dos dados", status: (m, f) => `${m} · ${f}`,
    captions: [
      "Mão e bumbum: os dados sugerem um tapinha de leve?",
      "Duas mãos? Hoje sem intimidade — deem as mãos, romance também conta.",
      "Mão e peito: as apresentações já terminaram.",
      "Mão e vulva: os dados quase mostram onde colocar a mão.",
      "Mão e língua? Hoje vai precisar de coordenação.",
      "Mão e lábios: um beijo com um efeito especial.",
      "Língua e bumbum: hoje a noite não é para conversa fiada.",
      "Língua e mão: equipe formada; escolham o roteiro.",
      "Língua e peito: os dados torcem por beijos com continuação.",
      "Língua e vulva: opa, o acaso passou às indiretas bem diretas.",
      "Duas línguas? Os dados votam em beijos sem palavras.",
      "Língua e lábios: equipe de beijos completa hoje.",
      "Bumbum e peito: que tal sentar no peito dele? Os dados mandaram.",
      "Peito e mão: os abraços estão quase começando.",
      "Peito com peito: motivo oficialmente aprovado para um abraço.",
      "Peito e vulva: comecem com um abraço e vejam o que a noite decide.",
      "Peito e língua: talvez os elogios não sejam a única coisa no roteiro.",
      "Peito e lábios: comecem com um beijo, dizem os dados especialistas.",
      "Pênis e bumbum: opa, a noite promete.",
      "Pênis e mão: alguém vai precisar de mão firme.",
      "Pênis e peito: os dados sugerem uma noite quente.",
      "Pênis e vulva: isso já é quase um roteiro pronto.",
      "Pênis e língua: opa… alguém vai ter sorte hoje.",
      "Pênis e lábios: hoje os dados não têm vergonha de insinuar.",
      "Testículos e bumbum: caminho inesperado, mas cheio de confiança.",
      "Testículos e mão: com carinho — isto não é uma negociação.",
      "Testículos e peito: combinação inusitada; que a improvisação salve a noite.",
      "Testículos e vulva: os dados acrescentaram uma pitada de ousadia.",
      "Testículos e língua: alguém está fazendo planos ousados hoje.",
      "Testículos e lábios: talvez os lábios digam algo agradável primeiro.",
      "Dois bumbuns? Os dados votam em risadas e mais proximidade.",
      "Bumbum e mão: uma palmadinha leve está em discussão?",
      "Bumbum e peito: os dados adoram uma reviravolta.",
      "Bumbum e vulva: que tal uma dança meio engraçada?",
      "Bumbum e língua: os dados estão com ótimo senso de humor.",
      "Bumbum e lábios: comecem com um beijo; o clima decide o resto.",
    ],
  },
  es: {
    back: "Volver", title: "Dados", subtitle: "Dos lanzamientos. Una elección compartida.", throw: "Lanzar los dados", rolling: "Los dados están rodando…", again: "Lanzar otra vez", hint: "Dejen que el azar elija por dónde empezar",
    male: "Dado masculino", female: "Dado femenino", result: "Resultado de los dados", status: (m, f) => `${m} · ${f}`,
    captions: [
      "Mano y trasero: ¿los dados sugieren una palmada suave?",
      "¿Dos manos? Hoy sin intimidad: tóquense las manos, que el romance también cuenta.",
      "Mano y pecho: las presentaciones ya terminaron.",
      "Mano y vulva: los dados casi señalan dónde poner la mano.",
      "¿Mano y lengua? Hoy hará falta coordinación.",
      "Mano y labios: un beso con un pequeño efecto especial.",
      "Lengua y trasero: esta noche no va de conversaciones aburridas.",
      "Lengua y mano: equipo listo; ustedes eligen el guion.",
      "Lengua y pecho: los dados apuestan por besos con continuación.",
      "Lengua y vulva: uy, el azar pasó a las indirectas muy directas.",
      "¿Dos lenguas? Los dados votan por besos sin palabras.",
      "Lengua y labios: el equipo de besos está completo esta noche.",
      "Trasero y pecho: ¿sentarte sobre su pecho, quizá? Lo dicen los dados.",
      "Pecho y mano: los abrazos están a punto de empezar.",
      "Pecho con pecho: motivo oficialmente aprobado para abrazarse.",
      "Pecho y vulva: empiecen con un abrazo y que la noche decida.",
      "Pecho y lengua: puede que los cumplidos no sean lo único del plan.",
      "Pecho y labios: empiecen con un beso, aconsejan los dados expertos.",
      "Pene y trasero: uy, la noche promete.",
      "Pene y mano: alguien necesitará buena destreza manual.",
      "Pene y pecho: los dados insinúan una noche intensa.",
      "Pene y vulva: esto ya parece un guion casi listo.",
      "Pene y lengua: uy… hoy alguien va a tener suerte.",
      "Pene y labios: hoy los dados no se cortan con las indirectas.",
      "Testículos y trasero: una ruta inesperada, pero con confianza.",
      "Testículos y mano: con suavidad, que esto no es una negociación.",
      "Testículos y pecho: combinación curiosa; que la improvisación salve la noche.",
      "Testículos y vulva: los dados añadieron una pizca de picante.",
      "Testículos y lengua: alguien tiene planes atrevidos esta noche.",
      "Testículos y labios: quizá primero que los labios digan algo bonito.",
      "¿Dos traseros? Los dados votan por risas y menos distancia.",
      "Trasero y mano: ¿se propone una palmada suave?",
      "Trasero y pecho: a los dados les encantan los giros inesperados.",
      "Trasero y vulva: ¿y si se marcan un bailecito divertido?",
      "Trasero y lengua: hoy los dados tienen mucho sentido del humor.",
      "Trasero y labios: empiecen con un beso; el momento decidirá lo demás.",
    ],
  },
};

function getJoke(lang: Lang, maleIndex: number, femaleIndex: number): string {
  const caption = COPY[lang].captions[maleIndex * FEMALE_FACES.length + femaleIndex];
  if (!caption) throw new Error(`Missing dice caption for ${lang}: ${maleIndex}, ${femaleIndex}`);
  return caption;
}

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
  const joke = rollNumber > 0 && !rolling ? getJoke(lang, maleIndex, femaleIndex) : "";

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
          <p className="touche-dice__joke" data-testid="text-dice-joke" aria-live="polite">{joke}</p>
        </section>
        <button type="button" className="touche-dice__button" onClick={roll} disabled={rolling} data-testid="button-dice-roll">
          <span className="touche-dice__button-mark" aria-hidden="true"><i /><i /><i /></span>
          {rolling ? copy.rolling : rollNumber ? copy.again : copy.throw}
        </button>
      </div>
    </main>
  );
}
