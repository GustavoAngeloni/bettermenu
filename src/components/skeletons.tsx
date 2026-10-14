import { cn } from "@/lib/cn";
import { BetterMenuMark } from "./brand";

export function Bone({ className }: { className?: string }) {
  return <div className={cn("shimmer rounded-xl", className)} />;
}

/** Carregando do painel: cabeçalho + blocos, no formato das páginas do admin. */
export function AdminSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Carregando">
      <div className="space-y-2.5">
        <Bone className="h-9 w-64" />
        <Bone className="h-4 w-96 max-w-full" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Bone key={i} className="h-28 rounded-[1.4rem]" />
        ))}
      </div>
      <Bone className="h-72 rounded-[1.4rem]" />
    </div>
  );
}

/** Carregando das telas de operação: o símbolo do Better Menu pulsando. */
export function FullScreenSpinner() {
  return (
    <div className="flex flex-1 items-center justify-center" aria-busy="true" aria-label="Carregando">
      <BetterMenuMark className="size-12 animate-pulse rounded-2xl" />
    </div>
  );
}
