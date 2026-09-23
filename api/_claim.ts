import type { SupabaseClient } from "@supabase/supabase-js";

// Call only after validateTelegramInitData: start_param is signed by Telegram.
export async function claimFriendInvite(supabase: SupabaseClient, initData: string, inviteeId: number) {
  const startParam = new URLSearchParams(initData).get("start_param") ?? "";
  if (!startParam.startsWith("invite_")) return { invited: false, claimed: false };
  const match = /^invite_([1-9][0-9]*)$/.exec(startParam);
  const inviterId = match ? Number(match[1]) : NaN;
  if (!Number.isSafeInteger(inviterId) || inviterId === inviteeId) {
    return { invited: true, claimed: false };
  }
  const { data, error } = await supabase.rpc("claim_friend_referral", {
    p_invitee_id: inviteeId, p_inviter_id: inviterId,
  });
  if (error) throw error;
  return { invited: true, claimed: data?.claimed === true };
}