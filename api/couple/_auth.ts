// api/couple/_auth.ts
import { createHmac } from "crypto";
import { timingSafeEqual } from "crypto";

export interface TelegramUser {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
}

export const TELEGRAM_AUTH_MAX_AGE_SECONDS = Math.max(
  60,
  Number(process.env.TELEGRAM_AUTH_MAX_AGE_SECONDS ?? 86_400) || 86_400,
);

export function validateTelegramInitData(
  initData: string | undefined,
  botToken: string | undefined,
): TelegramUser | null {
  if (!initData || !botToken) return null;
  
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get("hash");
    if (!hash || !/^[a-f0-9]{64}$/i.test(hash)) return null;
    
    params.delete("hash");
    
    const dataCheckString = [...params.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join("\n");
      
    const secretKey = createHmac("sha256", "WebAppData")
      .update(botToken)
      .digest();
      
    const expectedHash = createHmac("sha256", secretKey)
      .update(dataCheckString)
      .digest("hex");
      
    const expected = Buffer.from(expectedHash, "hex");
    const received = Buffer.from(hash, "hex");
    if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;

    const authDate = Number(params.get("auth_date"));
    if (!Number.isSafeInteger(authDate) || authDate <= 0) return null;
    if (Math.abs(Math.floor(Date.now() / 1000) - authDate) > TELEGRAM_AUTH_MAX_AGE_SECONDS) return null;
    
    const userStr = params.get("user");
    if (!userStr) return null;
    
    const user = JSON.parse(userStr) as TelegramUser;
    if (!user || !Number.isSafeInteger(user.id) || user.id <= 0) return null;
    return user;
  } catch (error) {
    console.error("Auth validation error:", error);
    return null;
  }
}
