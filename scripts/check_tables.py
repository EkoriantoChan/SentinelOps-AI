import subprocess

js = """
const fs = require('fs');
const sqlite3 = require('/usr/local/lib/node_modules/n8n/node_modules/sqlite3');
const db = new sqlite3.Database('/home/node/.n8n/database.sqlite');

// Read the nodes of hy4bNgxoLJSKoHCW
db.get("SELECT nodes FROM workflow_entity WHERE id = 'hy4bNgxoLJSKoHCW'", (err, row) => {
  const nodes = JSON.parse(row.nodes);
  const tt = nodes.find(n => n.name === 'Telegram Trigger');
  const wp = nodes.find(n => n.name === 'Webhook Pesan');
  console.log("TT:", tt.name, "id:", tt.id, "webhookId:", tt.webhookId);
  console.log("WP:", wp.name, "id:", wp.id, "webhookId:", wp.webhookId);
  db.close();
});
"""

res = subprocess.run(['docker', 'exec', 'sentinelops-n8n', 'node', '-e', js], capture_output=True, text=True)
print("STDOUT:", res.stdout)
