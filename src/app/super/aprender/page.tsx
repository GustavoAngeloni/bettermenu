import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { requireSuperadmin } from "@/lib/auth";
import type { LearningItem } from "@/lib/learning";
import { createAdminClient } from "@/lib/supabase/server";
import { SuperHeader } from "../super-header";
import { LearningEditor } from "./learning-editor";

export const metadata = { title: "Aprendizado · Super Admin" };

export default async function SuperLearningPage() {
  const { profile } = await requireSuperadmin();
  const { data, error } = await createAdminClient().from("learning_items").select("*").order("pinned", { ascending: false }).order("published_at", { ascending: false });
  return (
    <div className="flex-1">
      <SuperHeader name={profile.name} />
      <main className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
        <Link href="/super" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
          <ArrowLeft className="size-4" /> Restaurantes
        </Link>
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Central de aprendizado</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Manuais, vídeos tutoriais, artigos e novidades que aparecem para os donos em <strong>Aprender</strong>, no painel do restaurante. Novidades ganham um aviso no menu até o dono abrir.
          </p>
        </div>
        {error ? (
          <p className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            A tabela da central ainda não existe neste banco. Rode a migração (<code>npm run db:migrate</code> ou o schema.sql no SQL Editor).
          </p>
        ) : (
          <LearningEditor items={(data ?? []) as LearningItem[]} />
        )}
      </main>
    </div>
  );
}
