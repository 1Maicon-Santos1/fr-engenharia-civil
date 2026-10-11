import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const cookieName = "fr_admin";
const secret = () => process.env.ADMIN_SESSION_SECRET || "configure-a-chave-de-sessao-na-vercel";
const sign = (value: string) => createHmac("sha256", secret()).update(value).digest("hex");

export async function createSession() { const value = "fr-admin"; (await cookies()).set(cookieName, `${value}.${sign(value)}`, {httpOnly:true,secure:process.env.NODE_ENV === "production",sameSite:"lax",maxAge:60*60*12,path:"/"}); }
export async function clearSession() { (await cookies()).delete(cookieName); }
export async function isAdmin() { const raw=(await cookies()).get(cookieName)?.value; if(!raw) return false; const [value,signature]=raw.split("."); if(!value||!signature) return false; const expected=sign(value); return signature.length===expected.length && timingSafeEqual(Buffer.from(signature),Buffer.from(expected)); }
