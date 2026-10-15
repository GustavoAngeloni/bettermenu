import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { aiImportEnabled } from "@/lib/menu-import";
import { MenuImporter } from "./menu-importer";

export const metadata = { title: "Importar cardápio" };

export default async function ImportPage() {
  await requireStaff(["manager"]);
  return (
    <div className="space-y-6">
      <Link href="/admin/cardapio" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> Cardápio
      </Link>
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight md:text-[2.15rem]">Importar cardápio</h1>
        <p className="text-sm text-muted">Cadastre vários pratos de uma vez a partir de fotos do cardápio impresso ou de uma planilha.</p>
      </div>
      <MenuImporter aiEnabled={aiImportEnabled()} />
    </div>
  );
}
