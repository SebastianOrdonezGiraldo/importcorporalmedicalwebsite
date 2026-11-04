#!/usr/bin/env bash
# Syntax validation only. Does not start/reload nginx or install a certificate.
set -Eeuo pipefail
templates="$(cd "$(dirname "${BASH_SOURCE[0]}")/nginx" && pwd)"
review_dir="$(mktemp -d /tmp/icm-nginx-review.XXXXXXXX)"
[[ "$review_dir" == /tmp/icm-nginx-review.* ]] || exit 1
trap 'rm -rf -- "$review_dir"' EXIT
openssl req -x509 -newkey rsa:2048 -nodes -days 1 \
  -subj '/CN=www.importcorporalmedical.com' \
  -addext 'subjectAltName=DNS:importcorporalmedical.com,DNS:www.importcorporalmedical.com' \
  -keyout "$review_dir/key.pem" -out "$review_dir/cert.pem" >/dev/null 2>&1
for template in http-bootstrap site-https; do
  sed -e "s|/etc/letsencrypt/live/importcorporalmedical.com/fullchain.pem|$review_dir/cert.pem|g" \
      -e "s|/etc/letsencrypt/live/importcorporalmedical.com/privkey.pem|$review_dir/key.pem|g" \
      "$templates/$template.conf" > "$review_dir/site.conf"
  printf 'error_log stderr;\npid %s/nginx.pid;\nevents {}\nhttp { access_log off; include %s/site.conf; }\n' \
    "$review_dir" "$review_dir" > "$review_dir/nginx.conf"
  nginx -t -c "$review_dir/nginx.conf" -p "$review_dir/"
done
