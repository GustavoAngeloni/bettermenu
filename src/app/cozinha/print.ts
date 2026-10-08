import type { OrderItem } from "@/lib/types";
import { formatTime } from "@/lib/time";

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/**
 * Imprime a comanda em formato de impressora térmica (80mm) usando um iframe oculto.
 * O navegador mostra a janela de impressão; para imprimir sem confirmação,
 * abra o Chrome da cozinha com a opção --kiosk-printing.
 */
export function printTicket({
  restaurantName,
  tableNumber,
  guestName,
  items,
}: {
  restaurantName: string;
  tableNumber?: number;
  guestName?: string;
  items: OrderItem[];
}) {
  const lines = items
    .filter((i) => i.status !== "cancelled")
    .map(
      (i) => `
      <div class="item">
        <div class="name">${i.qty}x ${esc(i.name)}</div>
        ${i.options.length ? `<div class="sub">+ ${esc(i.options.map((o) => o.name).join(", "))}</div>` : ""}
        ${i.combo_items?.length ? `<div class="sub">Combo: ${esc(i.combo_items.map((c) => `${c.qty * i.qty}x ${c.name}`).join(" + "))}</div>` : ""}
        ${i.note ? `<div class="note">** ${esc(i.note)} **</div>` : ""}
      </div>`,
    )
    .join("");

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Comanda</title>
    <style>
      @page { size: 80mm auto; margin: 3mm; }
      body { font-family: ui-monospace, Menlo, Consolas, monospace; width: 74mm; margin: 0; color: #000; }
      .head { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 4px; margin-bottom: 6px; }
      .table { font-size: 26px; font-weight: 800; }
      .meta { font-size: 12px; }
      .item { margin: 6px 0; }
      .name { font-size: 17px; font-weight: 700; }
      .sub { font-size: 13px; }
      .note { font-size: 14px; font-weight: 700; margin-top: 2px; }
      .foot { border-top: 1px dashed #000; margin-top: 8px; padding-top: 4px; font-size: 11px; text-align: center; }
    </style></head><body>
      <div class="head">
        <div class="meta">${esc(restaurantName)}</div>
        <div class="table">MESA ${tableNumber ?? "?"}</div>
        <div class="meta">${esc(guestName ?? "")} · ${items[0] ? formatTime(items[0].created_at) : ""}</div>
      </div>
      ${lines}
      <div class="foot">Better Menu</div>
    </body></html>`;

  const frame = document.createElement("iframe");
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
  document.body.appendChild(frame);
  const doc = frame.contentDocument!;
  doc.open();
  doc.write(html);
  doc.close();
  setTimeout(() => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    setTimeout(() => frame.remove(), 1000);
  }, 50);
}
