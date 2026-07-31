#!/usr/bin/env bash
# Setup other.pgdiary.cloud on this VPS (run as root on 187.127.166.35)
# Usage:
#   bash scripts/setup-subdomain-other.sh           # HTTP + placeholder
#   bash scripts/setup-subdomain-other.sh --ssl      # also certbot (DNS must resolve)
#   bash scripts/setup-subdomain-other.sh --from-dist /path/to/dist
set -euo pipefail

SUBDOMAIN="other.pgdiary.cloud"
WEB_ROOT="/var/www/other"
NGINX_AVAIL="/etc/nginx/sites-available/${SUBDOMAIN}"
NGINX_ENABLED="/etc/nginx/sites-enabled/${SUBDOMAIN}"
APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CONF_SRC="${APP_DIR}/deploy/nginx-other.pgdiary.cloud.conf"
DO_SSL=0
DIST_SRC=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --ssl) DO_SSL=1; shift ;;
    --from-dist) DIST_SRC="${2:-}"; shift 2 ;;
    *) echo "Unknown arg: $1"; exit 1 ;;
  esac
done

echo "==> DNS check for ${SUBDOMAIN}"
RESOLVED="$(getent hosts "${SUBDOMAIN}" 2>/dev/null | awk '{print $1}' | head -1 || true)"
echo "    resolved: ${RESOLVED:-'(none)'}"
if [[ -z "${RESOLVED}" ]]; then
  echo ""
  echo "!!! DNS A record missing. Add at your DNS panel (Cloudflare / registrar):"
  echo "    Type: A"
  echo "    Name: other"
  echo "    Value: 187.127.166.35"
  echo "    Proxy: DNS only (grey cloud) until SSL works"
  echo ""
  echo "    Continuing with HTTP nginx + web root so host-header / IP tests work."
  echo "    Re-run with --ssl after DNS propagates."
  echo ""
fi

echo "==> Web root ${WEB_ROOT}"
mkdir -p "${WEB_ROOT}"

if [[ -n "${DIST_SRC}" ]]; then
  if [[ ! -d "${DIST_SRC}" ]]; then
    echo "DIST not found: ${DIST_SRC}"; exit 1
  fi
  rsync -a --delete "${DIST_SRC}/" "${WEB_ROOT}/"
  echo "    synced from ${DIST_SRC}"
elif [[ ! -f "${WEB_ROOT}/index.html" ]]; then
  cat > "${WEB_ROOT}/index.html" << 'HTML'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>other.pgdiary.cloud</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 36rem; margin: 3rem auto; padding: 0 1rem; line-height: 1.5; }
    code { background: #f1f5f9; padding: 0.1em 0.35em; border-radius: 4px; }
  </style>
</head>
<body>
  <h1>other.pgdiary.cloud</h1>
  <p>Placeholder site is live. Replace <code>/var/www/other</code> with your built <code>dist/</code>:</p>
  <pre>bash scripts/setup-subdomain-other.sh --from-dist /path/to/dist</pre>
  <p>Main app stays at <a href="https://pgdiary.cloud">pgdiary.cloud</a>.</p>
</body>
</html>
HTML
  echo "    wrote placeholder index.html"
else
  echo "    index.html already present — left unchanged"
fi

echo "==> Nginx site config"
if [[ -f "${CONF_SRC}" ]]; then
  cp "${CONF_SRC}" "${NGINX_AVAIL}"
else
  echo "WARN: ${CONF_SRC} missing — writing inline HTTP config"
  cat > "${NGINX_AVAIL}" << 'NGINX'
server {
    listen 80;
    server_name other.pgdiary.cloud;
    location /.well-known/acme-challenge/ { root /var/www/html; }
    root /var/www/other;
    index index.html;
    location / { try_files $uri $uri/ /index.html; }
}
NGINX
fi
ln -sf "${NGINX_AVAIL}" "${NGINX_ENABLED}"
nginx -t
systemctl reload nginx
echo "    nginx reloaded"

echo "==> Local Host-header smoke test"
curl -sf -o /dev/null -w "HTTP %{http_code}\n" -H "Host: ${SUBDOMAIN}" http://127.0.0.1/ || echo "FAIL local"

if [[ "${DO_SSL}" -eq 1 ]]; then
  if [[ -z "${RESOLVED}" ]]; then
    echo "ERROR: cannot run certbot — DNS for ${SUBDOMAIN} does not resolve yet."
    exit 1
  fi
  echo "==> certbot --nginx -d ${SUBDOMAIN}"
  certbot --nginx -d "${SUBDOMAIN}" --non-interactive --agree-tos --register-unsafely-without-email || \
    certbot --nginx -d "${SUBDOMAIN}" --non-interactive --agree-tos -m admin@pgdiary.cloud || true
  nginx -t && systemctl reload nginx
fi

echo ""
echo "Done."
echo "  Files:  ${WEB_ROOT}"
echo "  Nginx:  ${NGINX_AVAIL}"
echo "  Open:   http://${SUBDOMAIN}  (after DNS)"
echo "  SSL:    bash scripts/setup-subdomain-other.sh --ssl"
