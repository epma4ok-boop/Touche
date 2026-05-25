import { useEffect, useState } from "react";
import type { Lang } from "@/data/i18n";

const AGE_KEY = "touche_age_confirmed";
export function isAgeConfirmed() {
  try { return localStorage.getItem(AGE_KEY) === "1"; } catch { return false; }
}
export function confirmAge() {
  try { localStorage.setItem(AGE_KEY, "1"); } catch {}
}

interface AgeGateProps {
  lang: Lang;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function AgeGate({ lang, onConfirm, onCancel }: AgeGateProps) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { requestAnimationFrame(() => setVisible(true)); }, []);

  const isEn = lang === "en";

  const title   = isEn ? "Adults only"                         : "Только для взрослых";
  const sub     = isEn ? "18+ content"                         : "Контент 18+";
  const body    = isEn
    ? "This section contains explicit sexual content and roleplay scenarios intended for adults in a consensual relationship.\n\nBy continuing you confirm you are at least 18 years old and consent to viewing this material."
    : "Этот раздел содержит откровенный сексуальный контент и ролевые сценарии, предназначенные для взрослых в consensual-отношениях.\n\nПродолжая, вы подтверждаете, что вам исполнилось 18 лет и вы согласны видеть такой контент.";
  const confirm = isEn ? "I'm 18+, continue"   : "Мне есть 18 лет — продолжить";
  const cancel  = isEn ? "Go back"              : "Назад";

  const handleConfirm = () => {
    confirmAge();
    onConfirm();
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "rgba(10,6,18,0.82)",
      display: "flex", alignItems: "flex-end",
      backdropFilter: "blur(8px)",
      opacity: visible ? 1 : 0,
      transition: "opacity 0.32s ease",
    }}>
      <div style={{
        width: "100%",
        background: "linear-gradient(160deg,#1a0a14 0%,#120818 100%)",
        borderRadius: "26px 26px 0 0",
        borderTop: "1px solid rgba(200,40,80,0.22)",
        boxShadow: "0 -20px 80px rgba(0,0,0,0.45)",
        padding: "0 0 max(32px,env(safe-area-inset-bottom))",
        transform: visible ? "translateY(0)" : "translateY(40px)",
        transition: "transform 0.44s cubic-bezier(0.32,0.72,0,1)",
      }}>
        {/* handle */}
        <div style={{ display:"flex",justifyContent:"center",paddingTop:14,paddingBottom:4 }}>
          <div style={{ width:36,height:3,borderRadius:99,background:"rgba(200,40,80,0.25)" }} />
        </div>

        {/* icon */}
        <div style={{ textAlign:"center",padding:"18px 32px 0" }}>
          <div style={{ fontSize:52,lineHeight:1,marginBottom:14 }}>🔞</div>
          <p style={{ fontFamily:"'Plus Jakarta Sans','DM Sans',sans-serif",fontWeight:700,fontSize:26,color:"rgba(255,240,248,0.95)",margin:0,letterSpacing:"-0.02em" }}>
            {title}
          </p>
          <p style={{ fontFamily:"'Plus Jakarta Sans','DM Sans',sans-serif",fontWeight:400,fontSize:11,letterSpacing:"0.18em",textTransform:"uppercase",color:"rgba(200,40,80,0.65)",margin:"8px 0 0" }}>
            {sub}
          </p>
        </div>

        {/* body */}
        <div style={{ padding:"20px 32px 28px" }}>
          {body.split("\n\n").map((para, i) => (
            <p key={i} style={{ fontFamily:"'Plus Jakarta Sans','DM Sans',sans-serif",fontWeight:300,fontSize:14,color:"rgba(255,240,248,0.52)",lineHeight:1.65,margin:i===0?"0":"14px 0 0" }}>
              {para}
            </p>
          ))}
        </div>

        {/* buttons */}
        <div style={{ padding:"0 22px 12px" }}>
          <button onClick={handleConfirm} style={{
            width:"100%",padding:"19px 8px",borderRadius:18,
            background:"rgba(200,40,80,0.18)",
            border:"1px solid rgba(200,40,80,0.45)",
            cursor:"pointer",
            fontFamily:"'Plus Jakarta Sans','DM Sans',sans-serif",
            fontWeight:600,fontSize:17,color:"rgba(255,180,200,0.95)",
            letterSpacing:"-0.01em",
          }}>
            {confirm}
          </button>
        </div>
        <div style={{ padding:"0 22px" }}>
          <button onClick={onCancel} style={{
            width:"100%",padding:"14px 8px",borderRadius:14,
            background:"transparent",border:"1px solid rgba(255,240,248,0.08)",
            cursor:"pointer",
            fontFamily:"'Plus Jakarta Sans','DM Sans',sans-serif",
            fontWeight:300,fontSize:13,letterSpacing:"0.08em",
            textTransform:"uppercase",color:"rgba(255,240,248,0.24)",
          }}>
            {cancel}
          </button>
        </div>
      </div>
    </div>
  );
}
