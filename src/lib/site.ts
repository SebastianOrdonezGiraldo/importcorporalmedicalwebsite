/**
 * Contenido fijo del sitio (lo que no se administra desde /admin).
 * Edita aquí teléfonos, asesores, marcas, regiones y textos del carrusel.
 */

export const SITE = {
  name: "Import Corporal Medical",
  legalName: "Import Corporal Medical S.A.S",
  description:
    "Import Corporal Medical S.A.S: importadores y distribuidores de equipos de fisioterapia y rehabilitación. Programa de distribuidores 2026.",
  url: process.env.SITE_URL || "http://localhost:3000",
  whatsapp: "573212591209",
  phoneLabel: "321 259 1209",
  email: "info@importcorporalmedical.com",
  /** Fin de la promoción de bienvenida: 30 nov 2026, 23:59 hora Colombia (UTC-5). */
  offerEndsUtc: Date.UTC(2026, 11, 1, 4, 59, 0),
};

export const ADVISORS = [
  { initials: "JS", name: "Juan Sebastián Lombana", role: "Asesor comercial", phone: "573212591209", first: "Juan Sebastián" },
  { initials: "SL", name: "Stefania López", role: "Asesora comercial", phone: "573212591209", first: "Stefania" },
];

export const BRANDS = [
  { name: "I-Tech", c: "#b4377e" }, { name: "Compass Health", c: "#4f7f1f" },
  { name: "CanDo", c: "#8a3d97" }, { name: "TensCare", c: "#c4568f" }, { name: "Nu-Tek", c: "#6f9a2f" },
  { name: "Baseline", c: "#4a1652" }, { name: "Agupunt", c: "#9b2c68" }, { name: "Konmed", c: "#3f6b17" }, { name: "Relief Pak", c: "#7d4a8a" },
];

export const KEYWORDS = ["Electroterapia", "Ultrasonido", "Crioterapia", "Presoterapia", "Masaje", "Rehabilitación", "Terapia de mano", "Fitness", "Consumibles"];

export const REGIONS = [
  { name: "Eje Cafetero", deps: ["Quindío", "Risaralda", "Caldas"] },
  { name: "Bogotá y centro", deps: ["Bogotá D.C.", "Cundinamarca", "Boyacá", "Tolima", "Huila"] },
  { name: "Antioquia y Chocó", deps: ["Antioquia", "Chocó"] },
  { name: "Valle y Pacífico", deps: ["Valle del Cauca", "Cauca", "Nariño"] },
  { name: "Santanderes", deps: ["Santander", "Norte de Santander", "Arauca"] },
  { name: "Costa Caribe", deps: ["Atlántico", "Bolívar", "Magdalena", "Cesar", "La Guajira", "Córdoba", "Sucre", "San Andrés"] },
  { name: "Llanos y Amazonía", deps: ["Meta", "Casanare", "Vichada", "Guaviare", "Guainía", "Vaupés", "Caquetá", "Putumayo", "Amazonas"] },
];

export const HERO_SLIDES = [
  { kicker: "Electroterapia · INVIMA", lines: ["El alivio", "del dolor"], outline: "en tu vitrina", text: "TENS y EMS con precio de importador.",
    img: "/img/hero/electro-tens-ems.jpg", alt: "Electroestimulador TENS, EMS y masaje", chipA: "TENS + EMS", chipB: "INVIMA" },
  { kicker: "Recuperación", lines: ["La recuperación", "que piden"], outline: "los atletas", text: "Presoterapia, crioterapia y bañeras de hielo.",
    img: "/img/hero/botas-presoterapia.jpg", alt: "Botas de presoterapia inalámbricas", chipA: "Nuevo 2026", chipB: "Inalámbricas" },
  { kicker: "Línea profesional", lines: ["Equipa", "consultorios"], outline: "sin intermediarios", text: "Ultrasonido y electroestimulación para IPS.",
    img: "/img/hero/stim-combo.jpg", alt: "Equipo Stim Combo de ultrasonido y electroestimulación", chipA: "2 en 1", chipB: "Profesional" },
  { kicker: "Masaje", lines: ["Masaje", "que rota"], outline: "todo el año", text: "Pistolas y masajeadores de alta rotación.",
    img: "/img/hero/pistola-ws062.jpg", alt: "Pistola de masajes WS-062", chipA: "Alta rotación", chipB: "5 cabezales" },
];

export const waUrl = (msg: string, phone: string = SITE.whatsapp) =>
  `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;

/** Public URL of an image stored in DATA_DIR/uploads. */
export const mediaUrl = (file: string | null | undefined) => (file ? `/media/${encodeURIComponent(file)}` : "/img/placeholder.svg");
