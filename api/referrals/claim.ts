import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { validateTelegramInitData } from "../couple/_auth.js";
import { claimFriendInvite } from "./_claim.js";

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });
  const initData = req.headers["x-telegram-init-data"] as string | undefined;
  const invitee = validateTelegramInitData(initData, process.env.BOT_TOKEN);
  if (!invitee) return res.status(401).json({ error: "unauthorized" });

  try {
    const result = await claimFriendInvite(supabase, initData!, invitee.id);
    if (!result.invited) return res.status(400).json({ error: "invalid_invitation" });
    return res.status(200).json({ ok: true, claimed: result.claimed });
  } catch {
    return res.status(500).json({ error: "referral_claim_failed" });
  }
}