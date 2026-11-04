import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { countPublicProducts, resolveCategorySlug, listCategories, listProducts } from "@/lib/db";
import { withSearchParams, type PageSearchParams } from "@/lib/redirect-url";
import CatalogView from "@/components/CatalogView";
import { mediaUrl } from "@/lib/site";
import { pageMetadata, searchText, breadcrumbData, jsonLd } from "@/lib/seo";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<PageSearchParams> };

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const c = resolveCategorySlug((await params).slug);
  if (!c || !c.visible) return { robots: { index: false, follow: true } };
  return pageMetadata({ title: `${c.name} | Catálogo`, description: c.description || `Conoce los productos de ${c.name} de Import Corporal Medical. Consulta precios y disponibilidad con nuestros asesores.`,
    pathname: `/catalogo/${encodeURIComponent(c.slug)}`, image: c.image ? mediaUrl(c.image) : undefined, noindex: !!searchText(await searchParams) });
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const slug = (await params).slug;
  const c = resolveCategorySlug(slug);
  if (!c || !c.visible) notFound();
  const search = await searchParams;
  if (c.slug !== slug) permanentRedirect(withSearchParams(`/catalogo/${encodeURIComponent(c.slug)}`, search));
  const q = searchText(search);
  return (
    <>
    <CatalogView
      categories={listCategories()}
      products={listProducts({ categoryId: c.id, search: q || undefined })}
      active={c}
      q={q}
      total={countPublicProducts()}
    />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbData([
      { name: "Inicio", pathname: "/" }, { name: "Catálogo", pathname: "/catalogo" },
      { name: c.name, pathname: `/catalogo/${encodeURIComponent(c.slug)}` },
    ])) }} />
    </>
  );
}
