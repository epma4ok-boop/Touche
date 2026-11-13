import { useCallback, useRef, useState } from "react";

export type FeatureKey = "tarot" | "pose_ball" | "dice" | "strip";
export type FeatureNotice = "limit" | "error" | null;

export function useFeatureTrial(feature: FeatureKey) {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<FeatureNotice>(null);
  const busyRef = useRef(false);
  const requestIdRef = useRef<string | null>(null);

  const consume = useCallback(async (): Promise<boolean> => {
    if (busyRef.current) return false;
    busyRef.current = true;
    setBusy(true);
    setNotice(null);
    try {
      requestIdRef.current ??= crypto.randomUUID();
      const response = await fetch("/api/couple/intimacy?action=feature_usage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-telegram-init-data": window.Telegram?.WebApp?.initData ?? "",
        },
        body: JSON.stringify({ feature, requestId: requestIdRef.current }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || typeof data.allowed !== "boolean") {
        setNotice("error");
        return false;
      }
      requestIdRef.current = null;
      if (!data.allowed) {
        setNotice("limit");
        return false;
      }
      return true;
    } catch {
      setNotice("error");
      return false;
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, [feature]);

  const dismiss = useCallback(() => setNotice(null), []);
  return { busy, notice, consume, dismiss };
}
