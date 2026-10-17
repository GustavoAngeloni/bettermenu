import type { Metadata } from "next";
import { getStaff } from "@/lib/auth";
import { billingConfigured } from "@/lib/billing";
import { isCycle, isPlanKey, planOf } from "@/lib/plans";
import { CheckoutApp } from "./checkout-app";

export const metadata: Metadata = {
  title: "Assinar",
  description: "Assine o Better Menu: escolha o plano, mensal ou anual com 5% de desconto, e pague com cartão de crédito pelo Mercado Pago.",
  robots: { index: false, follow: true },
};

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const q = await searchParams;
  const staff = await getStaff();
  const owner = staff?.profile.role === "owner" && staff.restaurant ? staff : null;
  const plan = isPlanKey(q.plano) ? q.plano : owner ? planOf(owner.restaurant!.plan) : "profissional";
  const cycle = isCycle(q.ciclo) ? q.ciclo : "mensal";
  return (
    <CheckoutApp
      initialPlan={plan}
      initialCycle={cycle}
      publicKey={process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY ?? ""}
      configured={billingConfigured()}
      owner={owner ? { name: owner.profile.name, restaurant: owner.restaurant!.name, currentPlan: planOf(owner.restaurant!.plan) } : null}
    />
  );
}
