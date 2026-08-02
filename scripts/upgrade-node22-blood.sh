#!/usr/bin/env bash
set -euo pipefail

echo "==> Fix broken docker.list"
if [[ -f /etc/apt/sources.list.d/docker.list ]]; then
  if grep -qE '^\s*sudo\b' /etc/apt/sources.list.d/docker.list 2>/dev/null; then
    mv /etc/apt/sources.list.d/docker.list /etc/apt/sources.list.d/docker.list.broken.bak
    echo "    moved docker.list aside"
  fi
fi

echo "==> Install Node.js 22"
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs
hash -r || true
echo "Node: $(node -v)  npm: $(npm -v)"
MAJOR="$(node -p "process.versions.node.split('.')[0]")"
if [[ "${MAJOR}" -lt 22 ]]; then
  echo "ERROR: still on Node $(node -v)"
  exit 1
fi

echo "==> Restart blood-connect with new node"
NODE_BIN="$(command -v node)"
# refresh ExecStart path (same /usr/bin/node usually)
sed -i "s|^ExecStart=.*|ExecStart=${NODE_BIN} /var/www/blood/.output/server/index.mjs|" /etc/systemd/system/blood-connect.service
systemctl daemon-reload
systemctl restart blood-connect
sleep 2
systemctl --no-pager --full status blood-connect || true

echo "==> Restart pgdiary-api on Node 22"
pm2 restart pgdiary-api --update-env
pm2 save || true
sleep 1
pm2 status

echo "==> smoke blood"
curl -sk -o /dev/null -w "https %{http_code}\n" --resolve blood.pgdiary.cloud:443:127.0.0.1 https://blood.pgdiary.cloud/ || true
curl -s -o /dev/null -w "local8790 %{http_code}\n" http://127.0.0.1:8790/ || true
journalctl -u blood-connect -n 15 --no-pager || true
echo Done
