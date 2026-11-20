import os
import subprocess
import time

docker_cmd = ["docker"] if os.name == "nt" else ["sudo", "docker"]

node_js_code = """
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
  console.log('Found ' + rows.length + ' workflows in database.');
  for (const row of rows) {
    console.log(' -> Publishing: ' + row.name + ' (ID: ' + row.id + ')');
    try {
      execSync('n8n publish:workflow --id=' + row.id, { stdio: 'inherit' });
    } catch (e) {
      console.log('    Warning: ' + e.message);
    }
  }
  db.run('UPDATE workflow_entity SET active = 1', function(err2) {
    if (err2) console.error(err2);
    else console.log('Workflows set active in DB:', this.changes);
    db.close();
  });
});
"""

print("[*] Publishing all workflows in n8n...")
try:
    subprocess.run(docker_cmd + ["exec", "sentinelops-n8n", "node", "-e", node_js_code], check=True)
    print("[*] Restarting n8n container to bind webhook listeners...")
    subprocess.run(docker_cmd + ["restart", "sentinelops-n8n"], check=True)
    time.sleep(5)
    print("[+] All workflows are published and active!")
except Exception as e:
    print(f"[-] Warning during workflow publishing: {e}")
