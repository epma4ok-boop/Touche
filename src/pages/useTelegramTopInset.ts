import { useEffect, useState } from "react";

export default function useTelegramTopInset(): number {
  const [top, setTop] = useState(() => window.Telegram?.WebApp ? 96 : 14);
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    const update = () => {
      const safe = tg?.safeAreaInset?.top ?? 0;
      const content = tg?.contentSafeAreaInset?.top ?? 0;
      setTop(tg ? Math.max(96, safe + 72, content + safe + 16) : 14);
    };
    update();
    tg?.onEvent?.("safeAreaChanged", update);
    tg?.onEvent?.("contentSafeAreaInsetChanged", update);
    const timer = window.setTimeout(update, 700);
    return () => {
      tg?.offEvent?.("safeAreaChanged", update);
      tg?.offEvent?.("contentSafeAreaInsetChanged", update);
      window.clearTimeout(timer);
    };
  }, []);
  return top;
}
