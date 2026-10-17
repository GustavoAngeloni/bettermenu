"use server";

import { getStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";

/** Marca as novidades como vistas (o aviso some do menu). */
export async function markLearningSeen() {
  const staff = await getStaff();
  if (!staff || staff.impersonating) return;
  await createAdminClient().from("profiles").update({ learning_seen_at: new Date().toISOString() }).eq("id", staff.profile.id);
}
