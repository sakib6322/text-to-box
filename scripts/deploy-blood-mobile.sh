#!/usr/bin/env bash
# Deploy blood-connect-pro from GitHub branch (default: mobile) to /var/www/blood
set -euo pipefail

APP_DIR="/var/www/blood"
BRANCH="${BRANCH:-mobile}"
REPO_URL="https://github.com/final164/blood-connect-pro.git"
NODE_BIN="$(command -v node)"

echo "==> Node $(node -v)"
MAJOR="$(node -p "process.versions.node.split('.')[0]")"
if [[ "${MAJOR}" -lt 22 ]]; then
  echo "Need Node 22+. Current: $(node -v)"
  exit 1
fi

cp -a "${APP_DIR}/.env" /tmp/blood.env.bak 2>/dev/null || true

if [[ ! -d "${APP_DIR}/.git" ]]; then
  git clone -b "${BRANCH}" "${REPO_URL}" "${APP_DIR}"
else
  cd "${APP_DIR}"
  git remote set-url origin "${REPO_URL}"
  git fetch origin "${BRANCH}"
  git checkout -f "${BRANCH}"
  git reset --hard "origin/${BRANCH}"
  git clean -fd -e .env -e node_modules -e .output
fi

cd "${APP_DIR}"
test -f .env || cp /tmp/blood.env.bak .env

if [[ ! -f .env ]]; then
  echo "Missing ${APP_DIR}/.env — fill keys first"
  exit 1
fi

echo "==> On $(git rev-parse --abbrev-ref HEAD) @ $(git rev-parse --short HEAD)"
export NITRO_PRESET=node-server
rm -rf node_modules package-lock.json
npm install --engine-strict=false
npm install lightningcss-linux-x64-gnu @rolldown/binding-linux-x64-gnu --no-save || true
npm run build

test -f .output/server/index.mjs

systemctl restart blood-connect
sleep 2
systemctl --no-pager --full status blood-connect || true
curl -s -o /dev/null -w "local8790 %{http_code}\n" http://127.0.0.1:8790/ || true
echo "Deployed ${BRANCH} → https://blood.pgdiary.cloud"
