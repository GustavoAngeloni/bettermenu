// Dados públicos da plataforma, usados em metadados, dados estruturados (JSON-LD),
// sitemap, robots e llms.txt. Uma fonte só, para Google e IAs lerem a mesma história.

const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : null;

export const SITE = {
  name: "Better Menu",
  url: (process.env.NEXT_PUBLIC_APP_URL || vercelUrl || "http://localhost:3000").replace(/\/$/, ""),
  title: "Better Menu · Cardápio digital com QR Code, pedidos na mesa e conta dividida",
  description:
    "Cardápio digital com QR Code para restaurantes, bares e cafés: o cliente pede pelo celular, a cozinha e o garçom recebem na hora e a conta se divide por pessoa. Acessível para pessoas cegas, surdas e que não falam. Sem aplicativo para baixar.",
  /** Frase-definição: o que respondemos quando alguém (ou uma IA) pergunta "o que é o Better Menu?" */
  definition:
    "Better Menu é uma plataforma brasileira de cardápio digital com QR Code para restaurantes, bares e cafés. O cliente escaneia o código da mesa, faz o pedido pelo celular, acompanha o preparo e vê a conta dividida por pessoa; a cozinha e os garçons recebem tudo em tempo real. Tem recursos de acessibilidade para pessoas cegas, com baixa visão, surdas e que não falam.",
  publisher: { name: "insight" },
  locale: "pt_BR",
  /** Opcional: link de contato comercial (WhatsApp, formulário...). Sem ele, o botão não aparece. */
  contactUrl: process.env.NEXT_PUBLIC_CONTACT_URL || null,
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL || null,
  keywords: [
    "cardápio digital",
    "cardápio digital QR Code",
    "cardápio online para restaurante",
    "pedido pelo celular na mesa",
    "autoatendimento restaurante",
    "sistema para restaurante",
    "sistema para bar",
    "comanda digital",
    "dividir conta restaurante",
    "chamar garçom pelo celular",
    "cardápio acessível",
    "cardápio para cegos",
    "cardápio em Libras",
    "acessibilidade em restaurantes",
    "cardápio em inglês e espanhol",
  ],
};

export const absoluteUrl = (path = "/") => `${SITE.url}${path.startsWith("/") ? path : `/${path}`}`;

/** Páginas públicas de conteúdo (sitemap, rodapé, llms.txt). */
export const PUBLIC_PAGES = [
  { path: "/", title: "Better Menu", summary: "Página inicial: o que é, como funciona e para quem é." },
  { path: "/cardapio-digital", title: "Cardápio digital com QR Code: guia completo", summary: "O que é, como funciona, comparação com PDF e cardápio impresso, como escolher." },
  { path: "/acessibilidade", title: "Acessibilidade", summary: "Recursos para pessoas cegas, com baixa visão, surdas e que não falam, e declaração de acessibilidade." },
  { path: "/perguntas-frequentes", title: "Perguntas frequentes", summary: "Respostas diretas sobre preço, implantação, pedidos, conta dividida, idiomas e acessibilidade." },
  { path: "/demo", title: "Demonstração", summary: "Cardápio de demonstração funcionando, como um cliente na mesa." },
] as const;

/** <script type="application/ld+json"> seguro (escapa "<" contra injeção de HTML). */
export function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

export const ORG_ID = `${SITE.url}/#organizacao`;
export const APP_ID = `${SITE.url}/#software`;

export function organizationLd() {
  return {
    "@type": "Organization",
    "@id": ORG_ID,
    name: SITE.name,
    url: SITE.url,
    logo: absoluteUrl("/icon.svg"),
    description: SITE.definition,
    brand: { "@type": "Brand", name: SITE.name },
    parentOrganization: { "@type": "Organization", name: SITE.publisher.name },
    areaServed: { "@type": "Country", name: "Brasil" },
    knowsLanguage: ["pt-BR", "en", "es"],
    ...(SITE.contactEmail ? { email: SITE.contactEmail } : {}),
  };
}

export function softwareLd() {
  return {
    "@type": "SoftwareApplication",
    "@id": APP_ID,
    name: SITE.name,
    url: SITE.url,
    description: SITE.description,
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "Cardápio digital e pedidos para restaurantes",
    operatingSystem: "Web, Android, iOS (navegador)",
    inLanguage: ["pt-BR", "en", "es"],
    publisher: { "@id": ORG_ID },
    featureList: [
      "Cardápio digital por QR Code em cada mesa",
      "Pedidos pelo celular direto para a cozinha e o bar",
      "Chamar o garçom e pedir a conta pelo celular",
      "Conta dividida por pessoa, com itens compartilhados",
      "Cardápio em português, inglês e espanhol",
      "Identidade visual própria de cada restaurante (white-label)",
      "Painel do dono com faturamento, pratos mais vendidos e avaliações",
      "Tela da cozinha com comandas por estação e impressão 80 mm",
      "Compatível com leitores de tela (VoiceOver e TalkBack)",
      "Ouvir o cardápio em voz alta e ditar mensagens",
      "Mensagens escritas para a equipe e tela para mostrar ao garçom",
      "Tradução em Libras com VLibras",
      "Alto contraste, texto ampliado e redução de animações",
    ],
    accessibilityFeature: ["largePrint", "highContrastDisplay", "synthesizedSpeech", "signLanguage", "structuralNavigation", "readingOrder", "alternativeText"],
    accessibilityControl: ["fullKeyboardControl", "fullTouchControl", "fullVoiceControl"],
    accessibilityAPI: ["ARIA"],
    accessibilityHazard: ["noFlashingHazard", "noSoundHazard"],
    accessMode: ["textual", "visual", "auditory"],
  };
}

export function breadcrumbLd(items: { name: string; path: string }[]) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: absoluteUrl(it.path) })),
  };
}

export function faqLd(faq: { q: string; a: string }[]) {
  return {
    "@type": "FAQPage",
    mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
}
