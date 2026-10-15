import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Ícone da tela inicial do iPhone (o iOS não usa SVG). */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#e0572b", position: "relative" }}>
        <div style={{ position: "absolute", left: 47, top: 34, width: 21, height: 110, borderRadius: 11, background: "#fff" }} />
        <div style={{ position: "absolute", left: 66, top: 75, width: 62, height: 62, borderRadius: 31, border: "21px solid #fff" }} />
        <div style={{ position: "absolute", left: 124, top: 35, width: 24, height: 24, borderRadius: 12, background: "#fff" }} />
      </div>
    ),
    size,
  );
}
