import type { Category } from "@/data/i18n";

export type IntimacyTier = "tenderness" | "desire" | "passion";
export const CATEGORY_TIER: Record<Category, IntimacyTier> = {
  compliments: "tenderness", tenderness: "tenderness",
  desire: "desire", passion: "passion", hard: "passion",
};
function rand(min: number, max: number) { return Math.floor(Math.random()*(max-min+1))+min; }
export function getPoints(category: Category): number {
  const tier = CATEGORY_TIER[category];
  if (tier === "tenderness") return rand(10,20);
  if (tier === "desire")     return rand(25,35);
  return rand(40,55);
}

/**
 * Visual identity id for a level — rendered as custom line-art (LevelGlyph),
 * never as an emoji. Keep in sync with LevelGlyph in IntimacyIndex.tsx.
 */
export type LevelIconId = "ice" | "sprout" | "sun" | "flame" | "closeness" | "deepbond" | "onesoul";

export interface IntimacyLevel { min:number; max:number; iconId:LevelIconId; nameRu:string; nameEn:string; color:string; }
// A muted, boutique-perfume palette — desaturated and warm rather than
// bright/neon, so the level accent reads as "elegant" not "gamified".
export const LEVELS: IntimacyLevel[] = [
  { min:0,    max:99,       iconId:"ice",       nameRu:"Лёд",            nameEn:"Ice",          color:"rgba(178,196,214,0.9)"  },
  { min:100,  max:299,      iconId:"sprout",    nameRu:"Первые ростки",  nameEn:"First sparks", color:"rgba(178,196,168,0.9)"  },
  { min:300,  max:599,      iconId:"sun",       nameRu:"Тепло",          nameEn:"Warmth",       color:"rgba(214,181,132,0.92)" },
  { min:600,  max:999,      iconId:"flame",     nameRu:"Искра",          nameEn:"Spark",        color:"rgba(206,140,104,0.92)" },
  { min:1000, max:1499,     iconId:"closeness", nameRu:"Близость",       nameEn:"Closeness",    color:"rgba(196,118,132,0.94)" },
  { min:1500, max:2499,     iconId:"deepbond",  nameRu:"Глубокая связь", nameEn:"Deep bond",    color:"rgba(158,80,98,0.96)"   },
  { min:2500, max:Infinity, iconId:"onesoul",   nameRu:"Единое целое",   nameEn:"One soul",     color:"rgba(196,168,200,0.96)" },
];
export function getLevel(score: number): IntimacyLevel {
  return LEVELS.find(l => score >= l.min && score <= l.max) ?? LEVELS[0];
}
export function getLevelProgress(score: number): number {
  const lvl = getLevel(score); if (lvl.max === Infinity) return 1;
  return (score - lvl.min) / (lvl.max - lvl.min + 1);
}

export const INTIMACY_LOCAL_KEY = "touche_intimacy_v1";
export interface IntimacyLocal { score:number; streakDays:number; lastActivityDate:string; totalTasks:number; history:{date:string;points:number;total:number}[]; }
function todayStr()     { return new Date().toISOString().slice(0,10); }
function yesterdayStr() { const d=new Date(); d.setDate(d.getDate()-1); return d.toISOString().slice(0,10); }
export function loadLocal(): IntimacyLocal {
  try { const v=localStorage.getItem(INTIMACY_LOCAL_KEY); if(v) return JSON.parse(v); } catch {}
  return { score:0, streakDays:0, lastActivityDate:"", totalTasks:0, history:[] };
}
export function addLocalPoints(category: Category): IntimacyLocal {
  const points=getPoints(category); const data=loadLocal();
  const today=todayStr(); const yest=yesterdayStr();
  let score=data.score;
  if (data.lastActivityDate && data.lastActivityDate < yest) {
    const days=Math.floor((new Date(today).getTime()-new Date(data.lastActivityDate).getTime())/86400000)-1;
    for (let i=0;i<Math.min(days,30);i++) { const p=Math.min(50,Math.floor(score*0.05)); score=Math.max(0,score-p); }
  }
  let {streakDays}=data;
  if      (data.lastActivityDate===today) { /**/ }
  else if (data.lastActivityDate===yest)  { streakDays+=1; }
  else                                     { streakDays=1; }
  const newScore=score+points;
  let history=[...data.history];
  const te=history.find(h=>h.date===today);
  if (te) { te.points+=points; te.total=newScore; } else { history.push({date:today,points,total:newScore}); }
  if (history.length>30) history=history.slice(-30);
  const updated: IntimacyLocal={ score:newScore,streakDays,lastActivityDate:today,totalTasks:data.totalTasks+1,history };
  try { localStorage.setItem(INTIMACY_LOCAL_KEY,JSON.stringify(updated)); } catch {}
  return updated;
}
