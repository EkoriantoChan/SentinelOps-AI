import subprocess

js = """
const sqlite3 = require('/usr/local/lib/node_modules/n8n/node_modules/sqlite3');
const flatted = require('/usr/local/lib/node_modules/n8n/node_modules/flatted');
const db = new sqlite3.Database('/home/node/.n8n/database.sqlite');
db.all('SELECT id, workflowId, mode, status, startedAt FROM execution_entity WHERE workflowId = "hy4bNgxoLJSKoHCW" ORDER BY id DESC LIMIT 5', (err, rows) => {
  console.log(rows);
  db.close();
});
"""

res = subprocess.run(['docker', 'exec', 'sentinelops-n8n', 'node', '-e', js], capture_output=True, text=True)
print(res.stdout)
