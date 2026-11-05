# Import Corporal Medical · Sitio web

Página principal de Import Corporal Medical S.A.S con catálogo informativo de productos y un panel de administración para gestionarlos. No hay precios, carrito ni pagos: cada producto tiene un botón para consultar por WhatsApp.

## Qué incluye

| Ruta | Qué es |
| --- | --- |
| `/` | Portada (mismo diseño y animaciones de la página original). Las tarjetas de líneas salen de la base de datos. |
| `/catalogo` | Todos los productos agrupados por línea, con filtro y buscador. |
| `/catalogo/[linea]` | Productos de una línea. |
| `/producto/[producto]` | Ficha del producto con foto, descripción, relacionados y botón de WhatsApp. |
| `/politica-de-privacidad` | Privacidad, datos personales y cookies; enlazada desde el formulario y el pie. |
| `/terminos-y-condiciones` | Condiciones de uso del catálogo y contacto por WhatsApp, con identificación de la empresa. |
| `/cambios-devoluciones-y-garantias` | Cambios, devoluciones, retracto y garantías. |
| `/admin` | Panel protegido con contraseña: crear, editar, ocultar, ordenar y eliminar productos y líneas, y subir fotos. |

## Tecnología

Para Docker, importación del catálogo, actualización y reversión, sigue [la guía de despliegue](deploy/README.md). Incluye el archivo Compose y el helper de releases para Linux.

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

Al crear una base de datos nueva se cargan automáticamente las 8 líneas y los 32 productos de la página original (`seed/data.json` y `seed/images/`). La inicialización queda registrada en la propia base: borrar líneas o productos desde el panel no vuelve a cargar el catálogo al reiniciar. Las bases existentes se conservan tal como están, incluso si están vacías. Para volver a empezar desde cero, detén el servidor y elimina la carpeta indicada por `DATA_DIR` (por defecto `data/`); esto borra también las fotos subidas.

La carga inicial se ejecuta en una transacción. Si faltan archivos iniciales o hay un error, la inicialización falla y puede reintentarse después de corregirlo, sin conservar registros parciales ni sobrescribir fotos existentes.

### Verificación local

`npm test` ejecuta las pruebas de inicialización, reinicio y catálogo usando bases temporales, sin tocar `DATA_DIR`. Complementa la comprobación con `npm run typecheck` y `npm run build`.

### Variables de entorno

| Variable | Para qué |
| --- | --- |
| `ADMIN_PASSWORD` | Contraseña del panel `/admin`. |
| `SESSION_SECRET` | Cadena aleatoria de 32+ caracteres para firmar la sesión (`openssl rand -hex 32`). |
| `DATA_DIR` | Carpeta de la base de datos y las fotos. Por defecto `./data`. |
| `SITE_URL` | URL pública del sitio, para metadatos y enlaces compartidos. |

## Dónde se cambia cada cosa

- **Productos y líneas**: desde `/admin`.
- **Búsqueda del catálogo y del administrador**: compara nombre, marca y resumen sin distinguir mayúsculas ni tildes, y normaliza espacios. Los caracteres `%` y `_` se buscan literalmente. La comparación no modifica los textos guardados ni cambia las reglas de visibilidad o los filtros por línea.
- **Enlaces anteriores**: cambiar el slug de un producto o línea registra su dirección anterior y la redirige de forma permanente a la vigente, conservando los parámetros de búsqueda y seguimiento. Los elementos ocultos o eliminados devuelven 404. Las direcciones históricas y las de registros eliminados quedan reservadas para evitar que enlaces compartidos terminen en otro producto o formen ciclos de redirección. Cambiar el nombre, o dejar vacío el slug durante una edición, conserva la dirección actual. El historial registra los cambios realizados a partir de esta actualización; no reconstruye cambios anteriores sin registros.
- **Publicación**: el panel distingue productos publicados, ocultos individualmente y ocultos por su línea. Activar un producto no lo publica mientras su línea siga oculta. Al eliminar una línea visible, los productos conservan su visibilidad; al eliminar una línea oculta, quedan sin línea y ocultos hasta que se activen individualmente. La confirmación de eliminación informa este efecto.
- **Teléfono, correo, asesores, marcas, regiones, textos del carrusel y fecha de la promoción**: `src/lib/site.ts`.
- **Textos fijos de la portada** (Nosotros, Programa, Preguntas…): `src/app/(site)/page.tsx`.
- **Formulario de distribuidores**: `src/app/(site)/ApplyForm.tsx`; validación y preparación del mensaje en `src/lib/distributor-application.ts`. Los campos se validan antes de generar el enlace, los comentarios admiten hasta 1000 caracteres y cualquier edición retira el enlace preparado. El visitante debe abrir WhatsApp y enviar el mensaje para completar la solicitud.
- **Textos legales**: `src/content/legal/`; presentación compartida en `src/components/LegalDocument.tsx` y estilos en `src/app/legal.css`. El enlace de cookies lleva a su sección en privacidad y el aviso legal a la identificación de la empresa en los términos.
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
- **Docker**: utiliza [deploy/README.md](deploy/README.md). La imagen necesita `SITE_URL` durante la compilación, credenciales al arrancar y el catálogo importado en un volumen persistente. El archivo Compose y el helper incluyen salud, respaldo previo y retorno a la versión anterior.

> Vercel o Netlify no sirven tal cual, porque no tienen disco persistente. Si se quiere usar uno de ellos, habría que mover la base de datos a PostgreSQL y las fotos a un almacenamiento externo (por ejemplo Cloudinary o S3).

**Copias de seguridad**: utiliza una instantánea consistente de SQLite y las imágenes correspondientes. No copies únicamente `app.db` mientras la base está activa en modo WAL.

## Cloudflare R2: imágenes y respaldos

SQLite continúa en `DATA_DIR/app.db` y requiere disco persistente. R2 almacena las fotos, los recursos de `public/img` y los respaldos. Las fuentes y el código siguen formando parte de la compilación.

El bucket debe permanecer **privado**, sin acceso público `r2.dev` ni dominio público conectado: también contiene las copias de la base. Las credenciales S3 se guardan solo en el servidor. El visitante recibe imágenes mediante `/media/[archivo]` y `/assets/[ruta]`; esas rutas no sirven la carpeta `backups/`. Esta configuración no usa acceso directo del navegador a R2 ni requiere CORS. Para usar CDN directo en el futuro, separa imágenes públicas y respaldos en buckets distintos.

### Configuración

En `.env.local` o `.env`, conserva las variables actuales y agrega:

```dotenv
STORAGE_DRIVER=local
R2_ACCOUNT_ID=identificador-de-la-cuenta
R2_BUCKET=nombre-del-bucket-privado
R2_ACCESS_KEY_ID=identificador-s3
R2_SECRET_ACCESS_KEY=secreto-s3
R2_PREFIX=import-corporal-medical
```

Usa credenciales S3 de R2 con permiso de lectura y escritura de objetos limitado al bucket elegido. No son el token global de la cuenta. No publiques estas variables ni les agregues el prefijo `NEXT_PUBLIC_`. El endpoint se deriva del Account ID y utiliza la región `auto`.

Referencia: https://developers.cloudflare.com/r2/examples/aws/aws-sdk-js-v3/

### Migrar los archivos actuales

Ejecuta desde la raíz del proyecto, con las dependencias instaladas y la base inicializada:

```bash
npm run storage:migrate
npm run storage:migrate -- --apply
```

El primer comando solo informa cuántos archivos copiará. El segundo copia las imágenes del catálogo, los archivos locales de uploads y los recursos de `public/img`. No borra copias locales ni modifica los productos. Descarga cada objeto y compara SHA-256; al repetirse omite contenidos idénticos y rechaza cualquier sobrescritura con contenido diferente. Utiliza un prefijo exclusivo de este proyecto. Mientras migres, evita editar o borrar imágenes desde el administrador.

Cuando termine correctamente, configura `STORAGE_DRIVER=r2`, recompila para actualizar las páginas estáticas y reinicia el servidor. Las nuevas subidas se guardarán directamente en R2. Si falta allí una imagen antigua, se conserva la lectura local durante la transición. Los errores de permisos o conexión no se ocultan como archivos inexistentes y las subidas fallidas no se guardan silenciosamente en disco.

En R2 se utilizan estas claves:

```text
import-corporal-medical/media/...
import-corporal-medical/assets/...
import-corporal-medical/backups/fecha-identificador/...
```

Las imágenes son inmutables: al reemplazar una foto se genera un nombre nuevo. Para cambiar un recurso fijo, usa otro nombre de archivo y actualiza su referencia; la migración protege los objetos existentes contra sobrescrituras.

Las imágenes reemplazadas o eliminadas se retiran del almacenamiento solo cuando ningún producto o línea las referencia. Si falla esa limpieza, el guardado del producto se mantiene y se registra un aviso para revisar el archivo huérfano. No se aplica ninguna eliminación masiva en R2.

### Respaldar en R2

```bash
npm run storage:backup
npm run storage:backup -- --apply
```

El primer comando describe la operación sin escribir en R2. El segundo crea una instantánea SQLite mediante `VACUUM INTO`, comprueba su integridad y sube una copia independiente de la base, las imágenes referenciadas y los recursos fijos. Verifica sus hashes y escribe `manifest.json` al final. Solo una carpeta con ese manifiesto verificado representa un respaldo completo. Un error en cualquier archivo termina el comando con fallo; una carpeta parcial no es un respaldo válido.

El comando está disponible también dentro de la imagen Docker. No queda programado automáticamente: configura su periodicidad y retención según la operación del servidor. Las copias existentes no se borran.

Para recuperar, descarga una carpeta completa a una ubicación aparte y verifica los SHA-256 indicados en el manifiesto. `app.db` es la base; `media/` corresponde a `DATA_DIR/uploads` y `assets/` a `public/img`. Comprueba la base y sus imágenes antes de detener el portal y sustituir datos. El comando de respaldo no sobrescribe ni restaura la base activa.

## SEO técnico

- El favicon y el icono de Apple se generan desde el logo original con `npm run seo:icons`, en PNG cuadrado de 192 × 192 y 180 × 180. Conservan las proporciones del logo. En R2 se publican bajo `assets/seo/`; los metadatos declaran formato y tamaño. Publica y verifica esos objetos antes de activar la imagen que los referencia. El favicon debe permanecer accesible y conservar una URL estable para Google.

- `SITE_URL` es el origen público del portal, por ejemplo `https://www.importcorporalmedical.com`. No es el endpoint R2. La compilación de producción falla si falta esta variable o apunta a localhost. El dominio preferido (www o sin www) debe coincidir también con las redirecciones del servidor de producción.
- `/sitemap.xml` se genera desde los productos y líneas publicados. Incluye productos sin línea, excluye ocultos y direcciones históricas, e incorpora las imágenes públicas. Las fechas de modificación de productos proceden de SQLite; no se inventan fechas para páginas estáticas. Los cambios de publicación se reflejan sin recompilar.
- `/robots.txt` anuncia el sitemap y permite rastrear las páginas. Los resultados de búsqueda usan `noindex, follow`; no se bloquea su rastreo, para que el buscador pueda leer esa instrucción. El administrador conserva autenticación y `noindex`; robots.txt no reemplaza esas protecciones.
- Inicio, catálogo, líneas, productos y páginas legales tienen canónica. Los parámetros de búsqueda y seguimiento no forman parte de la dirección canónica. Las redirecciones anteriores de slugs se conservan.
- Open Graph y Twitter definen títulos, descripciones, URLs e imágenes por página. Productos y líneas usan su propia foto. La tarjeta general es de 1200 × 630, en `public/img/seo/site-card.png`, generada con `npm run seo:card`. Si cambias esa imagen ya migrada a R2, utiliza otro nombre y actualiza `SOCIAL_IMAGE` en `src/lib/seo.ts` antes de migrar: los archivos R2 existentes no se sobrescriben.
- Los datos estructurados describen la empresa, el sitio, las rutas de navegación y los productos con información pública real. El catálogo no publica precios ni reseñas: el marcado descriptivo de producto no cumple por sí solo los requisitos de Google para resultados enriquecidos de producto. No se generan ofertas, valoraciones ni disponibilidad ficticias.

Después de desplegar, verifica en el dominio real robots, sitemap, canónicas, imágenes y redirecciones HTTPS/www. Registra la propiedad en Google Search Console y envía `/sitemap.xml`. Para verificar una propiedad de prefijo URL mediante etiqueta HTML, configura `GOOGLE_SITE_VERIFICATION` con el valor `content` que Google entregue y vuelve a compilar. Las propiedades de dominio se verifican mediante DNS. La indexación y los resultados enriquecidos se comprueban en Google después de publicar; una prueba local no demuestra indexación.

Referencias: [noindex](https://developers.google.com/search/docs/crawling-indexing/block-indexing), [canónicas](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls), [resultados de producto](https://developers.google.com/search/docs/appearance/structured-data/product-snippet).

## Accesibilidad y recuperación de errores

### Protección del acceso administrativo

El login utiliza Cloudflare Turnstile en modo Managed. Define `TURNSTILE_SITE_KEY` y `TURNSTILE_SECRET_KEY` en `deploy/production.env`; la clave privada nunca se envía al navegador ni se incorpora a la imagen. La clave pública se entrega desde la página dinámica únicamente al formulario administrativo. No se carga el script en el catálogo ni en el formulario de WhatsApp.

El servidor verifica cada token mediante Siteverify, exige el hostname de `SITE_URL` y la acción `admin_login`, y solo entonces comprueba la contraseña. Tokens ausentes, inválidos, caducados, reutilizados o errores del servicio rechazan el acceso. Se mantiene el límite de ocho contraseñas incorrectas por IP en quince minutos. Tras un intento, el widget se vuelve a crear para obtener un token nuevo; también se gestionan expiración y errores de carga.

Producción exige ambas claves al arrancar y rechaza las claves oficiales de prueba. En desarrollo, únicamente cuando no se configura ninguna de las dos claves, se omite Turnstile. No hay una variable para omitirlo en producción. Para desarrollar con desafíos usa un widget separado que autorice el hostname local. Cambiar las claves requiere recrear el contenedor, sin recompilar. Las sesiones administrativas existentes siguen vigentes hasta cerrar sesión o caducar.

Documentación: [validación del servidor](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/).

- El primer enlace permite saltar al contenido principal, tanto en el sitio como en administración. El destino admite foco sin añadir una parada adicional al recorrido normal de Tab.
- El carrusel tiene pausa/reanudación explícita. Entrar con teclado lo detiene hasta una reanudación voluntaria; también se suspende fuera de pantalla, al ocultar la pestaña y durante el uso del ratón sobre el carrusel. Las diapositivas inactivas siguen siendo inertes. La preferencia del sistema de movimiento reducido desactiva la reproducción automática y se atiende si cambia durante la visita.
- La franja de palabras conserva su desplazamiento y dispone de pausa/reanudación. Se detiene fuera de pantalla, en pestañas ocultas y con movimiento reducido.
- Las regiones funcionan con flechas izquierda/derecha, Inicio y Fin. El panel admite foco. Los nodos del diagrama también se pueden activar con Enter o Espacio, conservando el foco y actualizando su estado accesible.
- Escape cierra el menú móvil y devuelve el foco a su botón. La selección de asesor utiliza un diálogo nativo con cierre y recorrido de foco propios.
- Las pantallas `error.tsx` cubren páginas públicas, administración y sus errores de carga. `global-error.tsx` proporciona un documento independiente cuando falla la estructura principal. El aviso no muestra el mensaje técnico de la excepción, lleva el foco a su título y permite reintentar o navegar a otra página. Se utiliza `retry()` de la versión instalada de Next para volver a solicitar el contenido.
- Los errores administrativos advierten que se revise el listado antes de repetir una operación de guardado. Reintentar la carga no reenvía esa operación. Los fallos de imagen R2 siguen devolviendo 503 sin caché cuando el problema es temporal.

La comprobación manual incluyó navegación con teclado, menú y controles móviles, y fallos simulados en página y estructura principal de una copia temporal de producción. Se verificó la recuperación mediante Reintentar y la retirada de `noindex` al recuperarse. Es una verificación de estos recorridos, no una certificación completa de conformidad WCAG ni una prueba con todos los lectores de pantalla.
