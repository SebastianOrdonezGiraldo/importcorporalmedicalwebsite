import type { Metadata, Viewport } from "next";
import { SITE } from "@/lib/site";
import "./site.css";
import "./catalog.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: SITE.name, template: `%s · ${SITE.name}` },
  description: SITE.description,
  icons: { icon: "/img/logo.png" },
  openGraph: { siteName: SITE.name, locale: "es_CO", type: "website", images: ["/img/logo.png"] },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#6e2378" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poiret+One&family=Red+Hat+Display:wght@500;700;800;900&family=Red+Hat+Text:wght@400;500;600&display=swap" />
      </head>
      <body>{children}</body>
    </html>
  );
}
