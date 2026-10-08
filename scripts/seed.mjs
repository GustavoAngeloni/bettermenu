// Cria o super admin (você) e, opcionalmente, um restaurante de demonstração.
//
//   npm run seed -- --admin seu@email.com SuaSenha123
//   npm run seed -- --demo
//
// O restaurante demo tem código "demo", 8 mesas, cardápio de exemplo e os usuários
// dono / garcom / cozinha, com a senha de DEMO_PASSWORD ou uma senha aleatória exibida no final.
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Preencha NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });
const args = process.argv.slice(2);

async function must(promise, what) {
  const { data, error } = await promise;
  if (error) throw new Error(`${what}: ${error.message}`);
  return data;
}

async function createUser(email, password, profile) {
  const { data, error } = await db.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) {
    if (/already/i.test(error.message)) {
      console.log(`  (usuário ${email} já existe, mantido)`);
      return;
    }
    throw new Error(`Criar ${email}: ${error.message}`);
  }
  await must(db.from("profiles").insert({ id: data.user.id, ...profile }), `Perfil de ${email}`);
}

async function seedAdmin(email, password) {
  if (!email || !password) throw new Error("Uso: npm run seed -- --admin email senha");
  await createUser(email, password, { name: "Super Admin", is_superadmin: true });
  console.log(`✔ Super admin: entre em /login com ${email}`);
}

const DEMO_MENU = [
  {
    category: "Entradas",
    station: "Cozinha",
    items: [
      ["Batata frita com cheddar e bacon", "Porção generosa, serve 3 pessoas.", 3990, [["Cheddar extra", 600]]],
      ["Bolinho de costela", "6 unidades, com maionese da casa.", 3490, []],
      ["Pão de alho", "4 unidades na brasa.", 1890, []],
    ],
  },
  {
    category: "Pratos principais",
    station: "Cozinha",
    items: [
      ["Picanha na chapa", "400g, acompanha arroz, farofa e vinagrete. Serve 2.", 12900, [["Ovo frito", 400], ["Queijo coalho", 900]]],
      ["Risoto de cogumelos", "Arbório, shiitake, parmesão e manteiga de sálvia.", 6490, []],
      ["Hambúrguer da casa", "Blend 180g, queijo prato, cebola caramelizada e fritas.", 4590, [["Bacon", 700], ["Sem glúten (pão)", 500]]],
      ["Salmão grelhado", "Com legumes salteados e purê de batata-doce.", 7990, []],
    ],
  },
  {
    category: "Bebidas",
    station: "Bar",
    items: [
      ["Refrigerante lata", "Coca-Cola, Guaraná ou Sprite.", 790, []],
      ["Suco natural", "Laranja, limão, abacaxi com hortelã.", 1290, []],
      ["Caipirinha", "Limão, cachaça artesanal.", 2490, [["Trocar por vodka", 500]]],
      ["Chopp 500ml", "Pilsen da casa.", 1690, []],
      ["Garrafa de vinho tinto", "Malbec argentino, 750ml.", 11900, []],
    ],
  },
  {
    category: "Sobremesas",
    station: "Cozinha",
    items: [
      ["Petit gâteau", "Com sorvete de creme.", 2890, []],
      ["Pudim de leite", "Receita da vó.", 1690, []],
    ],
  },
];

async function seedDemo() {
  // Senha aleatória por padrão: o repositório é público, então não pode haver senha fixa aqui.
  const password = process.env.DEMO_PASSWORD || randomBytes(6).toString("base64url");
  const existing = await must(db.from("restaurants").select("id").eq("slug", "demo").maybeSingle(), "Buscar demo");
  if (existing) {
    console.log("Restaurante demo já existe. Para recriar, exclua-o no Supabase (tabela restaurants).");
    return;
  }
  const restaurant = await must(
    db.from("restaurants").insert({ name: "Restaurante Demo", slug: "demo", service_fee_pct: 10 }).select().single(),
    "Criar restaurante",
  );
  const rid = restaurant.id;
  const stations = await must(
    db.from("stations").insert([{ restaurant_id: rid, name: "Cozinha", sort: 0 }, { restaurant_id: rid, name: "Bar", sort: 1 }]).select(),
    "Estações",
  );
  const stationId = (name) => stations.find((s) => s.name === name).id;

  for (const [ci, cat] of DEMO_MENU.entries()) {
    const category = await must(
      db.from("categories").insert({ restaurant_id: rid, name: cat.category, station_id: stationId(cat.station), sort: ci }).select().single(),
      "Categoria",
    );
    for (const [ii, [name, description, price, options]] of cat.items.entries()) {
      const item = await must(
        db
          .from("menu_items")
          .insert({ restaurant_id: rid, category_id: category.id, name, description, price_cents: price, sort: ii })
          .select()
          .single(),
        "Prato",
      );
      if (options.length) {
        await must(
          db.from("item_options").insert(
            options.map(([oname, oprice], oi) => ({ restaurant_id: rid, menu_item_id: item.id, name: oname, price_cents: oprice, sort: oi })),
          ),
          "Adicionais",
        );
      }
    }
  }

  await must(db.from("tables").insert(Array.from({ length: 8 }, (_, i) => ({ restaurant_id: rid, number: i + 1 }))), "Mesas");

  for (const [username, name, role] of [
    ["dono", "Dono Demo", "owner"],
    ["garcom", "Garçom Demo", "waiter"],
    ["cozinha", "Cozinha Demo", "kitchen"],
  ]) {
    await createUser(`${username}@demo.staff.bettermenu.app`, password, { restaurant_id: rid, name, username, role });
  }

  const tables = await must(db.from("tables").select("number, qr_token").eq("restaurant_id", rid).order("number"), "Listar mesas");
  console.log("✔ Restaurante demo criado (código: demo)");
  console.log(`  Logins: dono / garcom / cozinha  ·  senha: ${password}`);
  console.log(`  Mesa 1 (cliente): /m/${tables[0].qr_token}`);
}

try {
  if (args[0] === "--admin") await seedAdmin(args[1], args[2]);
  else if (args[0] === "--demo") await seedDemo();
  else console.log("Uso:\n  npm run seed -- --admin email senha\n  npm run seed -- --demo");
} catch (err) {
  console.error("✖", err.message);
  process.exitCode = 1;
}
