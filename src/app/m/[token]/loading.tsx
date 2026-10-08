import { Bone } from "@/components/skeletons";

/** Aparece enquanto o cardápio da mesa carrega (logo depois do scan do QR). */
export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-xl space-y-4 p-4" aria-busy="true" aria-label="Carregando cardápio">
      <div className="flex items-center gap-3">
        <Bone className="size-11" />
        <div className="flex-1 space-y-2">
          <Bone className="h-4 w-40" />
          <Bone className="h-3 w-24" />
        </div>
      </div>
      <div className="flex gap-2">
        {Array.from({ length: 4 }, (_, i) => (
          <Bone key={i} className="h-8 w-24 rounded-full" />
        ))}
      </div>
      {Array.from({ length: 5 }, (_, i) => (
        <Bone key={i} className="h-28" />
      ))}
    </div>
  );
}
