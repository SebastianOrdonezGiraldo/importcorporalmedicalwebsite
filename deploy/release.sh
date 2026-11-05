#!/usr/bin/env bash
set -Eeuo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
export ICM_ENV_FILE="${ICM_ENV_FILE:-$PWD/deploy/production.env}"
export APP_IMAGE="${APP_IMAGE:-icm-website:unreleased}"
state="$PWD/deploy/.state"
mkdir -p "$state"
chmod 700 "$state"
compose() { docker compose --env-file "$ICM_ENV_FILE" "$@"; }
fail() { printf '%s\n' "$*" >&2; exit 1; }
[[ -f "$ICM_ENV_FILE" ]] || fail "Crea deploy/production.env antes de continuar."
command="${1:-status}"
case "$command" in
  status) compose ps; [[ ! -f "$state/current" ]] || cat "$state/current"; exit 0 ;;
  build|up|rollback|backup) ;;
  *) fail "Uso: bash deploy/release.sh {build [version]|up IMAGE|rollback|backup|status}" ;;
esac
mkdir "$state/lock" 2>/dev/null || fail "Hay otra operación de despliegue; revisa deploy/.state/lock."
trap 'rmdir "$state/lock"' EXIT

if [[ "$command" == build ]]; then
  [[ -z "$(git status --porcelain)" ]] || fail "Construye releases desde un checkout limpio; primero registra y revisa los cambios."
  revision="$(git rev-parse HEAD)"
  version="${2:-${revision:0:12}}"
  [[ "$version" =~ ^[A-Za-z0-9_][A-Za-z0-9_.-]{0,100}$ ]] || fail "Versión inválida."
  export APP_VERSION="$version" GIT_REVISION="$revision" APP_IMAGE="icm-website:$version"
  if docker image inspect "$APP_IMAGE" >/dev/null 2>&1; then fail "La versión ya existe; usa otra etiqueta. No se sobrescriben releases."; fi
  compose build web
  docker image inspect --format '{{.Id}}' "$APP_IMAGE"
  exit 0
fi

if [[ "$command" == backup ]]; then
  [[ -f "$state/current" ]] || fail "No hay release activa registrada."
  export APP_IMAGE="$(cat "$state/current")"
  compose exec -T web npm run storage:backup -- --apply
  exit 0
fi

if [[ "$command" == rollback ]]; then
  [[ -f "$state/previous" ]] || fail "No hay release anterior."
  target="$(cat "$state/previous")"
else
  [[ -n "${2:-}" ]] || fail "Indica la etiqueta o ID de imagen ya construida."
  target="$2"
fi
# Resolve tags once, then run the immutable local image ID.
target="$(docker image inspect --format '{{.Id}}' "$target")"
old=""
if [[ -f "$state/current" ]]; then
  old="$(cat "$state/current")"
  if [[ "$old" == "$target" ]]; then fail "Esa imagen ya es la release activa."; fi
  export APP_IMAGE="$old"
  # Abort before touching the service if the verified R2 backup fails.
  compose exec -T web npm run storage:backup -- --apply
else
  [[ -z "$(compose ps --all --quiet web)" ]] || fail "Ya existe un servicio sin estado registrado; revísalo antes de adoptarlo."
fi
export APP_IMAGE="$target"
if ! compose up -d --no-build --wait --wait-timeout 120 web; then
  printf '%s\n' "La imagen no pasó salud; restaurando servicio anterior." >&2
  if [[ -n "$old" ]]; then
    export APP_IMAGE="$old"
    compose up -d --no-build --wait --wait-timeout 120 web || fail "También falló el retorno: revisar logs y compatibilidad de esquema."
  else
    compose stop web
    compose rm -f web
  fi
  fail "Actualización fallida; no se modificó el registro de release."
fi
if [[ -n "$old" ]]; then printf '%s\n' "$old" > "$state/previous.tmp"; mv "$state/previous.tmp" "$state/previous"; fi
printf '%s\n' "$target" > "$state/current.tmp"
mv "$state/current.tmp" "$state/current"
printf 'Release activa: %s\n' "$target"
