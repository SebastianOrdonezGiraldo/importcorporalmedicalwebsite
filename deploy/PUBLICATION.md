# Publicación del dominio

Inspección de solo lectura: 2026-11-04. El VPS disponible es `187.124.231.238`, Ubuntu 24.04, arquitectura x86_64, Docker y Compose 5.3.1. El acceso SSH se verificó con una clave ya autorizada. El puerto 3010 estaba libre. Hay otros portales activos: no sustituir sus configuraciones ni reiniciar sus procesos.

## Situación DNS y certificados

Los servidores autoritativos son `ns73.domaincontrol.com` y `ns74.domaincontrol.com` (GoDaddy). La consulta A del dominio raíz devolvió simultáneamente:

- `76.223.105.230`
- `13.248.243.5`
- `185.199.108.153`
- `187.124.231.238`

`www` es un CNAME al dominio raíz. No hay configuración Nginx ni certificado instalado para estos dos nombres en el VPS inspeccionado. Los certificados existentes pertenecen a otros portales.

Estas cuatro IP no constituyen un despliegue coordinado de esta aplicación. Los visitantes y la validación HTTP-01 pueden alcanzar servidores diferentes. Primero hay que confirmar el destino y revisar el panel DNS de GoDaddy. Hostinger no devolvió una zona DNS de este dominio; no sirve modificar allí una zona que no es autoritativa.

Para publicar en este VPS, el estado objetivo es:

| Tipo | Nombre | Valor |
| --- | --- | --- |
| A | @ | 187.124.231.238, único destino IPv4 del portal |
| CNAME | www | importcorporalmedical.com |

No cambiar MX, TXT, correo, NS ni subdominios de otros servicios. Revisar cualquier AAAA existente: solo mantenerlo si esa IPv6 sirve también este portal y supera las pruebas. Antes de retirar las otras A, registrar la configuración anterior y confirmar que no sostengan un servicio que deba conservarse. Cambiar las A públicas es el corte de tráfico, no una preparación local.

## Orden de ejecución en el servidor confirmado

1. Registrar y revisar el código, construir una imagen identificada por commit y llevarla al servidor. Conservar esa imagen y su ID.
2. Preparar el checkout y su archivo privado `deploy/production.env`; importar el catálogo y arrancar Compose en `127.0.0.1:3010` según `README.md`. Verificar base, imágenes, versión y respaldo real antes del corte.
3. Crear `/var/www/icm-website-acme/.well-known/acme-challenge/`. Revisar que no exista un sitio con los mismos `server_name`. Instalar únicamente `nginx/http-bootstrap.conf` como nuevo sitio del portal. Ejecutar `nginx -t` antes de cada recarga; no reemplazar el archivo global de Nginx.
4. Corregir las A públicas en GoDaddy y verificar las respuestas autoritativas y públicas de ambos nombres. Comprobar desde fuera del VPS que el archivo de prueba de `/.well-known/acme-challenge/` llega a este servidor. Durante esta breve fase las demás rutas responden 503.
5. Solicitar un certificado para los dos nombres:

   ```bash
   certbot certonly --webroot -w /var/www/icm-website-acme \
     --cert-name importcorporalmedical.com \
     -d importcorporalmedical.com -d www.importcorporalmedical.com
   ```

   Usar el registro ACME existente o configurar el contacto real y aceptar sus términos según la operación del servidor; no inventar un correo ni registrar una cuenta automáticamente. Si la validación falla, investigar DNS y ruta HTTP antes de repetir solicitudes.

6. Confirmar los archivos reales del certificado. Sustituir solo el nuevo sitio del portal por `nginx/site-https.conf`, ejecutar `nginx -t` y recargar Nginx. La configuración envía HTTP y el dominio sin www al origen canónico HTTPS conservando ruta y consulta; permite cargas de 8 MB y conserva el streaming de Next.
7. Verificar HTTPS de ambos nombres sin omitir la validación TLS, redirecciones, salud y versión, catálogo, productos, imágenes R2 y login. Comprobar también una subida administrativa, un respaldo completo y las URLs del sitio anterior que requieran redirección.
8. Revisar el temporizador de renovación. Si no existe un hook equivalente, instalar `deploy/certbot-reload.sh` como `/etc/letsencrypt/renewal-hooks/deploy/50-icm-website-reload`, propiedad de root y modo 750. Solo recarga Nginx cuando se renueva este certificado y valida primero su configuración. Ejecutar `certbot renew --cert-name importcorporalmedical.com --dry-run --run-deploy-hooks --no-random-sleep-on-renew`. La ruta ACME permanece disponible en la configuración final. La prueba usa el entorno de ensayo de Let's Encrypt y no reemplaza el certificado público.

No se garantiza publicación sin interrupción con este procedimiento HTTP-01. Si se necesita conservar un sitio anterior sin esa ventana, preparar primero un certificado DNS-01 con acceso al DNS y coordinar el corte. No activar HSTS con subdominios sin revisar los demás servicios.

## Validar las plantillas antes de instalarlas

En Linux con Nginx y OpenSSL:

```bash
bash deploy/check-nginx.sh
```

Usa un certificado temporal para `nginx -t`, sin iniciar otro servidor, tocar certificados reales ni recargar Nginx. Validar sintaxis no demuestra que el certificado público, DNS o backend funcionen.

Referencias: [proxy y cabeceras en Nginx](https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_set_header), [validación HTTP-01 de Let's Encrypt](https://letsencrypt.org/docs/challenge-types/).
