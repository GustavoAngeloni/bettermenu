import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { SettingsForm } from "./settings-form";

export const metadata = { title: "Configurações · Better Menu" };

export default async function SettingsPage() {
  const { restaurant, profile } = await requireStaff(["manager"]);
  if (profile.role !== "owner") redirect("/admin");
  return <SettingsForm restaurant={restaurant} />;
}
