#!/bin/bash
set -e

echo "[*] Activating and publishing all workflows in n8n..."
sudo docker exec sentinelops-n8n node -e "
const sqlite3 = require('/usr/local/lib/node_modules/n8n/node_modules/sqlite3');
const { execSync } = require('child_process');
const db = new sqlite3.Database('/home/node/.n8n/database.sqlite');

db.all('SELECT id, name FROM workflow_entity', (err, rows) => {
  if (err) {
    console.error('DB query error:', err);
    process.exit(1);
  }
  if (!rows || rows.length === 0) {
    console.log('No workflows found in database.');
    return;
  }
  console.log('Found ' + rows.length + ' workflows.');
  for (const row of rows) {
    console.log(' -> Publishing: ' + row.name + ' (ID: ' + row.id + ')');
    try {
      execSync('n8n publish:workflow --id=' + row.id, { stdio: 'inherit' });
    } catch (e) {
      console.log('    Warning publishing ' + row.id + ': ' + e.message);
    }
  }
  db.run('UPDATE workflow_entity SET active = 1', function(err2) {
    if (err2) console.error(err2);
    else console.log('Workflows set active in DB:', this.changes);
    db.close();
  });
});
"

echo "[*] Restarting n8n to reload active webhooks..."
sudo docker restart sentinelops-n8n
sleep 6

echo "[+] Done! Testing webhook..."
