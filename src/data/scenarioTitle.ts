const ROLE_TITLE_MARKERS: Record<string, RegExp> = {
  ru: /(преподавател|учител|студент|ученик|режисс|акт[её]р|актрис|кастинг|порнокастинг|фотограф|модел|массажист|клиент|начальник|подчинен|слуг|хозяин|врач|медсестр|пациент|полицейск|задержан)/iu,
  en: /(teacher|professor|lecturer|student|director|performer|porn|casting|photographer|model|masseur|masseuse|client|boss|subordinate|servant|master|doctor|nurse|patient|police|prisoner)/iu,
  hi: /(शिक्षक|प्राध्यापक|छात्र|विद्यार्थी|निर्देशक|कलाकार|पोर्न|कास्टिंग|फोटोग्राफर|मॉडल|मालिश|ग्राहक)/u,
  pt: /(professor|professora|aluno|aluna|estudante|diretor|diretora|intérprete|ator|atriz|porn|casting|fotógrafo|fotografo|modelo|massagista|cliente|chefe|servo|serva)/iu,
  es: /(profesor|profesora|alumno|alumna|estudiante|director|directora|intérprete|actor|actriz|porn|casting|fotógrafo|fotografo|modelo|masajista|cliente|jefe|sirviente)/iu,
};

const NEUTRAL_TITLES: Record<string, Record<string, string>> = {
  ru: { romantic: "Случайный момент", passion: "После последнего вопроса", hard: "Позже вечером" },
  en: { romantic: "A Quiet Moment", passion: "One More Question", hard: "After Hours" },
  hi: { romantic: "एक ख़ास पल", passion: "एक और सवाल", hard: "शाम के बाद" },
  pt: { romantic: "Um Momento a Sós", passion: "Mais uma Pergunta", hard: "Depois do Expediente" },
  es: { romantic: "Un Momento a Solas", passion: "Una Pregunta Más", hard: "Después del Cierre" },
};

export function sanitizeScenarioTitle(value: unknown, lang: string, intensity: string): string {
  const title = String(value ?? "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .trim()
    .slice(0, 100);
  const roleMarkers = ROLE_TITLE_MARKERS[lang] ?? ROLE_TITLE_MARKERS.en;
  return !title || roleMarkers.test(title)
    ? NEUTRAL_TITLES[lang]?.[intensity] ?? NEUTRAL_TITLES.en[intensity] ?? "A Private Moment"
    : title;
}