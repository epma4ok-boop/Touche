// api/cron/nudge.ts — Vercel Cron, daily 15:00 UTC
// 1. Scenario nudge (inactive 3-4 days)
// 2. Subscription expiry reminder (~2 days left)
// 3. One generic opt-in Wish Map check-in reminder per shared task/member

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { appDate } from "../limits.js";

const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const BOT=process.env.BOT_TOKEN!, CRON_SECRET=process.env.CRON_SECRET??"";

async function send(chatId:number,text:string,btnText:string,btnUrl:string,webApp=true): Promise<boolean> {
  const btn=webApp?{text:btnText,web_app:{url:btnUrl}}:{text:btnText,url:btnUrl};
  const response=await fetch(`https://api.telegram.org/bot${BOT}/sendMessage`,{
    method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({chat_id:chatId,text,parse_mode:"HTML",reply_markup:{inline_keyboard:[[btn]]}}),
  });
  return response.ok;
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

async function runWishMapCheckins(appUrl:string) {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: tasks, error: taskError } = await sb
    .from("generated_tasks")
    .select("id,couple_id")
    .eq("mode", "together")
    .not("couple_id", "is", null)
    .lte("created_at", cutoff)
    .order("created_at", { ascending: false })
    .limit(500);
  if (taskError) throw taskError;
  if (!tasks?.length) return 0;

  const taskIds = tasks.map((task) => task.id);
  const coupleIds = [...new Set(tasks.map((task) => String(task.couple_id)))];
  const [{ data: couples, error: coupleError }, { data: attestations, error: attestationError }, { data: sentReminders, error: reminderError }] = await Promise.all([
    sb.from("couples").select("id,user_a_id,user_b_id").in("id", coupleIds),
    sb.from("wish_map_task_attestations").select("generated_task_id,evaluator_user_id").in("generated_task_id", taskIds),
    sb.from("wish_map_checkin_reminders").select("generated_task_id,user_id").in("generated_task_id", taskIds),
  ]);
  if (coupleError || attestationError || reminderError) {
    throw coupleError ?? attestationError ?? reminderError;
  }

  const coupleById = new Map((couples ?? []).map((couple) => [String(couple.id), couple]));
  const answered = new Set((attestations ?? []).map((row) => `${row.generated_task_id}:${row.evaluator_user_id}`));
  const alreadyReminded = new Set((sentReminders ?? []).map((row) => `${row.generated_task_id}:${row.user_id}`));
  const pendingByMember = new Map<string, { coupleId: string; userId: number; taskIds: string[] }>();

  for (const task of tasks) {
    const coupleId = String(task.couple_id);
    const couple = coupleById.get(coupleId);
    if (!couple) continue;
    for (const userId of [Number(couple.user_a_id), Number(couple.user_b_id)]) {
      const key = `${task.id}:${userId}`;
      const memberKey = `${coupleId}:${userId}`;
      if (answered.has(key) || alreadyReminded.has(key)) continue;
      const entry = pendingByMember.get(memberKey) ?? { coupleId, userId, taskIds: [] };
      entry.taskIds.push(String(task.id));
      pendingByMember.set(memberKey, entry);
    }
  }

  if (!pendingByMember.size) return 0;
  const members = [...pendingByMember.values()];
  const memberIds = [...new Set(members.map((member) => member.userId))];
  const { data: preferences, error: preferenceError } = await sb
    .from("couple_member_preferences")
    .select("couple_id,user_id,telegram_notifications_enabled")
    .in("couple_id", [...new Set(members.map((member) => member.coupleId))])
    .in("user_id", memberIds);
  if (preferenceError) throw preferenceError;

  const optedIn = new Set((preferences ?? [])
    .filter((row) => row.telegram_notifications_enabled === true)
    .map((row) => `${row.couple_id}:${row.user_id}`));
  const target = new URL(appUrl);
  target.searchParams.set("wish_map", "1");
  const text = "В Touché есть короткий вопрос по общему заданию. Откройте Карту желаний, чтобы ответить. / Touché has a quick question about a shared task. Open your Wish Map to answer.";
  let sentCount = 0;

  for (const member of members) {
    const memberKey = `${member.coupleId}:${member.userId}`;
    if (!optedIn.has(memberKey)) continue;
    let delivered = false;
    try {
      delivered = await send(member.userId, text, "Открыть Touché / Open Touché", target.toString());
    } catch {
      delivered = false;
    }
    if (!delivered) continue;

    const reminderRows = member.taskIds.map((generated_task_id) => ({
      generated_task_id,
      couple_id: member.coupleId,
      user_id: member.userId,
    }));
    const { error } = await sb.from("wish_map_checkin_reminders")
      .upsert(reminderRows, { onConflict: "generated_task_id,user_id", ignoreDuplicates: true });
    if (error) throw error;
    sentCount += 1;
  }
  return sentCount;
}

export default async function handler(req:VercelRequest,res:VercelResponse){
  if(!CRON_SECRET||req.headers.authorization!==`Bearer ${CRON_SECRET}`)return res.status(401).json({error:"Unauthorized"});
  if(req.method!=="GET"&&req.method!=="POST")return res.status(405).json({error:"Method not allowed"});
  const appUrl=process.env.APP_URL;
  if(!BOT||!appUrl)return res.status(503).json({error:"service_unconfigured"});
  const[nudged,reminded,wishCheckins]=await Promise.all([runNudge(appUrl),runExpiry(appUrl),runWishMapCheckins(appUrl)]);
  return res.status(200).json({ok:true,nudged,reminded,wishCheckins});
}
