import { redirect } from "next/navigation";
import { getStaff, homeFor } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const metadata = { title: "Entrar · Better Menu" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { erro } = await searchParams;
  const staff = await getStaff();

  // Só redireciona quem tem para onde ir. Se o restaurante foi desativado,
  // mostra o aviso (redirecionar de volta causaria um loop com requireStaff).
  const blocked = staff && !staff.profile.is_superadmin && !staff.restaurant?.active;
  if (staff && !blocked) redirect(homeFor(staff.profile));
  const notice =
    blocked || erro === "inativo" ? "Este restaurante está desativado. Fale com o suporte do Better Menu." : null;

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl bg-brand text-2xl font-extrabold text-white">
            B
          </div>
          <h1 className="text-2xl font-bold">Better Menu</h1>
          <p className="mt-1 text-sm text-muted">Acesso da equipe do restaurante</p>
        </div>
        {notice && <p className="mb-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{notice}</p>}
        <LoginForm />
      </div>
    </main>
  );
}
