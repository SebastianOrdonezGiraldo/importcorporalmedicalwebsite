import { Fragment, type CSSProperties } from "react";
import { listCategories } from "@/lib/db";
import { ADVISORS, BRANDS, HERO_SLIDES, KEYWORDS, SITE, mediaUrl, waUrl } from "@/lib/site";
import { ArrowRight, Check, Mail, WhatsApp } from "@/components/Icons";
import HomeEffects from "./HomeEffects";
import ApplyForm from "./ApplyForm";

// Reads the catalog on every request so admin changes show up immediately.
export const dynamic = "force-dynamic";

const v = (vars: Record<string, string | number>) => vars as CSSProperties;

export default function HomePage() {
  const lines = listCategories();
  const productTotal = lines.reduce((n, l) => n + l.productCount, 0);

  return (
    <>
      <section className="hero" id="inicio" aria-roledescription="carrusel" aria-label="Destacados">
        <div className="glow" aria-hidden="true"></div>
        <div className="wrap slides" id="slides">
          {HERO_SLIDES.map((s, k) => {
            const H = k === 0 ? "h1" : "h2";
            return (
              <div key={k} className={`slide${k === 0 ? " on" : ""}`} role="group" aria-roledescription="diapositiva" aria-label={`${k + 1} de ${HERO_SLIDES.length}`}>
                <div className="slide-copy">
                  <span className="kicker">{s.kicker}</span>
                  <H>
                    {s.lines.map((l, n) => <span key={n} className="ln"><span style={v({ "--l": n })}>{l}</span></span>)}
                    <span className="ln"><span className="outline">{s.outline}</span></span>
                  </H>
                  <p>{s.text}</p>
                  <div className="cta-row">
                    <a className="btn btn-green" href="#registro">Quiero ser distribuidor <ArrowRight /></a>
                    <a className="btn btn-outline" href="/catalogo">Ver catálogo</a>
                  </div>
                </div>
                <div className="slide-art">
                  <div className="disc"><img src={s.img} alt={s.alt} /></div>
                  <span className="chip-float a">{s.chipA}</span>
                  <span className="chip-float b"><Check />{s.chipB}</span>
                </div>
              </div>
            );
          })}
        </div>
        <div className="hero-dots" id="heroDots" role="group" aria-label="Elegir diapositiva"></div>
        <div className="hero-ctrl">
          <button className="arrow" type="button" id="heroPrev" aria-label="Anterior"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg></button>
          <button className="arrow" type="button" id="heroNext" aria-label="Siguiente"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg></button>
        </div>
      </section>

      <section className="values" id="valores">
        <div className="wrap">
          <div className="grid">
            <div className="value" style={v({ "--i": 0 })}>
              <span className="ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 6h11v10H2zM13 9h4l4 4v3h-8" /><circle cx="6" cy="18" r="2" /><circle cx="17" cy="18" r="2" /></svg></span>
              <h3>Despacho nacional</h3><p>A los 32 departamentos.</p>
            </div>
            <div className="value hl" style={v({ "--i": 1 })}>
              <span className="ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3 4 6v6c0 4.5 3.4 8.2 8 9 4.6-.8 8-4.5 8-9V6l-8-3Z" /><path d="m9 12 2 2 4-4" /></svg></span>
              <h3>Calidad certificada</h3><p>Registro INVIMA.</p>
            </div>
            <div className="value" style={v({ "--i": 2 })}>
              <span className="ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 17 9 11l4 4 8-8" /><path d="M15 7h6v6" /></svg></span>
              <h3>Precio de importador</h3><p>Más margen para ti.</p>
            </div>
          </div>
        </div>
        <div className="marquee" aria-hidden="true">
          <div className="mq-track">
            {[0, 1].map((rep) => KEYWORDS.map((k, n) => (
              <Fragment key={`${rep}-${n}`}>
                <span className={n % 2 ? "o" : ""}>{k}</span><i></i>
              </Fragment>
            )))}
          </div>
        </div>
      </section>

      <section className="band" id="nosotros">
        <div className="wrap">
          <div className="about">
            <div className="about-copy">
              <span className="eyebrow rv">Nosotros</span>
              <h2 className="title rv" style={v({ "--i": 1 })}>Más de <mark>10 años</mark> importando la tecnología que mueve la fisioterapia</h2>
              <p className="lead rv" style={v({ "--i": 2 })}>Equipos de fisioterapia y rehabilitación de marcas internacionales para toda Colombia.</p>
              <div className="chips rv" style={v({ "--i": 3 })}>
                <span><Check />Garantía y servicio técnico</span>
                <span><Check />Asesor dedicado</span>
              </div>
              <a className="btn btn-violet rv" style={v({ "--i": 4 })} href="#programa">Ver programa <ArrowRight /></a>
            </div>
            <div className="hexes" aria-hidden="true">
              <div className="hex rv z" style={v({ "--i": 0 })}><img src="/img/hero/botas-presoterapia.jpg" alt="" style={v({ "--i": 0 })} /></div>
              <div className="hex rv z" style={v({ "--i": 1 })}><img src="/img/hero/stim-basic.jpg" alt="" style={v({ "--i": 1 })} /></div>
              <div className="hex solid rv s" style={v({ "--i": 2 })}><div><b>37</b><span>líneas de producto</span></div></div>
              <div className="hex rv z" style={v({ "--i": 3 })}><img src="/img/hero/pedal-electrico.jpg" alt="" style={v({ "--i": 2 })} /></div>
            </div>
          </div>
          <div className="counters rv z" id="counters">
            <h3>Experiencia y respaldo</h3>
            <div className="counter"><b data-to="10" data-prefix="+">+10</b><span>años importando</span></div>
            <div className="counter"><b data-to="37">37</b><span>líneas de producto</span></div>
            <div className="counter"><b data-to={BRANDS.length}>{BRANDS.length}</b><span>marcas</span></div>
          </div>
        </div>
      </section>

      <section className="band alt" id="marcas">
        <div className="wrap brands-grid">
          <div>
            <span className="eyebrow rv">Marcas</span>
            <h2 className="title rv" style={v({ "--i": 1 })}>Las marcas que tus clientes <mark>buscan</mark></h2>
            <ul className="brand-list" id="brandList">
              {BRANDS.map((b, k) => (
                <li key={b.name} className="rv l" data-k={k} style={v({ "--c": b.c, "--i": (k % 5) * 0.6 })}><i></i>{b.name}</li>
              ))}
            </ul>
          </div>
          <div className="orbit rv s" id="orbit" aria-hidden="true">
            <div className="ring r1"></div><div className="ring r2"></div><div className="ring r3"></div>
            <div className="spin" id="orbitSpin">
              {BRANDS.map((b, k) => {
                const a = (k / BRANDS.length) * Math.PI * 2 - Math.PI / 2;
                const r = 40.5;
                return (
                  <div key={b.name} className="bubble" data-k={k}
                    style={v({ "--c": b.c, left: `${(50 + r * Math.cos(a)).toFixed(3)}%`, top: `${(50 + r * Math.sin(a)).toFixed(3)}%` })}>
                    <span>{b.name}</span>
                  </div>
                );
              })}
            </div>
            <div className="core"><img src="/img/logo.png" alt="" /></div>
          </div>
        </div>
      </section>

      <section className="band" id="lineas">
        <div className="wrap">
          <div className="sec-head">
            <span className="eyebrow rv">Catálogo</span>
            <h2 className="title rv" style={v({ "--i": 1 })}>Un portafolio para <mark>toda la consulta</mark></h2>
          </div>
          <div className="lines" id="lines">
            {lines.map((l, k) => (
              <a key={l.id} className="line rv" data-tilt href={`/catalogo/${l.slug}`} style={v({ "--i": k % 4 })}>
                <div className="ph">
                  {l.flag && <span className="flag">{l.flag}</span>}
                  <img src={mediaUrl(l.image)} alt="" loading="lazy" />
                </div>
                <div className="body">
                  <h3>{l.name}</h3>
                  <div className="tags">{l.tags.map((t) => <span key={t}>{t}</span>)}</div>
                  <span className="line-count">{l.productCount} {l.productCount === 1 ? "producto" : "productos"}</span>
                </div>
              </a>
            ))}
          </div>
          <div className="cta-row rv" style={{ justifyContent: "center", marginTop: 40 }}>
            <a className="btn btn-violet" href="/catalogo">Ver los {productTotal} productos <ArrowRight /></a>
            <a className="btn btn-outline" style={{ color: "var(--violet)" }} href={waUrl("Hola, quiero recibir el catálogo de distribuidor 2026.")} target="_blank" rel="noopener">Recibir catálogo completo</a>
          </div>
        </div>
      </section>

      <section className="band alt" id="programa">
        <div className="wrap program">
          <div>
            <span className="eyebrow rv">Programa de distribuidores</span>
            <h2 className="title rv" style={v({ "--i": 1 })}>Empieza a vender en <mark>4 pasos</mark></h2>
            <ol className="steps">
              {[
                ["Regístrate", "Datos de tu empresa y NIT."],
                ["Recibe tu lista de precios", "Catálogo distribuidor 2026."],
                ["Haz tu pedido", "Despachamos a tu ciudad."],
                ["Vende con apoyo", "Material, capacitación y soporte."],
              ].map(([b, s], i) => (
                <li key={b} className="rv l" style={v({ "--i": i })}><div><b>{b}</b><span>{s}</span></div></li>
              ))}
            </ol>
            <a className="btn btn-violet rv" href="#registro">Empezar registro <ArrowRight /></a>
          </div>
          <div className="benefits">
            {BENEFITS.map((b, i) => (
              <div key={b.t} className="benefit rv r" style={v({ "--i": i })} data-tilt>
                <span className="ico draw"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{b.icon}</svg></span>
                <h3>{b.t}</h3><p>{b.p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="band" style={{ paddingBottom: 0 }} id="bienvenida">
        <div className="wrap">
          <div className="offer">
            <div className="rv l">
              <span className="kicker">Nuevos distribuidores</span>
              <h2>Kit de bienvenida + envío gratis</h2>
              <p>Regístrate antes del 30 de noviembre.</p>
              <div className="cta-row">
                <a className="btn btn-green" href="#registro">Lo quiero</a>
                <a className="btn btn-outline" href={waUrl("Hola, quiero información sobre el kit de bienvenida para distribuidores.")} target="_blank" rel="noopener">Preguntar</a>
              </div>
            </div>
            <div className="offer-side rv r">
              <div className="countdown" id="countdown" data-end={SITE.offerEndsUtc} aria-label="Tiempo restante de la promoción">
                <div><b data-u="d">--</b><small>días</small></div>
                <div><b data-u="h">--</b><small>horas</small></div>
                <div><b data-u="m">--</b><small>min</small></div>
              </div>
              <ul>
                <li><Check w={3.4} />Material POP</li>
                <li><Check w={3.4} />Envío gratis del primer pedido</li>
                <li><Check w={3.4} />Capacitación virtual</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="band" id="cobertura">
        <div className="wrap coverage">
          <div>
            <span className="eyebrow rv">Cobertura</span>
            <h2 className="title rv" style={v({ "--i": 1 })}>Despachos a <mark>todo el país</mark></h2>
            <div className="tabs rv" style={v({ "--i": 2 })} role="tablist" aria-label="Regiones" id="tabs"></div>
            <div className="tabpanel" role="tabpanel" id="tabpanel" aria-live="polite"></div>
          </div>
          <svg className="hub rv z" id="hub" viewBox="0 0 560 520" role="img" aria-label="Diagrama de despachos hacia las regiones de Colombia"></svg>
        </div>
      </section>

      <section className="band alt" id="registro">
        <div className="wrap">
          <div className="sec-head">
            <span className="eyebrow rv">Registro</span>
            <h2 className="title rv" style={v({ "--i": 1 })}>Recibe la <mark>lista de precios</mark> 2026</h2>
          </div>
          <div className="contact-grid" id="contacto">
            <ApplyForm lines={lines.map((l) => ({ name: l.name, img: mediaUrl(l.image) }))} />
            <div className="info-card rv r">
              <h3>Atención a distribuidores</h3>
              <p className="pick">Elige con quién quieres hablar</p>
              {ADVISORS.map((a) => (
                <a key={a.name} className="advisor" href={waUrl(`Hola ${a.first}, quiero información para ser distribuidor de Import Corporal Medical.`, a.phone)} target="_blank" rel="noopener">
                  <span className="avatar">{a.initials}</span>
                  <span className="who-a"><b>{a.name}</b><small>{a.role}</small></span>
                  <span className="wa-pill"><WhatsApp />WhatsApp</span>
                </a>
              ))}
              <div className="mail-row">
                <a className="mail-cta" href={`mailto:${SITE.email}?subject=Quiero%20ser%20distribuidor`}>
                  <Mail />
                  <span><small>Escríbenos un correo</small><b id="mailTxt">{SITE.email}</b></span>
                  <ArrowRight className="arrow" />
                </a>
                <button className="copy" type="button" data-copy={SITE.email} data-target="mailTxt" aria-label="Copiar correo">Copiar</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="band" id="preguntas">
        <div className="wrap">
          <div className="sec-head center">
            <span className="eyebrow rv">Preguntas</span>
            <h2 className="title rv" style={v({ "--i": 1 })}>Antes de <mark>empezar</mark></h2>
          </div>
          <div className="faq">
            {FAQ.map(([q, a], i) => (
              <details key={q} className="rv" style={v({ "--i": i })} open={i === 0}><summary>{q}</summary><p>{a}</p></details>
            ))}
          </div>
        </div>
      </section>

      <nav className="sec-nav" id="secNav" aria-label="Ir a sección"></nav>
      <HomeEffects />
    </>
  );
}

const FAQ = [
  ["¿Qué necesito?", "Un negocio con NIT (o tu cédula) y datos de contacto."],
  ["¿Hay pedido mínimo?", "Depende de la línea. Tu asesor te da las condiciones."],
  ["¿Tienen registro INVIMA?", "Sí, los equipos que lo requieren. Te damos la documentación."],
  ["¿Y si un equipo falla?", "Tiene garantía y lo atiende nuestro servicio técnico."],
];

const BENEFITS = [
  { t: "Precio distribuidor", p: "Mejor precio por volumen.", icon: <><path pathLength={1} d="M3 17 9 11l4 4 8-8" /><path pathLength={1} d="M15 7h6v6" /></> },
  { t: "Documentación INVIMA", p: "Lista para IPS y clínicas.", icon: <><path pathLength={1} d="M12 3 4 6v6c0 4.5 3.4 8.2 8 9 4.6-.8 8-4.5 8-9V6l-8-3Z" /><path pathLength={1} d="m9 12 2 2 4-4" /></> },
  { t: "Kit de marketing", p: "Fotos, videos y catálogo.", icon: <><rect pathLength={1} x="3" y="4" width="18" height="14" rx="2" /><path pathLength={1} d="m10 9 5 2.5-5 2.5z" /><path pathLength={1} d="M8 21h8" /></> },
  { t: "Capacitación", p: "Para ti y tu equipo.", icon: <><path pathLength={1} d="M4 19V5a2 2 0 0 1 2-2h12v18H6a2 2 0 0 1-2-2Z" /><path pathLength={1} d="M8 7h6M8 11h6" /></> },
  { t: "Servicio técnico", p: "Garantía y reparación.", icon: <path pathLength={1} d="M14.7 6.3a4 4 0 0 0 5 5L21 13l-8 8-3-3 1.3-1.3a4 4 0 0 0-5-5L5 13 3 11l8-8 2 2Z" /> },
  { t: "Recompra", p: "Consumibles que vuelven cada mes.", icon: <><path pathLength={1} d="M20 12a8 8 0 1 1-2.3-5.6" /><path pathLength={1} d="M20 4v5h-5" /></> },
];
