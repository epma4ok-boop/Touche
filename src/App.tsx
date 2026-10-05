import { useState, useCallback, useEffect } from "react";
import Home from "@/pages/Home";
import CategoryScreen from "@/pages/CategoryScreen";
import ScenarioScreen from "@/pages/ScenarioScreen";
import SplashScreen from "@/components/SplashScreen";
import LanguageSelect from "@/components/LanguageSelect";
import { type Gender, GENDER_KEY } from "@/components/GenderSelect";
import OnboardingScreen from "@/components/OnboardingScreen";
import { LANG_KEY, ONBOARDED_KEY, CATEGORIES_ORDER, type Lang, type Category } from "@/data/i18n";
import { ACTIVE_SCENARIO_KEY, getActiveScenarioStorageKey, type ActiveScenario } from "@/pages/ScenarioScreen";
import type { SharedTaskSnapshot } from "@/data/sharedPair";

type AppPhase = "splash" | "lang" | "onboarding" | "gender" | "home" | "category" | "scenario" | "shared_task_error";
export type AppMode = "solo" | "together";

const COUPLE_ID_KEY = "touche_couple_id";
const MODE_KEY = "touche_mode";
const USER_ID_KEY = "touche_user_id";
const HISTORY_KEY = "touche_history_v2";

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
    const [lang, setLang] = useState<Lang>("ru");
  const [gender, setGender] = useState<Gender | undefined>(getSavedGender() ?? undefined);
    const [activeCategory, setActiveCategory] = useState<Category>("compliments");
    const [swipeDir, setSwipeDir] = useState<"left" | "right">("left");
    const [coupleId, setCoupleId] = useState<string | null>(getCoupleId);
    const [mode, setMode] = useState<AppMode>(() => getSavedMode(!!getCoupleId()));
    const [pendingRefUserId, setPendingRefUserId] = useState<number | null>(null);
     const [sharedTask, setSharedTask] = useState<SharedTaskSnapshot | null>(null);
     const [failedSharedTaskId, setFailedSharedTaskId] = useState<string | null>(null);

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

      const pairInvite = /^ref_([1-9][0-9]*)$/.exec(startParam);
      if (pairInvite) {
        const refUserId = Number(pairInvite[1]);
        const myId = tg?.initDataUnsafe?.user?.id;
        if (Number.isSafeInteger(refUserId) && refUserId !== myId) {
          setPendingRefUserId(refUserId);
        }
      }

      const params = new URLSearchParams(window.location.search);
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
        setPhase(savedLang ? "category" : "lang");
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
          setPhase("scenario");
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
              setPhase("scenario");
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
        setPhase("home");
      } else {
        setPhase("lang");
      }
    }, []);

    const handleLangSelect = useCallback((chosen: Lang) => {
      try { localStorage.setItem(LANG_KEY, chosen); } catch {}
      setLang(chosen);
      if (!isOnboarded()) setPhase("onboarding");
      else setPhase(sharedTask ? "category" : "home");
    }, [sharedTask]);

    const handleOnboardingDone = useCallback(() => {
      markOnboarded();
      setPhase(sharedTask ? "category" : "home");
    }, [sharedTask]);

    const handleGenderSelect = useCallback((chosen: Gender) => {
      try { localStorage.setItem(GENDER_KEY, chosen); } catch {}
      setGender(chosen);
      setPhase("home");
    }, []);

    const handleLanguageOpen = useCallback(() => setPhase("lang"), []);
    const handleLanguageCancel = useCallback(() => setPhase("home"), []);

    const handleCategorySelect = useCallback((cat: Category) => {
      const curIdx = CATEGORIES_ORDER.indexOf(activeCategory);
      const newIdx = CATEGORIES_ORDER.indexOf(cat);
      setSwipeDir(newIdx >= curIdx ? "left" : "right");
      setActiveCategory(cat);
      setSharedTask(null);
      setPhase("category");
    }, [activeCategory]);

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
        {phase === "onboarding"  && <OnboardingScreen lang={lang} onDone={handleOnboardingDone} />}
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
             onUpgrade={() => apiSubscribe(lang)}
             onBuyPremiumTask={(category) => apiBuyPremiumTask(category, lang)}
          />
        )}
        {phase === "scenario"    && <ScenarioScreen lang={lang} gender={gender} onBack={handleBack} onUpgrade={() => apiSubscribe(lang)} />}
        {phase === "shared_task_error" && (
          <main style={{ minHeight: "100dvh", display: "grid", placeContent: "center", gap: 16, padding: 24, textAlign: "center", background: "#0d0610", color: "#fffaf3", fontFamily: "sans-serif" }}>
            <h1 style={{ fontSize: 22 }}>{lang === "ru" ? "Не удалось открыть общее задание" : "Could not open the shared task"}</h1>
            <p style={{ maxWidth: 320, lineHeight: 1.5, opacity: 0.75 }}>{lang === "ru" ? "Проверьте подключение и попробуйте ещё раз. Задание доступно только участникам этой пары." : "Check your connection and try again. This task is only available to members of this pair."}</p>
            <button type="button" onClick={handleRetrySharedTask} style={{ padding: "13px 18px", borderRadius: 14, border: 0, background: "#ff6f61", color: "#162238", fontWeight: 700 }}>{lang === "ru" ? "Попробовать снова" : "Try again"}</button>
            <button type="button" onClick={() => setPhase("home")} style={{ padding: "10px 18px", borderRadius: 14, border: "1px solid rgba(255,250,243,.35)", background: "transparent", color: "#fffaf3" }}>{lang === "ru" ? "На главную" : "Go home"}</button>
          </main>
        )}
      </>
    );
  }
  