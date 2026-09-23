// api/couple/intimacy.ts — single function replacing 4 endpoints
// GET  ?action=stats    → score, level, streak
// GET  ?action=history  → 30-day chart
// POST ?action=complete → award points

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { validateTelegramInitData } from "./_auth.js";
import { appDate } from "../limits.js";

const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const BOT = process.env.BOT_TOKEN!;

function lvl(s:number){if(s<100)return 0;if(s<300)return 1;if(s<600)return 2;if(s<1000)return 3;if(s<1500)return 4;if(s<2500)return 5;return 6;}
function today(){return appDate();}

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
    .eq("couple_id",coupleId).gte("date",appDate(ago)).order("date",{ascending:true});
  return {history:data??[]};
}

async function handleComplete(couple:Record<string,unknown>,userId:number,body:Record<string,unknown>){
  const { task_id } = body as { task_id?: string };
  if (!task_id || !/^[0-9a-f-]{16,}$/i.test(task_id)) return null;
  const { data, error } = await sb.rpc("complete_generated_task", {
    p_task_id: task_id,
    p_user_id: userId,
    p_date: appDate(),
  });
  if (error) return null;
  return data ?? { ok: true };
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
    if(action==="tasks")return res.status(410).json({error:"daily_tasks_deprecated"});
    return res.status(400).json({error:"Unknown action"});
  }
  if(req.method==="POST"&&action==="complete"){
    const d=await handleComplete(couple,user.id,req.body??{});
    return d?res.status(200).json(d):res.status(404).json({error:"Not found"});
  }
  return res.status(405).json({error:"Method not allowed"});
}
