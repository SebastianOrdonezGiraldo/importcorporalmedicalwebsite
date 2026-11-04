import type { Metadata } from "next";
import { pageMetadata, searchText } from "@/lib/seo";
import { countPublicProducts, listCategories, listProducts } from "@/lib/db";
import CatalogView from "@/components/CatalogView";

export const dynamic = "force-dynamic";
type Props = { searchParams: Promise<{ q?: string }> };
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const q = searchText(await searchParams);
  return pageMetadata({
    title: q ? "Resultados de búsqueda | Catálogo" : "Catálogo de fisioterapia y rehabilitación",
    description: "Explora equipos de fisioterapia, rehabilitación, masaje y recuperación. Consulta precios y disponibilidad con Import Corporal Medical en Colombia.",
    pathname: "/catalogo", noindex: !!q,
  });
}

export default async function CatalogPage({ searchParams }: Props) {
  const q = searchText(await searchParams);
  return <CatalogView categories={listCategories()} products={listProducts({ search: q || undefined })} active={null} q={q} total={countPublicProducts()} />;
}
