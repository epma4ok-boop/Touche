import { useEffect, useState } from "react";
import type { Lang } from "@/data/i18n";
import "./SupportPop.css";
export type Gender = "male"|"female";
export const GENDER_KEY="touche_gender";
interface GenderSelectProps { lang:Lang; onSelect:(gender:Gender)=>void; }
const LABELS:Record<Lang,{male:string;maleSub:string;female:string;femaleSub:string;title:string}>={
 ru:{title:"Кто ты?",male:"Мужчина",maleSub:"задания для него",female:"Женщина",femaleSub:"задания для неё"},
 en:{title:"Who are you?",male:"Man",maleSub:"tasks for him",female:"Woman",femaleSub:"tasks for her"},
 hi:{title:"आप कौन हैं?",male:"पुरुष",maleSub:"उसके लिए कार्य",female:"महिला",femaleSub:"उसके लिए कार्य"},
 pt:{title:"Quem é você?",male:"Homem",maleSub:"tarefas para ele",female:"Mulher",femaleSub:"tarefas para ela"},
 es:{title:"¿Quién eres?",male:"Hombre",maleSub:"tareas para él",female:"Mujer",femaleSub:"tareas para ella"},
};
export default function GenderSelect({lang,onSelect}:GenderSelectProps){
 const [chosen,setChosen]=useState<Gender|null>(null); const [mounted,setMounted]=useState(false); const l=LABELS[lang]??LABELS.en;
 useEffect(()=>{requestAnimationFrame(()=>setMounted(true));},[]);
 const pick=(g:Gender)=>{setChosen(g);setTimeout(()=>onSelect(g),380);};
  return <div className="pop-screen gender-screen" data-testid="screen-gender"><div className="pop-screen__inner gender-layout pop-fade" data-mounted={mounted}>
   <header className="gender-masthead"><div className="pop-brand">Touché<em>.</em></div><span>02 / 02</span></header>
   <main className="gender-content">
    <div className="gender-heading"><span className="gender-kicker">02 — 02</span><h1 className="pop-title">{l.title}</h1></div>
    <div className="gender-options">{(["male","female"] as Gender[]).map((g,index)=><button className="pop-choice gender-choice" data-testid={`button-gender-${g}`} data-chosen={chosen===g} key={g} onClick={()=>pick(g)}><span className="gender-choice__number">0{index+1}</span><span className="pop-choice__mark">{g==="male"?"M":"W"}</span><span className="gender-choice__copy"><strong>{g==="male"?l.male:l.female}</strong><small>{g==="male"?l.maleSub:l.femaleSub}</small></span><span className="gender-choice__arrow" aria-hidden="true">↗</span></button>)}</div>
   </main>
 </div></div>;
}