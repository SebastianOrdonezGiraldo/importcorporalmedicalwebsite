"use client";
import { useState } from "react";
import type { Category, Product } from "@/lib/db";
import { saveProductAction } from "../actions";
import ImageField from "./ImageField";
import { useNoResetAction } from "./useNoResetAction";

type Props = { product: (Product & { imageUrl: string | null }) | null; categories: Pick<Category, "id" | "name" | "visible">[] };

export default function ProductForm({ product: p, categories }: Props) {
  const { state, pending, onSubmit } = useNoResetAction(saveProductAction.bind(null, p?.id ?? null));
  const [categoryId, setCategoryId] = useState(p?.categoryId ?? null);
  const selectedCategory = categories.find((c) => c.id === categoryId);
  const publicLinkAvailable = p?.visible && categories.find((c) => c.id === p.categoryId)?.visible !== false;
  return (
    <form className="adm-form adm-card" onSubmit={onSubmit} encType="multipart/form-data">
      <div className="adm-grid">
        <div className="adm-col">
          <label className="adm-field"><span>Nombre <em>*</em></span>
            <input name="name" required maxLength={120} defaultValue={p?.name} placeholder="Ej.: Botas de presoterapia" />
          </label>
          <label className="adm-field"><span>Línea</span>
            <select name="categoryId" value={categoryId ?? ""} onChange={(e) => setCategoryId(Number(e.target.value) || null)}>
              <option value="">Sin línea</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}{!c.visible && " (oculta)"}</option>)}
            </select>
          </label>
          <div className="adm-row">
            <label className="adm-field"><span>Marca</span>
              <input name="brand" maxLength={80} defaultValue={p?.brand ?? ""} placeholder="Opcional" />
            </label>
            <label className="adm-field"><span>Etiqueta</span>
              <input name="badge" maxLength={30} defaultValue={p?.badge ?? ""} placeholder="Ej.: Nuevo, INVIMA" />
            </label>
          </div>
          <label className="adm-field"><span>Resumen</span>
            <textarea name="summary" maxLength={300} rows={2} defaultValue={p?.summary} placeholder="Una frase corta que aparece en la tarjeta del catálogo." />
          </label>
          <label className="adm-field"><span>Descripción</span>
            <textarea name="description" maxLength={5000} rows={8} defaultValue={p?.description} placeholder="Características, usos, contenido de la caja… Deja una línea en blanco para separar párrafos." />
          </label>
        </div>
        <div className="adm-col">
          <ImageField current={p?.imageUrl ?? null} required />
          <div className="adm-row">
            <label className="adm-field"><span>Orden</span>
              <input name="sortOrder" type="number" defaultValue={p?.sortOrder ?? 0} />
              <small>Menor número aparece primero dentro de su línea.</small>
            </label>
            <label className="adm-field"><span>Enlace (slug)</span>
              <input name="slug" maxLength={80} defaultValue={p?.slug} placeholder={p ? "Vacío: conservar enlace actual" : "Se genera del nombre"} />
              <small>{p ? "Si lo cambias, los enlaces anteriores redirigirán al nuevo. Las direcciones antiguas quedan reservadas." : "Al crear el producto se genera del nombre si lo dejas vacío."}</small>
            </label>
          </div>
          <label className="adm-check"><input type="checkbox" name="visible" defaultChecked={p?.visible ?? true} /> Activar visibilidad del producto</label>
          <small className="adm-muted">Se publica cuando está activo y su línea está visible, o no tiene línea.</small>
          {selectedCategory?.visible === false && <p className="adm-alert" role="status">La línea “{selectedCategory.name}” está oculta. El producto seguirá oculto aunque lo actives. <a href={`/admin/lineas/${selectedCategory.id}`}>Editar línea</a>.</p>}
          <label className="adm-check"><input type="checkbox" name="featured" defaultChecked={p?.featured ?? false} /> Destacado <small className="adm-muted">(aparece primero en su línea)</small></label>
        </div>
      </div>
      {state?.error && <p className="adm-alert err" role="alert">{state.error}</p>}
      <div className="adm-actions">
        <button className="btn btn-violet" type="submit" disabled={pending}>{pending ? "Guardando…" : p ? "Guardar cambios" : "Crear producto"}</button>
        <a className="adm-link" href="/admin/productos">Cancelar</a>
        {p && publicLinkAvailable && <a className="adm-link" href={`/producto/${p.slug}`} target="_blank" rel="noopener">Ver en el sitio ↗</a>}
      </div>
    </form>
  );
}
