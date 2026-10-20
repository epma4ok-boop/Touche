import { createClient } from "@supabase/supabase-js";
import { appDate } from "../limits.js";

const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
type Pair = { id: string; user_a_id: number; user_b_id: number };
type LovePathState =
  | { started: false }
  | {
      started: true;
      gameId: string;
      moveCount: number;
      selfUserId: number;
      partnerUserId: number;
      nextActorUserId: number | null;
      canChoose: boolean;
      moves: { day: number; actorUserId: number; cardId: string | null; date: string }[];
      todayMove: { day: number; actorUserId: number; cardId: string | null } | null;
      finale: { myChoice: string | null; partnerHasChosen: boolean; matched: boolean; sharedChoice: string | null };
    };

async function state(pair: Pair, userId: number, create = false): Promise<LovePathState> {
  if (create) {
    const { error } = await sb.from("love_path_games").upsert(
      { couple_id: pair.id, starter_user_id: userId }, { onConflict: "couple_id", ignoreDuplicates: true },
    );
    if (error) throw error;
  }
  const { data: game, error: gameError } = await sb.from("love_path_games")
    .select("id,starter_user_id").eq("couple_id", pair.id).maybeSingle();
  if (gameError) throw gameError;
  if (!game) return { started: false };
  const { data: moves, error: moveError } = await sb.from("love_path_moves")
    .select("day_no,game_date,actor_user_id,card_id").eq("game_id", game.id).order("day_no");
  if (moveError) throw moveError;
  const list = moves ?? [];
  const count = list.length;
  const last = list[count - 1];
  const partnerId = Number(pair.user_a_id) === userId ? Number(pair.user_b_id) : Number(pair.user_a_id);
  const nextActor = last
    ? (Number(last.actor_user_id) === userId ? partnerId : userId)
    : Number(game.starter_user_id);
  const todayMove = list.find((move) => move.game_date === appDate()) ?? null;
  const { data: choices, error: choiceError } = await sb.from("love_path_final_choices")
    .select("user_id,choice_id").eq("game_id", game.id);
  if (choiceError) throw choiceError;
  const mine = choices?.find((row) => Number(row.user_id) === userId)?.choice_id ?? null;
  const partner = choices?.find((row) => Number(row.user_id) === partnerId)?.choice_id ?? null;
  const matched = count >= 7 && !!mine && mine === partner;
  return {
    started: true, gameId: game.id as string, moveCount: count, selfUserId: userId, partnerUserId: partnerId,
    nextActorUserId: count >= 7 ? null : nextActor,
    canChoose: count < 7 && !todayMove && nextActor === userId,
    moves: list.map((move) => ({
      day: Number(move.day_no),
      actorUserId: Number(move.actor_user_id),
      cardId: move.game_date === appDate() && Number(move.actor_user_id) !== userId ? null : move.card_id,
      date: move.game_date,
    })),
    todayMove: todayMove
      ? { day: Number(todayMove.day_no), actorUserId: Number(todayMove.actor_user_id), cardId: Number(todayMove.actor_user_id) === userId ? todayMove.card_id : null }
      : null,
    finale: { myChoice: mine, partnerHasChosen: !!partner, matched, sharedChoice: matched ? mine : null },
  };
}

export async function handleLovePath(pair: Pair, userId: number, method: string, body: Record<string, unknown> = {}) {
  if (method === "GET") return { status: 200, body: await state(pair, userId) };
  if (body.action === "start") return { status: 200, body: await state(pair, userId, true) };
  const current = await state(pair, userId);
  if (!current.started) return { status: 409, body: { error: "game_not_started" } };
  if (body.action === "move") {
    const day = Number(current.moveCount) + 1;
    const cardId = String(body.cardId ?? "");
    if (!current.canChoose) return { status: 409, body: { error: "not_your_turn_or_already_moved" } };
    if (day > 7 || !new RegExp(`^d${day}-c[1-3]$`).test(cardId)) return { status: 400, body: { error: "invalid_card" } };
    const { error } = await sb.from("love_path_moves").insert({
      game_id: current.gameId, couple_id: pair.id, day_no: day, game_date: appDate(), actor_user_id: userId, card_id: cardId,
    });
    if (error?.code === "23505") return { status: 409, body: { error: "daily_move_already_taken" } };
    if (error) throw error;
    return { status: 200, body: await state(pair, userId) };
  }
  if (body.action === "final") {
    const choiceId = String(body.choiceId ?? "");
    if (Number(current.moveCount) < 7) return { status: 409, body: { error: "finale_locked" } };
    if (!/^f[1-3]$/.test(choiceId)) return { status: 400, body: { error: "invalid_choice" } };
    const { error } = await sb.from("love_path_final_choices").upsert({
      game_id: current.gameId, couple_id: pair.id, user_id: userId, choice_id: choiceId,
    }, { onConflict: "game_id,user_id" });
    if (error) throw error;
    return { status: 200, body: await state(pair, userId) };
  }
  return { status: 400, body: { error: "invalid_action" } };
}
