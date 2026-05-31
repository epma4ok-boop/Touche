import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { data } = req.body;
  const email = data?.attributes?.email;
  const tierName = data?.attributes?.currently_entitled_tiers?.[0]?.title;

  if (!email) return res.status(400).json({ error: 'No email' });

  let tier = 'none';
  let bonusRemaining = 0;

  if (tierName === 'Premium Access') {
    tier = 'premium';
    bonusRemaining = 0; // unlimited будет работать через безлимитную логику
  } else if (tierName === 'Unlimited') {
    tier = 'unlimited';
    bonusRemaining = 999;
  }

  await supabase.from('subscriptions').upsert({
    email,
    tier,
    bonus_remaining: bonusRemaining,
    status: 'active',
    updated_at: new Date().toISOString(),
  });

  return res.status(200).json({ ok: true });
}
