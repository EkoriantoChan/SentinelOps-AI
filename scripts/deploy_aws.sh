#!/bin/bash
set -e

echo "=========================================================="
echo "  SentinelOps AI - Automated AWS Production Deployment"
echo "=========================================================="

# 1. Update and install Docker & Python tools if not present
if ! command -v docker &> /dev/null; then
    echo "[*] Installing Docker and Docker Compose..."
    sudo apt-get update -y
    sudo apt-get install -y ca-certificates curl gnupg lsb-release python3 python3-pip
    sudo mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    sudo apt-get update -y
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    sudo usermod -aG docker $USER
    echo "[+] Docker installed successfully!"
fi

# 2. Setup .env
if [ ! -f .env ]; then
    echo "[*] Creating .env from .env.example..."
    cp .env.example .env
fi

# Ensure tokens are populated
sed -i 's|^TELEGRAM_BOT_TOKEN=.*|TELEGRAM_BOT_TOKEN=9045682587:AAGOHDz0usTpkSJ2t1PBcJ3DNyjW9H2gWko|' .env
sed -i 's|^SUPERVISOR_CHAT_ID=.*|SUPERVISOR_CHAT_ID=1845199518|' .env

# Check for OPENAI_API_KEY
if ! grep -q '^OPENAI_API_KEY=sk-' .env; then
    if [ -n "$OPENAI_API_KEY" ]; then
        sed -i "s|^OPENAI_API_KEY=.*|OPENAI_API_KEY=${OPENAI_API_KEY}|" .env
    else
        echo ""
        read -p "Enter your OPENAI_API_KEY (starts with sk-): " user_key
        sed -i "s|^OPENAI_API_KEY=.*|OPENAI_API_KEY=${user_key}|" .env
    fi
fi

# 3. Pull and start all Docker services
echo "[*] Launching SentinelOps AI containers (Postgres, n8n, 3D Dashboard, Task Runners, Cloudflare Tunnel)..."
sudo docker compose down --remove-orphans || true
sudo docker compose up -d --remove-orphans

echo "[*] Waiting 15 seconds for PostgreSQL and n8n to be healthy..."
sleep 15

# 4. Initialize Database Schema
echo "[*] Initializing ide09 schema in PostgreSQL..."
sudo docker exec -i sentinelops-postgres psql -U sentinel -d sentinelops < sql/schema.sql

# 5. Provision credentials and import workflows into n8n
echo "[*] Setting up credentials in n8n..."
python3 scripts/setup_n8n_credentials.py || true

echo "[*] Importing workflows into n8n..."
if sudo docker exec sentinelops-n8n ls /home/node/workflows > /dev/null 2>&1; then
    sudo docker exec sentinelops-n8n n8n import:workflow --separate --input=/home/node/workflows || {
        for wf in workflows/*.json; do
            echo " -> Importing $wf..."
            sudo docker exec sentinelops-n8n n8n import:workflow --input="/home/node/$wf" || true
        done
    }
else
    sudo docker cp workflows sentinelops-n8n:/tmp/workflows
    sudo docker exec sentinelops-n8n n8n import:workflow --separate --input=/tmp/workflows || {
        for wf in workflows/*.json; do
            base=$(basename "$wf")
            echo " -> Importing $base..."
            sudo docker exec sentinelops-n8n n8n import:workflow --input="/tmp/workflows/$base" || true
        done
    }
fi

echo "[*] Activating workflows in n8n..."
sudo docker exec sentinelops-n8n n8n update:workflow --all --active=true || true

# 6. Extract Cloudflare Tunnel Public Webhook URL
echo "[*] Extracting live Cloudflare tunnel URL..."
TUNNEL_URL=""
for i in {1..20}; do
    TUNNEL_URL=$(sudo docker logs sentinelops-tunnel 2>&1 | grep -o 'https://[-a-z0-9.]*\.trycloudflare\.com' | tail -n 1)
    if [ -n "$TUNNEL_URL" ]; then
        break
    fi
    sleep 1
done

echo ""
echo "=========================================================="
echo "  🚀 SentinelOps AI is LIVE on AWS!"
echo "=========================================================="
PUBLIC_IP=$(curl -s ifconfig.me || hostname -I | awk '{print $1}')
echo " - SCADA 3D Web Dashboard : http://${PUBLIC_IP}:8085"
echo " - n8n Automation Engine  : http://${PUBLIC_IP}:5690"
if [ -n "$TUNNEL_URL" ]; then
    echo " - Cloudflare Public URL  : ${TUNNEL_URL}"
    sed -i "s|^PUBLIC_WEBHOOK_URL=.*|PUBLIC_WEBHOOK_URL=${TUNNEL_URL}|" .env || true
    echo ""
    echo "[*] Auto-registering Telegram bot webhook with Cloudflare tunnel..."
    python3 scripts/register_telegram_webhook.py "$TUNNEL_URL" || true
fi
echo "=========================================================="
