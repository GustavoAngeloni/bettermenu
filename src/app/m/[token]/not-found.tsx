import { QrCode } from "lucide-react";
import { PoweredBy } from "@/components/brand";

export default function TableNotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center p-8 text-center">
      <span className="flex size-20 items-center justify-center rounded-[1.75rem] bg-brand-soft text-brand-fg">
        <QrCode className="size-9" />
      </span>
      <h1 className="mt-6 font-display text-3xl font-semibold tracking-tight">Mesa não encontrada</h1>
      <p className="mt-2 max-w-sm text-muted">Este QR Code não está mais ativo. Por favor, chame um garçom.</p>
      <PoweredBy className="mt-12" />
    </main>
  );
}
