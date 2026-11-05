import Form from "next/form";
import Link from "next/link";
import type { Category, ProductWithCategory } from "@/lib/db";
import ProductCard from "./ProductCard";
import { waUrl } from "@/lib/site";
import { ArrowRight } from "./Icons";

type Props = {
  categories: (Category & { productCount: number })[];
  products: ProductWithCategory[];
  active: Category | null;
  q: string;
  total: number;
};

/** Shared layout for /catalogo and /catalogo/[slug]: banner, line filter, search and product grid. */
export default function CatalogView({ categories, products, active, q, total }: Props) {
  const catalogHref = (slug?: string) => {
    const pathname = slug ? `/catalogo/${encodeURIComponent(slug)}` : "/catalogo";
    return q ? `${pathname}?${new URLSearchParams({ q })}` : pathname;
  };
  const consultation = q
    ? `Hola, busco “${q}”${active ? ` en la línea ${active.name}` : ""}, pero no encontré resultados en el catálogo. ¿Me pueden ayudar?`
    : `Hola, quisiera información sobre ${active ? `los productos de la línea ${active.name}` : "los productos del catálogo"}. ¿Me pueden ayudar?`;
  const groups = active || q
    ? [{ key: "all", title: null as string | null, href: null as string | null, items: products }]
    : [
        ...categories.map((c) => ({ key: `category-${c.id}`, title: c.name, href: `/catalogo/${c.slug}`, items: products.filter((p) => p.categoryId === c.id) })),
        { key: "uncategorized", title: "Otros productos", href: null, items: products.filter((p) => p.categoryId === null) },
      ].filter((g) => g.items.length);

  return (
    <>
      <section className="cat-hero">
        <div className="wrap">
          <nav className="crumbs" aria-label="Ruta"><Link href="/">Inicio</Link><span>/</span>{active ? <><Link href={catalogHref()}>Catálogo</Link><span>/</span><b>{active.name}</b></> : <b>Catálogo</b>}</nav>
          <span className="kicker">{active ? "Línea de producto" : "Catálogo 2026"}</span>
          <h1>{active ? active.name : "Todo nuestro portafolio"}</h1>
          <p>{active?.description || "Equipos de fisioterapia y rehabilitación de marcas internacionales para toda Colombia."}</p>
        </div>
      </section>

      <section className="band cat-band">
        <div className="wrap">
          <div className="cat-tools">
            <nav className="cat-filter" aria-label="Líneas">
              <Link href={catalogHref()} aria-current={!active ? "page" : undefined}>Todas <small>{total}</small></Link>
              {categories.map((c) => (
                <Link key={c.id} href={catalogHref(c.slug)} aria-current={active?.id === c.id ? "page" : undefined}>
                  {c.name} <small>{c.productCount}</small>
                </Link>
              ))}
            </nav>
            <Form key={`${active?.id ?? "all"}:${q}`} className="cat-search" role="search" action={active ? `/catalogo/${active.slug}` : "/catalogo"}>
              <input type="search" name="q" defaultValue={q} placeholder="Buscar producto o marca" aria-label="Buscar producto o marca" />
              <button className="btn btn-violet" type="submit">Buscar</button>
            </Form>
          </div>

          {q && <p className="cat-result">{products.length} {products.length === 1 ? "resultado" : "resultados"} para “{q}”. <Link href={active ? `/catalogo/${active.slug}` : "/catalogo"}>Quitar búsqueda</Link></p>}

          {products.length === 0 && (
            <div className="cat-empty" role="status">
              <h2>{q ? "No encontramos resultados para esta búsqueda" : active ? "Esta línea todavía no tiene productos publicados" : "Todavía no hay productos publicados"}</h2>
              <p>{q ? `Prueba con otro nombre o marca${active ? ", o busca en todo el catálogo" : ""}. También podemos ayudarte por WhatsApp.` : "Consulta con un asesor para conocer los productos disponibles."}</p>
              <div className="cta-row">
                <a className="btn btn-violet" href={waUrl(consultation)} target="_blank" rel="noopener">Consultar por WhatsApp</a>
                {active && <Link className="btn btn-outline" href={catalogHref()}>{q ? "Buscar en todo el catálogo" : "Ver todo el catálogo"}</Link>}
                {q && <Link className="btn btn-outline" href={active ? `/catalogo/${active.slug}` : "/catalogo"}>Limpiar búsqueda</Link>}
              </div>
            </div>
          )}

          {groups.map((g) => (
            <div key={g.key} className="cat-group">
              {g.title && <h2 className="cat-group-title">{g.href ? <Link href={g.href}>{g.title}</Link> : g.title}</h2>}
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
              <Link className="btn btn-green" href="/#registro">Quiero ser distribuidor <ArrowRight /></Link>
              <a className="btn btn-outline" href={waUrl("Hola, quiero recibir el catálogo de distribuidor 2026.")} target="_blank" rel="noopener">Pedir catálogo</a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
