import json
import subprocess
import os

workflows = {
    'hy4bNgxoLJSKoHCW': 'workflows/1-entry-pesan-konfirmasi.json',
    'bCgEWPLdrRaGfVZb': 'workflows/2-core-agent.json',
    'zAY2rguMOw7YSHXx': 'workflows/3-core-konfirmasi.json',
    'c7sEGMwbAbaL9vej': 'workflows/4-dashboard-pengingat.json'
}

data_to_sync = {}
for wf_id, path in workflows.items():
    if os.path.exists(path):
        with open(path, 'r', encoding='utf-8') as f:
            wf_json = json.load(f)
            data_to_sync[wf_id] = {
                'name': wf_json.get('name'),
                'nodes': json.dumps(wf_json.get('nodes', [])),
                'connections': json.dumps(wf_json.get('connections', {})),
                'settings': json.dumps(wf_json.get('settings', {}))
            }

js_payload = json.dumps(data_to_sync)

js_script = """
const sqlite3 = require('/usr/local/lib/node_modules/n8n/node_modules/sqlite3');
const db = new sqlite3.Database('/home/node/.n8n/database.sqlite');

let input = '';
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', () => {
  const syncData = JSON.parse(input);
  const now = new Date().toISOString();

  db.serialize(() => {
    for (const [id, wf] of Object.entries(syncData)) {
      console.log(`Full syncing workflow ${id} (${wf.name})...`);
      
      // 1. Update workflow_entity
      db.run(
        `UPDATE workflow_entity 
         SET nodes = ?, connections = ?, updatedAt = ?
         WHERE id = ?`,
        [wf.nodes, wf.connections, now, id],
        function(err) {
          if (err) console.error(`Error updating workflow_entity ${id}:`, err);
          else console.log(`Updated workflow_entity ${id}, changes: ${this.changes}`);
        }
      );

      // 2. Update published version in workflow_history
      db.run(
        `UPDATE workflow_history
         SET nodes = ?, connections = ?
         WHERE workflowId = ? AND versionId = (SELECT publishedVersionId FROM workflow_published_version WHERE workflowId = ?)`,
        [wf.nodes, wf.connections, id, id],
        function(err) {
          if (err) console.error(`Error updating published workflow_history for ${id}:`, err);
          else console.log(`Updated published workflow_history for ${id}, changes: ${this.changes}`);
        }
      );

      // 3. Update current draft version in workflow_history
      db.run(
        `UPDATE workflow_history
         SET nodes = ?, connections = ?
         WHERE workflowId = ? AND versionId = (SELECT versionId FROM workflow_entity WHERE id = ?)`,
        [wf.nodes, wf.connections, id, id],
        function(err) {
          if (err) console.error(`Error updating draft workflow_history for ${id}:`, err);
          else console.log(`Updated draft workflow_history for ${id}, changes: ${this.changes}`);
        }
      );
    }

    // Force SQLite WAL checkpoint so changes are immediately persisted to disk
    db.run("PRAGMA wal_checkpoint(TRUNCATE)", (err) => {
      if (err) console.error("Checkpoint error:", err);
      else console.log("WAL checkpoint TRUNCATE successful!");
      db.close(() => {
        console.log("DB closed successfully.");
      });
    });
  });
});
"""

cmd = ['docker', 'exec', '-i', 'sentinelops-n8n', 'node', '-e', js_script]
res = subprocess.run(cmd, input=js_payload, capture_output=True, text=True)
print("STDOUT:", res.stdout)
print("STDERR:", res.stderr)
