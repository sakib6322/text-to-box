#!/bin/bash
# Run on server inside ~/text-to-box after uploading latest code
set -e
cd "$(dirname "$0")/.."

echo "Stopping old PM2 apps..."
pm2 delete pgdiary 2>/dev/null || true
pm2 delete next-app 2>/dev/null || true
pm2 delete pgdiary-api 2>/dev/null || true
pm2 delete pgdiary-web 2>/dev/null || true

echo "Freeing ports 8080 and 8787..."
fuser -k 8080/tcp 2>/dev/null || true
fuser -k 8787/tcp 2>/dev/null || true

echo "Building frontend..."
npm run build

echo "Starting PM2..."
pm2 start ecosystem.config.cjs
pm2 save

echo "Done. Status:"
pm2 list
