#!/usr/bin/env bash
set -euo pipefail

cat > /etc/nginx/sites-available/blood.pgdiary.cloud <<'NGINX'
server {
    listen 80;
    server_name blood.pgdiary.cloud;

    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        proxy_pass http://127.0.0.1:8790;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
NGINX

ln -sf /etc/nginx/sites-available/blood.pgdiary.cloud /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
systemctl restart blood-connect
sleep 1

echo '--- node ---'
curl -sI http://127.0.0.1:8790/ | head -3
echo '--- nginx ---'
curl -sI -H 'Host: blood.pgdiary.cloud' http://127.0.0.1/ | head -5
echo '--- dns ---'
getent hosts blood.pgdiary.cloud || echo 'DNS not set'
systemctl is-active blood-connect
echo Done
