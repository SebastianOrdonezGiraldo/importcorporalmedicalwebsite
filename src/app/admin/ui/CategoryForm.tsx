"use client";
import type { Category } from "@/lib/db";
import { saveCategoryAction } from "../actions";
import ImageField from "./ImageField";
import { useNoResetAction } from "./useNoResetAction";

export default function CategoryForm({ category: c }: { category: (Category & { imageUrl: string | null }) | null }) {
  const { state, pending, onSubmit } = useNoResetAction(saveCategoryAction.bind(null, c?.id ?? null));
  return (
    <form className="adm-form adm-card" onSubmit={onSubmit} encType="multipart/form-data">
      <div className="adm-grid">
        <div className="adm-col">
          <label className="adm-field"><span>Nombre <em>*</em></span>
            <input name="name" required maxLength={80} defaultValue={c?.name} placeholder="Ej.: Electroterapia" />
          </label>
          <label className="adm-field"><span>Descripción</span>
            <textarea name="description" maxLength={400} rows={3} defaultValue={c?.description} placeholder="Aparece arriba en la página de la línea." />
          </label>
          <label className="adm-field"><span>Etiquetas (separadas por coma)</span>
            <input name="tags" maxLength={300} defaultValue={c?.tags.join(", ")} placeholder="Fisioterapeutas, Droguerías" />
            <small>Para quién es esta línea. Se muestran en la tarjeta de la portada.</small>
          </label>
          <div className="adm-row">
            <label className="adm-field"><span>Distintivo</span>
              <input name="flag" maxLength={24} defaultValue={c?.flag ?? ""} placeholder="Ej.: Recompra" />
            </label>
            <label className="adm-field"><span>Orden</span>
              <input name="sortOrder" type="number" defaultValue={c?.sortOrder ?? 0} />
            </label>
          </div>
        </div>
        <div className="adm-col">
          <ImageField current={c?.imageUrl ?? null} label="Imagen de portada" />
          <label className="adm-field"><span>Enlace (slug)</span>
            <input name="slug" maxLength={80} defaultValue={c?.slug} placeholder={c ? "Vacío: conservar enlace actual" : "Se genera del nombre"} />
            <small>{c ? "Si lo cambias, los enlaces anteriores redirigirán al nuevo. Las direcciones antiguas quedan reservadas." : "Al crear la línea se genera del nombre si lo dejas vacío."}</small>
          </label>
          <label className="adm-check"><input type="checkbox" name="visible" defaultChecked={c?.visible ?? true} /> Visible en el sitio</label>
          <small className="adm-muted">Al mostrar la línea también se publican sus productos activos. Al ocultarla, todos sus productos dejan de publicarse.</small>
        </div>
      </div>
      {state?.error && <p className="adm-alert err" role="alert">{state.error}</p>}
      <div className="adm-actions">
        <button className="btn btn-violet" type="submit" disabled={pending}>{pending ? "Guardando…" : c ? "Guardar cambios" : "Crear línea"}</button>
        <a className="adm-link" href="/admin/lineas">Cancelar</a>
      </div>
    </form>
  );
}
