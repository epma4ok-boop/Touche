import { UI, type Lang } from "@/data/i18n";

  interface Props {
    lang: Lang;
    onDone: () => void;
  }

  export default function OnboardingScreen({ lang, onDone }: Props) {
    const t = UI[lang];

    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "linear-gradient(160deg, #1a0a14 0%, #2d0d22 50%, #1a0a14 100%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "32px 24px",
          gap: "26px",
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              border: "1px solid rgba(210,92,126,.58)",
              background: "radial-gradient(circle, rgba(188,46,74,.24), rgba(188,46,74,.04) 68%)",
              boxShadow: "0 0 28px rgba(188,46,74,.18)",
              margin: "0 auto 16px",
              position: "relative",
            }}
          >
            <span style={{ position: "absolute", left: "50%", top: "50%", width: 22, height: 22, border: "1px solid rgba(255,238,248,.8)", borderRadius: "50%", transform: "translate(-50%,-50%)" }} />
          </div>
          <div
            style={{
              fontFamily: "serif",
              fontSize: "38px",
              fontWeight: 700,
              color: "#fff",
              letterSpacing: "0.05em",
            }}
          >
            {t.appName}
          </div>
          <div
            style={{
              fontSize: "14px",
              color: "rgba(255,255,255,0.5)",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              marginTop: "4px",
            }}
          >
            {t.appSub}
          </div>
        </div>

        {/* Card */}
        <div
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: "20px",
            padding: "28px 24px",
            maxWidth: "320px",
            width: "100%",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          <div
            style={{
              fontSize: "20px",
              fontWeight: 700,
              color: "#fff",
              lineHeight: 1.3,
            }}
          >
            {t.onboardingTitle}
          </div>
          <div
            style={{
              fontSize: "15px",
              color: "rgba(255,255,255,0.7)",
              lineHeight: 1.5,
            }}
          >
            {t.onboardingBody}
          </div>
        </div>

        {/* CTA button */}
        <button
          onClick={onDone}
          style={{
            background: "linear-gradient(135deg, #c83c82, #8c0a50)",
            color: "#fff",
            border: "none",
            borderRadius: "50px",
            padding: "16px 48px",
            fontSize: "16px",
            fontWeight: 700,
            letterSpacing: "0.05em",
            cursor: "pointer",
            boxShadow: "0 4px 24px rgba(200, 60, 130, 0.4)",
            transition: "transform 0.15s, box-shadow 0.15s",
            minWidth: "220px",
          }}
          onTouchStart={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.97)";
          }}
          onTouchEnd={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
          }}
        >
          {t.onboardingCta}
        </button>
      </div>
    );
  }
  