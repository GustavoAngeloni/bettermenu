"use server";

import { redirect } from "next/navigation";
import { homeFor, staffEmail } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export async function login(_prev: string | null, form: FormData): Promise<string | null> {
  const restaurant = String(form.get("restaurant") ?? "").trim();
  const username = String(form.get("username") ?? "").trim();
  const password = String(form.get("password") ?? "");

  // Super admin entra com email; a equipe entra com código do restaurante + usuário.
  const isEmail = username.includes("@");
  if (!isEmail && !restaurant) return "Informe o código do restaurante";
  if (!username || !password) return "Preencha usuário e senha";

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: isEmail ? username : staffEmail(restaurant, username),
    password,
  });
  if (error || !data.user) return "Usuário ou senha incorretos";

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", data.user.id).single<Profile>();
  if (!profile || !profile.active) {
    await supabase.auth.signOut();
    return "Usuário desativado";
  }
  if (profile.restaurant_id) {
    const { data: restaurant } = await supabase.from("restaurants").select("active").eq("id", profile.restaurant_id).single();
    if (!restaurant?.active) {
      await supabase.auth.signOut();
      return "Este restaurante está desativado. Fale com o suporte do Better Menu.";
    }
  }
  redirect(homeFor(profile));
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
