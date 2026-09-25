import { useState, useCallback, useEffect } from "react";
import Home from "@/pages/Home";
import CategoryScreen from "@/pages/CategoryScreen";
import ScenarioScreen from "@/pages/ScenarioScreen";
import SplashScreen from "@/components/SplashScreen";
import LanguageSelect from "@/components/LanguageSelect";
import { type Gender, GENDER_KEY } from "@/components/GenderSelect";
import OnboardingScreen from "@/components/OnboardingScreen";
import { LANG_KEY, ONBOARDED_KEY, CATEGORIES_ORDER, LANG_CYCLE, type Lang, type Category } from "@/data/i18n";
import { ACTIVE_SCENARIO_KEY, type ActiveScenario } from "@/pages/ScenarioScreen";

type AppPhase = "splash" | "lang" | "onboarding" | "gender" | "home" | "category" | "scenario";
export type AppMode = "solo" | "together";

const COUPLE_ID_KEY = "touche_couple_id";
const MODE_KEY = "touche_mode";
const USER_ID_KEY = "touche_user_id";
const HISTORY_KEY = "touche_history_v2";

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

function isOnboarded(): boolean {
    try { return !!localStorage.getItem(ONBOARDED_KEY); } catch { return false; }
}

function markOnboarded() {
    try { localStorage.setItem(ONBOARDED_KEY, "1"); } catch {}
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

function getSavedMode(hasCouple = false): AppMode {
    try {
      const v = localStorage.getItem(MODE_KEY);
      if (v === "solo") return "solo";
      if (v === "together" && hasCouple) return "together";
    } catch {}
    return hasCouple ? "together" : "solo";
}

function saveMode(mode: AppMode) {
    try { localStorage.setItem(MODE_KEY, mode); } catch {}
}

function saveActiveScenario(s: ActiveScenario) {
    try { localStorage.setItem(ACTIVE_SCENARIO_KEY, JSON.stringify(s)); } catch {}
}

function clearUserScopedData() {
  try {
    localStorage.removeItem(COUPLE_ID_KEY);
    localStorage.removeItem(MODE_KEY);
    localStorage.removeItem(ACTIVE_SCENARIO_KEY);
    localStorage.removeItem(HISTORY_KEY);
  } catch {}
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
        intensity: data.intensity ?? "passion",
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
        intensity: data.intensity ?? "passion",
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

async function apiUnlinkCouple(): Promise<boolean> {
  const initData = window.Telegram?.WebApp?.initData;
  if (!initData) return false;
  try {
    const res = await fetch("/api/couple/link", {
      method: "DELETE",
      headers: { "x-telegram-init-data": initData },
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function apiSubscribe(lang: Lang): Promise<boolean> {
  const initData = window.Telegram?.WebApp?.initData;
  if (!initData) return false;
  try {
    const res = await fetch("/api/subscription/invoice", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-telegram-init-data": initData },
      body: JSON.stringify({ lang }),
    });
    if (!res.ok) return false;
    const { invoiceLink } = await res.json();
    if (!invoiceLink) return false;
    const tg = window.Telegram?.WebApp as any;
    if (typeof tg?.openInvoice === "function") {
      return await new Promise<boolean>((resolve) => {
        tg.openInvoice(invoiceLink, (status: string) => resolve(status === "paid"));
      });
    } else {
      tg?.openTelegramLink?.(invoiceLink);
      return true;
    }
  } catch {
    return false;
  }
}

export default function App() {
    useEffect(() => {
      const tg = window.Telegram?.WebApp;
      if (tg) {
        tg.ready();
        tg.expand();
      }
    }, []);

    const [phase, setPhase] = useState<AppPhase>("splash");
    const [lang, setLang] = useState<Lang>("ru");
  const [gender, setGender] = useState<Gender | undefined>(getSavedGender() ?? undefined);
    const [activeCategory, setActiveCategory] = useState<Category>("compliments");
    const [swipeDir, setSwipeDir] = useState<"left" | "right">("left");
    const [coupleId, setCoupleId] = useState<string | null>(getCoupleId);
    const [mode, setMode] = useState<AppMode>(() => getSavedMode(!!getCoupleId()));
    const [pendingRefUserId, setPendingRefUserId] = useState<number | null>(null);

    useEffect(() => {
      const telegramUserId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
      if (!telegramUserId) return;
      try {
        const previous = localStorage.getItem(USER_ID_KEY);
        if (previous && previous !== String(telegramUserId)) {
          clearUserScopedData();
          setCoupleId(null);
          setMode("solo");
        }
        localStorage.setItem(USER_ID_KEY, String(telegramUserId));
      } catch {}
    }, []);

    useEffect(() => {
      const tg = window.Telegram?.WebApp;
      if (!/^invite_[1-9][0-9]*$/.test(tg?.initDataUnsafe?.start_param ?? "") || !tg?.initData) return;
      // The server checks Telegram's signed start_param; client state never grants credits.
      fetch("/api/referrals/claim", {
        method: "POST",
        headers: { "x-telegram-init-data": tg.initData },
      }).then((res) => {
        if (!res.ok) console.error("Could not claim friend invitation", res.status);
      }).catch((error) => console.error("Could not claim friend invitation", error));
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
        if (savedGender) setGender(savedGender);
        setPhase("home");
      } else {
        setPhase("lang");
      }
    }, []);

    const handleLangSelect = useCallback((chosen: Lang) => {
      try { localStorage.setItem(LANG_KEY, chosen); } catch {}
      setLang(chosen);
      if (!isOnboarded()) setPhase("onboarding");
      else setPhase("home");
    }, []);

    const handleOnboardingDone = useCallback(() => {
      markOnboarded();
      setPhase("home");
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
      handleCategorySelect(cat);
    }, [handleCategorySelect]);

    const handleScenarioOpen = useCallback(() => setPhase("scenario"), []);

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
        saveMode("together");
        setMode("together");
        setPendingRefUserId(null);
        return true;
      }
      return false;
    }, []);

    const handleUnlinkCouple = useCallback(async (): Promise<boolean> => {
      const ok = await apiUnlinkCouple();
      if (!ok) return false;
      removeCoupleId();
      setCoupleId(null);
      saveMode("solo");
      setMode("solo");
      return true;
    }, []);

    const handleModeChange = useCallback((nextMode: AppMode) => {
      saveMode(nextMode);
      setMode(nextMode);
    }, []);

    return (
      <>
        {phase === "splash"      && <SplashScreen onDone={handleSplashDone} linkStatus="idle" skipDelay={!!getSavedLang() && isOnboarded()} />}
        {phase === "lang"        && <LanguageSelect onSelect={handleLangSelect} />}
        {phase === "onboarding"  && <OnboardingScreen lang={lang} onDone={handleOnboardingDone} />}
        {phase === "home"        && (
          <Home
            lang={lang}
            coupleId={coupleId}
             mode={mode}
            pendingRefUserId={pendingRefUserId}
            onCategorySelect={handleCategorySelectWithAgeCheck}
            onScenarioOpen={handleScenarioOpen}
            onLangSwitch={handleLangSwitch}
            gender={gender}
            onGenderSwitch={(g) => {
              try { localStorage.setItem(GENDER_KEY, g); } catch {}
              setGender(g);
            }}
             onModeChange={handleModeChange}
            onLinkCouple={handleLinkCouple}
             onUnlinkCouple={handleUnlinkCouple}
             onSubscribe={() => apiSubscribe(lang)}
          />
        )}
        {phase === "category"    && (
          <CategoryScreen
            key={activeCategory}
            lang={lang}
            gender={gender}
            category={activeCategory}
            onBack={handleBack}
            onCategoryChange={handleCategoryChange}
            swipeDir={swipeDir}
            coupleId={coupleId}
             mode={mode}
             onUpgrade={() => apiSubscribe(lang)}
          />
        )}
        {phase === "scenario"    && <ScenarioScreen lang={lang} gender={gender} onBack={handleBack} onUpgrade={() => apiSubscribe(lang)} />}
      </>
    );
  }
  