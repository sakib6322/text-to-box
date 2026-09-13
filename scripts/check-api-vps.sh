#!/usr/bin/env bash
set -euo pipefail
cd /root/text-to-box
node --input-type=module -e "import('./server/gdriveUpload.mjs').then(()=>console.log('gdrive OK')).catch(e=>console.error('FAIL', e.message))"
echo "--- health ---"
curl -s http://127.0.0.1:8787/api/health; echo
echo "--- routes ---"
grep -n "ui-appearance\|/api/appearance\|getUiAppearance" server/index.mjs | head -20
echo "--- sample api ---"
curl -s -o /tmp/out.txt -w "%{http_code}" http://127.0.0.1:8787/api/boards; echo
head -c 300 /tmp/out.txt; echo
pm2 describe pgdiary-api | grep -E 'status|script path|node.js version|unstable'
