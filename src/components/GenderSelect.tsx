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
 return <div className="pop-screen" data-testid="screen-gender"><div className="pop-screen__inner pop-fade" data-mounted={mounted} style={{minHeight:"100dvh",display:"flex",flexDirection:"column",justifyContent:"center",padding:"28px 0"}}>
  <div style={{textAlign:"center",marginBottom:26}}><div className="pop-brand">Touché<em>.</em></div><h1 className="pop-title" style={{fontSize:"clamp(34px,9vw,48px)",marginTop:28}}>{l.title}</h1></div>
  <div style={{display:"grid",gap:12}}>{(["male","female"] as Gender[]).map(g=><button className="pop-choice" data-testid={`button-gender-${g}`} data-chosen={chosen===g} key={g} onClick={()=>pick(g)}><span className="pop-choice__mark">{g==="male"?"M":"W"}</span><span><strong>{g==="male"?l.male:l.female}</strong><small>{g==="male"?l.maleSub:l.femaleSub}</small></span></button>)}</div>
 </div></div>;
}