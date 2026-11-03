export type StripPlayer = { layersRemoved: number; finalCompleted?: number };
export type StripTurn = 0 | 1;
export const RPS_CHOICES = ["Камень", "Бумага", "Ножницы"] as const;
export const BODY_CHOICES = ["Рука", "Нога", "Голова", "Женские гениталии", "Мужские гениталии", "Попа", "Спина", "Грудь"] as const;
export type RpsChoice = typeof RPS_CHOICES[number];
export type MiniRound = {
  kind: "number" | "body" | "gesture" | "final";
  target: string;
  revealed: boolean;
  choice: RpsChoice | null;
};

export function rpsOutcome(choice: RpsChoice, target: RpsChoice): "win" | "tie" | "loss" {
  if (choice === target) return "tie";
  const beats: Record<RpsChoice, RpsChoice> = { Камень: "Ножницы", Бумага: "Камень", Ножницы: "Бумага" };
  return beats[choice] === target ? "win" : "loss";
}

export function createMiniRound(cardId: string, random = Math.random): MiniRound | null {
  const kind = cardId === "l2-number" ? "number" : cardId === "l3-guess" ? "body"
    : cardId === "l2-rps" ? "gesture" : cardId === "l5-rps" ? "final" : null;
  if (!kind) return null;
  const choices: readonly string[] = kind === "number" ? Array.from({ length: 10 }, (_, i) => String(i + 1))
    : kind === "body" ? BODY_CHOICES : RPS_CHOICES;
  return { kind, target: choices[Math.min(choices.length - 1, Math.floor(random() * choices.length))], revealed: false, choice: null };
}

export function validMiniRound(value: unknown, cardId: string): value is MiniRound {
  if (!value || typeof value !== "object") return false;
  const item = value as MiniRound;
  const expected = createMiniRound(cardId, () => 0);
  if (!expected || expected.kind !== item.kind || typeof item.revealed !== "boolean") return false;
  const choices: readonly string[] = item.kind === "number" ? Array.from({ length: 10 }, (_, i) => String(i + 1))
    : item.kind === "body" ? BODY_CHOICES : RPS_CHOICES;
  return choices.includes(item.target) && (item.choice === null || RPS_CHOICES.includes(item.choice))
    && !(item.kind === "final" && item.revealed && item.choice === null);
}

/** Underwear is stage 4. Removing stage 5 ends the original game. */
export function applyStripOutcome(players: [StripPlayer, StripPlayer], current: StripTurn, completed: boolean, finalRound = false) {
  const next: [StripPlayer, StripPlayer] = players.map(player => ({ ...player })) as [StripPlayer, StripPlayer];
  const other: StripTurn = current === 0 ? 1 : 0;
  const player = next[current];
  if (completed) {
    player.finalCompleted = finalRound ? 0 : player.layersRemoved === 4 ? Math.min(5, (player.finalCompleted ?? 0) + 1) : 0;
  } else {
    player.layersRemoved = Math.min(5, player.layersRemoved + 1);
    player.finalCompleted = 0;
  }
  const finished = player.layersRemoved === 5;
  const needsFinal = !finished && completed && !finalRound && player.layersRemoved === 4 && player.finalCompleted === 5;
  return { players: next, turn: needsFinal ? current : other, finished, needsFinal, winner: finished ? other : null };
}
