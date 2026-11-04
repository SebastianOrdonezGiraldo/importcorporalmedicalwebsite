"use client";
import { useEffect, useState } from "react";

/** File input with live preview of the current or newly chosen photo. */
export default function ImageField({ current, label = "Foto", required = false }: { current: string | null; label?: string; required?: boolean }) {
  const [preview, setPreview] = useState<string | null>(current);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => () => { if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview); }, [preview]);

  return (
    <div className="adm-field adm-image">
      <span>{label}{required && <em> *</em>}</span>
      <label className="adm-drop">
        {preview ? <img src={preview} alt="" /> : <span className="adm-drop-empty">Elegir imagen</span>}
        <input
          type="file"
          name="image"
          accept="image/jpeg,image/png,image/webp,image/avif"
          required={required && !current}
          onChange={(e) => {
            const f = e.target.files?.[0];
            setError(null);
            if (!f) { setPreview(current); return; }
            if (f.size > 6 * 1024 * 1024) { setPreview(current); setError("La imagen pesa más de 6 MB."); e.target.value = ""; return; }
            setPreview(URL.createObjectURL(f));
          }}
        />
      </label>
      <small>JPG, PNG, WebP o AVIF, máximo 6 MB. Se ajusta automáticamente; mejor con fondo blanco y formato cuadrado.</small>
      {error && <small className="adm-err-text">{error}</small>}
    </div>
  );
}
