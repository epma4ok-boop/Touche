import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { validateTelegramInitData } from "./_auth.js";
import { appDate } from "../limits.js";

const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const BOT = process.env.BOT_TOKEN!;
const APP_URL = (process.env.APP_URL ?? "").replace(/\/$/, "");
const LANGS = new Set(["ru", "en", "hi", "pt", "es"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Couple = {
  id: string;
  user_a_id: number;
  user_b_id: number;
  intimacy_score: number;
  streak_days: number;
  last_active_date: string | null;
};

function levelForScore(score: number): number {
  if (score >= 2500) return 6;
  if (score >= 1500) return 5;
  if (score >= 1000) return 4;
  if (score >= 600) return 3;
  if (score >= 300) return 2;
  if (score >= 100) return 1;
  return 0;
}

function safeLang(value: unknown): string {
  const lang = String(value ?? "en");
  return LANGS.has(lang) ? lang : "en";
}

function appUrlWith(params: Record<string, string>): string | null {
  if (!APP_URL) return null;
  try {
    const url = new URL(APP_URL);
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
    return url.toString();
  } catch {
    return null;
  }
}

async function sendBotMessage(coupleId: string, chatId: number, lang: string, kind: "task_waiting" | "task_done" | "scenario_waiting" | "scenario_done", url?: string | null): Promise<boolean> {
  if (!BOT) return false;
  const { data: preference, error: preferenceError } = await sb
    .from("couple_member_preferences")
    .select("telegram_notifications_enabled")
    .eq("couple_id", coupleId)
    .eq("user_id", chatId)
    .maybeSingle();
  if (preferenceError || preference?.telegram_notifications_enabled !== true) return false;
  const copy: Record<string, Record<typeof kind, { text: string; button: string }>> = {
    ru: {
      task_waiting: { text: "Партнёр отметил наше задание. Теперь твоя очередь — подтвердите его вместе в Touché.", button: "Открыть наше задание" },
      task_done: { text: "Вы выполнили совместное задание. Индекс близости обновлён.", button: "Открыть Touché" },
      scenario_waiting: { text: "Партнёр завершил свою роль в сценарии. Теперь твоя очередь.", button: "Продолжить сценарий" },
      scenario_done: { text: "Вы завершили сценарий вместе. Индекс близости обновлён.", button: "Открыть Touché" },
    },
    en: {
      task_waiting: { text: "Your partner marked your shared task. It’s your turn to confirm it together in Touché.", button: "Open our task" },
      task_done: { text: "You completed a shared task together. Your intimacy index is updated.", button: "Open Touché" },
      scenario_waiting: { text: "Your partner finished their scenario role. It’s your turn.", button: "Continue scenario" },
      scenario_done: { text: "You completed a scenario together. Your intimacy index is updated.", button: "Open Touché" },
    },
    hi: {
      task_waiting: { text: "आपके साथी ने साझा कार्य पूरा किया। अब Touché में आपकी बारी है।", button: "हमारा कार्य खोलें" },
      task_done: { text: "आपने साझा कार्य साथ में पूरा किया। निकटता सूचकांक अपडेट हो गया है।", button: "Touché खोलें" },
      scenario_waiting: { text: "आपके साथी ने अपनी भूमिका पूरी की। अब आपकी बारी है।", button: "दृश्य जारी रखें" },
      scenario_done: { text: "आपने दृश्य साथ में पूरा किया। निकटता सूचकांक अपडेट हो गया है।", button: "Touché खोलें" },
    },
    pt: {
      task_waiting: { text: "Seu parceiro confirmou a tarefa compartilhada. Agora é sua vez no Touché.", button: "Abrir nossa tarefa" },
      task_done: { text: "Vocês concluíram uma tarefa juntos. O índice de intimidade foi atualizado.", button: "Abrir Touché" },
      scenario_waiting: { text: "Seu parceiro terminou o papel dele. Agora é sua vez.", button: "Continuar cenário" },
      scenario_done: { text: "Vocês concluíram o cenário juntos. O índice foi atualizado.", button: "Abrir Touché" },
    },
    es: {
      task_waiting: { text: "Tu pareja confirmó la tarea compartida. Ahora te toca en Touché.", button: "Abrir nuestra tarea" },
      task_done: { text: "Completaron una tarea juntos. El índice de intimidad se actualizó.", button: "Abrir Touché" },
      scenario_waiting: { text: "Tu pareja terminó su papel. Ahora te toca a ti.", button: "Continuar escenario" },
      scenario_done: { text: "Completaron el escenario juntos. El índice se actualizó.", button: "Abrir Touché" },
    },
  };
  const message = (copy[lang] ?? copy.en)[kind];
  try {
    const response = await fetch(`https://api.telegram.org/bot${BOT}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message.text,
        reply_markup: url ? { inline_keyboard: [[{ text: message.button, web_app: { url } }]] } : undefined,
      }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function handleGetPreferences(couple: Couple, userId: number) {
  const { data, error } = await sb
    .from("couple_member_preferences")
    .select("telegram_notifications_enabled")
    .eq("couple_id", couple.id)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return { ok: true, telegramNotificationsEnabled: data?.telegram_notifications_enabled === true };
}

async function handleUpdatePreferences(couple: Couple, userId: number, body: Record<string, unknown>) {
  if (typeof body.telegram_notifications_enabled !== "boolean") {
    return { status: 400, body: { error: "invalid_notification_preference" } };
  }
  const { error } = await sb.from("couple_member_preferences").upsert({
    couple_id: couple.id,
    user_id: userId,
    telegram_notifications_enabled: body.telegram_notifications_enabled,
    updated_at: new Date().toISOString(),
  }, { onConflict: "couple_id,user_id" });
  if (error) throw error;
  return { status: 200, body: { ok: true, telegramNotificationsEnabled: body.telegram_notifications_enabled } };
}

async function getCouple(userId: number): Promise<Couple | null> {
  const { data, error } = await sb
    .from("couples")
    .select("id,user_a_id,user_b_id,intimacy_score,streak_days,last_active_date")
    .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`)
    .maybeSingle();
  if (error) throw error;
  return data as Couple | null;
}

async function getSharedTask(couple: Couple, userId: number, taskId: string) {
  const { data: task, error } = await sb
    .from("generated_tasks")
    .select("id,couple_id,user_id,category,task_text,completed_at,created_at,mode")
    .eq("id", taskId)
    .eq("couple_id", couple.id)
    .eq("mode", "together")
    .maybeSingle();
  if (error) throw error;
  if (!task) return null;

  const { data: completions, error: completionError } = await sb
    .from("shared_task_completions")
    .select("user_id")
    .eq("generated_task_id", task.id)
    .eq("couple_id", couple.id);
  if (completionError) throw completionError;

  const completedBy = new Set((completions ?? []).map((row) => Number(row.user_id)));
  const partnerId = couple.user_a_id === userId ? couple.user_b_id : couple.user_a_id;
  const state = task.completed_at
    ? "completed"
    : completedBy.has(userId)
      ? "waiting_for_partner"
      : completedBy.has(partnerId)
        ? "your_turn"
        : "ready";
  return {
    taskId: task.id,
    coupleId: couple.id,
    category: task.category,
    task: task.task_text,
    createdAt: task.created_at,
    completedAt: task.completed_at,
    myCompleted: completedBy.has(userId),
    partnerCompleted: completedBy.has(partnerId),
    partnerId,
    state,
  };
}

async function handleStats(couple: Couple, userId: number) {
  const today = appDate();
  const [{ data: current }, { count: tasksToday, error: todayError }, { count: totalTasks, error: totalError }, { data: todayHistory, error: historyError }, { data: recentActions, error: actionsError }, { data: latestTask, error: taskError }] = await Promise.all([
    sb.from("couples").select("intimacy_score,streak_days,last_active_date").eq("id", couple.id).maybeSingle(),
    sb.from("couple_actions").select("id", { count: "exact", head: true }).eq("couple_id", couple.id).eq("completed_by", "both").gte("completed_at", `${today}T00:00:00`),
    sb.from("couple_actions").select("id", { count: "exact", head: true }).eq("couple_id", couple.id).eq("completed_by", "both"),
    sb.from("intimacy_history").select("points_gained,points_lost").eq("couple_id", couple.id).eq("date", today).maybeSingle(),
    sb.from("couple_actions").select("category,points,completed_at").eq("couple_id", couple.id).eq("completed_by", "both").order("completed_at", { ascending: false }).limit(3),
    sb.from("generated_tasks").select("id,category,completed_at,created_at").eq("couple_id", couple.id).eq("mode", "together").order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (todayError || totalError || historyError || actionsError || taskError) {
    throw todayError ?? totalError ?? historyError ?? actionsError ?? taskError;
  }
  if (!current) return null;

  let latestSharedTask = null;
  if (latestTask) {
    const details = await getSharedTask(couple, userId, latestTask.id);
    if (details) {
      latestSharedTask = details;
    }
  }

  const score = Number(current.intimacy_score ?? 0);
  return {
    score,
    level: levelForScore(score),
    streakDays: Number(current.streak_days ?? 0),
    lastActive: current.last_active_date,
    tasksToday: tasksToday ?? 0,
    totalTasks: totalTasks ?? 0,
    pointsGained: Number(todayHistory?.points_gained ?? 0),
    pointsLost: Number(todayHistory?.points_lost ?? 0),
    coupleId: couple.id,
    latestSharedTask,
    recentActions: recentActions ?? [],
  };
}

async function handleHistory(coupleId: string) {
  const ago = new Date();
  ago.setDate(ago.getDate() - 30);
  const { data, error } = await sb
    .from("intimacy_history")
    .select("date,points_gained,points_lost,total_score,tasks_completed")
    .eq("couple_id", coupleId)
    .gte("date", appDate(ago))
    .order("date", { ascending: true });
  if (error) throw error;
  return { history: data ?? [] };
}

async function handleCompleteTask(couple: Couple, userId: number, body: Record<string, unknown>) {
  const taskId = String(body.task_id ?? "");
  if (!UUID.test(taskId)) return { status: 400, body: { error: "invalid_task_id" } };
  const { data: task, error: taskError } = await sb
    .from("generated_tasks")
    .select("id,couple_id,mode")
    .eq("id", taskId)
    .eq("couple_id", couple.id)
    .eq("mode", "together")
    .maybeSingle();
  if (taskError) throw taskError;
  if (!task) return { status: 404, body: { error: "shared_task_not_found" } };

  const { data, error } = await sb.rpc("complete_shared_generated_task", {
    p_task_id: taskId,
    p_user_id: userId,
    p_date: appDate(),
  });
  if (error) throw error;

  const result = data ?? {};
  const lang = safeLang(body.lang);
  if (result.state === "waiting_for_partner" && result.already_confirmed !== true) {
    const partnerId = couple.user_a_id === userId ? couple.user_b_id : couple.user_a_id;
    const url = appUrlWith({ shared_task: taskId });
    result.partnerNotified = await sendBotMessage(couple.id, partnerId, lang, "task_waiting", url);
  } else if (result.state === "completed" && result.already_completed !== true) {
    const url = appUrlWith({});
    const [aNotified, bNotified] = await Promise.all([
      sendBotMessage(couple.id, couple.user_a_id, lang, "task_done", url),
      sendBotMessage(couple.id, couple.user_b_id, lang, "task_done", url),
    ]);
    result.notificationsSent = Number(aNotified) + Number(bNotified);
  }

  return { status: 200, body: result };
}

async function handleCompleteScenario(couple: Couple, userId: number, body: Record<string, unknown>) {
  const sessionId = String(body.session_id ?? "");
  if (!UUID.test(sessionId)) return { status: 400, body: { error: "invalid_session_id" } };
  const { data: session, error: sessionError } = await sb
    .from("scenario_sessions")
    .select("id,couple_id,pulled_by")
    .eq("id", sessionId)
    .eq("couple_id", couple.id)
    .maybeSingle();
  if (sessionError) throw sessionError;
  if (!session) return { status: 404, body: { error: "scenario_not_found" } };

  const { data, error } = await sb.rpc("complete_shared_scenario", {
    p_session_id: sessionId,
    p_user_id: userId,
    p_date: appDate(),
  });
  if (error) throw error;
  const result = data ?? {};
  const lang = safeLang(body.lang);

  if (result.state === "waiting_for_partner" && result.already_confirmed !== true) {
    const url = appUrlWith({ scenario: sessionId, role: String(result.partnerRole ?? "b") });
    result.partnerNotified = await sendBotMessage(couple.id, Number(result.partnerId), lang, "scenario_waiting", url);
  } else if (result.state === "completed" && result.already_completed !== true) {
    const url = appUrlWith({ scenario: sessionId, role: "a" });
    const [aNotified, bNotified] = await Promise.all([
      sendBotMessage(couple.id, couple.user_a_id, lang, "scenario_done", url),
      sendBotMessage(couple.id, couple.user_b_id, lang, "scenario_done", url),
    ]);
    result.notificationsSent = Number(aNotified) + Number(bNotified);
  }

  return { status: 200, body: result };
}

async function handleSubmitScenarioFeedback(couple: Couple, userId: number, body: Record<string, unknown>) {
  const sessionId = String(body.session_id ?? "");
  if (!UUID.test(sessionId)) return { status: 400, body: { error: "invalid_session_id" } };

  const skip = body.skip === true;
  const hasRating = body.rating !== undefined && body.rating !== null;
  const rating = hasRating && typeof body.rating === "number" ? body.rating : null;
  if (skip ? hasRating : !Number.isInteger(rating) || (rating as number) < 1 || (rating as number) > 5) {
    return { status: 400, body: { error: "invalid_scenario_feedback" } };
  }

  const { data: session, error: sessionError } = await sb
    .from("scenario_sessions")
    .select("id,couple_id,completed_at,resonance_eligible")
    .eq("id", sessionId)
    .eq("couple_id", couple.id)
    .maybeSingle();
  if (sessionError) throw sessionError;
  if (!session) return { status: 404, body: { error: "scenario_not_found" } };
  if (!session.resonance_eligible || !session.completed_at) {
    return { status: 409, body: { error: "scenario_feedback_not_available" } };
  }

  const { data, error } = await sb.rpc("submit_scenario_resonance", {
    p_session_id: sessionId,
    p_user_id: userId,
    p_rating: skip ? null : rating,
    p_skip: skip,
    p_date: appDate(),
  });
  if (error) throw error;
  return { status: 200, body: data ?? { ok: true } };
}

async function handleGetScenario(couple: Couple, userId: number, sessionId: string) {
  if (!UUID.test(sessionId)) return { status: 400, body: { error: "invalid_session_id" } };
  const { data: session, error } = await sb
    .from("scenario_sessions")
    .select("id,pulled_by,status_a,status_b,completed_at,resonance_eligible,resonance_feedback_processed_at")
    .eq("id", sessionId)
    .eq("couple_id", couple.id)
    .maybeSingle();
  if (error) throw error;
  if (!session) return { status: 404, body: { error: "scenario_not_found" } };

  const { data: ownFeedback, error: feedbackError } = await sb
    .from("scenario_resonance_feedback")
    .select("session_id")
    .eq("session_id", sessionId)
    .eq("user_id", userId)
    .maybeSingle();
  if (feedbackError) throw feedbackError;

  const isRoleA = Number(session.pulled_by) === userId;
  const myCompleted = (isRoleA ? session.status_a : session.status_b) === "completed";
  const partnerCompleted = (isRoleA ? session.status_b : session.status_a) === "completed";
  const state = session.completed_at
    ? "completed"
    : myCompleted
      ? "waiting_for_partner"
      : partnerCompleted
        ? "your_turn"
        : "ready";
  return {
    status: 200,
    body: {
      ok: true,
      sessionId,
      state,
      myCompleted,
      partnerCompleted,
      completedAt: session.completed_at,
      feedbackEnabled: session.resonance_eligible === true,
      myFeedbackSubmitted: !!ownFeedback,
      feedbackResolved: !!session.resonance_feedback_processed_at,
    },
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-telegram-init-data");
  if (req.method === "OPTIONS") return res.status(204).end();

  const user = validateTelegramInitData(req.headers["x-telegram-init-data"] as string, BOT);
  if (!user) return res.status(401).json({ error: "unauthorized" });

  try {
    const couple = await getCouple(user.id);
    if (!couple) return res.status(404).json({ error: "no_couple" });
    const action = String(req.query.action ?? "");

    if (req.method === "GET") {
      if (action === "preferences") {
        return res.status(200).json(await handleGetPreferences(couple, user.id));
      }
      if (action === "stats") {
        const stats = await handleStats(couple, user.id);
        return stats ? res.status(200).json(stats) : res.status(404).json({ error: "not_found" });
      }
      if (action === "history") return res.status(200).json(await handleHistory(couple.id));
      if (action === "task") {
        const taskId = String(req.query.task_id ?? "");
        if (!UUID.test(taskId)) return res.status(400).json({ error: "invalid_task_id" });
        const task = await getSharedTask(couple, user.id, taskId);
        return task ? res.status(200).json({ ok: true, coupleId: couple.id, task }) : res.status(404).json({ error: "shared_task_not_found" });
      }
      if (action === "scenario") {
        const sessionId = String(req.query.session_id ?? "");
        const result = await handleGetScenario(couple, user.id, sessionId);
        return res.status(result.status).json(result.body);
      }
      if (action === "tasks") return res.status(410).json({ error: "daily_tasks_deprecated" });
      return res.status(400).json({ error: "unknown_action" });
    }

    if (req.method === "POST" && action === "complete") {
      const result = await handleCompleteTask(couple, user.id, req.body ?? {});
      return res.status(result.status).json(result.body);
    }
    if (req.method === "POST" && action === "preferences") {
      const result = await handleUpdatePreferences(couple, user.id, req.body ?? {});
      return res.status(result.status).json(result.body);
    }
    if (req.method === "POST" && action === "complete_scenario") {
      const result = await handleCompleteScenario(couple, user.id, req.body ?? {});
      return res.status(result.status).json(result.body);
    }
    if (req.method === "POST" && action === "scenario_feedback") {
      const result = await handleSubmitScenarioFeedback(couple, user.id, req.body ?? {});
      return res.status(result.status).json(result.body);
    }
    return res.status(405).json({ error: "method_not_allowed" });
  } catch (error) {
    console.error("Couple intimacy request failed:", error);
    return res.status(500).json({ error: "couple_intimacy_failed" });
  }
}
