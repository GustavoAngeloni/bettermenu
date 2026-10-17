// Prévia local dos e-mails com dados de exemplo: node scripts/emails/preview.mjs [pasta] [APP_URL]
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { templates } from "./templates.mjs";

const out = process.argv[2] ?? "emails-preview";
const appUrl = process.argv[3] ?? "http://localhost:3000";
const sample = {
  NOME: "Marina", RESTAURANTE: "Bistrô Aurora", PLANO: "Profissional", CICLO: "anual", VALOR: "R$ 2.838,60", CODIGO: "bistro-aurora", USUARIO: "marina",
  LINK_LOGIN: `${appUrl}/login?codigo=bistro-aurora&usuario=marina`, PROXIMA_COBRANCA: "17/10/2027", LINK: `${appUrl}/redefinir-senha?token=exemplo`, VALIDADE: "1 hora",
  FUNCAO: "Garçom", CONVIDADO_POR: "Marina", LINK_DEFINIR: `${appUrl}/redefinir-senha?token=exemplo`, ACESSO_ATE: "17/11/2026",
};
mkdirSync(out, { recursive: true });
for (const t of templates(appUrl)) {
  const fill = (s) => s.replace(/\{\{\{(\w+)\}\}\}/g, (_, k) => sample[k] ?? `[${k}]`);
  writeFileSync(path.join(out, `${t.alias}.html`), fill(t.html));
  console.log(`${t.alias}  ·  ${fill(t.subject)}`);
}
