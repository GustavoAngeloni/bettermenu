"use client";

import { useState } from "react";
import { resolveFeatures } from "@/lib/features";
import { CustomerApp } from "../m/[token]/customer-app";
import { createDemoApi, DEMO_MENU, DEMO_RESTAURANT } from "./demo-data";

const features = resolveFeatures(null);

/** Cardápio de demonstração: mesmo app do cliente, com o "servidor" simulado no navegador. */
export function DemoClient() {
  const [api] = useState(createDemoApi);
  return (
    <CustomerApp
      token="demo"
      tableNumber={7}
      restaurant={DEMO_RESTAURANT}
      menu={DEMO_MENU}
      features={features}
      initialState={{ joined: false, guests: ["Marina", "Pedro"] }}
      api={api}
    />
  );
}
