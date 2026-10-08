export default function TableNotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center p-8 text-center">
      <div className="text-5xl">🍽️</div>
      <h1 className="mt-4 text-2xl font-bold">Mesa não encontrada</h1>
      <p className="mt-2 max-w-sm text-muted">Este QR Code não está mais ativo. Por favor, chame um garçom.</p>
    </main>
  );
}
