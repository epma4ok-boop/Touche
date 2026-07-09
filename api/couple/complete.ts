// GET /api/couple/tasks/today
// Returns up to 3 daily tasks (one per tier). Creates them if missing.
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { validateTelegramInitData } from "../_auth.js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const BOT_TOKEN = process.env.BOT_TOKEN!;

// Sample tasks per tier. Expand this pool as needed.
const TASK_POOL: Record<string, string[]> = {
  tenderness: [
    "Скажи партнёру три вещи, за которые ты ему/ей благодарен(а) сегодня",
    "Обними партнёра сзади и постой так минуту, ни слова не говоря",
    "Напиши голосовое сообщение с тем, что тебе нравится в партнёре",
    "Поцелуй партнёра в лоб и скажи «я рад(а), что ты есть»",
    "Сделай партнёру 5-минутный массаж шеи и плеч",
    "Возьми партнёра за руку и просто побудьте так 5 минут",
    "Отправь партнёру голосовое «доброе утро» с одним тёплым словом",
  ],
  desire: [
    "Напиши партнёру одно откровенное желание, которое давно хотел(а) исполнить",
    "Пришли партнёру фото того, что хочешь сделать вечером — без слов",
    "Шепни партнёру на ухо, что именно тебя в нём/ней заводит",
    "Медленно поцелуй партнёра в шею, задержавшись на 10 секунд",
    "Устрой партнёру сюрприз: создай атмосферу (свет, музыка) и не объясняй зачем",
    "Напиши партнёру три «грязных» слова, которые ты бы сказал(а) в нужный момент",
  ],
  passion: [
    "Начни вечер с поцелуя, который длится не меньше 30 секунд",
    "Сегодня один из вас — ведущий. Ведущий решает всё до конца вечера",
    "Попробуйте что-то, о чём говорили, но никак не решались",
    "Сделайте что-то вместе первый раз — и запомните этот момент",
    "Устройте вечер без телефонов: только вы двое и что захотите",
  ],
};

function pickTask(tier: string): { text: string; points: number } {
  const pool  = TASK_POOL[tier] ?? TASK_POOL.tenderness;
  const text  = pool[Math.floor(Math.random() * pool.length)];
  const pts   = tier === "tenderness" ? rand(10, 20) : tier === "desire" ? rand(25, 35) : rand(40, 55);
  return { text, points: pts };
}

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

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

  const today = new Date().toISOString().slice(0, 10);

  // Load existing tasks for today
  const { data: existing } = await supabase
    .from("daily_tasks")
    .select("*")
    .eq("couple_id", couple.id)
    .eq("date", today);

  const existingTiers = new Set((existing ?? []).map((t: Record<string, string>) => t.category));
  const tiers = ["tenderness", "desire", "passion"];
  const toCreate = tiers.filter(t => !existingTiers.has(t));

  if (toCreate.length > 0) {
    const inserts = toCreate.map(tier => {
      const { text, points } = pickTask(tier);
      return { couple_id: couple.id, date: today, category: tier, task_text: text, points };
    });
    await supabase.from("daily_tasks").insert(inserts);
  }

  const { data: tasks } = await supabase
    .from("daily_tasks")
    .select("*")
    .eq("couple_id", couple.id)
    .eq("date", today)
    .order("category");

  // Determine which user is a or b
  const { data: coupleRow } = await supabase
    .from("couples")
    .select("user_a_id, user_b_id")
    .eq("id", couple.id)
    .single();

  const role = coupleRow?.user_a_id === user.id ? "a" : "b";

  return res.status(200).json({
    tasks: (tasks ?? []).map((t: Record<string, unknown>) => ({
      id:       t.id,
      category: t.category,
      text:     t.task_text,
      points:   t.points,
      myStatus: role === "a" ? t.status_a : t.status_b,
      partnerStatus: role === "a" ? t.status_b : t.status_a,
    })),
    role,
  });
}
