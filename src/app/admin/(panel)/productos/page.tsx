import { listCategories, listProducts } from "@/lib/db";
import { mediaUrl } from "@/lib/site";
import { getProductPublicationState, isProductPublished } from "@/lib/product-visibility";
import { deleteProductAction, toggleProductVisible } from "../../actions";
import ConfirmSubmit from "../../ui/ConfirmSubmit";
import Flash from "../../ui/Flash";

type Props = { searchParams: Promise<{ q?: string; linea?: string; ok?: string }> };

export default async function ProductsAdmin({ searchParams }: Props) {
  const sp = await searchParams;
  const q = String(sp.q ?? "").trim().slice(0, 80);
  const categories = listCategories({ includeHidden: true });
  const lineaId = Number(sp.linea) || undefined;
  const products = listProducts({ includeHidden: true, search: q || undefined, categoryId: lineaId });
  const visibleCount = products.filter(isProductPublished).length;
  const hiddenByLineCount = products.filter((p) => getProductPublicationState(p) === "hidden-by-category").length;

  return (
    <>
      <div className="adm-head">
        <div>
          <h1>Productos</h1>
          <p>{products.length} en la lista · {visibleCount} publicados en el sitio{hiddenByLineCount > 0 && ` · ${hiddenByLineCount} ocultos por su línea`}</p>
        </div>
        <a className="btn btn-violet" href="/admin/productos/nuevo">+ Nuevo producto</a>
      </div>
      <Flash ok={sp.ok} />

      <form className="adm-filters" role="search">
        <input type="search" name="q" defaultValue={q} placeholder="Buscar por nombre, marca o resumen" aria-label="Buscar" />
        <select name="linea" defaultValue={lineaId ?? ""} aria-label="Filtrar por línea">
          <option value="">Todas las líneas</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button className="adm-btn" type="submit">Filtrar</button>
        {(q || lineaId) && <a className="adm-link" href="/admin/productos">Limpiar</a>}
      </form>

      {products.length === 0 ? (
        <p className="adm-empty">No hay productos{q || lineaId ? " con ese filtro" : ""}. <a href="/admin/productos/nuevo">Crea el primero</a>.</p>
      ) : (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr><th></th><th>Producto</th><th>Línea</th><th>Orden</th><th>Estado</th><th><span className="sr">Acciones</span></th></tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const state = getProductPublicationState(p);
                const published = isProductPublished(p);
                return (
                  <tr key={p.id} id={`p${p.id}`} className={published ? "" : "is-hidden"}>
                    <td><img className="adm-thumb" src={mediaUrl(p.image)} alt="" loading="lazy" /></td>
                    <td>
                      <a className="adm-name" href={`/admin/productos/${p.id}`}>{p.name}</a>
                      <small>{[p.brand, p.badge].filter(Boolean).join(" · ") || " "}</small>
                    </td>
                    <td>{p.categoryName ?? <em className="adm-muted">Sin línea</em>}</td>
                    <td>{p.sortOrder}</td>
                    <td>
                      <span className={`adm-pill ${published ? "on" : state === "hidden-by-category" ? "blocked" : "off"}`}>
                        {published ? "Publicado" : state === "hidden-by-category" ? "Oculto por su línea" : "Oculto"}
                      </span>
                      <form action={toggleProductVisible}>
                        <input type="hidden" name="id" value={p.id} />
                        <button type="submit" className="adm-visibility-toggle" aria-label={`${p.visible ? "Ocultar" : "Activar"} producto ${p.name}`} title={!p.visible && p.categoryVisible === false ? "Activar el producto; seguirá oculto mientras su línea esté oculta." : undefined}>
                          {p.visible ? "Ocultar producto" : "Activar producto"}
                        </button>
                      </form>
                      {p.featured && <span className="adm-pill star">Destacado</span>}
                    </td>
                    <td className="adm-row-actions">
                      <a href={`/admin/productos/${p.id}`}>Editar</a>
                      {published && <a href={`/producto/${p.slug}`} target="_blank" rel="noopener">Ver</a>}
                      <form action={deleteProductAction}>
                        <input type="hidden" name="id" value={p.id} />
                        <ConfirmSubmit className="danger" message={`¿Eliminar “${p.name}”? Esta acción no se puede deshacer.`}>Eliminar</ConfirmSubmit>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
