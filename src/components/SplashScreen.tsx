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
  return <div className="pop-screen splash-screen" data-testid="screen-splash">
    <div className={`pop-screen__inner splash-layout pop-fade splash-layout--${phase}`} data-mounted={phase!=="enter"}>
      <div className="splash-index"><span>01</span><i /><span>TOUCHÉ STUDIO</span></div>
      <div className="splash-seal" aria-hidden="true"><span /><i /><b /></div>
      <div className="pop-brand splash-brand" data-testid="text-splash-brand">Touché<em>.</em></div>
      <div className="splash-subtitle">TOUCHÉ / 01</div>
      <div className="splash-status" data-testid="status-splash">
        {status || <span className="splash-progress" />}
      </div>
      <div className="splash-bottomline"><span>TOUCHÉ</span><span>01—02</span></div>
    </div>
    <style>{`@keyframes popPulse{0%,100%{opacity:.25;transform:scaleX(.6)}50%{opacity:1;transform:scaleX(1)}}`}</style>
  </div>;
}