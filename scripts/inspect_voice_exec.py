import subprocess

js = """
const sqlite3 = require('/usr/local/lib/node_modules/n8n/node_modules/sqlite3');
const db = new sqlite3.Database('/home/node/.n8n/database.sqlite');
db.all('SELECT id, workflowId, mode, status, startedAt FROM execution_entity WHERE id >= 7630 ORDER BY id ASC', (err, rows) => {
  console.log(rows);
  db.close();
});
"""

res = subprocess.run(['docker', 'exec', 'sentinelops-n8n', 'node', '-e', js], capture_output=True, text=True)
print(res.stdout)
