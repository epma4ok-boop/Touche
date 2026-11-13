import type { Lang } from "@/data/i18n";
import type { FeatureNotice } from "@/hooks/useFeatureTrial";
import "./FeatureLimitNotice.css";

type Props = {
  lang: Lang;
  kind: "tarot" | "game";
  notice: FeatureNotice;
  onUpgrade: () => void | Promise<boolean>;
  onDismiss: () => void;
};

const COPY: Record<Lang, {
  tarotTitle: string; tarotBody: string; gameTitle: string; gameBody: string;
  errorTitle: string; errorBody: string; upgrade: string; close: string;
}> = {
  ru: {
    tarotTitle: "Расклад на сегодня уже использован",
    tarotBody: "Бесплатно доступен один расклад Таро в день. С Premium расклады без ограничений.",
    gameTitle: "Пробная игра на сегодня использована",
    gameBody: "Бесплатно — по одной игре каждого типа в день. С Premium — без ограничений.",
    errorTitle: "Не удалось проверить доступ",
    errorBody: "Попробуйте ещё раз чуть позже. Игра или расклад пока не запускались.",
    upgrade: "Открыть Premium", close: "Понятно",
  },
  en: {
    tarotTitle: "Today's reading has been used",
    tarotBody: "Free access includes one Tarot reading a day. Premium includes unlimited readings.",
    gameTitle: "Today's free game has been used",
    gameBody: "Free access includes one game of each type per day. Premium removes the limit.",
    errorTitle: "Access could not be checked",
    errorBody: "Try again shortly. The game or reading has not started yet.",
    upgrade: "Get Premium", close: "Got it",
  },
  hi: {
    tarotTitle: "आज का टैरो स्प्रेड इस्तेमाल हो चुका है",
    tarotBody: "मुफ़्त में रोज़ एक टैरो स्प्रेड मिलता है। Premium में असीमित स्प्रेड हैं।",
    gameTitle: "आज का मुफ़्त खेल इस्तेमाल हो चुका है",
    gameBody: "मुफ़्त में हर तरह का एक खेल रोज़ मिलता है। Premium में कोई सीमा नहीं है।",
    errorTitle: "एक्सेस की जाँच नहीं हो सकी",
    errorBody: "थोड़ी देर बाद फिर कोशिश करें। खेल या स्प्रेड अभी शुरू नहीं हुआ है।",
    upgrade: "Premium लें", close: "ठीक है",
  },
  pt: {
    tarotTitle: "A tiragem de hoje já foi usada",
    tarotBody: "O acesso grátis inclui uma tiragem de Tarô por dia. No Premium, as tiragens são ilimitadas.",
    gameTitle: "A partida grátis de hoje já foi usada",
    gameBody: "No grátis, há uma partida de cada tipo por dia. Com Premium, sem limites.",
    errorTitle: "Não foi possível verificar o acesso",
    errorBody: "Tente novamente em instantes. O jogo ou a tiragem ainda não começou.",
    upgrade: "Assinar Premium", close: "Entendi",
  },
  es: {
    tarotTitle: "Ya usaste la tirada de hoy",
    tarotBody: "El acceso gratis incluye una tirada de Tarot al día. Con Premium, son ilimitadas.",
    gameTitle: "Ya usaste el juego gratis de hoy",
    gameBody: "Gratis tienes una partida de cada tipo al día. Con Premium, no hay límites.",
    errorTitle: "No se pudo comprobar el acceso",
    errorBody: "Inténtalo de nuevo en un momento. El juego o la tirada aún no ha comenzado.",
    upgrade: "Obtener Premium", close: "Entendido",
  },
};

export default function FeatureLimitNotice({ lang, kind, notice, onUpgrade, onDismiss }: Props) {
  if (!notice) return null;
  const copy = COPY[lang];
  const title = notice === "error" ? copy.errorTitle : kind === "tarot" ? copy.tarotTitle : copy.gameTitle;
  const body = notice === "error" ? copy.errorBody : kind === "tarot" ? copy.tarotBody : copy.gameBody;
  return (
    <div className="feature-limit-backdrop" role="presentation" onClick={onDismiss}>
      <section
        className="feature-limit-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="feature-limit-title"
        onClick={event => event.stopPropagation()}
      >
        <span className="feature-limit-mark" aria-hidden="true">T</span>
        <h2 id="feature-limit-title">{title}</h2>
        <p>{body}</p>
        {notice === "limit" && <button type="button" className="feature-limit-primary" onClick={() => { void onUpgrade(); }}>{copy.upgrade}</button>}
        <button type="button" className="feature-limit-secondary" onClick={onDismiss}>{copy.close}</button>
      </section>
    </div>
  );
}
