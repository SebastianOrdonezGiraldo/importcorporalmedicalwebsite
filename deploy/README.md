# Despliegue reproducible

La configuración Nginx y el orden de preparación DNS/HTTPS están en [PUBLICATION.md](PUBLICATION.md). No instales las plantillas hasta confirmar el servidor y revisar el estado del dominio.

Destino: un servidor Linux con Docker Engine y Compose >= 2.30 (env_file raw), Bash y Git. Una sola instancia del portal escribe SQLite. El proxy HTTPS corre en el host y llega a `127.0.0.1:3010`; el contenedor no publica su puerto en Internet. Este procedimiento no configura DNS ni certificados ni cambia el sitio público existente.

## Qué se versiona

- Imagen Node 24 Debian fijada por digest; dependencias instaladas con `npm ci` y package-lock.json.
- Cada release tiene etiqueta, revisión Git y un ID de imagen. El arranque y `/api/health` anuncian la versión realmente incluida. El helper despliega por ID, sin reconstruir ni descargar durante `up`.
- La compilación recibe solamente `SITE_URL`, `STORAGE_DRIVER`, `GOOGLE_SITE_VERIFICATION` y los identificadores de release. Las credenciales llegan al contenedor al arrancar; `.env`, datos locales y configuración de despliegue quedan fuera del contexto Docker.
- El volumen `icm-website-data` contiene SQLite y las copias locales de imágenes. R2 sigue siendo privado y conserva archivos y respaldos.

Reproducible significa poder ejecutar la misma imagen y conocer su código y dependencias. Reconstruir puede generar otro ID por las marcas de tiempo y los identificadores de Next. Conserva la imagen exacta, no solo su etiqueta. No uses `latest`, `docker image prune -a` ni `docker compose down -v` para actualizar.

## 1. Preparar la configuración

Desde la raíz del checkout en el servidor:

```bash
cp deploy/production.env.example deploy/production.env
chmod 600 deploy/production.env
# Editar production.env con las credenciales propias, sin pegarlas en comandos ni Git.
```

Usa valores literales, sin comillas, sin espacios iniciales/finales y sin saltos de línea. La contraseña debe tener al menos 12 caracteres y ser propia; `SESSION_SECRET` requiere 32+ caracteres aleatorios (`openssl rand -hex 32`). No ejecutes `docker compose config` sin `--quiet`, porque muestra las variables. Usuarios con acceso al socket Docker pueden leer las variables del contenedor; limita ese acceso.

`SITE_URL` debe coincidir con el dominio HTTPS definitivo; para este portal, `https://www.importcorporalmedical.com`. Mantén `STORAGE_DRIVER=r2`, el bucket `importwebsite` y su prefijo actual. Conserva `ALLOW_CATALOG_INITIALIZATION=false`: vamos a llevar el catálogo existente. La configuración pública también se usa al compilar; si cambia, construye otra release.

El helper usa el proyecto `icm-website` y el volumen estable `icm-website-data`. Ejecutarlo siempre desde el mismo checkout del servidor conserva `deploy/.state/current` y `previous`. Si cambias de checkout, traslada también ese estado privado. Nunca ejecutes dos proyectos contra el mismo volumen SQLite. Para otro portal utiliza nombres de proyecto, volumen y puerto distintos.

## 2. Construir una release

Primero registra y revisa todos los cambios del proyecto. El helper exige un checkout limpio, incluidos archivos nuevos; evita atribuir a un commit código que todavía no está registrado.

```bash
bash deploy/release.sh build 2026.11.04-1
```

La construcción ejecuta `npm test` y `next build` con verificación de TypeScript. Las pruebas de Docker y de fallos del helper se ejecutan aparte como se indica al final de esta guía. No lee el `.env` de desarrollo. Una etiqueta existente se rechaza. Para cambiar la imagen base, actualiza conscientemente el digest en las dos etapas del Dockerfile y repite la validación.

Para trasladar la misma imagen sin un registro:

```bash
docker image save icm-website:2026.11.04-1 | gzip > /ruta/privada/icm-2026.11.04-1.tar.gz
# Transferir por SSH y cargar en el destino:
gzip -dc /ruta/privada/icm-2026.11.04-1.tar.gz | docker image load
```

Conserva el archivo y su SHA-256 junto con el commit de la release. Construye para la arquitectura del servidor; las pruebas de esta entrega usan Linux amd64.

## 3. Importar el catálogo existente una sola vez

Detén las ediciones administrativas durante la copia y el traslado. No copies un `app.db` activo con un simple `cp`: puede depender del WAL. Desde el equipo que contiene los datos actuales, Node 22.13+:

```bash
node scripts/catalog-snapshot.mjs export ./data ./deploy/exports/catalogo-inicial
```

En PowerShell funciona igual. El script abre SQLite en modo lectura, comprueba integridad y tablas, genera una instantánea consistente mediante `VACUUM INTO` y copia `uploads`. Rechaza destinos existentes. No altera la base de origen ni escribe en R2. Transfiere esa carpeta por SSH a un directorio privado del servidor. En R2, los objetos existentes se mantienen; verifica que la configuración use el mismo bucket/prefijo.

En el servidor, con la imagen cargada y **antes del primer arranque**:

```bash
export APP_IMAGE=icm-website:2026.11.04-1
docker volume create icm-website-data
docker run --rm --network none \
  --mount type=volume,source=icm-website-data,target=/app/data \
  --mount type=bind,source=/ruta/privada/catalogo-inicial,target=/snapshot,readonly \
  "$APP_IMAGE" node scripts/catalog-snapshot.mjs import /snapshot /app/data
```

El volumen nuevo hereda el propietario del directorio de la imagen (usuario `node`, UID 1000). El importador rechaza un volumen con cualquier contenido y nunca sobrescribe una base. Si un volumen anterior tiene otro propietario, investiga antes de cambiar permisos; no arranques el portal como root para ocultar el problema. Una copia interrumpida queda sin `app.db` y el arranque falla: revisa esa copia antes de volver a intentar, sin borrar datos existentes.

`ALLOW_CATALOG_INITIALIZATION=true` solo sirve cuando se desea conscientemente un catálogo nuevo a partir del seed. No se necesita para importar datos.

## 4. Arrancar y comprobar

```bash
bash deploy/release.sh up icm-website:2026.11.04-1
bash deploy/release.sh status
curl --fail http://127.0.0.1:3010/api/health
```

El helper espera hasta 120 segundos a que Docker marque el contenedor como saludable. Comprueba además inicio, catálogo, producto, login administrativo, imágenes R2 y selector de asesor. El healthcheck consulta SQLite, pero no comprueba Internet ni R2: una caída de R2 no debe reiniciar el portal repetidamente. Antes de publicar, prueba también una subida/reemplazo desde el administrador y un respaldo completo.

El proxy del host debe terminar HTTPS, redirigir al dominio canónico, pasar `Host`, `X-Forwarded-Proto` y una IP de cliente saneada, permitir cargas de al menos 7 MB y reenviar a `127.0.0.1:3010`. No caches `/admin`, `/api/health` ni respuestas 503. La instalación de certificados, la auditoría de rutas del sitio antiguo y el cambio de DNS forman parte del paso de publicación del servidor, todavía pendiente.

## 5. Actualizar y volver atrás

Mantén la configuración pública de la release anterior durante una actualización que pueda requerir retorno automático. Cambiar dominio, modo de almacenamiento o verificación de Google requiere coordinar configuración y ambas imágenes: el arranque rechaza discrepancias deliberadamente.

```bash
bash deploy/release.sh build 2026.11.05-1
bash deploy/release.sh up icm-website:2026.11.05-1
# Si hay un problema funcional después de pasar salud:
bash deploy/release.sh rollback
```

Antes de cambiar una release activa, el helper ejecuta el respaldo verificado en R2; si falla, la actualización se cancela. Evita ediciones administrativas durante respaldo y actualización para no borrar imágenes referenciadas por la instantánea. Si la nueva imagen falla salud, intenta restablecer la anterior. El registro `current/previous` se actualiza únicamente tras pasar salud; el helper usa un bloqueo para evitar despliegues simultáneos. Un bloqueo abandonado requiere revisar que no haya otra operación antes de retirarlo manualmente.

El retorno recupera **código**, mantiene los datos actuales y también requiere respaldo previo. No deshace migraciones de SQLite. Solo despliega cambios de esquema compatibles con la versión anterior si necesitas retorno automático; cambios destructivos requieren una ventana de mantenimiento y un plan de restauración probado. Los respaldos y la imagen anterior son independientes. No se garantiza cero interrupciones: hay un solo contenedor.

```bash
bash deploy/release.sh backup
APP_IMAGE=icm-website:2026.11.05-1 docker compose --env-file deploy/production.env logs --tail 100 web
```

La periodicidad/retención de respaldos y un simulacro de restauración deben configurarse antes de publicar. El helper no borra respaldos, imágenes ni volúmenes. Una restauración de datos no está automatizada: usa una carpeta completa con `manifest.json`, verifica sus hashes y restaura primero en un volumen aparte. Consulta también la sección R2 del README principal.

## Verificar cambios en el equipo de desarrollo

Una imagen de prueba puede construirse desde cambios sin registrar, identificándola expresamente como tal. No es una release de producción:

```bash
docker build --build-arg SITE_URL=https://www.importcorporalmedical.com \
  --build-arg STORAGE_DRIVER=local --build-arg APP_VERSION=deployment-test \
  --build-arg GIT_REVISION=working-tree -t icm-website:deployment-test .
node tests/docker-smoke.mjs icm-website:deployment-test
```

La prueba necesita libre el puerto local 3289. Genera credenciales de prueba y un proyecto/volúmenes con nombres aleatorios. Comprueba rutas, salud, usuario, sharp, CLI de mantenimiento, recreación e importación; elimina sus propios contenedores y volúmenes al terminar. No usa el bucket R2 ni la base local. Un segundo argumento permite verificar un cambio a otra imagen compatible y el retorno, conservando un marcador escrito en SQLite.

En Linux, las ramas de fallo del helper se prueban con Docker simulado, sin servicios externos:

```bash
node --test tests/release-helper.test.mjs
```

También puede ejecutarse esta última prueba dentro de la imagen, montando el checkout en modo lectura en `/review` y usando `node --test /review/tests/release-helper.test.mjs`. La prueba usa Bash; en Windows directo se omite. Los escenarios incluyen respaldo fallido, salud fallida, retorno explícito y fallo del primer arranque. No sustituyen la prueba de un respaldo/restauración real en el servidor.
