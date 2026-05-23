import { useState, useCallback, useEffect } from "react";
import Home from "@/pages/Home";
import CategoryScreen from "@/pages/CategoryScreen";
import ScenarioScreen from "@/pages/ScenarioScreen";
import SplashScreen from "@/components/SplashScreen";
import LanguageSelect from "@/components/LanguageSelect";
import AgeGate, { isAgeConfirmed } from "@/components/AgeGate";
import { LANG_KEY, CATEGORIES_ORDER, type Lang, type Category } from "@/data/i18n";

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

async function tryLinkCouple(refUserId: number): Promise<string | null> {
  try {
    const initData = window.Telegram?.WebApp?.initData;
    if (!initData) {
      alert("❌ Нет initData");
      console.error("❌ No initData");
      return null;
    }
    
    alert("🔵 Отправляем запрос в /api/couple/link");
    console.log("🔵 Sending request", { refUserId });
    
    const res = await fetch("/api/couple/link", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json", 
        "x-telegram-init-data": initData 
      },
      body: JSON.stringify({ refUserId }),
    });
    
    alert(`🔵 Статус ответа: ${res.status}`);
    console.log("🔵 Response status:", res.status);
    
    if (!res.ok) {
      const text = await res.text();
      alert(`❌ Ошибка ${res.status}: ${text}`);
      console.error("❌ Error response:", text);
      return null;
    }
    
    const data = await res.json();
    alert(`🔵 Ответ: ${JSON.stringify(data)}`);
    console.log("🔵 Response data:", data);
    
    return data.coupleId ?? null;
  } catch (err: any) {
    alert(`❌ Исключение: ${err.message}`);
    console.error("❌ Exception:", err);
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

    // ── ДИАГНОСТИКА: показываем start_param ──
    const startParam = tg?.initDataUnsafe?.start_param ?? "";
    alert("🔵 startParam: " + (startParam || "пусто"));
    console.log("🔵 startParam:", startParam);
    // ─────────────────────────────────────────

    if (startParam.startsWith("ref_") && !getCoupleId()) {
      const refUserId = parseInt(startParam.replace("ref_", ""), 10);
      alert("🔵 refUserId: " + refUserId);
      console.log("🔵 refUserId:", refUserId);
      
      if (!isNaN(refUserId) && refUserId !== tg?.initDataUnsafe?.user?.id) {
        setLinkStatus("linking");
        alert("🔵 Связываем пару...");
        const coupleId = await tryLinkCouple(refUserId);
        if (coupleId) {
          saveCoupleId(coupleId);
          setLinkStatus("linked");
          alert("✅ Пара соединена! coupleId: " + coupleId);
          await new Promise(r => setTimeout(r, 1200));
        } else {
          setLinkStatus("error");
          alert("❌ Ошибка: пара не создана");
        }
      } else {
        alert("❌ Неверный refUserId или тот же пользователь");
      }
    } else {
      alert("❌ startParam не начинается с ref_ или пара уже есть");
    }

    if (saved) { setLang(saved); setPhase("home"); }
    else { setPhase("lang"); }
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
      {phase === "splash" && <SplashScreen onDone={handleSplashDone} linkStatus={linkStatus} />}
      {phase === "lang"   && <LanguageSelect onSelect={handleLangSelect} />}
      {phase === "home"   && <Home lang={lang} onCategorySelect={handleCategorySelectWithAgeCheck} onScenarioOpen={handleScenarioOpen} />}
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
