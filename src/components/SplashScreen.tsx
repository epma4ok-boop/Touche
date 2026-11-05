import { useEffect, useRef, useState } from "react";
import { playHeartbeat } from "@/hooks/useSensualSound";
import splashHands from "@/assets/touche-splash-hands.jpg";
import "./SupportPop.css";

interface Props { onDone: () => void; linkStatus?: "idle"|"linking"|"linked"|"error"; skipDelay?: boolean; }

export default function SplashScreen({ onDone, linkStatus="idle", skipDelay=false }: Props) {
  const [phase, setPhase] = useState<"enter"|"show"|"exit">("enter");
  const doneCalled = useRef(false);
  const shownAt = useRef(Date.now());
  useEffect(() => {
    const t1=setTimeout(()=>setPhase("show"),60);
    const t2=setTimeout(()=>playHeartbeat(false),480);
    const linking=linkStatus==="linking";
    const t3=setTimeout(()=>setPhase("exit"),linking?99999:skipDelay?2200:3000);
    const t4=setTimeout(()=>{if(!doneCalled.current){doneCalled.current=true;onDone();}},linking?99999:skipDelay?2500:3450);
    return()=>{clearTimeout(t1);clearTimeout(t2);clearTimeout(t3);clearTimeout(t4);};
  },[skipDelay]);
  useEffect(()=>{
    if((linkStatus==="linked"||linkStatus==="error")&&!doneCalled.current){
      const remaining=Math.max(0,2200-(Date.now()-shownAt.current));
      const a=setTimeout(()=>setPhase("exit"),remaining);
      const b=setTimeout(()=>{if(!doneCalled.current){doneCalled.current=true;onDone();}},remaining+500);
      return()=>{clearTimeout(a);clearTimeout(b);};
    }
  },[linkStatus,onDone]);
  const status=linkStatus==="linking"?"Connecting your pair…":linkStatus==="linked"?"Pair connected":linkStatus==="error"?"Try again later":"";
  return <div className={`pop-screen touche-splash touche-splash--${phase}`} data-testid="screen-splash">
    <img className="touche-splash__image" src={splashHands} alt="" aria-hidden="true" />
    <div className="touche-splash__veil" aria-hidden="true" />
    <div className="pop-screen__inner touche-splash__inner pop-fade" data-mounted={phase!=="enter"}>
      <div className="pop-brand" data-testid="text-splash-brand">Touché<em>.</em></div>
      <div className="touche-splash__caption">for two</div>
      <div className="touche-splash__rule" aria-hidden="true" />
      <div className="touche-splash__status" data-testid="status-splash">
        {status || <span className="touche-splash__pulse" />}
      </div>
    </div>
    <style>{`@keyframes popPulse{0%,100%{opacity:.25;transform:scaleX(.6)}50%{opacity:1;transform:scaleX(1)}}`}</style>
  </div>;
}