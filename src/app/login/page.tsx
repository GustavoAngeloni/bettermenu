import { redirect } from "next/navigation";
import { BetterMenuLogo, ByInsight } from "@/components/brand";
import { ThemeToggle } from "@/components/theme";
import { getStaff, homeFor } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const metadata = { title: "Entrar · Better Menu" };

const PHOTOS = ["1600891964092-4316c288032e", "1571877227200-a0d98ea607e9", "1514362545857-3bc16c4c7d1b", "1625944525533-473f1a3d54e7", "1563379926898-05f4575a45d8", "1512621776951-a57141f2eefd"];

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
    <main className="grid min-h-dvh flex-1 lg:grid-cols-[1.05fr_1fr]">
      {/* Lado da marca */}
      <section className="grain relative hidden overflow-hidden bg-[#16120f] text-white lg:flex lg:flex-col">
        <div className="pointer-events-none absolute -top-40 -left-40 size-[36rem] rounded-full bg-[var(--bm)] opacity-30 blur-[120px]" aria-hidden />
        <div className="absolute inset-0 grid rotate-[-8deg] grid-cols-3 gap-4 p-4 opacity-45 [mask-image:radial-gradient(75%_65%_at_75%_35%,black,transparent)] scale-125 translate-x-24 -translate-y-10" aria-hidden>
          {[...PHOTOS, ...PHOTOS].map((id, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={`https://images.unsplash.com/photo-${id}?w=420&q=60&auto=format&fit=crop`}
              alt=""
              className="aspect-[4/5] w-full rounded-3xl object-cover"
              style={{ transform: `translateY(${(i % 3) * 32}px)` }}
            />
          ))}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#16120f] via-[#16120f]/70 to-transparent" aria-hidden />
        <div className="relative z-10 flex flex-1 flex-col p-12">
          <BetterMenuLogo className="text-lg" />
          <div className="mt-auto max-w-md">
            <h1 className="font-serif text-5xl leading-[1.05] font-semibold tracking-tight xl:text-6xl">
              A casa cheia, <span className="font-normal italic text-[#ffb59a]">a operação leve.</span>
            </h1>
            <p className="mt-5 text-lg text-white/70">Cardápio na mesa, cozinha em tempo real e conta dividida sem confusão.</p>
          </div>
          <div className="mt-12 flex items-center justify-between text-sm text-white/60">
            <span>Uma plataforma</span>
            <ByInsight tone="light" className="text-sm" label="" />
          </div>
        </div>
      </section>

      {/* Formulário */}
      <section className="relative flex flex-col px-6 py-8 sm:px-12">
        <div className="flex items-center justify-between">
          <BetterMenuLogo className="lg:invisible" />
          <ThemeToggle />
        </div>
        <div className="mx-auto my-auto w-full max-w-sm py-12">
          <h2 className="font-display text-4xl font-semibold tracking-tight">Bem-vindo de volta</h2>
          <p className="mt-2 text-muted">Acesso da equipe do restaurante.</p>
          {notice && <p className="mt-6 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">{notice}</p>}
          <LoginForm />
        </div>
        <div className="flex items-center justify-center gap-2 text-xs text-muted lg:hidden">
          Better Menu <span className="opacity-50">·</span> <ByInsight />
        </div>
      </section>
    </main>
  );
}
