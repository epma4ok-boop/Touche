import { useState } from "react";
import SilhouetteCanvas from "./SilhouetteCanvas";
import type { Lang } from "@/data/i18n";

interface LanguageSelectProps {
  onSelect: (lang: Lang) => void;
}

export default function LanguageSelect({ onSelect }: LanguageSelectProps) {
  const [chosen, setChosen] = useState<Lang | null>(null);

  const pick = (lang: Lang) => {
    setChosen(lang);
    setTimeout(() => onSelect(lang), 480);
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 90,
      background: "#060409",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      opacity: chosen ? 0 : 1,
      transition: chosen ? "opacity 0.45s ease" : "none",
      overflow: "hidden",
    }}>
      {/* Silhouettes at very low opacity */}
      <SilhouetteCanvas r={190} g={30} b={90} opacity={0.7} />

      {/* Bottom vignette */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "linear-gradient(to bottom, rgba(6,4,9,0.5) 0%, rgba(6,4,9,0.1) 40%, rgba(6,4,9,0.1) 60%, rgba(6,4,9,0.7) 100%)",
      }} />

      {/* Content */}
      <div style={{
        position: "relative", zIndex: 2,
        display: "flex", flexDirection: "column",
        alignItems: "center", gap: 0,
        width: "100%", padding: "0 28px",
      }}>
        {/* Title */}
        <p style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontStyle: "italic", fontWeight: 300,
          fontSize: "clamp(46px, 11vw, 64px)",
          color: "#fff8f2",
          letterSpacing: "0.06em", margin: 0,
          textAlign: "center",
          textShadow: "0 0 50px rgba(200,60,120,0.6), 0 4px 20px rgba(0,0,0,0.95)",
          lineHeight: 1,
        }}>
          Touché
        </p>

        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "16px 0 44px" }}>
          <div style={{ width: 28, height: 0.5, background: "rgba(200,60,120,0.4)" }} />
          <p style={{
            fontFamily: "'Raleway', sans-serif", fontWeight: 200,
            fontSize: 8, letterSpacing: "0.32em", textTransform: "uppercase",
            color: "rgba(255,248,242,0.3)", margin: 0,
          }}>
            выберите язык
          </p>
          <div style={{ width: 28, height: 0.5, background: "rgba(200,60,120,0.4)" }} />
        </div>

        {/* Language cards */}
        <div style={{ display: "flex", gap: 14, width: "100%", maxWidth: 320 }}>
          {([
            { lang: "ru" as Lang, primary: "Русский", sub: "Russian" },
            { lang: "en" as Lang, primary: "English", sub: "Английский" },
          ]).map(({ lang, primary, sub }) => (
            <button
              key={lang}
              onClick={() => pick(lang)}
              style={{
                flex: 1,
                padding: "22px 10px",
                borderRadius: 18,
                background: "rgba(190,20,80,0.07)",
                border: "0.5px solid rgba(200,60,120,0.22)",
                backdropFilter: "blur(24px)",
                WebkitBackdropFilter: "blur(24px)",
                cursor: "pointer",
                display: "flex", flexDirection: "column",
                alignItems: "center", gap: 8,
                transition: "all 0.25s ease",
                boxShadow: "0 4px 32px rgba(0,0,0,0.4), inset 0 0 0 0 rgba(200,60,120,0)",
              }}
              onMouseEnter={e => {
                const el = e.currentTarget;
                el.style.background = "rgba(190,20,80,0.14)";
                el.style.borderColor = "rgba(200,60,120,0.5)";
                el.style.boxShadow = "0 4px 40px rgba(190,20,80,0.2), inset 0 0 30px rgba(200,60,120,0.05)";
              }}
              onMouseLeave={e => {
                const el = e.currentTarget;
                el.style.background = "rgba(190,20,80,0.07)";
                el.style.borderColor = "rgba(200,60,120,0.22)";
                el.style.boxShadow = "0 4px 32px rgba(0,0,0,0.4)";
              }}
            >
              <span style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontStyle: "italic", fontWeight: 400, fontSize: 22,
                color: "rgba(255,248,242,0.92)",
                letterSpacing: "0.02em",
              }}>
                {primary}
              </span>
              <span style={{
                fontFamily: "'Raleway', sans-serif", fontWeight: 200,
                fontSize: 8, letterSpacing: "0.24em", textTransform: "uppercase",
                color: "rgba(200,60,120,0.5)",
              }}>
                {sub}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
