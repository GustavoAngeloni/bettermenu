import "server-only";
import crypto from "node:crypto";
import { createAdminClient } from "./supabase/server";

// Links de uso único para criar/redefinir senha. Guardamos só o hash; o token vai no e-mail.

const hash = (raw: string) => crypto.createHash("sha256").update(raw).digest("hex");

export async function createPasswordToken(profileId: string, purpose: "reset" | "invite", minutes: number) {
  const raw = crypto.randomBytes(32).toString("base64url");
  const db = createAdminClient();
  // um link de redefinição por vez: os anteriores deixam de valer
  await db.from("password_tokens").update({ used_at: new Date().toISOString() }).eq("profile_id", profileId).eq("purpose", purpose).is("used_at", null);
  const { error } = await db.from("password_tokens").insert({
    profile_id: profileId,
    token_hash: hash(raw),
    purpose,
    expires_at: new Date(Date.now() + minutes * 60_000).toISOString(),
  });
  return error ? null : raw;
}

/** Token válido (não usado, dentro do prazo)? Devolve o registro sem consumir. */
export async function peekPasswordToken(raw: string) {
  if (!raw || raw.length < 20) return null;
  const { data } = await createAdminClient().from("password_tokens").select("*").eq("token_hash", hash(raw)).maybeSingle();
  if (!data || data.used_at || new Date(data.expires_at).getTime() < Date.now()) return null;
  return data as { id: string; profile_id: string; purpose: "reset" | "invite"; expires_at: string };
}

export async function consumePasswordToken(id: string) {
  await createAdminClient().from("password_tokens").update({ used_at: new Date().toISOString() }).eq("id", id);
}
