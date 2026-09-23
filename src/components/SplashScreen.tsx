import { useEffect, useRef, useState } from "react";
import { playHeartbeat } from "@/hooks/useSensualSound";
import "./SupportPop.css";

interface Props { onDone: () => void; linkStatus?: "idle"|"linking"|"linked"|"error"; skipDelay?: boolean; }

export default function SplashScreen({ onDone, linkStatus="idle", skipDelay=false }: Props) {
  const [phase, setPhase] = useState<"enter"|"show"|"exit">("enter");
  const doneCalled = useRef(false);
  useEffect(() => {
    const t1=setTimeout(()=>setPhase("show"),60);
    const t2=setTimeout(()=>playHeartbeat(false),480);
    const linking=linkStatus==="linking";
    const t3=setTimeout(()=>setPhase("exit"),linking?99999:skipDelay?450:3000);
    const t4=setTimeout(()=>{if(!doneCalled.current){doneCalled.current=true;onDone();}},linking?99999:skipDelay?700:3450);
    return()=>{clearTimeout(t1);clearTimeout(t2);clearTimeout(t3);clearTimeout(t4);};
  },[skipDelay]);
  useEffect(()=>{
    if((linkStatus==="linked"||linkStatus==="error")&&!doneCalled.current){
      const a=setTimeout(()=>setPhase("exit"),300);
      const b=setTimeout(()=>{if(!doneCalled.current){doneCalled.current=true;onDone();}},750);
      return()=>{clearTimeout(a);clearTimeout(b);};
    }
  },[linkStatus,onDone]);
  const status=linkStatus==="linking"?"Connecting your pair…":linkStatus==="linked"?"Pair connected":linkStatus==="error"?"Try again later":"";
  return <div className="pop-screen" data-testid="screen-splash" style={{ display:"grid", placeItems:"center" }}>
    <div className="pop-screen__inner pop-fade" data-mounted={phase!=="enter"} style={{ textAlign:"center", padding:"24px" }}>
      <div className="pop-heart-mark" style={{ margin:"0 auto 18px", width:84, height:84, display:"grid", placeItems:"center", border:"2px solid var(--pop-ink)", borderRadius:"42% 58% 56% 44%", transform:"rotate(12deg)" }} aria-hidden="true">
        <span style={{ fontSize:47, transform:"rotate(-12deg)", lineHeight:1 }}>♥</span>
      </div>
      <div className="pop-brand" style={{ fontSize:44 }} data-testid="text-splash-brand">Touché<em>.</em></div>
      <div style={{ marginTop:9, fontSize:10, letterSpacing:".3em", textTransform:"uppercase", color:"var(--pop-muted)" }}>for two</div>
      <div style={{ minHeight:48, marginTop:28, display:"grid", placeItems:"center", color:"var(--pop-coral)", fontSize:13 }} data-testid="status-splash">
        {status || <span style={{ display:"inline-block", width:88, height:4, borderRadius:3, background:"var(--pop-coral)", animation:"popPulse 1.3s ease-in-out infinite" }} />}
      </div>
    </div>
    <style>{`@keyframes popPulse{0%,100%{opacity:.25;transform:scaleX(.6)}50%{opacity:1;transform:scaleX(1)}}`}</style>
  </div>;
}