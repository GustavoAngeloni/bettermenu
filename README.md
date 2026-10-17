# Better Menu

Cardápio digital por mesa, pedidos direto para a cozinha, chamado de garçom e conta dividida por pessoa.
Multi-restaurante: uma instalação atende vários restaurantes clientes.

## Telas

| Rota | Quem usa | O que faz |
|---|---|---|
| `/m/{token}` | Cliente (QR Code da mesa) | Nome → cardápio → carrinho → **Confirmar pedido**, acompanhar status, chamar garçom, ver a conta dividida |
| `/garcom` | Garçom | Alerta sonoro de chamados e pratos prontos, mapa de mesas, divisão da conta, marcar pago, liberar mesa |
| `/cozinha` | Cozinha / Bar | Pedidos em cards (Novos → Em preparo → Prontos), check por item, filtro por estação |
| `/admin` | Dono / gerente | Estatísticas, cardápio (fotos, adicionais, esgotado), mesas + QR Codes, equipe, taxa de serviço |
| `/super` | Você (dono da plataforma) | Cadastrar restaurantes e o login do dono, ver vendas de cada cliente |
| `/login` | Equipe | Código do restaurante + usuário + senha (super admin entra com email) |
| `/demo` | Qualquer pessoa | Cardápio de demonstração funcionando sem banco. Aceita `?cor=2f7d4f&fonte=moderno&tema=dark` para mostrar a um restaurante como fica com a marca dele |

## Identidade visual (white-label)

Cada restaurante tem a própria marca em **Painel → Identidade visual** (`/admin/marca`, só o dono), com prévia ao vivo:
logo, foto de capa, cor principal, tipografia dos títulos (Clássico, Moderno, Elegante, Minimalista), tema inicial do cardápio
(automático, claro ou escuro) e uma frase de apresentação. Fica em `restaurants.branding` (jsonb); ver `src/lib/branding.ts`.

A cor do restaurante vale no cardápio do cliente, no painel, no garçom, na cozinha e nos cartões de QR impressos.
Os neutros (fundo, superfícies, linhas) ganham um leve tom da cor, e o texto sobre os botões fica branco ou escuro
conforme o contraste. "Better Menu · by insight" aparece no rodapé do cardápio, no painel e nos cartões das mesas.

Todas as telas têm **tema claro e escuro** (botão sol/lua). A escolha fica salva no aparelho; a cozinha abre no escuro.
Os tokens de cor estão em `src/app/globals.css`.

> Atualizando um banco existente: rode `npm run db:migrate` (ou cole o `supabase/schema.sql` de novo) para criar as colunas
> `restaurants.branding`, `waiter_calls.message`, `guests.access_needs`, as colunas de planos e as tabelas de assinaturas e da central
> de aprendizado. É aditivo e idempotente.

## Assinaturas (checkout com Mercado Pago)

- Vitrine em `/planos` (e na home) com Essencial, Profissional e Premium, **mensal** ou **anual com 5% de desconto** (`src/lib/plans.ts`).
- Checkout em `/assinar`: plano → dados do restaurante e do dono → pagamento. O cartão é digitado no formulário seguro do
  Mercado Pago (Card Payment Brick) embutido na página, com as cores do Better Menu; o token vai para `/api/assinatura`,
  que cria a assinatura no Mercado Pago (já autorizada) e **cria o restaurante e o login do dono na hora**.
- Cada plano × ciclo vira um plano de assinatura no Mercado Pago, criado sozinho na primeira venda (`billing_plans`).
- Dono logado que muda de plano: o novo plano vale para todas as unidades e a assinatura anterior é cancelada.
- Webhook `/api/mercadopago/webhook` (tópicos de Assinaturas): mantém status, próxima cobrança e "pago até".
- Dono vê e cancela a assinatura em Configurações; o super admin vê todas as assinaturas em `/super`.

Configurar: `MERCADOPAGO_ACCESS_TOKEN`, `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY` e `MERCADOPAGO_WEBHOOK_SECRET` (ver `.env.example`)
e, no painel do Mercado Pago, a URL de notificação `https://SEU-DOMINIO/api/mercadopago/webhook` com os eventos de
"Planos e assinaturas". Para testar, use credenciais de teste e os cartões de teste do Mercado Pago.

## Central de aprendizado

- Super admin publica em `/super/aprender`: manuais (PDF enviado ou link), vídeos (YouTube, Vimeo, Loom, mp4), novidades e artigos,
  com público (dono, gerente, garçom, cozinha) e planos opcionais, fixar no topo e rascunho.
- Donos e gerentes acessam em **Aprender** (`/admin/aprender`); novidades ainda não vistas aparecem com contador no menu.

## E-mails (Resend)

Todos os e-mails saem pelo [Resend](https://resend.com) usando templates publicados lá (o texto fica em `scripts/emails/templates.mjs`).

| Quando | Template |
| --- | --- |
| Pagamento aprovado, conta criada (dados de acesso) | `bm-acesso-liberado` |
| "Esqueci minha senha" em `/recuperar-senha` (link válido por 1 hora) | `bm-redefinir-senha` |
| Senha trocada pelo link | `bm-senha-alterada` |
| Dono cadastra alguém da equipe com e-mail (link para criar a senha, 72 h) | `bm-convite-equipe` |
| Renovação cobrada / recusada | `bm-pagamento-confirmado` / `bm-pagamento-recusado` |
| Assinatura cancelada · troca de plano | `bm-assinatura-cancelada` · `bm-plano-alterado` |
| Boas-vindas nos dias 1, 3 e 7 (automação do Resend, evento `bm.assinatura.aprovada`) | `bm-boas-vindas-1-cardapio`, `-2-qrcodes`, `-3-numeros` |

Publicar ou atualizar no Resend (com o domínio de envio já verificado lá):

```bash
npm i -g resend-cli && resend login
npm run emails:sync -- --app-url https://SEU-DOMINIO --from "Better Menu <ola@SEU-DOMINIO>"
npm run emails:preview   # gera os HTMLs em emails-preview/ para conferir
```

Na Vercel: `RESEND_API_KEY`, `EMAIL_FROM` e, se quiser, `EMAIL_REPLY_TO`. Sem a chave, o sistema funciona normalmente e só registra no log que o e-mail não foi enviado.

## Acessibilidade

O cardápio do cliente tem um botão de acessibilidade em todas as telas (`src/app/m/[token]/accessibility.tsx`, preferências em `src/lib/a11y.tsx`):

- **Pessoas cegas ou com baixa visão:** compatível com VoiceOver/TalkBack (botões nomeados, preços com promoção lidos como "de X por Y",
  status anunciado, foco preso nos painéis), **Ouvir o cardápio** (voz lê prato a prato, com destaque na tela), ditado por voz,
  texto até 130%, alto contraste e redução de animações.
- **Pessoas surdas ou que não falam:** mensagem escrita ou frase pronta para o garçom (chega como chamado, também no celular bloqueado),
  **Mostrar na tela** (letras grandes para virar para a equipe), tradução em Libras (VLibras, carregado só quando ligado) e avisos por vibração.
- **Aviso à equipe:** o cliente informa como prefere ser atendido; a mesa ganha um selo no mapa do garçom e a mesa mostra a orientação
  (`src/lib/access-needs.ts`, `src/components/access-note.tsx`).

Banco: `waiter_calls.message` e `guests.access_needs` (schema v3). Sem a migração o app continua funcionando, só sem esses dados.

## Buscadores e IAs (SEO · AEO · GEO)

- `robots.txt` (`src/app/robots.ts`): libera páginas públicas e robôs de IA; bloqueia painel, mesas e API (que também recebem `X-Robots-Tag: noindex`).
- `sitemap.xml` (`src/app/sitemap.ts`): páginas de conteúdo + página pública de cada restaurante.
- `llms.txt` e `llms-full.txt`: resumo em Markdown para assistentes de IA (`src/lib/llms.ts`).
- Dados estruturados JSON-LD (`src/lib/site.tsx`): Organization, SoftwareApplication (com recursos de acessibilidade), FAQPage, Article, BreadcrumbList.
- Páginas de conteúdo: `/cardapio-digital` (guia), `/acessibilidade` (declaração), `/perguntas-frequentes` (FAQ em `src/lib/faq.ts`).
- **Página pública do cardápio** `/r/{código}`: só consulta, com Restaurant + Menu + preços em schema.org. Função "Página pública do cardápio"
  (liga/desliga no `/super`). O dono vê o link em Configurações.
- Imagem de compartilhamento (`opengraph-image.tsx`) e ícone do iPhone (`apple-icon.tsx`).

Depois do deploy: cadastre o domínio no Google Search Console e no Bing Webmaster Tools e envie o `/sitemap.xml`.
Opcionais: `NEXT_PUBLIC_CONTACT_URL` (botão "Fale com a gente") e `NEXT_PUBLIC_CONTACT_EMAIL` (contato na declaração de acessibilidade).

## Funções liga/desliga por restaurante

Cada restaurante tem um conjunto de funções que o Super Admin marca ao criar (e altera em `/super/{id}`).
Função desligada some das telas **e** é recusada pelo servidor. Lista completa em `src/lib/features.ts`:

- **Cliente:** pedir pelo celular, chamar garçom, pedir a conta, ver conta dividida, dividir itens, pedir de novo,
  cancelar enquanto "Recebido", sugestões e selos, alérgenos, idiomas (PT/EN/ES), avaliação, tempo estimado.
- **Garçom:** lançar pedido, transferir/juntar mesas, mover item entre pessoas, desconto/cortesia (gerente),
  forma de pagamento + fechamento de caixa, setores, alertas com o celular bloqueado (Web Push).
- **Cozinha:** marcar esgotado, totais agrupados, impressão de comanda (80mm).
- **Dono:** cardápio por horário e happy hour, estoque, combos, exportar para Excel (CSV).

Restaurantes antigos (sem configuração) têm tudo ligado. O plano define o limite de mesas (validado no banco).

Outras ferramentas: **Entrar como** (super admin abre o painel de um restaurante para dar suporte) e
**Importar cardápio** (`/admin/cardapio/importar`) por planilha CSV ou por foto, com leitura feita pelo Claude
(precisa de `ANTHROPIC_API_KEY`).

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind 4 (tokens OKLCH, claro/escuro) · Supabase (Postgres, Auth, Realtime, Storage).

- **Cliente** é anônimo: tudo passa pelas rotas `/api/m/[token]/*`, que usam a service role no servidor.
  O cliente é identificado por um cookie secreto por mesa.
- **Equipe** usa Supabase Auth; o RLS (`supabase/schema.sql`) limita cada usuário ao próprio restaurante.
- **Tempo real**: garçom e cozinha escutam mudanças via Supabase Realtime; o cliente atualiza a cada 4s.
- **Sessão da mesa**: abre no 1º scan, fecha quando o garçom confirma o pagamento. Pedidos guardam uma cópia
  de nome/preço, então editar o cardápio não altera o histórico.
- **Divisão**: `src/lib/bill.ts`. Item "só eu", "dividir com todos" (inclui quem chegar depois) ou pessoas escolhidas;
  taxa de serviço aplicada sobre a parte de cada um; centavos distribuídos sem perder nenhum.

## Configuração (uma vez)

1. Crie um projeto em [supabase.com](https://supabase.com).
2. `cp .env.example .env.local` e preencha URL, anon key e service role key (Project Settings → API).
3. Aplique o schema: cole `supabase/schema.sql` no **SQL Editor** do Supabase e rode
   (ou preencha `SUPABASE_DB_URL` e rode `npm run db:migrate`).
4. Crie seu usuário super admin:
   ```bash
   npm run seed -- --admin seu@email.com UmaSenhaForte
   ```
5. (Opcional) restaurante de demonstração com cardápio e 8 mesas:
   ```bash
   npm run seed -- --demo
   ```
   Logins `dono`, `garcom`, `cozinha` no código `demo`. A senha é aleatória e aparece no final do comando
   (ou defina `DEMO_PASSWORD` no `.env.local` antes de rodar).
6. `npm run dev` e abra http://localhost:3000/login

Para testar do celular na mesma rede, defina `NEXT_PUBLIC_APP_URL=http://SEU-IP:3000` para os QR Codes apontarem para o IP do computador.

## Implantar um novo restaurante

1. Em `/super`, crie o restaurante (nome, código, taxa de serviço, nº de mesas, login do dono).
2. Entre como dono → **Cardápio**: categorias, pratos, fotos, adicionais; ligue cada categoria a uma estação (Cozinha/Bar).
3. **Mesas e QR Codes** → **Imprimir todos** (cartões A4 prontos para plastificar/acrílico).
4. **Equipe**: crie os logins dos garçons e da cozinha.
5. Nos aparelhos da cozinha e dos garçons: abrir `/login`, entrar, tocar em **Iniciar turno** (libera o som e mantém a tela acesa).
   Dica: "Adicionar à tela inicial" para abrir como app.

## Deploy

Vercel (ou qualquer host Node). Configure as mesmas variáveis do `.env.local` e `NEXT_PUBLIC_APP_URL` com o domínio final,
porque os QR Codes impressos usam essa URL.
