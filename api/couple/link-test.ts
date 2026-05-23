import type { VercelRequest, VercelResponse } from "@vercel/node";

export default function handler(req: VercelRequest, res: VercelResponse) {
  console.log("🔵 /api/couple/link-test called");
  res.status(200).json({ ok: true, message: "link-test works" });
}
