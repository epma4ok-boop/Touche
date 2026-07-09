// GET /api/couple/history
// Returns last 30 days of intimacy_history for chart rendering
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { validateTelegramInitData } from "./_auth.js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const BOT_TOKEN = process.env.BOT_TOKEN!;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-telegram-init-data");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const initData = req.headers["x-telegram-init-data"] as string;
  const user = validateTelegramInitData(initData, BOT_TOKEN);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const { data: couple } = await supabase
    .from("couples")
    .select("id")
    .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
    .maybeSingle();
  if (!couple) return res.status(404).json({ error: "No couple" });

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: history } = await supabase
    .from("intimacy_history")
    .select("date, points_gained, points_lost, total_score, tasks_completed")
    .eq("couple_id", couple.id)
    .gte("date", thirtyDaysAgo.toISOString().slice(0, 10))
    .order("date", { ascending: true });

  return res.status(200).json({ history: history ?? [] });
}
