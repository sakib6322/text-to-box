#!/usr/bin/env bash
# Self-contained: paste/run as root on VPS 187.127.166.35
# DNS first: A record  blood → 187.127.166.35  (Cloudflare: DNS only until SSL)
set -euo pipefail

SUBDOMAIN="blood.pgdiary.cloud"
APP_DIR="/var/www/blood"
REPO_URL="https://github.com/final164/blood-connect-pro.git"
APP_PORT="8790"
NODE_BIN="$(command -v node || true)"

if [[ -z "${NODE_BIN}" ]]; then
  echo "Install Node 20+ first (e.g. nodesource / nvm), then re-run."
  exit 1
fi
echo "==> Node $(node -v) at ${NODE_BIN}"

mkdir -p "${APP_DIR}"
if [[ ! -d "${APP_DIR}/.git" ]]; then
  echo "==> Cloning ${REPO_URL}"
  git clone "${REPO_URL}" "${APP_DIR}"
else
  echo "==> Updating repo"
  git -C "${APP_DIR}" fetch --depth 1 origin main
  git -C "${APP_DIR}" reset --hard origin/main
fi

cd "${APP_DIR}"

if [[ ! -f "${APP_DIR}/.env" ]]; then
  cp "${APP_DIR}/.env.example" "${APP_DIR}/.env"
  echo ""
  echo "Created ${APP_DIR}/.env from example — EDIT IT NOW, then re-run this script."
  echo "  nano ${APP_DIR}/.env"
  echo "Need: VITE_SUPABASE_* / SUPABASE_* / service role / VAPID keys"
  exit 1
fi

export NITRO_PRESET=node-server
# blood-connect-pro lockfile is often out of sync with package.json — use install, not ci
echo "==> npm install && build (NITRO_PRESET=node-server)"
npm install --engine-strict=false
npm run build

if [[ ! -f "${APP_DIR}/.output/server/index.mjs" ]]; then
  echo "Build missing .output/server/index.mjs — check build logs"
  ls -la "${APP_DIR}/.output" 2>/dev/null || true
  exit 1
fi

echo "==> systemd blood-connect"
cat > /etc/systemd/system/blood-connect.service << UNIT
[Unit]
Description=Blood Connect Pro (Nitro / TanStack Start)
After=network.target

[Service]
Type=simple
WorkingDirectory=${APP_DIR}
EnvironmentFile=${APP_DIR}/.env
Environment=PORT=${APP_PORT}
Environment=HOST=127.0.0.1
Environment=NODE_ENV=production
ExecStart=${NODE_BIN} ${APP_DIR}/.output/server/index.mjs
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
UNIT

# Run as root if www-data lacks nvm/node path; tighten later if desired
systemctl daemon-reload
systemctl enable blood-connect
systemctl restart blood-connect
sleep 2
systemctl --no-pager --full status blood-connect || true

echo "==> nginx ${SUBDOMAIN}"
cat > "/etc/nginx/sites-available/${SUBDOMAIN}" << NGINX
server {
    listen 80;
    server_name ${SUBDOMAIN};

    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        proxy_pass http://127.0.0.1:${APP_PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
NGINX

ln -sf "/etc/nginx/sites-available/${SUBDOMAIN}" "/etc/nginx/sites-enabled/${SUBDOMAIN}"
nginx -t
systemctl reload nginx

echo "==> smoke"
curl -sf -o /dev/null -w "node :${APP_PORT} %{http_code}\n" "http://127.0.0.1:${APP_PORT}/" || echo "node FAIL — journalctl -u blood-connect -n 80"
curl -sf -o /dev/null -w "nginx Host %{http_code}\n" -H "Host: ${SUBDOMAIN}" http://127.0.0.1/ || echo "nginx FAIL"

RESOLVED="$(getent hosts "${SUBDOMAIN}" 2>/dev/null | awk '{print $1}' | head -1 || true)"
echo "==> DNS: ${RESOLVED:-not resolving yet}"

if [[ -n "${RESOLVED}" ]]; then
  certbot --nginx -d "${SUBDOMAIN}" --non-interactive --agree-tos --register-unsafely-without-email || \
    echo "certbot failed — retry: certbot --nginx -d ${SUBDOMAIN}"
  nginx -t && systemctl reload nginx
  echo "Try https://${SUBDOMAIN}"
else
  echo ""
  echo "Add DNS, then: certbot --nginx -d ${SUBDOMAIN}"
  echo "  Type A | Name blood | Value 187.127.166.35 | Proxy off"
fi

echo "Done."
