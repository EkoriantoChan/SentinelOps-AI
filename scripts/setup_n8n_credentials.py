import os
import json
import subprocess
from pathlib import Path

# Load .env
env_path = Path(__file__).resolve().parent.parent / ".env"
env_vars = {}
if env_path.exists():
    try:
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    env_vars[k.strip()] = v.strip().strip('"').strip("'")
    except Exception as e:
        print(f"Warning parsing .env: {e}")

telegram_token = env_vars.get("TELEGRAM_BOT_TOKEN", os.getenv("TELEGRAM_BOT_TOKEN", "9045682587:AAGOHDz0usTpkSJ2t1PBcJ3DNyjW9H2gWko"))
openai_key = env_vars.get("OPENAI_API_KEY", os.getenv("OPENAI_API_KEY", ""))

creds = [
    {
        "id": "cUjj27wAHfil3hGf",
        "name": "SentinelOps AI Bot",
        "type": "telegramApi",
        "data": {
            "accessToken": telegram_token
        }
    },
    {
        "id": "VD4tpWrGjavFYIFf",
        "name": "SentinelOps Postgres",
        "type": "postgres",
        "data": {
            "host": "postgres",
            "port": 5432,
            "database": "sentinelops",
            "user": "sentinel",
            "password": "sentinelops-secret-pw",
            "ssl": "disable",
            "schema": "ide09"
        }
    }
]

if openai_key:
    creds.append({
        "id": "He7yNx3hfU3w0Zg6",
        "name": "OpenAI account",
        "type": "openAiApi",
        "data": {
            "apiKey": openai_key
        }
    })

temp_creds_path = Path("/tmp/sentinelops_creds.json") if os.name != "nt" else Path(__file__).resolve().parent / "temp_creds.json"
with open(temp_creds_path, "w", encoding="utf-8") as f:
    json.dump(creds, f, indent=2)

docker_prefix = [] if os.name == "nt" else ["sudo"]

try:
    # Copy into n8n container
    subprocess.run(docker_prefix + ["docker", "cp", str(temp_creds_path), "sentinelops-n8n:/home/node/credentials.json"], check=True)
    # Import into n8n
    subprocess.run(docker_prefix + ["docker", "exec", "sentinelops-n8n", "n8n", "import:credentials", "--input=/home/node/credentials.json"], check=True)
    print("[+] Successfully imported n8n credentials for Telegram, Postgres, and OpenAI!")
except Exception as e:
    print(f"[-] Warning: Failed to import n8n credentials: {e}")
finally:
    if temp_creds_path.exists():
        try:
            temp_creds_path.unlink()
        except Exception:
            pass
