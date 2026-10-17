import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { PlanCard } from "@/components/plan-card";
import { appUrl } from "@/lib/qr";
import { createClient } from "@/lib/supabase/server";
import { listUnits } from "@/lib/units";
import { SubscriptionCard, type SubscriptionView } from "./subscription-card";
import { SettingsForm } from "./settings-form";

export const metadata = { title: "Configurações" };

export default async function SettingsPage() {
  const { restaurant, profile, features } = await requireStaff(["manager"]);
  if (profile.role !== "owner") redirect("/admin");
  const publicUrl = features.public_page ? `${await appUrl()}/r/${restaurant.slug}` : null;
  const units = await listUnits(restaurant);
  const { data: subs } = await (await createClient())
    .from("subscriptions")
    .select("id, plan, cycle, amount_cents, status, next_payment_date, payer_email")
    .eq("restaurant_id", restaurant.id)
    .order("created_at", { ascending: false })
    .limit(5);
  const list = (subs ?? []) as SubscriptionView[];
  const sub = list.find((s) => s.status === "authorized") ?? list.find((s) => s.status !== "failed") ?? null;
  return (
    <div className="max-w-2xl space-y-6">
      <SettingsForm restaurant={restaurant} publicUrl={publicUrl} />
      <SubscriptionCard sub={sub} paidUntil={restaurant.paid_until} />
      <PlanCard plan={restaurant.plan} units={Math.max(units.length, 1)} />
    </div>
  );
}
