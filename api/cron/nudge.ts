// api/cron/nudge.ts — Vercel Cron, daily 15:00 UTC
// 1. Scenario nudge (inactive 3-4 days)
// 2. Subscription expiry reminder (~2 days left)
// 3. Intimacy decay: -5% (max 50 pts) for couples inactive yesterday

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { appDate } from "../limits.js";

const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const BOT=process.env.BOT_TOKEN!, CRON_SECRET=process.env.CRON_SECRET??"";

async function send(chatId:number,text:string,btnText:string,btnUrl:string,webApp=true){
  const btn=webApp?{text:btnText,web_app:{url:btnUrl}}:{text:btnText,url:btnUrl};
  await fetch(`https://api.telegram.org/bot${BOT}/sendMessage`,{
    method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({chat_id:chatId,text,parse_mode:"HTML",reply_markup:{inline_keyboard:[[btn]]}}),
  });
}

async function runNudge(appUrl:string){
  const now=new Date();
  const{data:couples}=await sb.from("couples").select("id,user_a_id,user_b_id").not("user_b_id","is",null);
  if(!couples?.length)return 0;
  const ids=couples.map(c=>c.id);
  const{data:sessions}=await sb.from("scenario_sessions").select("couple_id,created_at").in("couple_id",ids).order("created_at",{ascending:false});
  const lastMap=new Map<string,Date>();
  for(const s of sessions??[]){if(!lastMap.has(s.couple_id))lastMap.set(s.couple_id,new Date(s.created_at));}
  const MSGS_RU=["🌙 Уже 3 дня без сценария. Самое время вытянуть карту.","💌 Три дня прошло — ваш следующий сценарий ждёт.","✨ Хороший вечер начинается с одного нажатия."];
  const D3=3*864e5,D4=4*864e5; let n=0;
  for(const c of couples){const last=lastMap.get(c.id);if(!last)continue;const age=now.getTime()-last.getTime();if(age<D3||age>D4)continue;const msg=MSGS_RU[Math.floor(Math.random()*MSGS_RU.length)];try{await send(c.user_a_id,msg,"🃏 Тянуть сценарий",appUrl);}catch{}try{await send(c.user_b_id,msg,"🃏 Тянуть сценарий",appUrl);}catch{}n++;}
  return n;
}

async function runExpiry(appUrl:string){
  const now=new Date();
  const from=new Date(now.getTime()+1.5*864e5),to=new Date(now.getTime()+2.5*864e5);
  const{data:subs}=await sb.from("user_subscriptions").select("user_id,expires_at").gte("expires_at",from.toISOString()).lte("expires_at",to.toISOString());
  if(!subs?.length)return 0;
  let n=0;
  for(const s of subs){const d=Math.round((new Date(s.expires_at).getTime()-now.getTime())/864e5);try{await send(s.user_id,`⏳ <b>Touché Premium</b> заканчивается через ${d} дня.`,"💳 Продлить",appUrl,true);n++;}catch{}}
  return n;
}

async function runDecay(){
  const { data, error } = await sb.rpc("apply_intimacy_decay", { p_date: appDate() });
  if (error) throw error;
  return Number(data ?? 0);
}

export default async function handler(req:VercelRequest,res:VercelResponse){
  if(!CRON_SECRET||req.headers.authorization!==`Bearer ${CRON_SECRET}`)return res.status(401).json({error:"Unauthorized"});
  if(req.method!=="GET"&&req.method!=="POST")return res.status(405).json({error:"Method not allowed"});
  const appUrl=process.env.APP_URL;
  if(!BOT||!appUrl)return res.status(503).json({error:"service_unconfigured"});
  const[nudged,reminded,decayed]=await Promise.all([runNudge(appUrl),runExpiry(appUrl),runDecay()]);
  return res.status(200).json({ok:true,nudged,reminded,decayed});
}
