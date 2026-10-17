import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth-card";
import { peekPasswordToken } from "@/lib/password-tokens";
import { createAdminClient } from "@/lib/supabase/server";
import { NewPasswordForm } from "./new-password-form";

export const metadata: Metadata = { title: "Criar nova senha", robots: { index: false, follow: false } };

export default async function ResetPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { token } = await searchParams;
  const raw = typeof token === "string" ? token : "";
  const valid = await peekPasswordToken(raw);
  const { data } = valid
    ? await createAdminClient().from("profiles").select("name, username, restaurant:restaurants(name, slug)").eq("id", valid.profile_id).maybeSingle()
    : { data: null };
  const p = data as unknown as { name: string; username: string | null; restaurant: { name: string; slug: string } | null } | null;
  const invite = valid?.purpose === "invite";
  if (!valid || !p)
    return (
      <AuthCard title="Link expirado" subtitle="Este link já foi usado ou passou do prazo.">
        <Link href="/recuperar-senha" className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-brand font-semibold text-on-brand">
          Pedir um novo link
        </Link>
      </AuthCard>
    );
  return (
    <AuthCard
      title={invite ? "Crie sua senha" : "Nova senha"}
      subtitle={
        <>
          {p.name.split(" ")[0]}, {invite ? "seu acesso ao" : "a senha do"} <strong className="text-ink">{p.restaurant?.name}</strong>
          {invite ? " está quase pronto." : " será trocada."} Usuário: <strong className="text-ink">{p.username}</strong> · código <strong className="text-ink">{p.restaurant?.slug}</strong>
        </>
      }
    >
      <NewPasswordForm token={raw} submitLabel={invite ? "Criar senha e entrar" : "Salvar nova senha"} />
    </AuthCard>
  );
}
