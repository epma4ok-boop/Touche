import type { Category } from "./i18n";

export type SharedPairState = "ready" | "waiting_for_partner" | "your_turn" | "completed";

export interface SharedTaskSnapshot {
  taskId: string;
  coupleId: string;
  category: Category;
  task: string;
  source?: "ai" | "fallback";
  createdAt: string;
  completedAt: string | null;
  myCompleted: boolean;
  partnerCompleted: boolean;
  partnerId?: number;
  state: SharedPairState;
}
