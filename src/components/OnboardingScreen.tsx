import { UI, type Lang } from "@/data/i18n";
import "./SupportPop.css";

  interface Props {
    lang: Lang;
    onDone: () => void;
    onBack: () => void;
  }

  export default function OnboardingScreen({ lang, onDone, onBack }: Props) {
    const t = UI[lang];
    const backLabel = lang === "ru" ? "Назад" : lang === "hi" ? "वापस" : lang === "pt" ? "Voltar" : lang === "es" ? "Volver" : "Back";

    return (
      <div className="pop-screen onboarding-screen" data-testid="screen-onboarding">
        <div className="pop-screen__inner onboarding-layout">
          <header className="onboarding-masthead">
            <button type="button" className="setup-back" onClick={onBack} aria-label={backLabel} data-testid="button-onboarding-back">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 18 9 12l6-6" /></svg>
            </button>
            <div className="pop-brand" data-testid="text-onboarding-brand">{t.appName}<em>.</em></div>
            <span>{t.appSub}</span>
            <b>01 / 02</b>
          </header>
          <main className="onboarding-editorial">
            <div className="onboarding-art" aria-hidden="true"><span className="onboarding-art__ring onboarding-art__ring--outer" /><span className="onboarding-art__ring onboarding-art__ring--inner" /><i /></div>
            <section className="pop-panel onboarding-panel">
              <span className="pop-eyebrow">{t.appSub}</span>
              <h1 className="pop-title">{t.onboardingTitle}</h1>
              <p className="pop-copy">{t.onboardingBody}</p>
            </section>
            <button className="pop-button onboarding-continue" data-testid="button-onboarding-done" onClick={onDone}>{t.onboardingCta}<span aria-hidden="true">↗</span></button>
          </main>
          <footer className="onboarding-footer"><span>{t.appName}</span><span>01—02</span></footer>
        </div>
      </div>
    );
  }
  