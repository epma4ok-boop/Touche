import { useEffect, useState } from "react";
import type { Lang } from "@/data/i18n";
import { UI } from "@/data/i18n";
import "./SupportPop.css";

interface LanguageSelectProps { onSelect: (lang: Lang) => void; }
const LANGS:{lang:Lang;primary:string;sub:string;mark:string}[]=[
  {lang:"en",primary:"English",sub:"English",mark:"EN"},
  {lang:"ru",primary:"Русский",sub:"Russian",mark:"RU"},
  {lang:"hi",primary:"हिंदी",sub:"Hindi",mark:"HI"},
  {lang:"pt",primary:"Português",sub:"Brazilian",mark:"PT"},
  {lang:"es",primary:"Español",sub:"Spanish",mark:"ES"},
];
export default function LanguageSelect({onSelect}:LanguageSelectProps){
  const [chosen,setChosen]=useState<Lang|null>(null); const [mounted,setMounted]=useState(false);
  useEffect(()=>{requestAnimationFrame(()=>setMounted(true));},[]);
  const pick=(lang:Lang)=>{setChosen(lang);setTimeout(()=>onSelect(lang),440);};
  return <div className="pop-screen" data-testid="screen-language">
    <div className="pop-screen__inner pop-fade" data-mounted={mounted} style={{minHeight:"100dvh",display:"flex",flexDirection:"column",justifyContent:"center",padding:"28px 0"}}>
      <div style={{textAlign:"center",marginBottom:28}}><div className="pop-brand">Touché<em>.</em></div><span className="pop-eyebrow" style={{marginTop:20}}>{UI.en.chooseLang}</span></div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        {LANGS.map(({lang,primary,sub,mark})=><button className="pop-choice" data-testid={`button-language-${lang}`} data-chosen={chosen===lang} key={lang} onClick={()=>pick(lang)} style={{display:"flex",flexDirection:"column",alignItems:"flex-start",gap:8,padding:14}}>
          <span className="pop-choice__mark">{mark}</span><strong>{primary}</strong><small>{sub}</small>
        </button>)}
      </div>
      <p className="pop-copy" style={{textAlign:"center",fontSize:11,marginTop:24}}>{UI.en.splashTagline}</p>
    </div>
  </div>;
}