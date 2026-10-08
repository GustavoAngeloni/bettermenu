import { cn } from "@/lib/cn";

export function Bone({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-xl bg-stone-200/80", className)} />;
}

/** Carregando do painel: cabeçalho + blocos, no formato das páginas do admin. */
export function AdminSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Carregando">
      <div className="space-y-2">
        <Bone className="h-7 w-48" />
        <Bone className="h-4 w-80 max-w-full" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Bone key={i} className="h-24" />
        ))}
      </div>
      <Bone className="h-64" />
    </div>
  );
}

export function FullScreenSpinner({ dark }: { dark?: boolean }) {
  return (
    <div className={cn("flex flex-1 items-center justify-center", dark && "bg-stone-950")} aria-busy="true">
      <span className="inline-block size-8 animate-spin rounded-full border-2 border-brand border-r-transparent" />
    </div>
  );
}
