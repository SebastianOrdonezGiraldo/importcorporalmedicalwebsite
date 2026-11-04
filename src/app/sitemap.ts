import type { MetadataRoute } from "next";
import { listCategories, listProducts } from "@/lib/db";
import { buildSitemap } from "@/lib/seo";

// Changes in publication and slugs must be reflected without waiting for a deployment.
export const dynamic = "force-dynamic";
export default function sitemap(): MetadataRoute.Sitemap {
  return buildSitemap(listCategories(), listProducts());
}
