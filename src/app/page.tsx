import { Bell, ChefHat, QrCode, Receipt } from "lucide-react";
import Link from "next/link";

const features = [
  { icon: QrCode, title: "Cardápio na mesa", text: "O cliente escaneia o QR Code, digita o nome e pede pelo celular." },
  { icon: ChefHat, title: "Direto para a cozinha", text: "Pedidos chegam na tela da cozinha na hora, com observações e mesa." },
  { icon: Bell, title: "Chamar garçom", text: "Um toque e o celular do garçom apita com o número da mesa." },
  { icon: Receipt, title: "Conta dividida", text: "Cada um vê exatamente o que consumiu, inclusive itens divididos." },
];

export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2 text-lg font-bold">
          <span className="flex size-9 items-center justify-center rounded-xl bg-brand text-white">B</span> Better Menu
        </div>
        <Link href="/login" className="rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-white">
          Entrar
        </Link>
      </header>
      <section className="mx-auto w-full max-w-5xl px-6 py-16 text-center md:py-24">
        <h1 className="mx-auto max-w-3xl text-4xl leading-tight font-extrabold tracking-tight md:text-6xl md:leading-tight">
          Pedidos mais rápidos, <span className="text-brand">conta sem confusão.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-muted">
          Cardápio digital por mesa, cozinha e garçons conectados em tempo real, e a divisão da conta pronta no final.
        </p>
      </section>
      <section className="mx-auto grid w-full max-w-5xl gap-4 px-6 pb-20 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((f) => (
          <div key={f.title} className="rounded-2xl bg-white p-5 shadow-sm">
            <f.icon className="size-7 text-brand" />
            <h2 className="mt-3 font-bold">{f.title}</h2>
            <p className="mt-1 text-sm text-muted">{f.text}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
