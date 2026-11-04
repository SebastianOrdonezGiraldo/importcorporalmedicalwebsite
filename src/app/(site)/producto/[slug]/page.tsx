import Link from "next/link";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { resolveProductSlug, listProducts } from "@/lib/db";
import { withSearchParams, type PageSearchParams } from "@/lib/redirect-url";
import { isProductPublished } from "@/lib/product-visibility";
import { ADVISORS, mediaUrl, waUrl } from "@/lib/site";
import ProductAdvisorContact from "@/components/ProductAdvisorContact";
import ProductCard from "@/components/ProductCard";
import { pageMetadata, absoluteUrl, breadcrumbData, jsonLd } from "@/lib/seo";
import { ArrowRight, Check } from "@/components/Icons";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<PageSearchParams> };

function load(slug: string) {
  const p = resolveProductSlug(slug);
  // Hidden products (or products in a hidden line) are not public.
  if (!p || !isProductPublished(p)) return null;
  return p;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = load((await params).slug);
  if (!p) return { robots: { index: false, follow: true } };
  return pageMetadata({ title: p.name, description: p.summary || `Consulta por ${p.name} en Import Corporal Medical. Información, precios y disponibilidad por WhatsApp.`,
    pathname: `/producto/${encodeURIComponent(p.slug)}`, image: p.image ? mediaUrl(p.image) : undefined });
}

export default async function ProductPage({ params, searchParams }: Props) {
  const slug = (await params).slug;
  const p = load(slug);
  if (!p) notFound();
  if (p.slug !== slug) permanentRedirect(withSearchParams(`/producto/${encodeURIComponent(p.slug)}`, await searchParams));
  const related = p.categoryId ? listProducts({ categoryId: p.categoryId }).filter((x) => x.id !== p.id).slice(0, 4) : [];
  const paragraphs = p.description.split(/\n{2,}/).map((s) => s.trim()).filter(Boolean);
  const productUrl = absoluteUrl(`/producto/${encodeURIComponent(p.slug)}`);

  const productData = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    description: p.summary || undefined,
    image: absoluteUrl(mediaUrl(p.image)),
    brand: p.brand ? { "@type": "Brand", name: p.brand } : undefined,
    category: p.categoryName || undefined,
    url: productUrl,
  };

  return (
    <>
      <section className="band pdetail">
        <div className="wrap">
          <nav className="crumbs dark" aria-label="Ruta">
            <Link href="/">Inicio</Link><span>/</span><Link href="/catalogo">Catálogo</Link>
            {p.categorySlug && <><span>/</span><Link href={`/catalogo/${p.categorySlug}`}>{p.categoryName}</Link></>}
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
                <ProductAdvisorContact productName={p.name} advisors={ADVISORS.map((advisor) => ({
                  name: advisor.name, role: advisor.role, initials: advisor.initials,
                  href: waUrl(`Hola ${advisor.first}, quiero información sobre el producto "${p.name}" (${productUrl}).`, advisor.phone),
                }))} />
                <Link className="btn btn-outline" style={{ color: "var(--violet)" }} href="/#registro">Quiero ser distribuidor <ArrowRight /></Link>
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd([
        productData,
        breadcrumbData([
          { name: "Inicio", pathname: "/" }, { name: "Catálogo", pathname: "/catalogo" },
          ...(p.categorySlug ? [{ name: p.categoryName!, pathname: `/catalogo/${encodeURIComponent(p.categorySlug)}` }] : []),
          { name: p.name, pathname: `/producto/${encodeURIComponent(p.slug)}` },
        ]),
      ]) }} />
    </>
  );
}
