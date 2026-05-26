import { useState, useCallback } from "react";
import Home from "@/pages/Home";
import CategoryScreen from "@/pages/CategoryScreen";
import ScenarioScreen from "@/pages/ScenarioScreen";
import SplashScreen from "@/components/SplashScreen";
import LanguageSelect from "@/components/LanguageSelect";
import AgeGate, { isAgeConfirmed } from "@/components/AgeGate";
import { LANG_KEY, CATEGORIES_ORDER, type Lang, type Category } from "@/data/i18n";
import { ACTIVE_SCENARIO_KEY, type ActiveScenario } from "@/pages/ScenarioScreen";

type AppPhase = "splash" | "lang" | "home" | "category" | "scenario";

const COUPLE_ID_KEY = "touche_couple_id";

function getSavedLang(): Lang | null {
  try { const v = localStorage.getItem(LANG_KEY); if (v === "ru" || v === "en") return v; } catch {}
  return null;
}

function getCoupleId(): string | null {
  try { return localStorage.getItem(COUPLE_ID_KEY); } catch { return null; }
}

function saveCoupleId(id: string) {
  try { localStorage.setItem(COUPLE_ID_KEY, id); } catch {}
}

function saveActiveScenario(s: ActiveScenario) {
  try { localStorage.setItem(ACTIVE_SCENARIO_KEY, JSON.stringify(s)); } catch {}
}

async function tryFetchPendingScenario(): Promise<ActiveScenario | null> {
  try {
    const coupleId = getCoupleId();
    const initData = window.Telegram?.WebApp?.initData;
    if (!coupleId || !initData) return null;
    const res = await fetch(`/api/scenario/fetch?type=pending&coupleId=${encodeURIComponent(coupleId)}`, {
      headers: { "x-telegram-init-data": initData },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.pending) return null;
    return {
      sessionId: data.sessionId,
      role: "b",
      roleText: data.roleText,
      title: data.title,
      intensity: "passion",
      notified: false,
    };
  } catch {
    return null;
  }
}

async function tryFetchScenarioSession(sessionId: string): Promise<ActiveScenario | null> {
  try {
    const initData = window.Telegram?.WebApp?.initData;
    if (!initData) return null;
    const res = await fetch(`/api/scenario/fetch?type=session&id=${encodeURIComponent(sessionId)}`, {
      headers: { "x-telegram-init-data": initData },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      sessionId: data.sessionId,
      role: data.role,
      roleText: data.roleText,
      title: data.title,
      intensity: "passion",
      notified: false,
    };
  } catch {
    return null;
  }
}

async function tryLinkCouple(refUserId: number): Promise<string | null> {
  try {
    const initData = window.Telegram?.WebApp?.initData;
    if (!initData) return null;
    const res = await fetch("/api/couple/link", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-telegram-init-data": initData,
      },
      body: JSON.stringify({ refUserId }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.coupleId ?? null;
  } catch {
    return null;
  }
}

export default function App() {
  const [phase, setPhase] = useState<AppPhase>("splash");
  const [lang, setLang] = useState<Lang>("ru");
  const [activeCategory, setActiveCategory] = useState<Category>("compliments");
  const [swipeDir, setSwipeDir] = useState<"left" | "right">("left");
  const [linkStatus, setLinkStatus] = useState<"idle" | "linking" | "linked" | "error">("idle");
  const [ageGatePending, setAgeGatePending] = useState<{ action: () => void } | null>(null);

  const requireAge = useCallback((action: () => void) => {
    if (isAgeConfirmed()) { action(); return; }
    setAgeGatePending({ action });
  }, []);

  const handleSplashDone = useCallback(async () => {
    const tg = window.Telegram?.WebApp;
    const saved = getSavedLang();
    const startParam = tg?.initDataUnsafe?.start_param ?? "";

    if (startParam.startsWith("ref_") && !getCoupleId()) {
      const refUserId = parseInt(startParam.replace("ref_", ""), 10);
      if (!isNaN(refUserId) && refUserId !== tg?.initDataUnsafe?.user?.id) {
        setLinkStatus("linking");
        const coupleId = await tryLinkCouple(refUserId);
        if (coupleId) {
          saveCoupleId(coupleId);
          setLinkStatus("linked");
          await new Promise(r => setTimeout(r, 1200));
        } else {
          setLinkStatus("error");
        }
      }
    }

    // Handle scenario deep link: ?scenario=<id>&role=b
    const params = new URLSearchParams(window.location.search);
    const scenarioId = params.get("scenario");
    const role = params.get("role");
    if (scenarioId && role === "b") {
      const session = await tryFetchScenarioSession(scenarioId);
      if (session) {
        saveActiveScenario(session);
        setLang(saved ?? "ru");
        setPhase("scenario");
        return;
      }
    }

    // Check for pending (missed) scenario — bot couldn't deliver it
    try {
      const existing = localStorage.getItem(ACTIVE_SCENARIO_KEY);
      if (!existing) {
        const pending = await tryFetchPendingScenario();
        if (pending) saveActiveScenario(pending);
      }
    } catch {}

    if (saved) { setLang(saved); setPhase("home"); }
    else { setPhase("lang"); }
  }, []);

  const handleLangSelect = useCallback((chosen: Lang) => {
    try { localStorage.setItem(LANG_KEY, chosen); } catch {}
    setLang(chosen);
    setPhase("home");
  }, []);

  const handleLangSwitch = useCallback(() => {
    const next: Lang = lang === "ru" ? "en" : "ru";
    try { localStorage.setItem(LANG_KEY, next); } catch {}
    setLang(next);
  }, [lang]);

  const handleCategorySelect = useCallback((cat: Category) => {
    const curIdx = CATEGORIES_ORDER.indexOf(activeCategory);
    const newIdx = CATEGORIES_ORDER.indexOf(cat);
    setSwipeDir(newIdx >= curIdx ? "left" : "right");
    setActiveCategory(cat);
    setPhase("category");
  }, [activeCategory]);

  const handleCategorySelectWithAgeCheck = useCallback((cat: Category) => {
    const needsAge = cat === "passion" || cat === "hard";
    if (needsAge) requireAge(() => handleCategorySelect(cat));
    else handleCategorySelect(cat);
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
      {phase === "splash"   && <SplashScreen onDone={handleSplashDone} linkStatus={linkStatus} />}
      {phase === "lang"     && <LanguageSelect onSelect={handleLangSelect} />}
      {phase === "home"     && <Home lang={lang} onCategorySelect={handleCategorySelectWithAgeCheck} onScenarioOpen={handleScenarioOpen} onLangSwitch={handleLangSwitch} />}
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
      {phase === "scenario" && <ScenarioScreen lang={lang} onBack={handleBack} />}

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
