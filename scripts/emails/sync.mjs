// Publica os e-mails do Better Menu no Resend: templates, evento de boas-vindas e automação.
// Usa o CLI oficial (npm i -g resend-cli; resend login), então a chave fica só no seu computador.
//
//   node scripts/emails/sync.mjs --app-url https://SEU-DOMINIO [--from "Better Menu <ola@seudominio.com.br>"]
//
// Pode rodar de novo quando mudar um texto: atualiza e republica (não duplica nada).
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { onboardingAutomation, templates } from "./templates.mjs";

const arg = (name) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
};
const appUrl = (arg("app-url") ?? process.env.APP_URL ?? "").replace(/\/$/, "");
const from = arg("from") ?? process.env.EMAIL_FROM;
if (!appUrl.startsWith("http")) {
  console.error('Informe o endereço do site: --app-url https://SEU-DOMINIO (as imagens e links dos e-mails usam ele).');
  process.exit(1);
}

function resend(args, { allowFail = false } = {}) {
  try {
    const out = execFileSync("resend", [...args, "--json"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    return out.trim() ? JSON.parse(out) : {};
  } catch (e) {
    const msg = (e.stderr || e.stdout || e.message || "").toString();
    if (allowFail) return { error: msg };
    throw new Error(`resend ${args.slice(0, 2).join(" ")}: ${msg.slice(0, 400)}`);
  }
}

// 1. Login e domínio
const domains = resend(["domains", "list"], { allowFail: true });
if (domains.error) {
  console.error("O CLI do Resend não está logado. Rode: resend login");
  process.exit(1);
}
const list = domains.data ?? [];
console.log(`Domínios no Resend: ${list.map((d) => `${d.name} (${d.status})`).join(", ") || "nenhum"}`);
if (!list.some((d) => d.status === "verified")) console.warn("⚠ Nenhum domínio verificado: o Resend só entrega para o seu próprio e-mail até verificar um domínio.");

// 2. Templates
const dir = mkdtempSync(path.join(tmpdir(), "bm-emails-"));
const ids = {};
for (const t of templates(appUrl)) {
  const html = path.join(dir, `${t.alias}.html`);
  const text = path.join(dir, `${t.alias}.txt`);
  writeFileSync(html, t.html);
  writeFileSync(text, t.text);
  const vars = t.vars.flatMap(([k, type, fb]) => ["--var", fb === undefined || fb === "" ? `${k}:${type}` : `${k}:${type}:${fb}`]);
  const common = ["--name", t.name, "--subject", t.subject, "--html-file", html, "--text-file", text, ...vars, ...(from ? ["--from", from] : [])];
  const existing = resend(["templates", "get", t.alias], { allowFail: true });
  let id = existing.id;
  if (id) {
    resend(["templates", "update", id, ...common]);
  } else {
    id = resend(["templates", "create", "--alias", t.alias, ...common]).id;
  }
  resend(["templates", "publish", id]);
  ids[t.alias] = id;
  console.log(`✓ ${t.alias}  (${id})`);
}

// 3. Evento que dispara a série de boas-vindas
const EVENT = "bm.assinatura.aprovada";
const events = resend(["events", "list", "--limit", "100"], { allowFail: true });
if (!(events.data ?? []).some((e) => e.name === EVENT)) {
  resend(["events", "create", "--name", EVENT, "--schema", JSON.stringify({ nome: "string", restaurante: "string", plano: "string", link_login: "string" })]);
  console.log(`✓ evento ${EVENT} criado`);
} else console.log(`✓ evento ${EVENT} já existe`);

// 4. Automação (cria uma vez; depois é editada no painel do Resend)
const flow = onboardingAutomation(ids);
const autos = resend(["automations", "list", "--limit", "100"], { allowFail: true });
const found = (autos.data ?? []).find((a) => a.name === flow.name);
if (found) {
  console.log(`✓ automação já existe (${found.id}). Para recriar, apague no painel e rode de novo.`);
} else {
  const file = path.join(dir, "automacao.json");
  writeFileSync(file, JSON.stringify(flow));
  const created = resend(["automations", "create", "--file", file]);
  console.log(`✓ automação criada e ligada (${created.id})`);
}
console.log("\nPronto. Confira em https://resend.com/templates e https://resend.com/automations");
