// api/scenario/generate.ts
// POST /api/scenario/generate
// Body: { coupleId, lang, intensity, gender }
//   gender: "male" | "female" — пол того, кто тянет карту (они получат role_a)
// Headers: x-telegram-init-data

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { randomInt } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { validateTelegramInitData } from "../couple/_auth.js";
import { getEffectivePremiumAccess } from "../_premium.js";
import { appDate } from "../limits.js";
import { sanitizeScenarioTitle } from "../../src/data/scenarioTitle.js";

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY!;
const DEEPSEEK_URL = "https://api.deepseek.com/v1/chat/completions";
const BOT_TOKEN = process.env.BOT_TOKEN!;
const APP_URL = process.env.APP_URL!;
const LANGS = new Set(["ru", "en", "hi", "pt", "es"]);
const INTENSITIES = new Set(["romantic", "passion", "hard"]);
const GENDERS = new Set(["male", "female"]);

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char] ?? char));
}

function cleanText(value: unknown, max: number): string {
  return String(value ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, max);
}

const CROSS_CARD_DISCLOSURE = /(?:role[_\s-]?[ab]\s*[:：]|(?:the other|your partner['’]s?)\s+(?:secret|hidden|private)\s+(?:role|goal|instructions|card)|другая карточка|скрытая цель партн[её]ра|секретн\w* инструкц\w* партн[её]ра)/iu;

// ─── Фолбэки разделены по полу инициатора (role_a) ────────────────────────

type FallbackEntry = { title: string; role_a: string; role_b: string };
type FallbackByGender = { male: FallbackEntry; female: FallbackEntry };
type FallbackPool = Record<string, Record<string, FallbackByGender>>;
type TaggedFallbackScenario = FallbackByGender & { variation_tags: string[] };
type GeneratedScenario = FallbackEntry & { variation_tags: string[] };
type ScenarioVariationSignals = {
  recent: string[];
  mutuallyLiked: string[];
  avoid: string[];
};

function sharedFallback(
  title: string,
  role_a: string,
  role_b: string,
  variation_tags: string[],
): TaggedFallbackScenario {
  const entry = { title, role_a, role_b };
  return { male: entry, female: entry, variation_tags };
}

const FALLBACK_VARIATION_TAGS: Record<string, string[]> = {
  romantic: ["setting:home_photoshoot", "dynamic:playful_flirting", "tone:slow_burn"],
  passion: ["setting:university_after_class", "dynamic:playful_resistance", "tone:slow_burn"],
  hard: ["setting:fictional_casting", "dynamic:audition_power_play", "tone:bold"],
};

const FALLBACKS: FallbackPool = {
  romantic: {
    ru: {
      male: {
        title: "Последний кадр",
        role_a: "Ты взрослый фотограф на домашней фотосессии с партнёршей. Используй телефон только как реквизит и ничего не записывай. Предложи несколько поз и задержи взгляд чуть дольше обычного. Спроси: «Снимаю или просто любуюсь?»",
        role_b: "Ты взрослая модель на домашней фотосессии. Меняй позы медленно и отвечай на его взгляд улыбкой. Поддразни его: «Ты снимаешь или уже забыл про камеру?» Сама реши, когда подойти ближе.",
      },
      female: {
        title: "Последний кадр",
        role_a: "Ты взрослая фотограф на домашней фотосессии с партнёром. Используй телефон только как реквизит и ничего не записывай. Предложи несколько поз и задержи взгляд чуть дольше обычного. Спроси: «Снимаю или просто любуюсь?»",
        role_b: "Ты мужчина-модель на домашней фотосессии. Меняй позы медленно и отвечай на её взгляд улыбкой. Поддразни её: «Ты снимаешь или уже забыла про камеру?» Сам реши, когда подойти ближе.",
      },
    },
    en: {
      male: {
        title: "One Last Frame",
        role_a: "You're an adult photographer at a home photoshoot with your partner. Use the phone only as a prop; do not record anything. Suggest a few poses and hold eye contact a little longer than usual. Ask: 'Am I taking a picture, or just admiring you?'",
        role_b: "You're an adult model at a home photoshoot. Change poses slowly and answer his gaze with a small smile. Tease him: 'Are you shooting, or have you forgotten the camera?' Decide when you want to move closer.",
      },
      female: {
        title: "One Last Frame",
        role_a: "You're an adult photographer at a home photoshoot with your partner. Use the phone only as a prop; do not record anything. Suggest a few poses and hold eye contact a little longer than usual. Ask: 'Am I taking a picture, or just admiring you?'",
        role_b: "You're an adult model at a home photoshoot. Change poses slowly and answer her gaze with a small smile. Tease her: 'Are you shooting, or have you forgotten the camera?' Decide when you want to move closer.",
      },
    },
    hi: {
      male: { title: "आख़िरी तस्वीर", role_a: "आप अपने वयस्क साथी के साथ घरेलू फोटोशूट का अभिनय कर रहे फोटोग्राफर हैं। फोन को केवल प्रॉप की तरह रखें और कुछ रिकॉर्ड न करें। उनसे अलग-अलग पोज़ लेने को कहें और नज़र थोड़ी देर रोकें। पूछें: “तस्वीर ले रहा हूँ या बस तुम्हें देख रहा हूँ?”", role_b: "आप घरेलू फोटोशूट का अभिनय कर रही वयस्क मॉडल हैं। धीरे-धीरे पोज़ बदलें और उनकी नज़र का जवाब मुस्कान से दें। उन्हें छेड़ते हुए पूछें: “तस्वीर ले रहे हो या कैमरा भूल गए?” तय करें कि कब पास आना है।" },
      female: { title: "आख़िरी तस्वीर", role_a: "आप अपने वयस्क साथी के साथ घरेलू फोटोशूट का अभिनय कर रही फोटोग्राफर हैं। फोन को केवल प्रॉप की तरह रखें और कुछ रिकॉर्ड न करें। उनसे अलग-अलग पोज़ लेने को कहें और नज़र थोड़ी देर रोकें। पूछें: “तस्वीर ले रही हूँ या बस तुम्हें देख रही हूँ?”", role_b: "आप घरेलू फोटोशूट का अभिनय कर रहे वयस्क मॉडल हैं। धीरे-धीरे पोज़ बदलें और उनकी नज़र का जवाब मुस्कान से दें। उन्हें छेड़ते हुए पूछें: “तस्वीर ले रही हो या कैमरा भूल गई?” तय करें कि कब पास आना है।" },
    },
    pt: {
      male: { title: "Último Retrato", role_a: "Você é um fotógrafo adulto em um ensaio em casa com sua parceira. Use o celular apenas como objeto de cena; não grave nada. Sugira algumas poses e sustente o olhar. Pergunte: “Estou fotografando ou só admirando você?”", role_b: "Você é uma modelo adulta em um ensaio em casa. Mude de pose devagar e responda ao olhar dele com um sorriso. Provoque: “Você está fotografando ou já esqueceu a câmera?” Decida quando quer se aproximar." },
      female: { title: "Último Retrato", role_a: "Você é uma fotógrafa adulta em um ensaio em casa com seu parceiro. Use o celular apenas como objeto de cena; não grave nada. Sugira algumas poses e sustente o olhar. Pergunte: “Estou fotografando ou só admirando você?”", role_b: "Você é um modelo adulto em um ensaio em casa. Mude de pose devagar e responda ao olhar dela com um sorriso. Provoque: “Você está fotografando ou já esqueceu a câmera?” Decida quando quer se aproximar." },
    },
    es: {
      male: { title: "El último retrato", role_a: "Eres un fotógrafo adulto en una sesión en casa con tu pareja. Usa el teléfono solo como accesorio y no grabes nada. Sugiere algunas poses y mantén la mirada. Pregunta: «¿Estoy tomando una foto o simplemente admirándote?»", role_b: "Eres una modelo adulta en una sesión en casa. Cambia de pose despacio y responde a su mirada con una sonrisa. Provócalo: «¿Estás tomando fotos o ya olvidaste la cámara?» Decide cuándo quieres acercarte." },
      female: { title: "El último retrato", role_a: "Eres una fotógrafa adulta en una sesión en casa con tu pareja. Usa el teléfono solo como accesorio y no grabes nada. Sugiere algunas poses y mantén la mirada. Pregunta: «¿Estoy tomando una foto o simplemente admirándote?»", role_b: "Eres un modelo adulto en una sesión en casa. Cambia de pose despacio y responde a su mirada con una sonrisa. Provócala: «¿Estás tomando fotos o ya olvidaste la cámara?» Decide cuándo quieres acercarte." },
    },
  },
  passion: {
    ru: {
      male: {
        title: "После последнего вопроса",
        role_a: "Ты преподаватель-мужчина в университете для взрослых. Попроси совершеннолетнюю студентку задержаться после занятия, чтобы обсудить проект, а затем постепенно переведи разговор в смелый флирт. Делай словесные шаги навстречу, но переходи к близости только после ясного ответного сигнала. Оставь ей возможность направить сцену.",
        role_b: "Ты совершеннолетняя студентка университета. После занятия у тебя есть причина задержаться, но на флирт преподавателя отвечай шутливыми отговорками и колкими репликами. Показывай, что уклонение — часть игры, а не настоящий отказ. Когда захочешь сблизиться, ответь недвусмысленным флиртом и сама сделай первый шаг.",
      },
      female: {
        title: "После последнего вопроса",
        role_a: "Ты преподавательница в университете для взрослых. Попроси совершеннолетнего студента задержаться после занятия, чтобы обсудить проект, а затем постепенно переведи разговор в смелый флирт. Делай словесные шаги навстречу, но переходи к близости только после ясного ответного сигнала. Оставь ему возможность направить сцену.",
        role_b: "Ты совершеннолетний студент университета. После занятия у тебя есть причина задержаться, но на флирт преподавательницы отвечай шутливыми отговорками и колкими репликами. Показывай, что уклонение — часть игры, а не настоящий отказ. Когда захочешь сблизиться, ответь недвусмысленным флиртом и сам сделай первый шаг.",
      },
    },
    en: {
      male: {
        title: "One More Question",
        role_a: "You're an adult male lecturer at a university. Ask your adult female student to stay after class to discuss a project, then let the conversation turn into bold, playful flirting. Make verbal advances, but move toward intimacy only after a clear, positive response. Leave room for her to steer the scene.",
        role_b: "You're an adult female university student. You have a reason to stay after class, but answer the lecturer's flirting with playful excuses and teasing replies. Keep the avoidance clearly acted, not a real refusal. When you want to get closer, show unmistakable interest and make the first move yourself.",
      },
      female: {
        title: "One More Question",
        role_a: "You're an adult female lecturer at a university. Ask your adult male student to stay after class to discuss a project, then let the conversation turn into bold, playful flirting. Make verbal advances, but move toward intimacy only after a clear, positive response. Leave room for him to steer the scene.",
        role_b: "You're an adult male university student. You have a reason to stay after class, but answer the lecturer's flirting with playful excuses and teasing replies. Keep the avoidance clearly acted, not a real refusal. When you want to get closer, show unmistakable interest and make the first move yourself.",
      },
    },
    hi: {
      male: { title: "एक और सवाल", role_a: "आप वयस्कों के विश्वविद्यालय में पुरुष प्राध्यापक हैं। अपनी वयस्क महिला छात्रा से कक्षा के बाद परियोजना पर बात करने के लिए रुकने को कहें, फिर बातचीत को चंचल छेड़छाड़ की ओर ले जाएँ। केवल बोलकर पहल करें और निकटता तभी बढ़ाएँ जब वह साफ़ तौर पर रुचि दिखाए। उसे दृश्य की दिशा तय करने की जगह दें।", role_b: "आप विश्वविद्यालय की वयस्क महिला छात्रा हैं। कक्षा के बाद आपके पास रुकने का कारण है, पर प्राध्यापक की छेड़छाड़ का जवाब मज़ाकिया बहानों और चुटीली बातों से दें। यह टालना अभिनय है, असली इनकार नहीं। जब आप करीब आना चाहें, साफ़ रुचि दिखाएँ और खुद पहला कदम लें।" },
      female: { title: "एक और सवाल", role_a: "आप वयस्कों के विश्वविद्यालय में महिला प्राध्यापिका हैं। अपने वयस्क पुरुष छात्र से कक्षा के बाद परियोजना पर बात करने के लिए रुकने को कहें, फिर बातचीत को चंचल छेड़छाड़ की ओर ले जाएँ। केवल बोलकर पहल करें और निकटता तभी बढ़ाएँ जब वह साफ़ तौर पर रुचि दिखाए। उसे दृश्य की दिशा तय करने की जगह दें।", role_b: "आप विश्वविद्यालय के वयस्क पुरुष छात्र हैं। कक्षा के बाद आपके पास रुकने का कारण है, पर प्राध्यापिका की छेड़छाड़ का जवाब मज़ाकिया बहानों और चुटीली बातों से दें। यह टालना अभिनय है, असली इनकार नहीं। जब आप करीब आना चाहें, साफ़ रुचि दिखाएँ और खुद पहला कदम लें।" },
    },
    pt: {
      male: { title: "Mais uma pergunta", role_a: "Você é um professor adulto em uma universidade. Peça à sua aluna adulta que fique após a aula para conversar sobre um projeto e deixe o papo virar uma provocação ousada e divertida. Tome a iniciativa apenas com palavras e avance para a intimidade somente depois de uma resposta claramente positiva. Deixe que ela também conduza a cena.", role_b: "Você é uma estudante adulta. Você tem um motivo para ficar após a aula, mas responda à provocação do professor com desculpas brincalhonas e respostas provocadoras. A resistência é encenada, não uma recusa real. Quando quiser se aproximar, demonstre interesse sem ambiguidade e tome a iniciativa." },
      female: { title: "Mais uma pergunta", role_a: "Você é uma professora adulta em uma universidade. Peça ao seu aluno adulto que fique após a aula para conversar sobre um projeto e deixe o papo virar uma provocação ousada e divertida. Tome a iniciativa apenas com palavras e avance para a intimidade somente depois de uma resposta claramente positiva. Deixe que ele também conduza a cena.", role_b: "Você é um estudante adulto. Você tem um motivo para ficar após a aula, mas responda à provocação da professora com desculpas brincalhonas e respostas provocadoras. A resistência é encenada, não uma recusa real. Quando quiser se aproximar, demonstre interesse sem ambiguidade e tome a iniciativa." },
    },
    es: {
      male: { title: "Una pregunta más", role_a: "Eres un profesor adulto en una universidad. Pídele a tu alumna adulta que se quede después de clase para hablar de un proyecto y deja que la conversación se vuelva un coqueteo atrevido y juguetón. Toma la iniciativa con palabras y avanza hacia la intimidad solo después de una respuesta claramente positiva. Deja que ella también dirija la escena.", role_b: "Eres una estudiante adulta. Tienes un motivo para quedarte después de clase, pero responde al coqueteo del profesor con excusas juguetonas y réplicas provocadoras. La resistencia es actuada, no un rechazo real. Cuando quieras acercarte, muestra un interés inequívoco y da tú el primer paso." },
      female: { title: "Una pregunta más", role_a: "Eres una profesora adulta en una universidad. Pídele a tu alumno adulto que se quede después de clase para hablar de un proyecto y deja que la conversación se vuelva un coqueteo atrevido y juguetón. Toma la iniciativa con palabras y avanza hacia la intimidad solo después de una respuesta claramente positiva. Deja que él también dirija la escena.", role_b: "Eres un estudiante adulto. Tienes un motivo para quedarte después de clase, pero responde al coqueteo de la profesora con excusas juguetonas y réplicas provocadoras. La resistencia es actuada, no un rechazo real. Cuando quieras acercarte, muestra un interés inequívoco y da tú el primer paso." },
    },
  },
  hard: {
    ru: {
      male: {
        title: "Позже вечером",
        role_a: "Ты совершеннолетний режиссёр вымышленного порнокастинга. Проведи закрытую пробу для совершеннолетней актрисы: попроси выбрать выразительную позу и произнести короткую смелую реплику. Играй уверенно, но помни, что это только ролевая сцена: ничего не снимай и не сохраняй. Переходи к близости только после ясного встречного сигнала.",
        role_b: "Ты совершеннолетняя актриса на вымышленном порнокастинге. Сначала отнесись к пробе профессионально, затем удиви режиссёра своей позой или смелой репликой. Сама решай, что готова разыграть. Когда захочешь перейти к близости, покажи явный интерес и сама задай следующий шаг.",
      },
      female: {
        title: "Позже вечером",
        role_a: "Ты совершеннолетняя режиссёрка вымышленного порнокастинга. Проведи закрытую пробу для совершеннолетнего актёра: попроси выбрать выразительную позу и произнести короткую смелую реплику. Играй уверенно, но помни, что это только ролевая сцена: ничего не снимай и не сохраняй. Переходи к близости только после ясного встречного сигнала.",
        role_b: "Ты совершеннолетний актёр на вымышленном порнокастинге. Сначала отнесись к пробе профессионально, затем удиви режиссёрку своей позой или смелой репликой. Сам решай, что готов разыграть. Когда захочешь перейти к близости, покажи явный интерес и сам задай следующий шаг.",
      },
    },
    en: {
      male: {
        title: "After Hours",
        role_a: "You're an adult director at a fictional porn casting. Run a private screen test with an adult performer: ask for a striking pose and a short, bold line. Keep your delivery confident, but this is roleplay only—do not record or save anything. Move toward intimacy only after a clear, positive cue.",
        role_b: "You're an adult performer at a fictional porn casting. Start by treating the audition professionally, then surprise the director with a pose or bold line of your own. Decide what you are willing to act out. When you want to move toward intimacy, show clear interest and lead the next step yourself.",
      },
      female: {
        title: "After Hours",
        role_a: "You're an adult woman directing a fictional porn casting. Run a private screen test with an adult performer: ask for a striking pose and a short, bold line. Keep your delivery confident, but this is roleplay only—do not record or save anything. Move toward intimacy only after a clear, positive cue.",
        role_b: "You're an adult male performer at a fictional porn casting. Start by treating the audition professionally, then surprise the director with a pose or bold line of your own. Decide what you are willing to act out. When you want to move toward intimacy, show clear interest and lead the next step yourself.",
      },
    },
    hi: {
      male: { title: "शाम के बाद", role_a: "आप एक काल्पनिक वयस्क फ़िल्म ऑडिशन के पुरुष निर्देशक हैं। एक वयस्क कलाकार से प्रभावशाली पोज़ और छोटी, साहसी पंक्ति देने को कहें। यह केवल अभिनय है—कुछ भी रिकॉर्ड या सेव न करें। निकटता तभी बढ़ाएँ जब सामने से साफ़ सकारात्मक संकेत मिले।", role_b: "आप काल्पनिक वयस्क फ़िल्म ऑडिशन के वयस्क महिला कलाकार हैं। पहले ऑडिशन को पेशेवर ढंग से लें, फिर अपनी पोज़ या साहसी पंक्ति से निर्देशक को चौंकाएँ। आप तय करें कि क्या अभिनय करना है। जब निकटता चाहें, स्पष्ट रुचि दिखाएँ और अगला कदम खुद तय करें।" },
      female: { title: "शाम के बाद", role_a: "आप एक काल्पनिक वयस्क फ़िल्म ऑडिशन की महिला निर्देशक हैं। एक वयस्क कलाकार से प्रभावशाली पोज़ और छोटी, साहसी पंक्ति देने को कहें। यह केवल अभिनय है—कुछ भी रिकॉर्ड या सेव न करें। निकटता तभी बढ़ाएँ जब सामने से साफ़ सकारात्मक संकेत मिले।", role_b: "आप काल्पनिक वयस्क फ़िल्म ऑडिशन के वयस्क पुरुष कलाकार हैं। पहले ऑडिशन को पेशेवर ढंग से लें, फिर अपनी पोज़ या साहसी पंक्ति से निर्देशक को चौंकाएँ। आप तय करें कि क्या अभिनय करना है। जब निकटता चाहें, स्पष्ट रुचि दिखाएँ और अगला कदम खुद तय करें।" },
    },
    pt: {
      male: { title: "Depois do expediente", role_a: "Você é um diretor adulto de um casting fictício de filmes adultos. Faça um teste privado com uma artista adulta: peça uma pose marcante e uma fala curta e ousada. É apenas encenação—não grave nem salve nada. Só avance para a intimidade depois de um sinal claramente positivo.", role_b: "Você é uma artista adulta em um casting fictício. Comece tratando o teste com profissionalismo e depois surpreenda o diretor com uma pose ou fala ousada. Decida o que aceita encenar. Quando quiser avançar para a intimidade, demonstre interesse com clareza e conduza o próximo passo." },
      female: { title: "Depois do expediente", role_a: "Você é uma diretora adulta de um casting fictício de filmes adultos. Faça um teste privado com um artista adulto: peça uma pose marcante e uma fala curta e ousada. É apenas encenação—não grave nem salve nada. Só avance para a intimidade depois de um sinal claramente positivo.", role_b: "Você é um artista adulto em um casting fictício. Comece tratando o teste com profissionalismo e depois surpreenda a diretora com uma pose ou fala ousada. Decida o que aceita encenar. Quando quiser avançar para a intimidade, demonstre interesse com clareza e conduza o próximo passo." },
    },
    es: {
      male: { title: "Después del cierre", role_a: "Eres un director adulto de un casting ficticio de cine para adultos. Haz una prueba privada con una intérprete adulta: pídele una pose llamativa y una frase breve y atrevida. Es solo una escena de rol; no grabes ni guardes nada. Avanza hacia la intimidad solo después de una señal claramente positiva.", role_b: "Eres una intérprete adulta en un casting ficticio. Empieza tratando la prueba con profesionalidad y luego sorprende al director con una pose o frase atrevida. Decide qué quieres representar. Cuando quieras avanzar hacia la intimidad, muestra interés con claridad y guía tú el siguiente paso." },
      female: { title: "Después del cierre", role_a: "Eres una directora adulta de un casting ficticio de cine para adultos. Haz una prueba privada con un intérprete adulto: pídele una pose llamativa y una frase breve y atrevida. Es solo una escena de rol; no grabes ni guardes nada. Avanza hacia la intimidad solo después de una señal claramente positiva.", role_b: "Eres un intérprete adulto en un casting ficticio. Empieza tratando la prueba con profesionalidad y luego sorprende a la directora con una pose o frase atrevida. Decide qué quieres representar. Cuando quieras avanzar hacia la intimidad, muestra interés con claridad y guía tú el siguiente paso." },
    },
  },
};

const EXTRA_SCENARIO_FALLBACKS: Record<string, Record<string, TaggedFallbackScenario[]>> = {
  romantic: {
    ru: [sharedFallback("Последний поезд",
      "ТВОЁ ЗАДАНИЕ: Познакомься со взрослым попутчиком в последнем поезде и реши, стоит ли продолжить встречу.\nТВОЯ РОЛЬ: Ты едешь после долгого дня; выбери обычный дорожный образ и оставь одну историю при себе.\nПЕРВЫЙ ШАГ: Предложи соседу место у окна и спроси: «Ты тоже не хочешь, чтобы поездка заканчивалась?»",
      "ТВОЁ ЗАДАНИЕ: Поддержи разговор со взрослым попутчиком и постепенно покажи, что тебе приятно его внимание.\nТВОЯ РОЛЬ: Ты возвращаешься с концерта; выбери любимую деталь одежды и сохрани свой повод для поездки.\nПЕРВЫЙ ШАГ: Покажи билет и улыбнись: «Похоже, у нас ещё будет время познакомиться».",
      ["setting:late_train", "dynamic:chance_meeting", "tone:curious"])],
    en: [sharedFallback("The Last Train",
      "YOUR TASK: Meet an adult fellow passenger on the last train and decide whether to extend the encounter.\nYOUR ROLE: You are traveling after a long day; choose an everyday coat and keep one story to yourself.\nFIRST MOVE: Offer the window seat and ask, “Do you wish this ride were longer?”",
      "YOUR TASK: Keep the conversation with an adult fellow traveler going and show that their attention is welcome.\nYOUR ROLE: You are returning from a concert; choose one favorite outfit detail and keep your reason for traveling private.\nFIRST MOVE: Show your ticket and smile: “Looks like we still have time to meet.”",
      ["setting:late_train", "dynamic:chance_meeting", "tone:curious"])],
    hi: [sharedFallback("आख़िरी ट्रेन",
      "आपका काम: आख़िरी ट्रेन में एक वयस्क सहयात्री से मिलें और तय करें कि मुलाक़ात आगे बढ़ानी है या नहीं।\nआपकी भूमिका: आप लंबे दिन के बाद यात्रा कर रहे हैं; घर के कपड़ों से साधारण यात्रा वाला रूप चुनें।\nपहला कदम: खिड़की वाली सीट दें और पूछें, “क्या आप भी चाहते हैं कि यह सफ़र थोड़ा और चले?”",
      "आपका काम: वयस्क सहयात्री से बातचीत जारी रखें और दिखाएँ कि उनका ध्यान आपको अच्छा लग रहा है।\nआपकी भूमिका: आप एक संगीत कार्यक्रम से लौट रहे हैं; पहनावे की अपनी पसंदीदा चीज़ चुनें और यात्रा का कारण निजी रखें।\nपहला कदम: टिकट दिखाकर मुस्कराएँ, “लगता है, हमारे पास परिचय का समय है।”",
      ["setting:late_train", "dynamic:chance_meeting", "tone:curious"])],
    pt: [sharedFallback("O Último Trem",
      "SUA TAREFA: Conheça uma pessoa adulta no último trem e decida se quer prolongar o encontro.\nSEU PAPEL: Você viaja depois de um dia longo; escolha um casaco comum e guarde uma história para si.\nPRIMEIRO PASSO: Ofereça o lugar perto da janela e pergunte: “Também queria que a viagem durasse mais?”",
      "SUA TAREFA: Continue a conversa com uma pessoa adulta e mostre que a atenção dela é bem-vinda.\nSEU PAPEL: Você está voltando de um show; escolha um detalhe favorito da roupa e mantenha seu motivo em segredo.\nPRIMEIRO PASSO: Mostre a passagem e sorria: “Parece que ainda temos tempo para nos conhecer.”",
      ["setting:late_train", "dynamic:chance_meeting", "tone:curious"])],
    es: [sharedFallback("El Último Tren",
      "TU TAREA: Conoce a una persona adulta en el último tren y decide si quieres prolongar el encuentro.\nTU ROL: Viajas después de un día largo; elige un abrigo cotidiano y guarda una historia para ti.\nPRIMER PASO: Ofrece el asiento junto a la ventana y pregunta: «¿También quieres que el viaje dure más?»",
      "TU TAREA: Sigue conversando con una persona adulta y muestra que su atención te agrada.\nTU ROL: Vuelves de un concierto; elige un detalle favorito de tu ropa y reserva para ti el motivo del viaje.\nPRIMER PASO: Enseña tu billete y sonríe: «Parece que aún tenemos tiempo para conocernos».",
      ["setting:late_train", "dynamic:chance_meeting", "tone:curious"])],
  },
  passion: {
    ru: [sharedFallback("После закрытия бара",
      "ТВОЁ ЗАДАНИЕ: Продолжи знакомство со взрослым музыкантом в пустом баре отеля; после ясной взаимности перейди к ласкам гениталий руками.\nТВОЯ РОЛЬ: Ты — гость отеля после концерта; надень рубашку из своего шкафа и не раскрывай, почему задержался.\nПЕРВЫЙ ШАГ: Подвинь бокал ближе и скажи: «Кажется, вечер ещё не закончился».",
      "ТВОЁ ЗАДАНИЕ: Ответь на флирт взрослого гостя; после ясного взаимного сигнала направь его руку к своим гениталиям.\nТВОЯ РОЛЬ: Ты — музыкант, закончивший выступление; выбери сценическую деталь из одежды и прибереги личный повод для разговора.\nПЕРВЫЙ ШАГ: Сними пиджак, коснись его руки и спроси: «Ты всегда так внимательно слушаешь музыку?»",
      ["setting:hotel_bar", "dynamic:mutual_seduction", "tone:sensual"])],
    en: [sharedFallback("After the Bar Closes",
      "YOUR TASK: Continue meeting an adult musician in the quiet hotel bar; after clear mutual interest, begin intimate hand stimulation.\nYOUR ROLE: You are a hotel guest after a concert; choose a shirt you own and keep your reason for staying private.\nFIRST MOVE: Slide your glass closer and say, “I don't think the evening is over yet.”",
      "YOUR TASK: Answer an adult guest's flirting; after a clear mutual cue, guide their hand toward your genitals.\nYOUR ROLE: You are a musician after the show; choose one stage-inspired clothing detail and keep a personal story for later.\nFIRST MOVE: Remove your jacket, touch their hand, and ask, “Do you always listen this closely?”",
      ["setting:hotel_bar", "dynamic:mutual_seduction", "tone:sensual"])],
    hi: [sharedFallback("बार बंद होने के बाद",
      "आपका काम: होटल के शांत बार में एक वयस्क संगीतकार से मिलना जारी रखें; स्पष्ट आपसी रुचि के बाद हाथों से अंतरंग स्पर्श शुरू करें।\nआपकी भूमिका: आप संगीत कार्यक्रम के बाद होटल के मेहमान हैं; अपनी कमीज़ चुनें और रुकने का कारण निजी रखें।\nपहला कदम: अपना गिलास पास रखें और कहें, “लगता है, शाम अभी खत्म नहीं हुई।”",
      "आपका काम: वयस्क मेहमान के फ़्लर्ट का जवाब दें; स्पष्ट आपसी संकेत के बाद उनका हाथ अपने जननांगों की ओर ले जाएँ।\nआपकी भूमिका: आप कार्यक्रम के बाद संगीतकार हैं; घर की पोशाक से एक मंच वाला रूप चुनें और अपनी निजी कहानी बाद के लिए रखें।\nपहला कदम: जैकेट उतारें, उनका हाथ छुएँ और पूछें, “क्या आप हमेशा इतनी ध्यान से सुनते हैं?”",
      ["setting:hotel_bar", "dynamic:mutual_seduction", "tone:sensual"])],
    pt: [sharedFallback("Depois que o Bar Fecha",
      "SUA TAREFA: Continue conhecendo uma pessoa adulta no bar tranquilo do hotel; após um sinal mútuo claro, comece carícias íntimas com as mãos.\nSEU PAPEL: Você é hóspede depois de um show; escolha uma camisa que já tenha e guarde para si o motivo de ficar.\nPRIMEIRO PASSO: Aproxime o copo e diga: “Acho que a noite ainda não acabou.”",
      "SUA TAREFA: Responda ao flerte de uma pessoa adulta; após um sinal mútuo claro, guie a mão dela até seus genitais.\nSEU PAPEL: Você é músico depois do show; escolha um detalhe de roupa inspirado no palco e deixe uma história para depois.\nPRIMEIRO PASSO: Tire o casaco, toque a mão da pessoa e pergunte: “Você sempre escuta com tanta atenção?”",
      ["setting:hotel_bar", "dynamic:mutual_seduction", "tone:sensual"])],
    es: [sharedFallback("Cuando Cierra el Bar",
      "TU TAREA: Sigue conociendo a una persona adulta en el bar tranquilo del hotel; tras una señal mutua clara, inicia caricias íntimas con las manos.\nTU ROL: Eres huésped después de un concierto; elige una camisa que ya tengas y guarda para ti el motivo de quedarte.\nPRIMER PASO: Acerca tu vaso y di: «Creo que la noche aún no ha terminado».",
      "TU TAREA: Responde al coqueteo de una persona adulta; tras una señal mutua clara, guía su mano hacia tus genitales.\nTU ROL: Eres músico después del concierto; elige un detalle de ropa inspirado en el escenario y reserva una historia para después.\nPRIMER PASO: Quítate la chaqueta, toca su mano y pregunta: «¿Siempre escuchas con tanta atención?»",
      ["setting:hotel_bar", "dynamic:mutual_seduction", "tone:sensual"])],
  },
  hard: {
    ru: [
      sharedFallback("Вопросы после смены",
        "ТВОЁ ЗАДАНИЕ: Вымышленно проведи допрос взрослого партнёра в домашнем «участке»; по ясному сигналу направь его руку к своим гениталиям.\nТВОЯ РОЛЬ: Ты — инспектор только в игре; используй рубашку и бумажный бейдж, не изображая реальную власть.\nПЕРВЫЙ ШАГ: Положи блокнот на стол и скажи: «У меня остался один личный вопрос».",
        "ТВОЁ ЗАДАНИЕ: Вымышленно сыграй посетителя участка и после ясного сигнала стимулируй гениталии партнёра рукой по его команде.\nТВОЯ РОЛЬ: Ты — взрослый собеседник инспектора; выбери тёмную рубашку и сам решай, как далеко вести сцену.\nПЕРВЫЙ ШАГ: Подвинь стул ближе и спроси: «А если теперь вопросы задаю я?»",
        ["setting:fictional_station", "dynamic:adult_interrogation", "tone:commanding"]),
      sharedFallback("Десять минут правил",
        "ТВОЁ ЗАДАНИЕ: Предложи взрослому партнёру десятиминутную игру с добровольным подчинением; попроси стимулировать твои гениталии рукой по коротким командам.\nТВОЯ РОЛЬ: Ты задаёшь темп и правила игры; надень строгую домашнюю одежду и оставь партнёру право остановиться.\nПЕРВЫЙ ШАГ: Протяни ладонь и скажи: «Сегодня ты выбираешь, как именно меня слушаться».",
        "ТВОЁ ЗАДАНИЕ: Добровольно прими роль подчинённого на десять минут и стимулируй гениталии партнёра рукой, следуя его командам.\nТВОЯ РОЛЬ: Ты сам выбираешь границы и степень смелости; надень удобную одежду и не используй настоящие ограничения движений.\nПЕРВЫЙ ШАГ: Встань ближе и спроси: «Какое будет первое правило?»",
        ["setting:private_suite", "dynamic:consensual_submission", "tone:bold"]),
    ],
    en: [
      sharedFallback("One More Question",
        "YOUR TASK: Stage a fictional interview at home with an adult partner; after a clear cue, guide their hand toward your genitals.\nYOUR ROLE: You are an investigator only in the game; use a shirt and paper badge, never real authority.\nFIRST MOVE: Set down a notebook and say, “I have one more personal question.”",
        "YOUR TASK: Play an adult visitor in a fictional station and, after a clear cue, stimulate your partner's genitals by hand on request.\nYOUR ROLE: You are the investigator's adult visitor; choose a dark shirt and decide how far the scene goes.\nFIRST MOVE: Move the chair closer and ask, “What if I'm the one asking questions now?”",
        ["setting:fictional_station", "dynamic:adult_interrogation", "tone:commanding"]),
      sharedFallback("Ten Minutes of Rules",
        "YOUR TASK: Invite your adult partner into a ten-minute consensual submission game; ask them to stimulate your genitals by hand on short commands.\nYOUR ROLE: You set the pace and rules; choose a neat outfit you own and leave room to stop.\nFIRST MOVE: Offer your hand and say, “Tonight, you decide how you follow my lead.”",
        "YOUR TASK: Choose the submissive role for ten minutes and stimulate your partner's genitals by hand, following their requests.\nYOUR ROLE: You choose your own limits and intensity; wear comfortable clothes and use no real restraints.\nFIRST MOVE: Step closer and ask, “What's the first rule?”",
        ["setting:private_suite", "dynamic:consensual_submission", "tone:bold"]),
    ],
    hi: [
      sharedFallback("ड्यूटी के बाद का सवाल",
        "आपका काम: घर पर एक वयस्क साथी के साथ काल्पनिक पूछताछ करें; साफ़ संकेत मिलने पर उनका हाथ अपने जननांगों तक ले जाएँ।\nआपकी भूमिका: आप केवल अभिनय में जाँच अधिकारी हैं; कमीज़ और काग़ज़ का बैज रखें, असली अधिकार नहीं।\nपहला कदम: नोटबुक रखें और कहें, “एक निजी सवाल अभी बाकी है।”",
        "आपका काम: काल्पनिक थाने में वयस्क आगंतुक की भूमिका निभाएँ और साफ़ संकेत के बाद साथी के जननांगों को हाथ से सहलाएँ।\nआपकी भूमिका: आप जाँच अधिकारी के वयस्क साथी हैं; गहरी कमीज़ चुनें और तय करें कि दृश्य कितना आगे जाए।\nपहला कदम: कुर्सी पास खिसकाएँ और पूछें, “अगर अब सवाल मैं पूछूँ तो?”",
        ["setting:fictional_station", "dynamic:adult_interrogation", "tone:commanding"]),
      sharedFallback("दस मिनट के नियम",
        "आपका काम: वयस्क साथी को दस मिनट की स्वैच्छिक समर्पण-भूमिका दें और छोटे निर्देशों पर अपने जननांगों को हाथ से सहलाने को कहें।\nआपकी भूमिका: आप गति और नियम तय करते हैं; घर की सुथरी पोशाक पहनें और रुकने की गुंजाइश रखें।\nपहला कदम: हाथ आगे करके कहें, “आज तुम मेरी बात कैसे मानोगे, यह तुम तय करो।”",
        "आपका काम: दस मिनट के लिए स्वेच्छा से समर्पण की भूमिका लें और साथी के निर्देश पर उसके जननांगों को हाथ से सहलाएँ।\nआपकी भूमिका: अपनी सीमा और तीव्रता खुद चुनें; आरामदायक कपड़े पहनें और असली बंधन न इस्तेमाल करें।\nपहला कदम: पास आकर पूछें, “पहला नियम क्या है?”",
        ["setting:private_suite", "dynamic:consensual_submission", "tone:bold"]),
    ],
    pt: [
      sharedFallback("Mais Uma Pergunta",
        "SUA TAREFA: Encene uma entrevista fictícia em casa com uma pessoa adulta; após um sinal claro, conduza a mão dela até seus genitais.\nSEU PAPEL: Você é investigador apenas na brincadeira; use uma camisa e um crachá de papel, sem autoridade real.\nPRIMEIRO PASSO: Coloque um caderno na mesa e diga: “Ainda tenho uma pergunta pessoal.”",
        "SUA TAREFA: Interprete uma pessoa adulta na delegacia fictícia e, após um sinal claro, estimule os genitais do parceiro com a mão, conforme combinado.\nSEU PAPEL: Você é visitante adulto do investigador; escolha uma camisa escura e decida até onde a cena vai.\nPRIMEIRO PASSO: Aproxime a cadeira e pergunte: “E se agora eu fizer as perguntas?”",
        ["setting:fictional_station", "dynamic:adult_interrogation", "tone:commanding"]),
      sharedFallback("Dez Minutos de Regras",
        "SUA TAREFA: Convide seu par adulto para dez minutos de submissão consensual e peça que estimule seus genitais com a mão sob comandos curtos.\nSEU PAPEL: Você conduz o ritmo e as regras; escolha uma roupa alinhada que já tenha e mantenha a opção de parar.\nPRIMEIRO PASSO: Estenda a mão e diga: “Hoje, você decide como vai seguir minha orientação.”",
        "SUA TAREFA: Escolha o papel submisso por dez minutos e estimule os genitais do parceiro com a mão, seguindo os pedidos dele.\nSEU PAPEL: Você escolhe seus limites e a intensidade; use roupa confortável e não use restrições reais.\nPRIMEIRO PASSO: Chegue mais perto e pergunte: “Qual é a primeira regra?”",
        ["setting:private_suite", "dynamic:consensual_submission", "tone:bold"]),
    ],
    es: [
      sharedFallback("Una Pregunta Más",
        "TU TAREA: Representa una entrevista ficticia en casa con una persona adulta; tras una señal clara, guía su mano hacia tus genitales.\nTU ROL: Eres investigador solo en el juego; usa una camisa y una placa de papel, nunca autoridad real.\nPRIMER PASO: Deja una libreta sobre la mesa y di: «Me queda una pregunta personal».",
        "TU TAREA: Interpreta a una persona adulta en la comisaría ficticia y, tras una señal clara, estimula con la mano los genitales de tu pareja.\nTU ROL: Eres visitante adulto del investigador; elige una camisa oscura y decide hasta dónde llega la escena.\nPRIMER PASO: Acerca la silla y pregunta: «¿Y si ahora hago yo las preguntas?»",
        ["setting:fictional_station", "dynamic:adult_interrogation", "tone:commanding"]),
      sharedFallback("Diez Minutos de Reglas",
        "TU TAREA: Invita a tu pareja adulta a diez minutos de sumisión consensuada y pídele que estimule tus genitales con la mano siguiendo órdenes breves.\nTU ROL: Marcas el ritmo y las reglas; elige ropa formal que ya tengas y deja abierta la opción de parar.\nPRIMER PASO: Extiende la mano y di: «Esta noche tú decides cómo seguir mis indicaciones».",
        "TU TAREA: Elige el papel sumiso durante diez minutos y estimula con la mano los genitales de tu pareja según sus indicaciones.\nTU ROL: Tú eliges tus límites e intensidad; ponte ropa cómoda y no uses sujeciones reales.\nPRIMER PASO: Acércate y pregunta: «¿Cuál es la primera regla?»",
        ["setting:private_suite", "dynamic:consensual_submission", "tone:bold"]),
    ],
  },
};

function getFallback(
  intensity: string,
  lang: string,
  gender: string,
  signals: ScenarioVariationSignals,
): GeneratedScenario {
  const pool = FALLBACKS[intensity] ?? FALLBACKS.passion;
  const byLang = pool[lang] ?? pool["en"];
  const selectedGender = gender === "female" ? "female" : "male";
  const additional = (EXTRA_SCENARIO_FALLBACKS[intensity]?.[lang] ?? []).map((scenario) => ({
      ...scenario[selectedGender],
      variation_tags: scenario.variation_tags,
    }));
  const original: GeneratedScenario = {
    ...byLang[selectedGender],
    variation_tags: FALLBACK_VARIATION_TAGS[intensity] ?? [],
  };
  const candidates = [...additional, original];
  const avoidedTags = new Set([...signals.recent, ...signals.avoid]);
  const freshAdditional = additional.filter((candidate) =>
    !candidate.variation_tags.some((tag) => avoidedTags.has(tag))
  );
  const fresh = candidates.filter((candidate) =>
    !candidate.variation_tags.some((tag) => avoidedTags.has(tag))
  );
  const choices = freshAdditional.length ? freshAdditional : (fresh.length ? fresh : candidates);
  return choices[randomInt(choices.length)];
}

function cleanVariationTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value
    .map((tag) => String(tag ?? "").toLowerCase().trim().replace(/[^a-z0-9:_-]/g, "_").replace(/_+/g, "_").slice(0, 48))
    .filter((tag) => /^(setting|dynamic|tone|hook):[a-z0-9_-]{2,40}$/.test(tag)))]
    .slice(0, 6);
}

async function getScenarioVariationSignals(coupleId: string): Promise<ScenarioVariationSignals> {
  const { data: sessions, error: sessionsError } = await supabase
    .from("scenario_sessions")
    .select("id,variation_tags,resonance_eligible,resonance_feedback_processed_at")
    .eq("couple_id", coupleId)
    .order("created_at", { ascending: false })
    .limit(8);
  if (sessionsError) throw sessionsError;

  const recent = (sessions ?? []).flatMap((session) => cleanVariationTags(session.variation_tags));
  const ratedSessionIds = (sessions ?? [])
    .filter((session) => session.resonance_eligible && session.resonance_feedback_processed_at)
    .map((session) => session.id);
  if (!ratedSessionIds.length) {
    return { recent: [...new Set(recent)].slice(0, 18), mutuallyLiked: [], avoid: [] };
  }

  const { data: feedback, error: feedbackError } = await supabase
    .from("scenario_resonance_feedback")
    .select("session_id,rating")
    .in("session_id", ratedSessionIds);
  if (feedbackError) throw feedbackError;

  const ratingsBySession = new Map<string, number[]>();
  for (const row of feedback ?? []) {
    if (typeof row.rating !== "number") continue;
    const ratings = ratingsBySession.get(row.session_id) ?? [];
    ratings.push(row.rating);
    ratingsBySession.set(row.session_id, ratings);
  }

  const tagsBySession = new Map((sessions ?? []).map((session) => [
    session.id,
    cleanVariationTags(session.variation_tags),
  ]));
  const mutuallyLiked: string[] = [];
  const avoid: string[] = [];
  for (const sessionId of ratedSessionIds) {
    const ratings = ratingsBySession.get(sessionId) ?? [];
    const tags = tagsBySession.get(sessionId) ?? [];
    if (ratings.length === 2 && ratings.every((rating) => rating >= 4)) {
      mutuallyLiked.push(...tags);
    }
    if (ratings.some((rating) => rating <= 2)) {
      avoid.push(...tags);
    }
  }

  return {
    recent: [...new Set(recent)].slice(0, 18),
    mutuallyLiked: [...new Set(mutuallyLiked)].slice(0, 12),
    avoid: [...new Set(avoid)].slice(0, 12),
  };
}

function variationContext(lang: string, signals: ScenarioVariationSignals): string {
  const instructions = lang === "ru"
    ? "Придумай свежую сцену, не выбирай из фиксированного меню. Меняй роли, место, повод, баланс инициативы и эмоциональный тон. Не повторяй недавние сочетания. Элементы, которые обоим партнёрам понравились, можно иногда вернуть, но сочетай их с несколькими новыми элементами. Избегай элементов, которые кому-то из партнёров не подошли. Эти метки и оценки — только внутренний контекст модели: никогда не упоминай их и не раскрывай чужой отклик в карточках."
    : "Invent a fresh scene instead of choosing from a fixed menu. Vary the roles, setting, trigger, balance of initiative, and emotional tone. Do not repeat recent combinations. You may occasionally revisit an element both partners liked, but combine it with several new elements. Avoid elements that either partner rated poorly. These tags and ratings are private model context: never mention them or reveal the other partner's response in either card.";
  const lines = [instructions];
  if (signals.recent.length) lines.push(`Recent elements to vary away from: ${signals.recent.join(", ")}.`);
  if (signals.mutuallyLiked.length) lines.push(`Elements both partners liked before (use sparingly with fresh combinations): ${signals.mutuallyLiked.join(", ")}.`);
  if (signals.avoid.length) lines.push(`Avoid these previously low-rated elements: ${signals.avoid.join(", ")}.`);
  return lines.join("\n");
}

// ─── Персоны ─────────────────────────────────────────────────────────────────

const PERSONA_RU = `Ты — автор насыщенных, но коротких ролевых сценариев для взрослых пар. Дай ясную завязку, выразительные роли, костюмные детали и последовательное развитие сцены; не ограничивайся разговором.`;

const PERSONA_EN = `You write vivid but concise roleplay scenarios for adult couples. Give each scene a clear hook, distinct roles, costume details, and a progressing action arc; do not reduce it to conversation.`;

// ─── Гендерный контекст ───────────────────────────────────────────────────────

function genderContextRu(gender: string): string {
  return gender === "female"
    ? `Оба персонажа совершеннолетние. role_a — женщина, которая тянет сценарий; role_b — её совершеннолетний партнёр-мужчина. Пиши с учётом этих ролей.`
    : `Оба персонажа совершеннолетние. role_a — мужчина, который тянет сценарий; role_b — его совершеннолетняя партнёрша. Пиши с учётом этих ролей.`;
}

function genderContextEn(gender: string): string {
  return gender === "female"
    ? `Both characters are adults. role_a is a woman who draws the scenario; role_b is her adult male partner.`
    : `Both characters are adults. role_a is a man who draws the scenario; role_b is his adult female partner.`;
}

// ─── Системные промпты ────────────────────────────────────────────────────────

const ROLE_LIST_EN = `
Scenario ideas are examples, not a fixed menu:
- romantic: an intriguing first meeting, private dance, late-night neighbors, or a playful at-home performance.
- passion: an after-hours hotel encounter, a fictional adult police-station interrogation that turns flirtatious, or an original adult seduction.
- hard: fictional adult-film casting, consensual dominant/submissive roles, an adult police-station fantasy, or another bold power dynamic.
Invent many different role pairings and premises. Do not default to photographer/model, lecturer/student, or casting. Never use minors, schoolchildren, or characters whose age is unclear.

Intensity:
- romantic: intrigue and flirting, no explicit sexual content.
- passion: build from a specific story hook into sensual, physical intimacy; include a clear act such as oral pleasure, tongue on nipples, intimate touch, a toy, or intercourse—not only flirting or dialogue.
- hard: use a bold, clearly fictional adult power dynamic and a named sexual act such as oral pleasure, intimate stimulation, a toy, or intercourse; submission is optional, bounded, and mutually chosen.

Private-card rules:
- Return one neutral title and two separate role cards. Both partners see the title, so it must not name roles, the pairing, or either character's secret goal.
- role_a is only for the initiator; role_b is only for the partner. Address each reader as “you”; give only that character's role, private objective, opening move, actions, and lines.
- Never reveal, summarize, or give instructions from the other card. The cards should complement each other without disclosing one another's private plan.
- If you use teacher/student, both characters are adults at a university. Resistance is acted, never a real refusal; intimacy begins only after clear reciprocation. Never tell a character to ignore a real no, silence, hesitation, or stop.
- Casting is fictional: no actual recording, image capture, or saved material.

Every scene needs a simple outfit or costume suggestion made from clothes the couple already owns; never require purchases. Give the story a clear sequence: hook, rising tension, physical escalation, and a satisfying stopping point. Keep role objectives private and complementary.

Write exactly three labeled sections per card, in the order specified by CARD_FORMAT. The task section comes first and immediately names the scene hook and the reader's main action. The role section gives character, outfit, and private objective. The first-move section gives one playable action and a natural spoken line. Use one or two concise sentences per section; keep the whole card vivid and easy to scan, not clipped to a word-count quota. For passion and hard, both cards must contain concrete physical actions; neither may end at talking about desire. Actions must be feasible at home without purchases, risky props, real restraint, or actual recording.
Add 3–6 private variation_tags as short lowercase English slugs prefixed by setting:, dynamic:, tone:, or hook:. Describe broad scene elements only, not names, ages, or private card objectives. Tags are internal metadata and must never appear in either role card or title.
Return ONLY valid JSON: {"title":"...","role_a":"...","role_b":"...","variation_tags":["setting:...","dynamic:...","tone:..."]}`;

const ROLE_LIST_RU = `
Идеи сцен:
Примеры — не фиксированный список:
- romantic: интригующее знакомство, приватный танец, поздняя встреча соседей или домашнее выступление.
- passion: встреча в отеле после закрытия, вымышленный допрос в полицейском участке с флиртом или оригинальное взрослое соблазнение.
- hard: вымышленный порнокастинг, согласованные роли доминирующего и подчинённого, фантазия о полицейском участке или другая смелая динамика власти.
Придумывай разные пары ролей и завязки. Не зацикливайся на фотографе/модели, преподавателе/студенте или кастинге. Не используй несовершеннолетних, школьников или персонажей с неясным возрастом.

Уровни:
- romantic: игривая интрига и флирт без сексуальных действий.
- passion: развивай ясную завязку до чувственной физической близости; назови оральные ласки, ласки сосков языком, интимные прикосновения, игрушку или секс — не ограничивайся флиртом и разговором.
- hard: используй смелую вымышленную динамику власти взрослых и назови сексуальное действие: оральные ласки, интимную стимуляцию, игрушку или секс; подчинение — только по взаимному выбору и с ограничениями.

Правила скрытых карточек:
- Верни одно нейтральное название и две отдельные карточки. Название увидят оба, поэтому в нём нельзя называть роли, их пару или скрытую цель персонажа.
- role_a предназначена только инициатору, role_b — только партнёру. Обращайся к читателю карточки на «ты» и описывай только его роль, личную цель, начало сцены, действия и реплики.
- Не раскрывай и не пересказывай инструкции или тайную цель другой карточки. Карточки должны сочетаться, но не выдавать планы друг друга.
- Если выбрана сцена «преподаватель и студент», оба персонажа — взрослые участники университета. Сопротивление — только игровая роль; близость начинается после ясной взаимности. Нельзя приказывать игнорировать настоящий отказ, молчание, сомнение или стоп-сигнал.
- Кастинг — только вымышленная ролевая сцена: никаких реальных записей, фото или сохранения материалов.

В каждой сцене предложи простой костюм или образ из одежды, которая уже есть дома; не требуй покупок. Выстрой ход сцены: завязка, нарастание напряжения, физическое сближение и понятная точка остановки. Личные цели персонажей должны быть разными, но совместимыми, и оставаться скрытыми от партнёра.

В каждой карточке ровно три раздела с заголовками из CARD_FORMAT и в указанном порядке. В первом разделе сразу назови завязку и главное действие читателя. Во втором дай роль, одежду и личную цель. В третьем предложи выполнимый первый шаг и естественную реплику. В каждом разделе можно написать одно-два коротких предложения; не обрезай текст до лимита слов. Для passion и hard обе карточки должны содержать конкретные физические действия — не заканчивай сцену одним разговором о желании. Всё должно быть выполнимо дома, без покупок, опасного реквизита, реального связывания и настоящей записи.
Добавь 3–6 приватных variation_tags: короткие строчные английские теги с префиксом setting:, dynamic:, tone: или hook:. Описывай только общие элементы сцены — без имён, возраста и тайных целей карточек. Теги нужны только для внутреннего разнообразия и не должны попадать в название или карточки.
Верни ТОЛЬКО JSON: {"title":"...","role_a":"...","role_b":"...","variation_tags":["setting:...","dynamic:...","tone:..."]}`;

const CARD_FORMAT: Record<string, string> = {
  ru: `CARD_FORMAT: In each role string, return exactly these three sections in this order, each on its own line, with plain text labels and a colon: "ТВОЁ ЗАДАНИЕ:", "ТВОЯ РОЛЬ:", "ПЕРВЫЙ ШАГ:". The first section must state the reader's concrete action. Do not use markdown or add other headings.`,
  en: `CARD_FORMAT: In each role string, return exactly these three sections in this order, each on its own line, with plain text labels and a colon: "YOUR TASK:", "YOUR ROLE:", "FIRST MOVE:". The first section must state the reader's concrete action. Do not use markdown or add other headings.`,
  hi: `CARD_FORMAT: In each role string, return exactly these three sections in this order, each on its own line, with plain text labels and a colon: "आपका काम:", "आपकी भूमिका:", "पहला कदम:". The first section must state the reader's concrete action. Do not use markdown or add other headings.`,
  pt: `CARD_FORMAT: In each role string, return exactly these three sections in this order, each on its own line, with plain text labels and a colon: "SUA TAREFA:", "SEU PAPEL:", "PRIMEIRO PASSO:". The first section must state the reader's concrete action. Do not use markdown or add other headings.`,
  es: `CARD_FORMAT: In each role string, return exactly these three sections in this order, each on its own line, with plain text labels and a colon: "TU TAREA:", "TU ROL:", "PRIMER PASO:". The first section must state the reader's concrete action. Do not use markdown or add other headings.`,
};

const SCENARIO_SECTION_LABELS: Record<string, [string, string, string]> = {
  ru: ["ТВОЁ ЗАДАНИЕ:", "ТВОЯ РОЛЬ:", "ПЕРВЫЙ ШАГ:"],
  en: ["YOUR TASK:", "YOUR ROLE:", "FIRST MOVE:"],
  hi: ["आपका काम:", "आपकी भूमिका:", "पहला कदम:"],
  pt: ["SUA TAREFA:", "SEU PAPEL:", "PRIMEIRO PASSO:"],
  es: ["TU TAREA:", "TU ROL:", "PRIMER PASO:"],
};

function hasStructuredRoleCard(text: string, lang: string): boolean {
  const labels = SCENARIO_SECTION_LABELS[lang] ?? SCENARIO_SECTION_LABELS.en;
  const indexes = labels.map((label) => text.indexOf(label));
  if (indexes.some((index) => index < 0) || indexes[0] >= indexes[1] || indexes[1] >= indexes[2]) {
    return false;
  }
  return indexes.every((start, index) => {
    const contentStart = start + labels[index].length;
    const contentEnd = index < indexes.length - 1 ? indexes[index + 1] : text.length;
    return text.slice(contentStart, contentEnd).trim().length >= 18;
  });
}

const INTENSITY_RULES_EN: Record<string, string> = {
  romantic: "Current level: romantic. Keep it playful and curious, with no explicit sexual action.",
  passion: "Current level: passion. Progress into clear sensual physical intimacy such as oral pleasure, nipple play, intimate touch, toy use, or intercourse—not dialogue alone. The lecturer/student example is optional; if used, resistance is acted and intimacy follows a clear positive signal.",
  hard: "Current level: hard. Include a named sexual act such as oral pleasure, intimate stimulation, toy use, or intercourse within a bold fictional adult power dynamic. Casting is optional; keep it unrecorded, bounded, and mutually chosen.",
};

const INTENSITY_RULES_RU: Record<string, string> = {
  romantic: "Текущий уровень: romantic. Сохраняй игривую интригу и не описывай сексуальных действий.",
  passion: "Текущий уровень: passion. Развивай сюжет до чувственной близости: назови оральные ласки, ласки сосков языком, интимные прикосновения, игрушку или секс; одного разговора недостаточно. Преподаватель и студент — необязательный пример; близость следует за ясным встречным сигналом.",
  hard: "Текущий уровень: hard. Назови сексуальное действие — оральные ласки, интимную стимуляцию, игрушку или секс — внутри смелой вымышленной динамики взрослых. Кастинг необязателен; никаких реальных записей, каждый сохраняет выбор и границы.",
};

const SYSTEM_PROMPTS: Record<string, (intensity: string, gender: string) => string> = {
  ru: (intensity, gender) => `${PERSONA_RU}

${genderContextRu(gender)}

${ROLE_LIST_RU}

${CARD_FORMAT.ru}

${INTENSITY_RULES_RU[intensity]}`,

  en: (intensity, gender) => `${PERSONA_EN}

${genderContextEn(gender)}

${ROLE_LIST_EN}

${CARD_FORMAT.en}

${INTENSITY_RULES_EN[intensity]}`,

  hi: (intensity, gender) => `${PERSONA_EN}
IMPORTANT: Write ALL output in Hindi (हिंदी) using Devanagari script.

${genderContextEn(gender)}

${ROLE_LIST_EN}

${CARD_FORMAT.hi}

${INTENSITY_RULES_EN[intensity]}`,

  pt: (intensity, gender) => `${PERSONA_EN}
IMPORTANT: Write ALL output in Brazilian Portuguese (Português Brasileiro).

${genderContextEn(gender)}

${ROLE_LIST_EN}

${CARD_FORMAT.pt}

${INTENSITY_RULES_EN[intensity]}`,

  es: (intensity, gender) => `${PERSONA_EN}
IMPORTANT: Write ALL output in Spanish (Español).

${genderContextEn(gender)}

${ROLE_LIST_EN}

${CARD_FORMAT.es}

${INTENSITY_RULES_EN[intensity]}`,
};

function userPrompt(lang: string, intensity: string): string {
  if (lang === "ru") return `Создай новый сценарий уровня ${intensity} для двух взрослых. Дай конкретную завязку, развитие напряжения, образы из домашней одежды и физические действия, соответствующие уровню. В страсти и Харде не ограничивайся разговорами: покажи ясный первый шаг и развитие сцены. Сохрани отдельные скрытые цели role_a и role_b, нейтральное название и 3–6 внутренних тегов. Не повторяй недавние сочетания. Верни только JSON.`;
  if (lang === "hi") return `${intensity} स्तर का नया दृश्य दो वयस्क साथियों के लिए बनाएँ। स्पष्ट शुरुआत, बढ़ता तनाव, घर के कपड़ों से बने रूप और स्तर के अनुसार शारीरिक क्रियाएँ दें। जुनून और हार्ड में केवल बातचीत न हो; पहला कदम और दृश्य का विकास दिखाएँ। role_a और role_b के अलग गुप्त लक्ष्य, तटस्थ शीर्षक और 3–6 निजी टैग रखें। हाल की जोड़ियों को न दोहराएँ। केवल JSON दें।`;
  if (lang === "pt") return `Crie um cenário ${intensity} novo para dois adultos. Dê uma situação inicial concreta, tensão crescente, figurinos com roupas que já existem em casa e ações físicas adequadas ao nível. Em paixão e hard, não fique só na conversa: mostre um primeiro passo claro e a evolução da cena. Preserve os objetivos secretos de role_a e role_b, um título neutro e 3–6 tags internas. Evite combinações recentes. Retorne somente JSON.`;
  if (lang === "es") return `Crea un escenario ${intensity} nuevo para dos adultos. Incluye una premisa concreta, tensión creciente, atuendos con ropa que ya tengan en casa y acciones físicas acordes al nivel. En pasión y hard, no te limites a conversar: muestra un primer paso claro y cómo avanza la escena. Mantén objetivos secretos separados para role_a y role_b, un título neutral y 3–6 etiquetas internas. Evita combinaciones recientes. Devuelve solo JSON.`;
  return `Invent a fresh ${intensity}-level scenario for two adults. Give it a concrete hook, rising tension, outfits made from clothes they already own, and physical actions suited to the level. Passion and Hard must progress beyond talking: show a clear first move and an advancing scene. Keep role_a and role_b objectives private and separate, use a neutral title, and return 3–6 internal tags. Avoid recent combinations. Return only JSON.`;
}

async function notifyPartner(chatId: number, partnerUserId: number, coupleId: string, sessionId: string, lang: string): Promise<boolean> {
  const { data: preference, error: preferenceError } = await supabase
    .from("couple_member_preferences")
    .select("telegram_notifications_enabled")
    .eq("couple_id", coupleId)
    .eq("user_id", partnerUserId)
    .maybeSingle();
  if (preferenceError || preference?.telegram_notifications_enabled !== true) return false;
  const texts: Record<string, string> = {
    ru: "Партнёр подготовил для вас сценарий. Откройте Touché, чтобы увидеть свою роль.",
    hi: "आपके साथी ने आपके लिए एक दृश्य तैयार किया है। अपनी भूमिका देखने के लिए Touché खोलें।",
    pt: "Seu parceiro preparou um cenário para vocês. Abra o Touché para ver seu papel.",
    es: "Tu pareja preparó un escenario para ustedes. Abre Touché para ver tu papel.",
  };
  const buttons: Record<string, string> = {
    ru: "🃏 Открыть мою роль", hi: "🃏 मेरी भूमिका खोलें",
    pt: "🃏 Abrir meu papel", es: "🃏 Abrir mi rol",
  };
  const text = texts[lang] ?? "Your partner prepared a scenario for you. Open Touché to see your role.";
  const buttonText = buttons[lang] ?? "🃏 Open my role";
  try {
    const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId, text, parse_mode: "HTML",
        reply_markup: { inline_keyboard: [[{ text: buttonText, web_app: { url: `${APP_URL}?scenario=${sessionId}&role=b` } }]] },
      }),
    });
    return r.ok;
  } catch { return false; }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-telegram-init-data");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const initData = req.headers["x-telegram-init-data"] as string;
  const caller = validateTelegramInitData(initData, BOT_TOKEN);
  if (!caller) return res.status(401).json({ error: "Unauthorized" });

  const {
    coupleId,
    lang = "ru",
    intensity = "passion",
    gender = "male",
  } = req.body as {
    coupleId: string;
    lang?: string;
    intensity?: string;
    gender?: string;
  };

  if (!coupleId || !/^[0-9a-f-]{16,}$/i.test(coupleId)) return res.status(400).json({ error: "invalid_couple_id" });
  if (!LANGS.has(lang) || !INTENSITIES.has(intensity) || !GENDERS.has(gender)) return res.status(400).json({ error: "invalid_generation_options" });

  const { data: couple } = await supabase.from("couples").select("user_a_id,user_b_id").eq("id", coupleId).maybeSingle();
  if (!couple || (couple.user_a_id !== caller.id && couple.user_b_id !== caller.id)) {
    return res.status(403).json({ error: "couple_access_denied" });
  }
  const partnerUserId = couple.user_a_id === caller.id ? couple.user_b_id : couple.user_a_id;
  let premium: boolean;
  let isOwner: boolean;
  try {
    const access = await getEffectivePremiumAccess(supabase, caller.id);
    premium = access.active;
    isOwner = access.source === "owner";
  } catch {
    return res.status(500).json({ error: "premium_status_failed" });
  }
  if (!premium) return res.status(403).json({ error: "subscription_required" });
  if (!isOwner) {
    const { data: allowance, error: allowanceError } = await supabase.rpc("consume_daily_limit", {
      p_user_id: caller.id, p_category: "scenarios", p_date: appDate(), p_limit: 1,
    });
    if (allowanceError) return res.status(500).json({ error: "scenario_limit_failed" });
    if (allowance?.allowed === false || allowance?.ok === false) return res.status(429).json({ error: "daily_limit_exceeded" });
  }

  let variationSignals: ScenarioVariationSignals;
  try {
    variationSignals = await getScenarioVariationSignals(coupleId);
  } catch (error) {
    console.error("Could not load scenario variation context:", error);
    return res.status(500).json({ error: "scenario_context_failed" });
  }

  let generated: GeneratedScenario;
  let source: "ai" | "fallback" = "ai";

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 14_000);
    const systemContent = `${(SYSTEM_PROMPTS[lang] ?? SYSTEM_PROMPTS.en)(intensity, gender)}

${variationContext(lang, variationSignals)}`;
    const aiRes = await fetch(DEEPSEEK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${DEEPSEEK_API_KEY}` },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: systemContent },
          { role: "user",   content: userPrompt(lang, intensity) },
        ],
        max_tokens: 700,
        temperature: 1.2,
        response_format: { type: "json_object" },
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!aiRes.ok) throw new Error(`DeepSeek ${aiRes.status}`);
    const aiData = await aiRes.json();
    const raw = (aiData.choices?.[0]?.message?.content ?? "").trim();
    const parsed = JSON.parse(raw);
    if (parsed?.title && parsed?.role_a && parsed?.role_b) {
      const roleA = cleanText(parsed.role_a, 1800);
      const roleB = cleanText(parsed.role_b, 1800);
      const variationTags = cleanVariationTags(parsed.variation_tags);
      if (
        roleA.length < 40 ||
        roleB.length < 40 ||
        !hasStructuredRoleCard(roleA, lang) ||
        !hasStructuredRoleCard(roleB, lang) ||
        variationTags.length < 3 ||
        roleA === roleB ||
        CROSS_CARD_DISCLOSURE.test(roleA) ||
        CROSS_CARD_DISCLOSURE.test(roleB)
      ) {
        throw new Error("Scenario cards are incomplete or reveal cross-card instructions");
      }
      generated = {
        title: sanitizeScenarioTitle(parsed.title, lang, intensity),
        role_a: roleA,
        role_b: roleB,
        variation_tags: variationTags,
      };
    } else {
      throw new Error("Unexpected AI response shape");
    }
  } catch {
    source = "fallback";
    generated = getFallback(intensity, lang, gender, variationSignals);
  }

  generated.title = sanitizeScenarioTitle(generated.title, lang, intensity);

  const partnerTgId: number | null = couple
    ? (couple.user_a_id === caller.id ? couple.user_b_id : couple.user_a_id)
    : null;

  const { data: session, error: sessionError } = await supabase
    .from("scenario_sessions")
    .insert({
      couple_id: coupleId,
      pulled_by: caller.id,
      lang,
      intensity,
      title: generated.title,
      role_a_text: generated.role_a,
      role_b_text: generated.role_b,
      variation_tags: generated.variation_tags,
      resonance_eligible: true,
      ai_generated: true,
      pending_for_b: !!partnerTgId,
    })
    .select("id")
    .single();
  if (sessionError || !session?.id) {
    return res.status(500).json({ error: "scenario_save_failed" });
  }

  let notified = false;
  if (partnerTgId && session?.id) {
    notified = await notifyPartner(partnerTgId, partnerUserId, coupleId, session.id, lang);
    if (notified) {
      await supabase
        .from("scenario_sessions")
        .update({ pending_for_b: false, notified_at: new Date().toISOString() })
        .eq("id", session.id);
    }
  }

  return res.status(200).json({
    ok: true,
    title: generated.title,
    roleA: generated.role_a,
    sessionId: session?.id ?? null,
    notified,
    source,
    feedbackEnabled: true,
  });
}
