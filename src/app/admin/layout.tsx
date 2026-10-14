import { BrandScope } from "@/components/brand";
import { ImpersonationBanner } from "@/components/staff-header";
import { requireStaff } from "@/lib/auth";
import { ROLE_LABEL } from "@/lib/types";
import { logout } from "../login/actions";
import { AdminShell } from "./admin-nav";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const { restaurant, profile, impersonating, features } = await requireStaff(["manager"]);
  return (
    <BrandScope branding={restaurant.branding}>
      <AdminShell
        restaurant={{ name: restaurant.name, logoUrl: restaurant.logo_url }}
        user={{ name: profile.name, role: profile.role ? ROLE_LABEL[profile.role] : "" }}
        isOwner={profile.role === "owner"}
        payments={features.payments}
        logout={logout}
        banner={impersonating ? <ImpersonationBanner name={restaurant.name} /> : undefined}
      >
        {children}
      </AdminShell>
    </BrandScope>
  );
}
