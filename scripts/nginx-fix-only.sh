#!/bin/bash
# Fix: nginx -t failed — broken symlink in sites-enabled
set -e

echo "==> Remove broken symlink"
rm -f /etc/nginx/sites-enabled/pgdiary.cloud

echo "==> Create site config"
cat > /etc/nginx/sites-available/pgdiary.cloud << 'EOF'
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

echo "==> Enable site"
ln -sf /etc/nginx/sites-available/pgdiary.cloud /etc/nginx/sites-enabled/pgdiary.cloud

echo "==> Test and reload"
nginx -t
systemctl reload nginx
echo "OK: nginx is valid"
