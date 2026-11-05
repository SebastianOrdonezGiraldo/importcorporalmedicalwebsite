#!/bin/sh
# Certbot deploy hook: only reload for this portal, after a successful renewal.
set -eu
[ "${RENEWED_LINEAGE:-}" = /etc/letsencrypt/live/importcorporalmedical.com ] || exit 0
/usr/sbin/nginx -t
/usr/bin/systemctl reload nginx
