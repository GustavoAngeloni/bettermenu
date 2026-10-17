"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { IMPERSONATE_COOKIE, requireSuperadmin } from "@/lib/auth";
import { featuresFromForm } from "@/lib/features";
import { PLANS, planOf } from "@/lib/plans";
import { provisionRestaurant } from "@/lib/provision";
import { slugify } from "@/lib/staff-admin";
import { createAdminClient } from "@/lib/supabase/server";

/** Limite vindo do formulário; vazio = o limite do plano ("0" ou "-" = ilimitado). */
function readLimit(form: FormData, field: string, fallback: number | null) {
  const raw = String(form.get(field) ?? "").trim();
  if (raw === "") return fallback;
  if (raw === "-" || raw === "0") return null;
  return Math.max(1, Number.parseInt(raw) || 1);
}

function readPlan(form: FormData) {
  const plan = planOf(String(form.get("plan") ?? ""));
  return {
    plan,
    max_tables: readLimit(form, "max_tables", PLANS[plan].maxTables),
    max_stations: readLimit(form, "max_stations", PLANS[plan].maxStations),
    paid_until: String(form.get("paid_until") ?? "").trim() || null,
  };
}

/** Restaurante principal do grupo (ele mesmo, se for independente). */
const groupRoot = (r: { id: string; group_id?: string | null }) => r.group_id ?? r.id;

/** Estações iniciais: Cozinha e Bar, ou só Cozinha quando o plano permite uma. */
async function seedStations(restaurantId: string, maxStations: number | null) {
  const list = maxStations === 1 ? [{ name: "Cozinha", sort: 0 }] : [{ name: "Cozinha", sort: 0 }, { name: "Bar", sort: 1 }];
  await createAdminClient().from("stations").insert(list.map((s) => ({ ...s, restaurant_id: restaurantId })));
}

function readFee(form: FormData) {
  const fee = Number.parseFloat(String(form.get("fee") ?? "10").replace(",", "."));
  return Number.isFinite(fee) ? Math.min(Math.max(fee, 0), 30) : 10;
}

export async function createRestaurant(_prev: string | null, form: FormData): Promise<string | null> {
  await requireSuperadmin();
  const name = String(form.get("name") ?? "").trim();
  const slug = slugify(String(form.get("slug") ?? "") || name);
  const { plan, max_tables, max_stations, paid_until } = readPlan(form);
  let tables = Math.min(Math.max(Number.parseInt(String(form.get("tables") ?? "0")) || 0, 0), 200);
  if (max_tables != null) tables = Math.min(tables, max_tables);
  if (!name) return "Informe o nome do restaurante";
  if (slug.length < 3) return "Código muito curto (mín. 3 caracteres)";

  const db = createAdminClient();
  const { data: exists } = await db.from("restaurants").select("id").eq("slug", slug).maybeSingle();
  if (exists) return `O código "${slug}" já está em uso`;

  const result = await provisionRestaurant({
    name,
    slug,
    plan,
    ownerName: String(form.get("ownerName") ?? ""),
    ownerUsername: String(form.get("ownerUsername") ?? ""),
    ownerPassword: String(form.get("ownerPassword") ?? ""),
    tables,
    serviceFeePct: readFee(form),
    features: featuresFromForm(form),
    maxTables: max_tables,
    maxStations: max_stations,
    paidUntil: paid_until,
  });
  if (!result.ok) return result.error;

  revalidatePath("/super");
  return `ok:${slug}`;
}

export async function updateRestaurant(id: string, _prev: string | null, form: FormData): Promise<string | null> {
  await requireSuperadmin();
  const name = String(form.get("name") ?? "").trim();
  if (!name) return "Informe o nome do restaurante";
  const { plan, max_tables, max_stations, paid_until } = readPlan(form);
  const db = createAdminClient();

  const { data: current } = await db.from("restaurants").select("id, group_id").eq("id", id).single();
  if (!current) return "Restaurante não encontrado";
  // Plano e funções valem para o grupo inteiro (principal + unidades).
  const { data: group } = await db.from("restaurants").select("id").or(`id.eq.${groupRoot(current)},group_id.eq.${groupRoot(current)}`);
  const ids = ((group ?? []) as { id: string }[]).map((r) => r.id);

  if (ids.length > PLANS[plan].maxRestaurants) {
    return `O grupo tem ${ids.length} unidades, acima do limite do plano ${PLANS[plan].label} (${PLANS[plan].maxRestaurants}). Desative unidades ou escolha outro plano.`;
  }
  for (const rid of ids) {
    if (max_tables != null) {
      const { count } = await db.from("tables").select("id", { count: "exact", head: true }).eq("restaurant_id", rid).eq("active", true);
      if ((count ?? 0) > max_tables) return `Uma unidade tem ${count} mesas ativas, acima do limite de ${max_tables}. Remova mesas ou aumente o limite.`;
    }
    if (max_stations != null) {
      const { count } = await db.from("stations").select("id", { count: "exact", head: true }).eq("restaurant_id", rid);
      if ((count ?? 0) > max_stations) return `Uma unidade tem ${count} estações, acima do limite de ${max_stations}. Remova estações em Cardápio ou aumente o limite.`;
    }
  }

  const shared = { features: featuresFromForm(form), plan, max_tables, max_stations, paid_until };
  const { error } = await db
    .from("restaurants")
    .update({ ...shared, name, service_fee_pct: readFee(form), notes: String(form.get("notes") ?? "").trim() || null })
    .eq("id", id);
  if (error) return error.message;
  const others = ids.filter((rid) => rid !== id);
  if (others.length) await db.from("restaurants").update(shared).in("id", others);
  revalidatePath("/super");
  revalidatePath(`/super/${id}`);
  return "ok";
}

/** Nova unidade do mesmo dono: herda plano, funções e limites; o dono troca de unidade no painel. */
export async function createUnit(rootId: string, _prev: string | null, form: FormData): Promise<string | null> {
  await requireSuperadmin();
  const db = createAdminClient();
  const { data: root } = await db.from("restaurants").select("*").eq("id", rootId).single();
  if (!root) return "Restaurante principal não encontrado";
  if (root.group_id) return "Crie unidades a partir do restaurante principal";
  const plan = planOf(root.plan);
  const { count } = await db.from("restaurants").select("id", { count: "exact", head: true }).or(`id.eq.${root.id},group_id.eq.${root.id}`);
  if ((count ?? 1) >= PLANS[plan].maxRestaurants) {
    return `O plano ${PLANS[plan].label} permite ${PLANS[plan].maxRestaurants} restaurante(s). Mude o plano para abrir outra unidade.`;
  }

  const name = String(form.get("name") ?? "").trim();
  const slug = slugify(String(form.get("slug") ?? "") || name);
  if (!name) return "Informe o nome da unidade";
  if (slug.length < 3) return "Código muito curto (mín. 3 caracteres)";
  const { data: exists } = await db.from("restaurants").select("id").eq("slug", slug).maybeSingle();
  if (exists) return `O código "${slug}" já está em uso`;

  const { data: unit, error } = await db
    .from("restaurants")
    .insert({
      name,
      slug,
      group_id: root.id,
      service_fee_pct: root.service_fee_pct,
      features: root.features,
      plan: root.plan,
      max_tables: root.max_tables,
      max_stations: root.max_stations,
      paid_until: root.paid_until,
      branding: root.branding,
      logo_url: root.logo_url,
    })
    .select()
    .single();
  if (error || !unit) return error?.message ?? "Erro ao criar unidade";

  await seedStations(unit.id, root.max_stations ?? null);
  let tables = Math.min(Math.max(Number.parseInt(String(form.get("tables") ?? "0")) || 0, 0), 200);
  if (root.max_tables != null) tables = Math.min(tables, root.max_tables);
  if (tables > 0) await db.from("tables").insert(Array.from({ length: tables }, (_, i) => ({ restaurant_id: unit.id, number: i + 1 })));

  revalidatePath("/super");
  revalidatePath(`/super/${rootId}`);
  return `ok:${slug}`;
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
