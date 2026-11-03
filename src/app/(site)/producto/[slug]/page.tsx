import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCategory, getProduct, listProducts } from "@/lib/db";
import { mediaUrl, waUrl, SITE } from "@/lib/site";
import ProductCard from "@/components/ProductCard";
import { ArrowRight, Check, WhatsApp } from "@/components/Icons";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

function load(slug: string) {
  const p = getProduct({ slug });
  // Hidden products (or products in a hidden line) are not public.
  if (!p || !p.visible) return null;
  if (p.categoryId && !getCategory({ id: p.categoryId })?.visible) return null;
  return p;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = load((await params).slug);
  if (!p) return {};
  return { title: p.name, description: p.summary || undefined, openGraph: { images: [mediaUrl(p.image)] } };
}

export default async function ProductPage({ params }: Props) {
  const p = load((await params).slug);
  if (!p) notFound();
  const related = p.categoryId ? listProducts({ categoryId: p.categoryId }).filter((x) => x.id !== p.id).slice(0, 4) : [];
  const paragraphs = p.description.split(/\n{2,}/).map((s) => s.trim()).filter(Boolean);
  const productUrl = `${SITE.url}/producto/${p.slug}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    description: p.summary || undefined,
    image: `${SITE.url}${mediaUrl(p.image)}`,
    brand: p.brand ? { "@type": "Brand", name: p.brand } : undefined,
    category: p.categoryName || undefined,
    url: productUrl,
  };

  return (
    <>
      <section className="band pdetail">
        <div className="wrap">
          <nav className="crumbs dark" aria-label="Ruta">
            <a href="/">Inicio</a><span>/</span><a href="/catalogo">Catálogo</a>
            {p.categorySlug && <><span>/</span><a href={`/catalogo/${p.categorySlug}`}>{p.categoryName}</a></>}
            <span>/</span><b>{p.name}</b>
          </nav>
          <div className="pdetail-grid">
            <div className="pdetail-media">
              {p.badge && <span className="flag">{p.badge}</span>}
              <img src={mediaUrl(p.image)} alt={p.name} />
            </div>
            <div className="pdetail-copy">
              {p.categoryName && <span className="eyebrow">{p.categoryName}</span>}
              <h1 className="title">{p.name}</h1>
              {p.brand && <p className="pdetail-brand">Marca: <b>{p.brand}</b></p>}
              {p.summary && <p className="lead">{p.summary}</p>}
              {paragraphs.length > 0 && <div className="pdetail-desc">{paragraphs.map((t, i) => <p key={i}>{t}</p>)}</div>}
              <ul className="pdetail-points">
                <li><Check />Garantía y servicio técnico</li>
                <li><Check />Despacho a los 32 departamentos</li>
                <li><Check />Precio especial para distribuidores</li>
              </ul>
              <div className="cta-row">
                <a className="btn btn-violet" href={waUrl(`Hola, quiero información sobre el producto "${p.name}" (${productUrl}).`)} target="_blank" rel="noopener">
                  <WhatsApp />Consultar por WhatsApp
                </a>
                <a className="btn btn-outline" style={{ color: "var(--violet)" }} href="/#registro">Quiero ser distribuidor <ArrowRight /></a>
              </div>
              <p className="pdetail-note">Producto informativo. Pide precios y disponibilidad a un asesor.</p>
            </div>
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="band alt">
          <div className="wrap">
            <div className="sec-head">
              <span className="eyebrow">También en {p.categoryName}</span>
              <h2 className="title">Productos <mark>relacionados</mark></h2>
            </div>
            <div className="pgrid">{related.map((r, i) => <ProductCard key={r.id} p={r} i={i} />)}</div>
          </div>
        </section>
      )}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    </>
  );
}
