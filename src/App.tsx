import { useState, useCallback, useEffect, useRef } from "react";
import Home from "@/pages/Home";
import CategoryScreen from "@/pages/CategoryScreen";
import ScenarioScreen from "@/pages/ScenarioScreen";
import SplashScreen from "@/components/SplashScreen";
import LanguageSelect from "@/components/LanguageSelect";
import GenderSelect, { type Gender, GENDER_KEY } from "@/components/GenderSelect";
import OnboardingScreen from "@/components/OnboardingScreen";
import { LANG_KEY, ONBOARDED_KEY, CATEGORIES_ORDER, type Lang, type Category } from "@/data/i18n";
import { ACTIVE_SCENARIO_KEY, getActiveScenarioStorageKey, type ActiveScenario } from "@/pages/ScenarioScreen";
import type { SharedTaskSnapshot } from "@/data/sharedPair";
import FirstRunTutorial, { type TutorialStep } from "@/components/FirstRunTutorial";
import { saveLanguagePreference, trackAnalyticsEvent } from "@/analytics";
import LovePathScreen from "@/pages/LovePathScreen";
import GamesScreen from "@/pages/GamesScreen";
import TarotScreen from "@/pages/TarotScreen";
import "./touche-redesign.css";
import "./pale-violet-theme.css";

type AppPhase = "splash" | "lang" | "onboarding" | "gender" | "home" | "category" | "scenario" | "shared_task_error" | "love_path" | "games" | "tarot";
export type AppMode = "solo" | "together";

const COUPLE_ID_KEY = "touche_couple_id";
const MODE_KEY = "touche_mode";
const USER_ID_KEY = "touche_user_id";
const HISTORY_KEY = "touche_history_v2";
const TUTORIAL_KEY = "touche_tutorial_v1";

const SHARED_TASK_ERROR_COPY: Record<Lang, { back: string; title: string; body: string; retry: string; home: string }> = {
  ru: {
    back: "Назад", title: "Не удалось открыть общее задание",
    body: "Проверьте подключение и попробуйте ещё раз. Задание доступно только участникам этой пары.",
    retry: "Попробовать снова", home: "На главную",
  },
  en: {
    back: "Back", title: "Could not open the shared task",
    body: "Check your connection and try again. This task is only available to members of this pair.",
    retry: "Try again", home: "Go home",
  },
  hi: {
    back: "वापस", title: "साझा टास्क नहीं खुल सका",
    body: "कनेक्शन जाँचें और फिर कोशिश करें। यह टास्क केवल इस जोड़ी के सदस्यों के लिए है।",
    retry: "फिर कोशिश करें", home: "होम जाएँ",
  },
  pt: {
    back: "Voltar", title: "Não foi possível abrir a tarefa compartilhada",
    body: "Verifique sua conexão e tente novamente. Esta tarefa está disponível apenas para os membros deste casal.",
    retry: "Tentar novamente", home: "Ir para o início",
  },
  es: {
    back: "Volver", title: "No se pudo abrir la tarea compartida",
    body: "Comprueba tu conexión e inténtalo de nuevo. Esta tarea solo está disponible para los miembros de esta pareja.",
    retry: "Intentar de nuevo", home: "Ir al inicio",
  },
};

function getTutorialStorageKey(userId: number): string {
  return `${TUTORIAL_KEY}_${userId}`;
}

function getTelegramStartParam(): string {
  const fromInitData = window.Telegram?.WebApp?.initDataUnsafe?.start_param;
  if (typeof fromInitData === "string" && fromInitData) return fromInitData;

  const params = new URLSearchParams(window.location.search);
  return params.get("tgWebAppStartParam") ?? params.get("startapp") ?? "";
}

async function apiFetchSharedTask(taskId: string): Promise<SharedTaskSnapshot | null> {
  const initData = window.Telegram?.WebApp?.initData;
  if (!initData) return null;
  try {
    const response = await fetch(`/api/couple/intimacy?action=task&task_id=${encodeURIComponent(taskId)}`, {
      headers: { "x-telegram-init-data": initData },
    });
    if (!response.ok) return null;
    const data = await response.json();
    const task = data.task;
    if (
      !task ||
      typeof task.taskId !== "string" ||
      typeof task.task !== "string" ||
      typeof data.coupleId !== "string" ||
      !CATEGORIES_ORDER.includes(task.category as Category) ||
      !["ready", "waiting_for_partner", "your_turn", "completed"].includes(task.state)
    ) return null;
    return { ...task, coupleId: data.coupleId } as SharedTaskSnapshot;
  } catch {
    return null;
  }
}

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
    try { localStorage.setItem(getActiveScenarioStorageKey(), JSON.stringify(s)); } catch {}
}

function clearUserScopedData(userId?: string) {
  try {
    localStorage.removeItem(COUPLE_ID_KEY);
    localStorage.removeItem(MODE_KEY);
    localStorage.removeItem(ACTIVE_SCENARIO_KEY);
    localStorage.removeItem(getActiveScenarioStorageKey(userId));
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

async function apiFetchCoupleId(): Promise<string | null | undefined> {
  const initData = window.Telegram?.WebApp?.initData;
  if (!initData) return undefined;
  try {
    const res = await fetch("/api/couple/link", {
      headers: { "x-telegram-init-data": initData },
    });
    if (!res.ok) return undefined;
    const data = await res.json();
    if (data.coupleId === null) return null;
    return typeof data.coupleId === "string" ? data.coupleId : undefined;
  } catch {
    return undefined;
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

export async function apiBuyPremiumTask(category: Category, lang: Lang): Promise<boolean> {
  const initData = window.Telegram?.WebApp?.initData;
  if (!initData) return false;
  try {
    const res = await fetch("/api/payments/invoice", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-telegram-init-data": initData },
      body: JSON.stringify({ product: "premium_task", category, lang }),
    });
    if (!res.ok) return false;
    const { invoiceLink } = await res.json();
    if (!invoiceLink) return false;
    const tg = window.Telegram?.WebApp as any;
    if (typeof tg?.openInvoice === "function") {
      return await new Promise<boolean>((resolve) => {
        tg.openInvoice(invoiceLink, (status: string) => resolve(status === "paid"));
      });
    }
    tg?.openTelegramLink?.(invoiceLink);
    return true;
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
    const [phaseAfterGender, setPhaseAfterGender] = useState<"home" | "category" | "scenario" | "love_path">("home");
    const [lang, setLang] = useState<Lang>("ru");
  const [gender, setGender] = useState<Gender | undefined>(getSavedGender() ?? undefined);
    const [activeCategory, setActiveCategory] = useState<Category>("compliments");
    const [swipeDir, setSwipeDir] = useState<"left" | "right">("left");
    const [coupleId, setCoupleId] = useState<string | null>(getCoupleId);
    const [mode, setMode] = useState<AppMode>(() => getSavedMode(!!getCoupleId()));
    const [pendingRefUserId, setPendingRefUserId] = useState<number | null>(null);
     const [sharedTask, setSharedTask] = useState<SharedTaskSnapshot | null>(null);
     const [failedSharedTaskId, setFailedSharedTaskId] = useState<string | null>(null);
     const [tutorialStep, setTutorialStep] = useState<TutorialStep | null>(null);
     const [tutorialPairFlowOpen, setTutorialPairFlowOpen] = useState(false);
     const tutorialEligibleRef = useRef(true);
     const tutorialSeenRef = useRef(false);
    const analyticsOpenTrackedRef = useRef(false);
    const analyticsScreenRef = useRef<AppPhase | null>(null);
    const languagePreferenceSyncedRef = useRef<Lang | null>(null);

    useEffect(() => {
      if (phase === "splash" || phase === "lang") return;
      if (languagePreferenceSyncedRef.current === lang) return;
      languagePreferenceSyncedRef.current = lang;
      saveLanguagePreference(lang);
    }, [lang, phase]);

    useEffect(() => {
      if (analyticsOpenTrackedRef.current) return;
      analyticsOpenTrackedRef.current = true;
      trackAnalyticsEvent("app_open");
    }, []);

    useEffect(() => {
      if (!["lang", "onboarding", "gender", "home", "category", "scenario", "shared_task_error"].includes(phase)) return;
      if (analyticsScreenRef.current === phase) return;
      analyticsScreenRef.current = phase;
      const screen = phase === "lang" ? "language" : phase;
      trackAnalyticsEvent("screen_view", screen as "language" | "onboarding" | "gender" | "home" | "category" | "scenario" | "shared_task_error");
    }, [phase]);

    useEffect(() => {
      const telegramUserId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
      if (!telegramUserId) return;
      try {
        const previous = localStorage.getItem(USER_ID_KEY);
        if (previous && previous !== String(telegramUserId)) {
          clearUserScopedData(previous);
          setCoupleId(null);
          setMode("solo");
          setSharedTask(null);
          setFailedSharedTaskId(null);
        }
        localStorage.setItem(USER_ID_KEY, String(telegramUserId));
      } catch {}
    }, []);

    useEffect(() => {
      let active = true;
      const refreshCouple = async () => {
        const serverCoupleId = await apiFetchCoupleId();
        if (!active || serverCoupleId === undefined) return;

        if (serverCoupleId) {
          saveCoupleId(serverCoupleId);
          setCoupleId(serverCoupleId);
          setMode(getSavedMode(true));
          return;
        }

        removeCoupleId();
        saveMode("solo");
        setCoupleId(null);
        setMode("solo");
      };
      const refreshWhenVisible = () => {
        if (document.visibilityState === "visible") void refreshCouple();
      };
      const pollVisibleCouple = () => {
        if (document.visibilityState === "visible") void refreshCouple();
      };

      void refreshCouple();
      window.addEventListener("focus", refreshCouple);
      document.addEventListener("visibilitychange", refreshWhenVisible);
      const refreshInterval = window.setInterval(pollVisibleCouple, 15_000);
      return () => {
        active = false;
        window.removeEventListener("focus", refreshCouple);
        document.removeEventListener("visibilitychange", refreshWhenVisible);
        window.clearInterval(refreshInterval);
      };
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
      const startParam = getTelegramStartParam();
       const initialParams = new URLSearchParams(window.location.search);
       if (
         /^invite_[1-9][0-9]*$/.test(startParam) ||
         /^ref_[1-9][0-9]*$/.test(startParam) ||
         initialParams.has("shared_task") ||
         initialParams.has("scenario") ||
          initialParams.get("wish_map") === "1" ||
          initialParams.get("love_path") === "1"
       ) tutorialEligibleRef.current = false;

      const pairInvite = /^ref_([1-9][0-9]*)$/.exec(startParam);
      if (pairInvite) {
        const refUserId = Number(pairInvite[1]);
        const myId = tg?.initDataUnsafe?.user?.id;
        if (Number.isSafeInteger(refUserId) && refUserId !== myId) {
          setPendingRefUserId(refUserId);
        }
      }

       const params = initialParams;
      const openLovePath = params.get("love_path") === "1";
      if (openLovePath) setPhaseAfterGender("love_path");
      const sharedTaskId = params.get("shared_task");
      if (sharedTaskId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sharedTaskId)) {
        const loadedTask = await apiFetchSharedTask(sharedTaskId);
        if (!loadedTask) {
          setFailedSharedTaskId(sharedTaskId);
          setPhase("shared_task_error");
          return;
        }
        setSharedTask(loadedTask);
        setActiveCategory(loadedTask.category);
        saveCoupleId(loadedTask.coupleId);
        setCoupleId(loadedTask.coupleId);
        saveMode("together");
        setMode("together");
        setLang(savedLang ?? "ru");
        if (savedGender) setGender(savedGender);
        setPhaseAfterGender("category");
        setPhase(savedLang ? (savedGender ? "category" : "gender") : "lang");
        return;
      }
      const scenarioId = params.get("scenario");
      const role = params.get("role");
      if (scenarioId && (role === "a" || role === "b")) {
        const session = await tryFetchScenarioSession(scenarioId);
        if (session) {
          saveActiveScenario(session);
          setLang(savedLang ?? "ru");
          if (savedGender) setGender(savedGender);
          setPhaseAfterGender("scenario");
          setPhase(savedLang ? (savedGender ? "scenario" : "gender") : "lang");
          return;
        }
      }

      if (params.get("wish_map") === "1") {
        saveMode("together");
        setMode("together");
      }

      try {
        const storageKey = getActiveScenarioStorageKey();
        const existing = localStorage.getItem(storageKey);
        const legacyScenario = localStorage.getItem(ACTIVE_SCENARIO_KEY);
        if (legacyScenario) localStorage.removeItem(ACTIVE_SCENARIO_KEY);

        if (!existing && legacyScenario) {
          const parsed = JSON.parse(legacyScenario) as { sessionId?: unknown };
          if (typeof parsed.sessionId === "string" && parsed.sessionId) {
            // Re-fetch from the server so a legacy shared key can never expose
            // the previous Telegram user's role to the current account.
            const restored = await tryFetchScenarioSession(parsed.sessionId);
            if (restored) {
              saveActiveScenario(restored);
              setLang(savedLang ?? "ru");
              if (savedGender) setGender(savedGender);
              setPhaseAfterGender("scenario");
              setPhase(savedLang ? (savedGender ? "scenario" : "gender") : "lang");
              return;
            }
          }
        }

        if (!existing) {
          const pending = await tryFetchPendingScenario();
          if (pending) saveActiveScenario(pending);
        }
      } catch {}

      if (savedLang) {
        setLang(savedLang);
        if (savedGender) setGender(savedGender);
        setPhase(savedGender ? (openLovePath ? "love_path" : "home") : "gender");
      } else {
        setPhase("lang");
      }
    }, []);

     useEffect(() => {
       if (phase !== "home" || !tutorialEligibleRef.current || tutorialSeenRef.current) return;
       const telegramUserId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
       if (!telegramUserId) return;
       try {
         if (localStorage.getItem(getTutorialStorageKey(telegramUserId)) === "1") {
           tutorialSeenRef.current = true;
           return;
         }
       } catch {
         // The tour remains skippable if Telegram storage is unavailable.
       }
       tutorialSeenRef.current = true;
       setTutorialStep(1);
     }, [phase]);

     const completeTutorial = useCallback(() => {
       const telegramUserId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
       if (telegramUserId) {
         try { localStorage.setItem(getTutorialStorageKey(telegramUserId), "1"); } catch {}
       }
       tutorialSeenRef.current = true;
       setTutorialStep(null);
       setTutorialPairFlowOpen(false);
       setSharedTask(null);
       if (phase !== "home") setPhase("home");
     }, [phase]);

    const handleLangSelect = useCallback((chosen: Lang) => {
      try { localStorage.setItem(LANG_KEY, chosen); } catch {}
      trackAnalyticsEvent("language_selected");
      setLang(chosen);
      if (!isOnboarded()) setPhase("onboarding");
      else setPhase(gender ? phaseAfterGender : "gender");
    }, [gender, phaseAfterGender]);

    const handleOnboardingDone = useCallback(() => {
      markOnboarded();
      trackAnalyticsEvent("onboarding_completed");
      setPhase(gender ? phaseAfterGender : "gender");
    }, [gender, phaseAfterGender]);

    const handleGenderSelect = useCallback((chosen: Gender) => {
      try { localStorage.setItem(GENDER_KEY, chosen); } catch {}
      trackAnalyticsEvent("gender_selected");
      setGender(chosen);
      setPhase(phaseAfterGender);
    }, [phaseAfterGender]);

    const handleLanguageOpen = useCallback(() => setPhase("lang"), []);
    const handleLanguageCancel = useCallback(() => setPhase("home"), []);

    const handleCategorySelect = useCallback((cat: Category) => {
      const curIdx = CATEGORIES_ORDER.indexOf(activeCategory);
      const newIdx = CATEGORIES_ORDER.indexOf(cat);
      setSwipeDir(newIdx >= curIdx ? "left" : "right");
      setActiveCategory(cat);
      setSharedTask(null);
      if (tutorialStep === 3 && cat === "compliments") setTutorialStep(4);
      setPhase("category");
    }, [activeCategory, tutorialStep]);

    const handleCategorySelectWithAgeCheck = useCallback((cat: Category) => {
      handleCategorySelect(cat);
    }, [handleCategorySelect]);

    const handleScenarioOpen = useCallback(() => setPhase("scenario"), []);

    const handleBack = useCallback(() => {
      setSharedTask(null);
      setPhase("home");
    }, []);

    const handleOpenSharedTask = useCallback(async (taskId: string) => {
      const loadedTask = await apiFetchSharedTask(taskId);
      if (!loadedTask) {
        setFailedSharedTaskId(taskId);
        setPhase("shared_task_error");
        return;
      }
      setSharedTask(loadedTask);
      setActiveCategory(loadedTask.category);
      saveCoupleId(loadedTask.coupleId);
      setCoupleId(loadedTask.coupleId);
      saveMode("together");
      setMode("together");
      setPhase("category");
    }, []);

    const handleRetrySharedTask = useCallback(() => {
      if (failedSharedTaskId) void handleOpenSharedTask(failedSharedTaskId);
    }, [failedSharedTaskId, handleOpenSharedTask]);

    const handleCategoryChange = useCallback((cat: Category) => {
      const curIdx = CATEGORIES_ORDER.indexOf(activeCategory);
      const newIdx = CATEGORIES_ORDER.indexOf(cat);
      setSwipeDir(newIdx > curIdx ? "left" : "right");
      setActiveCategory(cat);
      if (sharedTask?.category !== cat) setSharedTask(null);
    }, [activeCategory, sharedTask]);

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
        {phase === "lang"        && (
          <LanguageSelect
            currentLang={getSavedLang() ?? undefined}
            onSelect={handleLangSelect}
            onCancel={getSavedLang() ? handleLanguageCancel : undefined}
          />
        )}
        {phase === "onboarding"  && <OnboardingScreen lang={lang} onDone={handleOnboardingDone} onBack={() => setPhase("lang")} />}
        {phase === "gender"      && <GenderSelect lang={lang} onSelect={handleGenderSelect} onBack={() => setPhase(isOnboarded() ? "onboarding" : "lang")} />}
        {phase === "home"        && (
          <Home
            lang={lang}
            coupleId={coupleId}
             mode={mode}
            pendingRefUserId={pendingRefUserId}
            onCategorySelect={handleCategorySelectWithAgeCheck}
            onScenarioOpen={handleScenarioOpen}
             onOpenSharedTask={(taskId) => { void handleOpenSharedTask(taskId); }}
            onLanguageOpen={handleLanguageOpen}
            gender={gender}
            onGenderSwitch={(g) => {
              try { localStorage.setItem(GENDER_KEY, g); } catch {}
              setGender(g);
            }}
             onModeChange={handleModeChange}
            onLinkCouple={handleLinkCouple}
             onUnlinkCouple={handleUnlinkCouple}
             onSubscribe={() => apiSubscribe(lang)}
            onTutorialPairFlow={setTutorialPairFlowOpen}
             onTutorialModeSelected={() => setTutorialStep((current) => current === 2 ? 3 : current)}
            onLovePathOpen={() => setPhase("love_path")}
            onGamesOpen={() => setPhase("games")}
            onTarotOpen={() => setPhase("tarot")}
          />
        )}
        {phase === "games" && (
          <GamesScreen lang={lang} onBack={() => setPhase("home")} onUpgrade={() => apiSubscribe(lang)} />
        )}
        {phase === "tarot" && (
          <TarotScreen lang={lang} onBack={() => setPhase("home")} onUpgrade={() => apiSubscribe(lang)} />
        )}
        {phase === "love_path" && (
          <LovePathScreen
            lang={lang}
            onBack={() => setPhase("home")}
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
             initialSharedTask={sharedTask}
              tutorialDemo={tutorialStep === 4 || tutorialStep === 5}
              onTutorialDemoComplete={() => setTutorialStep(5)}
             onUpgrade={() => apiSubscribe(lang)}
             onBuyPremiumTask={(category) => apiBuyPremiumTask(category, lang)}
          />
        )}
        {phase === "scenario"    && <ScenarioScreen lang={lang} gender={gender} onBack={handleBack} onUpgrade={() => apiSubscribe(lang)} />}
        {phase === "shared_task_error" && (
          <main style={{ minHeight: "100dvh", display: "grid", placeContent: "center", gap: 16, padding: 24, textAlign: "center", background: "#f1edf8", color: "#40334f", fontFamily: "sans-serif", position: "relative" }}>
            <button type="button" className="shared-task-error__back" onClick={() => setPhase("home")} aria-label={SHARED_TASK_ERROR_COPY[lang].back} data-testid="button-shared-task-error-back">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 18 9 12l6-6" /></svg>
            </button>
            <h1 style={{ fontSize: 22 }}>{SHARED_TASK_ERROR_COPY[lang].title}</h1>
            <p style={{ maxWidth: 320, lineHeight: 1.5, opacity: 0.75 }}>{SHARED_TASK_ERROR_COPY[lang].body}</p>
            <button type="button" onClick={handleRetrySharedTask} style={{ padding: "13px 18px", borderRadius: 14, border: 0, background: "#8064a2", color: "#fffaff", fontWeight: 700 }}>{SHARED_TASK_ERROR_COPY[lang].retry}</button>
            <button type="button" onClick={() => setPhase("home")} style={{ padding: "10px 18px", borderRadius: 14, border: "1px solid #c9bdd9", background: "transparent", color: "#594573" }}>{SHARED_TASK_ERROR_COPY[lang].home}</button>
          </main>
        )}
        {tutorialStep !== null && (
          <FirstRunTutorial
            lang={lang}
            step={tutorialStep}
            suspended={tutorialPairFlowOpen}
            onStart={() => setTutorialStep(2)}
            onFinish={completeTutorial}
            onSkip={completeTutorial}
          />
        )}
      </>
    );
  }
  