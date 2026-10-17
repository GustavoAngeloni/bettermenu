-- =====================================================================
-- Better Menu — schema do banco (Supabase / Postgres)
-- Multi-restaurante: toda tabela operacional carrega restaurant_id.
-- Rode este arquivo inteiro no SQL Editor do Supabase (ou `npm run db:migrate`).
-- =====================================================================

create extension if not exists pgcrypto;

do $$ begin
  create type staff_role as enum ('owner', 'manager', 'waiter', 'kitchen');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- Restaurantes e equipe
-- ---------------------------------------------------------------------
create table if not exists restaurants (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  slug            text not null unique,
  logo_url        text,
  service_fee_pct numeric(5,2) not null default 10,
  active          boolean not null default true,
  created_at      timestamptz not null default now()
);

-- Um perfil por usuário do Supabase Auth.
-- Super admin (dono da plataforma) tem restaurant_id nulo e is_superadmin = true.
create table if not exists profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  restaurant_id uuid references restaurants(id) on delete cascade,
  name          text not null,
  username      text,
  role          staff_role,
  is_superadmin boolean not null default false,
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  unique (restaurant_id, username)
);

-- ---------------------------------------------------------------------
-- Cardápio
-- ---------------------------------------------------------------------
-- Estação = tela de produção (Cozinha, Bar, Sobremesas...)
create table if not exists stations (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  name          text not null,
  sort          int not null default 0
);

create table if not exists categories (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  name          text not null,
  station_id    uuid references stations(id) on delete set null,
  sort          int not null default 0
);

create table if not exists menu_items (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  category_id   uuid not null references categories(id) on delete cascade,
  name          text not null,
  description   text,
  price_cents   int not null check (price_cents >= 0),
  image_url     text,
  available     boolean not null default true,
  sort          int not null default 0,
  created_at    timestamptz not null default now()
);

-- Adicionais ("+ bacon", "ponto da carne"...)
create table if not exists item_options (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  menu_item_id  uuid not null references menu_items(id) on delete cascade,
  name          text not null,
  price_cents   int not null default 0 check (price_cents >= 0),
  sort          int not null default 0
);

-- ---------------------------------------------------------------------
-- Mesas e sessões
-- ---------------------------------------------------------------------
create table if not exists tables (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  number        int not null,
  qr_token      text not null unique default encode(gen_random_bytes(9), 'hex'),
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  unique (restaurant_id, number)
);

-- Uma sessão = um grupo de clientes, do 1º scan até o garçom marcar como paga.
create table if not exists table_sessions (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  table_id      uuid not null references tables(id) on delete cascade,
  status        text not null default 'open' check (status in ('open', 'closed')),
  opened_at     timestamptz not null default now(),
  closed_at     timestamptz,
  closed_by     uuid references profiles(id) on delete set null
);
-- No máximo uma sessão aberta por mesa
create unique index if not exists one_open_session_per_table
  on table_sessions (table_id) where status = 'open';

create table if not exists guests (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  session_id    uuid not null references table_sessions(id) on delete cascade,
  name          text not null,
  secret        text not null unique default encode(gen_random_bytes(18), 'hex'),
  paid_at       timestamptz,
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Pedidos
-- ---------------------------------------------------------------------
create table if not exists orders (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  session_id    uuid not null references table_sessions(id) on delete cascade,
  table_id      uuid not null references tables(id) on delete cascade,
  guest_id      uuid not null references guests(id) on delete cascade,
  created_at    timestamptz not null default now()
);

-- Nome, preço e estação são copiados no momento do pedido:
-- se o dono mudar o cardápio depois, o histórico continua correto.
create table if not exists order_items (
  id               uuid primary key default gen_random_uuid(),
  restaurant_id    uuid not null references restaurants(id) on delete cascade,
  order_id         uuid not null references orders(id) on delete cascade,
  session_id       uuid not null references table_sessions(id) on delete cascade,
  table_id         uuid not null references tables(id) on delete cascade,
  guest_id         uuid not null references guests(id) on delete cascade,
  menu_item_id     uuid references menu_items(id) on delete set null,
  station_id       uuid references stations(id) on delete set null,
  name             text not null,
  options          jsonb not null default '[]',   -- [{name, price_cents}]
  unit_price_cents int not null,                   -- preço base + adicionais
  qty              int not null default 1 check (qty > 0),
  note             text,
  share_mode       text not null default 'me' check (share_mode in ('me', 'all', 'custom')),
  status           text not null default 'pending'
                   check (status in ('pending', 'preparing', 'ready', 'delivered', 'cancelled')),
  created_at       timestamptz not null default now(),
  started_at       timestamptz,
  ready_at         timestamptz,
  delivered_at     timestamptz,
  cancelled_at     timestamptz,
  cancel_reason    text
);
create index if not exists order_items_session_idx on order_items (session_id);
create index if not exists order_items_restaurant_created_idx on order_items (restaurant_id, created_at);

-- Quem divide um item quando share_mode = 'custom'
-- (share_mode = 'all' divide entre todos os clientes da mesa, calculado na hora)
create table if not exists order_item_shares (
  order_item_id uuid not null references order_items(id) on delete cascade,
  guest_id      uuid not null references guests(id) on delete cascade,
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  primary key (order_item_id, guest_id)
);

create table if not exists waiter_calls (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  session_id    uuid not null references table_sessions(id) on delete cascade,
  table_id      uuid not null references tables(id) on delete cascade,
  guest_id      uuid references guests(id) on delete set null,
  type          text not null check (type in ('waiter', 'bill')),
  status        text not null default 'open' check (status in ('open', 'done')),
  created_at    timestamptz not null default now(),
  resolved_at   timestamptz,
  resolved_by   uuid references profiles(id) on delete set null
);

-- ---------------------------------------------------------------------
-- Funções auxiliares de permissão
-- ---------------------------------------------------------------------
create or replace function public.my_restaurant_id() returns uuid
language sql stable security definer set search_path = public as $$
  select restaurant_id from profiles where id = auth.uid() and active
$$;

create or replace function public.my_role() returns staff_role
language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid() and active
$$;

create or replace function public.is_superadmin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_superadmin from profiles where id = auth.uid() and active), false)
$$;

create or replace function public.is_manager() returns boolean
language sql stable security definer set search_path = public as $$
  select public.my_role() in ('owner', 'manager') or public.is_superadmin()
$$;

-- ---------------------------------------------------------------------
-- Row Level Security
-- Clientes (anônimos) NÃO acessam o banco diretamente: tudo passa pelas
-- rotas /api/m/* do servidor. Equipe acessa apenas o próprio restaurante.
-- ---------------------------------------------------------------------
alter table restaurants       enable row level security;
alter table profiles          enable row level security;
alter table stations          enable row level security;
alter table categories        enable row level security;
alter table menu_items        enable row level security;
alter table item_options      enable row level security;
alter table tables            enable row level security;
alter table table_sessions    enable row level security;
alter table guests            enable row level security;
alter table orders            enable row level security;
alter table order_items       enable row level security;
alter table order_item_shares enable row level security;
alter table waiter_calls      enable row level security;

-- restaurants
drop policy if exists restaurants_select on restaurants;
create policy restaurants_select on restaurants for select to authenticated
  using (id = my_restaurant_id() or is_superadmin());
drop policy if exists restaurants_update on restaurants;
create policy restaurants_update on restaurants for update to authenticated
  using ((id = my_restaurant_id() and is_manager()) or is_superadmin());

-- profiles (criação/edição de usuários é feita pelo servidor com service role)
drop policy if exists profiles_select on profiles;
create policy profiles_select on profiles for select to authenticated
  using (id = auth.uid() or restaurant_id = my_restaurant_id() or is_superadmin());

-- Cardápio e mesas: equipe lê, gerente/dono escreve
do $$
declare t text;
begin
  foreach t in array array['stations', 'categories', 'menu_items', 'item_options', 'tables'] loop
    execute format('drop policy if exists %1$s_select on %1$s', t);
    execute format('create policy %1$s_select on %1$s for select to authenticated
      using (restaurant_id = my_restaurant_id() or is_superadmin())', t);
    execute format('drop policy if exists %1$s_write on %1$s', t);
    execute format('create policy %1$s_write on %1$s for all to authenticated
      using ((restaurant_id = my_restaurant_id() and is_manager()) or is_superadmin())
      with check ((restaurant_id = my_restaurant_id() and is_manager()) or is_superadmin())', t);
  end loop;
end $$;

-- Operação (sessões, clientes, pedidos, chamados): qualquer membro da equipe
do $$
declare t text;
begin
  foreach t in array array['table_sessions', 'guests', 'orders', 'order_items', 'order_item_shares', 'waiter_calls'] loop
    execute format('drop policy if exists %1$s_select on %1$s', t);
    execute format('create policy %1$s_select on %1$s for select to authenticated
      using (restaurant_id = my_restaurant_id() or is_superadmin())', t);
    execute format('drop policy if exists %1$s_update on %1$s', t);
    execute format('create policy %1$s_update on %1$s for update to authenticated
      using (restaurant_id = my_restaurant_id() or is_superadmin())
      with check (restaurant_id = my_restaurant_id() or is_superadmin())', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Realtime (garçom e cozinha recebem mudanças ao vivo)
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['table_sessions', 'guests', 'orders', 'order_items', 'waiter_calls'] loop
    begin
      execute format('alter publication supabase_realtime add table %I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Storage: fotos dos pratos e logos (bucket público, pasta = restaurant_id)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('menu', 'menu', true)
on conflict (id) do nothing;

drop policy if exists menu_upload on storage.objects;
create policy menu_upload on storage.objects for insert to authenticated
  with check (bucket_id = 'menu' and (
    (storage.foldername(name))[1] = my_restaurant_id()::text or is_superadmin()));

drop policy if exists menu_modify on storage.objects;
create policy menu_modify on storage.objects for update to authenticated
  using (bucket_id = 'menu' and (
    (storage.foldername(name))[1] = my_restaurant_id()::text or is_superadmin()));

drop policy if exists menu_delete on storage.objects;
create policy menu_delete on storage.objects for delete to authenticated
  using (bucket_id = 'menu' and (
    (storage.foldername(name))[1] = my_restaurant_id()::text or is_superadmin()));

-- =====================================================================
-- v2 — funções por restaurante, planos, setores, cardápio avançado,
--      pagamentos, avaliações, estoque, combos e Web Push
-- (tudo aditivo e idempotente: pode rodar de novo sem perder dados)
-- =====================================================================

-- Restaurante: funções liga/desliga e plano
alter table restaurants add column if not exists features   jsonb not null default '{}';
alter table restaurants add column if not exists plan       text  not null default 'profissional';
alter table restaurants add column if not exists max_tables int;          -- null = ilimitado
alter table restaurants add column if not exists paid_until date;
alter table restaurants add column if not exists notes      text;
-- Identidade visual (white-label): {"primary":"#hex","cover_url","tagline","font","theme"}
alter table restaurants add column if not exists branding   jsonb not null default '{}';

-- Setores: grupos de mesas atendidos por garçons específicos
create table if not exists sectors (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  name          text not null,
  sort          int not null default 0
);
alter table tables   add column if not exists sector_id uuid references sectors(id) on delete set null;
alter table profiles add column if not exists sector_id uuid references sectors(id) on delete set null;

-- Cardápio
alter table menu_items add column if not exists tags              text[] not null default '{}'; -- vegetariano, vegano, sem_gluten, sem_lactose, picante
alter table menu_items add column if not exists featured          boolean not null default false;
alter table menu_items add column if not exists pairs_with        uuid[] not null default '{}'; -- "combina com"
alter table menu_items add column if not exists translations      jsonb not null default '{}';  -- {"en":{"name","description"},"es":{...}}
alter table menu_items add column if not exists stock_qty         int;                          -- null = sem controle de estoque
alter table menu_items add column if not exists promo_price_cents int;                          -- happy hour
alter table menu_items add column if not exists promo_days        int[];                        -- 0=domingo ... 6=sábado
alter table menu_items add column if not exists promo_start       time;
alter table menu_items add column if not exists promo_end         time;
alter table menu_items add column if not exists combo_items       jsonb not null default '[]';  -- [{"menu_item_id","name","qty"}]
alter table categories add column if not exists translations      jsonb not null default '{}';
alter table categories add column if not exists days              int[];                        -- null = todos os dias
alter table categories add column if not exists start_time        time;
alter table categories add column if not exists end_time          time;

-- Pedidos
alter table order_items add column if not exists created_by      uuid references profiles(id) on delete set null; -- garçom que lançou
alter table order_items add column if not exists discount_cents  int not null default 0;
alter table order_items add column if not exists discount_reason text;
alter table order_items add column if not exists combo_items     jsonb not null default '[]';

-- Pagamento por pessoa (fechamento de caixa)
alter table guests add column if not exists payment_method text check (payment_method in ('credito', 'debito', 'pix', 'dinheiro', 'outro'));
alter table guests add column if not exists paid_cents     int;
alter table guests add column if not exists paid_by        uuid references profiles(id) on delete set null;

-- Avaliações
create table if not exists ratings (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  session_id    uuid not null references table_sessions(id) on delete cascade,
  guest_id      uuid not null unique references guests(id) on delete cascade,
  food          int not null check (food between 1 and 5),
  service       int not null check (service between 1 and 5),
  comment       text,
  created_at    timestamptz not null default now()
);

-- Web Push (alertas com o celular bloqueado)
create table if not exists push_subscriptions (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  profile_id    uuid not null references profiles(id) on delete cascade,
  endpoint      text not null unique,
  p256dh        text not null,
  auth          text not null,
  created_at    timestamptz not null default now()
);

alter table sectors            enable row level security;
alter table ratings            enable row level security;
alter table push_subscriptions enable row level security;

drop policy if exists sectors_select on sectors;
create policy sectors_select on sectors for select to authenticated
  using (restaurant_id = my_restaurant_id() or is_superadmin());
drop policy if exists sectors_write on sectors;
create policy sectors_write on sectors for all to authenticated
  using ((restaurant_id = my_restaurant_id() and is_manager()) or is_superadmin())
  with check ((restaurant_id = my_restaurant_id() and is_manager()) or is_superadmin());

drop policy if exists ratings_select on ratings;
create policy ratings_select on ratings for select to authenticated
  using (restaurant_id = my_restaurant_id() or is_superadmin());

drop policy if exists push_own on push_subscriptions;
create policy push_own on push_subscriptions for all to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- Estoque: baixa atômica (evita vender o último item duas vezes ao mesmo tempo).
-- Retorna false se não há estoque suficiente. Só o servidor (service role) chama.
create or replace function public.consume_stock(p_item uuid, p_qty int) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  update menu_items
     set stock_qty = stock_qty - p_qty,
         available = case when stock_qty - p_qty <= 0 then false else available end
   where id = p_item and stock_qty is not null and stock_qty >= p_qty;
  if found then return true; end if;
  return exists (select 1 from menu_items where id = p_item and stock_qty is null);
end $$;

create or replace function public.restore_stock(p_item uuid, p_qty int) returns void
language sql security definer set search_path = public as $$
  update menu_items set stock_qty = stock_qty + p_qty, available = true
   where id = p_item and stock_qty is not null;
$$;

revoke all on function public.consume_stock(uuid, int) from public, anon, authenticated;
revoke all on function public.restore_stock(uuid, int) from public, anon, authenticated;

-- Realtime também para avaliações (painel do dono)
do $$
begin
  alter publication supabase_realtime add table ratings;
exception when duplicate_object then null;
end $$;

-- Limite de mesas do plano: vale para qualquer caminho (tela, API, script).
create or replace function public.enforce_table_limit() returns trigger
language plpgsql security definer set search_path = public as $$
declare lim int; total int;
begin
  if not new.active then return new; end if;
  select max_tables into lim from restaurants where id = new.restaurant_id;
  if lim is null then return new; end if;
  select count(*) into total from tables
   where restaurant_id = new.restaurant_id and active and id <> new.id;
  if total + 1 > lim then
    raise exception 'Limite do plano: no máximo % mesas ativas', lim using errcode = 'P0001';
  end if;
  return new;
end $$;

drop trigger if exists tables_limit on tables;
create trigger tables_limit before insert or update of active on tables
  for each row execute function public.enforce_table_limit();

-- =====================================================================
-- v3 — acessibilidade no atendimento
-- (aditivo e idempotente: pode rodar de novo sem perder dados)
-- =====================================================================

-- Mensagem escrita junto com o chamado (clientes que não falam ou não ouvem)
alter table waiter_calls add column if not exists message text check (char_length(message) <= 600);
-- Como o cliente prefere ser atendido: visao, fala, audicao
alter table guests add column if not exists access_needs text[] not null default '{}';

-- =====================================================================
-- v4 — planos contratados: unidades, estações e controle financeiro
-- (aditivo e idempotente: pode rodar de novo sem perder dados)
-- =====================================================================

-- Unidades do mesmo dono: aponta para o restaurante principal do grupo (null = principal/independente)
alter table restaurants add column if not exists group_id uuid references restaurants(id) on delete set null;
create index if not exists restaurants_group_idx on restaurants (group_id);

-- Limite de estações de preparo (null = ilimitado). Preenchido pelo plano na primeira vez.
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'restaurants' and column_name = 'max_stations') then
    alter table restaurants add column max_stations int;
    update restaurants set max_stations = case plan when 'essencial' then 1 when 'premium' then null else 2 end;
  end if;
end $$;

create or replace function public.enforce_station_limit() returns trigger
language plpgsql security definer set search_path = public as $$
declare lim int; total int;
begin
  select max_stations into lim from restaurants where id = new.restaurant_id;
  if lim is null then return new; end if;
  select count(*) into total from stations where restaurant_id = new.restaurant_id;
  if total + 1 > lim then
    raise exception 'Limite do plano: no máximo % estação(ões) de preparo', lim using errcode = 'P0001';
  end if;
  return new;
end $$;

drop trigger if exists stations_limit on stations;
create trigger stations_limit before insert on stations
  for each row execute function public.enforce_station_limit();

-- Custo do produto (controle financeiro): custo médio por porção, e a cópia no pedido
alter table menu_items  add column if not exists cost_cents      int check (cost_cents >= 0);
alter table order_items add column if not exists unit_cost_cents int;
