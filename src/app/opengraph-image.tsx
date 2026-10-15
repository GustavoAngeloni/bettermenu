import { ImageResponse } from "next/og";

export const alt = "Better Menu: cardápio digital com QR Code, pedidos na mesa e conta dividida";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Imagem dos links compartilhados (WhatsApp, Instagram, LinkedIn, buscadores). */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: "#16120f", color: "#fff", position: "relative" }}>
        <div style={{ position: "absolute", right: -160, top: -200, width: 720, height: 720, borderRadius: 360, background: "radial-gradient(closest-side, rgba(224,87,43,0.75), rgba(224,87,43,0))" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <div style={{ width: 72, height: 72, borderRadius: 20, background: "#e0572b", display: "flex", position: "relative" }}>
            <div style={{ position: "absolute", left: 19, top: 13, width: 8, height: 44, borderRadius: 4, background: "#fff" }} />
            <div style={{ position: "absolute", left: 26, top: 29, width: 26, height: 26, borderRadius: 13, border: "8px solid #fff" }} />
            <div style={{ position: "absolute", left: 50, top: 14, width: 10, height: 10, borderRadius: 5, background: "#fff" }} />
          </div>
          <div style={{ fontSize: 44, fontWeight: 700, letterSpacing: -1 }}>better menu</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 76, fontWeight: 700, lineHeight: 1.04, letterSpacing: -2, maxWidth: 900 }}>O cardápio que deixa a mesa com vontade de pedir.</div>
          <div style={{ marginTop: 28, fontSize: 30, color: "rgba(255,255,255,0.72)", maxWidth: 940 }}>
            QR Code na mesa · pedidos direto para a cozinha · conta dividida · acessível para todos
          </div>
        </div>
        <div style={{ display: "flex", gap: 14, fontSize: 24, color: "#ffb79c" }}>
          <span>Português</span>
          <span>·</span>
          <span>English</span>
          <span>·</span>
          <span>Español</span>
          <span>·</span>
          <span>Libras</span>
        </div>
      </div>
    ),
    size,
  );
}
