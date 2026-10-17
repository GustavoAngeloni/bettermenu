import { BrandScope } from "@/components/brand";
import { ImpersonationBanner } from "@/components/staff-header";
import { requireStaff } from "@/lib/auth";
import { ROLE_LABEL } from "@/lib/types";
import { listUnits } from "@/lib/units";
import { switchUnit } from "./actions";
import { logout } from "../login/actions";
import { AdminShell } from "./admin-nav";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const { restaurant, profile, impersonating, features } = await requireStaff(["manager"]);
  const units = profile.role === "owner" ? await listUnits(restaurant) : [];
  return (
    <BrandScope branding={restaurant.branding}>
      <AdminShell
        restaurant={{ name: restaurant.name, logoUrl: restaurant.logo_url }}
        user={{ name: profile.name, role: profile.role ? ROLE_LABEL[profile.role] : "" }}
        isOwner={profile.role === "owner"}
        payments={features.payments}
        units={units.length > 1 ? { list: units, current: restaurant.id, switchTo: switchUnit } : undefined}
        logout={logout}
        banner={impersonating ? <ImpersonationBanner name={restaurant.name} /> : undefined}
      >
        {children}
      </AdminShell>
    </BrandScope>
  );
}
