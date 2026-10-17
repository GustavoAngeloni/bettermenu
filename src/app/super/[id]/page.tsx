import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSuperadmin } from "@/lib/auth";
import { storedFeatures } from "@/lib/features";
import { PLANS, planOf } from "@/lib/plans";
import { createAdminClient } from "@/lib/supabase/server";
import type { Profile, Restaurant } from "@/lib/types";
import { ROLE_LABEL } from "@/lib/types";
import { CreateUnitForm, EditRestaurantForm, EnterAsButton, ToggleActive } from "../super-forms";
import { SuperHeader } from "../super-header";

export const metadata = { title: "Restaurante · Super Admin" };

export default async function RestaurantAdminPage({ params }: PageProps<"/super/[id]">) {
  const { profile } = await requireSuperadmin();
  const { id } = await params;
  const db = createAdminClient();
  const [{ data: restaurant }, { data: staff }] = await Promise.all([
    db.from("restaurants").select("*").eq("id", id).maybeSingle<Restaurant>(),
    db.from("profiles").select("*").eq("restaurant_id", id).order("role"),
  ]);
  if (!restaurant) notFound();
  const rootId = restaurant.group_id ?? restaurant.id;
  const { data: groupRows } = await db.from("restaurants").select("id, name, slug, active, group_id").or(`id.eq.${rootId},group_id.eq.${rootId}`).order("created_at");
  const group = (groupRows ?? []) as Pick<Restaurant, "id" | "name" | "slug" | "active" | "group_id">[];
  const plan = PLANS[planOf(restaurant.plan)];

  return (
    <div className="flex-1">
      <SuperHeader name={profile.name} />
      <main className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
        <Link href="/super" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
          <ArrowLeft className="size-4" /> Restaurantes
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight md:text-[2.15rem]">{restaurant.name}</h1>
            <p className="text-sm text-muted">
              Código <code className="rounded bg-stone-100 px-1.5 py-0.5">{restaurant.slug}</code>
              {!restaurant.active && " · desativado"}
            </p>
          </div>
          <div className="flex gap-2">
            <EnterAsButton id={restaurant.id} />
            <ToggleActive id={restaurant.id} active={restaurant.active} />
          </div>
        </div>

        <EditRestaurantForm restaurant={restaurant} features={storedFeatures(restaurant.features)} />

        <section className="rounded-[1.4rem] border border-line bg-surface p-5">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-bold">Unidades do grupo</h2>
            <span className="text-sm text-muted">
              {group.length} de {plan.maxRestaurants} no plano {plan.label}
            </span>
          </div>
          <ul className="mb-4 divide-y divide-line text-sm">
            {group.map((g) => (
              <li key={g.id} className="flex items-center justify-between gap-3 py-2">
                <Link href={`/super/${g.id}`} className={g.id === restaurant.id ? "font-bold" : "hover:underline"}>
                  {g.name}
                </Link>
                <span className="text-muted">
                  <code className="rounded bg-stone-100 px-1.5 py-0.5">{g.slug}</code> · {g.group_id ? "unidade" : "principal"}
                  {!g.active && " · desativada"}
                </span>
              </li>
            ))}
          </ul>
          {group.length < plan.maxRestaurants ? (
            <CreateUnitForm rootId={rootId} />
          ) : (
            <p className="text-sm text-muted">Limite de unidades do plano atingido. Para abrir outra, mude o plano.</p>
          )}
          <p className="mt-3 text-xs text-muted">O dono usa o mesmo login em todas as unidades e troca de unidade no topo do painel. Cada unidade tem mesas, cardápio e equipe próprios.</p>
        </section>

        <section className="rounded-[1.4rem] border border-line bg-surface p-5">
          <h2 className="mb-3 font-bold">Equipe</h2>
          <ul className="divide-y divide-line text-sm">
            {((staff ?? []) as Profile[]).map((p) => (
              <li key={p.id} className="flex justify-between py-2">
                <span>
                  {p.name} <span className="text-muted">· {p.username}</span>
                </span>
                <span className="text-muted">
                  {p.role ? ROLE_LABEL[p.role] : ""}
                  {!p.active && " · desativado"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
