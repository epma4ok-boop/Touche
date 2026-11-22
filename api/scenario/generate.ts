// api/scenario/generate.ts
// POST /api/scenario/generate
// Body: { coupleId, lang, intensity, gender }
//   gender: "male" | "female" — пол того, кто тянет карту (они получат role_a)
// Headers: x-telegram-init-data

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { validateTelegramInitData } from "../couple/_auth.js";
import { appDate } from "../limits.js";
import { OWNER_TELEGRAM_ID } from "../../src/config.js";
import { sanitizeScenarioTitle } from "../../src/data/scenarioTitle.js";
import {
  scenarioIdeaContext,
  scenarioIdeaTag,
  selectScenarioIdea,
  type ScenarioIdeaIntensity,
} from "./_ideas.js";

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY!;
const DEEPSEEK_URL = "https://api.deepseek.com/v1/chat/completions";
const BOT_TOKEN = process.env.BOT_TOKEN!;
const APP_URL = process.env.APP_URL!;
const OWNER_ID = OWNER_TELEGRAM_ID;
const LANGS = new Set(["ru", "en", "hi", "pt", "es"]);
const INTENSITIES = new Set(["romantic", "passion", "hard"]);
const GENDERS = new Set(["male", "female"]);
const MAX_ROLE_CARD_CHARS = 420;

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
type GeneratedScenario = FallbackEntry & { variation_tags: string[] };
type ScenarioVariationSignals = {
  recent: string[];
  mutuallyLiked: string[];
  avoid: string[];
};

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
        title: "Условия освобождения",
        role_a: "Ты — мужчина, который играет похитителя в вымышленном триллере. Веди допрос уверенно, потребуй признание и назови условие свободы. С усмешкой скажи: «Ты правда думаешь, что сможешь меня переиграть?»",
        role_b: "Ты — женщина, которую поймали в вымышленной сцене. Держись дерзко, сопротивляйся в роли и торгуйся за свободу. С прямым взглядом брось: «Сначала назови цену — потом решу, соглашаться ли».",
      },
      female: {
        title: "Условия освобождения",
        role_a: "Ты — женщина, которая играет похитительницу в вымышленном триллере. Веди допрос уверенно, потребуй признание и назови условие свободы. С усмешкой скажи: «Ты правда думаешь, что сможешь меня переиграть?»",
        role_b: "Ты — мужчина, которого поймали в вымышленной сцене. Держись дерзко, сопротивляйся в роли и торгуйся за свободу. С прямым взглядом брось: «Сначала назови цену — потом решу, соглашаться ли».",
      },
    },
    en: {
      male: {
        title: "Terms of Release",
        role_a: "You're a man playing a captor in a fictional thriller. Lead the interrogation, demand a confession, and name the price of release. Smirk: “You really think you can outplay me?”",
        role_b: "You're a woman caught in a fictional scene. Stay defiant, resist in character, and bargain for freedom. Meet his gaze: “Name your price first—then I'll decide.”",
      },
      female: {
        title: "Terms of Release",
        role_a: "You're a woman playing a captor in a fictional thriller. Lead the interrogation, demand a confession, and name the price of release. Smirk: “You really think you can outplay me?”",
        role_b: "You're a man caught in a fictional scene. Stay defiant, resist in character, and bargain for freedom. Meet her gaze: “Name your price first—then I'll decide.”",
      },
    },
    hi: {
      male: { title: "रिहाई की शर्त", role_a: "आप काल्पनिक थ्रिलर में अपहरणकर्ता की भूमिका निभा रहे पुरुष हैं। पूछताछ का नेतृत्व करें, कबूलनामा माँगें और रिहाई की कीमत तय करें। मुस्कराकर कहें: “क्या सच में लगता है कि तुम मुझे मात दे सकते हो?”", role_b: "आप काल्पनिक दृश्य में पकड़ी गई महिला हैं। किरदार में बेखौफ़ रहें, विरोध करें और आज़ादी के लिए सौदा करें। उसकी आँखों में देखकर कहें: “पहले अपनी कीमत बताओ—फिर सोचूँगी।”" },
      female: { title: "रिहाई की शर्त", role_a: "आप काल्पनिक थ्रिलर में अपहरणकर्ता की भूमिका निभा रही महिला हैं। पूछताछ का नेतृत्व करें, कबूलनामा माँगें और रिहाई की कीमत तय करें। मुस्कराकर कहें: “क्या सच में लगता है कि तुम मुझे मात दे सकते हो?”", role_b: "आप काल्पनिक दृश्य में पकड़े गए पुरुष हैं। किरदार में बेख़ौफ़ रहें, विरोध करें और आज़ादी के लिए सौदा करें। उसकी आँखों में देखकर कहें: “पहले अपनी कीमत बताओ—फिर सोचूँगा।”" },
    },
    pt: {
      male: { title: "Condições para sair", role_a: "Você é um homem que interpreta o sequestrador de um thriller fictício. Conduza o interrogatório, exija uma confissão e diga o preço da liberdade. Sorria: “Acha mesmo que pode me vencer?”", role_b: "Você é uma mulher capturada numa cena fictícia. Mantenha a postura desafiante, resista no papel e negocie sua liberdade. Encare-o: “Diga seu preço primeiro; depois eu decido.”" },
      female: { title: "Condições para sair", role_a: "Você é uma mulher que interpreta a sequestradora de um thriller fictício. Conduza o interrogatório, exija uma confissão e diga o preço da liberdade. Sorria: “Acha mesmo que pode me vencer?”", role_b: "Você é um homem capturado numa cena fictícia. Mantenha a postura desafiante, resista no papel e negocie sua liberdade. Encare-a: “Diga seu preço primeiro; depois eu decido.”" },
    },
    es: {
      male: { title: "Precio de la libertad", role_a: "Eres un hombre que interpreta a un secuestrador en un thriller ficticio. Dirige el interrogatorio, exige una confesión y fija el precio de la libertad. Sonríe: «¿De verdad crees que puedes ganarme?»", role_b: "Eres una mujer atrapada en una escena ficticia. Mantente desafiante, resiste en personaje y negocia tu libertad. Míralo: «Primero dime tu precio; después decidiré»." },
      female: { title: "Precio de la libertad", role_a: "Eres una mujer que interpreta a una secuestradora en un thriller ficticio. Dirige el interrogatorio, exige una confesión y fija el precio de la libertad. Sonríe: «¿De verdad crees que puedes ganarme?»", role_b: "Eres un hombre atrapado en una escena ficticia. Mantente desafiante, resiste en personaje y negocia tu libertad. Mírala: «Primero dime tu precio; después decidiré»." },
    },
  },
};

function getFallback(intensity: string, lang: string, gender: string): FallbackEntry {
  const pool = FALLBACKS[intensity] ?? FALLBACKS.passion;
  const byLang = pool[lang] ?? pool["en"];
  return byLang[gender === "female" ? "female" : "male"];
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
    ? "Развивай выбранную оригинальную завязку в свежую сцену; не копируй её фразы и не подменяй другой знакомой темой. Меняй характеры, детали места и ход сближения. Не повторяй недавние сочетания. Понравившийся обоим элемент можно иногда вернуть рядом с новыми. Избегай элементов, которые кому-то не подошли. Метки и оценки — только внутренний контекст: не упоминай их и не раскрывай чужой отклик в карточках."
    : "Develop the selected original seed into a fresh scene; do not copy its wording or replace it with a familiar trope. Vary character traits, setting details, and the progression toward intimacy. Avoid recent combinations. An element both partners liked may return occasionally alongside new ones. Avoid elements either partner rated poorly. Tags and ratings are private model context: never mention them or reveal the other partner's response.";
  const lines = [instructions];
  if (signals.recent.length) lines.push(`Recent elements to vary away from: ${signals.recent.join(", ")}.`);
  if (signals.mutuallyLiked.length) lines.push(`Elements both partners liked before (use sparingly with fresh combinations): ${signals.mutuallyLiked.join(", ")}.`);
  if (signals.avoid.length) lines.push(`Avoid these previously low-rated elements: ${signals.avoid.join(", ")}.`);
  return lines.join("\n");
}

// ─── Персоны ─────────────────────────────────────────────────────────────────

const PERSONA_RU = `Ты — автор коротких ролевых сценариев для взрослых пар. Создавай живые сцены с разными характерами, конкретными действиями и репликами.`;

const PERSONA_EN = `You write short, engaging roleplay scenarios for adult couples. Create distinct characters, concrete actions, and natural dialogue.`;

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
- romantic: an intriguing first meeting, private performance, neighbors sharing a late-night conversation, a playful photo session, or an original low-stakes fantasy.
- passion: adult lecturer/adult university student with acted resistance and a clear positive turn, or any other original adult dynamic with mutual intimacy.
- hard: bold adult roleplay across a wide range, including dark thrillers, staged capture, interrogation, prison roles, authority, acted resistance, and force-play.
Invent many different role pairings and premises. Do not default to photographer/model, lecturer/student, or casting. Never use minors, schoolchildren, or characters whose age is unclear.
For hard, rotate dark suspense and coercive fantasy with rivalries, private performances, casting, escorts, dancers, and other provocative encounters. Do not soften a scene merely because its fictional premise is intense.

Intensity:
- romantic: intrigue and flirting, no explicit sexual content.
- passion: sensual, direct adult flirting and intimacy after clear reciprocation.
- hard: bold, sexually charged roleplay with confident power dynamics, staged resistance, and dramatic fictional stakes.

Private-card rules:
- Return one neutral title and two separate role cards. Both partners see the title, so it must not name roles, the pairing, or either character's secret goal.
- role_a is only for the initiator; role_b is only for the partner. Address each reader as “you”; give only that character's role, private objective, opening move, actions, and lines.
- Never reveal, summarize, or give instructions from the other card. The cards should complement each other without disclosing one another's private plan.
- If you use teacher/student, both characters are adults at a university. Resistance is acted, never a real refusal; intimacy begins only after clear reciprocation. Never tell a character to ignore a real no, silence, hesitation, or stop.
- Casting is fictional: no actual recording, image capture, or saved material.
- Staged coercion, captivity, threats, and danger are valid fictional themes. Keep them as story, not instructions for real-world harm or hazardous actions; do not add out-of-character safety disclaimers to the cards.

Write exactly 3 compact sections per card, one short sentence in each, and keep the whole card under ${MAX_ROLE_CARD_CHARS} characters including labels. Across those lines, show the character through behavior and build 2–3 connected, escalating beats; include one brief, natural line in quotes. Use the exact translated section labels specified by CARD_FORMAT, each on its own line. Keep the two cards complementary but private, and end at the scene's intimate moment, not an epilogue. Actions must be feasible at home without purchases, risky props, or real restraint.
Add 3–6 private variation_tags as short lowercase English slugs prefixed by setting:, dynamic:, tone:, or hook:. Describe broad scene elements only, not names, ages, or private card objectives. Tags are internal metadata and must never appear in either role card or title.
Return ONLY valid JSON: {"title":"...","role_a":"...","role_b":"...","variation_tags":["setting:...","dynamic:...","tone:..."]}`;

const ROLE_LIST_RU = `
Идеи сцен:
Примеры — не фиксированный список:
- romantic: интригующее знакомство, домашний мини-концерт, ночной разговор соседей, фотосессия с телефоном-реквизитом или необычная фантазия без риска.
- passion: преподаватель и совершеннолетний студент университета с игровым уклонением и ясным встречным сигналом или любая другая оригинальная взрослая динамика с взаимной близостью.
- hard: смелая игра взрослых с широким выбором тем — от вымышленного кастинга до тёмного триллера, захвата, допроса, плена, властной роли и игрового сопротивления.
Придумывай разные пары ролей и завязки. Не зацикливайся на фотографе/модели, преподавателе/студенте или кастинге. Не используй несовершеннолетних, школьников или персонажей с неясным возрастом.
В «Жёстко» чередуй тёмный саспенс и фантазии о принуждении с соперничеством, приватными выступлениями, кастингом, эскортом, танцорами и другими дерзкими встречами. Не смягчай сюжет только потому, что его вымышленная завязка напряжённая.

Уровни:
- romantic: интрига и флирт без откровенного сексуального контента.
- passion: чувственный флирт и близость взрослых только после ясной взаимности.
- hard: смелые, сексуально заряженные роли взрослых, властная динамика, игровое сопротивление и яркое вымышленное напряжение.

Правила скрытых карточек:
- Верни одно нейтральное название и две отдельные карточки. Название увидят оба, поэтому в нём нельзя называть роли, их пару или скрытую цель персонажа.
- role_a предназначена только инициатору, role_b — только партнёру. Обращайся к читателю карточки на «ты» и описывай только его роль, личную цель, начало сцены, действия и реплики.
- Не раскрывай и не пересказывай инструкции или тайную цель другой карточки. Карточки должны сочетаться, но не выдавать планы друг друга.
- Если выбрана сцена «преподаватель и студент», оба персонажа — взрослые участники университета. Сопротивление — только игровая роль; близость начинается после ясной взаимности. Нельзя приказывать игнорировать настоящий отказ, молчание, сомнение или стоп-сигнал.
- Кастинг — только вымышленная ролевая сцена: никаких реальных записей, фото или сохранения материалов.
- Игровое принуждение, плен, угрозы и опасность допустимы как вымышленные темы; оставляй их частью сюжета, не превращай в реальные опасные действия или инструкции. Не добавляй в карточки оговорки вне роли.

В каждой карточке ровно 3 компактных раздела — по одному короткому предложению в каждом; весь текст вместе с заголовками — не больше ${MAX_ROLE_CARD_CHARS} символов. Покажи характер через поступок и выстрой в трёх строках 2–3 связанных, постепенно усиливающихся хода; добавь одну короткую естественную реплику. Используй точные заголовки из CARD_FORMAT, каждый с новой строки. Карточки связаны, но не раскрывают тайные планы друг друга; финал — кульминационный ход сцены, не эпилог. Всё должно быть выполнимо дома, без покупок, опасного реквизита и реального связывания.
Добавь 3–6 приватных variation_tags: короткие строчные английские теги с префиксом setting:, dynamic:, tone: или hook:. Описывай только общие элементы сцены — без имён, возраста и тайных целей карточек. Теги нужны только для внутреннего разнообразия и не должны попадать в название или карточки.
Верни ТОЛЬКО JSON: {"title":"...","role_a":"...","role_b":"...","variation_tags":["setting:...","dynamic:...","tone:..."]}`;

const CARD_FORMAT: Record<string, string> = {
  ru: `CARD_FORMAT: In each role string, return exactly these three sections in this order, each on its own line, with plain text labels and a colon: "ТВОЁ ЗАДАНИЕ:", "ТВОЯ РОЛЬ:", "ПЕРВЫЙ ШАГ:". The first section must state the reader's concrete action. Do not use markdown or add other headings.`,
  en: `CARD_FORMAT: In each role string, return exactly these three sections in this order, each on its own line, with plain text labels and a colon: "YOUR TASK:", "YOUR ROLE:", "FIRST MOVE:". The first section must state the reader's concrete action. Do not use markdown or add other headings.`,
  hi: `CARD_FORMAT: In each role string, return exactly these three sections in this order, each on its own line, with plain text labels and a colon: "आपका काम:", "आपकी भूमिका:", "पहला कदम:". The first section must state the reader's concrete action. Do not use markdown or add other headings.`,
  pt: `CARD_FORMAT: In each role string, return exactly these three sections in this order, each on its own line, with plain text labels and a colon: "SUA TAREFA:", "SEU PAPEL:", "PRIMEIRO PASSO:". The first section must state the reader's concrete action. Do not use markdown or add other headings.`,
  es: `CARD_FORMAT: In each role string, return exactly these three sections in this order, each on its own line, with plain text labels and a colon: "TU TAREA:", "TU ROL:", "PRIMER PASO:". The first section must state the reader's concrete action. Do not use markdown or add other headings.`,
};

const INTENSITY_RULES_EN: Record<string, string> = {
  romantic: "Current level: romantic. Keep it playful and curious, with no explicit sexual action.",
  passion: "Current level: passion. Any adult role dynamic is allowed; the lecturer/student example is optional, not a default. If used, resistance is playful acting and the student chooses when to give a clear positive signal that opens the path to intimacy.",
  hard: "Current level: hard. Write intense, provocative adult roleplay with seduction, undressing, and a concrete intimate action. Dark thriller, staged coercion, captivity, interrogation, threats, acted resistance, and power exchange are welcome themes, not rare exceptions. Keep dangerous events fictional rather than actionable or physically hazardous; keep role cards in-world without safety boilerplate.",
};

const INTENSITY_RULES_RU: Record<string, string> = {
  romantic: "Текущий уровень: romantic. Сохраняй игривую интригу и не описывай сексуальные действия.",
  passion: "Текущий уровень: passion. Подходит любая взрослая ролевая динамика; преподаватель и студент — лишь один из вариантов, не сюжет по умолчанию. Если он выбран, уклонение только игровое, а студент сам выбирает момент для ясного встречного сигнала и перехода к близости.",
  hard: "Текущий уровень: hard. Пиши напряжённую, дерзкую ролевую сцену взрослых: соблазнение, раздевание и конкретное интимное действие. Тёмный триллер, игровое принуждение, плен, допрос, угрозы, сопротивление по роли и власть — полноценные темы, а не редкие исключения. Опасность остаётся частью вымысла, без реальных опасных действий и инструкций; не выходи из роли ради оговорок.",
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
  if (lang === "ru") return `Придумай новый сценарий уровня ${intensity} для двух взрослых партнёров: две отдельные скрытые карточки, нейтральное название и 3–6 внутренних тегов разнообразия. Не повторяй недавние сцены. Верни ТОЛЬКО JSON.`;
  if (lang === "hi") return `${intensity} स्तर का नया दृश्य दो वयस्क साथियों के लिए बनाएं: दो अलग गुप्त भूमिका-कार्ड, तटस्थ शीर्षक और विविधता के 3–6 निजी टैग। हाल के दृश्यों को न दोहराएँ। केवल JSON।`;
  if (lang === "pt") return `Crie um novo cenário ${intensity} para dois adultos, com cartões secretos separados, título neutro e 3–6 tags internas de variedade. Não repita cenas recentes. Apenas JSON.`;
  if (lang === "es") return `Crea un escenario ${intensity} nuevo para dos adultos, con tarjetas secretas separadas, título neutral y 3–6 etiquetas internas de variedad. No repitas escenas recientes. Solo JSON.`;
  return `Invent a fresh ${intensity}-level scenario for two adults, with separate private role cards, a neutral title, and 3–6 internal variety tags. Avoid recent scenes. Return ONLY JSON.`;
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
  const isOwner = caller.id === OWNER_ID;
  const premium = isOwner || !!(await supabase.from("user_subscriptions").select("expires_at").eq("user_id", caller.id).gt("expires_at", new Date().toISOString()).maybeSingle()).data;
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

  const selectedIdea = selectScenarioIdea(intensity as ScenarioIdeaIntensity, variationSignals);
  const selectedIdeaTag = scenarioIdeaTag(selectedIdea);

  let generated: GeneratedScenario;
  let source: "ai" | "fallback" = "ai";

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 14_000);
    const systemContent = `${(SYSTEM_PROMPTS[lang] ?? SYSTEM_PROMPTS.en)(intensity, gender)}

${scenarioIdeaContext(lang, selectedIdea)}

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
      const roleA = cleanText(parsed.role_a, 1200);
      const roleB = cleanText(parsed.role_b, 1200);
      const modelTags = cleanVariationTags(parsed.variation_tags);
      if (
        roleA.length < 40 ||
        roleB.length < 40 ||
        roleA.length > MAX_ROLE_CARD_CHARS ||
        roleB.length > MAX_ROLE_CARD_CHARS ||
        modelTags.length < 3 ||
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
        variation_tags: [
          ...modelTags.filter((tag) => tag !== selectedIdeaTag).slice(0, 5),
          selectedIdeaTag,
        ],
      };
    } else {
      throw new Error("Unexpected AI response shape");
    }
  } catch {
    source = "fallback";
    generated = {
      ...getFallback(intensity, lang, gender),
      variation_tags: FALLBACK_VARIATION_TAGS[intensity] ?? [],
    };
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
