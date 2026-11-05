import "server-only";
import type { Metadata, MetadataRoute } from "next";
import type { Category, ProductWithCategory } from "./db";
import { SITE, assetUrl, mediaUrl } from "./site";
import { isProductPublished } from "./product-visibility";

if (process.env.NODE_ENV === "production" && (!process.env.SITE_URL || ["localhost", "127.0.0.1", "[::1]"].includes(new URL(SITE.url).hostname))) {
  throw new Error("Configura SITE_URL con la URL pública del portal antes de compilar en producción.");
}

export const SOCIAL_IMAGE = assetUrl("/img/seo/site-card.png");
export const absoluteUrl = (pathname: string) => new URL(pathname, `${SITE.url}/`).toString();
export const searchText = (params: Record<string, string | string[] | undefined>) => String(params.q ?? "").trim().slice(0, 80);

export function pageMetadata({ title, description, pathname, image, noindex = false }: {
  title: string; description: string; pathname: string; image?: string; noindex?: boolean;
}): Metadata {
  const url = absoluteUrl(pathname);
  const fullTitle = `${title} · ${SITE.name}`;
  const picture = image ? { url: absoluteUrl(image), alt: title } : {
    url: absoluteUrl(SOCIAL_IMAGE), width: 1200, height: 630, alt: `${SITE.name}: equipos de fisioterapia y rehabilitación`,
  };
  return {
    title, description, alternates: { canonical: url },
    robots: { index: !noindex, follow: true },
    openGraph: { title: fullTitle, description, url, siteName: SITE.name, locale: "es_CO", type: "website", images: [picture] },
    twitter: { card: "summary_large_image", title: fullTitle, description, images: [picture.url] },
  };
}

export function buildSitemap(categories: Category[], products: ProductWithCategory[]): MetadataRoute.Sitemap {
  const fixed = ["/", "/catalogo", "/politica-de-privacidad", "/terminos-y-condiciones", "/cambios-devoluciones-y-garantias"];
  return [
    ...fixed.map((pathname) => ({ url: absoluteUrl(pathname) })),
    ...categories.filter((c) => c.visible).map((c) => ({
      url: absoluteUrl(`/catalogo/${encodeURIComponent(c.slug)}`),
      ...(c.image ? { images: [absoluteUrl(mediaUrl(c.image))] } : {}),
    })),
    ...products.filter(isProductPublished).map((p) => {
      const modified = new Date(p.updatedAt.replace(" ", "T") + (/Z$|[+-]\d\d:\d\d$/.test(p.updatedAt) ? "" : "Z"));
      return {
        url: absoluteUrl(`/producto/${encodeURIComponent(p.slug)}`),
        ...(Number.isFinite(modified.getTime()) ? { lastModified: modified } : {}),
        ...(p.image ? { images: [absoluteUrl(mediaUrl(p.image))] } : {}),
      };
    }),
  ];
}

export function breadcrumbData(items: { name: string; pathname: string }[]) {
  return { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: items.map((item, i) => ({
    "@type": "ListItem", position: i + 1, name: item.name, item: absoluteUrl(item.pathname),
  })) };
}
export function organizationData() {
  return {
    "@context": "https://schema.org", "@type": "Organization", "@id": absoluteUrl("/#organization"),
    name: SITE.name, legalName: SITE.legalName, url: absoluteUrl("/"), logo: absoluteUrl(assetUrl("/img/logo.png")),
    telephone: `+${SITE.whatsapp}`, email: SITE.email,
  };
}
export const jsonLd = (data: unknown) => JSON.stringify(data).replace(/</g, "\\u003c");
