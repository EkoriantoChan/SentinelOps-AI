import subprocess
import re
import urllib.request
import json
import os
from dotenv import load_dotenv

load_dotenv()

bot_token = os.getenv("TELEGRAM_BOT_TOKEN", "9045682587:AAGOHDz0usTpkSJ2t1PBcJ3DNyjW9H2gWko")
workflow_id = "hy4bNgxoLJSKoHCW"
node_id = "node-telegram-trigger"
webhook_id = "0293d9c9-8e61-42db-8f8d-e0552187e47f"
secret_token = f"{workflow_id}_{node_id}"

def get_current_tunnel_url():
    res = subprocess.run(['docker', 'logs', 'sentinelops-tunnel'], capture_output=True, text=True)
    matches = re.findall(r'https://[a-zA-Z0-9-]+\.trycloudflare\.com', res.stdout + res.stderr)
    return matches[-1].rstrip('/') if matches else None

def get_current_webhook_url():
    try:
        url = f"https://api.telegram.org/bot{bot_token}/getWebhookInfo"
        with urllib.request.urlopen(url, timeout=10) as resp:
            data = json.loads(resp.read().decode())
            return data.get('result', {}).get('url', '')
    except Exception as e:
        print(f"[!] Error fetching webhook info: {e}")
        return ""

def sync_webhook():
    tunnel_url = get_current_tunnel_url()
    if not tunnel_url:
        print("[!] No trycloudflare tunnel URL found in docker logs.")
        return False

    expected_webhook = f"{tunnel_url}/webhook/{webhook_id}/webhook"
    current_webhook = get_current_webhook_url()

    print(f"[*] Detected Tunnel:  {tunnel_url}")
    print(f"[*] Active in Telegram: {current_webhook}")

    if current_webhook == expected_webhook:
        print("[+] Webhook is already synchronized and healthy.")
        return True

    print(f"[*] Synchronizing webhook -> {expected_webhook}...")
    set_url = (
        f"https://api.telegram.org/bot{bot_token}/setWebhook"
        f"?url={expected_webhook}&secret_token={secret_token}&allowed_updates=[\"message\",\"callback_query\"]"
    )
    try:
        req = urllib.request.Request(set_url)
        with urllib.request.urlopen(req, timeout=10) as resp:
            res = json.loads(resp.read().decode())
            print(f"[+] Telegram setWebhook response: {res}")
            
            # Update .env
            env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
            if os.path.exists(env_path):
                with open(env_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                updated = re.sub(
                    r'PUBLIC_WEBHOOK_URL=https://[^\r\n]+',
                    f'PUBLIC_WEBHOOK_URL={tunnel_url}/',
                    content
                )
                with open(env_path, 'w', encoding='utf-8') as f:
                    f.write(updated)
                print("[+] Updated .env with new PUBLIC_WEBHOOK_URL.")
            return True
    except Exception as e:
        print(f"[!] Error setting webhook: {e}")
        return False

if __name__ == '__main__':
    sync_webhook()
