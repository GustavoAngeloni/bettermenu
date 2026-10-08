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

Next.js 16 (App Router) · TypeScript · Tailwind 4 · Supabase (Postgres, Auth, Realtime, Storage).

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
