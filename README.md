# Import Corporal Medical · Sitio web

Página principal de Import Corporal Medical S.A.S con catálogo informativo de productos y un panel de administración para gestionarlos. No hay precios, carrito ni pagos: cada producto tiene un botón para consultar por WhatsApp.

## Qué incluye

| Ruta | Qué es |
| --- | --- |
| `/` | Portada (mismo diseño y animaciones de la página original). Las tarjetas de líneas salen de la base de datos. |
| `/catalogo` | Todos los productos agrupados por línea, con filtro y buscador. |
| `/catalogo/[linea]` | Productos de una línea. |
| `/producto/[producto]` | Ficha del producto con foto, descripción, relacionados y botón de WhatsApp. |
| `/admin` | Panel protegido con contraseña: crear, editar, ocultar, ordenar y eliminar productos y líneas, y subir fotos. |

## Tecnología

- **Next.js 16** (App Router) + **React 19** + **TypeScript**.
- **SQLite** integrado en Node (`node:sqlite`): un solo archivo `data/app.db`, sin servidor de base de datos ni módulos que compilar. Al arrancar, Node muestra un aviso "ExperimentalWarning: SQLite"; es normal.
- **sharp**: las fotos subidas se redimensionan a máx. 1200 px y se guardan en WebP en `data/uploads/`.
- CSS propio (el de la página original, sin frameworks).

## Empezar en tu computador

Requisitos: Node.js 22.13 o superior (recomendado Node 24 LTS). No hace falta Visual Studio ni compiladores.

```bash
npm install
cp .env.example .env.local     # en Windows: copy .env.example .env.local
                               # luego edita ADMIN_PASSWORD y SESSION_SECRET
npm run dev
```

Abre http://localhost:3000. El panel está en http://localhost:3000/admin.

La primera vez que arranca, si la base de datos está vacía, se cargan automáticamente las 8 líneas y los 32 productos de la página original (`seed/data.json` y `seed/images/`). Para volver a empezar desde cero, borra la carpeta `data/`.

### Variables de entorno

| Variable | Para qué |
| --- | --- |
| `ADMIN_PASSWORD` | Contraseña del panel `/admin`. |
| `SESSION_SECRET` | Cadena aleatoria de 32+ caracteres para firmar la sesión (`openssl rand -hex 32`). |
| `DATA_DIR` | Carpeta de la base de datos y las fotos. Por defecto `./data`. |
| `SITE_URL` | URL pública del sitio, para metadatos y enlaces compartidos. |

## Dónde se cambia cada cosa

- **Productos y líneas**: desde `/admin`.
- **Teléfono, correo, asesores, marcas, regiones, textos del carrusel y fecha de la promoción**: `src/lib/site.ts`.
- **Textos fijos de la portada** (Nosotros, Programa, Preguntas…): `src/app/(site)/page.tsx`.
- **Estilos**: `src/app/site.css` (original), `src/app/catalog.css` (catálogo y ficha), `src/app/admin/admin.css` (panel).

## Estructura

```
src/
  app/
    (site)/            páginas públicas: portada, catálogo, ficha de producto
    admin/             login, panel y acciones del servidor (crear/editar/eliminar)
    media/[file]/      sirve las fotos subidas desde DATA_DIR/uploads
  components/          encabezado, pie, tarjetas de producto
  lib/
    db.ts              esquema SQLite, consultas y carga inicial
    auth.ts            sesión del admin (cookie firmada con HMAC)
    uploads.ts         validación y procesamiento de fotos
    site.ts            contenido fijo y datos de contacto
seed/                  datos e imágenes iniciales
public/img/            logo e imágenes fijas de la portada
```

## Publicar en internet

El sitio necesita un servidor Node con **disco persistente** (ahí viven la base de datos y las fotos). Opciones sencillas:

- **Railway, Render o Fly.io**: conecta el repositorio, define las variables de entorno y agrega un volumen montado en la ruta de `DATA_DIR`.
- **VPS propio** (DigitalOcean, Hostinger, etc.): `npm ci && npm run build && npm start`, idealmente detrás de Nginx y con PM2.
- **Docker**: hay un `Dockerfile` listo.

```bash
docker build -t icm-web .
docker run -p 3000:3000 -v icm-data:/app/data \
  -e ADMIN_PASSWORD=... -e SESSION_SECRET=... -e SITE_URL=https://tudominio.com icm-web
```

> Vercel o Netlify no sirven tal cual, porque no tienen disco persistente. Si se quiere usar uno de ellos, habría que mover la base de datos a PostgreSQL y las fotos a un almacenamiento externo (por ejemplo Cloudinary o S3).

**Copias de seguridad**: basta con copiar la carpeta `data/` completa.
