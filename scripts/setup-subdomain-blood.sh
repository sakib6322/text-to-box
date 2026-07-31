#!/usr/bin/env bash
# Convenience wrapper kept in text-to-box — real deploy lives in blood-connect-pro.
# Paste on VPS after DNS: A blood → 187.127.166.35
set -euo pipefail

APP_DIR="/var/www/blood"
REPO_URL="https://github.com/final164/blood-connect-pro.git"

mkdir -p "$(dirname "${APP_DIR}")"
if [[ ! -d "${APP_DIR}/.git" ]]; then
  git clone "${REPO_URL}" "${APP_DIR}"
else
  git -C "${APP_DIR}" pull --ff-only origin main || {
    git -C "${APP_DIR}" fetch --depth 1 origin main
    git -C "${APP_DIR}" reset --hard origin/main
  }
fi

if [[ ! -f "${APP_DIR}/.env" ]]; then
  echo "Create ${APP_DIR}/.env from .env.example (Supabase + VAPID), then re-run."
  cp -n "${APP_DIR}/.env.example" "${APP_DIR}/.env" || true
  echo "  nano ${APP_DIR}/.env"
  exit 1
fi

# Prefer inline path if deploy script missing on older clones
if [[ -f "${APP_DIR}/scripts/deploy-vps-blood.sh" ]]; then
  bash "${APP_DIR}/scripts/deploy-vps-blood.sh"
else
  bash "$(cd "$(dirname "$0")" && pwd)/setup-subdomain-blood-inline.sh"
fi
