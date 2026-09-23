import type { VercelRequest, VercelResponse } from "@vercel/node";

// Patreon webhooks are intentionally disabled until a raw-body signature
// verifier and a user-account mapping are configured.
export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });
  return res.status(410).json({ error: "patreon_webhook_disabled" });
}