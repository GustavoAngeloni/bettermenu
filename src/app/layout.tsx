import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Better Menu",
  description: "Cardápio digital, pedidos na mesa e conta dividida para restaurantes.",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#e0572b",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${inter.variable} h-full antialiased`}>
      {/* suppressHydrationWarning: extensões do navegador (ex.: ColorZilla) injetam atributos no <body> */}
      <body className="flex min-h-full flex-col" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
