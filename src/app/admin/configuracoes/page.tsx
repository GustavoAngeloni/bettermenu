import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { appUrl } from "@/lib/qr";
import { SettingsForm } from "./settings-form";

export const metadata = { title: "Configurações" };

export default async function SettingsPage() {
  const { restaurant, profile, features } = await requireStaff(["manager"]);
  if (profile.role !== "owner") redirect("/admin");
  const publicUrl = features.public_page ? `${await appUrl()}/r/${restaurant.slug}` : null;
  return <SettingsForm restaurant={restaurant} publicUrl={publicUrl} />;
}
