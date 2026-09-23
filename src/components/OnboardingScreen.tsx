import { UI, type Lang } from "@/data/i18n";
import "./SupportPop.css";

  interface Props {
    lang: Lang;
    onDone: () => void;
  }

  export default function OnboardingScreen({ lang, onDone }: Props) {
    const t = UI[lang];

    return (
      <div className="pop-screen" data-testid="screen-onboarding">
        <div className="pop-screen__inner" style={{ minHeight: "100dvh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"32px 0", gap:24 }}>
          <div style={{ textAlign:"center" }}>
            <div className="pop-brand" data-testid="text-onboarding-brand">{t.appName}<em>.</em></div>
            <div style={{ marginTop:7, fontSize:11, letterSpacing:".18em", textTransform:"uppercase", color:"var(--pop-muted)" }}>{t.appSub}</div>
          </div>
          <div className="pop-panel" style={{ width:"100%", padding:"27px 22px", textAlign:"center" }}>
            <span className="pop-eyebrow">for two</span>
            <h1 className="pop-title" style={{ fontSize:"clamp(34px,10vw,48px)" }}>{t.onboardingTitle}</h1>
            <p className="pop-copy" style={{ margin:"0 auto", maxWidth:300 }}>{t.onboardingBody}</p>
          </div>
          <button className="pop-button" data-testid="button-onboarding-done" onClick={onDone} style={{ minWidth:220 }}>{t.onboardingCta}</button>
        </div>
      </div>
    );
  }
  