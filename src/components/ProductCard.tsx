import type { ProductWithCategory } from "@/lib/db";
import { mediaUrl } from "@/lib/site";
import type { CSSProperties } from "react";

export default function ProductCard({ p, i = 0, showCategory = false }: { p: ProductWithCategory; i?: number; showCategory?: boolean }) {
  return (
    <a className="pcard rv" href={`/producto/${p.slug}`} style={{ "--i": i % 4 } as CSSProperties}>
      <div className="ph">
        {p.badge && <span className="flag">{p.badge}</span>}
        <img src={mediaUrl(p.image)} alt={p.name} loading="lazy" />
      </div>
      <div className="body">
        {(showCategory && p.categoryName) || p.brand ? (
          <span className="meta">{[showCategory ? p.categoryName : null, p.brand].filter(Boolean).join(" · ")}</span>
        ) : null}
        <h3>{p.name}</h3>
        {p.summary && <p>{p.summary}</p>}
        <span className="more">Ver detalle</span>
      </div>
    </a>
  );
}
