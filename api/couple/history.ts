// POST /api/couple/tasks/complete
// Body: { task_id: string, category: string }
// Marks the caller's status as 'done', adds points if both done, updates couple score.
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { validateTelegramInitData } from "../_auth.js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const BOT_TOKEN = process.env.BOT_TOKEN!;

function getLevel(score: number): number {
  if (score < 100) return 0; if (score < 300) return 1; if (score < 600) return 2;
  if (score < 1000) return 3; if (score < 1500) return 4; if (score < 2500) return 5;
  return 6;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-telegram-init-data");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const initData = req.headers["x-telegram-init-data"] as string;
  const user = validateTelegramInitData(initData, BOT_TOKEN);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const { task_id, category } = req.body as { task_id: string; category: string };
  if (!task_id) return res.status(400).json({ error: "task_id required" });

  // Find couple and determine role
  const { data: couple } = await supabase
    .from("couples")
    .select("id, user_a_id, user_b_id, intimacy_score, streak_days, last_active_date")
    .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
    .maybeSingle();
  if (!couple) return res.status(404).json({ error: "No couple" });

  const role = couple.user_a_id === user.id ? "a" : "b";
  const statusField = role === "a" ? "status_a" : "status_b";

  // Fetch the task
  const { data: task } = await supabase
    .from("daily_tasks")
    .select("*")
    .eq("id", task_id)
    .eq("couple_id", couple.id)
    .maybeSingle();
  if (!task) return res.status(404).json({ error: "Task not found" });
  if ((role === "a" ? task.status_a : task.status_b) === "done") {
    return res.status(200).json({ ok: true, alreadyDone: true, score: couple.intimacy_score });
  }

  // Mark as done
  await supabase.from("daily_tasks").update({ [statusField]: "done" }).eq("id", task_id);

  // Award points to couple score
  const points = task.points as number;
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = (() => { const d = new Date(); d.setDate(d.getDate()-1); return d.toISOString().slice(0, 10); })();

  let { streak_days: streak, last_active_date: lastActive } = couple;
  const currentScore = couple.intimacy_score ?? 0;

  // Update streak
  if (lastActive === today) { /* same day */ }
  else if (lastActive === yesterday) { streak = (streak ?? 0) + 1; }
  else { streak = 1; }

  const newScore = currentScore + points;
  const newLevel = getLevel(newScore);

  await supabase.from("couples").update({
    intimacy_score: newScore,
    streak_days: streak,
    last_active_date: today,
    level: newLevel,
  }).eq("id", couple.id);

  // Log the action
  const otherStatus = role === "a" ? task.status_b : task.status_a;
  const completedBy = otherStatus === "done" ? "both" : (role === "a" ? "user_a" : "user_b");

  await supabase.from("couple_actions").insert({
    couple_id: couple.id,
    task_id,
    category: category ?? task.category,
    points,
    completed_by: completedBy,
  });

  // Update daily history
  const { data: hist } = await supabase
    .from("intimacy_history")
    .select("id, points_gained, tasks_completed")
    .eq("couple_id", couple.id).eq("date", today).maybeSingle();

  if (hist) {
    await supabase.from("intimacy_history").update({
      points_gained: (hist.points_gained ?? 0) + points,
      tasks_completed: (hist.tasks_completed ?? 0) + 1,
      total_score: newScore,
    }).eq("id", hist.id);
  } else {
    await supabase.from("intimacy_history").insert({
      couple_id: couple.id, date: today,
      points_gained: points, total_score: newScore, tasks_completed: 1,
    });
  }

  return res.status(200).json({ ok: true, points, newScore, streakDays: streak, level: newLevel });
}
