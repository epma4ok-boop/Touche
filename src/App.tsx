import { useState, useCallback } from "react";
import Home from "@/pages/Home";
import CategoryScreen from "@/pages/CategoryScreen";
import SplashScreen from "@/components/SplashScreen";
import LanguageSelect from "@/components/LanguageSelect";
import { LANG_KEY, CATEGORIES_ORDER, type Lang, type Category } from "@/data/i18n";

type AppPhase = "splash" | "lang" | "home" | "category";

function getSavedLang(): Lang | null {
  try {
    const v = localStorage.getItem(LANG_KEY);
    if (v === "ru" || v === "en") return v;
  } catch {}
  return null;
}

export default function App() {
  const [phase, setPhase] = useState<AppPhase>("splash");
  const [lang, setLang] = useState<Lang>("en");
  const [activeCategory, setActiveCategory] = useState<Category>("compliments");
  const [swipeDir, setSwipeDir] = useState<"left" | "right">("left");

  const handleSplashDone = useCallback(() => {
    const saved = getSavedLang();
    if (saved) {
      setLang(saved);
      setPhase("home");
    } else {
      setPhase("lang");
    }
  }, []);

  const handleLangSelect = useCallback((chosen: Lang) => {
    try { localStorage.setItem(LANG_KEY, chosen); } catch {}
    setLang(chosen);
    setPhase("home");
  }, []);

  const handleCategorySelect = useCallback((cat: Category) => {
    const curIdx = CATEGORIES_ORDER.indexOf(activeCategory);
    const newIdx = CATEGORIES_ORDER.indexOf(cat);
    setSwipeDir(newIdx >= curIdx ? "left" : "right");
    setActiveCategory(cat);
    setPhase("category");
  }, [activeCategory]);

  const handleBack = useCallback(() => {
    setPhase("home");
  }, []);

  const handleCategoryChange = useCallback((cat: Category) => {
    const curIdx = CATEGORIES_ORDER.indexOf(activeCategory);
    const newIdx = CATEGORIES_ORDER.indexOf(cat);
    setSwipeDir(newIdx > curIdx ? "left" : "right");
    setActiveCategory(cat);
  }, [activeCategory]);

  return (
    <>
      {phase === "splash" && <SplashScreen onDone={handleSplashDone} />}
      {phase === "lang" && <LanguageSelect onSelect={handleLangSelect} />}
      {phase === "home" && <Home lang={lang} onCategorySelect={handleCategorySelect} />}
      {phase === "category" && (
        <CategoryScreen
          key={activeCategory}
          lang={lang}
          category={activeCategory}
          onBack={handleBack}
          onCategoryChange={handleCategoryChange}
          swipeDir={swipeDir}
        />
      )}
    </>
  );
}
