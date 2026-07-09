// api/couple/intimacy.ts
// ONE serverless function replacing 4 separate endpoints.
// Routing:
//   GET  /api/couple/intimacy?action=stats    → couple stats + score
//   GET  /api/couple/intimacy?action=history  → last 30 days chart data
//   GET  /api/couple/intimacy?action=tasks    → today's 3 tasks
//   POST /api/couple/intimacy?action=complete → mark task done, award points

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { validateTelegramInitData } from "./_auth.js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const BOT_TOKEN = process.env.BOT_TOKEN!;

// ─── Helpers ──────────────────────────────────────────────────────
function getLevel(s: number) {
  if (s < 100) return 0; if (s < 300) return 1; if (s < 600) return 2;
  if (s < 1000) return 3; if (s < 1500) return 4; if (s < 2500) return 5;
  return 6;
}
function rand(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function todayStr()     { return new Date().toISOString().slice(0, 10); }
function yesterdayStr() { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10); }

// ─── Task pool ────────────────────────────────────────────────────
const TASK_POOL: Record<string, string[]> = {
  tenderness: [
    "Скажи партнёру три вещи, за которые ты ему/ей благодарен(а) сегодня",
    "Обними партнёра сзади и постой так минуту, ни слова не говоря",
    "Напиши голосовое сообщение с тем, что тебе нравится в партнёре",
    "Поцелуй партнёра в лоб и скажи «я рад(а), что ты есть»",
    "Сделай партнёру 5-минутный массаж шеи и плеч",
    "Возьми партнёра за руку и просто побудьте так 5 минут",
  ],
  desire: [
    "Напиши партнёру одно откровенное желание, которое давно хотел(а) исполнить",
    "Пришли партнёру фото того, что хочешь сделать вечером — без слов",
    "Шепни партнёру на ухо, что именно тебя в нём/ней заводит",
    "Медленно поцелуй партнёра в шею, задержавшись на 10 секунд",
    "Устрой партнёру сюрприз: создай атмосферу (свет, музыка) и не объясняй зачем",
  ],
  passion: [
    "Начни вечер с поцелуя, который длится не меньше 30 секунд",
    "Сегодня один из вас — ведущий. Ведущий решает всё до конца вечера",
    "Попробуйте что-то, о чём говорили, но никак не решались",
    "Устройте вечер без телефонов: только вы двое и что захотите",
  ],
};
function pickTask(tier: string) {
  const pool = TASK_POOL[tier] ?? TASK_POOL.tenderness;
  const text  = pool[Math.floor(Math.random() * pool.length)];
  const pts   = tier === "tenderness" ? rand(10,20) : tier === "desire" ? rand(25,35) : rand(40,55);
  return { text, points: pts };
}

// ─── Action handlers ──────────────────────────────────────────────
async function handleStats(coupleId: string) {
  const { data: couple } = await supabase
    .from("couples").select("id,intimacy_score,streak_days,last_active_date")
    .eq("id", coupleId).maybeSingle();
  if (!couple) return null;

  const today = todayStr();
  const { count: tasksToday } = await supabase
    .from("couple_actions").select("*", { count: "exact", head: true })
    .eq("couple_id", coupleId).gte("completed_at", `${today}T00:00:00`);

  const { data: hist } = await supabase
    .from("intimacy_history").select("points_gained,points_lost")
    .eq("couple_id", coupleId).eq("date", today).maybeSingle();

  const score = couple.intimacy_score ?? 0;
  return {
    score, level: getLevel(score), streakDays: couple.streak_days ?? 0,
    lastActive: couple.last_active_date, tasksToday: tasksToday ?? 0,
    pointsGained: hist?.points_gained ?? 0, pointsLost: hist?.points_lost ?? 0, coupleId,
  };
}

async function handleHistory(coupleId: string) {
  const thirtyAgo = new Date(); thirtyAgo.setDate(thirtyAgo.getDate() - 30);
  const { data } = await supabase
    .from("intimacy_history").select("date,points_gained,points_lost,total_score,tasks_completed")
    .eq("couple_id", coupleId).gte("date", thirtyAgo.toISOString().slice(0,10))
    .order("date", { ascending: true });
  return { history: data ?? [] };
}

async function handleTasksToday(coupleId: string, userId: number) {
  const today = todayStr();
  const { data: existing } = await supabase
    .from("daily_tasks").select("*").eq("couple_id", coupleId).eq("date", today);

  const existingTiers = new Set((existing ?? []).map((t: Record<string,unknown>) => t.category));
  const toCreate = ["tenderness","desire","passion"].filter(t => !existingTiers.has(t));
  if (toCreate.length) {
    await supabase.from("daily_tasks").insert(
      toCreate.map(tier => { const { text, points } = pickTask(tier); return { couple_id: coupleId, date: today, category: tier, task_text: text, points }; })
    );
  }

  const { data: tasks } = await supabase.from("daily_tasks").select("*").eq("couple_id", coupleId).eq("date", today).order("category");
  const { data: coupleRow } = await supabase.from("couples").select("user_a_id").eq("id", coupleId).single();
  const role = coupleRow?.user_a_id === userId ? "a" : "b";

  return {
    tasks: (tasks ?? []).map((t: Record<string,unknown>) => ({
      id: t.id, category: t.category, text: t.task_text, points: t.points,
      myStatus:      role === "a" ? t.status_a : t.status_b,
      partnerStatus: role === "a" ? t.status_b : t.status_a,
    })), role,
  };
}

async function handleComplete(coupleId: string, userId: number, body: Record<string,unknown>) {
  const { task_id, category } = body as { task_id?: string; category: string };

  const { data: couple } = await supabase
    .from("couples").select("id,user_a_id,user_b_id,intimacy_score,streak_days,last_active_date")
    .eq("id", coupleId).maybeSingle();
  if (!couple) return null;

  const role = couple.user_a_id === userId ? "a" : "b";
  const today = todayStr(); const yesterday = yesterdayStr();

  // Resolve or create a task record for this category
  let taskId = task_id;
  let points  = 25; // fallback
  if (taskId) {
    const { data: task } = await supabase.from("daily_tasks").select("*").eq("id", taskId).eq("couple_id", coupleId).maybeSingle();
    if (task) {
      const myStatus = role === "a" ? task.status_a : task.status_b;
      if (myStatus === "done") return { ok: true, alreadyDone: true, score: couple.intimacy_score };
      points = task.points as number;
      await supabase.from("daily_tasks").update({ [`status_${role}`]: "done" }).eq("id", taskId);
    }
  } else {
    // Called from CategoryScreen (no task_id) — derive points from category
    const tier = ["compliments","tenderness"].includes(category) ? "tenderness" : category === "desire" ? "desire" : "passion";
    points = tier === "tenderness" ? rand(10,20) : tier === "desire" ? rand(25,35) : rand(40,55);
  }

  // Streak logic
  let { streak_days: streak, last_active_date: lastActive } = couple;
  if      (lastActive === today)     { /* same day */ }
  else if (lastActive === yesterday) { streak = (streak ?? 0) + 1; }
  else                               { streak = 1; }

  const newScore = Math.max(0, (couple.intimacy_score ?? 0) + points);
  await supabase.from("couples").update({
    intimacy_score: newScore, streak_days: streak, last_active_date: today, level: getLevel(newScore),
  }).eq("id", coupleId);

  await supabase.from("couple_actions").insert({
    couple_id: coupleId, task_id: taskId ?? null, category, points,
    completed_by: role === "a" ? "user_a" : "user_b",
  });

  const { data: hist } = await supabase.from("intimacy_history").select("id,points_gained,tasks_completed").eq("couple_id", coupleId).eq("date", today).maybeSingle();
  if (hist) {
    await supabase.from("intimacy_history").update({ points_gained: (hist.points_gained??0)+points, tasks_completed: (hist.tasks_completed??0)+1, total_score: newScore }).eq("id", hist.id);
  } else {
    await supabase.from("intimacy_history").insert({ couple_id: coupleId, date: today, points_gained: points, total_score: newScore, tasks_completed: 1 });
  }

  return { ok: true, points, newScore, streakDays: streak, level: getLevel(newScore) };
}

// ─── Main handler ─────────────────────────────────────────────────
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-telegram-init-data");
  if (req.method === "OPTIONS") return res.status(200).end();

  const initData = req.headers["x-telegram-init-data"] as string;
  const user = validateTelegramInitData(initData, BOT_TOKEN);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const action = (req.query.action as string) ?? "";

  // Find couple
  const { data: couple } = await supabase
    .from("couples").select("id")
    .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
    .maybeSingle();
  if (!couple) return res.status(404).json({ error: "No couple found" });

  const coupleId = couple.id as string;

  if (req.method === "GET") {
    if (action === "stats") {
      const data = await handleStats(coupleId);
      return data ? res.status(200).json(data) : res.status(404).json({ error: "Not found" });
    }
    if (action === "history") {
      return res.status(200).json(await handleHistory(coupleId));
    }
    if (action === "tasks") {
      return res.status(200).json(await handleTasksToday(coupleId, user.id));
    }
    return res.status(400).json({ error: "Unknown action. Use: stats | history | tasks" });
  }

  if (req.method === "POST" && action === "complete") {
    const data = await handleComplete(coupleId, user.id, req.body ?? {});
    return data ? res.status(200).json(data) : res.status(404).json({ error: "Couple not found" });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
