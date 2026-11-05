import { requireAdmin } from "@/lib/auth";
import { listCategories } from "@/lib/db";
import ProductForm from "../../../ui/ProductForm";

export default async function NewProduct() {
  await requireAdmin();
  const categories = listCategories({ includeHidden: true }).map(({ id, name, visible }) => ({ id, name, visible }));
  return (
    <>
      <div className="adm-head"><div><a className="adm-link" href="/admin/productos">← Productos</a><h1>Nuevo producto</h1></div></div>
      <ProductForm product={null} categories={categories} />
    </>
  );
}
