#!/bin/bash
set -e

echo "[*] Exporting workflows from n8n to discover workflow IDs..."
sudo docker exec sentinelops-n8n n8n export:workflow --all --output=/tmp/exported_workflows.json

echo "[*] Publishing each workflow individually..."
sudo docker exec sentinelops-n8n node -e "
const fs = require('fs');
const { execSync } = require('child_process');
const data = JSON.parse(fs.readFileSync('/tmp/exported_workflows.json', 'utf8'));
const list = Array.isArray(data) ? data : [data];
for (const wf of list) {
  if (wf.id) {
    console.log(' -> Publishing: ' + (wf.name || 'Workflow') + ' (ID: ' + wf.id + ')');
    try {
      execSync('n8n publish:workflow --id=' + wf.id, { stdio: 'inherit' });
    } catch (e) {
      console.log('    Warning: ' + e.message);
    }
  }
}
"

echo "[*] Restarting n8n container to bind webhook listeners..."
sudo docker restart sentinelops-n8n
sleep 6

echo "[+] All workflows are published and live!"
