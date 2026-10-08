"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { IMPERSONATE_COOKIE, requireSuperadmin } from "@/lib/auth";
import { featuresFromForm } from "@/lib/features";
import { PLANS, type PlanKey } from "@/lib/plans";
import { createStaffUser, slugify } from "@/lib/staff-admin";
import { createAdminClient } from "@/lib/supabase/server";

function readPlan(form: FormData) {
  const plan = String(form.get("plan") ?? "profissional") as PlanKey;
  const validPlan = plan in PLANS ? plan : "profissional";
  const rawMax = String(form.get("max_tables") ?? "").trim();
  const max_tables = rawMax === "" ? PLANS[validPlan].maxTables : Math.max(1, Number.parseInt(rawMax) || 1);
  const paid_until = String(form.get("paid_until") ?? "").trim() || null;
  return { plan: validPlan, max_tables, paid_until };
}

function readFee(form: FormData) {
  const fee = Number.parseFloat(String(form.get("fee") ?? "10").replace(",", "."));
  return Number.isFinite(fee) ? Math.min(Math.max(fee, 0), 30) : 10;
}

export async function createRestaurant(_prev: string | null, form: FormData): Promise<string | null> {
  await requireSuperadmin();
  const name = String(form.get("name") ?? "").trim();
  const slug = slugify(String(form.get("slug") ?? "") || name);
  const { plan, max_tables, paid_until } = readPlan(form);
  let tables = Math.min(Math.max(Number.parseInt(String(form.get("tables") ?? "0")) || 0, 0), 200);
  if (max_tables != null) tables = Math.min(tables, max_tables);
  if (!name) return "Informe o nome do restaurante";
  if (slug.length < 3) return "Código muito curto (mín. 3 caracteres)";

  const db = createAdminClient();
  const { data: exists } = await db.from("restaurants").select("id").eq("slug", slug).maybeSingle();
  if (exists) return `O código "${slug}" já está em uso`;

  const { data: restaurant, error } = await db
    .from("restaurants")
    .insert({ name, slug, service_fee_pct: readFee(form), features: featuresFromForm(form), plan, max_tables, paid_until })
    .select()
    .single();
  if (error || !restaurant) return error?.message ?? "Erro ao criar restaurante";

  const ownerError = await createStaffUser({
    restaurantId: restaurant.id,
    slug,
    name: String(form.get("ownerName") ?? ""),
    username: String(form.get("ownerUsername") ?? ""),
    password: String(form.get("ownerPassword") ?? ""),
    role: "owner",
  });
  if (ownerError) {
    await db.from("restaurants").delete().eq("id", restaurant.id);
    return `Dono: ${ownerError}`;
  }

  // Ponto de partida: estações padrão e as mesas do salão.
  await db.from("stations").insert([
    { restaurant_id: restaurant.id, name: "Cozinha", sort: 0 },
    { restaurant_id: restaurant.id, name: "Bar", sort: 1 },
  ]);
  if (tables > 0) {
    await db.from("tables").insert(Array.from({ length: tables }, (_, i) => ({ restaurant_id: restaurant.id, number: i + 1 })));
  }

  revalidatePath("/super");
  return `ok:${slug}`;
}

export async function updateRestaurant(id: string, _prev: string | null, form: FormData): Promise<string | null> {
  await requireSuperadmin();
  const name = String(form.get("name") ?? "").trim();
  if (!name) return "Informe o nome do restaurante";
  const { plan, max_tables, paid_until } = readPlan(form);
  const db = createAdminClient();

  if (max_tables != null) {
    const { count } = await db.from("tables").select("id", { count: "exact", head: true }).eq("restaurant_id", id).eq("active", true);
    if ((count ?? 0) > max_tables) {
      return `O restaurante tem ${count} mesas ativas, acima do limite de ${max_tables}. Remova mesas ou aumente o limite.`;
    }
  }

  const { error } = await db
    .from("restaurants")
    .update({
      name,
      service_fee_pct: readFee(form),
      features: featuresFromForm(form),
      plan,
      max_tables,
      paid_until,
      notes: String(form.get("notes") ?? "").trim() || null,
    })
    .eq("id", id);
  if (error) return error.message;
  revalidatePath("/super");
  revalidatePath(`/super/${id}`);
  return "ok";
}

export async function setRestaurantActive(id: string, active: boolean) {
  await requireSuperadmin();
  await createAdminClient().from("restaurants").update({ active }).eq("id", id);
  revalidatePath("/super");
  revalidatePath(`/super/${id}`);
}

/** Abre o painel do restaurante como se fosse o dono (suporte). */
export async function enterAs(id: string) {
  await requireSuperadmin();
  (await cookies()).set(IMPERSONATE_COOKIE, id, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 8 });
  redirect("/admin");
}

export async function exitAs() {
  await requireSuperadmin();
  (await cookies()).delete(IMPERSONATE_COOKIE);
  redirect("/super");
}
