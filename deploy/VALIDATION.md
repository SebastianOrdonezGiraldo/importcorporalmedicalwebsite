# Verificación local — 2026-11-04

Resultado: Dockerfile y Compose comprobados en Docker real, Linux amd64, Node 24.22.2. Todavía no se publicó el portal ni se creó una release desde un commit limpio.

| Comprobación | Resultado |
| --- | --- |
| Build con STORAGE_DRIVER=local | 85 pruebas aprobadas y next build con TypeScript aprobado |
| Build con STORAGE_DRIVER=r2, sin credenciales | 85 pruebas aprobadas y next build con TypeScript aprobado |
| Usuario y dependencias nativas | UID 1000; sharp generó una imagen; SQLite operativo |
| Aislamiento de configuración | Imagen sin .env, .env.local, app.db ni credenciales en sus variables; configuración pública y versión incluidas |
| Protecciones de arranque | Rechaza volumen sin app.db y SITE_URL distinto de la compilación |
| Recorridos HTTP | Inicio, catálogo, producto, login, robots y sitemap devolvieron 200 |
| Salud | Respuesta 200, versión esperada y Cache-Control: no-store |
| Persistencia | Un marcador en SQLite sobrevivió a recreación, cambio de imagen y retorno |
| Traslado de datos | Exportación e importación entre volúmenes nuevos conservaron el marcador |
| CLI de respaldo | Ejecutó su modo descriptivo dentro de la imagen tras eliminar dependencias de desarrollo |
| Fallos del helper (Docker simulado) | Una prueba aprobada: respaldo fallido cancela; salud fallida intenta volver; rollback conserva registro correcto; primer arranque fallido retira servicio |
| Limpieza | Se retiraron los contenedores y volúmenes aleatorios de las pruebas |

La prueba de cambio/retorno utilizó dos imágenes de prueba compatibles, con distinto identificador de versión. Comprueba el mecanismo y la conservación de datos; no demuestra compatibilidad de futuras migraciones de esquema. Las imágenes están marcadas `working-tree`, no atribuidas a un commit de producción.

Imágenes locales disponibles: `icm-website:deployment-test`, `icm-website:deployment-test-previous` e `icm-website:production-validation`. La última fue compilada con R2 y tiene ID `sha256:d478a1d1943ec9bc88152f6bc3ff020c43f05648fa79440e9d410b774acfd1f4`.

No se usaron credenciales reales en las pruebas Docker, no se escribió en R2 y no se importó ni modificó la base local del portal. El respaldo verificado real y su restauración, los certificados, DNS, proxy y la comprobación en el dominio público requieren la fase de despliegue del servidor. El procedimiento está en README.md de esta carpeta.
