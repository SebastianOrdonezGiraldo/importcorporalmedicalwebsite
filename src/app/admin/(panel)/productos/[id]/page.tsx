import { notFound } from "next/navigation";
import { getProduct, listCategories } from "@/lib/db";
import { mediaUrl } from "@/lib/site";
import ProductForm from "../../../ui/ProductForm";

export default async function EditProduct({ params }: { params: Promise<{ id: string }> }) {
  const p = getProduct({ id: Number((await params).id) });
  if (!p) notFound();
  const categories = listCategories({ includeHidden: true }).map(({ id, name, visible }) => ({ id, name, visible }));
  const { categoryName: _n, categorySlug: _s, categoryVisible: _v, ...product } = p;
  return (
    <>
      <div className="adm-head"><div><a className="adm-link" href="/admin/productos">← Productos</a><h1>{p.name}</h1></div></div>
      <ProductForm product={{ ...product, imageUrl: p.image ? mediaUrl(p.image) : null }} categories={categories} />
    </>
  );
}
