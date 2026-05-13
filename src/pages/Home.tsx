import { useEffect, useRef, useCallback, useState } from "react";
import SilhouetteCanvas from "@/components/SilhouetteCanvas";
import { UI, CATEGORY_CONFIG, CATEGORIES_ORDER, type Lang, type Category } from "@/data/i18n";
import { useSensualSound } from "@/hooks/useSensualSound";

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        ready: () => void;
        expand: () => void;
        HapticFeedback?: { impactOccurred: (style: string) => void };
        initDataUnsafe?: { user?: { username?: string; id?: number }; start_param?: string };
        initData?: string;
        openTelegramLink?: (url: string) => void;
      };
    };
  }
}

interface HomeProps {
  lang: Lang;
  onCategorySelect: (cat: Category) => void;
}

const BOT_USERNAME = "ToucheBot";
const UNLOCK_KEY = "touche_unlocked_18";

function getUnlocked18(): boolean {
  try { return localStorage.getItem(UNLOCK_KEY) === "1"; } catch { return false; }
}
function setUnlocked18() {
  try { localStorage.setItem(UNLOCK_KEY, "1"); } catch {}
}

// ── Caution tape canvas for Hard band ─────────────────────────────────────
function CautionTapeCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
    };
    resize();

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const w = canvas.getBoundingClientRect().width;
    const h = canvas.getBoundingClientRect().height;

    const stripeW = 18;
    const totalW = w + h; // diagonal coverage

    ctx.save();
    ctx.translate(-h * 0.3, 0);
    ctx.rotate(0); // keep horizontal

    // Draw diagonal stripes across entire band
    for (let x = -stripeW * 2; x < totalW; x += stripeW * 2) {
      // Dark stripe
      ctx.fillStyle = "rgba(0,0,0,0.28)";
      ctx.fillRect(x, 0, stripeW, h);
    }
    ctx.restore();

    // Two thin horizontal tape lines
    for (const y of [h * 0.22, h * 0.78]) {
      const tapeGrad = ctx.createLinearGradient(0, 0, w, 0);
      tapeGrad.addColorStop(0, "rgba(200,160,80,0)");
      tapeGrad.addColorStop(0.08, "rgba(200,160,80,0.22)");
      tapeGrad.addColorStop(0.5, "rgba(200,160,80,0.30)");
      tapeGrad.addColorStop(0.92, "rgba(200,160,80,0.22)");
      tapeGrad.addColorStop(1, "rgba(200,160,80,0)");
      ctx.fillStyle = tapeGrad;
      ctx.fillRect(0, y - 3, w, 6);

      // Stripe marks on tape
      for (let x = 0; x < w; x += 24) {
        ctx.fillStyle = "rgba(0,0,0,0.18)";
        ctx.fillRect(x, y - 3, 10, 6);
      }
    }
  }, []);

  return (
    <canvas
      ref={ref}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
    />
  );
}

// ── Single category band ───────────────────────────────────────────────────
interface BandProps {
  category: Category;
  lang: Lang;
  onClick: () => void;
  index: number;
}

function CategoryBand({ category, lang, onClick, index }: BandProps) {
  const cfg = CATEGORY_CONFIG[category];
  const { r, g, b } = cfg;
  const t = UI[lang];
  const [pressed, setPressed] = useState(false);
  const pressedRef = useRef(false);
  const shimmerRef = useRef<HTMLCanvasElement>(null);

  const labels: Record<Category, { main: string; sub: string; desc: string }> = {
    compliments: { main: t.catCompliments, sub: t.catComplimentsSub, desc: t.catComplimentsDesc },
    tenderness:  { main: t.catTenderness,  sub: t.catTendernessSub,  desc: t.catTendernessDesc  },
    desire:      { main: t.catDesire,      sub: t.catDesireSub,      desc: t.catDesireDesc      },
    passion:     { main: t.catPassion,     sub: t.catPassionSub,     desc: t.catPassionDesc     },
    hard:        { main: t.catHard,        sub: t.catHardSub,        desc: t.catHardDesc        },
  };
  const lbl = labels[category];
  const isHard = category === "hard";

  // Shimmer canvas
  useEffect(() => {
    const canvas = shimmerRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;
    let raf: number;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
    };
    resize();
    let t0 = performance.now();
    const draw = (now: number) => {
      const elapsed = (now - t0) / 1000;
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const isP = pressedRef.current;
      const pulse = isP
        ? 0.7 + 0.3 * Math.sin(elapsed * 5)
        : 0.28 + 0.18 * Math.sin(elapsed * 1.1 + index * 0.8);
      // Top shimmer line
      const grad = ctx.createLinearGradient(0, 0, w, 0);
      grad.addColorStop(0, "rgba(0,0,0,0)");
      grad.addColorStop(0.2, `rgba(${r},${g},${b},${pulse * 0.18})`);
      grad.addColorStop(0.5, `rgba(${r},${g},${b},${pulse * 0.32})`);
      grad.addColorStop(0.8, `rgba(${r},${g},${b},${pulse * 0.18})`);
      grad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, 0.5);
      // Hover wash
      if (isP) {
        const wash = ctx.createLinearGradient(0, 0, w, 0);
        wash.addColorStop(0, `rgba(${r},${g},${b},0.06)`);
        wash.addColorStop(0.5, `rgba(${r},${g},${b},0.11)`);
        wash.addColorStop(1, `rgba(${r},${g},${b},0.03)`);
        ctx.fillStyle = wash;
        ctx.fillRect(0, 0, w, h);
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [r, g, b, index]);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => { pressedRef.current = true; setPressed(true); }}
      onMouseLeave={() => { pressedRef.current = false; setPressed(false); }}
      onTouchStart={() => { pressedRef.current = true; setPressed(true); }}
      onTouchEnd={() => { pressedRef.current = false; setPressed(false); }}
      style={{
        position: "relative",
        width: "100%",
        background: "transparent",
        border: "none",
        borderBottom: "0.5px solid rgba(255,255,255,0.04)",
        cursor: "pointer",
        display: "flex", alignItems: "center",
        flex: 1, minHeight: 0,
        overflow: "hidden",
        transition: "background 0.2s",
      }}
    >
      {/* Shimmer */}
      <canvas ref={shimmerRef} style={{ position:"absolute",inset:0,width:"100%",height:"100%",pointerEvents:"none" }} />

      {/* Hard: caution tape overlay */}
      {isHard && <CautionTapeCanvas />}

      {/* Left accent bar */}
      <div style={{
        width: pressed ? 3 : 2,
        alignSelf: "stretch", flexShrink: 0,
        background: `linear-gradient(to bottom, rgba(${r},${g},${b},0), rgba(${r},${g},${b},${pressed ? 0.95 : 0.55}), rgba(${r},${g},${b},0))`,
        transition: "width 0.2s",
        boxShadow: pressed ? `0 0 20px rgba(${r},${g},${b},0.65)` : "none",
      }} />

      {/* Content */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"flex-start", justifyContent:"center", padding:"0 16px 0 20px", position:"relative", zIndex:2 }}>
        {/* Main name */}
        <p style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontStyle: "italic", fontWeight: 300,
          fontSize: "clamp(24px, 6vw, 36px)",
          color: pressed ? "#fff8f2" : "rgba(255,248,242,0.82)",
          letterSpacing: "0.03em", margin: 0, lineHeight: 1.1,
          textShadow: pressed
            ? `0 0 30px rgba(${r},${g},${b},0.75), 0 2px 12px rgba(0,0,0,0.95)`
            : `0 0 14px rgba(${r},${g},${b},0.22), 0 2px 8px rgba(0,0,0,0.9)`,
          transition: "all 0.2s",
        }}>
          {lbl.main}
          {cfg.paid && (
            <span style={{ fontFamily:"'Raleway',sans-serif", fontStyle:"normal", fontWeight:200, fontSize:"clamp(7px,1.6vw,9px)", letterSpacing:"0.22em", textTransform:"uppercase", color:`rgba(${r},${g},${b},0.65)`, marginLeft:9, verticalAlign:"middle" }}>
              18+
            </span>
          )}
        </p>

        {/* Description */}
        {isHard ? (
          <p style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontStyle: "italic", fontWeight: 300,
            fontSize: "clamp(10px, 2.4vw, 13px)",
            color: `rgba(${r},${g},${b},${pressed ? 0.8 : 0.52})`,
            margin: "3px 0 0", letterSpacing: "0.04em", lineHeight: 1.3,
            textShadow: `0 0 12px rgba(${r},${g},${b},0.4)`,
            transition: "color 0.2s",
          }}>
            {lbl.desc}
          </p>
        ) : (
          <p style={{
            fontFamily: "'Raleway', sans-serif", fontWeight: 200,
            fontSize: "clamp(7px, 1.8vw, 9px)",
            letterSpacing: "0.22em", textTransform: "uppercase",
            color: `rgba(${r},${g},${b},${pressed ? 0.65 : 0.38})`,
            margin: "3px 0 0",
            transition: "color 0.2s",
          }}>
            {lbl.sub}
          </p>
        )}
      </div>

      {/* Right: arrow or warning badge */}
      <div style={{ flexShrink:0, padding:"0 20px 0 0", position:"relative", zIndex:2 }}>
        {isHard ? (
          <div style={{
            padding: "3px 8px",
            borderRadius: 6,
            border: `0.5px solid rgba(${r},${g},${b},${pressed ? 0.6 : 0.28})`,
            background: `rgba(${r},${g},${b},0.08)`,
            transition: "all 0.2s",
          }}>
            <span style={{ fontFamily:"'Raleway',sans-serif", fontWeight:200, fontSize:7, letterSpacing:"0.20em", textTransform:"uppercase", color:`rgba(${r},${g},${b},${pressed ? 0.75 : 0.45})` }}>
              {lang === "ru" ? "18+" : "18+"}
            </span>
          </div>
        ) : (
          <span style={{ opacity: pressed ? 0.75 : 0.18, transition:"opacity 0.2s, transform 0.2s", transform: pressed ? "translateX(2px)" : "translateX(0)", color:`rgb(${r},${g},${b})`, fontSize:18, fontWeight:200, display:"block" }}>
            ›
          </span>
        )}
      </div>
    </button>
  );
}

// ── 18+ unlock modal ───────────────────────────────────────────────────────
interface UnlockModalProps {
  open: boolean; category: Category | null;
  onConfirm: () => void; onCancel: () => void; lang: Lang;
}
function UnlockModal({ open, category, onConfirm, onCancel, lang }: UnlockModalProps) {
  const t = UI[lang];
  const cfg = category ? CATEGORY_CONFIG[category] : CATEGORY_CONFIG.passion;
  const { r, g, b } = cfg;
  return (
    <>
      <div onClick={onCancel} style={{ position:"absolute",inset:0,zIndex:40,background:"rgba(0,0,0,0.82)",opacity:open?1:0,pointerEvents:open?"auto":"none",transition:"opacity 0.3s",backdropFilter:open?"blur(6px)":"none" }} />
      <div style={{ position:"absolute",bottom:0,left:0,right:0,zIndex:50,borderRadius:"24px 24px 0 0",background:"rgba(6,4,9,0.98)",borderTop:`0.5px solid rgba(${r},${g},${b},0.28)`,boxShadow:`0 -20px 60px rgba(0,0,0,0.9)`,transform:open?"translateY(0)":"translateY(110%)",transition:"transform 0.42s cubic-bezier(0.32,0.72,0,1)",paddingBottom:"max(28px,env(safe-area-inset-bottom))" }}>
        <div style={{ display:"flex",justifyContent:"center",paddingTop:14,paddingBottom:6 }}>
          <div style={{ width:36,height:3,borderRadius:99,background:`rgba(${r},${g},${b},0.25)` }} />
        </div>
        <div style={{ textAlign:"center",padding:"10px 32px 24px" }}>
          <p style={{ fontFamily:"'Cormorant Garamond',Georgia,serif",fontStyle:"italic",fontWeight:300,fontSize:30,color:"#fff8f2",margin:0,textShadow:`0 0 30px rgba(${r},${g},${b},0.5)` }}>{t.lockTitle}</p>
          <p style={{ fontFamily:"'Raleway',sans-serif",fontWeight:200,fontSize:11,color:`rgba(${r},${g},${b},0.55)`,margin:"10px 0 0",letterSpacing:"0.10em" }}>{t.lockSub}</p>
        </div>
        <div style={{ padding:"0 22px 12px" }}>
          <button onClick={onConfirm} style={{ width:"100%",padding:"18px 8px",borderRadius:16,background:`rgba(${r},${g},${b},0.10)`,border:`0.5px solid rgba(${r},${g},${b},0.40)`,cursor:"pointer",fontFamily:"'Cormorant Garamond',Georgia,serif",fontStyle:"italic",fontWeight:400,fontSize:22,color:"#fff8f2",letterSpacing:"0.02em",textShadow:`0 0 18px rgba(${r},${g},${b},0.5)` }}>{t.lockConfirm}</button>
        </div>
        <div style={{ padding:"0 22px" }}>
          <button onClick={onCancel} style={{ width:"100%",padding:"14px 8px",borderRadius:14,background:"transparent",border:"0.5px solid rgba(255,255,255,0.08)",cursor:"pointer",fontFamily:"'Raleway',sans-serif",fontWeight:200,fontSize:11,letterSpacing:"0.18em",textTransform:"uppercase",color:"rgba(255,255,255,0.22)" }}>{t.lockCancel}</button>
        </div>
      </div>
    </>
  );
}

// ── Toast ──────────────────────────────────────────────────────────────────
function Toast({ visible, text }: { visible: boolean; text: string }) {
  return (
    <div style={{ position:"absolute",top:64,left:"50%",transform:`translateX(-50%) translateY(${visible?0:-8}px)`,zIndex:60,pointerEvents:"none",opacity:visible?1:0,transition:"opacity 0.4s ease, transform 0.4s ease",background:"rgba(6,4,9,0.96)",border:"0.5px solid rgba(200,60,120,0.35)",boxShadow:"0 4px 40px rgba(0,0,0,0.6)",borderRadius:14,padding:"11px 20px",whiteSpace:"nowrap",backdropFilter:"blur(20px)" }}>
      <span style={{ fontFamily:"'Cormorant Garamond',Georgia,serif",fontStyle:"italic",fontWeight:400,fontSize:17,color:"rgba(255,248,242,0.90)",textShadow:"0 0 16px rgba(200,60,120,0.5)" }}>{text}</span>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────
export default function Home({ lang, onCategorySelect }: HomeProps) {
  const t = UI[lang];
  const { playSwitch } = useSensualSound();
  const [inviteToast, setInviteToast] = useState(false);
  const [unlockModal, setUnlockModal] = useState<Category | null>(null);
  const [unlocked18, setUnlocked18State] = useState(getUnlocked18);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.ready(); tg.expand();
      const sp = tg.initDataUnsafe?.start_param;
      if (sp?.startsWith("ref_")) { setInviteToast(true); setTimeout(() => setInviteToast(false), 3500); }
    }
  }, []);

  const handleCategoryClick = useCallback((cat: Category) => {
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred("light");
    const freq: Record<Category, number> = { compliments:440, tenderness:520, desire:600, passion:380, hard:300 };
    playSwitch(freq[cat]);
    if (CATEGORY_CONFIG[cat].paid && !unlocked18) { setUnlockModal(cat); return; }
    onCategorySelect(cat);
  }, [unlocked18, onCategorySelect, playSwitch]);

  const handleUnlockConfirm = useCallback(() => {
    setUnlocked18(true); setUnlocked18State(true);
    const cat = unlockModal!;
    setUnlockModal(null);
    setTimeout(() => onCategorySelect(cat), 320);
  }, [unlockModal, onCategorySelect]);

  const handleInvite = useCallback(() => {
    const tg = window.Telegram?.WebApp;
    const userId = tg?.initDataUnsafe?.user?.id;
    if (tg?.openTelegramLink && userId) {
      tg.openTelegramLink(`https://t.me/share/url?url=https://t.me/${BOT_USERNAME}?start=ref_${userId}&text=${encodeURIComponent(t.inviteText)}`);
    }
  }, [t.inviteText]);

  return (
    <div style={{ position:"fixed",inset:0,background:"#060409",display:"flex",flexDirection:"column",overflow:"hidden" }}>
      {/* Background silhouettes */}
      <SilhouetteCanvas r={190} g={30} b={90} opacity={0.85} />

      {/* Vignettes so left accent bars read clearly */}
      <div style={{ position:"absolute",top:0,bottom:0,left:0,width:"28%",background:"linear-gradient(to right, rgba(6,4,9,0.75) 0%, rgba(6,4,9,0) 100%)",pointerEvents:"none",zIndex:1 }} />
      <div style={{ position:"absolute",top:0,bottom:0,right:0,width:"42%",background:"linear-gradient(to left, rgba(6,4,9,0.92) 0%, rgba(6,4,9,0) 100%)",pointerEvents:"none",zIndex:1 }} />

      {/* Header */}
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"18px 22px 12px",flexShrink:0,position:"relative",zIndex:2 }}>
        <p style={{ fontFamily:"'Cormorant Garamond',Georgia,serif",fontStyle:"italic",fontWeight:300,fontSize:24,color:"rgba(255,248,242,0.90)",letterSpacing:"0.07em",margin:0,textShadow:"0 0 28px rgba(200,60,120,0.45), 0 2px 10px rgba(0,0,0,0.95)" }}>
          Touché
        </p>
        <button onClick={handleInvite} style={{ background:"transparent",border:"0.5px solid rgba(255,255,255,0.10)",borderRadius:99,padding:"7px 16px",cursor:"pointer",fontFamily:"'Raleway',sans-serif",fontWeight:200,fontSize:9,letterSpacing:"0.20em",textTransform:"uppercase",color:"rgba(255,255,255,0.26)" }}>
          {t.invite}
        </button>
      </div>

      {/* Divider */}
      <div style={{ height:"0.5px",background:"linear-gradient(to right, transparent, rgba(200,60,120,0.20), transparent)",flexShrink:0,position:"relative",zIndex:2 }} />

      {/* Category bands */}
      <div style={{ flex:1,display:"flex",flexDirection:"column",position:"relative",zIndex:2,minHeight:0 }}>
        {CATEGORIES_ORDER.map((cat, i) => (
          <CategoryBand key={cat} category={cat} lang={lang} onClick={() => handleCategoryClick(cat)} index={i} />
        ))}
      </div>

      {/* Footer */}
      <div style={{ flexShrink:0,position:"relative",zIndex:2,padding:"10px 0 max(16px,env(safe-area-inset-bottom))",textAlign:"center" }}>
        <p style={{ fontFamily:"'Raleway',sans-serif",fontWeight:200,fontSize:8,letterSpacing:"0.24em",textTransform:"uppercase",color:"rgba(255,255,255,0.10)",margin:0 }}>
          {lang==="ru"?"1 задание в день · больше за ★":"1 task a day · more for ★"}
        </p>
      </div>

      <Toast visible={inviteToast} text={t.inviteBonus} />
      <UnlockModal open={unlockModal!==null} category={unlockModal} onConfirm={handleUnlockConfirm} onCancel={() => setUnlockModal(null)} lang={lang} />
    </div>
  );
}
