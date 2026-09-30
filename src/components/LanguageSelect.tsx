import { useEffect, useState } from "react";
import type { Lang } from "@/data/i18n";
import "./SupportPop.css";

interface LanguageSelectProps {
  currentLang?: Lang;
  onSelect: (lang: Lang) => void;
  onCancel?: () => void;
}

const LANGUAGES: { lang: Lang; code: string; native: string; english: string }[] = [
  { lang: "ru", code: "RU", native: "Русский", english: "Russian" },
  { lang: "en", code: "EN", native: "English", english: "English" },
  { lang: "hi", code: "HI", native: "हिन्दी", english: "Hindi" },
  { lang: "pt", code: "PT", native: "Português", english: "Portuguese (Brazil)" },
  { lang: "es", code: "ES", native: "Español", english: "Spanish" },
];

const PICKER_COPY: Record<Lang, { title: string; instruction: string; continue: string; back: string }> = {
  ru: {
    title: "Выберите язык",
    instruction: "Нажмите на строку, выберите язык и нажмите «Продолжить».",
    continue: "Продолжить",
    back: "Назад",
  },
  en: {
    title: "Choose your language",
    instruction: "Select a row, then continue.",
    continue: "Continue",
    back: "Back",
  },
  hi: {
    title: "अपनी भाषा चुनें",
    instruction: "एक भाषा चुनें, फिर आगे बढ़ें।",
    continue: "आगे बढ़ें",
    back: "वापस",
  },
  pt: {
    title: "Escolha seu idioma",
    instruction: "Toque em um idioma e depois em Continuar.",
    continue: "Continuar",
    back: "Voltar",
  },
  es: {
    title: "Elige tu idioma",
    instruction: "Elige un idioma y pulsa Continuar.",
    continue: "Continuar",
    back: "Volver",
  },
};

export default function LanguageSelect({ currentLang, onSelect, onCancel }: LanguageSelectProps) {
  const [chosen, setChosen] = useState<Lang | null>(currentLang ?? null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setMounted(true));
  }, []);

  const copyLang = currentLang ?? chosen;
  const continueLabel = chosen ? PICKER_COPY[chosen].continue : "Select a language";
  const pickerTitle = copyLang ? PICKER_COPY[copyLang].title : "Choose your language / Выберите язык";
  const pickerInstruction = copyLang
    ? PICKER_COPY[copyLang].instruction
    : "Tap a row, then continue · Нажмите на строку · पंक्ति चुनें · Toque em um idioma · Elige un idioma";

  return (
    <div className="pop-screen" data-testid="screen-language">
      <div className="pop-screen__inner language-picker pop-fade" data-mounted={mounted}>
        <header className="language-picker__header">
          <div className="pop-brand">Touché<em>.</em></div>
          <h1 className="language-picker__title">{pickerTitle}</h1>
          <p className="language-picker__hint">
            Выберите язык · Select a language · भाषा चुनें · Escolha o idioma · Elige tu idioma
          </p>
          <p className="language-picker__instruction">{pickerInstruction}</p>
        </header>

        <fieldset className="language-picker__table" aria-label="Available languages">
          {LANGUAGES.map(({ lang, code, native, english }) => (
            <label
              className="language-picker__option"
              data-selected={chosen === lang}
              data-testid={`row-language-${lang}`}
              key={lang}
            >
              <input
                className="language-picker__radio"
                type="radio"
                name="app-language"
                value={lang}
                checked={chosen === lang}
                onChange={() => setChosen(lang)}
                data-testid={`input-language-${lang}`}
              />
              <span className="language-picker__code" aria-hidden="true">{code}</span>
              <span className="language-picker__names">
                <strong>{native}</strong>
                <small>{english}</small>
              </span>
              <span className="language-picker__check" aria-hidden="true">
                {chosen === lang ? "✓" : ""}
              </span>
            </label>
          ))}
        </fieldset>

        <div className="language-picker__actions">
          {onCancel && currentLang && (
            <button
              className="pop-button pop-outline"
              type="button"
              onClick={onCancel}
              data-testid="button-language-cancel"
            >
              {PICKER_COPY[currentLang].back}
            </button>
          )}
          <button
            className="pop-button language-picker__continue"
            type="button"
            disabled={!chosen}
            onClick={() => chosen && onSelect(chosen)}
            data-testid="button-language-continue"
          >
            {continueLabel}
            {chosen && <span className="language-picker__continue-name"> · {LANGUAGES.find(item => item.lang === chosen)?.native}</span>}
          </button>
        </div>
      </div>
    </div>
  );
}