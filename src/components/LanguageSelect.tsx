import { useState } from "react";
import type { Lang } from "@/data/i18n";

interface LanguageSelectProps {
  onSelect: (lang: Lang) => void;
}

const ACCENT = { r: 200, g: 60, b: 130 };

export default function LanguageSelect({ onSelect }: LanguageSelectProps) {
  const [chosen, setChosen] = useState<Lang | null>(null);

  const pick = (lang: Lang) => {
    setChosen(lang);
    setTimeout(() => onSelect(lang), 420);
  };

  const { r, g, b } = ACCENT;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 90,
        background: "#030508",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        opacity: chosen ? 0 : 1,
        transition: chosen ? "opacity 0.4s ease" : "none",
      }}
    >
      {/* Small orb decoration */}
      <div style={{ position: "relative", width: 56, height: 56, marginBottom: 38 }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            border: `0.5px solid rgba(${r},${g},${b},0.5)`,
            boxShadow: `0 0 22px 7px rgba(${r},${g},${b},0.18)`,
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 4,
            borderRadius: "50%",
            background: `radial-gradient(circle at 40% 35%, rgba(${r},${g},${b},0.35), rgba(${r},${g},${b},0.05))`,
          }}
        />
      </div>

      <p
        style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontStyle: "italic",
          fontWeight: 300,
          fontSize: 22,
          color: "rgba(255,252,245,0.7)",
          letterSpacing: "0.04em",
          margin: 0,
          marginBottom: 6,
        }}
      >
        Выберите язык
      </p>
      <p
        style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontStyle: "italic",
          fontWeight: 300,
          fontSize: 13,
          color: "rgba(255,252,245,0.25)",
          letterSpacing: "0.06em",
          margin: 0,
          marginBottom: 44,
        }}
      >
        Choose your language
      </p>

      <div style={{ display: "flex", gap: 16 }}>
        {([
          { lang: "ru" as Lang, primary: "Русский", sub: "Russian" },
          { lang: "en" as Lang, primary: "English", sub: "Английский" },
        ]).map(({ lang, primary, sub }) => (
          <button
            key={lang}
            onClick={() => pick(lang)}
            style={{
              width: 140,
              padding: "20px 12px",
              borderRadius: 18,
              background: `rgba(${r},${g},${b},0.06)`,
              border: `0.5px solid rgba(${r},${g},${b},0.25)`,
              boxShadow: `0 0 24px rgba(${r},${g},${b},0.08)`,
              backdropFilter: "blur(16px)",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 6,
              transition: "all 0.2s",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = `rgba(${r},${g},${b},0.13)`;
              (e.currentTarget as HTMLButtonElement).style.borderColor = `rgba(${r},${g},${b},0.5)`;
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = `rgba(${r},${g},${b},0.06)`;
              (e.currentTarget as HTMLButtonElement).style.borderColor = `rgba(${r},${g},${b},0.25)`;
            }}
          >
            <span
              style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontStyle: "italic",
                fontWeight: 400,
                fontSize: 20,
                color: "rgba(255,252,245,0.88)",
                letterSpacing: "0.03em",
              }}
            >
              {primary}
            </span>
            <span
              style={{
                fontFamily: "'Raleway', sans-serif",
                fontWeight: 200,
                fontSize: 9,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: `rgba(${r},${g},${b},0.45)`,
              }}
            >
              {sub}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
