// api/couple/_auth.ts
import { createHmac } from "crypto";

export interface TelegramUser {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
}

export function validateTelegramInitData(
  initData: string | undefined,
  botToken: string
): TelegramUser | null {
  if (!initData) return null;
  
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get("hash");
    if (!hash) return null;
    
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
      
    if (expectedHash !== hash) return null;
    
    const userStr = params.get("user");
    if (!userStr) return null;
    
    return JSON.parse(userStr) as TelegramUser;
  } catch (error) {
    console.error("Auth validation error:", error);
    return null;
  }
}
