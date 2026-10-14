import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { resolveBranding } from "@/lib/branding";
import { BrandEditor } from "./brand-editor";

export const metadata = { title: "Identidade visual · Better Menu" };

export default async function BrandPage() {
  const { restaurant, profile } = await requireStaff(["manager"]);
  if (profile.role !== "owner") redirect("/admin");
  return (
    <BrandEditor
      restaurantId={restaurant.id}
      name={restaurant.name}
      initialLogo={restaurant.logo_url}
      initial={resolveBranding(restaurant.branding)}
    />
  );
}
