import subprocess

js = """
const sqlite3 = require('/usr/local/lib/node_modules/n8n/node_modules/sqlite3');
const flatted = require('/usr/local/lib/node_modules/n8n/node_modules/flatted');
const db = new sqlite3.Database('/home/node/.n8n/database.sqlite');

db.all("SELECT id, workflowId, mode, status, startedAt FROM execution_entity WHERE workflowId != 'c7sEGMwbAbaL9vej' ORDER BY id DESC LIMIT 10", (err, rows) => {
  console.log("Recent non-cron executions:", rows);
  if (rows && rows.length > 0) {
    const targetId = rows[0].id;
    console.log("Inspecting latest execution:", targetId);
    db.get("SELECT data FROM execution_data WHERE executionId = ?", [targetId], (e, r) => {
      if (e || !r) return console.error(e || "NO DATA");
      const parsed = flatted.parse(r.data);
      const runData = parsed.resultData.runData;
      console.log("Nodes in execution " + targetId + ":", Object.keys(runData));
      for (const nodeName in runData) {
        const d = runData[nodeName][0];
        console.log(`-- NODE: ${nodeName} --`);
        if (d.error) console.log("  ERROR:", d.error);
        const main = d.data?.main || [];
        for (let branchIdx = 0; branchIdx < main.length; branchIdx++) {
          const items = main[branchIdx] || [];
          console.log(`  Branch ${branchIdx}: ${items.length} items`);
          if (items.length > 0) {
            const item0 = items[0].json || {};
            console.log(`    Keys: ${Object.keys(item0).join(', ')}`);
            if (item0.audio_base64 !== undefined) {
              console.log(`    audio_base64: length=${(item0.audio_base64 || '').length}, startsWith=${(item0.audio_base64 || '').slice(0, 30)}`);
            }
            if (item0.full_text !== undefined) console.log(`    full_text: "${item0.full_text}"`);
            if (item0.audio_transcript !== undefined) console.log(`    audio_transcript: "${item0.audio_transcript}"`);
            if (item0.reply_text !== undefined) console.log(`    reply_text: "${item0.reply_text.slice(0, 80)}..."`);
          }
        }
      }
      db.close();
    });
  } else {
    db.close();
  }
});
"""

res = subprocess.run(['docker', 'exec', 'sentinelops-n8n', 'node', '-e', js], capture_output=True, text=True)
print(res.stdout)
if res.stderr:
    print("STDERR:", res.stderr)
