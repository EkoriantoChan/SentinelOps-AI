import os
import sys
import json
import urllib.request
from pathlib import Path

# Load .env without requiring third-party dotenv
env_path = Path(__file__).resolve().parent.parent / ".env"
if env_path.exists():
    try:
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))
    except Exception as e:
        print(f"Warning: could not parse .env: {e}")

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

payload = {
    "url": target_url,
    "secret_token": secret_token,
    "allowed_updates": ["message", "callback_query"]
}

req = urllib.request.Request(
    f"https://api.telegram.org/bot{bot_token}/setWebhook",
    data=json.dumps(payload).encode("utf-8"),
    headers={"Content-Type": "application/json"}
)

try:
    with urllib.request.urlopen(req) as resp:
        result = json.loads(resp.read().decode())
        print("Success:", result)
except Exception as e:
    if hasattr(e, "read"):
        print("Error:", e.read().decode())
    else:
        print("Error:", e)

info_url = f"https://api.telegram.org/bot{bot_token}/getWebhookInfo"
try:
    with urllib.request.urlopen(info_url) as resp:
        info = json.loads(resp.read().decode())
        print("\nWebhook Info:")
        print(json.dumps(info, indent=2))
except Exception as e:
    print("Error fetching webhook info:", e)
