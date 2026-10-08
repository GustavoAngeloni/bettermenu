import "server-only";
import { headers } from "next/headers";
import QRCode from "qrcode";

/** URL base do app: NEXT_PUBLIC_APP_URL em produção, ou o host da requisição. */
export async function appUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export function tableUrl(base: string, qrToken: string) {
  return `${base}/m/${qrToken}`;
}

export function qrSvg(url: string) {
  return QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#1c1917", light: "#ffffff" } });
}
