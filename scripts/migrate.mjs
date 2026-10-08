// Aplica supabase/schema.sql no banco. Uso: npm run db:migrate
// Requer SUPABASE_DB_URL no .env.local (Supabase > Project Settings > Database > Connection string).
import { readFileSync } from "node:fs";
import postgres from "postgres";

const url = process.env.SUPABASE_DB_URL;
if (!url) {
  console.error("Defina SUPABASE_DB_URL no .env.local, ou cole supabase/schema.sql no SQL Editor do Supabase.");
  process.exit(1);
}

const sql = postgres(url, { ssl: "require", max: 1, onnotice: () => {} });
try {
  await sql.unsafe(readFileSync(new URL("../supabase/schema.sql", import.meta.url), "utf8"));
  console.log("✔ Schema aplicado.");
} catch (err) {
  console.error("✖ Erro ao aplicar o schema:", err.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
