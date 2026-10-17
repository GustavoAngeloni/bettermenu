import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { PlanCard } from "@/components/plan-card";
import { appUrl } from "@/lib/qr";
import { listUnits } from "@/lib/units";
import { SettingsForm } from "./settings-form";

export const metadata = { title: "Configurações" };

export default async function SettingsPage() {
  const { restaurant, profile, features } = await requireStaff(["manager"]);
  if (profile.role !== "owner") redirect("/admin");
  const publicUrl = features.public_page ? `${await appUrl()}/r/${restaurant.slug}` : null;
  const units = await listUnits(restaurant);
  return (
    <div className="max-w-2xl space-y-6">
      <SettingsForm restaurant={restaurant} publicUrl={publicUrl} />
      <PlanCard plan={restaurant.plan} units={Math.max(units.length, 1)} />
    </div>
  );
}
