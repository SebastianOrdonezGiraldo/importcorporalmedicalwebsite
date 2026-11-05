import { requireAdmin } from "@/lib/auth";
import { listCategories } from "@/lib/db";
import { mediaUrl } from "@/lib/site";
import { deleteCategoryAction } from "../../actions";
import ConfirmSubmit from "../../ui/ConfirmSubmit";
import Flash from "../../ui/Flash";

export default async function LinesAdmin({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  await requireAdmin();
  const { ok } = await searchParams;
  const cats = listCategories({ includeHidden: true });
  return (
    <>
      <div className="adm-head">
        <div>
          <h1>Líneas de producto</h1>
          <p>Son las tarjetas del catálogo en la portada. Ocultar una línea también oculta sus productos.</p>
        </div>
        <a className="btn btn-violet" href="/admin/lineas/nuevo">+ Nueva línea</a>
      </div>
      <Flash ok={ok} />
      <div className="adm-table-wrap">
        <table className="adm-table">
          <thead><tr><th></th><th>Línea</th><th>Productos</th><th>Orden</th><th>Estado</th><th><span className="sr">Acciones</span></th></tr></thead>
          <tbody>
            {cats.map((c) => (
              <tr key={c.id} className={c.visible ? "" : "is-hidden"}>
                <td><img className="adm-thumb" src={mediaUrl(c.image)} alt="" /></td>
                <td><a className="adm-name" href={`/admin/lineas/${c.id}`}>{c.name}</a><small>{c.tags.join(" · ") || " "}</small></td>
                <td><a href={`/admin/productos?linea=${c.id}`}>{c.productCount}</a></td>
                <td>{c.sortOrder}</td>
                <td><span className={`adm-pill ${c.visible ? "on" : "off"}`}>{c.visible ? "Visible" : "Oculta"}</span></td>
                <td className="adm-row-actions">
                  <a href={`/admin/lineas/${c.id}`}>Editar</a>
                  {c.visible && <a href={`/catalogo/${c.slug}`} target="_blank" rel="noopener">Ver en el sitio</a>}
                  <form action={deleteCategoryAction}>
                    <input type="hidden" name="id" value={c.id} />
                    <ConfirmSubmit className="danger" message={`¿Eliminar la línea “${c.name}”? Sus ${c.productCount} productos no se borran: quedan sin línea y ${c.visible ? "conservan su visibilidad actual" : "permanecen ocultos hasta que los actives individualmente"}.`}>Eliminar</ConfirmSubmit>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
