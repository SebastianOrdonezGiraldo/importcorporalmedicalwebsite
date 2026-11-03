import { listCategories } from "@/lib/db";
import ProductForm from "../../../ui/ProductForm";

export default function NewProduct() {
  const categories = listCategories({ includeHidden: true }).map(({ id, name }) => ({ id, name }));
  return (
    <>
      <div className="adm-head"><div><a className="adm-link" href="/admin/productos">← Productos</a><h1>Nuevo producto</h1></div></div>
      <ProductForm product={null} categories={categories} />
    </>
  );
}
