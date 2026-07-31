#!/usr/bin/env bash
# Paste/run as root on VPS (no repo checkout required).
# DNS first: A record  other → 187.127.166.35  (Cloudflare: DNS only / grey cloud)
set -euo pipefail

SUBDOMAIN="other.pgdiary.cloud"
WEB_ROOT="/var/www/other"

echo "==> Creating ${WEB_ROOT}"
mkdir -p "${WEB_ROOT}"

if [[ ! -f "${WEB_ROOT}/index.html" ]]; then
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
  <p>Placeholder is live. Replace files in <code>/var/www/other</code> with your site <code>dist/</code>.</p>
  <p>Main site: <a href="https://pgdiary.cloud">pgdiary.cloud</a></p>
</body>
</html>
HTML
  echo "    placeholder index.html written"
else
  echo "    index.html exists — not overwritten"
fi

echo "==> Nginx config"
cat > "/etc/nginx/sites-available/${SUBDOMAIN}" << 'NGINX'
server {
    listen 80;
    server_name other.pgdiary.cloud;

    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    root /var/www/other;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
NGINX

ln -sf "/etc/nginx/sites-available/${SUBDOMAIN}" "/etc/nginx/sites-enabled/${SUBDOMAIN}"
nginx -t
systemctl reload nginx

echo "==> Smoke test (Host header)"
curl -sf -o /dev/null -w "local HTTP %{http_code}\n" -H "Host: ${SUBDOMAIN}" http://127.0.0.1/ || echo "FAIL"

RESOLVED="$(getent hosts "${SUBDOMAIN}" 2>/dev/null | awk '{print $1}' | head -1 || true)"
echo "==> DNS: ${RESOLVED:-not resolving yet}"

if [[ -n "${RESOLVED}" ]]; then
  echo "==> Running certbot"
  if certbot --nginx -d "${SUBDOMAIN}" --non-interactive --agree-tos --register-unsafely-without-email; then
    nginx -t && systemctl reload nginx
    echo "SSL OK — https://${SUBDOMAIN}"
  else
    echo "certbot failed — check DNS / rate limits; retry: certbot --nginx -d ${SUBDOMAIN}"
  fi
else
  echo ""
  echo "Add DNS A record, then run:"
  echo "  certbot --nginx -d ${SUBDOMAIN}"
  echo ""
  echo "  Type: A | Name: other | Value: 187.127.166.35"
fi

echo "Done. Files in ${WEB_ROOT}"
