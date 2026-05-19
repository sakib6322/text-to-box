#!/bin/bash
# Fix 502 Bad Gateway for pgdiary.cloud — run on server: bash scripts/fix-502.sh
set -e

APP_DIR="${APP_DIR:-$HOME/text-to-box}"
cd "$APP_DIR"

echo "==> 1. Remove broken nginx symlink (points to missing file)"
rm -f /etc/nginx/sites-enabled/pgdiary.cloud
# Also remove dangling symlink target check
if [ -L /etc/nginx/sites-enabled/pgdiary.cloud ]; then
  rm -f /etc/nginx/sites-enabled/pgdiary.cloud
fi

echo "==> 2. Install nginx site config (must exist BEFORE ln -s)"
if [ -f "$APP_DIR/deploy/nginx-pgdiary.cloud.conf" ]; then
  cp "$APP_DIR/deploy/nginx-pgdiary.cloud.conf" /etc/nginx/sites-available/pgdiary.cloud
else
  cat > /etc/nginx/sites-available/pgdiary.cloud << 'NGINX'
server {
    listen 80;
    server_name pgdiary.cloud www.pgdiary.cloud;
    root /root/text-to-box/dist;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:8787;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
NGINX
fi

ln -sf /etc/nginx/sites-available/pgdiary.cloud /etc/nginx/sites-enabled/pgdiary.cloud

# Drop broken default SSL proxy if it causes 502
if [ -f /etc/nginx/sites-enabled/default ]; then
  mv /etc/nginx/sites-enabled/default /etc/nginx/sites-enabled/default.bak 2>/dev/null || true
fi

if ! nginx -t 2>/dev/null; then
  echo "WARN: SSL paths missing? Trying HTTP-only nginx config..."
  cat > /etc/nginx/sites-available/pgdiary.cloud << 'NGINX_HTTP'
server {
    listen 80;
    server_name pgdiary.cloud www.pgdiary.cloud;
    root /root/text-to-box/dist;
    index index.html;
    location /api/ {
        proxy_pass http://127.0.0.1:8787;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
    location / { try_files $uri $uri/ /index.html; }
}
NGINX_HTTP
  nginx -t
fi
systemctl reload nginx

echo "==> 3. Build frontend"
npm run build

echo "==> 4. Stop old PM2 apps and free port 8787"
pm2 delete all 2>/dev/null || true
fuser -k 8787/tcp 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true

echo "==> 5. Ensure ecosystem.config.cjs exists"
if [ ! -f ecosystem.config.cjs ]; then
  cat > ecosystem.config.cjs << 'ECO'
module.exports = {
  apps: [{
    name: "pgdiary-api",
    cwd: __dirname,
    script: "server/index.mjs",
    interpreter: "node",
    env: { NODE_ENV: "production", PORT: 8787 },
  }],
};
ECO
fi

echo "==> 6. Start API with PM2"
pm2 start ecosystem.config.cjs
pm2 save

echo "==> 7. Health checks"
sleep 2
echo -n "API: "
curl -sf http://127.0.0.1:8787/api/health || echo "FAIL"
echo ""
echo -n "Nginx HTTP: "
curl -sf -o /dev/null -w "HTTP %{http_code}\n" -H "Host: pgdiary.cloud" http://127.0.0.1/ || echo "FAIL"
echo -n "Nginx HTTPS: "
curl -sfk -o /dev/null -w "HTTP %{http_code}\n" -H "Host: pgdiary.cloud" https://127.0.0.1/ || echo "FAIL"

echo ""
pm2 list
echo "Done. Open http://pgdiary.cloud"
