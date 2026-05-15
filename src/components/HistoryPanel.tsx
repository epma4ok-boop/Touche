import { useEffect, useRef } from "react";
import { UI, CATEGORY_CONFIG, type Lang, type Category } from "@/data/i18n";

export type HistoryEntry = {
  id: string;
  text: string;
  category: Category;
  date: string;
};

interface HistoryPanelProps {
  entries: HistoryEntry[];
  open: boolean;
  onClose: () => void;
  accentRgb: { r: number; g: number; b: number };
  lang: Lang;
}

function formatDate(iso: string, t: typeof UI["ru"]) {
  const d = new Date(iso);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const time = d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  if (d.toDateString() === now.toDateString()) return `${t.dateToday} · ${time}`;
  if (d.toDateString() === yesterday.toDateString()) return `${t.dateYesterday} · ${time}`;
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" }) + ` · ${time}`;
}

function getCatLabel(cat: Category, t: typeof UI["ru"]) {
  const map: Record<Category, string> = {
    compliments: t.catCompliments,
    tenderness: t.catTenderness,
    desire: t.catDesire,
    passion: t.catPassion,
    hard: t.catHard,
  };
  return map[cat];
}

export default function HistoryPanel({ entries, open, onClose, accentRgb, lang }: HistoryPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef<number | null>(null);
  const { r, g, b } = accentRgb;
  const t = UI[lang];

  useEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    const onTouchStart = (e: TouchEvent) => { startYRef.current = e.touches[0].clientY; };
    const onTouchEnd = (e: TouchEvent) => {
      if (startYRef.current === null) return;
      if (e.changedTouches[0].clientY - startYRef.current > 60) onClose();
      startYRef.current = null;
    };
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => { el.removeEventListener("touchstart", onTouchStart); el.removeEventListener("touchend", onTouchEnd); };
  }, [onClose]);

  return (
    <>
      <div
        style={{
          position: "absolute", inset: 0, zIndex: 20,
          background: "rgba(0,0,0,0.20)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 0.35s",
          backdropFilter: open ? "blur(4px)" : "none",
        }}
        onClick={onClose}
      />

      <div
        ref={panelRef}
        style={{
          position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 25,
          maxHeight: "72vh",
          borderRadius: "22px 22px 0 0",
          background: "rgba(255,252,248,0.99)",
          backdropFilter: "blur(32px)",
          borderTop: `1px solid rgba(${r},${g},${b},0.15)`,
          boxShadow: `0 -12px 50px rgba(0,0,0,0.08)`,
          transform: open ? "translateY(0)" : "translateY(110%)",
          transition: "transform 0.42s cubic-bezier(0.32,0.72,0,1)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 12, paddingBottom: 4 }}>
          <div style={{ width: 34, height: 3, borderRadius: 99, background: `rgba(${r},${g},${b},0.18)` }} />
        </div>

        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "baseline",
          padding: "10px 22px 14px",
        }}>
          <div>
            <span style={{
              fontFamily: "'Plus Jakarta Sans', 'DM Sans', sans-serif",
              fontWeight: 700, fontSize: 20,
              color: "rgba(40,30,50,0.85)", letterSpacing: "-0.02em",
            }}>
              {t.history}
            </span>
            <span style={{
              fontFamily: "'Plus Jakarta Sans', 'DM Sans', sans-serif",
              fontWeight: 300, fontSize: 11,
              color: `rgba(${r},${g},${b},0.55)`, letterSpacing: "0.10em",
              textTransform: "uppercase", marginLeft: 10,
            }}>
              {t.historyCount(entries.length)}
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent", border: "none", cursor: "pointer",
              fontFamily: "'Plus Jakarta Sans', 'DM Sans', sans-serif",
              fontWeight: 400, fontSize: 12,
              letterSpacing: "0.10em", textTransform: "uppercase",
              color: "rgba(40,30,50,0.30)",
            }}
          >
            {t.panelClose}
          </button>
        </div>

        <div style={{ overflowY: "auto", flex: 1, paddingBottom: 24 }}>
          {entries.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 24px" }}>
              <p style={{
                fontFamily: "'Plus Jakarta Sans', 'DM Sans', sans-serif",
                fontWeight: 600, fontSize: 18,
                color: "rgba(40,30,50,0.25)", margin: 0, letterSpacing: "-0.01em",
              }}>
                {t.historyEmpty}
              </p>
              <p style={{
                fontFamily: "'Plus Jakarta Sans', 'DM Sans', sans-serif",
                fontWeight: 300, fontSize: 11,
                color: `rgba(${r},${g},${b},0.40)`, letterSpacing: "0.12em",
                textTransform: "uppercase", marginTop: 10,
              }}>
                {t.historyEmptySub}
              </p>
            </div>
          ) : (
            [...entries].reverse().map(entry => {
              const catCfg = CATEGORY_CONFIG[entry.category];
              return (
                <div
                  key={entry.id}
                  style={{
                    padding: "14px 22px",
                    borderBottom: "0.5px solid rgba(40,30,50,0.06)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{
                      fontFamily: "'Plus Jakarta Sans', 'DM Sans', sans-serif",
                      fontWeight: 500, fontSize: 10,
                      letterSpacing: "0.12em", textTransform: "uppercase",
                      color: `rgba(${catCfg.r},${catCfg.g},${catCfg.b},0.70)`,
                    }}>
                      {getCatLabel(entry.category, t)}
                    </span>
                    <span style={{
                      fontFamily: "'Plus Jakarta Sans', 'DM Sans', sans-serif",
                      fontWeight: 300, fontSize: 10,
                      color: "rgba(40,30,50,0.28)", letterSpacing: "0.04em",
                    }}>
                      {formatDate(entry.date, t)}
                    </span>
                  </div>
                  <p style={{
                    fontFamily: "'Plus Jakarta Sans', 'DM Sans', sans-serif",
                    fontWeight: 400, fontSize: 15,
                    color: "rgba(40,30,50,0.78)", margin: 0, lineHeight: 1.55,
                  }}>
                    {entry.text}
                  </p>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
