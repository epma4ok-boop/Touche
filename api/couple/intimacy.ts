// api/couple/intimacy.ts — single function replacing 4 endpoints
// GET  ?action=stats    → score, level, streak
// GET  ?action=history  → 30-day chart
// GET  ?action=tasks    → today's 3 tier tasks
// POST ?action=complete → award points

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { validateTelegramInitData } from "./_auth.js";

const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const BOT = process.env.BOT_TOKEN!;

function lvl(s:number){if(s<100)return 0;if(s<300)return 1;if(s<600)return 2;if(s<1000)return 3;if(s<1500)return 4;if(s<2500)return 5;return 6;}
function rand(a:number,b:number){return Math.floor(Math.random()*(b-a+1))+a;}
function today(){return new Date().toISOString().slice(0,10);}
function yest(){const d=new Date();d.setDate(d.getDate()-1);return d.toISOString().slice(0,10);}

const TASKS:Record<string,string[]>={
  tenderness:["Скажи партнёру три вещи, за которые ты ему благодарен(а) сегодня","Обними партнёра сзади и постой так минуту","Поцелуй в лоб и скажи «я рад(а), что ты есть»","Возьми за руку и побудьте так 5 минут молча","Сделай 5-минутный массаж шеи"],
  desire:["Напиши откровенное желание, которое давно хотел исполнить","Шепни партнёру на ухо, что именно тебя в нём заводит","Медленно поцелуй в шею, задержавшись на 10 секунд","Устрой сюрприз: свет, музыка — без объяснений"],
  passion:["Начни вечер с поцелуя длиной не меньше 30 секунд","Один из вас — ведущий. Ведущий решает всё до конца вечера","Попробуйте что-то, о чём говорили, но не решались","Вечер без телефонов: только вы двое"],
};
function pickTask(tier:string){
  const pool=TASKS[tier]??TASKS.tenderness;
  const text=pool[Math.floor(Math.random()*pool.length)];
  const pts=tier==="tenderness"?rand(10,20):tier==="desire"?rand(25,35):rand(40,55);
  return {text,points:pts};
}

async function getCouple(userId:number){
  const {data}=await sb.from("couples").select("id,user_a_id,user_b_id,intimacy_score,streak_days,last_active_date")
    .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`).maybeSingle();
  return data;
}

async function handleStats(coupleId:string){
  const {data:c}=await sb.from("couples").select("intimacy_score,streak_days,last_active_date").eq("id",coupleId).maybeSingle();
  if(!c)return null;
  const td=today();
  const {count:tasksToday}=await sb.from("couple_actions").select("*",{count:"exact",head:true}).eq("couple_id",coupleId).gte("completed_at",`${td}T00:00:00`);
  const {data:hist}=await sb.from("intimacy_history").select("points_gained,points_lost").eq("couple_id",coupleId).eq("date",td).maybeSingle();
  const score=c.intimacy_score??0;
  return {score,level:lvl(score),streakDays:c.streak_days??0,lastActive:c.last_active_date,tasksToday:tasksToday??0,pointsGained:hist?.points_gained??0,pointsLost:hist?.points_lost??0,coupleId};
}

async function handleHistory(coupleId:string){
  const ago=new Date();ago.setDate(ago.getDate()-30);
  const {data}=await sb.from("intimacy_history").select("date,points_gained,points_lost,total_score,tasks_completed")
    .eq("couple_id",coupleId).gte("date",ago.toISOString().slice(0,10)).order("date",{ascending:true});
  return {history:data??[]};
}

async function handleTasks(coupleId:string,userId:number){
  const td=today();
  const {data:ex}=await sb.from("daily_tasks").select("*").eq("couple_id",coupleId).eq("date",td);
  const existing=new Set((ex??[]).map((t:Record<string,unknown>)=>t.category));
  const missing=["tenderness","desire","passion"].filter(t=>!existing.has(t));
  if(missing.length){
    await sb.from("daily_tasks").insert(missing.map(tier=>{const {text,points}=pickTask(tier);return{couple_id:coupleId,date:td,category:tier,task_text:text,points};}));
  }
  const {data:tasks}=await sb.from("daily_tasks").select("*").eq("couple_id",coupleId).eq("date",td).order("category");
  const {data:cr}=await sb.from("couples").select("user_a_id").eq("id",coupleId).single();
  const role=cr?.user_a_id===userId?"a":"b";
  return {tasks:(tasks??[]).map((t:Record<string,unknown>)=>({id:t.id,category:t.category,text:t.task_text,points:t.points,myStatus:role==="a"?t.status_a:t.status_b,partnerStatus:role==="a"?t.status_b:t.status_a})),role};
}

async function handleComplete(couple:Record<string,unknown>,userId:number,body:Record<string,unknown>){
  const {task_id,category}=body as {task_id?:string;category:string};
  const role=(couple.user_a_id as number)===userId?"a":"b";
  const td=today(),yd=yest();
  let pts=category==="tenderness"?rand(10,20):category==="desire"?rand(25,35):rand(40,55);
  if(task_id){
    const {data:task}=await sb.from("daily_tasks").select("*").eq("id",task_id).eq("couple_id",couple.id).maybeSingle();
    if(task){
      if((role==="a"?task.status_a:task.status_b)==="done")return{ok:true,alreadyDone:true};
      pts=task.points as number;
      await sb.from("daily_tasks").update({[`status_${role}`]:"done"}).eq("id",task_id);
    }
  }
  let streak=couple.streak_days as number??0;
  const last=couple.last_active_date as string;
  if(last===td){}else if(last===yd){streak++;}else{streak=1;}
  const newScore=Math.max(0,(couple.intimacy_score as number??0)+pts);
  await sb.from("couples").update({intimacy_score:newScore,streak_days:streak,last_active_date:td,level:lvl(newScore)}).eq("id",couple.id);
  await sb.from("couple_actions").insert({couple_id:couple.id,task_id:task_id??null,category,points:pts,completed_by:role==="a"?"user_a":"user_b"});
  const {data:h}=await sb.from("intimacy_history").select("id,points_gained,tasks_completed").eq("couple_id",couple.id).eq("date",td).maybeSingle();
  if(h){await sb.from("intimacy_history").update({points_gained:(h.points_gained??0)+pts,tasks_completed:(h.tasks_completed??0)+1,total_score:newScore}).eq("id",h.id);}
  else{await sb.from("intimacy_history").insert({couple_id:couple.id,date:td,points_gained:pts,total_score:newScore,tasks_completed:1});}
  return{ok:true,points:pts,newScore,streakDays:streak,level:lvl(newScore)};
}

export default async function handler(req:VercelRequest,res:VercelResponse){
  res.setHeader("Access-Control-Allow-Origin","*");
  res.setHeader("Access-Control-Allow-Headers","Content-Type, x-telegram-init-data");
  if(req.method==="OPTIONS")return res.status(200).end();
  const user=validateTelegramInitData(req.headers["x-telegram-init-data"] as string,BOT);
  if(!user)return res.status(401).json({error:"Unauthorized"});
  const couple=await getCouple(user.id);
  if(!couple)return res.status(404).json({error:"No couple"});
  const action=(req.query.action as string)??"";
  if(req.method==="GET"){
    if(action==="stats"){const d=await handleStats(couple.id as string);return d?res.status(200).json(d):res.status(404).json({error:"Not found"});}
    if(action==="history")return res.status(200).json(await handleHistory(couple.id as string));
    if(action==="tasks")return res.status(200).json(await handleTasks(couple.id as string,user.id));
    return res.status(400).json({error:"Unknown action"});
  }
  if(req.method==="POST"&&action==="complete"){
    const d=await handleComplete(couple,user.id,req.body??{});
    return d?res.status(200).json(d):res.status(404).json({error:"Not found"});
  }
  return res.status(405).json({error:"Method not allowed"});
}
