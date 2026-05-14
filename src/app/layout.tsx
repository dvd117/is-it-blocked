import type { Metadata, Viewport } from "next";
import Providers from "./providers";
import "./globals.css";
import "./styles/phase-indicator.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://bloqueado.aragort.com"),
  title: "¿Está Bloqueado?",
  description: "Check if a website may be blocked by Venezuelan ISPs",
  openGraph: {
    title: "¿Está Bloqueado?",
    description: "Censorship evidence for Venezuelan internet users",
    images: [
      {
        url: "/repo-card.png",
        width: 1280,
        height: 640,
        alt: "Is It Blocked? Censorship evidence for Venezuelan internet users",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "¿Está Bloqueado?",
    description: "Censorship evidence for Venezuelan internet users",
    images: ["/repo-card.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" data-theme="dark">
      <body><Providers>{children}</Providers></body>
    </html>
  );
}
