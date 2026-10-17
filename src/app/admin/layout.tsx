import { BrandScope } from "@/components/brand";
import { ImpersonationBanner } from "@/components/staff-header";
import { requireStaff } from "@/lib/auth";
import { ROLE_LABEL } from "@/lib/types";
import { visibleTo, type LearningItem } from "@/lib/learning";
import { createClient } from "@/lib/supabase/server";
import { listUnits } from "@/lib/units";
import { switchUnit } from "./actions";
import { logout } from "../login/actions";
import { AdminShell } from "./admin-nav";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const { restaurant, profile, impersonating, features } = await requireStaff(["manager"]);
  const units = profile.role === "owner" ? await listUnits(restaurant) : [];
  // Aviso de novidades na central de aprendizado (sem a tabela, nenhum aviso)
  const seenAt = (profile as { learning_seen_at?: string | null }).learning_seen_at;
  const { data: learning } = await (await createClient())
    .from("learning_items")
    .select("audience, plans, published_at")
    .eq("published", true)
    .gt("published_at", seenAt ?? "1970-01-01");
  const learningNew = ((learning ?? []) as Pick<LearningItem, "audience" | "plans">[]).filter((i) => visibleTo(i, profile.role, restaurant.plan)).length;
  return (
    <BrandScope branding={restaurant.branding}>
      <AdminShell
        restaurant={{ name: restaurant.name, logoUrl: restaurant.logo_url }}
        user={{ name: profile.name, role: profile.role ? ROLE_LABEL[profile.role] : "" }}
        isOwner={profile.role === "owner"}
        payments={features.payments}
        learningNew={learningNew}
        units={units.length > 1 ? { list: units, current: restaurant.id, switchTo: switchUnit } : undefined}
        logout={logout}
        banner={impersonating ? <ImpersonationBanner name={restaurant.name} /> : undefined}
      >
        {children}
      </AdminShell>
    </BrandScope>
  );
}
