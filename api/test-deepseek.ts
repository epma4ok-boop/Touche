import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  
  if (!apiKey) {
    return res.status(500).json({ error: "No DEEPSEEK_API_KEY in env" });
  }

  try {
    const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [{ role: "user", content: "Say hello" }],
        max_tokens: 20
      })
    });

    const data = await response.json();
    
    return res.status(200).json({
      ok: response.ok,
      status: response.status,
      data: data
    });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
}
