import type { Metadata } from "next";
import { AuthCard } from "@/components/auth-card";
import { RecoverForm } from "./recover-form";

export const metadata: Metadata = { title: "Recuperar senha", robots: { index: false, follow: false } };

export default async function RecoverPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { codigo, usuario } = await searchParams;
  return (
    <AuthCard title="Esqueceu a senha?" subtitle="Enviamos um link para criar uma nova senha no e-mail cadastrado.">
      <RecoverForm defaults={{ codigo: typeof codigo === "string" ? codigo : "", usuario: typeof usuario === "string" ? usuario : "" }} />
    </AuthCard>
  );
}
