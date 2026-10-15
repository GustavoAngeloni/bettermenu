import { ArrowRight, Check, Minus, X } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { FaqItem, SiteFooter, SiteHeader } from "@/components/site-chrome";
import { FAQ } from "@/lib/faq";
import { absoluteUrl, breadcrumbLd, faqLd, JsonLd, ORG_ID, SITE } from "@/lib/site";

const TITLE = "Cardápio digital com QR Code: guia completo para restaurantes";
const DESCRIPTION =
  "O que é cardápio digital, como funciona o QR Code na mesa, diferença entre cardápio em PDF e cardápio com pedidos, acessibilidade e lei, e como implantar no seu restaurante em um dia.";
const PUBLISHED = "2026-10-15";

export const metadata: Metadata = {
  title: "Cardápio digital com QR Code: guia completo",
  description: DESCRIPTION,
  alternates: { canonical: "/cardapio-digital" },
  openGraph: { type: "article", title: TITLE, description: DESCRIPTION, url: "/cardapio-digital", publishedTime: PUBLISHED },
};

const compare: { row: string; print: 0 | 1 | 2; pdf: 0 | 1 | 2; bm: 0 | 1 | 2 }[] = [
  { row: "Mudar preço ou tirar um prato na hora", print: 0, pdf: 1, bm: 2 },
  { row: "Fotos dos pratos", print: 1, pdf: 1, bm: 2 },
  { row: "Cliente faz o pedido sozinho", print: 0, pdf: 0, bm: 2 },
  { row: "Pedido chega direto na cozinha", print: 0, pdf: 0, bm: 2 },
  { row: "Conta dividida por pessoa", print: 0, pdf: 0, bm: 2 },
  { row: "Inglês e espanhol", print: 1, pdf: 1, bm: 2 },
  { row: "Funciona com leitor de tela e em voz alta", print: 0, pdf: 0, bm: 2 },
  { row: "Libras e mensagens escritas para o garçom", print: 0, pdf: 0, bm: 2 },
  { row: "Sem custo de reimpressão", print: 0, pdf: 2, bm: 2 },
];

const Mark = ({ v }: { v: 0 | 1 | 2 }) =>
  v === 2 ? (
    <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
      <Check className="size-4" aria-hidden /> Sim
    </span>
  ) : v === 1 ? (
    <span className="inline-flex items-center gap-1 text-amber-700">
      <Minus className="size-4" aria-hidden /> Em parte
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-muted">
      <X className="size-4" aria-hidden /> Não
    </span>
  );

const H2 = ({ id, children }: { id: string; children: React.ReactNode }) => (
  <h2 id={id} className="mt-16 scroll-mt-24 font-serif text-3xl leading-tight font-semibold tracking-tight md:text-4xl">
    {children}
  </h2>
);
const P = ({ children }: { children: React.ReactNode }) => <p className="mt-4 text-lg leading-relaxed text-muted">{children}</p>;

const TOC = [
  ["o-que-e", "O que é um cardápio digital"],
  ["como-funciona", "Como funciona o QR Code na mesa"],
  ["comparacao", "Impresso, PDF ou cardápio com pedidos?"],
  ["vantagens", "Vantagens para o restaurante e para o cliente"],
  ["acessibilidade", "Acessibilidade e o que diz a lei"],
  ["como-escolher", "Como escolher um sistema de cardápio digital"],
  ["implantar", "Como implantar em um dia"],
  ["perguntas", "Perguntas frequentes"],
];

export default function GuidePage() {
  const faq = FAQ.filter((f) => f.group !== "Acessibilidade").slice(0, 6);
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Article",
              headline: TITLE,
              description: DESCRIPTION,
              inLanguage: "pt-BR",
              datePublished: PUBLISHED,
              dateModified: PUBLISHED,
              author: { "@id": ORG_ID },
              publisher: { "@id": ORG_ID },
              mainEntityOfPage: absoluteUrl("/cardapio-digital"),
              image: absoluteUrl("/opengraph-image"),
              about: ["Cardápio digital", "QR Code", "Restaurantes", "Acessibilidade"],
            },
            breadcrumbLd([
              { name: "Better Menu", path: "/" },
              { name: "Cardápio digital", path: "/cardapio-digital" },
            ]),
            faqLd(faq),
          ],
        }}
      />
      <SiteHeader />
      <main id="conteudo" className="mx-auto w-full max-w-3xl flex-1 px-5 pt-14 pb-24">
        <nav aria-label="Você está em" className="text-sm text-muted">
          <Link href="/" className="hover:text-ink">
            Better Menu
          </Link>{" "}
          / <span aria-current="page">Cardápio digital</span>
        </nav>
        <h1 className="mt-6 font-serif text-[clamp(2.3rem,5.5vw,3.75rem)] leading-[1.04] font-semibold tracking-[-0.02em]">
          Cardápio digital com QR Code: <span className="font-normal text-[var(--bm)] italic">o guia completo para restaurantes</span>
        </h1>
        <p className="mt-4 text-sm text-muted">
          Atualizado em <time dateTime={PUBLISHED}>15 de outubro de 2026</time> · leitura de 7 minutos
        </p>

        <aside aria-label="Resumo" className="mt-10 rounded-[1.6rem] border border-line bg-surface p-6 shadow-card">
          <div className="text-sm font-bold tracking-wide text-[var(--bm)] uppercase">Resumo</div>
          <ul className="mt-3 space-y-2 leading-relaxed">
            <li>
              <strong>Cardápio digital</strong> é o cardápio do restaurante aberto no celular do cliente, normalmente por um QR Code na mesa, sem aplicativo.
            </li>
            <li>
              O tipo mais simples é um <strong>PDF</strong>; o mais completo deixa o cliente <strong>pedir, chamar o garçom e ver a conta dividida</strong>.
            </li>
            <li>Um bom cardápio digital é rápido, fácil de atualizar, tem fotos, fala outros idiomas e é acessível a pessoas com deficiência.</li>
            <li>Dá para implantar em um dia: cadastrar o cardápio, imprimir os QR Codes e treinar a equipe.</li>
          </ul>
        </aside>

        <nav aria-label="Neste guia" className="mt-10">
          <div className="text-sm font-bold">Neste guia</div>
          <ol className="mt-3 grid gap-1.5 text-muted sm:grid-cols-2">
            {TOC.map(([id, label], i) => (
              <li key={id}>
                <a href={`#${id}`} className="hover:text-ink">
                  {i + 1}. {label}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <H2 id="o-que-e">O que é um cardápio digital</H2>
        <P>
          Cardápio digital é a versão do cardápio do restaurante que o cliente abre no próprio celular. Em vez de folhear um cardápio impresso, ele aponta a câmera para um
          QR Code na mesa e vê pratos, fotos, descrições e preços no navegador. Os mais completos, como o {SITE.name}, também recebem o pedido: o cliente escolhe, confirma e
          o pedido vai direto para a cozinha.
        </P>

        <H2 id="como-funciona">Como funciona o QR Code na mesa</H2>
        <ol className="mt-6 space-y-5">
          {[
            ["O cliente escaneia", "A câmera do celular reconhece o QR Code e abre o cardápio daquela mesa. Não há download nem cadastro."],
            ["Escolhe e confirma", "Vê fotos, adicionais e observações, decide se divide o item com a mesa e confirma o pedido."],
            ["A cozinha recebe na hora", "O pedido aparece na tela da cozinha ou do bar com o número da mesa e as observações."],
            ["O garçom é avisado", "Quando o prato fica pronto, ou a mesa chama, o celular do garçom apita, mesmo bloqueado."],
            ["A conta se divide", "Cada pessoa vê o quanto consumiu, com a taxa de serviço, e paga a sua parte."],
          ].map(([title, text], i) => (
            <li key={title} className="flex gap-4">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--bm)] font-bold text-white">{i + 1}</span>
              <span>
                <strong className="block text-lg">{title}</strong>
                <span className="text-muted">{text}</span>
              </span>
            </li>
          ))}
        </ol>

        <H2 id="comparacao">Impresso, PDF ou cardápio com pedidos?</H2>
        <P>Os três resolvem problemas diferentes. A tabela mostra o que cada um entrega na prática.</P>
        <div className="mt-6 overflow-x-auto rounded-2xl border border-line">
          <table className="w-full min-w-[34rem] text-left text-sm">
            <caption className="sr-only">Comparação entre cardápio impresso, cardápio em PDF e cardápio digital com pedidos</caption>
            <thead className="bg-surface-2">
              <tr>
                <th scope="col" className="p-3.5 font-bold">
                  Recurso
                </th>
                <th scope="col" className="p-3.5 font-bold">
                  Impresso
                </th>
                <th scope="col" className="p-3.5 font-bold">
                  PDF por QR Code
                </th>
                <th scope="col" className="p-3.5 font-bold text-[var(--bm)]">
                  Com pedidos ({SITE.name})
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {compare.map((r) => (
                <tr key={r.row}>
                  <th scope="row" className="p-3.5 font-semibold">
                    {r.row}
                  </th>
                  <td className="p-3.5">
                    <Mark v={r.print} />
                  </td>
                  <td className="p-3.5">
                    <Mark v={r.pdf} />
                  </td>
                  <td className="p-3.5">
                    <Mark v={r.bm} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <H2 id="vantagens">Vantagens para o restaurante e para o cliente</H2>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <div className="rounded-2xl border border-line bg-surface p-5">
            <h3 className="font-bold">Para o restaurante</h3>
            <ul className="mt-3 space-y-2 text-muted">
              <li>Menos idas e vindas do garçom só para anotar.</li>
              <li>Preço, prato esgotado e happy hour mudam na hora.</li>
              <li>Dados reais: o que mais vende, horários de pico, avaliações.</li>
              <li>Fechamento de caixa por forma de pagamento.</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-line bg-surface p-5">
            <h3 className="font-bold">Para o cliente</h3>
            <ul className="mt-3 space-y-2 text-muted">
              <li>Pede quando quiser, sem esperar alguém passar.</li>
              <li>Vê fotos e sabe o que está pedindo.</li>
              <li>Acompanha o preparo e chama o garçom num toque.</li>
              <li>Sabe exatamente quanto vai pagar, sem calculadora.</li>
            </ul>
          </div>
        </div>

        <H2 id="acessibilidade">Acessibilidade e o que diz a lei</H2>
        <P>
          A Lei Brasileira de Inclusão (Lei nº 13.146/2015) torna obrigatória a acessibilidade nos sites mantidos por empresas com sede ou representação comercial no país
          (art. 63). Um cardápio digital é um site: precisa funcionar com leitores de tela, permitir ampliar o texto e não depender só de cor ou som.
        </P>
        <P>
          No {SITE.name}, pessoas cegas podem <strong>ouvir o cardápio</strong> em voz alta e usar VoiceOver ou TalkBack; pessoas surdas ou que não falam podem{" "}
          <strong>escrever para o garçom</strong>, mostrar a mensagem em letras grandes e usar a <strong>tradução em Libras</strong>. Alguns estados e municípios também
          exigem cardápio em braile: o digital acessível complementa, e não substitui, o que a regra local pedir.
        </P>
        <Link href="/acessibilidade" className="mt-4 inline-flex items-center gap-2 font-semibold text-[var(--bm)] hover:underline">
          Ver todos os recursos de acessibilidade <ArrowRight className="size-4" aria-hidden />
        </Link>

        <H2 id="como-escolher">Como escolher um sistema de cardápio digital</H2>
        <ul className="mt-6 space-y-3">
          {[
            "Abre rápido no navegador, sem obrigar o cliente a baixar aplicativo.",
            "Você mesmo atualiza preços, fotos e pratos esgotados, sem depender de ninguém.",
            "O pedido chega na cozinha e o garçom é avisado (não é só um PDF bonito).",
            "Divide a conta por pessoa, inclusive itens compartilhados.",
            "Tem a cara do seu restaurante: logo, cores e fotos.",
            "Fala inglês e espanhol, se você recebe turistas.",
            "É acessível de verdade: leitor de tela, voz, texto grande, Libras e mensagens escritas.",
            "Mostra números: faturamento, mais vendidos, horários de pico e avaliações.",
          ].map((item) => (
            <li key={item} className="flex gap-3 text-lg">
              <Check className="mt-1 size-5 shrink-0 text-emerald-700" aria-hidden />
              <span>{item}</span>
            </li>
          ))}
        </ul>

        <H2 id="implantar">Como implantar em um dia</H2>
        <ol className="mt-6 list-decimal space-y-3 pl-6 text-lg marker:font-bold marker:text-[var(--bm)]">
          <li>Cadastre o cardápio: à mão, por planilha ou fotografando o cardápio impresso (a IA lê para você revisar).</li>
          <li>Defina a identidade: logo, cor, foto de capa e tipografia.</li>
          <li>Crie as mesas e imprima os cartões com QR Code, prontos para acrílico.</li>
          <li>Crie os acessos de garçons e cozinha e, nos aparelhos, toque em “Iniciar turno”.</li>
          <li>Faça um pedido de teste de ponta a ponta antes de abrir a casa.</li>
        </ol>

        <div className="mt-14 flex flex-col items-start gap-4 rounded-[1.6rem] bg-[#16120f] p-8 text-white">
          <h2 className="font-serif text-3xl font-semibold">Veja funcionando agora</h2>
          <p className="text-white/70">O cardápio de demonstração é o mesmo que seus clientes vão usar, com pedido, conta dividida e acessibilidade.</p>
          <Link href="/demo" className="group inline-flex h-12 items-center gap-2 rounded-2xl bg-[var(--bm)] px-6 font-semibold text-white">
            Experimentar como cliente <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
          </Link>
        </div>

        <H2 id="perguntas">Perguntas frequentes</H2>
        <div className="mt-4 border-t border-line">
          {faq.map((f) => (
            <FaqItem key={f.q} q={f.q} a={f.a} />
          ))}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
