import type { Category, ProductWithCategory } from "@/lib/db";
import ProductCard from "./ProductCard";
import { waUrl } from "@/lib/site";
import { ArrowRight } from "./Icons";

type Props = {
  categories: (Category & { productCount: number })[];
  products: ProductWithCategory[];
  active: Category | null;
  q: string;
};

/** Shared layout for /catalogo and /catalogo/[slug]: banner, line filter, search and product grid. */
export default function CatalogView({ categories, products, active, q }: Props) {
  const total = categories.reduce((n, c) => n + c.productCount, 0);
  const groups = active || q
    ? [{ key: "all", title: null as string | null, items: products }]
    : categories
        .map((c) => ({ key: c.slug, title: c.name, items: products.filter((p) => p.categoryId === c.id) }))
        .filter((g) => g.items.length);

  return (
    <>
      <section className="cat-hero">
        <div className="wrap">
          <nav className="crumbs" aria-label="Ruta"><a href="/">Inicio</a><span>/</span>{active ? <><a href="/catalogo">Catálogo</a><span>/</span><b>{active.name}</b></> : <b>Catálogo</b>}</nav>
          <span className="kicker">{active ? "Línea de producto" : "Catálogo 2026"}</span>
          <h1>{active ? active.name : "Todo nuestro portafolio"}</h1>
          <p>{active?.description || "Equipos de fisioterapia y rehabilitación de marcas internacionales para toda Colombia."}</p>
        </div>
      </section>

      <section className="band cat-band">
        <div className="wrap">
          <div className="cat-tools">
            <nav className="cat-filter" aria-label="Líneas">
              <a href="/catalogo" aria-current={!active ? "page" : undefined}>Todas <small>{total}</small></a>
              {categories.map((c) => (
                <a key={c.id} href={`/catalogo/${c.slug}`} aria-current={active?.id === c.id ? "page" : undefined}>
                  {c.name} <small>{c.productCount}</small>
                </a>
              ))}
            </nav>
            <form className="cat-search" role="search" action={active ? `/catalogo/${active.slug}` : "/catalogo"}>
              <input type="search" name="q" defaultValue={q} placeholder="Buscar producto o marca" aria-label="Buscar producto o marca" />
              <button className="btn btn-violet" type="submit">Buscar</button>
            </form>
          </div>

          {q && <p className="cat-result">{products.length} {products.length === 1 ? "resultado" : "resultados"} para “{q}”. <a href={active ? `/catalogo/${active.slug}` : "/catalogo"}>Quitar búsqueda</a></p>}

          {groups.length === 0 && <p className="cat-empty">No encontramos productos. Escríbenos y te ayudamos a encontrarlo.</p>}

          {groups.map((g) => (
            <div key={g.key} className="cat-group">
              {g.title && <h2 className="cat-group-title"><a href={`/catalogo/${g.key}`}>{g.title}</a></h2>}
              <div className="pgrid">
                {g.items.map((p, i) => <ProductCard key={p.id} p={p} i={i} showCategory={!!q && !active} />)}
              </div>
            </div>
          ))}

          <div className="cat-cta">
            <div>
              <h2>¿Buscas precios de distribuidor?</h2>
              <p>Los productos son informativos. Pide tu lista de precios 2026 a un asesor.</p>
            </div>
            <div className="cta-row">
              <a className="btn btn-green" href="/#registro">Quiero ser distribuidor <ArrowRight /></a>
              <a className="btn btn-outline" href={waUrl("Hola, quiero recibir el catálogo de distribuidor 2026.")} target="_blank" rel="noopener">Pedir catálogo</a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
