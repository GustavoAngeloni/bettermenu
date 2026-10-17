"use server";

import { redirect } from "next/navigation";
import { EMAIL, firstName, sendTemplate } from "@/lib/email";
import { consumePasswordToken, peekPasswordToken } from "@/lib/password-tokens";
import { appUrl } from "@/lib/qr";
import { createAdminClient } from "@/lib/supabase/server";

/** Grava a nova senha a partir do link do e-mail (redefinição ou convite). */
export async function setNewPassword(_prev: string | null, form: FormData): Promise<string | null> {
  const raw = String(form.get("token") ?? "");
  const password = String(form.get("password") ?? "");
  const confirm = String(form.get("confirm") ?? "");
  if (password.length < 6) return "A senha precisa de ao menos 6 caracteres.";
  if (password !== confirm) return "As duas senhas não são iguais.";
  const token = await peekPasswordToken(raw);
  if (!token) return "Este link expirou ou já foi usado. Peça um novo.";

  const db = createAdminClient();
  const { error } = await db.auth.admin.updateUserById(token.profile_id, { password });
  if (error) return "Não foi possível salvar a senha. Tente de novo.";
  await consumePasswordToken(token.id);

  const { data: p } = await db.from("profiles").select("name, username, contact_email, restaurant:restaurants(name, slug)").eq("id", token.profile_id).maybeSingle();
  const profile = p as unknown as { name: string; username: string | null; contact_email: string | null; restaurant: { name: string; slug: string } | null } | null;
  const code = profile?.restaurant?.slug ?? "";
  const user = profile?.username ?? "";
  const base = await appUrl();
  const loginUrl = `${base}/login?codigo=${encodeURIComponent(code)}&usuario=${encodeURIComponent(user)}`;
  if (profile?.contact_email) {
    await sendTemplate(EMAIL.senhaAlterada, profile.contact_email, {
      NOME: firstName(profile.name),
      RESTAURANTE: profile.restaurant?.name ?? "Better Menu",
      CODIGO: code,
      USUARIO: user,
      LINK_LOGIN: loginUrl,
    });
  }
  redirect(`/login?codigo=${encodeURIComponent(code)}&usuario=${encodeURIComponent(user)}&senha=ok`);
}
