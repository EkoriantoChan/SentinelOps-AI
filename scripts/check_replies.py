import subprocess

js = """
const sqlite3 = require('/usr/local/lib/node_modules/n8n/node_modules/sqlite3');
const flatted = require('/usr/local/lib/node_modules/n8n/node_modules/flatted');
const db = new sqlite3.Database('/home/node/.n8n/database.sqlite');

const ids = [7385, 7392, 7398, 7404];

function checkNext(idx) {
    if (idx >= ids.length) {
        db.close();
        return;
    }
    const targetId = ids[idx];
    db.get("SELECT data FROM execution_data WHERE executionId = ?", [targetId], (e, r) => {
        if (!e && r) {
            const parsed = flatted.parse(r.data);
            const runData = parsed.resultData.runData;
            const replyNode = runData['Susun Balasan Telegram'];
            const reply = replyNode ? replyNode[0].data.main[0][0].json.reply_text : 'NO_REPLY';
            const normNode = runData['Normalisasi Pesan'];
            const prompt = normNode ? normNode[0].data.main[0][0].json.full_text : 'NO_PROMPT';
            console.log(`=== EXEC ${targetId} ===`);
            console.log(`PROMPT: ${prompt}`);
            console.log(`REPLY:\n${reply}\n`);
        }
        checkNext(idx + 1);
    });
}

checkNext(0);
"""

res = subprocess.run(['docker', 'exec', 'sentinelops-n8n', 'node', '-e', js], capture_output=True, text=True)
print(res.stdout)
