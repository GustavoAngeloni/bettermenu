"use server";

import { headers } from "next/headers";
import { EMAIL, firstName, sendTemplate } from "@/lib/email";
import { createPasswordToken } from "@/lib/password-tokens";
import { appUrl } from "@/lib/qr";
import { normalizeUsername } from "@/lib/staff-admin";
import { createAdminClient } from "@/lib/supabase/server";

const hits = new Map<string, number[]>();
function limited(key: string) {
  const now = Date.now();
  const list = (hits.get(key) ?? []).filter((t) => now - t < 15 * 60_000);
  list.push(now);
  hits.set(key, list);
  return list.length > 5;
}

interface Target {
  id: string;
  name: string;
  username: string | null;
  contact_email: string | null;
  restaurant: { name: string; slug: string } | null;
}

/**
 * Pede o link de redefinição. A resposta é sempre a mesma (não revela se a conta existe).
 * Busca por código do restaurante + usuário, ou pelo e-mail de contato.
 */
export async function requestPasswordReset(_prev: string | null, form: FormData): Promise<string> {
  const ok = "ok";
  const code = String(form.get("codigo") ?? "").trim().toLowerCase();
  const who = String(form.get("usuario") ?? "").trim();
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (limited(ip) || !who) return ok;

  const db = createAdminClient();
  let targets: Target[] = [];
  if (who.includes("@") && !code) {
    const { data } = await db.from("profiles").select("id, name, username, contact_email, restaurant:restaurants(name, slug)").eq("contact_email", who.toLowerCase()).eq("active", true).limit(3);
    targets = (data ?? []) as unknown as Target[];
  } else if (code) {
    const username = normalizeUsername(who);
    const { data: r } = await db.from("restaurants").select("id").eq("slug", code).maybeSingle();
    if (r) {
      const { data } = await db.from("profiles").select("id, name, username, contact_email, restaurant:restaurants(name, slug)").eq("restaurant_id", r.id).eq("username", username).eq("active", true).maybeSingle();
      if (data) targets = [data as unknown as Target];
    }
  }

  const base = await appUrl();
  for (const t of targets) {
    if (!t.contact_email) continue; // sem e-mail cadastrado: o dono gera a nova senha em Equipe
    const token = await createPasswordToken(t.id, "reset", 60);
    if (!token) continue;
    await sendTemplate(EMAIL.redefinirSenha, t.contact_email, {
      NOME: firstName(t.name),
      RESTAURANTE: t.restaurant?.name ?? "Better Menu",
      USUARIO: t.username ?? "",
      LINK: `${base}/redefinir-senha?token=${token}`,
      VALIDADE: "1 hora",
    });
  }
  return ok;
}
