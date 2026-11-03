import type { Metadata } from "next";
import { listCategories, listProducts } from "@/lib/db";
import CatalogView from "@/components/CatalogView";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Catálogo",
  description: "Catálogo de equipos de fisioterapia, rehabilitación, masaje y recuperación de Import Corporal Medical.",
};

export default async function CatalogPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = String((await searchParams).q ?? "").trim().slice(0, 80);
  return <CatalogView categories={listCategories()} products={listProducts({ search: q || undefined })} active={null} q={q} />;
}
