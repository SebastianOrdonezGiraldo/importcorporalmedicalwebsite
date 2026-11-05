import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { SITE, assetUrl } from "@/lib/site";
import { SOCIAL_IMAGE, absoluteUrl } from "@/lib/seo";
import "./site.css";
import "./catalog.css";

const displayFont = localFont({ src: "./fonts/red-hat-display-latin.woff2", weight: "500 900", display: "swap", variable: "--font-red-hat-display" });
const bodyFont = localFont({ src: "./fonts/red-hat-text-latin.woff2", weight: "400 700", display: "swap", variable: "--font-red-hat-text" });
const markFont = localFont({ src: "./fonts/poiret-one-latin.woff2", weight: "400", display: "swap", variable: "--font-poiret-one" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: SITE.name, template: `%s · ${SITE.name}` },
  description: SITE.description,
  icons: {
    icon: { url: assetUrl("/img/seo/favicon.png"), type: "image/png", sizes: "192x192" },
    apple: { url: assetUrl("/img/seo/apple-touch-icon.png"), type: "image/png", sizes: "180x180" },
  },
  openGraph: { siteName: SITE.name, locale: "es_CO", type: "website", images: [{ url: absoluteUrl(SOCIAL_IMAGE), width: 1200, height: 630, alt: SITE.name }] },
  twitter: { card: "summary_large_image", images: [absoluteUrl(SOCIAL_IMAGE)] },
  verification: { google: process.env.GOOGLE_SITE_VERIFICATION || undefined },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#6e2378" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${displayFont.variable} ${bodyFont.variable} ${markFont.variable}`}>
      <body>{children}</body>
    </html>
  );
}
