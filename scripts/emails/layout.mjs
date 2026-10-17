// Moldura dos e-mails do Better Menu: tabelas e estilos inline (compatível com Gmail, Outlook e Apple Mail).
// Variáveis do Resend em {{{NOME}}}. As imagens vêm do site publicado (APP_URL).

const C = { ink: "#1d1714", text: "#3a322d", muted: "#7a6f68", line: "#ece4dd", paper: "#f4efe9", brasa: "#e0572b", dark: "#16120f", peach: "#ffb79c" };
const SANS = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";
const SERIF = "Georgia,'Times New Roman',serif";

export function button(label, href) {
  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:28px 0 8px"><tr><td style="border-radius:14px;background:${C.brasa}"><a href="${href}" style="display:inline-block;padding:16px 28px;font-family:${SANS};font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:14px">${label} &rarr;</a></td></tr></table>`;
}

export function p(html, extra = "") {
  return `<p style="margin:0 0 16px;font-family:${SANS};font-size:16px;line-height:1.6;color:${C.text};${extra}">${html}</p>`;
}

export function small(html) {
  return `<p style="margin:16px 0 0;font-family:${SANS};font-size:13px;line-height:1.55;color:${C.muted}">${html}</p>`;
}

/** Cartão com pares rótulo/valor (dados de acesso, valores). */
export function card(rows, { mono = false } = {}) {
  const tr = rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:12px 18px;border-top:1px solid ${C.line};font-family:${SANS};font-size:13px;color:${C.muted};width:42%">${k}</td><td style="padding:12px 18px;border-top:1px solid ${C.line};font-family:${mono ? "'SFMono-Regular',Menlo,Consolas,monospace" : SANS};font-size:${mono ? 17 : 15}px;font-weight:700;color:${C.ink}">${v}</td></tr>`,
    )
    .join("");
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:8px 0 8px;border:1px solid ${C.line};border-radius:16px;border-collapse:separate;overflow:hidden;background:#fbf8f5">${tr.replace(`border-top:1px solid ${C.line};`, "").replace(`border-top:1px solid ${C.line};`, "")}</table>`;
}

/** Lista numerada de próximos passos. */
export function steps(items) {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:8px 0 16px">${items
    .map(
      ([t, d], i) =>
        `<tr><td valign="top" style="padding:0 14px 14px 0;width:30px"><div style="width:28px;height:28px;border-radius:14px;background:${C.dark};color:#fff;font-family:${SANS};font-size:13px;font-weight:700;line-height:28px;text-align:center">${i + 1}</div></td><td valign="top" style="padding:3px 0 14px;font-family:${SANS};font-size:15px;line-height:1.5;color:${C.text}"><strong style="color:${C.ink}">${t}</strong><br>${d}</td></tr>`,
    )
    .join("")}</table>`;
}

export function layout({ appUrl, preheader, kicker, title, body, footerNote }) {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><title>${title.replace(/<[^>]+>/g, "")}</title></head>
<body style="margin:0;padding:0;background:${C.paper}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${preheader}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${C.paper}"><tr><td align="center" style="padding:28px 12px">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px">
  <tr><td style="background:${C.dark};border-radius:22px 22px 0 0;padding:26px 32px">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr>
      <td style="padding-right:12px"><img src="${appUrl}/apple-icon" width="40" height="40" alt="" style="display:block;border-radius:11px"></td>
      <td style="font-family:${SERIF};font-size:24px;font-weight:700;color:#ffffff;letter-spacing:-0.5px">better<span style="font-weight:400;font-style:italic">menu</span></td>
    </tr></table>
  </td></tr>
  <tr><td style="background:#ffffff;padding:36px 32px 32px;border-radius:0 0 22px 22px">
    <p style="margin:0 0 10px;font-family:${SANS};font-size:12px;font-weight:700;letter-spacing:1.6px;text-transform:uppercase;color:${C.brasa}">${kicker}</p>
    <h1 style="margin:0 0 20px;font-family:${SERIF};font-size:32px;line-height:1.12;font-weight:700;color:${C.ink};letter-spacing:-0.5px">${title}</h1>
    ${body}
  </td></tr>
  <tr><td style="padding:24px 32px 8px;font-family:${SANS};font-size:12px;line-height:1.6;color:${C.muted};text-align:center">
    ${footerNote ?? "Dúvidas? É só responder este e-mail."}<br>
    <span style="color:${C.ink};font-weight:600">Better Menu</span> &middot; cardápio digital, pedidos na mesa e conta dividida<br>
    <span style="display:inline-block;margin-top:10px">uma solução <img src="${appUrl}/brand/insight-dark-ink.png" height="13" alt="insight" style="vertical-align:-2px"></span>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}
