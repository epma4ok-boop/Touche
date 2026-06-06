import { useState, useCallback } from "react";
import Home from "@/pages/Home";
import CategoryScreen from "@/pages/CategoryScreen";
import ScenarioScreen from "@/pages/ScenarioScreen";
import SplashScreen from "@/components/SplashScreen";
import LanguageSelect from "@/components/LanguageSelect";
import GenderSelect, { type Gender, GENDER_KEY } from "@/components/GenderSelect";
import AgeGate, { isAgeConfirmed } from "@/components/AgeGate";
import { LANG_KEY, CATEGORIES_ORDER, LANG_CYCLE, type Lang, type Category } from "@/data/i18n";
import { ACTIVE_SCENARIO_KEY, type ActiveScenario } from "@/pages/ScenarioScreen";

type AppPhase = "splash" | "lang" | "gender" | "home" | "category" | "scenario";

const COUPLE_ID_KEY = "touche_couple_id";

function getSavedLang(): Lang | null {
  try {
    const v = localStorage.getItem(LANG_KEY);
    if (v === "ru" || v === "en" || v === "hi" || v === "pt" || v === "es") return v as Lang;
  } catch {}
  return null;
}

function getSavedGender(): Gender | null {
  try {
    const v = localStorage.getItem(GENDER_KEY);
    if (v === "male" || v === "female") return v as Gender;
  } catch {}
  return null;
}

function getCoupleId(): string | null {
  try { return localStorage.getItem(COUPLE_ID_KEY); } catch { return null; }
}

function saveCoupleId(id: string) {
  try { localStorage.setItem(COUPLE_ID_KEY, id); } catch {}
}

function removeCoupleId() {
  try { localStorage.removeItem(COUPLE_ID_KEY); } catch {}
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

export async function apiLinkCouple(refUserId: number): Promise<string | null> {
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
  const [gender, setGender] = useState<Gender>("female");
  const [activeCategory, setActiveCategory] = useState<Category>("compliments");
  const [swipeDir, setSwipeDir] = useState<"left" | "right">("left");
  const [ageGatePending, setAgeGatePending] = useState<{ action: () => void } | null>(null);

  const [coupleId, setCoupleId] = useState<string | null>(getCoupleId);
  const [pendingRefUserId, setPendingRefUserId] = useState<number | null>(null);

  const requireAge = useCallback((action: () => void) => {
    if (isAgeConfirmed()) { action(); return; }
    setAgeGatePending({ action });
  }, []);

  const handleSplashDone = useCallback(async () => {
    const tg = window.Telegram?.WebApp;
    const savedLang = getSavedLang();
    const savedGender = getSavedGender();
    const startParam = tg?.initDataUnsafe?.start_param ?? "";

    if (startParam.startsWith("ref_") && !getCoupleId()) {
      const refUserId = parseInt(startParam.replace("ref_", ""), 10);
      const myId = tg?.initDataUnsafe?.user?.id;
      if (!isNaN(refUserId) && refUserId !== myId) {
        setPendingRefUserId(refUserId);
      }
    }

    const params = new URLSearchParams(window.location.search);
    const scenarioId = params.get("scenario");
    const role = params.get("role");
    if (scenarioId && role === "b") {
      const session = await tryFetchScenarioSession(scenarioId);
      if (session) {
        saveActiveScenario(session);
        setLang(savedLang ?? "ru");
        if (savedGender) setGender(savedGender);
        setPhase("scenario");
        return;
      }
    }

    try {
      const existing = localStorage.getItem(ACTIVE_SCENARIO_KEY);
      if (!existing) {
        const pending = await tryFetchPendingScenario();
        if (pending) saveActiveScenario(pending);
      }
    } catch {}

    if (savedLang) {
      setLang(savedLang);
      if (savedGender) {
        setGender(savedGender);
        setPhase("home");
      } else {
        setPhase("gender");
      }
    } else {
      setPhase("lang");
    }
  }, []);

  const handleLangSelect = useCallback((chosen: Lang) => {
    try { localStorage.setItem(LANG_KEY, chosen); } catch {}
    setLang(chosen);
    // After lang — always show gender selection
    setPhase("gender");
  }, []);

  const handleGenderSelect = useCallback((chosen: Gender) => {
    try { localStorage.setItem(GENDER_KEY, chosen); } catch {}
    setGender(chosen);
    setPhase("home");
  }, []);

  const handleLangSwitch = useCallback(() => {
    const idx = LANG_CYCLE.indexOf(lang);
    const next = LANG_CYCLE[(idx + 1) % LANG_CYCLE.length];
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

  const handleLinkCouple = useCallback(async (refUserId: number): Promise<boolean> => {
    const id = await apiLinkCouple(refUserId);
    if (id) {
      saveCoupleId(id);
      setCoupleId(id);
      setPendingRefUserId(null);
      return true;
    }
    return false;
  }, []);

  const handleUnlinkCouple = useCallback(() => {
    removeCoupleId();
    setCoupleId(null);
  }, []);

  return (
    <>
      {phase === "splash" && <SplashScreen onDone={handleSplashDone} linkStatus="idle" />}
      {phase === "lang"   && <LanguageSelect onSelect={handleLangSelect} />}
      {phase === "gender" && <GenderSelect lang={lang} onSelect={handleGenderSelect} />}
      {phase === "home"   && (
        <Home
          lang={lang}
          coupleId={coupleId}
          pendingRefUserId={pendingRefUserId}
          onCategorySelect={handleCategorySelectWithAgeCheck}
          onScenarioOpen={handleScenarioOpen}
          onLangSwitch={handleLangSwitch}
          onLinkCouple={handleLinkCouple}
          onUnlinkCouple={handleUnlinkCouple}
        />
      )}
      {phase === "category" && (
        <CategoryScreen
          key={activeCategory}
          lang={lang}
          gender={gender}
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
