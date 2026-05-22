// api/payments/invoice.ts
// POST /api/payments/invoice
// Creates a Telegram Stars invoice link for buying extra tasks.
//
// Body: { paid: boolean }   — true = 2 Stars (paid category), false = 1 Star
// Headers: x-telegram-init-data
//
// Response: { invoiceLink: string }

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { validateTelegramInitData } from "../couple/_auth";

const BOT_TOKEN = process.env.BOT_TOKEN!;

async function createInvoiceLink(payload: object): Promise<string> {
  const r = await fetch(
    `https://api.telegram.org/bot${BOT_TOKEN}/createInvoiceLink`,
    {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(payload),
    }
  );
  const data = await r.json();
  if (!data.ok) throw new Error(data.description ?? "createInvoiceLink failed");
  return data.result as string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const initData = req.headers["x-telegram-init-data"] as string;
  const caller   = validateTelegramInitData(initData, BOT_TOKEN);
  if (!caller) return res.status(401).json({ error: "Unauthorized" });

  const { paid } = req.body as { paid: boolean };
  const starCount = paid ? 2 : 1;

  try {
    const invoiceLink = await createInvoiceLink({
      title:          "Extra task",
      description:    paid
        ? "One extra task in a paid category (18+)"
        : "One extra task in this category",
      payload:        JSON.stringify({ userId: caller.id, type: paid ? "paid" : "free", stars: starCount }),
      provider_token: "",           // empty string = Telegram Stars
      currency:       "XTR",        // Telegram Stars currency code
      prices:         [{ label: "+1 task", amount: starCount }],
    });
    return res.status(200).json({ invoiceLink });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return res.status(500).json({ error: msg });
  }
}
