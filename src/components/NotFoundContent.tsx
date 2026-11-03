export default function NotFoundContent() {
  return (
    <section className="band" style={{ minHeight: "50vh", display: "grid", placeItems: "center", textAlign: "center" }}>
      <div className="wrap" style={{ display: "grid", gap: 16, justifyItems: "center" }}>
        <span className="eyebrow">Error 404</span>
        <h1 className="title">No encontramos esta <mark>página</mark></h1>
        <p className="lead">Puede que el producto ya no esté disponible.</p>
        <div className="cta-row"><a className="btn btn-violet" href="/catalogo">Ver catálogo</a><a className="btn btn-outline" href="/">Ir al inicio</a></div>
      </div>
    </section>
  );
}
