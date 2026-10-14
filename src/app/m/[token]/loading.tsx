/** Aparece enquanto o cardápio da mesa carrega (logo depois do scan do QR). */
export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-xl" aria-busy="true" aria-label="Carregando cardápio">
      <div className="shimmer h-[17.5rem] [mask-image:linear-gradient(to_bottom,black_55%,transparent)]" />
      <div className="-mt-24 space-y-3 px-5">
        <div className="shimmer size-[4.5rem] rounded-[1.4rem] ring-4 ring-canvas" />
        <div className="shimmer h-9 w-56 rounded-xl" />
        <div className="flex gap-2">
          <div className="shimmer h-10 w-24 rounded-full" />
          <div className="shimmer h-10 w-32 rounded-full" />
        </div>
      </div>
      <div className="mt-8 flex gap-2 px-5">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="shimmer h-9 w-24 rounded-full" />
        ))}
      </div>
      <div className="mt-6 space-y-6 px-5">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex gap-4">
            <div className="flex-1 space-y-2 pt-1">
              <div className="shimmer h-4 w-2/3 rounded-lg" />
              <div className="shimmer h-3 w-full rounded-lg" />
              <div className="shimmer h-3 w-1/3 rounded-lg" />
            </div>
            <div className="shimmer size-[6.75rem] rounded-[1.1rem]" />
          </div>
        ))}
      </div>
    </div>
  );
}
