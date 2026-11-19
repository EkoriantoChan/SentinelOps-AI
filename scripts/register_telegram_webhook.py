import os
import sys
import json
import urllib.request
from dotenv import load_dotenv

load_dotenv()

bot_token = os.getenv("TELEGRAM_BOT_TOKEN", "9045682587:AAGOHDz0usTpkSJ2t1PBcJ3DNyjW9H2gWko")
webhook_base = sys.argv[1].rstrip("/") if len(sys.argv) > 1 else os.getenv("PUBLIC_WEBHOOK_URL", "").rstrip("/")
workflow_id = "hy4bNgxoLJSKoHCW"
node_id = "node-telegram-trigger"
webhook_id = "0293d9c9-8e61-42db-8f8d-e0552187e47f"
secret_token = f"{workflow_id}_{node_id}"

target_url = f"{webhook_base}/webhook/{webhook_id}/webhook"

print(f"Registering Telegram webhook:")
print(f" - Bot Token: {bot_token[:10]}...")
print(f" - Webhook URL: {target_url}")
print(f" - Secret Token: {secret_token}")

set_url = f"https://api.telegram.org/bot{bot_token}/setWebhook?url={target_url}&secret_token={secret_token}&allowed_updates=[\"message\",\"callback_query\"]"

req = urllib.request.Request(set_url)
try:
    with urllib.request.urlopen(req) as resp:
        result = json.loads(resp.read().decode())
        print("Success:", result)
except Exception as e:
    print("Error:", e)

info_url = f"https://api.telegram.org/bot{bot_token}/getWebhookInfo"
with urllib.request.urlopen(info_url) as resp:
    info = json.loads(resp.read().decode())
    print("\nWebhook Info:")
    print(json.dumps(info, indent=2))
