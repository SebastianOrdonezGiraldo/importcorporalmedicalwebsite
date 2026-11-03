import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCategory, listCategories, listProducts } from "@/lib/db";
import CatalogView from "@/components/CatalogView";
import { mediaUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ q?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = getCategory({ slug: (await params).slug });
  if (!c || !c.visible) return {};
  return { title: c.name, description: c.description || undefined, openGraph: { images: [mediaUrl(c.image)] } };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const c = getCategory({ slug: (await params).slug });
  if (!c || !c.visible) notFound();
  const q = String((await searchParams).q ?? "").trim().slice(0, 80);
  return (
    <CatalogView
      categories={listCategories()}
      products={listProducts({ categoryId: c.id, search: q || undefined })}
      active={c}
      q={q}
    />
  );
}
