import { useState, useCallback } from "react";
import Home from "@/pages/Home";
import CategoryScreen from "@/pages/CategoryScreen";
import ScenarioScreen from "@/pages/ScenarioScreen";
import SplashScreen from "@/components/SplashScreen";
import LanguageSelect from "@/components/LanguageSelect";
import AgeGate, { isAgeConfirmed } from "@/components/AgeGate";
import { LANG_KEY, CATEGORIES_ORDER, type Lang, type Category } from "@/data/i18n";

type AppPhase = "splash" | "lang" | "home" | "category" | "scenario";

function getSavedLang(): Lang | null {
  try { const v = localStorage.getItem(LANG_KEY); if (v === "ru" || v === "en") return v; } catch {}
  return null;
}

// Pending scenario from partner — check on every app open
function checkPendingScenario() {
  try {
    const raw = localStorage.getItem("touche_pending_scenario_incoming");
    if (raw) {
      localStorage.removeItem("touche_pending_scenario_incoming");
      return JSON.parse(raw);
    }
  } catch {}
  return null;
}

export default function App() {
  const [phase, setPhase] = useState<AppPhase>("splash");
  const [lang, setLang] = useState<Lang>("en");
  const [activeCategory, setActiveCategory] = useState<Category>("compliments");
  const [swipeDir, setSwipeDir] = useState<"left" | "right">("left");

  // Age gate
  const [ageGatePending, setAgeGatePending] = useState<{ action: () => void } | null>(null);

  const requireAge = useCallback((action: () => void) => {
    if (isAgeConfirmed()) { action(); return; }
    setAgeGatePending({ action });
  }, []);

  const handleSplashDone = useCallback(() => {
    const saved = getSavedLang();
    if (saved) { setLang(saved); setPhase("home"); }
    else { setPhase("lang"); }
    // deliver pending scenario card from partner if any
    const pending = checkPendingScenario();
    if (pending) {
      // TODO: show partner's scenario card — extend ScenarioScreen for "incoming" phase
      console.info("Pending scenario for this partner:", pending);
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

  const handleCategorySelectWithAgeCheck = useCallback((cat: Category) => {
    const needsAge = cat === "passion" || cat === "hard";
    if (needsAge) {
      requireAge(() => handleCategorySelect(cat));
    } else {
      handleCategorySelect(cat);
    }
  }, [handleCategorySelect, requireAge]);

  const handleScenarioOpen = useCallback(() => {
    requireAge(() => setPhase("scenario"));
  }, [requireAge]);

  const handleBack = useCallback(() => setPhase("home"), []);

  const handleCategoryChange = useCallback((cat: Category) => {
    const curIdx = CATEGORIES_ORDER.indexOf(activeCategory);
    const newIdx = CATEGORIES_ORDER.indexOf(cat);
    setSwipeDir(newIdx > curIdx ? "left" : "right");
    setActiveCategory(cat);
  }, [activeCategory]);

  return (
    <>
      {phase === "splash"    && <SplashScreen onDone={handleSplashDone} />}
      {phase === "lang"      && <LanguageSelect onSelect={handleLangSelect} />}
      {phase === "home"      && <Home lang={lang} onCategorySelect={handleCategorySelectWithAgeCheck} onScenarioOpen={handleScenarioOpen} />}
      {phase === "category"  && (
        <CategoryScreen
          key={activeCategory}
          lang={lang}
          category={activeCategory}
          onBack={handleBack}
          onCategoryChange={handleCategoryChange}
          swipeDir={swipeDir}
        />
      )}
      {phase === "scenario"  && <ScenarioScreen lang={lang} onBack={handleBack} />}

      {ageGatePending && (
        <AgeGate
          lang={lang}
          onConfirm={() => { const a = ageGatePending.action; setAgeGatePending(null); a(); }}
          onCancel={() => setAgeGatePending(null)}
        />
      )}
    </>
  );
}
