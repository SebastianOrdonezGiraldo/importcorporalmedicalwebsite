import fs from "node:fs/promises";
import sharp from "sharp";

const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#4a1652"/>
  <circle cx="1150" cy="50" r="420" fill="#6e2378"/>
  <circle cx="1150" cy="50" r="280" fill="#b4377e" opacity=".5"/>
  <rect x="64" y="60" width="116" height="116" rx="22" fill="white"/>
  <g font-family="Segoe UI,Arial,sans-serif" fill="white">
    <text x="210" y="110" font-size="34" font-weight="700">IMPORT CORPORAL</text>
    <text x="212" y="150" font-size="24" letter-spacing="6" fill="#98c454">MEDICAL S.A.S</text>
    <text x="64" y="290" font-size="67" font-weight="700">Equipos de fisioterapia</text>
    <text x="64" y="372" font-size="67" font-weight="700">y rehabilitación</text>
    <text x="68" y="445" font-size="30" fill="#efe6f1">Catálogo y atención a distribuidores en Colombia</text>
    <text x="68" y="555" font-size="25" fill="#98c454">importcorporalmedical.com</text>
  </g>
  <rect x="64" y="590" width="1072" height="8" rx="4" fill="#98c454"/>
</svg>`);
await fs.mkdir("public/img/seo", { recursive: true });
const logo = await sharp("public/img/logo.png").resize(100, 100, { fit: "contain", background: "white" }).png().toBuffer();
await sharp(svg).composite([{ input: logo, left: 72, top: 68 }]).png().toFile("public/img/seo/site-card.png");
console.log("Tarjeta social generada: 1200 × 630.");
