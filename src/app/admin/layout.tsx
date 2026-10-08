import { StaffHeader } from "@/components/staff-header";
import { requireStaff } from "@/lib/auth";
import { AdminNav } from "./admin-nav";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const { restaurant, profile, impersonating, features } = await requireStaff(["manager"]);
  return (
    <div className="flex flex-1 flex-col">
      <StaffHeader restaurant={restaurant} profile={profile} impersonating={impersonating} title="Painel do restaurante" />
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col md:flex-row">
        <AdminNav isOwner={profile.role === "owner"} payments={features.payments} />
        <main className="min-w-0 flex-1 p-4 md:p-8 print:p-0">{children}</main>
      </div>
    </div>
  );
}
