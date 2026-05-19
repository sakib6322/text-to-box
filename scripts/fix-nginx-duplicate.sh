#!/bin/bash
# Fix 502: remove duplicate pgdiary.cloud nginx configs (keep one working site)
set -e

echo "==> Current enabled sites:"
ls -la /etc/nginx/sites-enabled/

echo ""
echo "==> Files mentioning pgdiary:"
grep -rl "pgdiary" /etc/nginx/sites-enabled/ /etc/nginx/sites-available/ 2>/dev/null || true

echo ""
echo "==> Disable ALL pgdiary-related enabled sites"
for f in /etc/nginx/sites-enabled/*; do
  [ -e "$f" ] || continue
  if grep -q "pgdiary" "$f" 2>/dev/null; then
    echo "  disabling: $f"
    rm -f "$f"
  fi
done

echo ""
echo "==> Write single canonical config"
cat > /etc/nginx/sites-available/pgdiary.cloud << 'EOF'
server {
    listen 80;
    server_name pgdiary.cloud www.pgdiary.cloud;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name pgdiary.cloud www.pgdiary.cloud;

    ssl_certificate /etc/letsencrypt/live/pgdiary.cloud/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/pgdiary.cloud/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

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
EOF

ln -sf /etc/nginx/sites-available/pgdiary.cloud /etc/nginx/sites-enabled/pgdiary.cloud

echo ""
echo "==> Test (should have NO 'conflicting server name' warnings)"
nginx -t

systemctl reload nginx

echo ""
echo "==> Local tests"
curl -sf http://127.0.0.1:8787/api/health && echo ""
curl -sfk -o /dev/null -w "HTTPS local: %{http_code}\n" https://127.0.0.1/ -H "Host: pgdiary.cloud"
echo "Done. Try https://pgdiary.cloud"
